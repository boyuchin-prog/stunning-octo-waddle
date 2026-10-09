"""Numerical auto-debugging: decide the next attempt from an evaluation.

Only numerical settings are changed here (coupling scheme, under-relaxation,
Courant number, discretization order, initialization, iteration budget,
residual targets). Physics — models, materials, boundary conditions, mesh — is
never touched automatically; those cases stop with NEED_USER.
"""
from __future__ import annotations

import copy

from . import evaluate as E

NEED_USER = "NEED_USER"

URF_SIMPLE = {"pressure": 0.3, "mom": 0.7, "k": 0.8, "epsilon": 0.8, "omega": 0.8, "nut": 0.8,
              "turb-viscosity": 1.0, "temperature": 1.0}
URF_COUPLED = {"k": 0.75, "epsilon": 0.75, "omega": 0.75, "nut": 0.75, "turb-viscosity": 1.0,
               "temperature": 1.0}
URF_FLOOR = {"pressure": 0.1, "mom": 0.2, "k": 0.3, "epsilon": 0.3, "omega": 0.3, "nut": 0.3,
             "turb-viscosity": 0.5, "temperature": 0.5}


def initial_numerics(spec: dict) -> dict:
    s, c = spec["solver"], spec["convergence"]
    coupled = s["p_v_coupling"] == "coupled"
    urf = dict(URF_COUPLED if coupled else URF_SIMPLE)
    urf.update(s["urf"])
    explicit = {"mom": 0.75, "pressure": 0.75}
    explicit.update(s["explicit_urf"])
    return {
        "p_v_coupling": s["p_v_coupling"],
        "courant": float(s["courant"] or 200.0),
        "explicit_urf": explicit,
        "urf": urf,
        "second_order": bool(s["second_order"]),
        "warmup": int(s["first_order_warmup"]),
        "iterations": int(s["iterations"]),
        "chunk": int(s["chunk"]),
        "init": s["init"],
        "residual": float(c["residual"]),
        "residual_energy": float(c["residual_energy"]),
        "div_level": 0,
        "stalls": 0,
        "tightened": False,
        "forced_first_order": False,
    }


def _scale_urf(num: dict, factor: float) -> None:
    for k, v in num["urf"].items():
        num["urf"][k] = round(max(URF_FLOOR.get(k, 0.2), v * factor), 3)
    num["explicit_urf"] = {k: round(max(0.25, v * factor), 3) for k, v in num["explicit_urf"].items()}
    num["courant"] = max(1.0, round(num["courant"] * factor * factor, 2))


def _divergence_step(num: dict, spec: dict) -> tuple[dict | None, str]:
    n = copy.deepcopy(num)
    n["div_level"] += 1
    lvl = n["div_level"]
    if lvl == 1:
        _scale_urf(n, 0.7)
        n["warmup"] = max(200, n["warmup"] * 2)
        note = "第 1 级:欠松弛降到 0.7 倍(coupled 时 Courant 数约减半),一阶预热迭代加倍,重新初始化"
    elif lvl == 2:
        n["p_v_coupling"] = "simple"
        n["urf"].update({"pressure": 0.2, "mom": 0.5, "k": 0.6, "epsilon": 0.6, "omega": 0.6, "nut": 0.6})
        n["warmup"] = max(300, n["warmup"])
        n["init"] = "hybrid"
        note = "第 2 级:改用 SIMPLE + 保守欠松弛 (p=0.2, mom=0.5, 湍流=0.6),一阶预热 300 步"
    elif lvl == 3:
        n["p_v_coupling"] = "simple"
        n["urf"].update({"pressure": 0.15, "mom": 0.4, "k": 0.5, "epsilon": 0.5, "omega": 0.5, "nut": 0.5})
        n["second_order"] = False
        n["forced_first_order"] = spec["solver"]["second_order"]
        n["init"] = "standard" if num["init"] == "hybrid" else "hybrid"
        note = ("第 3 级:全程一阶 + 更低欠松弛,并换用另一种初始化;"
                "收敛后会再切回二阶继续算")
    else:
        return None, "数值手段已用尽(3 级降级后仍发散),很可能是网格质量、边界条件或物理设置问题"
    return n, note


def next_attempt(spec: dict, num: dict, ev: dict, total_iters: int) -> dict:
    """Return {"action": "retry"|"stop", ...}."""
    status = ev["status"]
    auto = spec["debug"]["auto_numeric_fix"]
    budget = int(spec["solver"]["max_total_iterations"])

    if status == E.PASS:
        if num["forced_first_order"] and not num["second_order"]:
            n = copy.deepcopy(num)
            n.update(second_order=True, forced_first_order=False, warmup=0)
            return {"action": "retry", "restart": True, "numerics": n,
                    "note": "一阶解已收敛;在此基础上切换到二阶格式继续计算,得到最终精度结果"}
        return {"action": "stop", "final": E.PASS, "note": "全部判据通过"}

    if status in (E.SETUP_ERROR, E.ENV_ERROR, E.TIMEOUT):
        return {"action": "stop", "final": status,
                "note": "需要修正 journal/规格或运行环境后再跑(不属于数值调参能解决的问题)"}

    if not auto:
        return {"action": "stop", "final": NEED_USER, "note": "已关闭自动数值调试 (debug.auto_numeric_fix=false)"}

    if total_iters >= budget:
        return {"action": "stop", "final": NEED_USER,
                "note": f"累计迭代 {total_iters} 已达上限 solver.max_total_iterations={budget}"}

    if status == E.DIVERGED:
        n, note = _divergence_step(num, spec)
        if n is None:
            return {"action": "stop", "final": NEED_USER, "note": note}
        return {"action": "retry", "restart": False, "numerics": n, "note": note}

    if status == E.NOT_CONVERGED:
        n = copy.deepcopy(num)
        trend = (ev.get("trend") or {}).get("trend")
        if trend == "decreasing":
            note = "残差仍在下降:从上次结果继续迭代"
        elif trend in ("increasing", "oscillating"):
            _scale_urf(n, 0.8)
            n["stalls"] += 1
            note = f"残差{'上升' if trend == 'increasing' else '振荡'}:欠松弛降到 0.8 倍(coupled 时 Courant 数同步下调)后从上次结果继续"
        else:
            n["stalls"] += 1
            if n["stalls"] >= 3:
                return {"action": "stop", "final": NEED_USER,
                        "note": "连续多轮残差停滞且监视量/守恒不达标,数值调参收益已很低;可能需要加密网格或检查边界条件"}
            _scale_urf(n, 0.85)
            note = "残差停滞:欠松弛小幅下调后从上次结果继续"
        return {"action": "retry", "restart": True, "numerics": n, "note": note}

    if status == E.REF_MISMATCH:
        if not num["second_order"]:
            n = copy.deepcopy(num)
            n.update(second_order=True, forced_first_order=False, warmup=0)
            return {"action": "retry", "restart": True, "numerics": n,
                    "note": "与参考值不符且当前为一阶格式:切换到二阶继续计算"}
        if not num["tightened"] and num["residual"] > 1e-5:
            n = copy.deepcopy(num)
            n.update(residual=min(num["residual"] / 10.0, 1e-5), tightened=True)
            return {"action": "retry", "restart": True, "numerics": n,
                    "note": f"与参考值不符:残差标准收紧到 {n['residual']:.0e} 后继续计算,排除收敛不充分的影响"}
        return {"action": "stop", "final": NEED_USER,
                "note": "已充分收敛(二阶、收紧残差)但仍与参考值不符:属于物理/网格/边界条件层面的问题,需要你确认"}

    return {"action": "stop", "final": NEED_USER, "note": f"未处理的状态 {status}"}
