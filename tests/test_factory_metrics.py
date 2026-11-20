"""Ảnh chụp vòng đời phải dùng bằng chứng địa phương và giữ số thiếu là null."""

import argparse
import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "tests"))
import install
import xt
import xt_flow
from test_deploy_receipt import receipt
from test_flow import trial_config
from test_install import make_fake_src
from test_stage import approve, completed, ev, ledger


class FactoryMetricsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.root = self.tmp / "product"
        self.root.mkdir()
        self.args = argparse.Namespace(prs=None, release=None, package=None, merged_prs=None)
        self.enterContext(mock.patch.object(xt, "stage_agent_approval", side_effect=AssertionError("remote lookup")))

    def write(self, rel, value):
        p = self.root / rel
        p.parent.mkdir(exist_ok=True, parents=True)
        p.write_text(json.dumps(value), encoding="utf-8")
        return p

    def git(self, *args):
        return subprocess.run(
            ["git", "-c", "user.name=FactoryFixture", "-c", "user.email=test@example.invalid", *args],
            cwd=self.root,
            text=True,
            capture_output=True,
            check=True,
        ).stdout.strip()

    def snap(self):
        return xt_flow.report(self.root, self.args)

    def test_installer_copies_tools_but_minimal_framework_can_omit_them(self):
        src = make_fake_src(self.tmp)
        for present in (False, True):
            directory = self.tmp / str(present)
            directory.mkdir()
            optional = ["xt_flow.py", "xt_acceptance.py", "xt_adapter.py"]
            if present:
                for rel in optional:
                    (src / "scripts" / rel).write_text(rel, encoding="utf-8")
            with mock.patch.object(install, "SRC", src):
                install.install_framework(directory, "fixture")
            for rel in optional:
                self.assertEqual((directory / "scripts" / rel).exists(), present)

    def test_empty_and_completed_stage_do_not_infer_a_new_decision(self):
        blank = self.snap()
        self.assertEqual(blank["next"]["action"], "stage-init")
        metrics = blank["metrics"]
        for key in (
            "failed_gate_runs",
            "resolved_interventions",
            "pr_open_to_merge",
            "cost_usd_per_slice",
            "escaped_after_merge",
            "ever_conflicted_pr_rate",
        ):
            self.assertIsNone(metrics[key])
        self.write(xt.STAGE_LEDGER, completed())
        done = self.snap()
        self.assertEqual(done["next"]["action"], "cycle-completed")
        self.assertEqual(len(done["metrics"]["stage_submissions"]), 3)
        self.assertIsNone(done["metrics"]["stage_submissions"][0]["submit_to_decision_seconds"])

    def test_completed_stage_routes_by_configured_production_current_receipts(self):
        self.write(xt.STAGE_LEDGER, completed())
        config = self.root / "xt.yaml"
        confirmed = receipt("prod")
        current = {"current": confirmed, "previous": None, "unknown": False}
        log = {"schema": 1, "envs": {"prod": current}, "events": [confirmed]}
        self.write(xt.DEPLOY_LEDGER, log)
        config.write_text("deploy_envs: dev preview live\n", encoding="utf-8")
        self.assertEqual(self.snap()["next"]["action"], "cycle-completed")
        config.write_text("deploy_envs: dev prod production\n", encoding="utf-8")
        todo = self.snap()["next"]
        self.assertEqual((todo["action"], todo["owner"]), ("prepare-rollout", "coordinator"))
        self.assertIn("rollout-drill --env production", todo["reason"])
        # A historical success cannot identify the current service after a failed rollback.
        log["envs"]["production"] = {"current": None, "previous": receipt("production"), "unknown": True}
        self.write(xt.DEPLOY_LEDGER, log)
        self.assertEqual(self.snap()["next"]["action"], "prepare-rollout")
        prod_long = receipt("production")
        log["envs"]["production"] = {**current, "current": prod_long}
        log["events"].append(prod_long)
        self.write(xt.DEPLOY_LEDGER, log)
        for names in ("prod", "production", "prod production"):
            config.write_text(f"deploy_envs: dev {names}\n", encoding="utf-8")
            step = self.snap()["next"]
            self.assertEqual((step["action"], step["owner"]), ("check-operations", "coordinator"))
            self.assertIn(names.replace(" ", ", "), step["reason"])
            self.assertIn("ops-check", step["reason"])

    def test_pending_stage_checks_submission_fingerprint_and_current_checkout(self):
        self.git("init", "-q")
        self.git("commit", "--allow-empty", "-m", "baseline")
        head = self.git("rev-parse", "HEAD")
        for number in (1, 2, 3):
            hist = [ev("init", 1)]
            for stage in range(1, number):
                hist.extend(approve(stage, head))
            hist.append(ev("submit", number, sha=head))
            self.write(xt.STAGE_LEDGER, ledger(hist, stage=number, status="awaiting_approval", submitted={"sha": head}))
            out = self.snap()
            self.assertEqual(out["next"]["action"], "review-submission")
            self.assertIn(head, out["next"]["reason"])
        (self.root / "change").write_text("đổi", encoding="utf-8")
        self.assertEqual(self.snap()["next"]["action"], "check-submission")

    def test_active_stages_route_to_loop_hardening_or_committed_optimization(self):
        self.git("init", "-q")
        self.write(xt.STAGE_LEDGER, ledger())
        self.assertEqual(self.snap()["next"]["action"], "replan")
        self.write(xt.STAGE_LEDGER, ledger([ev("init", 1), *approve(1)], stage=2))
        self.assertEqual(self.snap()["next"]["key"]["objective"], "harden-to-signoff")
        self.write(xt.STAGE_LEDGER, ledger([ev("init", 1), *approve(1), *approve(2)], stage=3))
        self.assertEqual(self.snap()["next"]["action"], "measure-baseline")
        self.write("perf/trial.json", trial_config())
        self.assertEqual(self.snap()["next"]["action"], "measure-baseline")
        self.git("add", "perf/trial.json")
        self.git("commit", "-m", "measurements")
        with mock.patch.object(
            xt,
            "trial_rows",
            return_value=[
                {"id": "a", "event": "start"},
                {"id": "a", "event": "decide", "verdict": "aborted"},
                {
                    "id": "b",
                    "event": "decide",
                    "verdict": "kept",
                    "base_sha": "c" * 40,
                    "measures": {"primary": {"compare": {"base": {"change": -0.25}}}},
                },
            ],
        ):
            optimized = self.snap()
        self.assertEqual(optimized["next"]["action"], "optimize")
        trial = optimized["metrics"]["optimization"]
        self.assertEqual((trial["target"], trial["recorded_trials"], trial["recorded_kept"]), ("primary <= -20%", 2, 1))
        self.assertEqual(trial["primary_changes"][0]["change_pct"], -25.0)
        self.assertNotIn("cmd", str(trial))
        self.write("perf/trial.json", {})
        self.git("commit", "-am", "invalid measurement definition")
        self.assertIsNotNone(self.snap()["metrics"]["optimization"]["config_problem"])

    def test_historical_submissions_gates_receipts_and_reported_cost_only(self):
        start, middle, end = (f"2026-11-19T0{i}:00:00Z" for i in range(3))
        history = [ev("init", 1, at=start), ev("submit", 1, sha="c" * 40, at=middle), ev("reopen", 1, at=end)]
        self.write(xt.STAGE_LEDGER, ledger(history))
        self.write(
            ".autopilot/state.json",
            {
                "active": False,
                "deferred": {"T-001": {"at": middle}, "T-002": "legacy"},
                "resolved": [{"id": "T-003"}],
                "episode": {"runs": {}, "cost_usd": 0.75},
            },
        )
        logs = [
            {"task": "T-005", "exit_code": 1, "started": start, "finished": middle},
            {"task": "T-005", "exit_code": 0, "started": middle, "finished": end},
        ]
        (self.root / ".autopilot/runs.jsonl").write_text("\n".join(map(json.dumps, logs)), encoding="utf-8")
        r = receipt()
        self.write(
            xt.DEPLOY_LEDGER,
            {
                "schema": 1,
                "envs": {
                    "dev": {"current": r, "previous": None, "unknown": False},
                    "qa": {"current": None, "previous": None, "unknown": False},
                },
                "events": [r],
            },
        )
        with mock.patch.object(xt, "now_iso", return_value=end):
            m = self.snap()["metrics"]
        self.assertEqual(m["pending_human_seconds_by_task"], {"T-001": 3600, "T-002": None})
        self.assertEqual((m["resolved_interventions"], m["reported_ci_episode_cost_usd"]), (1, 0.75))
        self.assertEqual((m["gate_runs"], m["failed_gate_runs"], m["time_to_first_green_hours"]["median"]), (2, 1, 2.0))
        self.assertEqual(m["stage_submissions"][0]["submit_to_decision_seconds"], 3600)
        self.assertEqual(m["stage_submissions"][0]["outcome"], "reopen")
        self.assertIsNone(m["stage_submissions"][0]["cycle_start_to_confirmed_dev_seconds"])
        matched = receipt(subject={**r["subject"], "head": "c" * 40}, started=start, finished=middle)
        self.assertEqual(xt_flow.stage_times(history, [matched])[0]["cycle_start_to_confirmed_dev_seconds"], 3600)
        for excluded in ({"started": None}, {"finished": end}, {"env": "prod"}, {"result": "rolled_back"}):
            self.assertIsNone(
                xt_flow.stage_times(history, [{**matched, **excluded}])[0]["cycle_start_to_confirmed_dev_seconds"]
            )
        self.assertEqual(m["deploy_by_env"]["dev"]["runs"], 1)
        self.assertIsNone(m["deploy_by_env"]["qa"]["rollback_rate"])
        self.assertIsNone(m["resolved_human_waits"][0]["seconds"])
        for task, original, seconds in (("T-001", {"at": middle}, 3600), ("T-002", "legacy", None)):
            st = {"started": start, "active": False, "deferred": {task: original}}
            with mock.patch.object(xt, "now_iso", return_value=end):
                self.write(".autopilot/state.json", xt._resolve_apply(st, task, "reviewed", []))
            self.assertEqual(self.snap()["metrics"]["resolved_human_waits"], [{"task": task, "seconds": seconds}])
        for bad in (True, -1, float("inf")):
            self.write(".autopilot/state.json", {"episode": {"cost_usd": bad}})
            self.assertIsNone(self.snap()["metrics"]["reported_ci_episode_cost_usd"])
        self.assertIsNone(xt_flow.elapsed(end, start))
        self.assertIsNone(xt_flow.elapsed(start, None))

    def test_pr_export_groups_observed_labels_and_rejects_unknown_or_duplicate_prs(self):
        one = {"number": 1, "created_at": "2026-11-19T11:00:00Z", "merged_at": "2026-11-19T14:00:00Z", "labels": []}
        two = {
            **one,
            "number": 2,
            "labels": [{"name": "docs"}, {"name": "xt-parallel"}],
            "merged_at": "2026-11-19T12:00:00Z",
        }
        self.args.merged_prs = self.write("prs.json", [one, two, {"merged_at": None}])
        lanes = self.snap()["metrics"]["pr_open_to_merge"]
        self.assertEqual(lanes["sequential"]["hours"]["median"], 3)
        self.assertEqual(lanes["parallel"]["hours"]["median"], 1)
        for invalid in (
            {"prs": []},
            [True],
            [{}],
            [one, one],
            [{**one, "created_at": None}],
            [{**one, "labels": None}],
            [{**one, "labels": [{"name": False}]}],
        ):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                xt_flow.pr_lanes(self.write("prs.json", invalid))

    def test_cli_reports_missing_invalid_or_racing_sources_without_changing_them(self):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            self.assertEqual(xt_flow.main(["--project", str(self.root)]), 0)
            self.assertEqual(xt_flow.main(["--project", str(self.tmp / "missing")]), 2)
            self.write(".autopilot/state.json", [])
            self.assertEqual(xt_flow.main(["--project", str(self.root), "--json"]), 2)
            self.write(".autopilot/state.json", {})
            self.write(xt.STAGE_LEDGER, ledger())
            with mock.patch.object(xt, "stage_facts", return_value={"error": "bad ledger"}):
                self.assertEqual(xt_flow.main(["--project", str(self.root)]), 2)
            self.write(xt.DEPLOY_LEDGER, {"schema": 3})
            self.assertEqual(xt_flow.main(["--project", str(self.root)]), 2)
        self.assertIn("thay đổi trong lúc đọc", err.getvalue())
        self.assertIn("stage-init", out.getvalue())
        (self.root / xt.DEPLOY_LEDGER).unlink()
        p = subprocess.run(
            [sys.executable, str(ROOT / "scripts/xt_flow.py"), "--project", str(self.root), "--json"],
            capture_output=True,
            text=True,
            check=True,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
        self.assertEqual(json.loads(p.stdout)["stage"]["stage"], 1)

    def test_release_snapshot_binds_tree_head_artifact_and_current_local_verify(self):
        self.git("init", "-q")
        (self.root / ".gitignore").write_text("dist/\n.autopilot/\n", encoding="utf-8")
        (self.root / "xt.yaml").write_text("release_artifacts: dist/app.tgz\n", encoding="utf-8")
        app = self.root / "app.ts"
        app.write_text("export const version = 1;\n", encoding="utf-8")
        self.git("add", "-A")
        self.git("commit", "-m", "candidate")
        artifact = self.write("dist/app.tgz", {"version": 1})
        snapshot = xt.release_check(self.root, "BLUEPRINT.md", xt.AUDIT_STATUS_DEFAULT)
        p = self.tmp / "release.json"

        def bind(doc):
            p.write_text(json.dumps(doc), encoding="utf-8")
            return xt_flow.bound_release(self.root, str(p))

        self.assertEqual(bind(snapshot)["head"], self.git("rev-parse", "HEAD"))
        warning = {"id": "additional", "level": "SHOULD", "result": "WARN"}
        self.assertIn("additional", xt_flow.release_rows({**snapshot, "rows": [*snapshot["rows"], warning]}))
        with self.assertRaises(ValueError):
            xt_flow.release_rows({**snapshot, "rows": [*snapshot["rows"], {**warning, "level": "BLOCKER"}]})
        for changed in (
            {},
            {**snapshot, "rows": [None]},
            {**snapshot, "rows": [r for r in snapshot["rows"] if r["id"] != "audit"]},
            {**snapshot, "rows": [r for r in snapshot["rows"] if r["id"] != "artifacts"]},
            {**snapshot, "rows": [{**r, "level": "typo"} for r in snapshot["rows"]]},
            {**snapshot, "rows": []},
            {**snapshot, "fails": []},
            {**snapshot, "head": "0" * 40},
            {**snapshot, "subject": {**snapshot["subject"], "digest": "e" * 64}},
            {**snapshot, "artifacts": []},
        ):
            with self.subTest(fields=changed.keys()), self.assertRaises(ValueError):
                bind(changed)
        for verdict, human in (("GO", []), ("GO (chờ người)", ["verify"])):
            original = [dict(row, result="PASS") for row in snapshot["rows"]]
            if human:
                original = [
                    {**row, "result": "N/A", "level": "BLOCKER"} if row["id"] == "verify" else row for row in original
                ]
            with self.assertRaisesRegex(ValueError, "Hàng"):
                bind({**snapshot, "rows": original, "fails": [], "human": human, "go": True, "verdict": verdict})
        artifact.write_text("different bytes", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "artifact"):
            bind(snapshot)
        self.write("dist/app.tgz", {"version": 1})
        app.write_text("changed", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "cây mã"):
            bind(snapshot)
        self.git("checkout", "--", "app.ts")
        self.write(".autopilot/state.json", {"active": True, "blocked": True, "blocked_reason": "pending"})
        with self.assertRaisesRegex(ValueError, "verify"):
            bind(snapshot)
        (self.root / ".autopilot/state.json").unlink()
        self.git("commit", "--allow-empty", "-m", "new head, same sources")
        with self.assertRaisesRegex(ValueError, "HEAD"):
            bind(snapshot)
        with mock.patch.object(xt, "next_step", return_value={"action": "signoff-package"}):
            self.assertEqual(
                xt_flow.next_action(self.root, {"stage": 2, "status": "active"}, {}, {}, {})["action"], "review-release"
            )
        (self.root / "xt.yaml").write_text("", encoding="utf-8")
        self.git("commit", "-am", "source-only")
        source_only = xt.release_check(self.root, "BLUEPRINT.md", xt.AUDIT_STATUS_DEFAULT)
        self.assertIsNone(source_only["subject"]["digest"])
        self.assertEqual(bind(source_only)["head"], self.git("rev-parse", "HEAD"))

    def test_local_approval_flag_only_suggests_authoritative_policy_check(self):
        self.write("xt.yaml", "")
        (self.root / "xt.yaml").write_text("stage_approval: agent\n", encoding="utf-8")
        out = xt_flow.next_action(
            self.root, {"stage": 1, "status": "awaiting_approval"}, {"stage": {"changed": [], "sha": "c" * 40}}, {}, {}
        )
        self.assertEqual((out["action"], out["owner"]), ("check-approval-policy", "coordinator"))

    def test_github_summary_removes_untrusted_prose_and_markdown(self):
        raw = self.snap()
        poison = "x\n| fake |\n<img src=x> @reviewer"
        raw["next"].update(owner=poison, action=poison, reason=poison)
        raw["stage"] = {"stage": poison}
        formatted = xt_flow.github_summary(raw)
        self.assertNotIn("@reviewer", formatted)
        self.assertNotIn("<", formatted)
        self.assertIn("`unknown`", formatted)
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            self.assertEqual(xt_flow.main(["--project", str(self.root), "--github-summary"]), 0)
        self.assertIn("`stage-init`", buf.getvalue())
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            self.assertEqual(xt_flow.main(["--project", str(self.tmp / poison), "--github-summary"]), 2)
        self.assertNotIn("@reviewer", err.getvalue())
