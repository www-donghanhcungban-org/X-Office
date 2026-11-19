"""T-3925 (ADR-0080, audit delta cổng ký): các lỗ 🟠/🟢 của guard — ghi dòng quyết chạy thật vào sổ quyết định
(AUD-SEC-804/808), autocorrect của git không tin PATH (AUD-SEC-805), `gh api` ghi nhánh mờ (AUD-SEC-806), lệnh git chạy
lệnh lồng còn thiếu (AUD-SEC-807), cắt chuỗi của biến đã gán (AUD-SEC-811).

Mỗi ID: mẫu tái hiện phải bị chặn và ca lành gần nhất vẫn chạy."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import unittest
import unittest.mock as mock
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("XT_GUARD_PHASE", "harden")
sys.path.insert(0, str(ROOT / ".claude" / "hooks"))
sys.path.insert(0, str(Path(__file__).resolve().parent))  # tests/git_fixture.py
import guard
from git_fixture import default_exec_path_fixed

PHRASE = "Khi chạy thật đã quy" + "ết"  # dựng cụm: lệnh của phiên này không mang nguyên cụm
LEDGER = "docs/autopilot/DECISIONS.md"
BASE = "# Nhật ký\n\n### D-099\n\n- Khi chạy thật (đề xuất, chủ dự án quyết ở G7): bật\n\n### D-100\n\n"
# Mục BASE-REPO-005 của `blueprint-status` (job `checks`): `s` gán từ `read` rồi tự cắt — không được BUDGET (CI #632)
CI_TITLE_LOOP = (
    "git log --format='%H%x09%an%x09%s' v3.20.0..origin/main | while IFS=$'\\t' read -r h a s; do case \"$a\" in"
    ' *\'[bot]\') continue ;; esac; s="${s% (#[0-9]*)}"; python3 scripts/xt.py pr title-check -- "$s" >/dev/null'
    ' || { echo "✗ $h: $s" >&2; exit 1; }; done'
)
AUTOCORRECT_ON = {"GIT_CONFIG_PARAMETERS": "'help.autocorrect'='1'"}


def decide(cmd: str, env: dict | None = None) -> dict:
    # Nhánh hiện tại ghim về `feat` như `tests/test_guard_strict.py`: quyết định không phụ thuộc nhánh checkout
    with (
        mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(ROOT), "XT_GUARD_POLICY": "", **(env or {})}),
        mock.patch.object(guard, "_current_branch", return_value="feat"),
    ):
        return guard.apply_policy(guard.bash_decision(cmd, str(ROOT), str(ROOT)))


class AuditOrangeCase(unittest.TestCase):
    env: dict | None = None

    def assert_denied(self, cases: dict) -> None:
        for cmd, code in cases.items():
            with self.subTest(cmd=cmd):
                d = decide(cmd, self.env)
                self.assertEqual((d["decision"], d.get("code")), ("deny", code), d.get("reason"))

    def assert_allowed(self, cmds: tuple) -> None:
        for cmd in cmds:
            with self.subTest(cmd=cmd):
                d = decide(cmd, self.env)
                self.assertNotEqual(d["decision"], "deny", d.get("reason"))


class ProdDecidedEditTest(unittest.TestCase):
    """AUD-SEC-804: Edit/MultiEdit/Write vào `DECISIONS*.md` (mọi hoa/thường, qua symlink) xét tệp SAU lần ghi."""

    def setUp(self):
        self.root = Path(self.enterContext(tempfile.TemporaryDirectory()))
        (self.root / "docs/autopilot").mkdir(parents=True)

    def edit(self, name: str, disk: str | None, tool_input: dict) -> str:
        path = self.root / "docs/autopilot" / name
        if disk is not None:
            path.write_text(disk, encoding="utf-8")
        return guard.edit_decision(str(path), str(self.root), {"file_path": str(path), **tool_input})[0]

    def test_composed_edits_denied(self):
        near = BASE + "- Khi chạy thật đã quyếZ (D-099): ok\n"
        line = f"- {PHRASE} (D-099): ok\n"
        cases = {
            "sửa một chữ": ("DECISIONS.md", near, {"old_string": "quyếZ", "new_string": "quyết"}),
            "MultiEdit hai bước": (
                "DECISIONS.md",
                BASE,
                {
                    "edits": [
                        {"old_string": "### D-100\n", "new_string": "### D-100\nquyếZ\n"},
                        {"old_string": "quyếZ", "new_string": line.strip()},
                    ]
                },
            ),  # fmt: skip
            "tên chữ thường Write": ("decisions.md", BASE, {"content": BASE + line}),
            "tên chữ thường Edit": (
                "decisions.md",
                BASE,
                {"old_string": "### D-100\n", "new_string": "### D-100\n" + line},
            ),
            "bản tháng": ("Decisions-2026-11.md", BASE, {"content": BASE + line}),
            "lộ khỏi chú thích": (
                "DECISIONS.md",
                BASE + "<!--\n" + line + "-->\n",
                {"old_string": "<!--\n", "new_string": ""},
            ),
            "đổi mục": (
                "DECISIONS.md",
                "### D-099\n" + line,
                {"old_string": "### D-099\n", "new_string": "### D-101\n"},
            ),
            "nháy cong dự phòng": (
                "DECISIONS.md",
                BASE + "- Khi chạy thật đã quyếZ (D-099): ‘ok’\n",
                {"old_string": "quyếZ (D-099): 'ok'", "new_string": "quyết (D-099): 'ok'"},
            ),
            "tạo tệp mới bằng Edit rỗng": ("DECISIONS.md", None, {"old_string": "", "new_string": BASE + line}),
            "NotebookEdit": ("DECISIONS.md", BASE, {"new_source": line}),
            "Edit không khớp đĩa mang cụm": ("DECISIONS.md", BASE, {"old_string": "không có", "new_string": line}),
        }
        for name, (file, disk, ti) in cases.items():
            with self.subTest(name):
                self.assertEqual(self.edit(file, disk, ti), "deny")

    def test_symlink_and_unreadable_denied(self):
        real = self.root / "docs/autopilot/DECISIONS.md"
        real.write_text(BASE, encoding="utf-8")
        link = self.root / "docs/autopilot/notes.md"
        link.symlink_to(real)
        ti = {"file_path": str(link), "content": BASE + f"- {PHRASE} (D-099): ok\n"}
        self.assertEqual(guard.edit_decision(str(link), str(self.root), ti)[0], "deny")
        real.write_bytes(b"\xff\xfe")
        self.assertEqual(self.edit("DECISIONS.md", None, {"content": BASE}), "deny")

    def test_plain_edits_allowed(self):
        line = f"- {PHRASE} (D-099): ok\n"
        cases = {
            "thêm dòng thường": ("DECISIONS.md", BASE, {"content": BASE + "- ghi chú\n"}),
            "sửa chữ khác": ("DECISIONS.md", BASE, {"old_string": "bật", "new_string": "tắt"}),
            "xoá dòng quyết": ("DECISIONS.md", BASE + line, {"old_string": line, "new_string": ""}),
            "giữ dòng quyết, sửa chỗ khác": (
                "DECISIONS.md",
                BASE + line,
                {"old_string": "# Nhật ký", "new_string": "# Sổ"},
            ),
            "không khớp đĩa, không cụm": ("DECISIONS.md", BASE, {"old_string": "không có", "new_string": "x"}),
            "tệp khác tên": ("NOTES.md", BASE, {"content": BASE + line}),
            "replace_all chữ khác": (
                "DECISIONS.md",
                BASE,
                {"old_string": "D-", "new_string": "D-", "replace_all": True},
            ),
        }
        for name, (file, disk, ti) in cases.items():
            with self.subTest(name):
                self.assertEqual(self.edit(file, disk, ti), "")

    def test_keys_unit(self):
        keys = guard._prod_decided_keys(BASE + f"- {PHRASE} (D-099): ok\n```\n- {PHRASE} (D-1): x\n```\n")
        self.assertIn(("shown", 100, f"- {PHRASE} (D-099): ok"), keys)
        self.assertIn(("raw", 100, f"- {PHRASE} (D-1): x"), keys)
        self.assertNotIn(("shown", 100, f"- {PHRASE} (D-1): x"), keys)
        self.assertIsNone(guard._prod_after("abc", {"old_string": "", "new_string": "x"}))


class ProdDecidedBashTest(AuditOrangeCase):
    """AUD-SEC-804 (Bash) và AUD-SEC-808 (lệnh chỉ đọc nhắc cụm cho qua)."""

    def test_ledger_writes_denied(self):
        self.assert_denied(
            {
                f"sed -i 's/quyếZ (D-100)/quyết (D-100)/' {LEDGER}": "BUDGET",
                f"printf -- '- Khi chạy thật đã quy%s (D-100): ok\\n' ết >> {LEDGER}": "BUDGET",
                "echo x >> docs/autopilot/decisions.md": "BUDGET",
                "tee -a docs/autopilot/DECISIONS-2026-11.md < /tmp/x": "BUDGET",
                f"cp /tmp/x {LEDGER}": "BUDGET",
                f"mv /tmp/x {LEDGER.lower()}": "BUDGET",
                f"ln {LEDGER} /tmp/n.md": "BUDGET",
                f"python3 -c \"open('{LEDGER}','a').write('x')\"": "BUDGET",
                f"sponge {LEDGER} < /tmp/x": "BUDGET",
                f"python3 scripts/xt.py loop decide --title t --choice a > {LEDGER}": "BUDGET",
                f"python3 other.py --context={LEDGER}": "BUDGET",
                f"rename s/x/y/ {LEDGER}": "BUDGET",
                f"git log -1 --format=%B --output={LEDGER}": "BUDGET",
                f"git show HEAD --outp {LEDGER.lower()}": "BUDGET",
                f"git checkout --theirs {LEDGER}": "BUDGET",
                # đối chứng đã chặn trước bản sửa (AUD-SEC-641)
                f"echo '- {PHRASE} (D-126): giữ' >> {LEDGER}": "BUDGET",
            }
        )

    def test_ledger_reads_and_loop_decide_allowed(self):
        self.assert_allowed(
            (
                "python3 scripts/xt.py loop decide --title t --context c --option a --option b --choice a --why w",
                f"python3 scripts/xt.py loop decide --title t --context={LEDGER} --option a --option b --choice a",
                f"cat {LEDGER}",
                f"grep -n D-100 {LEDGER}",
                f"git diff {LEDGER}",
                f"git add {LEDGER}",
                f"git log -p {LEDGER}",
                "rm docs/autopilot/DECISIONS-2026-10.md",
                f"touch {LEDGER}",
            )
        )

    def test_patch_touching_ledger_denied(self):
        tmp = Path(self.enterContext(tempfile.TemporaryDirectory()))
        diff = "--- a/{0}\n+++ b/{0}\n@@ -1,1 +1,2 @@\n # x\n+- ok\n"
        (tmp / "led.patch").write_text(diff.format(LEDGER.lower()), encoding="utf-8")
        (tmp / "other.patch").write_text(diff.format("docs/notes.md"), encoding="utf-8")
        self.assert_denied({f"git apply {tmp}/led.patch": "BUDGET", f"patch -p1 -i {tmp}/led.patch": "BUDGET"})
        self.assert_allowed((f"git apply {tmp}/other.patch", f"git apply --check {tmp}/led.patch"))

    def test_git_output_target(self):  # dùng chung với GO-NO-GO: `--output` là đích ghi
        self.assert_denied({"git log --output=docs/ops/GO-NO-GO.md": "GO_SIGN"})
        self.assert_allowed(("git log --output=/tmp/log.txt", "git log --output-indicator-new=+ -p"))
        self.assertEqual(guard._git_output_targets(["git", "diff", "--output"]), [])
        self.assertEqual(guard._git_output_targets(["cat", "--output=x"]), [])

    def test_phrase_readers_allowed(self):  # AUD-SEC-808
        self.assert_allowed(
            (
                f"git grep -n '{PHRASE}'",
                f"git log -S '{PHRASE}' --oneline",
                f"cd docs && grep -rn '{PHRASE}' .",
                f"grep -rn '{PHRASE}' docs | sed -n 1,5p",
                f"grep -n '{PHRASE}' {LEDGER}",
                # lệnh bọc/gán đầu lệnh/lệnh trơn đứng trước (bất biến fuzz `allow-kept`)
                f"XT_FUZZ=1 git grep -n '{PHRASE}'",
                f"command git grep -n '{PHRASE}'",
                f"true; git log -S '{PHRASE}'",
                f"true && cd docs && grep -rn '{PHRASE}' .",
                f"X='{PHRASE}'; echo ok",
            )
        )

    def test_phrase_writers_still_budget(self):  # AUD-SEC-808: đối chứng — miễn chỉ cho lệnh đọc
        self.assert_denied(
            {
                f"echo '- {PHRASE} (D-1): x' >> notes.md": "BUDGET",
                f"echo '- {PHRASE} (D-1): x' | tee notes.md": "BUDGET",
                f"git log -S '{PHRASE}' --output=notes.md": "BUDGET",
                f"git grep -nO '{PHRASE}'": "BUDGET",
                f"cd docs && python3 x.py '{PHRASE}'": "BUDGET",
                f"GIT_DIR=/tmp/r git log -S '{PHRASE}'": "BUDGET",
                f"git -C docs grep '{PHRASE}'": "BUDGET",
                f"git commit -m '{PHRASE}'": "BUDGET",
            }
        )


class AutocorrectExecPathTest(AuditOrangeCase):
    """AUD-SEC-805: lệnh con lạ + autocorrect — `git-<tên>` chỉ tin ở exec-path mặc định agent không đổi được."""

    def setUp(self):
        self.bin = Path(self.enterContext(tempfile.TemporaryDirectory()))
        tool = self.bin / "git-pusj"
        tool.write_text("#!/bin/sh\n", encoding="utf-8")
        tool.chmod(0o755)
        self.env = {**AUTOCORRECT_ON, "PATH": f"{self.bin}{os.pathsep}{os.environ.get('PATH', '')}"}
        guard._git_exec_path.cache_clear()
        self.addCleanup(guard._git_exec_path.cache_clear)

    def test_path_lookup_not_trusted(self):
        self.assert_denied(
            {
                "env -u PATH /usr/bin/git pusj --force origin main": "UNRESOLVED_TARGET",
                "unset PATH; /usr/bin/git pusj --force origin main": "UNRESOLVED_TARGET",
                "env -i /usr/bin/git pusj --force origin main": "UNRESOLVED_TARGET",
                f"rm -f {self.bin}/git-pusj; git pusj --force origin main": "UNRESOLVED_TARGET",
                f"ln -sf /nonexistent {self.bin}/git-pusj; git pusj --force origin main": "UNRESOLVED_TARGET",
                "git pusj --force origin main": "UNRESOLVED_TARGET",
                # đối chứng đã chặn trước bản sửa
                "git pusk --force origin main": "UNRESOLVED_TARGET",
            }
        )

    def test_trusted_exec_path_allowed(self):
        with (
            mock.patch.object(guard, "_git_exec_path", return_value=str(self.bin)),
            mock.patch.object(guard, "_agent_can_change", return_value=False),
        ):
            self.assert_allowed(("git pusj --force origin main",))
            with mock.patch.dict(os.environ, {"GIT_EXEC_PATH": "/nonexistent"}):  # biến gỡ được: cần có ở cả hai
                self.assert_denied({"git pusj --force origin main": "UNRESOLVED_TARGET"})
        with default_exec_path_fixed(guard):  # không phụ thuộc uid chạy test (root ghi được exec-path)
            self.assert_allowed(("git status", "git submodule status", "git push origin feat/x"))

    def test_changeable_exec_path_denied(self):
        with mock.patch.object(guard, "_git_exec_path", return_value=str(self.bin)):  # thư mục tạm: agent ghi được
            self.assert_denied({"git pusj --force origin main": "UNRESOLVED_TARGET"})

    def test_agent_can_change_unit(self):
        own = self.bin / "git-pusj"
        self.assertTrue(guard._agent_can_change(str(own)))
        self.assertTrue(guard._agent_can_change(str(self.bin / "missing" / "x")))
        self.assertFalse(guard._exec_trusted(str(self.bin / "missing")))
        with (
            mock.patch.object(guard.os, "access", return_value=False),
            mock.patch.object(guard.os, "geteuid", return_value=-1),
        ):
            self.assertFalse(guard._agent_can_change(str(own)))
        with mock.patch.object(guard, "_git_exec_path", return_value=""):
            self.assertFalse(guard._git_external("pusj"))


class GhApiVagueBranchTest(AuditOrangeCase):
    """AUD-SEC-806: `gh api` ghi nhánh mà guard không đọc chắc (`@tệp`, `{branch}`) tính như nhánh chính."""

    def test_vague_branch_denied(self):
        put = "gh api -X PUT repos/o/r/contents/a.txt -f message=m -f content=eA=="
        self.assert_denied(
            {
                f"{put} -F branch=@b.txt": "PUSH_MAIN",
                f"{put} -F branch={{branch}}": "PUSH_MAIN",
                f"{put} -f 'branch= @b.txt'": "PUSH_MAIN",
                "gh api -X PATCH repos/o/r/git/refs/heads/{branch} -f sha=abc": "PUSH_MAIN",
                "gh api -X POST repos/o/r/git/refs -f ref=refs/heads/{branch} -f sha=abc": "PUSH_MAIN",
                # đối chứng đã chặn trước bản sửa
                f"{put} -F branch=main": "PUSH_MAIN",
            }
        )

    def test_literal_feature_branch_allowed(self):
        self.assert_allowed(
            (
                "gh api -X PUT repos/o/r/contents/a.txt -f message=m -f content=eA== -F branch=feat",
                "gh api -X PATCH repos/o/r/git/refs/heads/feat -f sha=abc",
                "gh api repos/{owner}/{repo}/pulls",
            )
        )


class GitNestedRunMoreTest(AuditOrangeCase):
    """AUD-SEC-807: `fetch-pack --upload-pack/--exec`, `instaweb --httpd/-d`, `send-email --*-cmd`, `clone -c`."""

    def test_nested_run_denied(self):
        self.assert_denied(
            {
                "git fetch-pack --upload-pack='touch /tmp/p; git-upload-pack' . HEAD": "BUDGET",
                "git fetch-pack --exec='touch /tmp/p' . HEAD": "BUDGET",
                "git fetch-pack --upl='touch /tmp/p' . HEAD": "BUDGET",
                "git instaweb --httpd='touch /tmp/p'": "BUDGET",
                "git instaweb -d 'touch /tmp/p'": "BUDGET",
                "git send-email --sendmail-cmd='touch /tmp/p' x.patch": "BUDGET",
                "git send-email -sendmail-cmd='touch /tmp/p' x.patch": "BUDGET",
                "git send-email --to-cmd='touch /tmp/p' x.patch": "BUDGET",
                "git send-email --cc-cmd='touch /tmp/p' x.patch": "BUDGET",
                "git send-email --header-cmd='touch /tmp/p' x.patch": "BUDGET",
                "git clone -c core.sshCommand='touch /tmp/p' ssh://h/r": "HOOK_BYPASS",
                "git clone --config core.sshCommand='touch /tmp/p' ssh://h/r": "HOOK_BYPASS",
                "git clone --conf=core.sshCommand='touch /tmp/p' ssh://h/r": "HOOK_BYPASS",
                "git clone -qc core.sshCommand='touch /tmp/p' ssh://h/r": "HOOK_BYPASS",
                "git clone -ccore.sshCommand=x ssh://h/r": "HOOK_BYPASS",
                "git clone -c core.hooksPath=/tmp/h https://h/r": "HOOK_BYPASS",
                "git clone -c core.fsmonitor='touch /tmp/p' https://h/r": "HOOK_BYPASS",
                # đối chứng đã chặn trước bản sửa (AUD-SEC-636)
                "git clone --upload-pack='touch /tmp/p' /srv/r.git": "BUDGET",
            }
        )

    def test_plain_forms_allowed(self):
        self.assert_allowed(
            (
                "git fetch-pack . HEAD",
                "git clone -c core.autocrlf=false https://h/r",
                "git clone -c core.sshCommand=ssh https://h/r",
                "git clone -b main https://h/r",
                "git clone -o up https://h/r -- -c",
                "git instaweb --local",
                "git send-email --to=a@b x.patch",
                "git send-email --cc a@b x.patch",
            )
        )

    def test_filter_branch_filters_scanned(self):  # AUD-SEC-812: bộ lọc quét như `sh -c`
        self.assert_denied(
            {
                'git filter-branch --tree-filter "rm -rf ~" HEAD': "RULE_DENY",
                "git filter-branch --index-filter 'git push --force origin main' HEAD": "RULE_DENY",
                "git filter-branch --msg-filter 'git reset --hard; cat' HEAD": "RULE_DENY",
                "git filter-branch --env-filter='rm -rf ~' HEAD": "RULE_DENY",
                "git filter-branch --commit-filter 'rm -rf ~; git commit-tree \"$@\"' HEAD": "RULE_DENY",
                "git filter-branch --parent-filter 'rm -rf ~; cat' HEAD": "RULE_DENY",
                "git filter-branch --tag-name-filter 'rm -rf ~' HEAD": "RULE_DENY",
                "git filter-branch --setup 'rm -rf ~' --subdirectory-filter sub HEAD": "RULE_DENY",
                "git-filter-branch --msg-filter 'rm -rf ~' HEAD": "RULE_DENY",
                "git filter-branch --tree-filter 'eval $(cat x)' HEAD": "BUDGET",
                # đối chứng đã chặn trước bản sửa: filter-repo (cả `--*-callback`) chặn mọi dạng (D-407)
                "git filter-repo --commit-callback 'import os; os.system(\"x\")'": "REMOTE_DELETE",
            }
        )
        self.assert_allowed(
            (
                "git filter-branch --subdirectory-filter sub HEAD",
                "git filter-branch --msg-filter 'sed s/a/b/' HEAD",
                "git filter-branch --index-filter 'git rm --cached --ignore-unmatch x' HEAD",
                "git filter-branch --msg-filter cat -- HEAD -- --tree-filter",
            )
        )
        self.assertEqual(guard._filter_branch_scripts(["git", "log", "--msg-filter", "x"]), [])

    def test_program_path_and_template_denied(self):  # AUD-SEC-813
        self.assert_denied(
            {
                "git send-email --smtp-server=/usr/sbin/sendmail x.patch": "BUDGET",
                "git send-email --smtp-server ./evil x.patch": "BUDGET",
                "git send-email --smtp-server=~/bin/x x.patch": "BUDGET",
                "git send-email -smtp-server=/tmp/x x.patch": "BUDGET",
                "git clone --template=/tmp/t https://h/r": "BUDGET",
                "git clone --template /tmp/t https://h/r": "BUDGET",
                "git clone --templ=/tmp/t https://h/r": "BUDGET",
            }
        )
        self.assert_allowed(
            (
                "git send-email --smtp-server=smtp.example.com x.patch",
                "git send-email --smtp-server smtp.example.com --smtp-server-port 587 x.patch",
                "git send-email --smtp-server x.patch -- --smtp-server=/x",
            )
        )
        self.assertFalse(guard._git_run_path_value("send-email", ["--smtp-server"]))

    def test_clone_config_unit(self):
        self.assertEqual(guard._git_clone_config(["git", "clone", "-oc", "x=y", "u"]), [])  # `c` là giá trị của `-o`
        self.assertEqual(guard._git_clone_config(["git", "clone", "-c"]), [("", "")])
        self.assertEqual(guard._git_clone_config(["git", "fetch", "-c", "a=b"]), [])


class ParamSliceTest(AuditOrangeCase):
    """AUD-SEC-811 (mới): cắt chuỗi `${X:n}`/`${X#…}`/`${X%…}` của biến đã gán chữ tính ra giá trị."""

    def test_slices_of_known_values_denied(self):
        self.assert_denied(
            {
                "X=xx--hard; git reset ${X:2}": "RULE_DENY",
                "X=a--hard; git reset ${X#a}": "RULE_DENY",
                "X=--hardzz; git reset ${X%zz}": "RULE_DENY",
                "X=--hardzz; git reset ${X%%z*}": "RULE_DENY",
                "X=zz--hard; git reset ${X##*z}": "RULE_DENY",
                "X=xmain; git push origin ${X#x}": "PUSH_MAIN",
                "X=mainline; git push origin ${X:0:4}": "PUSH_MAIN",
                "X=/home; rm -rf ${X%/x}": "WIPE_OUTSIDE",
                "X=--hard; git reset ${X:N}": "BUDGET",
                'X=a--hard; git reset ${X#"a"}': "BUDGET",
                "X=--hard; git reset ${X#[ab]}": "RULE_DENY",  # T-3929 (AUD-SEC-835): lớp `[…]` tính được
            }
        )

    def test_benign_slices_allowed(self):
        self.assert_allowed(
            (
                "X=abc; echo ${X:1}",
                "f=a.tar.gz; echo ${f%%.*}",
                "echo ${UNSET_X:2}",
                "X=feat-x; git push origin ${X%-x}",
                'echo "${X:-default}"',
                # giá trị không biết (ADR-0067): gán từ `read`/`for`/thay lệnh — cắt chuỗi giữ nguyên, không BUDGET
                CI_TITLE_LOOP,
                'read -r s; s="${s% (#[0-9]*)}"; echo "$s"',
                's=$(cat f); echo "${s#*x}"',
                'for s in a b; do echo "${s#[ab]}"; done',
                "printf -v s %s x; echo ${s#$p}",
                "mapfile -t s < f; echo ${s%$p}",
            )
        )

    def test_dyn_assigned_unit(self):
        self.assertEqual(guard._dyn_assigned(["for", "s", "in", "a"]), ["s"])
        self.assertEqual(guard._dyn_assigned(["IFS=,", "read", "-r", "h", "a"]), ["h", "a"])
        self.assertEqual(guard._dyn_assigned(["printf", "-vs", "%s", "x"]), ["s", "x"])
        self.assertEqual(guard._dyn_assigned(["a=$(x)", "b=1"]), ["a"])
        self.assertEqual(guard._dyn_assigned(["echo", "x"]), [])
        env = {"s": "abc"}
        guard._taint(env, ["s"])
        self.assertEqual(guard._sub_case("${s:1}", env), "${s:1}")
        guard._taint(env, [])
        self.assertEqual(guard._sub_case("${t:1}", {**env, "t": "abc"}), "bc")

    def test_matches_bash(self):
        forms = ("${X:2}", "${X: -2}", "${X: -20}", "${X:1:-1}", "${X:20}", "${X:0:0}", "${X#*a}", "${X##*a}")
        forms += ("${X%a*}", "${X%%a*}", "${X#?}", "${X%}", "${X##*/}", "${X%/*}")
        for val in ("xx--hard", "abcazaz", "a/b/c", ""):
            for form in forms:
                with self.subTest(val=val, form=form):
                    sh = subprocess.run(
                        ["bash", "-c", f'X="$1"; printf %s "{form}"', "_", val], capture_output=True, text=True
                    )
                    self.assertEqual(sh.returncode, 0, sh.stderr)
                    self.assertEqual(guard._sub_case(form, {"X": val}), sh.stdout)

    def test_unsure_slice_raises(self):
        for form in ("${X:1+1}", "${X:1:-20}", "${X#$Y}", "${X%'a'}", "${X#@(a)}"):
            with self.subTest(form=form), self.assertRaises(guard.ScanTooComplex):
                guard._sub_case(form, {"X": "abcd"})
        self.assertEqual(guard._sub_case("${Y:2} ${X:-d}", {"X": "abcd"}), "${Y:2} ${X:-d}")


class ConcurrentDecisionTest(unittest.TestCase):
    """Quyết định song song (hook chạy nhiều phiên) ổn định: cùng lệnh → cùng mã."""

    def test_parallel_decisions_stable(self):
        cmds = [
            f"sed -i s/a/b/ {LEDGER}",
            "X=xx--hard; git reset ${X:2}",
            "gh api -X PATCH repos/o/r/git/refs/heads/{branch} -f sha=abc",
            "git fetch-pack --exec='touch /tmp/p' . HEAD",
            f"git grep -n '{PHRASE}'",
        ] * 4
        before = dict(os.environ)
        first = [decide(c).get("code") for c in cmds]
        # AUD-TEST-119: vá env/`_current_branch` MỘT lần ngoài luồng — `mock.patch.dict` vào/ra song song khôi phục
        # nhầm ảnh chụp, để lại `XT_GUARD_POLICY=""` cho module test chạy sau (hook con của test_hooks thừa kế env)
        with (
            mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(ROOT), "XT_GUARD_POLICY": ""}),
            mock.patch.object(guard, "_current_branch", return_value="feat"),
            ThreadPoolExecutor(max_workers=8) as pool,
        ):
            again = list(pool.map(lambda c: guard.apply_policy(guard.bash_decision(c, str(ROOT), str(ROOT))), cmds))
        self.assertEqual(first, [d.get("code") for d in again])
        self.assertEqual(dict(os.environ), before)

    def test_env_clean_for_hook_tests_in_same_process(self):
        """Ghim AUD-TEST-119: lớp này rồi test hook (subprocess thừa kế env) trong CÙNG tiến trình unittest vẫn xanh."""
        mods = ["tests.test_guard_audit_orange.ConcurrentDecisionTest.test_parallel_decisions_stable"]
        mods.append("tests.test_hooks.CommitGateForeignRepoTest")
        env = {k: v for k, v in os.environ.items() if k not in ("XT_GUARD_POLICY", "CLAUDE_PROJECT_DIR")}
        r = subprocess.run(
            [sys.executable, "-m", "unittest", *mods], cwd=ROOT, env=env, capture_output=True, text=True, timeout=600
        )
        self.assertEqual(r.returncode, 0, r.stderr[-2000:])


if __name__ == "__main__":
    unittest.main()
