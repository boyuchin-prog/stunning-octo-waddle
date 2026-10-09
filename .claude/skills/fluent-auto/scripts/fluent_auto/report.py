"""Final deliverables: CSV tables, plots, animation, report.md, summary.json."""
from __future__ import annotations

import csv
import glob
import json
import math
import os
import shutil
import subprocess

from .evaluate import STATUS_ZH

FINAL_ZH = dict(STATUS_ZH, NEED_USER="需要你确认/决定")


def numerics_summary(num: dict) -> str:
    pv = num["p_v_coupling"].upper()
    if num["p_v_coupling"] == "coupled":
        core = f"{pv} CFL={num['courant']:g}"
    else:
        core = f"{pv} p={num['urf'].get('pressure', '-')} mom={num['urf'].get('mom', '-')}"
    order = "二阶" if num["second_order"] else "一阶"
    if num["second_order"] and num["warmup"]:
        order += f"(先一阶 {num['warmup']} 步)"
    return f"{core}, {order}, init={num['init']}, 残差={num['residual']:.0e}, {num['iterations']} 步"


def lineage(attempts: list[dict]) -> list[dict]:
    """Final attempt plus the attempts it restarted from, oldest first."""
    by_no = {a["attempt"]: a for a in attempts}
    chain, cur = [], attempts[-1]
    while cur:
        chain.append(cur)
        cur = by_no.get(cur.get("restart_from_attempt"))
    return list(reversed(chain))


def write_csvs(final_dir: str, attempts: list[dict], spec: dict) -> dict:
    files = {}
    path = os.path.join(final_dir, "residuals.csv")
    names = []
    for a in attempts:
        for n in a["parsed"]["residual_names"] if a.get("parsed") else []:
            if n not in names:
                names.append(n)
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["attempt", "iter"] + names)
        for a in attempts:
            p = a.get("parsed")
            if not p:
                continue
            idx = {n: i for i, n in enumerate(p["residual_names"])}
            for r in p["residuals"]:
                w.writerow([a["attempt"], r["iter"]] + [r["values"][idx[n]] if n in idx else "" for n in names])
    files["residuals_csv"] = path

    path = os.path.join(final_dir, "monitors.csv")
    rnames = [r["name"] for r in spec["reports"]]
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["attempt", "chunk", "iter"] + rnames + ["mass_imbalance_rel"])
        for a in attempts:
            p = a.get("parsed")
            if not p:
                continue
            for c in p["chunks"]:
                imb = c["flux"]["imbalance_rel"] if c.get("flux") else ""
                w.writerow([a["attempt"], c["idx"], c["iter"]] + [c["reports"].get(n, "") for n in rnames] + [imb])
    files["monitors_csv"] = path
    return files


def write_plots(final_dir: str, chain: list[dict], spec: dict) -> dict:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return {"plots_note": "未安装 matplotlib,跳过曲线图(pip install matplotlib 后重跑 report 子命令即可)"}
    files = {}
    fig, ax = plt.subplots(figsize=(9, 5))
    series: dict[str, tuple[list, list]] = {}
    for a in chain:
        p = a.get("parsed") or {}
        for r in p.get("residuals", []):
            for n, v in zip(p["residual_names"], r["values"]):
                if v > 0 and not math.isnan(v):
                    series.setdefault(n, ([], []))[0].append(r["iter"])
                    series[n][1].append(v)
    for n, (x, y) in series.items():
        ax.semilogy(x, y, label=n, linewidth=1.2)
    ax.set_xlabel("Iteration")
    ax.set_ylabel("Scaled residual")
    ax.grid(True, which="both", alpha=0.3)
    ax.legend()
    path = os.path.join(final_dir, "residuals.png")
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)
    files["residuals_png"] = path

    rnames = [r["name"] for r in spec["reports"]]
    if rnames:
        fig, axes = plt.subplots(len(rnames), 1, figsize=(9, 2.6 * len(rnames)), squeeze=False)
        for ax, name in zip(axes[:, 0], rnames):
            x, y = [], []
            for a in chain:
                for c in (a.get("parsed") or {}).get("chunks", []):
                    v = c["reports"].get(name)
                    if v is not None and c["iter"] is not None:
                        x.append(c["iter"])
                        y.append(v)
            ax.plot(x, y, marker="o", markersize=3)
            ax.set_title(name)
            ax.grid(True, alpha=0.3)
        axes[-1, 0].set_xlabel("Iteration")
        fig.tight_layout()
        path = os.path.join(final_dir, "monitors.png")
        fig.savefig(path, dpi=130)
        plt.close(fig)
        files["monitors_png"] = path
    return files


def make_animation(final_dir: str, chain: list[dict], spec: dict) -> dict:
    anim = spec["exports"]["animation"]
    if not anim["enabled"]:
        return {}
    frames = []
    for a in chain:
        frames += sorted(glob.glob(os.path.join(a["dir"], "frames", "*.png")))
    if not frames:
        return {"animation_note": "没有找到动画帧图片"}
    fdir = os.path.join(final_dir, "frames")
    os.makedirs(fdir, exist_ok=True)
    for i, f in enumerate(frames, 1):
        shutil.copy2(f, os.path.join(fdir, f"frame_{i:04d}.png"))
    fps = str(anim["fps"])
    if shutil.which("ffmpeg"):
        out = os.path.join(final_dir, "animation.mp4")
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", fps, "-i", os.path.join(fdir, "frame_%04d.png"),
               "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-pix_fmt", "yuv420p", out]
        if subprocess.run(cmd, capture_output=True).returncode == 0:
            return {"animation": out}
    try:
        from PIL import Image
        imgs = [Image.open(os.path.join(fdir, f"frame_{i:04d}.png")).convert("RGB") for i in range(1, len(frames) + 1)]
        out = os.path.join(final_dir, "animation.gif")
        imgs[0].save(out, save_all=True, append_images=imgs[1:], duration=int(1000 / float(fps)), loop=0)
        return {"animation": out}
    except ImportError:
        return {"animation_note": f"未找到 ffmpeg 或 Pillow,动画帧保存在 {fdir}"}


def copy_exports(final_dir: str, last: dict) -> dict:
    files = {}
    for sub in ("contours", "data"):
        src = os.path.join(last["dir"], sub)
        if os.path.isdir(src):
            dst = os.path.join(final_dir, sub)
            shutil.copytree(src, dst, dirs_exist_ok=True)
            files[sub] = sorted(os.path.join(dst, f) for f in os.listdir(dst))
    cas = os.path.join(last["dir"], "result.cas.h5")
    if os.path.exists(cas):
        files["case_data"] = cas
    return files


def _fmt(v, spec="{:.6g}"):
    return "-" if v is None else spec.format(v)


def write_report(run_dir: str, spec: dict, attempts: list[dict], final_status: str, final_note: str) -> dict:
    final_dir = os.path.join(run_dir, "final")
    os.makedirs(final_dir, exist_ok=True)
    chain = lineage(attempts) if attempts else []
    files = {}
    if attempts:
        files.update(write_csvs(final_dir, attempts, spec))
        files.update(write_plots(final_dir, chain, spec))
        files.update(make_animation(final_dir, chain, spec))
        files.update(copy_exports(final_dir, attempts[-1]))

    last = attempts[-1] if attempts else None
    ev = last["evaluation"] if last else {}
    L = [f"# Fluent 自动计算报告:{spec['name']}", "",
         f"- **最终状态:{final_status}({FINAL_ZH.get(final_status, '')})**",
         f"- 说明:{final_note}",
         f"- 输入文件:`{spec['input']['file']}`",
         f"- 运行目录:`{run_dir}`", ""]

    L += ["## 尝试记录", "", "| # | 数值设置 | 起点 | 结果 | 迭代数 | 耗时(s) | 下一步 |", "|---|---|---|---|---|---|---|"]
    for a in attempts:
        start = f"续算自 #{a['restart_from_attempt']}" if a.get("restart_from_attempt") else "重新初始化"
        L.append(f"| {a['attempt']} | {numerics_summary(a['numerics'])} | {start} | "
                 f"{a['evaluation']['status']} | {(a.get('parsed') or {}).get('iterations_run', 0)} | "
                 f"{a['run_info'].get('seconds', '-')} | {a.get('decision_note', '')} |")
    L.append("")

    if ev.get("notes"):
        L += ["## 最后一次的诊断", ""] + [f"- {n}" for n in ev["notes"]] + [""]

    res = ev.get("residuals") or {}
    if res.get("last"):
        crit = last["numerics"]
        L += ["## 残差(最后一步)", "", "| 方程 | 残差 | 标准 |", "|---|---|---|"]
        for n, v in res["last"].items():
            c = crit["residual_energy"] if n == "energy" else crit["residual"]
            L.append(f"| {n} | {v:.3e} | {c:.0e} |")
        trend = ev.get("trend") or {}
        L += ["", f"残差趋势:{trend.get('trend')}(末段变化 {trend.get('slope_decades')} 个数量级)", ""]

    mon = ev.get("monitors") or {}
    if mon.get("items"):
        L += ["## 监视量", "", "| 报告 | 最终值 | 末段相对变化 | 容差 | 稳定 |", "|---|---|---|---|---|"]
        for n, it in mon["items"].items():
            L.append(f"| {n} | {_fmt(it.get('last'))} | {_fmt(it.get('rel_change'), '{:.2e}')} | "
                     f"{_fmt(it.get('tol'), '{:.1e}')} | {'是' if it['ok'] else '否'} |")
        L.append("")
    mass = ev.get("mass") or {}
    if "imbalance_rel" in mass:
        L += [f"质量守恒:净流量 {mass['net']:.3e},相对不平衡 {mass['imbalance_rel']:.2e}"
              f"(容差 {mass['tol']:.1e},{'达标' if mass['ok'] else '未达标'})", ""]

    if ev.get("references"):
        L += ["## 参考值对比", "", "| 报告 | 计算值 | 参考 | 相对误差 | 通过 |", "|---|---|---|---|---|"]
        for r in ev["references"]:
            refs = f"{r['expected']:.6g}" if "expected" in r else f"{r.get('range')}"
            L.append(f"| {r['report']} | {_fmt(r['value'])} | {refs} | {_fmt(r.get('rel_error'), '{:.2%}')} | "
                     f"{'是' if r['ok'] else '否'} |")
        L.append("")

    mesh = ev.get("mesh") or {}
    if mesh:
        L += ["## 网格", ""]
        for k, v in mesh.items():
            L.append(f"- {k}: {v[0]:.4g} ~ {v[1]:.4g}" if isinstance(v, list) else f"- {k}: {v:.4g}")
        L.append("")

    L += ["## 导出文件", ""]
    for k, v in files.items():
        if k.endswith("_note"):
            L.append(f"- 备注:{v}")
        elif isinstance(v, list):
            L += [f"- {k}:"] + [f"  - `{x}`" for x in v]
        else:
            L.append(f"- {k}: `{v}`")
    L.append("")

    path = os.path.join(final_dir, "report.md")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))
    files["report_md"] = path

    summary = {
        "name": spec["name"], "final_status": final_status, "note": final_note, "run_dir": run_dir,
        "attempts": [{"attempt": a["attempt"], "status": a["evaluation"]["status"],
                      "numerics": a["numerics"], "notes": a["evaluation"]["notes"],
                      "decision": a.get("decision_note", "")} for a in attempts],
        "final_reports": (last["parsed"]["chunks"][-1]["reports"]
                          if last and last.get("parsed") and last["parsed"]["chunks"] else {}),
        "references": ev.get("references", []),
        "files": files,
    }
    with open(os.path.join(final_dir, "summary.json"), "w", encoding="utf-8") as fh:
        json.dump(summary, fh, ensure_ascii=False, indent=2)
    return files
