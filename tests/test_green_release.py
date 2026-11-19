"""Trả nợ review 🟢 nhóm `release-sign`/`release-check`/`stage` (T-3919, ADR-0080): mỗi lớp ghim một ID ở sổ audit."""

import json
import os
import subprocess
import sys
import unittest
import unittest.mock
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import xt
from test_release_contract import ReleaseCase  # lớp nền không có test (không chạy lại test của file gốc)
from test_release_signoff import GO_DOC, SignoffRepo, rc, sign_doc
from test_stage import human_env
from test_xt_cli import TmpRepoCase, run_main

NOTE = "máy đạt: release-check GO"


class SignNewlineTest(SignoffRepo):
    """AUD-HAR-343: `release-sign` ghi nguyên tử (`write_atomic`, giữ quyền tệp) và giữ kiểu xuống dòng của tệp — CRLF
    không bị viết lại thành LF, kể cả khi hoàn tác; tệp lẫn kiểu xuống dòng → từ chối, không ghi."""

    def test_crlf_kept_on_sign_and_mode_kept(self):
        self.doc.write_bytes(GO_DOC.replace("\n", "\r\n").encode())
        self.doc.chmod(0o664)
        xt.release_sign(self.repo, "", NOTE, rc())
        raw = self.doc.read_bytes()
        self.assertIn(b"| agent | GO |", raw)
        self.assertEqual(raw.count(b"\n"), raw.count(b"\r\n"))
        self.assertEqual(self.doc.stat().st_mode & 0o777, 0o664)

    def test_crlf_revert_restores_every_byte(self):
        fenced = GO_DOC.replace("| Vai trò |", "```\n| Vai trò |")
        fenced = fenced.replace("| Chủ repo | | GO / NO-GO | |\n\n", "| Chủ repo | | GO / NO-GO | |\n```\n\n")
        original = fenced.replace("\n", "\r\n").encode()
        self.doc.write_bytes(original)
        with unittest.mock.patch.object(
            xt, "_sign_insert", side_effect=lambda t, r, n: t.replace("```\n\n", r + "\n```\n\n" + n, 1)
        ):
            with self.assertRaises(xt.ReleaseSignError) as ctx:
                xt.release_sign(self.repo, "", NOTE, rc())
        self.assertIn("đã hoàn tác", str(ctx.exception))
        self.assertEqual(self.doc.read_bytes(), original)

    def test_mixed_newlines_refused_untouched(self):
        for raw in (GO_DOC.replace("\n", "\r\n", 1), GO_DOC.replace("\n", "\r", 1)):
            with self.subTest(raw=raw[:60]):
                self.doc.write_bytes(raw.encode())
                with self.assertRaises(xt.ReleaseSignError) as ctx:
                    xt.release_sign(self.repo, "", NOTE, rc())
                self.assertIn("xuống dòng lẫn kiểu", str(ctx.exception))
                self.assertEqual(self.doc.read_bytes(), raw.encode())

    def test_unreadable_raw_refused(self):
        with self.assertRaises(xt.ReleaseSignError) as ctx:
            xt._sign_raw(self.tmp / "vắng.md", "vắng.md")
        self.assertIn("không đọc được vắng.md", str(ctx.exception))


class SignRefusalHintTest(unittest.TestCase):
    """AUD-HAR-346: thông điệp từ chối do lời từ chối trong lịch sử chỉ đủ cách gỡ — dòng GO người ở GO-NO-GO cùng hay
    cao hơn phiên bản, commit sau và ĐẨY lên `origin`."""

    def test_message_names_origin_and_version(self):
        remote = xt.GoRemote(["abc GO-NO-GO-v1.0.0.md:7 `| A | An | NO-GO | 2026-11-09 |`"], xt.RELEASE_AGENT_NAME)
        with unittest.mock.patch.object(xt, "_go_remote_scan", return_value=remote):
            with self.assertRaises(xt.ReleaseSignError) as ctx:
                xt._sign_remote_check(Path("."))
        msg = str(ctx.exception)
        for part in ("ĐẨY lên `origin`", "cùng hoặc cao hơn phiên bản", "commit SAU lời từ chối", "tên + ngày"):
            self.assertIn(part, msg)


class BlankNameRefusalTest(unittest.TestCase):
    """AUD-HAR-345: ở bảng ký §5, ô tên trống + quyết định phi chuẩn (`Hold`, `Chưa duyệt`, `?`) là lời từ chối; ô mẫu
    chưa chọn (`GO / NO-GO`, kể cả kèm ghi chú như lịch sử repo khung) và bảng ngoài §5 thì không."""

    def kinds(self, text):
        lines = text.split("\n")
        return {lines[i]: kind for i, _, kind in xt._go_decision_rows(lines)}

    def test_blank_name_rows(self):
        refusals = ("| Chủ repo | | Hold | |", "| Kỹ thuật | | Chưa duyệt | |", "| Bảo mật | | ? | 2026-11-09 |")
        template = ("| Chủ repo | | GO / NO-GO | |", "| Chủ repo | | **GO / NO-GO**; D-126: giữ tự host | |")
        other = ("| Kỹ thuật | | | |", "| Bảo mật | — | Hold | |")
        before = "## 4. Kết luận\n\n| Mục | Tên | Quyết định |\n|---|---|---|\n| x | | Hold |\n\n"
        kinds = self.kinds(sign_doc(*refusals, *template, *other, before=before))
        self.assertEqual({row: kinds.get(row) for row in refusals}, dict.fromkeys(refusals, "no"))
        for row in (*template, *other, "| x | | Hold |"):
            self.assertNotIn(row, kinds)

    def test_framework_history_gains_no_refusal(self):
        """Mẫu GO-NO-GO của khung không tự tạo lời từ chối theo luật mới."""
        tpl = (ROOT / "framework/templates/GO-NO-GO.md").read_text(encoding="utf-8")
        self.assertEqual(self.kinds(tpl), {})


def _git_in(cwd: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(cwd), *args], capture_output=True, text=True, check=True).stdout


class WorktreeListingTest(SignoffRepo):
    """AUD-HAR-372: mục `git worktree list` không khớp thư mục thật (tên có CR — đọc dạng text thành LF; worktree bị
    `mv` tay) không được bỏ qua im lặng: `release-sign` và hàng `verify` từ chối, nêu cách gỡ."""

    def defer_in(self, wt: Path) -> None:
        (wt / ".autopilot").mkdir()
        (wt / ".autopilot/state.json").write_text('{"deferred": {"T-7": {"reason": "khoá thật"}}}', "utf-8")

    def assert_refused(self) -> None:
        with self.assertRaises(xt.ReleaseSignError) as ctx:
            xt._sign_scope_check(self.repo)
        self.assertIn("không liệt kê được worktree", str(ctx.exception))
        self.assertIn("git worktree prune", str(ctx.exception))
        row = xt._release_verify(self.repo)
        self.assertEqual(row["result"], "FAIL", row)
        self.assertIn("git worktree prune", row["evidence"])

    def test_carriage_return_in_worktree_name(self):
        wt = self.tmp / "w\rt"
        self.git("worktree", "add", "-q", "--detach", str(wt))
        self.defer_in(wt)
        self.assert_refused()

    def test_worktree_moved_by_hand(self):
        wt = self.tmp / "wt"
        self.git("worktree", "add", "-q", "--detach", str(wt))
        self.defer_in(wt)
        wt.rename(self.tmp / "wt-moved")
        self.assert_refused()


class SignHintsTest(SignoffRepo):
    """AUD-HAR-373: thông điệp chỉ chỗ gỡ — việc chờ kèm đường `state.json` của worktree chứa nó và lệnh gỡ."""

    def test_deferred_names_ledger(self):
        self.state.write_text('{"deferred": {"T-9": {"reason": "tiền thật"}}}', encoding="utf-8")
        with self.assertRaises(xt.ReleaseSignError) as ctx:
            xt._sign_scope_check(self.repo)
        msg = str(ctx.exception)
        self.assertIn(f"T-9 ({self.state.resolve()})", msg)
        self.assertIn("loop resolve --task", msg)


class TreeRowTest(ReleaseCase):
    """Hàng `tree` của `release-check`: AUD-HAR-335 (nêu tệp + cờ index), AUD-HAR-337 (nêu lệnh git hỏng), AUD-HAR-373
    (gợi ý lệnh status máy dùng), AUD-HAR-374 (fsmonitor nói dối, `GIT_WORK_TREE` lạ, sửa cùng kích thước trả mtime)."""

    def setUp(self):
        super().setUp()
        self.app = self.repo / "app.py"
        self.app.write_text("print(1)\n", encoding="utf-8")
        self.setup_xt()

    def tree(self) -> dict:
        return xt._release_tree(self.repo)[0]

    def assert_dirty(self) -> None:
        self.assertEqual(self.git("status", "--porcelain"), "")  # git thường không thấy
        row = self.tree()
        self.assertEqual(row["result"], "FAIL", row)
        self.assertIn("app.py", row["evidence"])

    def test_index_flags_name_file_and_tag(self):
        for flag, tag in (("assume-unchanged", "h app.py"), ("skip-worktree", "S app.py")):
            with self.subTest(flag=flag):
                self.git("update-index", f"--{flag}", "app.py")
                try:  # AUD-TEST-111: subTest đỏ vẫn gỡ cờ, không để lại cho subTest sau
                    row = self.tree()
                    self.assertEqual(row["result"], "FAIL", row)
                    self.assertIn(
                        f"1 tệp assume-unchanged (chữ thường) hoặc skip-worktree (`S`): {tag} —", row["evidence"]
                    )
                finally:
                    self.git("update-index", f"--no-{flag}", "app.py")

    def test_failed_git_command_named(self):
        row, head, readable = xt._release_tree(self.tmp)
        self.assertEqual((row["result"], head, readable), ("FAIL", None, False))
        self.assertIn("`git rev-parse` lỗi (exit 128)", row["evidence"])
        self.assertNotIn("cây làm việc", row["evidence"])

    def test_dirty_hint_names_pinned_status(self):
        self.app.write_text("print(2)\n", encoding="utf-8")
        self.assertIn("--ignore-submodules=none", self.tree()["evidence"])

    def test_lying_fsmonitor_hook(self):
        hook = self.tmp / "fsmonitor.sh"
        hook.write_text("#!/bin/sh\nprintf 'tok\\0'\n", encoding="utf-8")
        hook.chmod(0o755)
        self.git("config", "core.fsmonitor", str(hook))
        self.git("update-index", "--fsmonitor")
        self.git("update-index", "--fsmonitor-valid", "app.py")
        self.app.write_text("print(3)\n", encoding="utf-8")
        self.assert_dirty()

    def test_git_work_tree_env_pointing_at_clean_clone(self):
        clean = self.tmp / "clean"
        subprocess.run(["git", "clone", "-q", str(self.repo), str(clean)], check=True, capture_output=True)
        self.app.write_text("print(4)\n", encoding="utf-8")
        with unittest.mock.patch.dict(os.environ, {"GIT_WORK_TREE": str(clean)}):
            self.assertEqual(_git_in(self.repo, "status", "--porcelain"), "")
            row = self.tree()
        self.assertEqual(row["result"], "FAIL", row)

    def test_same_size_edit_with_restored_mtime(self):
        self.git("config", "core.trustctime", "false")
        old = (1577836800, 1577836800)  # 2020-01-01: cũ hơn index → không "racy"
        os.utime(self.app, old)
        self.git("update-index", "--refresh")
        self.app.write_text("print(5)\n", encoding="utf-8")
        os.utime(self.app, old)
        self.assert_dirty()

    def test_fresh_index_read_error_fails_closed(self):
        real = xt._git

        def fails(cwd, *args, **kw):
            if args[0] == "read-tree":
                return subprocess.CompletedProcess(args, 128, "", "fatal: hỏng")
            return real(cwd, *args, **kw)

        with unittest.mock.patch.object(xt, "_git", side_effect=fails):
            row = self.tree()
        self.assertEqual(row["result"], "FAIL", row)
        self.assertIn("`git read-tree` lỗi", row["evidence"])


class TreeCrossCheckTest(ReleaseCase):
    """AUD-HAR-338: hàng `tree` PASS mà vân tay (`tree_hash`) thấy diff/tệp chưa track — cây đổi giữa các lần đọc git
    (TOCTOU) — thì hàng `tree` FAIL, không chứng nhận."""

    def test_dirty_fingerprint_after_clean_status_fails(self):
        self.setup_xt()
        rc0, d = self.release()
        self.assertEqual(self.by_id(d)["tree"]["result"], "PASS")
        real = xt.tree_hash
        with unittest.mock.patch.object(xt, "tree_hash", side_effect=lambda *a, **k: (real(*a, **k)[0], True)):
            rc1, d = self.release()
        tree = self.by_id(d)["tree"]
        self.assertEqual((rc1, tree["result"]), (1, "FAIL"), tree)
        self.assertIn("cây đổi giữa các lần đọc git", tree["evidence"])
        self.assertIsNone(d["subject"]["content"])
        self.assertEqual(rc0, 0)


class StageHiddenIndexTest(TmpRepoCase):
    """AUD-HAR-336: `stage submit` không trình bản có tệp assume-unchanged/skip-worktree đã sửa (`git status` rỗng) —
    cùng luật hàng `tree` của `release-check`."""

    def setUp(self):  # như `test_stage.StageCliTest` (không kế thừa để không chạy lại test của lớp đó)
        super().setUp()
        self.init_repo()
        self.enterContext(human_env(CLAUDE_PROJECT_DIR=str(self.repo)))
        (self.repo / "f.txt").write_text("khởi tạo\n", encoding="utf-8")
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "khởi tạo")

    def stage(self, *args, agent=False):
        with unittest.mock.patch.dict(os.environ, {"CLAUDE_CODE_SESSION_ID": "s-1"} if agent else {}):
            return run_main("stage", *args)

    def test_flagged_file_refused(self):
        self.stage("init")
        f = self.repo / "f.txt"
        for flag, tag in (("assume-unchanged", "h f.txt"), ("skip-worktree", "S f.txt")):
            with self.subTest(flag=flag):
                self.git("update-index", f"--{flag}", "f.txt")
                try:  # AUD-TEST-111: subTest đỏ vẫn gỡ cờ và trả tệp, không để lại cho subTest sau
                    f.write_text("sửa lén\n", encoding="utf-8")
                    self.assertEqual(self.git("status", "--porcelain", "--", "f.txt"), "")
                    rc, _, err = self.stage("submit", "--evidence", "x", agent=True)
                    self.assertEqual(rc, 2)
                    self.assertIn(
                        f"assume-unchanged/skip-worktree hoặc không đọc được (`git ls-files -v` exit 0: {tag})", err
                    )
                finally:
                    self.git("update-index", f"--no-{flag}", "f.txt")
                    self.git("checkout", "--", "f.txt")

    def test_unreadable_index_listing_refused(self):
        self.stage("init")
        real = subprocess.run

        def broken(cmd, *a, **k):
            if cmd[:2] == ["git", "ls-files"]:
                return subprocess.CompletedProcess(cmd, 128, "", "fatal")
            return real(cmd, *a, **k)

        with unittest.mock.patch.object(xt.subprocess, "run", side_effect=broken):
            rc, _, err = self.stage("submit", "--evidence", "x", agent=True)
        self.assertEqual(rc, 2)
        self.assertIn("`git ls-files -v` exit 128)", err)


class VerifyRedWinsTest(ReleaseCase):
    """AUD-HAR-402: bản ghi `loop verify` ĐỎ trên đúng vân tay cây đang kiểm ở sổ nào cũng thắng bản xanh ở sổ khác;
    AUD-HAR-403: không tính được vân tay (worktree `--orphan`) → FAIL, máy không có `git` → FAIL có hàng."""

    def setUp(self):  # như `ReleaseVerifyWorktreeTest` (không kế thừa để không chạy lại test của lớp đó)
        super().setUp()
        plan = self.repo / "docs/autopilot/PLAN.md"
        plan.parent.mkdir(parents=True)
        plan.write_text("- [ ] `T-001` a — Gate: `true`\n", encoding="utf-8")
        (self.repo / ".git/info/exclude").write_text(".autopilot/\n", encoding="utf-8")
        self.setup_xt()
        self.assertEqual(run_main("loop", "init", "--plan", "docs/autopilot/PLAN.md")[0], 0)
        self.wt = self.tmp / "wt"
        self.git("worktree", "add", "-q", "--detach", str(self.wt))

    def verify_from(self, root: Path) -> dict:
        with unittest.mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(root)}):
            return self.by_id(self.release()[1])["verify"]

    def ledger_in(self, root: Path, verified: dict) -> None:
        d = root / ".autopilot"
        d.mkdir(exist_ok=True)
        (d / "state.json").write_text('{"active": false}', encoding="utf-8")
        (d / xt.VERIFIED_FILE).write_text(json.dumps(verified), encoding="utf-8")

    def green(self) -> dict:
        self.assertEqual(run_main("loop", "verify", "--all")[0], 0)
        return json.loads((self.repo / ".autopilot" / xt.VERIFIED_FILE).read_text(encoding="utf-8"))

    def test_red_elsewhere_beats_green(self):
        rec = self.green()
        red = {**rec, "ok": False}
        third = self.tmp / "wt3"
        self.git("worktree", "add", "-q", "--detach", str(third))
        self.ledger_in(self.wt, rec)  # worktree khác xanh trên cùng vân tay
        (self.repo / ".autopilot" / xt.VERIFIED_FILE).write_text(json.dumps(red), encoding="utf-8")
        row = self.verify_from(third)  # worktree thứ ba không sổ
        self.assertEqual(row["result"], "FAIL", row)
        self.assertIn(f"ĐỎ trên đúng cây này ở {self.repo.resolve()}", row["evidence"])
        row = self.verify_from(self.wt)  # sổ của chính nó xanh, sổ khác đỏ cùng vân tay
        self.assertEqual(row["result"], "FAIL", row)
        self.assertIn("AUD-HAR-402", row["evidence"])
        (self.repo / ".autopilot" / xt.VERIFIED_FILE).write_text(json.dumps({**red, "fingerprint": "0"}), "utf-8")
        self.assertEqual(self.verify_from(third)["result"], "PASS")  # đỏ trên cây khác không tính

    def test_orphan_worktree_without_fingerprint_fails(self):
        self.green()
        orphan = self.tmp / "orphan"
        self.git("worktree", "add", "-q", "--orphan", str(orphan))
        row = self.verify_from(orphan)
        self.assertEqual(row["result"], "FAIL", row)
        self.assertIn("không tính được dấu vân tay", row["evidence"])

    def test_no_git_binary_fails_with_row(self):
        with unittest.mock.patch.object(xt, "_git", side_effect=FileNotFoundError("git")):
            row = xt._release_verify(self.repo)
            self.assertIsNone(xt.worktree_state_files(self.repo))
        self.assertEqual(row["result"], "FAIL", row)
        self.assertIn("không liệt kê được worktree", row["evidence"])


class RepoPlanTaskIdsUniqueTest(unittest.TestCase):
    """AUD-HAR-384: ID task `T-NNNN` duy nhất trên mọi PLAN đang mở và kho lưu trữ — hai phiên cấp cùng số ở hai PLAN
    thì CI đỏ. Các cặp trùng có từ trước khi có hàng rào giữ nguyên (ID ổn định, không đánh số lại) và phải còn trùng
    đúng như ghi — không thêm cặp mới."""

    KNOWN = {
        **dict.fromkeys(
            ("T-3633", "T-3634", "T-3635", "T-3636", "T-3637"),
            ("PLAN-harden-2026-11-01.md", "PLAN-upgrade-2026-11-02.md"),
        ),
        **dict.fromkeys(("T-3101", "T-3102", "T-3103"), ("PLAN-3.22-adr0045-rest.md", "PLAN-3.23.0-complete.md")),
    }

    def test_task_ids_unique_across_plans(self):
        plans = [*(ROOT / "docs/autopilot").glob("PLAN*.md"), *(ROOT / xt.PLAN_ARCHIVE_DIR).glob("PLAN*.md")]
        self.assertTrue(plans)
        seen = defaultdict(list)
        for plan in plans:
            for t in xt.parse_plan(plan):
                seen[t["id"]].append(plan.name)
        dup = {tid: tuple(sorted(names)) for tid, names in seen.items() if len(names) > 1}
        self.assertEqual(dup, self.KNOWN)


if __name__ == "__main__":
    unittest.main()
