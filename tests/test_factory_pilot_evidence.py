"""Gate của pilot phải đỏ với báo cáo rỗng hoặc bằng chứng của một bản dev khác."""

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tests.test_deploy_receipt import AT, HEAD, receipt
from tests_e2e.verify_factory_pilot import verify


class FactoryPilotEvidenceTest(unittest.TestCase):
    def setUp(self):
        root = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.report = root / "FACTORY-PILOT-1.md"
        self.proofs = self.report.with_suffix("")
        self.proofs.mkdir()
        archive = "e" * 64
        self.digest = hashlib.sha256(f"dist/app.tgz\0{archive}\n".encode()).hexdigest()
        self.dev = receipt(artifacts=[{"path": "dist/app.tgz", "sha256": archive}], served_digest=self.digest)
        self.dev["subject"]["digest"] = self.digest
        self.ledger = {
            "schema": 1,
            "envs": {"dev": {"current": self.dev, "previous": None, "unknown": False}},
            "events": [self.dev],
        }
        self.browser = {
            "schema": 1,
            "result": "passed",
            "subject": self.dev["subject"],
            "served_digest": self.digest,
            "artifact_sha256": self.dev["artifacts"][0]["sha256"],
            "checks": ["login", "create-note", "reload-note"],
            "elapsed_seconds": 2,
            "run_url": None,
        }
        self.summary = {
            "head": HEAD,
            "digest": self.digest,
            "idea": "Sổ ghi chú",
            "started": "2026-11-14T11:59:50Z",
            "tasks": 3,
            "failed_gates": 1,
            "human_questions": 0,
            "cost_usd": None,
        }
        self.write_summary()
        self.write_json("DEPLOYS.json", self.ledger)
        self.write_json("preview-browser.json", self.browser)

    def write_summary(self, **changes):
        data = json.dumps({**self.summary, **changes}, ensure_ascii=False)
        self.report.write_text(f"# Pilot\n\n```json\n{data}\n```\n", encoding="utf-8")

    def write_json(self, name, data):
        (self.proofs / name).write_text(json.dumps(data), encoding="utf-8")

    def test_valid_evidence_uses_real_receipt_finish_time(self):
        self.assertEqual(verify(self.report), 10)
        self.write_summary(started=AT, cost_usd=0)
        self.assertEqual(verify(self.report), 0)

    def test_report_alone_cannot_pass(self):
        self.report.write_text("Pilot đã xong!\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "khối json"):
            verify(self.report)
        self.write_summary()
        (self.proofs / "preview-browser.json").unlink()
        with self.assertRaises(FileNotFoundError):
            verify(self.report)

    def test_reject_other_candidate_unknown_state_and_missing_deploy_event(self):
        self.write_summary(head="0" * 40)
        with self.assertRaisesRegex(ValueError, "SHA/digest"):
            verify(self.report)
        self.write_summary()
        self.write_json("DEPLOYS.json", {**self.ledger, "events": []})
        with self.assertRaisesRegex(ValueError, "sự kiện"):
            verify(self.report)
        self.write_json(
            "DEPLOYS.json", {**self.ledger, "envs": {"dev": {"current": None, "previous": None, "unknown": True}}}
        )
        with self.assertRaisesRegex(ValueError, "dev đang chạy"):
            verify(self.report)

    def test_incomplete_or_mismatched_browser_run_rejected(self):
        for fields in (
            {"schema": True},
            {"result": "failed"},
            {"checks": ["login", "create-note"]},
            {"subject": {**self.dev["subject"], "head": "9" * 40}},
            {"served_digest": "0" * 64},
            {"artifact_sha256": self.digest},
            {"elapsed_seconds": None},
        ):
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                self.write_json("preview-browser.json", {**self.browser, **fields})
                verify(self.report)

    def test_copied_hash_in_both_files_must_still_match_observed_release_digest(self):
        self.dev["artifacts"][0]["sha256"] = "0" * 64
        self.write_json("DEPLOYS.json", self.ledger)
        self.write_json("preview-browser.json", {**self.browser, "artifact_sha256": "0" * 64})
        with self.assertRaisesRegex(ValueError, "danh sách artifact"):
            verify(self.report)

    def test_inconsistent_pilot_metrics_rejected(self):
        for fields in (
            {"started": "2026-11-14T12:00:01Z"},
            {"started": "2026-11-14T11:00:00"},
            {"idea": "  "},
            {"human_questions": 1},
            {"tasks": 0},
            {"failed_gates": False},
            {"cost_usd": "unknown"},
            {"cost_usd": -1},
        ):
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                self.write_summary(**fields)
                verify(self.report)
