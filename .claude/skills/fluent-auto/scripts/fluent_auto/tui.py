"""TUI command templates and journal builders.

Every Fluent command string the package emits lives in TEMPLATES below, so a
command whose prompt sequence differs on your installation is fixed in exactly
one place. Entries marked VERIFY have not been confirmed against a live
Fluent 2022 R1 session; see reference/tui-notes.md for the calibration
procedure.
"""
from __future__ import annotations

import os

from .spec import (SURFACE_INTEGRAL_FIELD_KINDS, SURFACE_INTEGRAL_NOFIELD_KINDS,
                   VISCOUS_MODELS)

TEMPLATES = {
    # --- session / files ---
    "start_transcript": '/file/start-transcript {path}',
    "stop_transcript": "/file/stop-transcript",
    # confirm-overwrite? exit-on-error? hide-questions? redisplay-questions?
    "batch_options": "/file/set-batch-options no yes yes no",  # VERIFY prompt order
    "confirm_overwrite": "/file/confirm-overwrite no",
    "read_case": "/file/read-case {path}",
    "read_case_data": "/file/read-case-data {path}",
    "write_case_data": "/file/write-case-data {path}",
    "exit": "/exit yes",
    # --- mesh ---
    "mesh_check": "/mesh/check",
    "mesh_quality": "/mesh/quality",
    "mesh_scale": "/mesh/scale {factors}",
    "list_zones": "/define/boundary-conditions/list-zones",
    # --- models / materials ---
    "viscous": "/define/models/viscous/{model} yes",
    "energy_on": "/define/models/energy yes no no no yes",  # VERIFY
    "material_change": ("/define/materials/change-create {name} {name} yes constant {density} "
                        "no no yes constant {viscosity} no no no"),  # VERIFY
    # --- boundary conditions ---
    "zone_type": "/define/boundary-conditions/zone-type {zone} {type}",
    "bc_set": "/define/boundary-conditions/set/{type} {zone} () {settings} quit",
    "bc_velocity": "vmag no {value}",                  # VERIFY ("no" = not a profile/expression)
    "bc_mass_flow": "mass-flow no {value}",            # VERIFY
    "bc_gauge_pressure": "gauge-pressure no {value}",  # VERIFY
    "bc_turb_intensity": "turb-intensity {value}",     # VERIFY (percent)
    "bc_turb_viscosity_ratio": "turb-viscosity-ratio {value}",  # VERIFY
    # --- surfaces ---
    "plane_surface": "/surface/plane-surface {name} {method} {value}",  # VERIFY
    # --- solver ---
    "p_v_coupling": "/solve/set/p-v-coupling {code}",
    "p_v_controls": "/solve/set/p-v-controls {courant} {mom} {pressure}",  # VERIFY (coupled, non-pseudo-transient)
    "urf": "/solve/set/under-relaxation {var} {value}",
    "discretization": "/solve/set/discretization-scheme {var} {code}",
    "residual_criteria": "/solve/monitors/residual/convergence-criteria {values}",
    "init_hybrid": "/solve/initialize/hyb-initialization",
    "init_defaults": "/solve/initialize/compute-defaults/all-zones",
    "init_standard": "/solve/initialize/initialize-flow",
    "iterate": "/solve/iterate {n}",
    # --- reports (printed to the transcript, parsed by parser.py) ---
    "si_field": "/report/surface-integrals/{kind} {surfaces} () {field} no",
    "si_nofield": "/report/surface-integrals/{kind} {surfaces} () no",
    "mass_flux_all": "/report/fluxes/mass-flow yes no",  # VERIFY
    "wall_forces": "/report/forces/wall-forces yes {direction} no",  # VERIFY
    # --- graphics / export ---
    "pic_driver": "/display/set/picture/driver png",
    "pic_window_res": "/display/set/picture/use-window-resolution? no",  # VERIFY
    "pic_x": "/display/set/picture/x-resolution {value}",
    "pic_y": "/display/set/picture/y-resolution {value}",
    "contour_create": "/display/objects/create contour {name} field {field} surfaces-list {surfaces} () quit",  # VERIFY
    "display_object": "/display/objects/display {name}",
    "restore_view": "/display/views/restore-view {view}",
    "auto_scale": "/display/views/auto-scale",
    "save_picture": "/display/save-picture {path}",
    "export_ascii": "/file/export/ascii {path} {surfaces} () yes {fields} () no",  # VERIFY
}

P_V_CODES = {"simple": 20, "simplec": 21, "coupled": 24}
FIRST_ORDER, SECOND_ORDER = 0, 1
PRESSURE_STANDARD, PRESSURE_SECOND = 10, 12

# residual equation -> variable name used by discretization / under-relaxation menus
EQ_VAR = {"k": "k", "epsilon": "epsilon", "omega": "omega", "nut": "nut", "energy": "temperature"}


def q(path: str) -> str:
    """Quote a path for Fluent; forward slashes work on Windows too."""
    return '"' + os.path.abspath(path).replace("\\", "/") + '"'


def marker(text: str) -> str:
    """Scheme snippet that prints `@@FA <text>` on its own transcript line."""
    return f'(begin (newline) (display "@@FA {text}") (newline))'


def fmt(x) -> str:
    if isinstance(x, float):
        return f"{x:.6g}"
    return str(x)


# ---------------------------------------------------------------- setup ----

def setup_lines(spec: dict) -> list[str]:
    T, s = TEMPLATES, spec["setup"]
    lines = [marker("SETUP")]
    if s["viscous"]:
        lines.append(T["viscous"].format(model=VISCOUS_MODELS[s["viscous"]][0]))
    if s["energy"]:
        lines.append(T["energy_on"])
    if s["material"]:
        m = s["material"]
        lines.append(T["material_change"].format(name=m["name"], density=fmt(m["density"]),
                                                 viscosity=fmt(m["viscosity"])))
    for bc in s["boundary_conditions"]:
        if bc.get("set_type"):
            lines.append(T["zone_type"].format(zone=bc["zone"], type=bc["type"]))
        settings = []
        if bc["type"] == "velocity-inlet":
            settings.append(T["bc_velocity"].format(value=fmt(bc["velocity"])))
        elif bc["type"] == "mass-flow-inlet":
            settings.append(T["bc_mass_flow"].format(value=fmt(bc["mass_flow"])))
        elif bc["type"] == "pressure-outlet":
            settings.append(T["bc_gauge_pressure"].format(value=fmt(bc["gauge_pressure"])))
        if bc["type"] in ("velocity-inlet", "mass-flow-inlet", "pressure-outlet"):
            if "turb_intensity" in bc:
                settings.append(T["bc_turb_intensity"].format(value=fmt(bc["turb_intensity"])))
            if "turb_viscosity_ratio" in bc:
                settings.append(T["bc_turb_viscosity_ratio"].format(value=fmt(bc["turb_viscosity_ratio"])))
        if settings:
            lines.append(T["bc_set"].format(type=bc["type"], zone=bc["zone"], settings=" ".join(settings)))
    lines.extend(s["raw_tui"])
    lines.append(marker("ENDSETUP"))
    return lines


def surface_lines(spec: dict) -> list[str]:
    method = {"x": "yz-plane", "y": "zx-plane", "z": "xy-plane"}
    return [TEMPLATES["plane_surface"].format(name=s["name"], method=method[s["axis"]], value=fmt(s["value"]))
            for s in spec["surfaces"]]


# ------------------------------------------------------------- numerics ----

def turbulent(eqs: list[str]) -> bool:
    return any(e in eqs for e in ("k", "epsilon", "omega", "nut"))


def numerics_lines(num: dict, eqs: list[str] | None, order: str) -> list[str]:
    T = TEMPLATES
    lines = [T["p_v_coupling"].format(code=P_V_CODES[num["p_v_coupling"]])]
    coupled = num["p_v_coupling"] == "coupled"
    if coupled:
        lines.append(T["p_v_controls"].format(courant=fmt(num["courant"]),
                                              mom=fmt(num["explicit_urf"]["mom"]),
                                              pressure=fmt(num["explicit_urf"]["pressure"])))
    allowed = set() if coupled else {"pressure", "mom"}
    if eqs:
        allowed |= {EQ_VAR[e] for e in eqs if e in EQ_VAR}
        if turbulent(eqs):
            allowed.add("turb-viscosity")
    for var, value in num["urf"].items():
        if var in allowed:
            lines.append(T["urf"].format(var=var, value=fmt(value)))
    lines += discretization_lines(eqs, order)
    if eqs:
        vals = [fmt(num["residual_energy"] if e == "energy" else num["residual"]) for e in eqs]
        lines.append(T["residual_criteria"].format(values=" ".join(vals)))
    return lines


def discretization_lines(eqs: list[str] | None, order: str) -> list[str]:
    T = TEMPLATES
    second = order == "second"
    lines = [T["discretization"].format(var="pressure", code=PRESSURE_SECOND if second else PRESSURE_STANDARD),
             T["discretization"].format(var="mom", code=SECOND_ORDER if second else FIRST_ORDER)]
    for e in eqs or []:
        if e in EQ_VAR:
            lines.append(T["discretization"].format(var=EQ_VAR[e], code=SECOND_ORDER if second else FIRST_ORDER))
    return lines + [marker(f"ORDER {order}")]


def init_lines(num: dict) -> list[str]:
    T = TEMPLATES
    if num["init"] == "hybrid":
        return [T["init_hybrid"]]
    return [T["init_defaults"], T["init_standard"]]


# -------------------------------------------------------------- reports ----

def report_lines(spec: dict) -> list[str]:
    T = TEMPLATES
    lines = []
    for r in spec["reports"]:
        kind = r["kind"]
        lines.append(marker(f"REPORT name={r['name']} kind={kind}"))
        if kind in SURFACE_INTEGRAL_FIELD_KINDS:
            lines.append(T["si_field"].format(kind=kind, surfaces=" ".join(r["surfaces"]), field=r["field"]))
        elif kind in SURFACE_INTEGRAL_NOFIELD_KINDS:
            lines.append(T["si_nofield"].format(kind=kind, surfaces=" ".join(r["surfaces"])))
        elif kind == "wall-forces":
            lines.append(T["wall_forces"].format(direction=" ".join(fmt(x) for x in r["direction"])))
        else:
            lines.append(r["tui"])
        lines.append(marker("ENDREPORT"))
    if spec["convergence"]["check_mass_imbalance"]:
        lines += [marker("FLUX"), T["mass_flux_all"], marker("ENDFLUX")]
    return lines


# ------------------------------------------------------------- graphics ----

def picture_setup_lines(spec: dict) -> list[str]:
    T, pic = TEMPLATES, spec["exports"]["picture"]
    return [T["pic_driver"], T["pic_window_res"], T["pic_x"].format(value=pic["width"]),
            T["pic_y"].format(value=pic["height"])]


def contour_create_lines(spec: dict) -> list[str]:
    return [TEMPLATES["contour_create"].format(name=c["name"], field=c["field"], surfaces=" ".join(c["surfaces"]))
            for c in spec["exports"]["contours"]]


def contour_picture_lines(contour: dict, path: str) -> list[str]:
    T = TEMPLATES
    lines = [T["display_object"].format(name=contour["name"])]
    if contour.get("view"):
        lines.append(T["restore_view"].format(view=contour["view"]))
    lines += [T["auto_scale"], T["save_picture"].format(path=q(path))]
    return lines


def wants_graphics(spec: dict) -> bool:
    return bool(spec["exports"]["contours"]) and spec["fluent"]["ui_mode"] == "hidden"


# -------------------------------------------------------------- journals ---

def header_lines(transcript: str, title: str) -> list[str]:
    T = TEMPLATES
    return [f"; fluent-auto generated journal: {title}",
            T["start_transcript"].format(path=q(transcript)),
            T["batch_options"],
            T["confirm_overwrite"]]


def footer_lines() -> list[str]:
    T = TEMPLATES
    return [marker("END"), T["stop_transcript"], T["exit"]]


def build_run_journal(spec: dict, num: dict, eqs: list[str] | None, attempt_dir: str,
                      attempt: int, restart_from: str | None) -> str:
    T = TEMPLATES
    transcript = os.path.join(attempt_dir, "transcript.trn")
    lines = header_lines(transcript, f"{spec['name']} attempt {attempt}")
    lines.append(marker(f"BEGIN attempt={attempt} restart={'yes' if restart_from else 'no'}"))

    if restart_from:
        lines.append(T["read_case_data"].format(path=q(restart_from)))
    else:
        lines.append(T["read_case"].format(path=q(spec["input"]["file"])))
        if spec["input"]["scale"]:
            factors = " ".join(fmt(float(spec["input"]["scale"])) for _ in range(spec["fluent"]["dimension"]))
            lines.append(T["mesh_scale"].format(factors=factors))
        lines += [marker("MESH"), T["mesh_check"], T["mesh_quality"], marker("ENDMESH")]
        if spec["setup"]["apply"]:
            lines += setup_lines(spec)
        lines += surface_lines(spec)

    want_second = num["second_order"]
    warmup = 0 if restart_from else (num["warmup"] if want_second else 0)
    order = "second" if (want_second and warmup == 0) else "first"
    lines += numerics_lines(num, eqs, order)

    graphics = wants_graphics(spec)
    if not restart_from:
        lines += init_lines(num)
        if graphics:
            lines += contour_create_lines(spec)
    if graphics:
        lines += picture_setup_lines(spec)

    anim = spec["exports"]["animation"]
    anim_contour = None
    if graphics and anim["enabled"]:
        anim_contour = next(c for c in spec["exports"]["contours"] if c["name"] == anim["contour"])
    frames_dir = os.path.join(attempt_dir, "frames")

    total, chunk = int(num["iterations"]), int(num["chunk"])
    done, idx = 0, 0
    while done < total:
        n = min(chunk, total - done)
        if order == "first" and want_second and done < warmup:
            n = min(n, warmup - done)
        lines.append(T["iterate"].format(n=n))
        done += n
        idx += 1
        lines.append(marker(f"CHUNK idx={idx} done={done}"))
        lines += report_lines(spec)
        if anim_contour and idx % max(1, int(anim["every_chunks"])) == 0:
            lines += contour_picture_lines(anim_contour, os.path.join(frames_dir, f"a{attempt:02d}_{idx:04d}.png"))
        if order == "first" and want_second and done >= warmup:
            order = "second"
            lines += discretization_lines(eqs, "second")

    lines.append(marker("EXPORTS"))
    if graphics:
        for c in spec["exports"]["contours"]:
            lines += contour_picture_lines(c, os.path.join(attempt_dir, "contours", f"{c['name']}.png"))
    for d in spec["exports"]["data"]:
        lines.append(T["export_ascii"].format(path=q(os.path.join(attempt_dir, "data", f"{d['name']}.csv")),
                                              surfaces=" ".join(d["surfaces"]), fields=" ".join(d["fields"])))
    # always saved: the next attempt may continue from it
    lines.append(T["write_case_data"].format(path=q(os.path.join(attempt_dir, "result.cas.h5"))))
    lines += footer_lines()
    return "\n".join(lines) + "\n"


def build_inspect_journal(spec: dict, out_dir: str) -> str:
    T = TEMPLATES
    lines = header_lines(os.path.join(out_dir, "inspect.trn"), f"{spec['name']} inspect")
    lines.append(T["read_case"].format(path=q(spec["input"]["file"])))
    lines += [marker("ZONES"), T["list_zones"], marker("ENDZONES")]
    lines += [marker("MESH"), T["mesh_check"], T["mesh_quality"], marker("ENDMESH")]
    if spec["input"]["kind"] == "case":
        # one throw-away iteration to learn the residual equation list; nothing is saved
        lines += [T["init_hybrid"], T["iterate"].format(n=1)]
    lines += footer_lines()
    return "\n".join(lines) + "\n"
