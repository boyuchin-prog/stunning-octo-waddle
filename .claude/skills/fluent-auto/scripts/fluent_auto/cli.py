"""Command line: python fa.py <command> ..."""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time

from . import evaluate as E
from . import report, strategy, tui
from .launcher import build_command, run_fluent
from .parser import parse_transcript, read_transcript
from .spec import derive_equations, load_spec, validate

HERE = os.path.dirname(os.path.abspath(__file__))
EXAMPLE = os.path.join(HERE, "..", "..", "templates", "example_spec.json")


def _say(msg: str) -> None:
    print(msg, flush=True)


def _dump(path: str, obj) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=2, default=str)
    os.replace(tmp, path)


def _load_checked(path: str) -> dict:
    spec = load_spec(path)
    errors, warnings = validate(spec)
    for w in warnings:
        _say(f"[警告] {w}")
    if errors:
        for e in errors:
            _say(f"[错误] {e}")
        raise SystemExit(2)
    return spec


# ------------------------------------------------------------------ inspect --

def do_inspect(spec: dict) -> dict:
    out_dir = os.path.join(spec["run_root"], "inspect")
    os.makedirs(out_dir, exist_ok=True)
    journal = os.path.join(out_dir, "inspect.jou")
    with open(journal, "w", encoding="ascii", errors="replace") as fh:
        fh.write(tui.build_inspect_journal(spec, out_dir))
    _say(f"[inspect] 启动 Fluent 读取 {spec['input']['file']} ...")
    info = run_fluent(spec, journal, out_dir)
    trn = os.path.join(out_dir, "inspect.trn")
    if not os.path.exists(trn):
        raise SystemExit(f"[inspect] 没有生成 transcript,Fluent 可能没有启动。请看 {info['log']}")
    parsed = parse_transcript(read_transcript(trn))
    result = {"input": spec["input"]["file"], "input_mtime": os.path.getmtime(spec["input"]["file"]),
              "zones": parsed["zones"], "mesh": parsed["mesh"],
              "equations": parsed["residual_names"] or None,
              "errors": parsed["errors"], "transcript": trn}
    _dump(os.path.join(out_dir, "inspect.json"), result)
    return result


def _print_inspect(result: dict) -> None:
    _say("区域 (zones):")
    for z in result["zones"]:
        _say(f"  {z['id']:>4}  {z['name']:<32} {z['type']:<20} {z['kind']}")
    mesh = result["mesh"]
    quality = {k: v for k, v in mesh.items() if not k.endswith("_extent_m")}
    if quality:
        _say("网格质量: " + ", ".join(f"{k}={v:.4g}" for k, v in quality.items()))
    extents = [(k[0], v) for k, v in mesh.items() if k.endswith("_extent_m")]
    if extents:
        _say("计算域尺寸 (m): " + ", ".join(f"{a}: {lo:.4g} ~ {hi:.4g} (长 {hi - lo:.4g})" for a, (lo, hi) in extents)
             + "  ← 请确认单位正确;若实际是 mm,规格里设 input.scale = 0.001")
    if result["equations"]:
        _say("残差方程: " + " ".join(result["equations"]))
    for e in result["errors"]:
        _say(f"[transcript 错误] 第 {e['line']} 行: {e['text']}")


def cached_inspect(spec: dict) -> dict | None:
    path = os.path.join(spec["run_root"], "inspect", "inspect.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    same = (data.get("input") == spec["input"]["file"]
            and abs(data.get("input_mtime", 0) - os.path.getmtime(spec["input"]["file"])) < 1)
    return data if same else None


def resolve_equations(spec: dict) -> list[str] | None:
    eqs = derive_equations(spec)
    if eqs:
        return eqs
    data = cached_inspect(spec) or do_inspect(spec)
    eqs = derive_equations(spec, data.get("equations"))
    if not eqs:
        raise SystemExit("[错误] 无法得到残差方程列表:请在规格里写 solver.equations,"
                         '例如 ["continuity","x-velocity","y-velocity","z-velocity","k","omega"]')
    _say("残差方程(来自 inspect): " + " ".join(eqs))
    return eqs


# --------------------------------------------------------------------- run --

def run(spec: dict) -> int:
    eqs = resolve_equations(spec)
    run_dir = os.path.join(spec["run_root"], time.strftime("%Y%m%d-%H%M%S"))
    os.makedirs(run_dir, exist_ok=True)
    shutil.copy2(spec["_spec_path"], os.path.join(run_dir, "spec.json"))
    with open(os.path.join(spec["run_root"], "latest.txt"), "w", encoding="utf-8") as fh:
        fh.write(run_dir)

    num = strategy.initial_numerics(spec)
    attempts: list[dict] = []
    restart_from_attempt = None
    total_iters = 0
    progress = {"state": "running", "run_dir": run_dir, "started": time.strftime("%Y-%m-%d %H:%M:%S"),
                "attempt": 0, "history": []}
    final_status, final_note = None, ""
    max_attempts = int(spec["debug"]["max_attempts"])

    for attempt in range(1, max_attempts + 1):
        adir = os.path.join(run_dir, f"attempt_{attempt:02d}")
        for sub_dir in ("contours", "data", "frames"):  # Fluent will not create missing folders
            os.makedirs(os.path.join(adir, sub_dir), exist_ok=True)
        restart_file = None
        if restart_from_attempt:
            restart_file = os.path.join(run_dir, f"attempt_{restart_from_attempt:02d}", "result.cas.h5")
            if not os.path.exists(restart_file):
                _say(f"[第 {attempt} 次] 找不到续算文件 {restart_file},改为重新初始化")
                restart_file, restart_from_attempt = None, None
        journal = os.path.join(adir, "run.jou")
        with open(journal, "w", encoding="ascii", errors="replace") as fh:
            fh.write(tui.build_run_journal(spec, num, eqs, adir, attempt, restart_file))

        progress.update(attempt=attempt, current_transcript=os.path.join(adir, "transcript.trn"),
                        updated=time.strftime("%Y-%m-%d %H:%M:%S"))
        _dump(os.path.join(run_dir, "progress.json"), progress)
        _say(f"[第 {attempt} 次] {report.numerics_summary(num)}"
             + (f",续算自第 {restart_from_attempt} 次" if restart_from_attempt else ",重新初始化"))

        info = run_fluent(spec, journal, adir)
        trn = os.path.join(adir, "transcript.trn")
        parsed = parse_transcript(read_transcript(trn)) if os.path.exists(trn) else None
        ev = E.evaluate(parsed, spec, num, info)
        total_iters += (parsed or {}).get("iterations_run", 0)
        decision = strategy.next_attempt(spec, num, ev, total_iters)

        rec = {"attempt": attempt, "dir": adir, "numerics": num, "run_info": info, "parsed": parsed,
               "evaluation": ev, "restart_from_attempt": restart_from_attempt,
               "decision_note": decision["note"]}
        attempts.append(rec)
        _dump(os.path.join(adir, "attempt.json"), rec)
        _say(f"[第 {attempt} 次] 结果: {ev['status']}({E.STATUS_ZH.get(ev['status'], '')}),"
             f"迭代 {(parsed or {}).get('iterations_run', 0)} 步,用时 {info.get('seconds')} s")
        for n in ev["notes"]:
            _say(f"    - {n}")
        _say(f"    → {decision['note']}")
        progress["history"].append({"attempt": attempt, "status": ev["status"], "note": decision["note"]})

        if decision["action"] == "stop":
            final_status, final_note = decision["final"], decision["note"]
            break
        num = decision["numerics"]
        restart_from_attempt = attempt if decision["restart"] else None
    else:
        final_status = strategy.NEED_USER
        final_note = f"已达到最大尝试次数 debug.max_attempts={max_attempts}"

    files = report.write_report(run_dir, spec, attempts, final_status, final_note)
    progress.update(state="finished", final_status=final_status, note=final_note,
                    updated=time.strftime("%Y-%m-%d %H:%M:%S"))
    _dump(os.path.join(run_dir, "progress.json"), progress)
    _say(f"\n最终状态: {final_status}({report.FINAL_ZH.get(final_status, '')}) — {final_note}")
    _say(f"报告: {files['report_md']}")
    return 0 if final_status == E.PASS else 1


# ------------------------------------------------------------------ others --

def status(spec: dict) -> None:
    latest = os.path.join(spec["run_root"], "latest.txt")
    if not os.path.exists(latest):
        _say("还没有运行记录")
        return
    with open(latest, encoding="utf-8") as fh:
        run_dir = fh.read().strip()
    with open(os.path.join(run_dir, "progress.json"), encoding="utf-8") as fh:
        prog = json.load(fh)
    _say(f"运行目录: {run_dir}\n状态: {prog['state']}  当前第 {prog['attempt']} 次")
    for h in prog["history"]:
        _say(f"  #{h['attempt']}: {h['status']} → {h['note']}")
    trn = prog.get("current_transcript")
    if prog["state"] == "running" and trn and os.path.exists(trn):
        p = parse_transcript(read_transcript(trn))
        if p["residuals"]:
            r = p["residuals"][-1]
            _say(f"  当前迭代 {r['iter']}: " + ", ".join(f"{n}={v:.2e}" for n, v in zip(p["residual_names"], r["values"])))
        if p["chunks"]:
            _say("  最新报告: " + ", ".join(f"{k}={v}" for k, v in p["chunks"][-1]["reports"].items()))
        for e in (p["errors"] + p["divergence"])[:3]:
            _say(f"  [!] {e['text']}")
    if prog["state"] == "finished":
        _say(f"最终: {prog.get('final_status')} — {prog.get('note')}")


def regen_report(spec: dict, run_dir: str) -> None:
    attempts = []
    for name in sorted(os.listdir(run_dir)):
        p = os.path.join(run_dir, name, "attempt.json")
        if name.startswith("attempt_") and os.path.exists(p):
            with open(p, encoding="utf-8") as fh:
                attempts.append(json.load(fh))
    with open(os.path.join(run_dir, "progress.json"), encoding="utf-8") as fh:
        prog = json.load(fh)
    files = report.write_report(run_dir, spec, attempts, prog.get("final_status", "?"), prog.get("note", ""))
    _say(f"报告已重新生成: {files['report_md']}")


def analyze(spec: dict, transcript: str) -> None:
    parsed = parse_transcript(read_transcript(transcript))
    ev = E.evaluate(parsed, spec, strategy.initial_numerics(spec), {})
    out = {"status": ev["status"], "notes": ev["notes"], "trend": ev["trend"],
           "residual_names": parsed["residual_names"], "iterations_run": parsed["iterations_run"],
           "last_residuals": parsed["residuals"][-1] if parsed["residuals"] else None,
           "last_reports": parsed["chunks"][-1]["reports"] if parsed["chunks"] else None,
           "errors": parsed["errors"], "divergence": parsed["divergence"], "warnings": parsed["warnings"],
           "mesh": parsed["mesh"], "zones": parsed["zones"]}
    print(json.dumps(out, ensure_ascii=False, indent=2))


def main(argv=None) -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")
        except AttributeError:
            pass
    ap = argparse.ArgumentParser(prog="fluent_auto", description="Fluent 2022 R1 全流程自动化")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("example", help="写出一个示例规格文件")
    p.add_argument("out")
    for name, helptext in (("check", "校验规格文件"), ("inspect", "启动 Fluent 读取区域/网格质量/残差方程"),
                           ("run", "全流程运行 + 自动调试"), ("status", "查看最近一次运行的进度")):
        p = sub.add_parser(name, help=helptext)
        p.add_argument("spec")
    p = sub.add_parser("gen", help="只生成第 1 次的 journal(不运行),用于检查")
    p.add_argument("spec")
    p.add_argument("-o", "--out")
    p = sub.add_parser("analyze", help="离线解析一个 transcript 并给出判定")
    p.add_argument("spec")
    p.add_argument("transcript")
    p = sub.add_parser("report", help="根据已有运行目录重新生成报告")
    p.add_argument("spec")
    p.add_argument("run_dir")
    args = ap.parse_args(argv)

    if args.cmd == "example":
        shutil.copy2(EXAMPLE, args.out)
        _say(f"已写出 {args.out},按需修改后执行 check")
        return 0
    if args.cmd == "status":
        status(load_spec(args.spec))
        return 0
    spec = _load_checked(args.spec)
    if args.cmd == "check":
        eqs = derive_equations(spec)
        _say("规格校验通过。残差方程: " + (" ".join(eqs) if eqs else "未知(run 时会自动 inspect)"))
        try:
            _say("Fluent 启动命令示例: " + " ".join(build_command(spec, "run.jou")))
        except FileNotFoundError as exc:
            _say(f"[警告] {exc}")
        return 0
    if args.cmd == "inspect":
        _print_inspect(do_inspect(spec))
        return 0
    if args.cmd == "gen":
        eqs = derive_equations(spec) or (cached_inspect(spec) or {}).get("equations")
        text = tui.build_run_journal(spec, strategy.initial_numerics(spec), eqs,
                                     os.path.join(spec["run_root"], "preview"), 1, None)
        if args.out:
            with open(args.out, "w", encoding="ascii", errors="replace") as fh:
                fh.write(text)
            _say(f"journal 已写到 {args.out}")
        else:
            print(text)
        return 0
    if args.cmd == "analyze":
        analyze(spec, args.transcript)
        return 0
    if args.cmd == "report":
        regen_report(spec, args.run_dir)
        return 0
    return run(spec)
