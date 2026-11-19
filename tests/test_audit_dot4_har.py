"""T-3926 (PLAN-harden-2026-11-17 đợt 4, ADR-0080): sửa phát hiện HAR/TEST/DOC/DEP của audit delta cổng ký 2026-11-17.

Mỗi ID một lớp: AUD-HAR-412 (harden không audit theo mốc — D-500), AUD-HAR-413 (`merge_review: optional` merge PR rủi ro
cao), AUD-HAR-414 (`/complete` bước 5.3), AUD-TEST-109 (test guard không gọi `gh` thật), AUD-TEST-110 (luật UTC của
receipt), AUD-TEST-111 (dọn trạng thái trong subTest), AUD-DOC-294/295/297, AUD-DEP-030."""

from __future__ import annotations

import contextlib
import datetime as _dt
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import textwrap
import unittest
import unittest.mock as mock
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_deploy_receipt as receipt_tests
import test_deploy_receipt_fingerprint as fingerprint_tests
import test_green_release as release_tests
import test_xt_core as core
import xt


def text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def plan(base: Path, body: str) -> None:
    path = base / "docs" / "autopilot" / "PLAN.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(body).lstrip("\n"), encoding="utf-8")


class MilestoneAuditPhaseTest(core.TmpMixin, core.RealAutopilotUntouchedMixin, unittest.TestCase):
    """AUD-HAR-412 (D-500): ở pha harden `loop status` không đòi audit theo mốc — dồn về cổng ký (ADR-0080); pha build
    giữ `g7` (audit cuối đợt). `topo: review`/`audit` ở harden cũng gom về cổng ký."""

    def setUp(self) -> None:
        self.guard_real_autopilot()
        self.base = self.tmpdir()
        self.enterContext(mock.patch.dict(os.environ, {"GIT_CEILING_DIRECTORIES": str(self.base.parent)}))
        self.enterContext(mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(self.base)}))
        os.environ.pop("XT_RECORD_TIMEOUT", None)

    def start(self, second: str = "- [ ] `T-002` b — Gate: `true`") -> None:
        plan(self.base, f"## Task\n### Lát 1 — nền\n- [x] `T-001` a — Gate: `true`\n### Lát 2 — tiếp\n{second}\n")
        xt.write_state({"active": True, "plan": "docs/autopilot/PLAN.md"}, self.base)
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(xt.loop_record("T-001", ["true"], self.base), 0)

    def phase(self, value: str | None) -> None:
        cfg = self.base / "xt.yaml"
        if value is None:
            cfg.unlink(missing_ok=True)
        else:
            cfg.write_text(f"delivery_phase: {value}\n", encoding="utf-8")

    def status_json(self) -> dict:
        out = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
            xt.main(["loop", "status", "--json"])
        return dict(json.loads(out.getvalue()))

    def test_harden_milestone_does_not_ask_for_audit(self):
        self.start()
        for value in (None, "harden", "prod", ""):
            with self.subTest(phase=value):
                self.phase(value)
                v = self.status_json()
                self.assertEqual((v["verdict"], v["task"]), ("continue", "T-002"), v)
                self.assertEqual((v["milestone_done"], v["milestone_audit"]), ("Lát 1 — nền", "signoff"))
                self.assertIn("pha harden: audit delta dồn về cổng ký (ADR-0080), làm tiếp task kế", v["reason"])
                self.assertNotIn("audit delta trước khi sang mốc kế", v["reason"])
                self.assertNotIn("audit plan", v["reason"])
                st = xt.read_state(self.base) or {}
                stop = xt._stop_reason({**st, "iterations": 1}, v, None)
                self.assertNotIn("trước khi sang mốc kế", stop)

    def test_build_milestone_keeps_g7(self):
        self.start()
        self.phase("build")
        v = self.status_json()
        self.assertEqual((v["milestone_done"], v["milestone_audit"]), ("Lát 1 — nền", "g7"))
        self.assertIn("pha build: audit delta ở cuối đợt (D-177), làm tiếp task kế", v["reason"])
        self.assertNotIn("cổng ký", v["reason"])

    def test_no_milestone_no_audit_field(self):
        plan(self.base, "- [ ] `T-001` a — Gate: `true`\n")
        xt.write_state({"active": True, "plan": "docs/autopilot/PLAN.md"}, self.base)
        v = xt.loop_verdict(self.base)
        self.assertEqual(v["task"], "T-001")
        self.assertNotIn("milestone_audit", v)

    def test_review_and_audit_topology_deferred_to_signoff_in_harden_only(self):
        note = "pha harden: rà/audit độc lập gom về cổng ký (ADR-0080)"
        for topo in ("review", "audit"):
            for value, expected in ((None, True), ("build", False)):
                with self.subTest(topo=topo, phase=value):
                    self.start(f"- [ ] `T-002` b (topo: {topo}) — Gate: `true`")
                    self.phase(value)
                    v = xt.loop_verdict(self.base)
                    self.assertEqual((v["task"], v["topology"], v["executor"]), ("T-002", topo, None))
                    self.assertIn(f"`topo: {topo}`: phiên chính tự làm (LOOP-ORCH-024)", v["reason"])
                    self.assertEqual(note in v["reason"], expected, v["reason"])
        self.start("- [ ] `T-002` b (topo: parallel) — Gate: `true`")  # giao executor: không thêm ghi chú cổng ký
        self.phase(None)
        v = xt.loop_verdict(self.base)
        self.assertEqual(v["executor"], "executor")
        self.assertNotIn(note, v["reason"])

    def test_docs_match_machine(self):
        """README bước 10, `/autopilot` bước 5, `audit.md` §1, `/complete` bước 4, mẫu PLAN: không còn `now`."""
        for rel in (
            "framework/11-autonomous-loop/README.md",
            ".claude/skills/autopilot/SKILL.md",
            "framework/00-method/audit.md",
            ".claude/skills/complete/SKILL.md",
            "framework/templates/PLAN.md",
        ):
            with self.subTest(rel=rel):
                body = text(rel)
                self.assertNotIn("milestone_audit: now", body)
                self.assertNotIn("(`now` →", body)
                self.assertNotIn("audit delta trước khi sang mốc kế", body)
        self.assertIn("`signoff` = harden, audit ở cổng ký", text("framework/11-autonomous-loop/README.md"))
        self.assertIn("**Không quét theo mốc** ở pha nào (D-500)", text("framework/00-method/audit.md"))
        self.assertIn("**Cổng ký pha harden**", text("framework/00-method/audit.md"))
        self.assertIn("harden: cả hai dồn về cổng ký", text(".claude/skills/autopilot/SKILL.md"))


class OptionalReviewRiskyPrTest(unittest.TestCase):
    """AUD-HAR-413: với `merge_review: optional` (mặc định mẫu, ADR-0079) PR rủi ro cao merge khi CI xanh; review chỉ
    bị bắt khi `required`; `merge_hard_exceptions: human` chỉ giữ người cho ngoại lệ cứng."""

    def setUp(self) -> None:
        self.corpus = json.loads(text("tests/fixtures/autonomy/pr.json"))

    def bench(self, path: str, **changes: object) -> dict:
        pr = {**self.corpus["defaults"]["pr"], "files": [{"path": path, "additions": 5, "deletions": 0}]}
        return dict(xt._bench_pr({**self.corpus["defaults"], "pr": pr, **changes}, mock.Mock()))

    def test_optional_merges_risky_paths(self):
        for path in ("migrations/0001.sql", "src/auth/login.py", "src/payment/charge.py"):
            with self.subTest(path=path):
                got = self.bench(path, merge_review="optional", hard_auto=True)
                self.assertEqual((got["verdict"], got["review"], got["eligible"]), ("merge", "optional", True))
                got = self.bench(path, merge_review="required", hard_auto=True)
                self.assertEqual((got["verdict"], got["review"], got["eligible"]), ("review", "missing", False))

    def test_hard_human_keeps_people_only_for_hard_exceptions(self):
        self.assertEqual(self.bench("src/auth/login.py", merge_review="optional")["verdict"], "human")
        self.assertEqual(self.bench("migrations/0001.sql", merge_review="optional")["verdict"], "merge")

    def test_corpus_cases_and_docs(self):
        ids = {c["id"] for c in self.corpus["cases"] if "AUD-HAR-413" in c["refs"]}
        self.assertEqual(len(ids), 4, ids)
        for rel in (
            ".claude/skills/review/SKILL.md",
            ".claude/skills/gate/SKILL.md",
            "framework/11-autonomous-loop/orchestration-and-subagents.md",
        ):
            with self.subTest(rel=rel):
                body = text(rel)
                self.assertIn("merge_review: required", body)
                self.assertIn("merge_hard_exceptions: human", body)
                self.assertIn("ADR-0079", body)


class CompleteNextStepTest(unittest.TestCase):
    """AUD-HAR-414: `/complete` bước 5.3 nói đủ lối ra của `next-step` và `stage submit` kèm `--evidence`."""

    def test_step_5_3(self):
        body = text(".claude/skills/complete/SKILL.md")
        step = next(line for line in body.splitlines() if line.startswith("3. `<XT> release-check --json"))
        for part in ("`replan`", "`signoff-package`", "`blocked`/`budget` → dừng, báo", "khác → theo `reason`"):
            self.assertIn(part, step)
        self.assertRegex(step, r"`<XT> stage submit --evidence \"[^\"]+\"`")

    def test_step_1_reruns_doctor_after_harden(self):
        """AUD-HAR-440: `doctor` ở pha build không báo khung chậm MINOR/PATCH (ADR-0081) và bước 0 chạy khi còn `build` —
        bước 1 phải chạy lại `doctor` SAU khi đặt `harden`, không thì "nâng khung ở ranh giới pha" không xảy ra."""
        lines = text(".claude/skills/complete/SKILL.md").splitlines()
        at = next(i for i, line in enumerate(lines) if line.startswith("## Bước 1"))
        step = lines[at + 1]
        self.assertLess(step.index("`delivery_phase: harden`"), step.index("chạy lại `<XT> doctor`"))
        self.assertIn("`install.py`", step[step.index("chạy lại `<XT> doctor`") :])


class GreenGhNoNetworkTest(unittest.TestCase):
    """AUD-TEST-109: `tests.test_green_gh` chạy với `gh` lỗi trên PATH → 0 lời gọi `gh` (merge-check giả xanh)."""

    def test_no_gh_calls(self):
        with tempfile.TemporaryDirectory() as td:
            shim, log = Path(td) / "gh", Path(td) / "gh.log"
            shim.write_text('#!/bin/sh\necho "$*" >> "$GH_SHIM_LOG"\nexit 1\n', encoding="utf-8")
            shim.chmod(0o755)
            env = {**os.environ, "PATH": f"{td}{os.pathsep}{os.environ.get('PATH', '')}", "GH_SHIM_LOG": str(log)}
            r = subprocess.run(
                [sys.executable, "-m", "unittest", "tests.test_green_gh"],
                cwd=ROOT,
                env=env,
                capture_output=True,
                text=True,
                timeout=300,
                check=False,
            )
            self.assertEqual(r.returncode, 0, r.stderr[-2000:])
            self.assertFalse(log.exists(), log.read_text(encoding="utf-8") if log.exists() else "")


def _mutant_deploy_utc(value: object) -> _dt.datetime | None:
    """Đột biến M3 của audit: `_deploy_utc` bỏ kiểm UTC (chỉ còn parse ISO)."""
    if not isinstance(value, str):
        return None
    try:
        return _dt.datetime.fromisoformat(value)
    except ValueError:
        return None


class DeployUtcRuleTest(unittest.TestCase):
    """AUD-TEST-110: ca `started` = `finished` cùng múi +07:00 chỉ luật UTC bắt; đột biến bỏ kiểm UTC phải chết."""

    CASE = {"started": "2026-11-14T12:00:00+07:00", "finished": "2026-11-14T12:00:00+07:00"}

    def test_utc_reason(self):
        self.assertEqual(
            xt._deploy_receipt_problem(receipt_tests.receipt(**self.CASE)),
            "`started` và `finished` phải là thời điểm ISO 8601 UTC",
        )
        with mock.patch.object(xt, "_deploy_utc", _mutant_deploy_utc):  # luật khác không bắt được ca này
            self.assertEqual(xt._deploy_receipt_problem(receipt_tests.receipt(**self.CASE)), "")
            self.assertIsNone(_mutant_deploy_utc(0))
            self.assertIsNone(_mutant_deploy_utc("ngày mai"))

    def test_mutant_killed_by_receipt_suite(self):
        name = "test_rejects_receipt_with_impossible_success_or_timestamps"
        for mutant, ok in ((None, True), (_mutant_deploy_utc, False)):
            with self.subTest(mutant=bool(mutant)):
                result = unittest.TestResult()
                patch = mock.patch.object(xt, "_deploy_utc", mutant) if mutant else contextlib.nullcontext()
                with patch:
                    receipt_tests.DeployStatusTest(name).run(result)
                self.assertEqual(result.wasSuccessful(), ok, result.failures)


class SubTestCleanupTest(unittest.TestCase):
    """AUD-TEST-111: subTest đỏ vẫn dọn trạng thái (cờ index, tệp sửa, tệp hàng xóm) trước subTest sau."""

    def test_index_flags_cleared_when_subtest_fails(self):
        calls: list[tuple[str, ...]] = []

        class Probe(release_tests.TreeRowTest):
            def git(self, *args: str, env: object = None) -> str:
                calls.append(args)
                return str(super().git(*args, env=env))

        result = unittest.TestResult()
        with mock.patch.object(xt, "_release_tree", return_value=({"result": "PASS", "evidence": ""}, None, True)):
            Probe("test_index_flags_name_file_and_tag").run(result)
        self.assertFalse(result.wasSuccessful())
        for flag in ("assume-unchanged", "skip-worktree"):
            self.assertIn(("update-index", f"--no-{flag}", "app.py"), calls)

    def test_stage_flags_and_file_restored_when_subtest_fails(self):
        calls: list[tuple[str, ...]] = []

        class Probe(release_tests.StageHiddenIndexTest):
            def git(self, *args: str, env: object = None) -> str:
                calls.append(args)
                return str(super().git(*args, env=env))

            def stage(self, *args: str, agent: bool = False) -> tuple[int, str, str]:
                return (0, "", "") if args[:1] == ("submit",) else super().stage(*args, agent=agent)

        result = unittest.TestResult()
        Probe("test_flagged_file_refused").run(result)
        self.assertFalse(result.wasSuccessful())
        for flag in ("assume-unchanged", "skip-worktree"):
            self.assertIn(("update-index", f"--no-{flag}", "f.txt"), calls)
        self.assertEqual(calls.count(("checkout", "--", "f.txt")), 2)

    def test_neighbor_removed_when_subtest_fails(self):
        rels = ("docs/ops/DEPLOYS.json.bak", "src/DEPLOYS.json", f"{fingerprint_tests.LEDGER}/src.py")
        snaps: list[tuple[bool, ...]] = []

        class Probe(fingerprint_tests.DeployReleaseFingerprintTest):
            def release_content(self) -> str:
                snaps.append(tuple((self.repo / "app" / r).exists() for r in rels))
                return "cố định"  # assertNotEqual trong subTest luôn đỏ

        result = unittest.TestResult()
        Probe("test_only_exact_ledger_path_is_excluded_from_release_content").run(result)
        self.assertEqual(len(result.failures), 3, result.failures)
        # mỗi subTest đỏ chỉ thấy tệp hàng xóm của chính nó — tệp của subTest trước đã dọn (trước sửa: dồn lại)
        self.assertEqual(snaps[-3:], [(True, False, False), (False, True, False), (False, False, True)])


class DocFactsTest(unittest.TestCase):
    """AUD-DOC-294/295/297, AUD-DEP-030: số liệu tài liệu khớp nguồn máy."""

    def test_required_checks_listed(self):
        ruleset = json.loads(text(".github/rulesets/main.json"))
        rule = next(r for r in ruleset["rules"] if r["type"] == "required_status_checks")
        checks = [c["context"] for c in rule["parameters"]["required_status_checks"]]
        self.assertIn("pack-npm-audit", checks)
        contributing = text("CONTRIBUTING.md")
        runbook = text("docs/ops/RUNBOOK-PR-STEWARD.md")
        for check in checks:
            with self.subTest(check=check):
                self.assertIn(f"`{check}`", contributing)
                self.assertIn(f"`{check}`", runbook)
        self.assertNotIn("repos/seeker19110", runbook)
        self.assertIn("repos/www-donghanhcungban-org/X-office/rules/branches/main", runbook)

    def test_readme_must_count(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(xt.main(["stats"]), 0)
        found = re.search(r"MUST=(\d+)", out.getvalue())
        assert found is not None, out.getvalue()
        must = int(found[1])
        self.assertIn(f"({must // 1000}.{must % 1000:03d} MUST)", text("README.md"))

    def test_readme_tools(self):
        readme = text("README.md")
        self.assertIn("`python3 scripts/xt.py doctor [--fix] [--json] [--offline]`", readme)
        self.assertIn(
            "`python3 scripts/install.py DỰ_ÁN --new --pack ID --idea TEXT [--name N] [--scale S\\|M\\|L]`", readme
        )

    def test_requirements_cooldown(self):
        for rel in ("requirements-dev.txt", "requirements-audit.txt"):
            with self.subTest(rel=rel):
                body = text(rel)
                self.assertIn("--exclude-newer <ngày−7>", body)
                self.assertNotIn("<ngày−3>", body)


if __name__ == "__main__":
    unittest.main()
