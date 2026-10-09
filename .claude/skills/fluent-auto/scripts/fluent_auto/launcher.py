"""Locate and launch Fluent in batch mode."""
from __future__ import annotations

import os
import shutil
import subprocess
import time

IS_WINDOWS = os.name == "nt"
DEFAULT_WIN_ROOT = r"C:\Program Files\ANSYS Inc\v221"


def find_fluent(spec: dict) -> list[str]:
    exe = spec["fluent"]["exe"]
    if isinstance(exe, list):
        return list(exe)
    if exe:
        return [exe]
    candidates = []
    root = os.environ.get("AWP_ROOT221")
    if root:
        candidates.append(os.path.join(root, "fluent", "ntbin", "win64", "fluent.exe"))
    candidates.append(os.path.join(DEFAULT_WIN_ROOT, "fluent", "ntbin", "win64", "fluent.exe"))
    for c in candidates:
        if os.path.exists(c):
            return [c]
    found = shutil.which("fluent")
    if found:
        return [found]
    raise FileNotFoundError(
        "找不到 fluent.exe:请在规格里设置 fluent.exe,例如 "
        r'"C:/Program Files/ANSYS Inc/v221/fluent/ntbin/win64/fluent.exe",'
        "或确认环境变量 AWP_ROOT221 存在")


def build_command(spec: dict, journal: str) -> list[str]:
    fl = spec["fluent"]
    version = f"{fl['dimension']}d" + ("dp" if fl["double_precision"] else "")
    cmd = find_fluent(spec) + [version]
    if int(fl["processes"]) > 1:
        cmd.append(f"-t{int(fl['processes'])}")
    cmd.append("-hidden" if fl["ui_mode"] == "hidden" and IS_WINDOWS else ("-gu" if fl["ui_mode"] == "hidden" else "-g"))
    if IS_WINDOWS:
        cmd.append("-wait")  # without it fluent.exe returns immediately on Windows
    cmd += list(fl["extra_args"])
    cmd += ["-i", journal]
    return cmd


def _kill_tree(proc: subprocess.Popen) -> None:
    if IS_WINDOWS:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
    else:
        proc.kill()


def run_fluent(spec: dict, journal: str, workdir: str, log_name: str = "launcher.log") -> dict:
    cmd = build_command(spec, journal)
    timeout = float(spec["fluent"]["timeout_min"]) * 60
    log_path = os.path.join(workdir, log_name)
    start = time.time()
    with open(log_path, "w", encoding="utf-8", errors="replace") as log:
        log.write("CMD: " + subprocess.list2cmdline(cmd) + "\n\n")
        log.flush()
        try:
            proc = subprocess.Popen(cmd, cwd=workdir, stdout=log, stderr=subprocess.STDOUT,
                                    stdin=subprocess.DEVNULL)
        except OSError as exc:
            log.write(f"启动失败: {exc}\n")
            return {"cmd": cmd, "returncode": None, "timed_out": False, "seconds": 0.0,
                    "launch_error": str(exc), "log": log_path}
        timed_out = False
        try:
            proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            _kill_tree(proc)
            proc.wait()
    return {"cmd": cmd, "returncode": proc.returncode, "timed_out": timed_out,
            "seconds": round(time.time() - start, 1), "log": log_path}
