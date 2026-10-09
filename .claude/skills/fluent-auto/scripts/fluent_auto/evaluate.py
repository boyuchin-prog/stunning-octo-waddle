"""Judge a parsed transcript: setup errors, divergence, convergence, references."""
from __future__ import annotations

import math
import statistics

# Final states
PASS = "PASS"
REF_MISMATCH = "REF_MISMATCH"
NOT_CONVERGED = "NOT_CONVERGED"
DIVERGED = "DIVERGED"
SETUP_ERROR = "SETUP_ERROR"
ENV_ERROR = "ENV_ERROR"
TIMEOUT = "TIMEOUT"

STATUS_ZH = {
    PASS: "通过",
    REF_MISMATCH: "已收敛但与参考值不符",
    NOT_CONVERGED: "未收敛",
    DIVERGED: "发散",
    SETUP_ERROR: "设置/TUI 命令错误",
    ENV_ERROR: "环境错误(Fluent 未启动/许可证等)",
    TIMEOUT: "超时",
}


def residual_trend(residuals: list[dict]) -> dict:
    """Trend of the worst residual (log10) over the trailing window."""
    if len(residuals) < 20:
        return {"trend": "unknown", "slope_decades": None, "spread": None}
    worst = []
    for r in residuals:
        vals = [v for v in r["values"] if v > 0 and not math.isnan(v) and not math.isinf(v)]
        worst.append(math.log10(max(vals)) if vals else 0.0)
    w = min(200, len(worst) // 2)
    tail = worst[-w:]
    half = len(tail) // 2
    a, b = statistics.mean(tail[:half]), statistics.mean(tail[half:])
    spread = statistics.pstdev(tail[half:])
    d = b - a
    if d < -0.15:
        trend = "decreasing"
    elif d > 0.3:
        trend = "increasing"
    elif spread > 0.25:
        trend = "oscillating"
    else:
        trend = "flat"
    return {"trend": trend, "slope_decades": round(d, 3), "spread": round(spread, 3)}


def check_residuals(parsed: dict, eqs_criteria: dict, relaxed: float | None) -> dict:
    names, rows = parsed["residual_names"], parsed["residuals"]
    if not rows:
        return {"ok": False, "relaxed_ok": False, "last": {}, "reason": "没有残差输出"}
    last = dict(zip(names, rows[-1]["values"]))
    failing = {n: v for n, v in last.items() if v > eqs_criteria.get(n, eqs_criteria.get("*", 1e-4))}
    ok = not failing or parsed["converged_flag"]
    relaxed_ok = relaxed is not None and all(
        v <= max(relaxed, eqs_criteria.get(n, 0)) for n, v in last.items())
    return {"ok": ok, "relaxed_ok": relaxed_ok, "last": last, "failing": failing}


def check_monitors(parsed: dict, spec: dict) -> dict:
    conv = spec["convergence"]
    window = int(conv["monitor_window"])
    out, all_ok, unparsed = {}, True, []
    chunks = parsed["chunks"]
    for r in spec["reports"]:
        name = r["name"]
        series = [c["reports"].get(name) for c in chunks]
        if chunks and series[-1] is None:
            unparsed.append(name)
            all_ok = False
            out[name] = {"ok": False, "reason": "无法从 transcript 解析数值"}
            continue
        vals = [v for v in series if v is not None]
        tol = float(r.get("rel_tol", conv["monitor_rel_tol"]))
        floor = float(r.get("abs_floor", 1e-12))
        if len(vals) < window + 1:
            all_ok = False
            out[name] = {"ok": False, "reason": f"历史点不足({len(vals)}/{window + 1})", "last": vals[-1] if vals else None}
            continue
        tail = vals[-(window + 1):]
        ref = tail[-1]
        change = max(abs(v - ref) for v in tail) / max(abs(ref), floor)
        ok = change <= tol
        all_ok &= ok
        out[name] = {"ok": ok, "last": ref, "rel_change": change, "tol": tol}
    return {"ok": all_ok, "items": out, "unparsed": unparsed}


def check_mass(parsed: dict, spec: dict) -> dict:
    conv = spec["convergence"]
    if not conv["check_mass_imbalance"]:
        return {"ok": True, "skipped": True}
    flux = parsed["chunks"][-1]["flux"] if parsed["chunks"] else None
    if not flux:
        return {"ok": False, "unparsed": True, "reason": "无法解析质量流量平衡"}
    ok = flux["imbalance_rel"] <= conv["mass_imbalance_rel"]
    return {"ok": ok, "imbalance_rel": flux["imbalance_rel"], "net": flux["net"],
            "tol": conv["mass_imbalance_rel"]}


def check_references(parsed: dict, spec: dict) -> list[dict]:
    last = parsed["chunks"][-1]["reports"] if parsed["chunks"] else {}
    out = []
    for ref in spec["references"]:
        v = last.get(ref["report"])
        if v is not None and ref.get("abs"):
            v = abs(v)
        item = {"report": ref["report"], "value": v}
        if v is None:
            item.update(ok=False, reason="没有数值")
        elif "range" in ref:
            lo, hi = ref["range"]
            item.update(ok=lo <= v <= hi, range=[lo, hi])
        else:
            exp = float(ref["expected"])
            err = abs(v - exp)
            rel = err / abs(exp) if exp else float("inf")
            ok = True
            if "rel_tol" in ref:
                ok &= rel <= float(ref["rel_tol"])
            if "abs_tol" in ref:
                ok &= err <= float(ref["abs_tol"])
            item.update(ok=ok, expected=exp, rel_error=rel, abs_error=err,
                        rel_tol=ref.get("rel_tol"), abs_tol=ref.get("abs_tol"))
        out.append(item)
    return out


def evaluate(parsed: dict | None, spec: dict, num: dict, run_info: dict) -> dict:
    ev = {"status": None, "notes": [], "trend": None, "residuals": None, "monitors": None,
          "mass": None, "references": [], "mesh": (parsed or {}).get("mesh", {})}

    if run_info.get("timed_out"):
        ev["status"] = TIMEOUT
        ev["notes"].append(f"超过单次时限 {spec['fluent']['timeout_min']} 分钟被终止")
        return ev
    if parsed is None:
        ev["status"] = ENV_ERROR
        ev["notes"].append("没有生成 transcript:Fluent 可能没有启动(路径、许可证、参数),请看 launcher.log")
        return ev
    if parsed["license_errors"]:
        ev["status"] = ENV_ERROR
        ev["notes"] += [e["text"] for e in parsed["license_errors"][:3]]
        return ev
    if parsed["errors"]:
        ev["status"] = SETUP_ERROR
        ev["notes"] += [f"第 {e['line']} 行: {e['text']}" for e in parsed["errors"][:5]]
        return ev

    mesh = parsed["mesh"]
    if mesh.get("min_volume") is not None and mesh["min_volume"] <= 0:
        ev["notes"].append(f"网格存在非正体积单元(min volume={mesh['min_volume']:.3g}),必须修网格")
    if mesh.get("min_orthogonal_quality") is not None and mesh["min_orthogonal_quality"] < 0.05:
        ev["notes"].append(f"最小正交质量 {mesh['min_orthogonal_quality']:.3g} 偏低(<0.05),易发散")

    ev["trend"] = residual_trend(parsed["residuals"])
    if parsed["divergence"] or parsed["nan_residual"]:
        ev["status"] = DIVERGED
        ev["notes"] += [d["text"] for d in parsed["divergence"][:3]]
        if parsed["nan_residual"]:
            ev["notes"].append("残差出现 NaN/Inf")
        return ev
    if parsed["residuals"] and max(parsed["residuals"][-1]["values"]) >= 10:
        ev["status"] = DIVERGED
        ev["notes"].append("残差增长到 10 以上,判定为发散")
        return ev
    if not parsed["finished"]:
        ev["status"] = ENV_ERROR
        ev["notes"].append("transcript 没有走到结尾标记(Fluent 中途退出且没有明确报错),请检查 transcript 末尾")
        return ev
    if not parsed["residuals"]:
        ev["status"] = SETUP_ERROR
        ev["notes"].append("没有任何迭代输出,可能是初始化或 iterate 命令没执行")
        return ev

    criteria = {"*": num["residual"], "energy": num["residual_energy"]}
    res = check_residuals(parsed, criteria, spec["convergence"]["residual_relaxed"])
    mon = check_monitors(parsed, spec)
    mass = check_mass(parsed, spec)
    ev.update(residuals=res, monitors=mon, mass=mass)

    if mon["unparsed"] or mass.get("unparsed"):
        ev["status"] = SETUP_ERROR
        ev["notes"].append("报告值解析失败:" + ", ".join(mon["unparsed"] + (["mass-flux"] if mass.get("unparsed") else []))
                           + "。请查看 transcript 中对应 @@FA REPORT 块的实际输出格式")
        return ev

    flat = ev["trend"]["trend"] in ("flat", "oscillating")
    residual_ok = res["ok"] or (spec["convergence"]["accept_flat_residuals"] and flat and res["relaxed_ok"])
    if res["ok"] is False and residual_ok:
        ev["notes"].append(f"残差停滞在 {spec['convergence']['residual_relaxed']:g} 以下,监视量稳定且守恒,按工程收敛接受")

    if parsed["warnings"]["reversed_flow"]:
        ev["notes"].append(f"出口回流警告出现 {parsed['warnings']['reversed_flow']} 次:出口可能离回流区太近")

    if not (residual_ok and mon["ok"] and mass["ok"]):
        ev["status"] = NOT_CONVERGED
        if not residual_ok:
            ev["notes"].append("残差未达标: " + ", ".join(f"{k}={v:.2e}" for k, v in res["failing"].items()))
        if not mon["ok"]:
            ev["notes"].append("监视量未稳定: " + ", ".join(k for k, v in mon["items"].items() if not v["ok"]))
        if not mass["ok"]:
            ev["notes"].append(f"质量不平衡 {mass['imbalance_rel']:.2e} > {mass['tol']:.1e}")
        return ev

    ev["references"] = check_references(parsed, spec)
    bad = [r for r in ev["references"] if not r["ok"]]
    if bad:
        ev["status"] = REF_MISMATCH
        for r in bad:
            if "expected" in r and r["value"] is not None:
                ev["notes"].append(f"{r['report']} = {r['value']:.6g},参考值 {r['expected']:.6g},相对误差 {r['rel_error']:.1%}")
            else:
                ev["notes"].append(f"{r['report']} = {r['value']},不在范围 {r.get('range')}")
        return ev
    ev["status"] = PASS
    return ev
