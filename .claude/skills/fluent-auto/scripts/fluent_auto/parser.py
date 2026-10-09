"""Parse a Fluent transcript written by a fluent-auto journal.

The journal brackets every report with `@@FA ...` marker lines (printed by a
Scheme `display`), so values are read from known blocks instead of guessing
where in the transcript they are.
"""
from __future__ import annotations

import math
import re

NUM = r"[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?"
NUM_RE = re.compile(NUM)
ROW_RE = re.compile(rf"^\s*(\S+)\s+({NUM})\s*$")
RES_HEADER_RE = re.compile(r"^\s*iter\s+continuity\b")

DIVERGENCE_PATTERNS = [
    r"divergence detected",
    r"floating point (exception|error)",
    r"error:.*diverg",
]
SETUP_ERROR_PATTERNS = [
    r"invalid (command|choice|input|response|option)",
    r"\bambiguous\b",
    r"is not a valid",
    r"unknown (command|option|zone|surface)",
    r"error object",
    r"unbound variable",
    r"no such (file|zone|surface|thread)",
    r"cannot open file",
    r"^\s*error\b",
]
LICENSE_PATTERNS = [
    r"license.*(fail|denied|unavailable|not available|error|expired)",
    r"no license",
    r"flexnet.*(error|fail)",
]
WARNING_PATTERNS = {
    "reversed_flow": r"reversed flow",
    "turb_visc_limited": r"turbulent viscosity limited",
    "temperature_limited": r"temperature limited",
    "pressure_limited": r"(absolute )?pressure limited",
}


def to_float(tok: str):
    t = tok.strip().lower()
    if "nan" in t or "#" in t or "ind" in t:
        return float("nan")
    try:
        return float(t)
    except ValueError:
        return None


def is_marker(line: str) -> bool:
    return "@@FA " in line and "display" not in line


def _compiled(patterns):
    return [re.compile(p, re.IGNORECASE) for p in patterns]


_DIV, _SETUP, _LIC = _compiled(DIVERGENCE_PATTERNS), _compiled(SETUP_ERROR_PATTERNS), _compiled(LICENSE_PATTERNS)
_WARN = {k: re.compile(v, re.IGNORECASE) for k, v in WARNING_PATTERNS.items()}


def _is_echo(line: str) -> bool:
    s = line.strip()
    return s.startswith("/") or s.startswith("(") or s.startswith(";") or bool(re.match(r"^\S*>\s*[/(]", s))


def report_value(block: list[str], kind: str):
    """Pick the numeric answer out of a report block."""
    rows = [ln for ln in block if not _is_echo(ln) and not is_marker(ln)]
    for ln in reversed(rows):
        if re.match(r"^\s*net\b", ln, re.IGNORECASE):
            nums = [to_float(x) for x in NUM_RE.findall(ln)]
            nums = [x for x in nums if x is not None]
            if not nums:
                continue
            if kind == "wall-forces" and len(nums) >= 3:
                return nums[2]  # pressure, viscous, total, ... coefficients
            return nums[-1]
    for ln in reversed(rows):
        m = ROW_RE.match(ln)
        if m and to_float(m.group(2)) is not None and not re.search(r"\[.*\]", ln):
            return to_float(m.group(2))
    return None


def flux_table(block: list[str]) -> dict | None:
    zones, net = {}, None
    for ln in block:
        if _is_echo(ln) or is_marker(ln):
            continue
        m = ROW_RE.match(ln)
        if not m:
            continue
        name, val = m.group(1), to_float(m.group(2))
        if val is None:
            continue
        if name.lower() == "net":
            net = val
        else:
            zones[name] = val
    if net is None and not zones:
        return None
    if net is None:
        net = sum(zones.values())
    inflow = sum(v for v in zones.values() if v > 0)
    outflow = -sum(v for v in zones.values() if v < 0)
    scale = max(inflow, outflow, 1e-30)
    return {"zones": zones, "net": net, "inflow": inflow, "imbalance_rel": abs(net) / scale}


def zone_table(block: list[str]) -> list[dict]:
    zones = []
    row = re.compile(r"^\s*(\d+)\s+(\S+)\s+(\S+)(?:\s+(\S+))?\s+(cell|face)\s*$", re.IGNORECASE)
    for ln in block:
        m = row.match(ln)
        if m:
            zones.append({"id": int(m.group(1)), "name": m.group(2), "type": m.group(3),
                          "material": m.group(4) or "", "kind": m.group(5).lower()})
    return zones


def mesh_stats(text: str) -> dict:
    out = {}
    pats = {
        "min_orthogonal_quality": r"minimum orthogonal quality\s*=\s*(" + NUM + ")",
        "max_aspect_ratio": r"maximum aspect ratio\s*=\s*(" + NUM + ")",
        "min_volume": r"minimum volume\s*\(m3\)\s*:\s*(" + NUM + ")",
    }
    for key, p in pats.items():
        vals = [float(x) for x in re.findall(p, text, re.IGNORECASE)]
        if vals:
            out[key] = min(vals) if key.startswith("min") else max(vals)
    ext = re.findall(r"([xyz])-coordinate:\s*min\s*\(m\)\s*=\s*(" + NUM + r"),\s*max\s*\(m\)\s*=\s*(" + NUM + ")",
                     text, re.IGNORECASE)
    for axis, lo, hi in ext[:3]:
        out[f"{axis}_extent_m"] = [float(lo), float(hi)]
    return out


def parse_transcript(text: str) -> dict:
    lines = text.splitlines()
    res_names: list[str] | None = None
    residuals: list[dict] = []
    chunks: list[dict] = []
    zones: list[dict] = []
    errors, divergence, license_errors = [], [], []
    warnings = {k: 0 for k in _WARN}
    markers: list[str] = []
    converged_flag = False
    order_switches: list[int] = []
    block_kind, block_meta, block = None, {}, []

    def ctx(i):
        return "\n".join(lines[max(0, i - 3): i + 3])

    for i, ln in enumerate(lines):
        if is_marker(ln):
            tag = ln.split("@@FA ", 1)[1].strip()
            markers.append(tag)
            head, _, rest = tag.partition(" ")
            meta = dict(kv.split("=", 1) for kv in rest.split() if "=" in kv)
            if head in ("REPORT", "FLUX", "ZONES", "MESH"):
                block_kind, block_meta, block = head, meta, []
            elif head.startswith("END") and block_kind:
                if block_kind == "REPORT" and chunks:
                    chunks[-1]["reports"][block_meta.get("name")] = report_value(block, block_meta.get("kind", ""))
                elif block_kind == "FLUX" and chunks:
                    chunks[-1]["flux"] = flux_table(block)
                elif block_kind == "ZONES":
                    zones = zone_table(block)
                block_kind, block = None, []
            elif head == "CHUNK":
                chunks.append({"idx": int(meta.get("idx", len(chunks) + 1)),
                               "done": int(meta.get("done", 0)),
                               "iter": residuals[-1]["iter"] if residuals else None,
                               "reports": {}, "flux": None})
            elif head == "ORDER" and rest.strip() == "second":
                order_switches.append(residuals[-1]["iter"] if residuals else 0)
            continue

        if block_kind:
            block.append(ln)

        if RES_HEADER_RE.match(ln):
            names = ln.split()[1:]
            res_names = [n for n in names if n != "time/iter"]
            continue
        if res_names and re.match(r"^\s*\d+\s", ln):
            toks = ln.split()
            vals = [to_float(t) for t in toks[1:1 + len(res_names)]]
            if len(vals) == len(res_names) and all(v is not None for v in vals):
                residuals.append({"iter": int(toks[0]), "values": vals})
                continue

        low = ln.lower()
        if "solution is converged" in low:
            converged_flag = True
        if _is_echo(ln):
            continue
        for key, rx in _WARN.items():
            if rx.search(ln):
                warnings[key] += 1
        if any(rx.search(ln) for rx in _LIC):
            license_errors.append({"line": i + 1, "text": ln.strip(), "context": ctx(i)})
        elif any(rx.search(ln) for rx in _DIV):
            divergence.append({"line": i + 1, "text": ln.strip(), "context": ctx(i)})
        elif "error object" in low and divergence and i + 1 - divergence[-1]["line"] <= 3:
            continue  # Fluent's follow-up line to the divergence error, not a separate failure
        elif any(rx.search(ln) for rx in _SETUP):
            errors.append({"line": i + 1, "text": ln.strip(), "context": ctx(i)})

    nan_residual = any(any(math.isnan(v) or math.isinf(v) for v in r["values"]) for r in residuals)
    return {
        "residual_names": res_names or [],
        "residuals": residuals,
        "iterations_run": len(residuals),
        "last_iter": residuals[-1]["iter"] if residuals else None,
        "converged_flag": converged_flag,
        "nan_residual": nan_residual,
        "chunks": chunks,
        "zones": zones,
        "mesh": mesh_stats(text),
        "errors": errors,
        "divergence": divergence,
        "license_errors": license_errors,
        "warnings": warnings,
        "markers": markers,
        "order_switches": order_switches,
        "finished": "END" in markers,
    }


def read_transcript(path: str) -> str:
    with open(path, "rb") as fh:
        data = fh.read()
    for enc in ("utf-8", "gbk"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            pass
    return data.decode("utf-8", errors="replace")
