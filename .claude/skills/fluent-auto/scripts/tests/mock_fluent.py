#!/usr/bin/env python3
"""A stand-in for fluent.exe used by the tests.

It reads the journal given with -i, echoes commands into the transcript the
way Fluent does, and fakes residual tables, report blocks, pictures and
case/data files. Behaviour is selected with FA_MOCK_SCENARIO:

  converge      residuals fall quickly, reports settle
  slow          needs more than one attempt of iterations
  diverge_first first launch diverges at iteration 30, later launches converge
  tui_error     boundary-condition command fails
  bad_report    report blocks print nothing parseable
"""
import json
import math
import os
import re
import struct
import sys
import zlib

SCENARIO = os.environ.get("FA_MOCK_SCENARIO", "converge")
STATE = os.environ.get("FA_MOCK_STATE")
ALL_EQS = ["continuity", "x-velocity", "y-velocity", "z-velocity", "k", "omega"]


def png(path, shade):
    w = h = 16
    raw = b"".join(b"\x00" + bytes([shade % 256, 80, 200 - shade % 150]) * w for _ in range(h))

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                 + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def launch_count():
    n = 0
    if STATE and os.path.exists(STATE):
        n = int(open(STATE).read() or 0)
    n += 1
    if STATE:
        open(STATE, "w").write(str(n))
    return n


def unquote(tok):
    return tok.strip().strip('"')


def main():
    args = sys.argv[1:]
    journal = args[args.index("-i") + 1]
    lines = open(journal, encoding="ascii").read().splitlines()
    launch = launch_count()
    out = None
    it = 0
    eqs = ALL_EQS
    criteria = 1e-4
    frame = 0
    rate = {"slow": 400.0}.get(SCENARIO, 60.0)

    def w(s=""):
        out.write(s + "\n")

    def residuals(i):
        base = math.exp(-i / rate)
        return [max(2e-6, f * base) for f in (1.0, 0.3, 0.25, 0.2, 0.4, 0.5)][:len(eqs)]

    def value(target, i):
        return target * (1 - 0.5 * math.exp(-i / 80.0))

    def block(title, rows, net):
        w(f"                 {title}")
        w("-------------------------------- --------------------")
        for name, v in rows:
            w(f"{name:>32} {v:>20.6g}")
        w("                ---------------- --------------------")
        w(f"{'Net':>32} {net:>20.6g}")

    for line in lines:
        s = line.strip()
        if s.startswith("/file/start-transcript"):
            path = unquote(s.split(None, 1)[1])
            os.makedirs(os.path.dirname(path), exist_ok=True)
            out = open(path, "w", encoding="utf-8")
            w("Welcome to ANSYS Fluent 2022 R1 (mock)")
            continue
        if out is None or not s or s.startswith(";"):
            continue
        w(s)  # Fluent echoes journal commands
        m = re.search(r'\(display "([^"]*)"\)', s)
        if m:
            w(m.group(1))
            continue
        if s.startswith("/mesh/scale"):
            w("Scaling mesh... Done.")
        if s.startswith("/exit"):
            break
        if s.startswith("/file/read-case-data"):
            it = json.load(open(unquote(s.split(None, 1)[1])))["iter"]
        elif s.startswith("/file/write-case-data"):
            p = unquote(s.split(None, 1)[1])
            json.dump({"iter": it}, open(p, "w"))
        elif s.startswith("/define/boundary-conditions/list-zones"):
            w(" id   name                           type               material     kind")
            w("---- ------------------------------ ------------------ ------------ ----")
            for zid, name, typ, mat, kind in [(2, "fluid", "fluid", "air", "cell"), (5, "inlet", "velocity-inlet", "", "face"),
                                               (6, "outlet", "pressure-outlet", "", "face"), (7, "wall", "wall", "aluminum", "face")]:
                w(f"{zid:>4} {name:<30} {typ:<18} {mat:<12} {kind}")
        elif s.startswith("/mesh/quality"):
            w(" Minimum Orthogonal Quality = 3.21e-01 cell 1234 on zone 2")
            w(" Maximum Aspect Ratio = 2.30e+01 cell 99 on zone 2")
        elif s.startswith("/mesh/check"):
            w(" Domain Extents:")
            w("   x-coordinate: min (m) = -1.000000e-01, max (m) = 1.000000e-01")
            w("   y-coordinate: min (m) = 0.000000e+00, max (m) = 2.000000e-01")
            w("   z-coordinate: min (m) = -2.500000e-02, max (m) = 2.500000e-02")
            w("   minimum volume (m3): 1.234e-10")
            w("Done.")
        elif s.startswith("/define/boundary-conditions/set") and SCENARIO == "tui_error":
            w("Error: invalid command [vmag]")
            w("Error Object: vmag")
            break  # exit-on-error
        elif s.startswith("/solve/monitors/residual/convergence-criteria"):
            vals = s.split()[1:]
            eqs = ALL_EQS[:len(vals)]
            criteria = float(vals[0])
        elif s.startswith("/solve/iterate"):
            n = int(s.split()[1])
            w("  iter  " + "  ".join(f"{e:>11}" for e in eqs) + "     time/iter")
            for _ in range(n):
                it += 1
                if SCENARIO == "diverge_first" and launch == 1 and it >= 30:
                    w(f"{it:6d}  " + "  ".join(f"{v:11.4e}" for v in [5e2] * len(eqs)))
                    w("Error: Divergence detected in AMG solver: x-momentum")
                    w("Error Object: #f")
                    out.close()
                    return 1
                r = residuals(it)
                w(f"{it:6d}  " + "  ".join(f"{v:11.4e}" for v in r) + f"  0:00:01  {n}")
                if all(v < criteria for v in r):
                    w(f" !  {it} solution is converged")
                    break
        elif s.startswith("/report/surface-integrals/"):
            if SCENARIO == "bad_report":
                w("Done.")
                continue
            kind = s.split()[0].rsplit("/", 1)[1]
            surf = s.split()[1]
            target = {"mass-flow-rate": -0.0787}.get(kind, 120.0)
            v = value(target, it)
            block(kind, [(surf, v)], v)
        elif s.startswith("/report/fluxes/mass-flow"):
            imb = 0.05 * math.exp(-it / 60.0)
            block("Mass Flow Rate                 [kg/s]", [("inlet", 0.0787), ("outlet", -0.0787 * (1 - imb))],
                  0.0787 * imb)
        elif s.startswith("/report/forces/wall-forces"):
            w("Net   1.5 0.3 1.8 0.1 0.02 0.12")
        elif s.startswith("/display/save-picture"):
            frame += 1
            png(unquote(s.split(None, 1)[1]), frame * 20)
        elif s.startswith("/file/export/ascii"):
            p = unquote(s.split('"')[1])
            open(p, "w").write("nodenumber, x, y, z, pressure\n1, 0, 0, 0, 1.0\n")
    if out:
        out.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
