"""T-3918 (PLAN-harden-2026-11-17 đợt 3, ADR-0080, D-415): nợ review 🟢 của phần đọc shell trong guard, cộng hai phát
hiện mới (N1 merge REST theo id repo, N2 `git credential` in token).

Mỗi ID một lớp: ca DENY (lỗ hổng bị chặn như dạng trơn tương ứng, hay đối chứng vẫn chặn) và ca ALLOW đối chứng (lệnh
lành gần nhất không bị chặn oan)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
import unittest.mock as mock
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

os.environ.setdefault("XT_GUARD_PHASE", "harden")
sys.path.insert(0, str(ROOT / ".claude" / "hooks"))
import guard

MERGE_OK = {"verdict": "merge", "hard": [], "head": "a" * 40, "eligible": True, "reasons": ["ok"]}


def decide(cmd: str, policy: str = "") -> dict:
    # Nhánh hiện tại ghim về `feat` như tests/test_guard_strict.py; `origin` = `me/repo`. `strict`: quyết định thô như
    # hook ở `XT_GUARD_POLICY=strict` (không qua chính sách mặc định). AUD-TEST-112: merge-check giả xanh như
    # tests/test_green_gh.py — không gọi `xt.py merge-check`/`gh` thật; quyết định không phụ thuộc mạng hay PR thật.
    with (
        mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(ROOT), "XT_GUARD_POLICY": policy}),
        mock.patch.object(guard, "_current_branch", return_value="feat"),
        mock.patch.object(guard, "_origin_repo", return_value="me/repo"),
        mock.patch.object(guard, "merge_check", return_value=MERGE_OK),
    ):
        raw = guard.bash_decision(cmd, str(ROOT), str(ROOT))
        return {**raw, "code": guard.decide(raw).code} if policy else guard.apply_policy(raw)


class _Case(unittest.TestCase):
    def assert_code(self, cmds: tuple, code: str, policy: str = "") -> None:
        for cmd in cmds:
            with self.subTest(cmd=cmd):
                result = decide(cmd, policy)
                self.assertEqual((result["decision"], result["code"]), ("deny", code), result["reason"])

    def assert_runs(self, cmds: tuple, policy: str = "") -> None:
        for cmd in cmds:
            with self.subTest(cmd=cmd):
                result = decide(cmd, policy)
                self.assertNotEqual(result["decision"], "deny", result["reason"])


class MergeByRepoIdTest(_Case):  # N1
    def test_deny(self):
        self.assert_code(
            (
                "gh api -X PUT repositories/123/pulls/5/merge -f sha=abc",
                "gh api --method PUT /repositories/123/pulls/5/merge",
                "gh api -X PUT repos/o/r/pulls/5/merge -f sha=abc",  # dạng trơn: cùng mã
            ),
            "UNVERIFIED",
        )
        self.assert_code(("gh api -X PUT repositories/1/pulls/5/merge -f sha=a -f commit_title=x",), "RULE_DENY")

    def test_allow(self):
        self.assert_runs(("gh api repositories/123/pulls/5/merge", "gh api repositories/123/pulls/5"))


class GitCredentialTest(_Case):  # N2
    def test_deny(self):
        self.assert_code(
            (
                "git credential fill",
                "git credential fill < req.txt",
                "git CREDENTIAL fill",
                "git credential-store get",
                "git credential-store --file=x get",
                "git credential-cache get",
                "git-credential-store get",
                "/usr/lib/git-core/git-credential-cache get",
            ),
            "RULE_DENY",
        )

    def test_allow(self):
        self.assert_runs(
            (
                "git credential approve",
                "git credential-cache exit",
                "git help credential",
                "git config credential.helper",
            )
        )


class RemoteNotOriginTest(_Case):  # AUD-SEC-560
    def test_deny(self):
        self.assert_code(
            (
                "git push someone-else --delete feat",
                "git push https://github.com/x/y --delete feat",
                "git push upstream :feat",
                "gh api -X DELETE repos/someone/else/git/refs/heads/feat",
                "gh api -X DELETE 'repos/{owner}/{repo}/git/refs/heads/feat'",  # gh chọn `upstream` trước `origin`
                "gh api -X DELETE repositories/1/git/refs/heads/feat",
            ),
            "REMOTE_DELETE",
        )
        with mock.patch.object(guard, "_origin_repo", return_value=""):  # không đọc được `origin`: không miễn
            raw = guard.bash_decision("gh api -X DELETE repos/me/repo/git/refs/heads/feat", str(ROOT), str(ROOT))
        self.assertEqual(raw["decision"], "deny", raw)

    def test_allow(self):
        self.assert_runs(
            (
                "git push origin --delete feat",
                "git push origin :feat",
                "gh api -X DELETE repos/me/repo/git/refs/heads/feat",
                "gh api -X DELETE repos/ME/Repo/git/refs/heads/feat",
            )
        )

    def test_origin_repo(self):
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(["git", "-C", tmp, "init", "-q"], check=True, capture_output=True)
            self.assertEqual(guard._origin_repo(tmp), "")  # chưa có `origin`
            for url, slug in (
                ("https://github.com/o/r.git", "o/r"),
                ("git@github.com:o/r.git", "o/r"),
                ("ssh://git@github.com/o/r", "o/r"),
                ("https://github.com/o/r/", "o/r"),
            ):
                subprocess.run(["git", "-C", tmp, "remote", "remove", "origin"], capture_output=True, check=False)
                subprocess.run(["git", "-C", tmp, "remote", "add", "origin", url], check=True, capture_output=True)
                self.assertEqual(guard._origin_repo(tmp), slug, url)
            subprocess.run(["git", "-C", tmp, "remote", "set-url", "origin", "o"], check=True, capture_output=True)
            self.assertEqual(guard._origin_repo(tmp), "")
        with mock.patch.object(guard.subprocess, "run", side_effect=OSError):
            self.assertEqual(guard._origin_repo(None), "")


class PythonFilterRepoTest(_Case):  # AUD-SEC-561
    def test_deny(self):
        self.assert_code(
            (
                "python3 -m git_filter_repo --force",
                "python3 /usr/local/bin/git-filter-repo --force",
                "python3 -u -m git_filter_repo",
                "python3.12 -mgit_filter_repo --path x",
                "/usr/bin/pypy3 /usr/local/bin/git-filter-repo",
            ),
            "REMOTE_DELETE",
        )

    def test_allow(self):
        self.assert_runs(("python3 -m pytest", "python3 -m git_filter_repo --help", "python3 -m"))


class NestedLeadExpansionTest(_Case):  # AUD-SEC-602
    def test_deny(self):
        self.assert_code(
            (
                'gh pr close 5 "$(echo $(true))"$X',
                'gh pr close 5 "${A:-${B}}"$X',
                'gh pr merge 5 "$(echo $(true))"$X',
                "gh pr close 5 ~-",
                "gh pr close 5 ~+/x",
                "gh pr close 5 $X",  # dạng trơn: cùng mã
            ),
            "BUDGET",
        )

    def test_allow(self):
        # D-503: `gh pr close 5 "$(echo $(true))"` nay BUDGET — thay lệnh ở đối số của gh có luật (`-d` xoá nhánh)
        self.assert_runs(('gh pr view "${A:-${B}}"', "gh pr close 5 ~x"))

    def test_strip_expansions(self):
        self.assertEqual(guard._strip_expansions("$(echo $(true))${A:-${B}}"), "")
        self.assertEqual(guard._strip_expansions("a$(b)c"), "ac")


class DecideProdReaderTest(_Case):  # AUD-SEC-653
    def test_deny(self):
        self.assert_code(
            (
                "python3 scripts/xt.py loop decide-prod",
                "sed -n p scripts/xt.py -e decide-prod",  # `sed` chạy được lệnh: giữ chặt
            ),
            "STAGE_APPROVE",
        )

    def test_allow(self):
        self.assert_runs(("grep -n scripts/xt.py -e decide-prod", "cat scripts/xt.py decide-prod"))


class FunctionCompoundBodyTest(_Case):  # AUD-SEC-667 ý 6
    def test_deny(self):
        self.assert_code(
            (
                "g() if true; then gh pr comment 5 -b x; fi; g",
                "g() while true; do gh pr comment 5 -b x; done; g",
                "g() for i in 1; do gh pr comment 5 -b x; done; g",
                "g()\nuntil false; do gh pr comment 5 -b x; done; g",
                "g() { gh pr comment 5 -b x; }; g",  # dạng ngoặc nhọn: cùng mã
                "read -r c; set -- 1; for x do $c; done",  # ý 2: ghim `_fn_forms` trong `_raw_tokens`
            ),
            "BUDGET",
        )
        self.assert_code(("time function g { git push origin feat/me --force; }; g",), "RULE_DENY")  # ý 2: tiền tố

    def test_allow(self):
        self.assert_runs(("g() if true; then git status; fi; g", "g() [[ -n x ]]; g", "gh pr comment 5 -b x"))


class PushLeadingGlobTest(_Case):  # AUD-SEC-747
    def test_deny(self):
        self.assert_code(
            ("git push ?d origin feat/other", "git push *delete origin feat/other", "git -C . push origin ?f"),
            "BUDGET",
        )

    def test_allow(self):
        self.assert_runs(('git push origin "?d"', "git add *.py", "git push origin feat", "git status ?x"))


class StrictKeepsOldAskTest(_Case):  # AUD-SEC-754
    def test_deny(self):
        # `$!` rỗng khi chưa có job nền: như `$X--admin` (dạng biến trơn) — BUDGET ở mọi chính sách
        self.assert_code(
            ("gh pr merge 5 $!--admin", "gh pr merge 5 $X--admin", "gh pr close 5 $!-d"), "BUDGET", "strict"
        )
        self.assert_code(("gh pr merge 5 $!--admin", "gh pr merge 5 $X--admin"), "BUDGET")  # chính sách mặc định

    def test_allow(self):
        self.assert_runs(("gh pr merge 5 --squash", "gh pr view $$", "echo $!"), "strict")


class NumericBraceTest(_Case):  # AUD-SEC-755 (ghim: không gỡ — luật cũ đọc token thô, `-f${#x}` = `-f0` là force)
    def test_deny(self):
        self.assert_code(
            ("git push -o$- origin feat", "git push -o$0 origin feat", "git push -f${#x} origin feat"), "BUDGET"
        )

    def test_allow(self):
        self.assert_runs(("git push origin feat", "echo ${#x}", 'git push -o "${#x}" origin feat'))


class RefRewriteHelpTest(_Case):  # AUD-HAR-349
    def test_deny(self):
        self.assert_code(
            (
                "git filter-repo --help --force",
                "git filter-repo --force",
                "git filter-branch --tree-filter x -- HEAD main",
                "git filter-branch --tree-filter x -- -n 2 HEAD main",
                "git push -o -n origin --delete other",
                "git push -on origin --delete other",
                "git push -n --no-dry-run origin --delete other",
                "git push -n$X origin --delete other",
            ),
            "REMOTE_DELETE",
        )
        self.assert_code(("git push . :main", "git push -n origin --delete main"), "RULE_DENY")

    def test_allow(self):
        self.assert_runs(
            (
                "git filter-repo --help",
                "git filter-repo --version",
                "git filter-repo -h 2>&1",
                "git filter-branch --tree-filter x -- HEAD -- path",
                "git filter-branch --tree-filter x HEAD -- path",
                "git filter-branch --tree-filter x -- -n 2 HEAD",
                "git filter-branch --tree-filter x -- HEAD HEAD",
                "git push -n origin --delete other",
                "git push --dry-run origin --delete other",
                "git push . :other",
            )
        )


class MutantFormsTest(_Case):  # AUD-TEST-096
    def test_deny(self):
        self.assert_code(("gh auth status -thgithub.com", "gh auth status -h github.com -t"), "RULE_DENY")
        self.assert_code(("gh cache delete -a",), "DESTROY")
        self.assert_code(("ssh host /usr/bin/gh pr comment 5 -F - < r.md",), "REVIEW_FORGE")

    def test_allow(self):
        self.assert_runs(
            ("gh auth status -hgithub.com", "gh cache delete -rrefs/heads/a k", "ssh host /usr/bin/gh pr view 5")
        )


class CorpusAndDepthTest(_Case):  # AUD-TEST-099
    def test_deny(self):
        depth = 500
        self.assert_code(("echo " + "$(echo " * depth + "x" + ")" * depth,), "BUDGET")

    def test_allow(self):
        self.assert_runs(("echo $(echo $(echo x))",))

    def test_aud605_controls_are_control(self):
        rows = json.loads((ROOT / "tests/fixtures/autonomy/guard.json").read_text(encoding="utf-8"))["cases"]
        ids = {r["id"]: r["origin"] for r in rows if r["id"].startswith("aud605-ctl-")}
        self.assertTrue(ids)
        self.assertEqual(set(ids.values()), {"control"})


if __name__ == "__main__":
    unittest.main()
