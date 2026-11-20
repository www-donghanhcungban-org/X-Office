"""Kiểm cửa vào factory đã cài cho sản phẩm và những hành động có bằng chứng ở mỗi giai đoạn."""

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLAUDE = Path(".claude/skills/factory/SKILL.md")
CODEX = Path(".agents/skills/factory/SKILL.md")


class FactoryEntryTest(unittest.TestCase):
    def test_one_install_creates_clean_codex_project_and_resumes_in_place(self):
        """Cài ngay harness trong commit đầu, rồi thử nâng repo hiện hữu."""
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "so-ghi-chu"
            idea = "Sổ ghi chú của nhóm thử nghiệm"
            env = {**os.environ, "CLAUDE_PROJECT_DIR": str(target)}

            def command(*argv, cwd=target):
                result = subprocess.run([sys.executable, *argv], cwd=cwd, env=env, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-3000:])
                return result.stdout

            def install(*args):
                return command(str(ROOT / "scripts/install.py"), str(target), *args, cwd=ROOT)

            cli = ".xtemplates/scripts/xt.py"
            install("--new", "--pack", "web-api-ts", "--idea", idea, "--harness", "codex")
            self.assertEqual((target / CODEX).read_bytes(), (ROOT / CODEX).read_bytes())
            self.assertEqual(subprocess.check_output(["git", "status", "--porcelain"], cwd=target), b"")
            self.assertEqual(subprocess.check_output(["git", "rev-list", "--count", "HEAD"], cwd=target), b"1\n")
            original = json.loads(command(cli, "stage", "status", "--json"))["stage"]
            self.assertEqual((original["stage"], original["status"]), (1, "active"))
            project = (target / "PROJECT.md").read_text(encoding="utf-8")
            self.assertIn(idea, project)
            install("--harness", "codex")
            self.assertEqual(json.loads(command(cli, "stage", "status", "--json"))["stage"], original)
            self.assertEqual((target / "PROJECT.md").read_text(encoding="utf-8"), project)
            for path in (CLAUDE, CODEX):
                self.assertEqual((target / path).read_bytes(), (ROOT / path).read_bytes(), path)
            self.assertTrue((target / "tests_e2e/preview.sh").is_file())
            self.assertTrue((target / ".xtemplates/scripts/xt_acceptance.py").is_file())
            flow = json.loads(command(".xtemplates/scripts/xt_flow.py", "--json"))
            self.assertEqual((flow["stage"]["stage"], flow["stage"]["status"]), (1, "active"))
            self.assertEqual(flow["next"]["owner"], "coordinator")
            self.assertEqual(json.loads(command(cli, "stage", "status", "--json"))["stage"], original)

    def test_each_stage_has_its_checks_and_handoff(self):
        """Chặn hồi quy về bản skill cũ chỉ nhắc tên hai giai đoạn sau ở cuối MVP."""
        body = (ROOT / CLAUDE).read_text(encoding="utf-8")
        first = body.index("## Giai đoạn 1")
        second = body.index("## Giai đoạn 2")
        third = body.index("## Giai đoạn 3")
        steps = (
            (
                body[:first],
                ["--new", "--harness codex", "xt_flow.py --json", "stage status --json", "plan waves --plan"],
            ),
            (
                body[first:second],
                [
                    "ACCEPTANCE.paths",
                    "xt_acceptance.py check --base",
                    "--project <repo-sản-phẩm>",
                    "/autopilot",
                    "tests_e2e/preview.sh",
                    "deploy status --env dev --json",
                    "stage submit --evidence",
                    "awaiting_approval",
                    "stage reopen --reason",
                ],
            ),
            (
                body[second:third],
                ["/complete", "release-check --json", "rollout-drill", "stage submit", "chính sách giao hàng"],
            ),
            (
                body[third:],
                ["baseline field", "Gate E2E", "promotion.state", "approved", "ops-check --env", "completed"],
            ),
        )
        for section, actions in steps:
            for action in actions:
                with self.subTest(action=action):
                    self.assertIn(action, section)

        sequence = [
            "/optimize",
            "Gate E2E",
            "release-check --json",
            "promotion.state",
            "**tại đích**",
            "ops-check --env",
            "Thử nghiệm tăng trưởng",
        ]
        offsets = [body.index(action, third) for action in sequence]
        self.assertEqual(offsets, sorted(offsets))
