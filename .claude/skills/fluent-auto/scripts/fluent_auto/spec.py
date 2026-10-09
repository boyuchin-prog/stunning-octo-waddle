"""Case specification (JSON): defaults, loading and validation."""
from __future__ import annotations

import copy
import json
import os
import re

NAME_RE = re.compile(r"^[a-z][a-z0-9_-]*$")

VISCOUS_MODELS = {
    # spec name -> (TUI leaf under /define/models/viscous/, turbulence equations)
    "laminar": ("laminar", []),
    "ke-standard": ("ke-standard", ["k", "epsilon"]),
    "ke-realizable": ("ke-realizable", ["k", "epsilon"]),
    "ke-rng": ("ke-rng", ["k", "epsilon"]),
    "kw-standard": ("kw-standard", ["k", "omega"]),
    "kw-sst": ("kw-sst", ["k", "omega"]),
    "sa": ("spalart-allmaras", ["nut"]),
}

BC_TYPES = {"velocity-inlet", "mass-flow-inlet", "pressure-outlet", "wall", "symmetry"}

SURFACE_INTEGRAL_FIELD_KINDS = {
    "area-weighted-avg", "mass-weighted-avg", "facet-avg", "facet-max", "facet-min",
    "integral", "sum", "vertex-avg", "vertex-max", "vertex-min",
}
SURFACE_INTEGRAL_NOFIELD_KINDS = {"mass-flow-rate", "volume-flow-rate", "area"}
REPORT_KINDS = SURFACE_INTEGRAL_FIELD_KINDS | SURFACE_INTEGRAL_NOFIELD_KINDS | {"wall-forces", "raw"}

DEFAULTS = {
    "name": "case",
    "fluent": {
        "exe": None,                # path to fluent.exe, or a list (e.g. a wrapper command)
        "dimension": 3,
        "double_precision": True,
        "processes": 4,
        "ui_mode": "hidden",        # hidden (-hidden, can save pictures) | batch (-g, no graphics)
        "extra_args": [],
        "timeout_min": 240,         # per attempt
        "allow_non_ascii_paths": False,
    },
    "input": {
        "file": None,
        "kind": "auto",             # auto | mesh | case
        "scale": None,              # e.g. 0.001 when the mesh was exported in mm
    },
    "run_root": None,               # default: <spec dir>/fa_runs/<name>
    "setup": {
        "apply": None,              # None -> True for mesh input, False for case input
        "viscous": None,
        "energy": False,
        "material": None,           # {"name": "air", "density": 1.225, "viscosity": 1.7894e-5}
        "boundary_conditions": [],
        "raw_tui": [],
    },
    "surfaces": [],
    "solver": {
        "p_v_coupling": "simple",   # simple | simplec | coupled
        "courant": None,            # coupled only; None -> 200
        "explicit_urf": {},         # coupled only: {"mom": 0.75, "pressure": 0.75}
        "urf": {},                  # overrides of under-relaxation factors
        "second_order": True,
        "first_order_warmup": 100,  # iterations run first-order before switching
        "init": "hybrid",           # hybrid | standard
        "iterations": 1000,         # per attempt
        "chunk": 50,                # reports are printed every `chunk` iterations
        "equations": None,          # residual equation order; auto-derived or from inspect
        "max_total_iterations": 6000,
    },
    "reports": [],
    "convergence": {
        "residual": 1e-4,
        "residual_energy": 1e-6,
        "monitor_window": 3,        # number of trailing chunks that must agree
        "monitor_rel_tol": 0.005,
        "check_mass_imbalance": True,
        "mass_imbalance_rel": 0.002,
        "accept_flat_residuals": True,
        "residual_relaxed": 1e-3,
    },
    "references": [],
    "exports": {
        "contours": [],
        "data": [],
        "picture": {"width": 1600, "height": 1000},
        "animation": {"enabled": False, "contour": None, "every_chunks": 1, "fps": 5},
    },
    "debug": {
        "max_attempts": 6,
        "auto_numeric_fix": True,
    },
}


def deep_merge(base: dict, override: dict) -> dict:
    out = copy.deepcopy(base)
    for key, value in (override or {}).items():
        if key.startswith("_"):
            continue  # "_comment" keys are allowed anywhere
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = copy.deepcopy(value)
    return out


def detect_input_kind(path: str) -> str:
    low = path.lower()
    if re.search(r"\.msh(\.h5|\.gz)?$", low):
        return "mesh"
    if re.search(r"\.cas(\.h5|\.gz)?$", low):
        return "case"
    return "unknown"


def load_spec(path: str) -> dict:
    with open(path, "r", encoding="utf-8-sig") as fh:
        raw = json.load(fh)
    spec = deep_merge(DEFAULTS, raw)
    spec["_spec_path"] = os.path.abspath(path)
    spec["_spec_dir"] = os.path.dirname(os.path.abspath(path))
    resolve(spec)
    return spec


def _abs(spec: dict, p: str | None) -> str | None:
    if not p:
        return p
    if os.path.isabs(p):
        return os.path.normpath(p)
    return os.path.normpath(os.path.join(spec["_spec_dir"], p))


def resolve(spec: dict) -> None:
    """Fill derived fields in place (absolute paths, input kind, setup.apply)."""
    spec["input"]["file"] = _abs(spec, spec["input"]["file"])
    if spec["input"]["kind"] == "auto" and spec["input"]["file"]:
        spec["input"]["kind"] = detect_input_kind(spec["input"]["file"])
    if spec["setup"]["apply"] is None:
        spec["setup"]["apply"] = spec["input"]["kind"] == "mesh"
    root = spec.get("run_root") or os.path.join("fa_runs", spec["name"])
    spec["run_root"] = _abs(spec, root)


def derive_equations(spec: dict, inspected: list[str] | None = None) -> list[str] | None:
    """Residual equations in Fluent's monitor order, or None if unknown."""
    if spec["solver"].get("equations"):
        return list(spec["solver"]["equations"])
    setup = spec["setup"]
    if setup["apply"] and setup["viscous"] in VISCOUS_MODELS:
        eqs = ["continuity", "x-velocity", "y-velocity"]
        if spec["fluent"]["dimension"] == 3:
            eqs.append("z-velocity")
        if setup["energy"]:
            eqs.append("energy")
        eqs += VISCOUS_MODELS[setup["viscous"]][1]
        return eqs
    return list(inspected) if inspected else None


def _is_ascii(s: str) -> bool:
    try:
        s.encode("ascii")
        return True
    except UnicodeEncodeError:
        return False


def validate(spec: dict) -> tuple[list[str], list[str]]:
    """Return (errors, warnings). Messages are in Chinese for the end user."""
    errors: list[str] = []
    warnings: list[str] = []
    fl = spec["fluent"]

    if fl["dimension"] not in (2, 3):
        errors.append("fluent.dimension 只能是 2 或 3")
    if fl["ui_mode"] not in ("hidden", "batch"):
        errors.append("fluent.ui_mode 只能是 hidden 或 batch")
    if fl["ui_mode"] == "batch" and (spec["exports"]["contours"] or spec["exports"]["animation"]["enabled"]):
        warnings.append("ui_mode=batch(-g) 下 Fluent 不能渲染图片,云图/动画导出会失败;建议用 hidden")

    f = spec["input"]["file"]
    if not f:
        errors.append("input.file 未填写(网格 .msh/.msh.h5 或 case .cas/.cas.h5)")
    else:
        if not os.path.exists(f):
            errors.append(f"输入文件不存在: {f}")
        if spec["input"]["kind"] not in ("mesh", "case"):
            errors.append("无法从扩展名判断 input.kind,请设为 mesh 或 case")
    sc = spec["input"]["scale"]
    if sc is not None and (not isinstance(sc, (int, float)) or sc <= 0):
        errors.append("input.scale 必须是正数,例如网格单位是 mm 时填 0.001")
    for label, p in (("input.file", f), ("run_root", spec["run_root"])):
        if p and not _is_ascii(p) and not fl["allow_non_ascii_paths"]:
            errors.append(f"{label} 路径含中文或其他非 ASCII 字符,Fluent 2022 R1 经常因此读写失败,请换成纯英文路径: {p}")

    setup = spec["setup"]
    if setup["apply"]:
        if setup["viscous"] not in VISCOUS_MODELS:
            errors.append(f"setup.viscous 必须是 {sorted(VISCOUS_MODELS)} 之一(网格输入时需要明确湍流模型)")
        mat = setup["material"]
        if mat is not None:
            for k in ("name", "density", "viscosity"):
                if k not in mat:
                    errors.append(f"setup.material 缺少 {k}")
        for i, bc in enumerate(setup["boundary_conditions"]):
            where = f"setup.boundary_conditions[{i}]"
            if "zone" not in bc or "type" not in bc:
                errors.append(f"{where} 需要 zone 和 type")
                continue
            if bc["type"] not in BC_TYPES:
                errors.append(f"{where}.type={bc['type']} 暂不支持自动生成,请改用 setup.raw_tui;支持: {sorted(BC_TYPES)}")
            if bc["type"] == "velocity-inlet" and "velocity" not in bc:
                errors.append(f"{where} velocity-inlet 需要 velocity (m/s)")
            if bc["type"] == "mass-flow-inlet" and "mass_flow" not in bc:
                errors.append(f"{where} mass-flow-inlet 需要 mass_flow (kg/s)")
            if bc["type"] == "pressure-outlet" and "gauge_pressure" not in bc:
                errors.append(f"{where} pressure-outlet 需要 gauge_pressure (Pa)")
    elif setup["boundary_conditions"] or setup["viscous"] or setup["material"]:
        warnings.append("setup.apply=false(case 输入),setup 里的模型/材料/边界条件不会被应用;如需覆盖请设 setup.apply=true")

    for i, s in enumerate(spec["surfaces"]):
        if not NAME_RE.match(str(s.get("name", ""))):
            errors.append(f"surfaces[{i}].name 只能用小写字母/数字/-/_ 且以字母开头")
        if s.get("type") != "plane" or s.get("axis") not in ("x", "y", "z") or "value" not in s:
            errors.append(f"surfaces[{i}] 目前只支持 {{type: plane, axis: x|y|z, value: 坐标}}")

    sv = spec["solver"]
    if sv["p_v_coupling"] not in ("simple", "simplec", "coupled"):
        errors.append("solver.p_v_coupling 只能是 simple / simplec / coupled")
    if sv["init"] not in ("hybrid", "standard"):
        errors.append("solver.init 只能是 hybrid / standard")
    if sv["chunk"] <= 0 or sv["iterations"] <= 0:
        errors.append("solver.iterations 和 solver.chunk 必须为正整数")
    elif spec["reports"] and -(-sv["iterations"] // sv["chunk"]) < spec["convergence"]["monitor_window"] + 1:
        warnings.append(f"每次尝试只有 {-(-sv['iterations'] // sv['chunk'])} 个报告采样点,少于 monitor_window+1="
                        f"{spec['convergence']['monitor_window'] + 1},监视量稳定性无法判定;请减小 solver.chunk")

    names = set()
    for i, r in enumerate(spec["reports"]):
        where = f"reports[{i}]"
        name = r.get("name", "")
        if not NAME_RE.match(str(name)):
            errors.append(f"{where}.name 只能用小写字母/数字/-/_ 且以字母开头")
        if name in names:
            errors.append(f"{where}.name 重复: {name}")
        names.add(name)
        kind = r.get("kind")
        if kind not in REPORT_KINDS:
            errors.append(f"{where}.kind={kind} 不支持;可选 {sorted(REPORT_KINDS)}")
            continue
        if kind in SURFACE_INTEGRAL_FIELD_KINDS | SURFACE_INTEGRAL_NOFIELD_KINDS and not r.get("surfaces"):
            errors.append(f"{where} 需要 surfaces 列表")
        if kind in SURFACE_INTEGRAL_FIELD_KINDS and not r.get("field"):
            errors.append(f"{where} 需要 field(例如 pressure、velocity-magnitude)")
        if kind == "wall-forces":
            d = r.get("direction")
            if not isinstance(d, list) or len(d) != fl["dimension"]:
                errors.append(f"{where}.direction 需要 {fl['dimension']} 个分量,例如 [1, 0, 0]")
        if kind == "raw" and not r.get("tui"):
            errors.append(f"{where} kind=raw 需要 tui 命令字符串")

    for i, ref in enumerate(spec["references"]):
        where = f"references[{i}]"
        if ref.get("report") not in names:
            errors.append(f"{where}.report 必须是 reports 中的某个 name")
        has_tol = "expected" in ref and ("rel_tol" in ref or "abs_tol" in ref)
        has_range = isinstance(ref.get("range"), list) and len(ref["range"]) == 2
        if not (has_tol or has_range):
            errors.append(f"{where} 需要 expected + rel_tol/abs_tol,或 range: [min, max]")

    contour_names = set()
    for i, c in enumerate(spec["exports"]["contours"]):
        where = f"exports.contours[{i}]"
        if not NAME_RE.match(str(c.get("name", ""))):
            errors.append(f"{where}.name 只能用小写字母/数字/-/_ 且以字母开头")
        if not c.get("field") or not c.get("surfaces"):
            errors.append(f"{where} 需要 field 和 surfaces")
        contour_names.add(c.get("name"))
    for i, d in enumerate(spec["exports"]["data"]):
        where = f"exports.data[{i}]"
        if not NAME_RE.match(str(d.get("name", ""))):
            errors.append(f"{where}.name 只能用小写字母/数字/-/_ 且以字母开头")
        if not d.get("surfaces") or not d.get("fields"):
            errors.append(f"{where} 需要 surfaces 和 fields")
    anim = spec["exports"]["animation"]
    if anim["enabled"] and anim["contour"] not in contour_names:
        errors.append("exports.animation.contour 必须是 exports.contours 中的某个 name")

    if derive_equations(spec) is None:
        warnings.append("未知残差方程列表(case 输入):run 会先自动执行 inspect 读取")
    if not spec["reports"]:
        warnings.append("没有定义 reports:无法做监视量稳定性判断和参考值比对")
    return errors, warnings
