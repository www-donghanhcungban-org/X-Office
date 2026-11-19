"""T-3932 (PLAN-harden-2026-11-17 đợt 5, cổng ký lần 2): sửa phát hiện `scripts/`/test của audit cổng ký lần hai.

Mỗi ID một lớp: AUD-HAR-422 (`go_snapshot` bỏ qua thư mục còn quyền `x`), AUD-TEST-114 (ghim `LC_ALL=C` của
`go_snapshot`), AUD-HAR-423 (`loop stop` khi vòng đã dừng mà `.autopilot` là symlink), AUD-TEST-113 (đường `verify` qua
`_stop_symlink`), AUD-TEST-112/115 (test guard/merge không gọi `gh` thật)."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
import unittest.mock
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import xt
from test_xt_cli import TmpDirCase, run_main

ROW = "| Người ký | (chưa ký) |\n"
SESSION = "11111111-aaaa-bbbb-cccc-000000000002"
GIT_ID = ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false"]
# Formatter đi theo chỉ mục git (`git ls-files -z -- '*.md' | xargs …`): không cần đọc thư mục, chỉ cần đi xuyên (`x`)
FORMAT_BY_INDEX = "format: git ls-files -z -- '*.md' | xargs -0 -I{} sh -c 'printf FORMATTED > \"$1\"' _ {}\n"


def git(cwd: Path, *args: str) -> str:
    r = subprocess.run(["git", "-C", str(cwd), *GIT_ID, *args], capture_output=True, text=True, check=True)
    return r.stdout.strip()


class _DevTaskCase(unittest.TestCase):
    """Bản sao `dev-task.sh` trong repo git tạm; chạy như user thường (root đi xuyên mọi thư mục — không tái hiện)."""

    def setUp(self) -> None:
        if os.geteuid() == 0:
            self.skipTest("root đọc/đi xuyên mọi thư mục — không tái hiện được")
        self.tmp = Path(self.enterContext(tempfile.TemporaryDirectory())).resolve()
        (self.tmp / "scripts").mkdir()
        shutil.copy(ROOT / "scripts" / "dev-task.sh", self.tmp / "scripts" / "dev-task.sh")

    def run_task(self, *args: str, path_prefix: Path | None = None) -> subprocess.CompletedProcess[str]:
        env = dict(os.environ, CLAUDE_PROJECT_DIR=str(self.tmp), GIT_CEILING_DIRECTORIES=str(self.tmp.parent))
        if path_prefix:
            env["PATH"] = f"{path_prefix}:{env['PATH']}"
        return subprocess.run(
            ["bash", str(self.tmp / "scripts" / "dev-task.sh"), *args],
            capture_output=True,
            text=True,
            cwd=self.tmp,
            env=env,
        )

    def lock(self, d: Path, mode: int) -> None:
        d.chmod(mode)
        self.addCleanup(d.chmod, 0o700)


class TraversableDirStopsFormatterTest(_DevTaskCase):
    """AUD-HAR-422: thư mục còn quyền `x` mất `r` (0o311) — `find` báo "Permission denied" nhưng formatter đi theo chỉ mục
    git vẫn mở được GO-NO-GO trong đó; `go_snapshot` không được bỏ qua → dừng formatter (như bản nền trước AUD-HAR-417).
    Thư mục không đi xuyên được (0o000, 0o600) vẫn bỏ qua như AUD-HAR-417."""

    def setUp(self) -> None:
        super().setUp()
        git(self.tmp, "init", "-q", "-b", "main")
        self.dir = self.tmp / "vault"
        self.dir.mkdir()
        self.go = self.dir / "GO-NO-GO-v1.md"
        self.go.write_text(ROW, encoding="utf-8")
        (self.tmp / "a.md").write_text("a\n", encoding="utf-8")
        (self.tmp / "xt.yaml").write_text(FORMAT_BY_INDEX, encoding="utf-8")
        git(self.tmp, "add", "-A")
        git(self.tmp, "commit", "-q", "-m", "init")

    def test_baseline_formatter_reaches_go_no_go(self) -> None:
        """Đối chứng: formatter giả thật sự viết GO-NO-GO trong thư mục 0o311 nếu không bị dừng."""
        self.lock(self.dir, 0o311)
        subprocess.run(["bash", "-c", FORMAT_BY_INDEX.split(": ", 1)[1]], cwd=self.tmp, check=True)
        self.assertEqual(self.go.read_text(encoding="utf-8"), "FORMATTED")

    def test_traversable_unreadable_dir_stops_formatter(self) -> None:
        self.lock(self.dir, 0o311)
        r = self.run_task("format")
        self.assertNotEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.go.read_text(encoding="utf-8"), ROW)
        self.assertEqual((self.tmp / "a.md").read_text(encoding="utf-8"), "a\n")  # formatter không chạy
        self.assertIn("không sao lưu được GO-NO-GO", r.stderr)
        self.assertIn("vault", r.stderr)

    def test_format_file_also_stops_formatter(self) -> None:
        self.lock(self.dir, 0o311)
        (self.tmp / "xt.yaml").write_text("format_file: " + FORMAT_BY_INDEX.split(": ", 1)[1], encoding="utf-8")
        self.run_task("format-file", "a.md")
        self.assertEqual(self.go.read_text(encoding="utf-8"), ROW)
        self.assertEqual((self.tmp / "a.md").read_text(encoding="utf-8"), "a\n")

    def test_untraversable_dir_still_skipped(self) -> None:
        for mode in (0o000, 0o600):
            with self.subTest(mode=oct(mode)):
                self.lock(self.dir, mode)
                try:
                    (self.tmp / "xt.yaml").write_text("format: printf FORMATTED > a.md\n", encoding="utf-8")
                    r = self.run_task("format")
                    self.assertEqual(r.returncode, 0, r.stderr)
                    self.assertEqual((self.tmp / "a.md").read_text(encoding="utf-8"), "FORMATTED")
                finally:
                    self.dir.chmod(0o700)
                    (self.tmp / "a.md").write_text("a\n", encoding="utf-8")

    def test_mixed_dirs_stop_formatter(self) -> None:
        """Một thư mục bỏ qua được và một thư mục còn `x` → vẫn dừng (mọi dòng lỗi phải bỏ qua được)."""
        other = self.tmp / "pgdata"
        other.mkdir()
        self.lock(other, 0o000)
        self.lock(self.dir, 0o311)
        r = self.run_task("format")
        self.assertNotEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.go.read_text(encoding="utf-8"), ROW)

    def test_unparsable_permission_line_stops_formatter(self) -> None:
        """Dòng "Permission denied" không trỏ tới thư mục có thật (find khác định dạng, tên lạ) → dừng (fail-closed)."""
        shim = self.tmp / "bin"
        shim.mkdir()
        (shim / "find").write_text(
            "#!/bin/sh\necho \"find: './khong-co': Permission denied\" >&2\nexit 1\n", encoding="utf-8"
        )
        (shim / "find").chmod(0o755)
        (self.tmp / "xt.yaml").write_text("format: touch format-ran\n", encoding="utf-8")
        r = self.run_task("format", path_prefix=shim)
        self.assertNotEqual(r.returncode, 0, r.stderr)
        self.assertFalse((self.tmp / "format-ran").exists())

    def test_unquoted_find_message_is_parsed(self) -> None:
        """`find` không bọc nháy (busybox: `find: ./pgdata: Permission denied`) — thư mục 0o000 vẫn bỏ qua được."""
        locked = self.tmp / "pgdata"
        locked.mkdir()
        self.lock(locked, 0o000)
        shim = self.tmp / "bin"
        shim.mkdir()
        (shim / "find").write_text(
            "#!/bin/sh\necho 'find: ./pgdata: Permission denied' >&2\nexit 1\n", encoding="utf-8"
        )
        (shim / "find").chmod(0o755)
        (self.tmp / "xt.yaml").write_text("format: touch format-ran\n", encoding="utf-8")
        r = self.run_task("format", path_prefix=shim)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertTrue((self.tmp / "format-ran").exists())


class GoSnapshotLocaleTest(_DevTaskCase):
    """AUD-TEST-114: `go_snapshot` chạy `find` với `LC_ALL=C` — thông báo tiếng Anh mới nhận ra "Permission denied". Shim
    `find` in thông báo đã dịch khi thiếu `LC_ALL=C`; đột biến bỏ `LC_ALL=C` làm formatter bị dừng."""

    def run_localized(self) -> subprocess.CompletedProcess[str]:
        locked = self.tmp / "pgdata"
        locked.mkdir()
        self.lock(locked, 0o000)
        real = shutil.which("find")
        assert real is not None
        shim = self.tmp / "bin"
        shim.mkdir()
        (shim / "find").write_text(
            "#!/bin/sh\n"
            'if [ "$LC_ALL" != C ]; then echo "find: \'./pgdata\': Keine Berechtigung" >&2; exit 1; fi\n'
            f'exec "{real}" "$@"\n',
            encoding="utf-8",
        )
        (shim / "find").chmod(0o755)
        (self.tmp / "xt.yaml").write_text("format: touch format-ran\n", encoding="utf-8")
        with unittest.mock.patch.dict(os.environ, {"LANG": "de_DE.UTF-8", "LC_ALL": "de_DE.UTF-8"}):
            return self.run_task("format", path_prefix=shim)

    def test_find_runs_with_c_locale(self) -> None:
        r = self.run_localized()
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertTrue((self.tmp / "format-ran").exists())
        self.assertNotIn("Keine Berechtigung", r.stderr)
        self.assertIn("bỏ qua 1 thư mục không đọc được", r.stderr)

    def test_mutant_without_c_locale_dies(self) -> None:
        """Đột biến bỏ `LC_ALL=C` trên bản sao script → ca trên đỏ (formatter bị dừng)."""
        script = self.tmp / "scripts" / "dev-task.sh"
        text = script.read_text(encoding="utf-8")
        self.assertEqual(text.count("LC_ALL=C find"), 1)
        script.write_text(text.replace("LC_ALL=C find", "find"), encoding="utf-8")
        r = self.run_localized()
        self.assertNotEqual(r.returncode, 0, r.stderr)
        self.assertFalse((self.tmp / "format-ran").exists())
        self.assertIn("Keine Berechtigung", r.stderr)


class LoopStopStoppedSymlinkTest(TmpDirCase):
    """AUD-HAR-423: vòng ĐÃ dừng (`active: false`) mà `.autopilot` là symlink — `loop stop` báo "đã tắt sẵn" (exit 0),
    không báo "vòng vẫn bật", không khoá/ghi gì qua liên kết. Vòng còn bật vẫn từ chối (AUD-HAR-415)."""

    def setUp(self) -> None:
        super().setUp()
        (self.tmp / "docs" / "autopilot").mkdir(parents=True)
        (self.tmp / "docs" / "autopilot" / "PLAN.md").write_text("- [ ] `T-001` việc — Gate: `true`\n", "utf-8")
        self.enterContext(unittest.mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(self.tmp)}))
        self.assertEqual(run_main("loop", "init")[0], 0)
        self.assertEqual(run_main("loop", "stop", "--reason", "xong")[0], 0)
        self.real = Path(self.enterContext(tempfile.TemporaryDirectory())).resolve() / "ap"
        (self.tmp / ".autopilot").rename(self.real)
        (self.tmp / ".autopilot").symlink_to(self.real)
        self.before = sorted(p.name for p in self.real.iterdir())
        self.state = (self.real / "state.json").read_text(encoding="utf-8")

    def test_stopped_loop_reports_already_off(self) -> None:
        rc, out, err = run_main("loop", "stop", "--reason", "lần hai")
        self.assertEqual(rc, 0, err)
        self.assertIn("đã tắt sẵn", out)
        self.assertNotIn("vòng vẫn bật", out + err)
        self.assertEqual(sorted(p.name for p in self.real.iterdir()), self.before)
        self.assertEqual((self.real / "state.json").read_text(encoding="utf-8"), self.state)

    def test_active_loop_still_refused(self) -> None:
        st = json.loads(self.state)
        (self.real / "state.json").write_text(json.dumps({**st, "active": True}), encoding="utf-8")
        rc, out, err = run_main("loop", "stop", "--reason", "thoát")
        self.assertEqual((rc, out), (2, ""), err)
        self.assertIn("vòng vẫn bật", err)

    def test_no_state_behind_symlink(self) -> None:
        (self.real / "state.json").unlink()
        rc, out, _ = run_main("loop", "stop", "--reason", "r")
        self.assertEqual((rc, out.strip()), (0, "■ Autopilot tắt."))
        self.assertFalse((self.real / "state.json").exists())


class StopSymlinkVerifyTest(TmpDirCase):
    """AUD-TEST-113: mọi task xong (có bằng chứng) nhưng thiếu `loop verify --all` → verdict `verify`; `.autopilot` là symlink
    → lượt Stop đầu chặn (lý do nhắc `loop verify --all` và liên kết), lượt `stop_hook_active` nhận `systemMessage` cho
    người; không ghi qua liên kết. Ghim `"verify"` trong điều kiện vào `_stop_symlink` của `hook_stop`."""

    def setUp(self) -> None:
        super().setUp()
        git(self.tmp, "init", "-q", "-b", "main")
        (self.tmp / ".gitignore").write_text(".autopilot/\n.autopilot\n", encoding="utf-8")
        (self.tmp / "docs" / "autopilot").mkdir(parents=True)
        (self.tmp / "docs" / "autopilot" / "PLAN.md").write_text("- [ ] `T-001` việc — Gate: `true`\n", "utf-8")
        self.enterContext(
            unittest.mock.patch.dict(
                os.environ, {"CLAUDE_PROJECT_DIR": str(self.tmp), "CLAUDE_CODE_SESSION_ID": SESSION}
            )
        )
        git(self.tmp, "add", "-A")
        git(self.tmp, "commit", "-q", "-m", "init")
        self.assertEqual(run_main("loop", "init")[0], 0)
        rc, out, err = run_main("loop", "record", "--task", "T-001", "--", "true")
        self.assertEqual(rc, 0, out + err)
        git(self.tmp, "commit", "-q", "-am", "tick")
        self.assertEqual(xt.loop_verdict(self.tmp)["verdict"], "done")
        self.assertIn("loop verify --all", xt.final_check(self.tmp) or "")
        self.real = Path(self.enterContext(tempfile.TemporaryDirectory())).resolve() / "ap"
        (self.tmp / ".autopilot").rename(self.real)
        (self.tmp / ".autopilot").symlink_to(self.real)
        self.before = sorted(p.name for p in self.real.iterdir())
        self.state = (self.real / "state.json").read_text(encoding="utf-8")

    def stop(self, **extra: object) -> dict[str, object]:
        rc, out, err = run_main("loop", "hook-stop", stdin=json.dumps({"session_id": SESSION, **extra}))
        self.assertEqual((rc, err), (0, ""))
        return dict(json.loads(out or "{}"))

    def test_verify_pending_blocks_then_hands_to_human(self) -> None:
        first = self.stop(stop_hook_active=False)
        self.assertEqual(first.get("decision"), "block")
        self.assertIn("loop verify --all", str(first["reason"]))
        self.assertIn("`.autopilot` là symlink", str(first["reason"]))
        again = self.stop(stop_hook_active=True)
        self.assertNotIn("decision", again)
        self.assertIn("NGƯỜI thay liên kết bằng thư mục thật", str(again["systemMessage"]))
        self.assertEqual(sorted(p.name for p in self.real.iterdir()), self.before)
        self.assertEqual((self.real / "state.json").read_text(encoding="utf-8"), self.state)


class _NoNetworkCase(unittest.TestCase):
    """Chạy một module test với shim `gh` lỗi đầu PATH (ghi log mỗi lời gọi) → module xanh và 0 lời gọi `gh`."""

    def assert_no_gh(self, module: str) -> None:
        with tempfile.TemporaryDirectory() as td:
            shim, log = Path(td) / "gh", Path(td) / "gh.log"
            shim.write_text('#!/bin/sh\necho "$*" >> "$GH_SHIM_LOG"\nexit 1\n', encoding="utf-8")
            shim.chmod(0o755)
            env = {**os.environ, "PATH": f"{td}{os.pathsep}{os.environ.get('PATH', '')}", "GH_SHIM_LOG": str(log)}
            r = subprocess.run(
                [sys.executable, "-m", "unittest", module],
                cwd=ROOT,
                env=env,
                capture_output=True,
                text=True,
                timeout=600,
                check=False,
            )
            self.assertEqual(r.returncode, 0, r.stderr[-2000:])
            self.assertFalse(log.exists(), log.read_text(encoding="utf-8") if log.exists() else "")


class GreenShellNoNetworkTest(_NoNetworkCase):
    """AUD-TEST-112: `tests.test_green_shell` (cùng lớp AUD-TEST-109) không gọi `gh` thật qua `guard.merge_check`."""

    def test_no_gh_calls(self) -> None:
        self.assert_no_gh("tests.test_green_shell")


class MergeNoNetworkTest(_NoNetworkCase):
    """AUD-TEST-115: `tests.test_merge` không đọc PLAN qua `gh api …/contents/…` thật."""

    def test_no_gh_calls(self) -> None:
        self.assert_no_gh("tests.test_merge")


if __name__ == "__main__":
    unittest.main()
