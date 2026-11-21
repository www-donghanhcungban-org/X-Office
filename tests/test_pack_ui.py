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
BROWSER = "tests_e2e/prepare-chromium.sh"
LOCK = "tests_e2e/requirements.txt"
TOOLS = ".github/actions/xt-ci-tools/action.yml"
TEST_DB = "scripts/test-with-postgres.sh"


class PackUiTest(unittest.TestCase):
    def test_fresh_starter_owns_browser_ci_and_brownfield_stays_opt_in(self):
        with tempfile.TemporaryDirectory() as tmp, redirect_stderr(StringIO()):
            root = Path(tmp)
            copied = install.install_pack_starter(root, "web-api-ts", "fresh")
            for rel in (JOURNEY, COMMAND, BROWSER, LOCK, WORKFLOW, TOOLS, TEST_DB):
                self.assertIn(rel, copied)
                self.assertEqual((root / rel).read_bytes(), (STARTER / rel).read_bytes())
            (root / JOURNEY).write_text("# Luồng riêng của dự án\n", encoding="utf-8")
            self.assertEqual(install.install_pack_starter(root, "web-api-ts", "upgrade"), [])
            self.assertIn("Luồng riêng", (root / JOURNEY).read_text(encoding="utf-8"))
            brown = root / "existing"
            brown.mkdir()
            own = '{"scripts":{"test":"make my-test"}}'
            (brown / "package.json").write_text(own, encoding="utf-8")
            config = "setup: make my-setup\ntest: make my-test\n"
            (brown / "xt.yaml").write_text(config)
            mode = install.pack_mode(brown, "web-api-ts")
            self.assertEqual(install.install_pack_starter(brown, "web-api-ts", mode), [])
            install.install_pack_yaml(
                brown, "web-api-ts", mode, json.loads((PACK / "pack.json").read_text())["xt_yaml"]
            )
            self.assertEqual((brown / "package.json").read_text(), own)
            self.assertEqual((brown / "xt.yaml").read_text(), config)
            self.assertFalse((brown / TOOLS).exists())
            self.assertFalse((brown / TEST_DB).exists())
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
        self.assertIn(f'bash {BROWSER} "$python"', (STARTER / COMMAND).read_text())
        self.assertIn(f"bash {BROWSER} python", (ROOT / ".github/workflows/pack-web-api.yml").read_text())
        app_job = (ROOT / ".github/workflows/ci.yml").read_text().split("\n  app-e2e:\n")[1].split("\n  quality:\n")[0]
        setup = app_job.index(f"run: bash {(STARTER / BROWSER).relative_to(ROOT).as_posix()} python")
        self.assertLess(app_job.index("--require-hashes -r requirements-e2e.txt"), setup)
        self.assertLess(setup, app_job.index("python -m unittest discover -s tests_e2e -t ."))
        self.assertNotIn("--with-deps", app_job)

    def test_chromium_installs_system_packages_only_for_missing_libraries_on_ci(self):
        install = "-m playwright install --only-shell chromium"
        deps = "-m playwright install-deps chromium"
        missing = "error while loading shared libraries: libnss3.so"
        for error, ci, custom, again, expected, success in [
            ("", "true", "", "", [install, "-"], True),
            (missing, "true", "", "", [install, "-", deps, "-"], True),
            ("Host system is missing dependencies", "true", "", "still missing", [install, "-", deps, "-"], False),
            ("target crashed", "true", "", "", [install, "-"], False),
            (missing, "false", "", "", [install, "-"], False),
            (missing, "true", "/custom/chrome", "", ["-"], False),
        ]:
            with self.subTest(error=error, ci=ci, custom=custom, again=again), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                fake = root / "python"
                fake.write_text(
                    '#!/bin/sh\necho "$*" >> "$TRACE"\n'
                    'if [ "$1" = "-" ]; then\n'
                    "  cat >/dev/null\n"
                    '  if [ -f "$TRACE.probed" ]; then ERROR=$AGAIN; fi\n'
                    '  touch "$TRACE.probed"\n'
                    '  if [ -n "$ERROR" ]; then echo "$ERROR" >&2; exit 1; fi\n'
                    "fi\n"
                )
                fake.chmod(0o755)
                trace = root / "calls"
                env = {
                    **os.environ,
                    "TRACE": str(trace),
                    "ERROR": error,
                    "AGAIN": again,
                    "GITHUB_ACTIONS": ci,
                    "XT_E2E_CHROMIUM": custom,
                }
                result = subprocess.run(["bash", str(STARTER / BROWSER), str(fake)], env=env, capture_output=True)
                self.assertEqual(result.returncode == 0, success, result.stderr)
                self.assertEqual(trace.read_text().splitlines(), expected)

    def test_notes_ui_keeps_focus_and_shows_feedback_next_to_the_form(self):
        ui = STARTER / "src/notes-ui"
        html = (ui / "index.html").read_text(encoding="utf-8")
        script = (ui / "app.js").read_text(encoding="utf-8")
        css = (ui / "app.css").read_text(encoding="utf-8")
        login_form = html.split('<form id="login-form"')[1].split("</form>")[0]
        note_form = html.split('<form id="note-form"')[1].split("</form>")[0]
        self.assertIn('id="login-status"', login_form)
        self.assertIn('id="note-status"', note_form)
        self.assertEqual(html.count('aria-live="polite"'), 3)
        self.assertNotIn('id="status"', html)
        self.assertIn('"aria-invalid", "true"', script)
        self.assertIn('"aria-describedby", noteStatus.id', script)
        self.assertIn('removeAttribute("aria-invalid")', script)
        self.assertLess(script.index("const focused = document.activeElement"), script.index("button.disabled = true"))
        self.assertIn("focused.focus(", script)

        def luminance(color):
            channels = [int(color[i : i + 2], 16) / 255 for i in (1, 3, 5)]
            lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
            return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]

        def contrast(a, b):
            high, low = sorted((luminance(a), luminance(b)), reverse=True)
            return (high + 0.05) / (low + 0.05)

        border = css.split("input,\ntextarea {")[1].split("border: 1px solid ")[1].split(";")[0]
        self.assertGreaterEqual(contrast(border, "#e2eadc"), 3.0)
        self.assertGreaterEqual(contrast(border, "#ffffff"), 3.0)

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
