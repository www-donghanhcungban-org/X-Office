"""Trả nợ review 🟢 cho `scripts/install.py` và `scripts/dev-task.sh` (T-3920, ADR-0080).

Mỗi lớp ghim một nhóm AUD-*; đột biến tương ứng đã được chạy để chứng minh test chết (xem CHANGELOG/PR)."""

import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import install

ROW = "  | người | An | GO | 2026-11-11 |\n"


class InstallGreenTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(self.enterContext(tempfile.TemporaryDirectory())).resolve()
        self.outside = self.tmp / "outside"
        self.outside.mkdir()
        self.target = self.tmp / "proj"
        self.target.mkdir()

    def run_install(self, *argv: str) -> tuple[int, str, str]:
        out, err = io.StringIO(), io.StringIO()
        with redirect_stderr(err), redirect_stdout(out):
            rc = install.main([str(self.target), "--label", "t", *argv])
        return rc, out.getvalue(), err.getvalue()

    def test_file_occupying_dir_name_is_rejected_before_any_write(self):
        """AUD-SEC-652(a): file thường chiếm `.claude`/`.github` — từ chối có lý do, không traceback, chưa ghi gì."""
        cases = ((".claude", ()), (".github", ("--with-github",)))
        for rel, extra in cases:
            for plan in ((), ("--plan",)):
                with self.subTest(rel=rel, plan=plan):
                    shutil.rmtree(self.target)
                    self.target.mkdir()
                    (self.target / rel).write_text("x", encoding="utf-8")
                    rc, _out, err = self.run_install(*plan, *extra)
                    self.assertEqual(rc, 2, err)
                    self.assertIn("không phải thư mục", err)
                    self.assertEqual(sorted(p.name for p in self.target.iterdir()), [rel])

    def test_dangling_hooks_symlink_does_not_abort_midway(self):
        """AUD-SEC-652(a): `.claude/hooks` là symlink treo — cài xong (AGENTS.md, .gitignore), không ghi ra ngoài."""
        (self.target / ".claude").mkdir()
        (self.target / ".claude" / "hooks").symlink_to(self.tmp / "nowhere")
        rc, _out, err = self.run_install()
        self.assertEqual(rc, 0, err)
        self.assertTrue((self.target / "AGENTS.md").is_file())
        self.assertTrue((self.target / ".gitignore").is_file())
        self.assertFalse((self.tmp / "nowhere").exists())

    def test_legacy_refs_does_not_read_through_symlinked_dir(self):
        """AUD-SEC-652(b): `.claude → ngoài` không bị đọc xuyên; file thật trong dự án vẫn được báo."""
        (self.outside / "note.md").write_text("dùng xs.yaml\n", encoding="utf-8")
        (self.target / ".claude").symlink_to(self.outside)
        (self.target / "README.md").write_text("dùng xs.yaml\n", encoding="utf-8")
        self.assertEqual(install.legacy_refs(self.target), ["README.md"])

    def test_skip_warning_names_the_symlinked_directory(self):
        """AUD-SEC-652(c): cảnh báo nêu thư mục là symlink, không chỉ file đích."""
        (self.target / ".claude").symlink_to(self.outside)
        rc, _out, err = self.run_install()
        self.assertEqual(rc, 0, err)
        link = self.target / ".claude"
        lines = [ln for ln in err.splitlines() if f"bỏ qua symlink {link} (không ghi qua liên kết) → {link}/" in ln]
        self.assertTrue(lines, err)
        self.assertEqual(list(self.outside.rglob("*")), [])

    def test_plan_reports_skipped_symlink_for_existing_gemini_settings(self):
        """AUD-TEST-101: `--plan` báo `skipped-symlink` (không phải `merged`) cho Gemini có sẵn dưới thư mục symlink."""
        (self.outside / "settings.json").write_text('{"keep": 1}\n', encoding="utf-8")
        (self.target / ".gemini").symlink_to(self.outside)
        rc, out, err = self.run_install("--harness", "gemini", "--plan")
        self.assertEqual(rc, 0, err)
        adapters = json.loads(out)["adapters"]
        self.assertEqual([a["action"] for a in adapters], ["skipped-symlink"])


class DevTaskGreenTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(self.enterContext(tempfile.TemporaryDirectory()))
        (self.tmp / "scripts").mkdir()
        shutil.copy(ROOT / "scripts" / "dev-task.sh", self.tmp / "scripts" / "dev-task.sh")
        self.go = self.tmp / "GO-NO-GO-fixture.md"
        self.go.write_text(ROW, encoding="utf-8")

    def run_task(self, *args, path_prefix: Path | None = None):
        env = dict(os.environ, CLAUDE_PROJECT_DIR=str(self.tmp))
        if path_prefix:
            env["PATH"] = f"{path_prefix}:{env['PATH']}"
        return subprocess.run(
            ["bash", str(self.tmp / "scripts" / "dev-task.sh"), *args],
            capture_output=True,
            text=True,
            cwd=self.tmp,
            env=env,
        )

    def config(self, text: str):
        (self.tmp / "xt.yaml").write_text(text, encoding="utf-8")

    def test_format_file_skip_by_name_is_logged(self):
        """AUD-HAR-396: nhánh bỏ qua theo tên được ghim bằng dòng `skip format-file` (không chỉ bản khôi phục)."""
        self.config("format_file: printf FORMATTED > {}\n")
        r = self.run_task("format-file", str(self.go))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("skip format-file", r.stderr)
        self.assertEqual(self.go.read_text(encoding="utf-8"), ROW)

    def test_format_file_skip_by_realpath_is_logged(self):
        """AUD-HAR-396: file tên vô hại là symlink tới GO-NO-GO — bỏ qua theo realpath, có dòng `skip format-file`."""
        self.config("format_file: printf FORMATTED > {}\n")
        (self.tmp / "innocent.md").symlink_to(self.go)
        r = self.run_task("format-file", "innocent.md")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("skip format-file", r.stderr)
        self.assertEqual(self.go.read_text(encoding="utf-8"), ROW)

    def test_restores_go_no_go_deleted_by_formatter(self):
        """AUD-HAR-397: formatter xoá GO-NO-GO → khôi phục nguyên nội dung."""
        self.config("format: rm GO-NO-GO-fixture.md\n")
        r = self.run_task("format")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.go.read_text(encoding="utf-8"), ROW)
        self.assertIn("khôi phục", r.stderr)

    def test_restores_go_no_go_modified_through_hardlink(self):
        """AUD-HAR-397: file tên vô hại là hardlink tới GO-NO-GO — formatter ghi qua nó vẫn bị khôi phục."""
        os.link(self.go, self.tmp / "other.md")
        self.config("format_file: printf FORMATTED > {}\n")
        r = self.run_task("format-file", "other.md")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.go.read_text(encoding="utf-8"), ROW)
        self.assertIn("khôi phục", r.stderr)

    def test_format_stops_when_mktemp_fails(self):
        """AUD-HAR-397: `mktemp` hỏng → không chạy formatter (không có bản chụp), trả đỏ."""
        self.config("format: touch format-ran\n")
        shim = self.tmp / "bin"
        shim.mkdir()
        (shim / "mktemp").write_text("#!/bin/sh\nexit 1\n", encoding="utf-8")
        (shim / "mktemp").chmod(0o755)
        r = self.run_task("format", path_prefix=shim)
        self.assertNotEqual(r.returncode, 0, r.stderr)
        self.assertFalse((self.tmp / "format-ran").exists())
        self.assertEqual(self.go.read_text(encoding="utf-8"), ROW)

    def test_restores_go_no_go_symlink_to_other_name(self):
        """AUD-HAR-399(a): `GO-NO-GO-v9.md → draft.md`, formatter chuẩn hoá `draft.md` — bản chụp đi theo symlink."""
        ops = self.tmp / "docs" / "ops"
        ops.mkdir(parents=True)
        (ops / "draft.md").write_text(ROW, encoding="utf-8")
        (ops / "GO-NO-GO-v9.md").symlink_to("draft.md")
        self.config("format_file: printf FORMATTED > {}\n")
        r = self.run_task("format-file", "docs/ops/draft.md")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual((ops / "draft.md").read_text(encoding="utf-8"), ROW)
        self.assertTrue((ops / "GO-NO-GO-v9.md").is_symlink())

    def test_dangling_go_no_go_symlink_does_not_block_formatter(self):
        """AUD-HAR-399(a): symlink treo mang tên GO-NO-GO không có gì để chụp — không chặn formatter."""
        (self.tmp / "GO-NO-GO-dangling.md").symlink_to("missing.md")
        self.config("format: touch format-ran\n")
        r = self.run_task("format")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertTrue((self.tmp / "format-ran").exists())


if __name__ == "__main__":
    unittest.main()
