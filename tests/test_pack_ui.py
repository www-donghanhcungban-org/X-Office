"""Starter web-api-ts giao lệnh nghiệm thu UI cho dự án mới; cài lại hoặc vào brownfield giữ quyền dự án."""

import json
import os
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from io import StringIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import install

PACK = ROOT / install.PACKS_DIR / "web-api-ts"
STARTER = PACK / "starter"
WORKFLOW = ".github/workflows/dev-preview.yml"
JOURNEY = "tests_e2e/pack_preview.py"
COMMAND = "tests_e2e/preview.sh"
LOCK = "tests_e2e/requirements.txt"


class PackUiTest(unittest.TestCase):
    def test_fresh_starter_owns_browser_ci_and_brownfield_stays_opt_in(self):
        with tempfile.TemporaryDirectory() as tmp, redirect_stderr(StringIO()):
            root = Path(tmp)
            copied = install.install_pack_starter(root, "web-api-ts", "fresh")
            for rel in (JOURNEY, COMMAND, LOCK, WORKFLOW):
                self.assertIn(rel, copied)
                self.assertEqual((root / rel).read_bytes(), (STARTER / rel).read_bytes())
            (root / JOURNEY).write_text("# Luồng riêng của dự án\n", encoding="utf-8")
            self.assertEqual(install.install_pack_starter(root, "web-api-ts", "upgrade"), [])
            self.assertIn("Luồng riêng", (root / JOURNEY).read_text(encoding="utf-8"))
            brown = root / "existing"
            brown.mkdir()
            (brown / "package.json").write_text("{}", encoding="utf-8")
            mode = install.pack_mode(brown, "web-api-ts")
            self.assertEqual(install.install_pack_starter(brown, "web-api-ts", mode), [])
            self.assertFalse((brown / WORKFLOW).exists())
            self.assertFalse((brown / JOURNEY).exists())

    def test_ci_runs_target_command_and_browser_lock_matches_audited_pins(self):
        workflow = (STARTER / WORKFLOW).read_text(encoding="utf-8")
        self.assertIn("\n  pull_request:\n", workflow)
        self.assertIn("\n  workflow_dispatch:\n", workflow)
        self.assertIn(f"run: bash {COMMAND} --output", workflow)
        self.assertIn("docs/ops/DEPLOYS.json", workflow)
        shared_e2e = json.loads((PACK / "pack.json").read_text(encoding="utf-8"))["xt_yaml"].get("e2e", "")
        self.assertNotIn(COMMAND, shared_e2e)

        def pins(path):
            return [line for line in path.read_text(encoding="utf-8").splitlines() if line and not line.startswith("#")]

        self.assertEqual(pins(STARTER / LOCK), pins(ROOT / "requirements-e2e.txt"))

    def test_failed_prerequisite_preserves_previous_proof_under_separate_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            proof = Path(tmp) / "report.json"
            old = '{"result":"passed"}'
            proof.write_text(old, encoding="utf-8")
            run = subprocess.run(
                ["bash", str(STARTER / COMMAND), "--output", str(proof)],
                env={**os.environ, "XT_FRAMEWORK_PYTHON": "false"},
                cwd=tmp,
                capture_output=True,
            )
            self.assertNotEqual(run.returncode, 0)
            self.assertFalse(proof.exists())
            previous = list(proof.parent.glob("report.json.previous.*"))
            self.assertEqual(len(previous), 1)
            self.assertEqual(previous[0].read_text(encoding="utf-8"), old)
