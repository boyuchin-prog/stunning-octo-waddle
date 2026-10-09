"""End-to-end tests against mock_fluent.py. Run: python -m unittest discover -s tests (from scripts/)."""
import contextlib
import io
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from fluent_auto import cli, tui  # noqa: E402
from fluent_auto.parser import parse_transcript  # noqa: E402
from fluent_auto.spec import load_spec, validate  # noqa: E402

MOCK = os.path.join(HERE, "mock_fluent.py")


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def write(path, text):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def base_spec(tmp, **over):
    mesh = os.path.join(tmp, "elbow.msh.h5")
    write(mesh, "mesh")
    spec = {
        "name": "t",
        "fluent": {"exe": [sys.executable, MOCK], "processes": 1, "timeout_min": 2},
        "input": {"file": mesh},
        "setup": {"viscous": "kw-sst",
                  "boundary_conditions": [{"zone": "inlet", "type": "velocity-inlet", "velocity": 0.4},
                                          {"zone": "outlet", "type": "pressure-outlet", "gauge_pressure": 0}]},
        "surfaces": [{"name": "mid", "type": "plane", "axis": "z", "value": 0}],
        "solver": {"iterations": 800, "chunk": 50},
        "reports": [{"name": "p-in", "kind": "area-weighted-avg", "surfaces": ["inlet"], "field": "pressure"},
                    {"name": "mdot", "kind": "mass-flow-rate", "surfaces": ["outlet"]}],
        "references": [{"report": "p-in", "expected": 120.0, "rel_tol": 0.05}],
        "exports": {"contours": [{"name": "vel", "field": "velocity-magnitude", "surfaces": ["mid"]}],
                    "data": [{"name": "out", "surfaces": ["outlet"], "fields": ["pressure"]}],
                    "animation": {"enabled": True, "contour": "vel"}},
    }
    for k, v in over.items():
        if isinstance(v, dict):
            spec.setdefault(k, {}).update(v)
        else:
            spec[k] = v
    path = os.path.join(tmp, "spec.json")
    with open(path, "w") as fh:
        json.dump(spec, fh)
    return path


class Base(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = self._tmp.name
        os.environ["FA_MOCK_STATE"] = os.path.join(self.tmp, "launches")
        os.environ.setdefault("FA_MOCK_SCENARIO", "converge")

    def tearDown(self):
        self._tmp.cleanup()
        os.environ.pop("FA_MOCK_SCENARIO", None)

    def run_cli(self, *args):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = cli.main(list(args))
        return code, buf.getvalue()

    def summary(self, spec_path):
        spec = load_spec(spec_path)
        run_dir = read(os.path.join(spec["run_root"], "latest.txt")).strip()
        return json.loads(read(os.path.join(run_dir, "final", "summary.json"))), run_dir


class TestJournal(unittest.TestCase):
    def test_journal_structure(self):
        with tempfile.TemporaryDirectory() as tmp:
            spec = load_spec(base_spec(tmp))
            self.assertEqual(validate(spec)[0], [])
            from fluent_auto.strategy import initial_numerics
            num = initial_numerics(spec)
            eqs = ["continuity", "x-velocity", "y-velocity", "z-velocity", "k", "omega"]
            j = tui.build_run_journal(spec, num, eqs, os.path.join(tmp, "a1"), 1, None)
            crit = [ln for ln in j.splitlines() if ln.startswith("/solve/monitors/residual/convergence-criteria")]
            self.assertEqual(len(crit[0].split()) - 1, len(eqs))
            iters = [int(ln.split()[1]) for ln in j.splitlines() if ln.startswith("/solve/iterate")]
            self.assertEqual(sum(iters), 800)
            self.assertEqual(iters[:2], [50, 50])  # warm-up 100 then switch
            self.assertIn("@@FA ORDER second", j)
            self.assertLess(j.index("ORDER first"), j.index("ORDER second"))
            self.assertIn("/define/models/viscous/kw-sst yes", j)
            self.assertIn("/define/boundary-conditions/set/velocity-inlet inlet () vmag no 0.4 quit", j)
            j.encode("ascii")

    def test_mesh_scale(self):
        with tempfile.TemporaryDirectory() as tmp:
            spec = load_spec(base_spec(tmp, input={"scale": 0.001}))
            from fluent_auto.strategy import initial_numerics
            j = tui.build_run_journal(spec, initial_numerics(spec), None, tmp, 1, None)
            self.assertIn("/mesh/scale 0.001 0.001 0.001", j)
            self.assertLess(j.index("/mesh/scale"), j.index("/mesh/check"))

    def test_restart_journal_skips_setup(self):
        with tempfile.TemporaryDirectory() as tmp:
            spec = load_spec(base_spec(tmp))
            from fluent_auto.strategy import initial_numerics
            j = tui.build_run_journal(spec, initial_numerics(spec), ["continuity"], tmp, 2, os.path.join(tmp, "r.cas.h5"))
            self.assertIn("/file/read-case-data", j)
            self.assertNotIn("/define/models", j)
            self.assertNotIn("hyb-initialization", j)
            self.assertNotIn("ORDER first", j)

    def test_validation_errors(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = base_spec(tmp, references=[{"report": "nope", "expected": 1}])
            errors, _ = validate(load_spec(p))
            self.assertTrue(any("references[0].report" in e for e in errors))
            self.assertTrue(any("rel_tol" in e for e in errors))


class TestParser(unittest.TestCase):
    def test_report_and_residuals(self):
        text = "\n".join([
            "  iter  continuity  x-velocity           k     time/iter",
            "     1  1.0000e+00  2.0000e-01  3.0000e-01  0:00:01  9",
            "     2  -nan(ind)  2.0000e-01  3.0000e-01  0:00:01  8",
            "@@FA CHUNK idx=1 done=2",
            "@@FA REPORT name=p kind=area-weighted-avg",
            "/report/surface-integrals/area-weighted-avg inlet () pressure no",
            "                 Area-Weighted Average",
            "                    Static Pressure                (pascal)",
            "-------------------------------- --------------------",
            "                           inlet           101.5",
            "                ---------------- --------------------",
            "                             Net           101.5",
            "@@FA ENDREPORT",
            "@@FA FLUX",
            "                           inlet           0.5",
            "                          outlet          -0.499",
            "                             Net           0.001",
            "@@FA ENDFLUX",
        ])
        p = parse_transcript(text)
        self.assertEqual(p["residual_names"], ["continuity", "x-velocity", "k"])
        self.assertEqual(len(p["residuals"]), 2)
        self.assertTrue(p["nan_residual"])
        self.assertAlmostEqual(p["chunks"][0]["reports"]["p"], 101.5)
        self.assertAlmostEqual(p["chunks"][0]["flux"]["imbalance_rel"], 0.002)

    def test_error_classification(self):
        p = parse_transcript("Error: Divergence detected in AMG solver: x-momentum\nError: invalid command [vmag]\n")
        self.assertEqual(len(p["divergence"]), 1)
        self.assertEqual(len(p["errors"]), 1)


class TestEndToEnd(Base):
    def test_converge_pass(self):
        os.environ["FA_MOCK_SCENARIO"] = "converge"
        p = base_spec(self.tmp)
        code, out = self.run_cli("run", p)
        self.assertEqual(code, 0, out)
        s, run_dir = self.summary(p)
        self.assertEqual(s["final_status"], "PASS")
        self.assertEqual(len(s["attempts"]), 1)
        final = os.path.join(run_dir, "final")
        for f in ("report.md", "residuals.csv", "monitors.csv", "contours/vel.png", "data/out.csv"):
            self.assertTrue(os.path.exists(os.path.join(final, f)), f)
        self.assertTrue(any(os.path.exists(os.path.join(final, a)) for a in ("animation.mp4", "animation.gif")))

    def test_divergence_recovery(self):
        os.environ["FA_MOCK_SCENARIO"] = "diverge_first"
        p = base_spec(self.tmp)
        code, out = self.run_cli("run", p)
        s, _ = self.summary(p)
        self.assertEqual(code, 0, out)
        self.assertEqual([a["status"] for a in s["attempts"]], ["DIVERGED", "PASS"])
        a2 = s["attempts"][1]["numerics"]
        self.assertLess(a2["urf"]["pressure"], 0.3)
        self.assertEqual(a2["div_level"], 1)

    def test_slow_continues_from_data(self):
        os.environ["FA_MOCK_SCENARIO"] = "slow"
        p = base_spec(self.tmp, solver={"iterations": 1500, "chunk": 100})
        code, out = self.run_cli("run", p)
        s, run_dir = self.summary(p)
        self.assertEqual(s["final_status"], "PASS", out)
        self.assertGreater(len(s["attempts"]), 1)
        self.assertEqual(s["attempts"][0]["status"], "NOT_CONVERGED")
        j2 = read(os.path.join(run_dir, "attempt_02", "run.jou"))
        self.assertIn("attempt_01/result.cas.h5", j2.replace("\\", "/"))

    def test_tui_error_stops(self):
        os.environ["FA_MOCK_SCENARIO"] = "tui_error"
        p = base_spec(self.tmp)
        code, out = self.run_cli("run", p)
        s, _ = self.summary(p)
        self.assertEqual(code, 1)
        self.assertEqual(s["final_status"], "SETUP_ERROR")
        self.assertEqual(len(s["attempts"]), 1)
        self.assertIn("invalid command", out)

    def test_bad_report_is_setup_error(self):
        os.environ["FA_MOCK_SCENARIO"] = "bad_report"
        p = base_spec(self.tmp)
        self.run_cli("run", p)
        s, _ = self.summary(p)
        self.assertEqual(s["final_status"], "SETUP_ERROR")

    def test_reference_mismatch_needs_user(self):
        os.environ["FA_MOCK_SCENARIO"] = "converge"
        p = base_spec(self.tmp, references=[{"report": "p-in", "expected": 200.0, "rel_tol": 0.05}])
        code, out = self.run_cli("run", p)
        s, _ = self.summary(p)
        self.assertEqual(code, 1)
        self.assertEqual(s["final_status"], "NEED_USER")
        self.assertEqual([a["status"] for a in s["attempts"]], ["REF_MISMATCH", "REF_MISMATCH"])
        self.assertEqual(s["attempts"][1]["numerics"]["residual"], 1e-5)

    def test_case_input_runs_inspect(self):
        os.environ["FA_MOCK_SCENARIO"] = "converge"
        cas = os.path.join(self.tmp, "pipe.cas.h5")
        write(cas, "case")
        p = base_spec(self.tmp, input={"file": cas})
        code, out = self.run_cli("run", p)
        self.assertEqual(code, 0, out)
        self.assertIn("残差方程(来自 inspect)", out)
        spec = load_spec(p)
        insp = json.loads(read(os.path.join(spec["run_root"], "inspect", "inspect.json")))
        self.assertEqual([z["name"] for z in insp["zones"]], ["fluid", "inlet", "outlet", "wall"])
        self.assertEqual(insp["mesh"]["min_orthogonal_quality"], 0.321)
        self.assertEqual(insp["mesh"]["y_extent_m"], [0.0, 0.2])


if __name__ == "__main__":
    unittest.main()
