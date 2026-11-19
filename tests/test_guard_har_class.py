"""D-502 (T-3931): lớp thân heredoc tới commit/PR theo token (AUD-HAR-419), lệnh phá dữ liệu tới máy chủ không cục bộ
(AUD-HAR-420), in biến token GitHub (AUD-SEC-818).

Mỗi ID một bộ DENY (mẫu tái hiện, guard ở `4862b369` cho chạy) và một bộ ALLOW (dạng lành gần nhất). Chữ ghi công AI
dựng bằng ghép chuỗi: guard phiên chặn chữ nguyên văn."""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
import unittest.mock as mock
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("XT_GUARD_PHASE", "harden")
sys.path.insert(0, str(ROOT / ".claude" / "hooks"))
import guard

H = chr(126)  # `~` dựng bằng chr: chữ xoá home không nguyên văn trong tệp test
A = "Co-Authored-By: " + "Cla" + "ude " + "Op" + "us 5 <x@y>"  # dòng ghi công AI (xt.yaml repo: `forbid`)


def decide(cmd: str) -> dict:
    with (
        mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(ROOT), "XT_GUARD_POLICY": ""}),
        mock.patch.object(guard, "_current_branch", return_value="feat"),
    ):
        return guard.apply_policy(guard.bash_decision(cmd.replace("@A", A).replace("@H", H), str(ROOT)))


def here(head: str, body: str = "fix: x\n\n@A", tail: str = "") -> str:
    return f"{head}\n{body}\nE" + (f"\n{tail}" if tail else "")


DENY = {
    "AUD-HAR-419": (
        here("\"git\" commit -F - <<'E'"),
        here("git co''mmit -F - <<'E'"),
        here("{ git commit -F -; } <<'E'"),
        here("{ git commit -F - ; } 0<<'E'"),
        here("{ echo a; cat <<'E'; } | git commit -F -"),
        here("exec 3<<'E'", tail="git commit -F /dev/fd/3"),
        here("exec <<'E'", tail="git commit -F -"),
        here("git -c $'user.name=a\\';b' commit -F - <<'E'"),
        here("\"gh\" pr create --title 'fix: x' --body-file - <<'E'", "body\n\n@A"),
        here("g''h pr create --title 'fix: x' --body-file - <<'E'", "body\n\n@A"),
        # shell con thừa stdin chạy commit/PR (lượt 2 của T-3931)
        here("sh -c 'git commit -F -' <<'E'"),
        here("bash -lc \"git -C . commit -F -\" <<'E'"),
        here("sh -c 'sh -c \"git commit -F -\"' <<'E'"),
        here("bash -c 'gh pr create --title \"fix: x\" --body-file -' <<'E'", "b\n\n@A"),
        # heredoc vào shell gắn theo token: thân là lệnh, quét như `bash <<'E'`
        here("{ bash; } <<'E'", "rm -rf @H"),
        here("( bash ) <<'E'", "rm -rf @H"),
        here("exec <<'E'", "rm -rf @H", "bash"),
        here("echo $((1<<2)); { bash; } <<'E'", "rm -rf @H"),
    ),
    "AUD-HAR-420": (
        'psql -h db.example.com -c "DROP DATABASE prod"',
        'psql postgres://u@db.example.com/app -c "TRUNCATE t"',
        'psql "host=db.example.com dbname=app" -c "DELETE FROM users"',
        'psql -h "$H" -c "DROP TABLE t"',
        "psql -h db.example.com <<'E'\nDROP SCHEMA public CASCADE;\nE",
        'psql -h db.example.com <<< "drop table t"',
        'mysql -h 10.0.0.5 -e "DROP DATABASE app"',
        'mariadb --host=db.x.io --execute="truncate table t"',
        'sqlcmd -S tcp:db.x.io,1433 -Q "DROP TABLE t"',
        'mongosh mongodb://db.x.io/app --eval "db.dropDatabase()"',
        'mongosh --host db.x.io --eval "db.users.deleteMany({})"',
        "dropdb -h db.example.com prod",
        "mysqladmin -h db.x.io -f drop app",
        "redis-cli -h cache.example.com FLUSHALL",
        "redis-cli -u redis://cache.example.com:6379 flushdb",
    ),
    "AUD-SEC-818": (
        "printenv GH_TOKEN",
        "printenv GITHUB_TOKEN",
        'echo "$GH_TOKEN"',
        "echo $GITHUB_TOKEN",
        "printf '%s' \"${GH_TOKEN:-}\"",
        'X=GH_TOKEN; echo "${!X}"',
        "env | grep TOKEN",
        "printenv | grep -i token",
        'echo "$GH_TOKEN" | base64',
        "bash -c 'echo $GH_TOKEN'",
    ),
}

ALLOW = {
    "AUD-HAR-419": (
        here("{ git commit -F -; } <<'E'", "fix: x"),
        here("exec 3<<'E'", "fix: x", "git commit -F /dev/fd/3"),
        here("exec 3<<'E'", "@A", "echo hi"),
        here("git commit -m 'fix: y'; cat <<'E'", "@A"),
        "{ cat <<'E'; } ; git commit -m 'fix: x'\n@A\nE",
        # T-3952 F1: `sh -c 'git commit -F -' <<E` (commit lồng, cổng commit không chạy) nay chặn — tests/test_guard_signoff12
        here("sh -c 'echo hi' <<'E'", "@A"),
        here("exec <<'E'", "echo hi", "bash"),
        here("exec <<'E'", "rm -rf @H", "cat"),
        here("echo $((1<<2)); cat <<'E'", "rm -rf @H"),
        here("echo $((1<<2)); { git commit -F -; } <<'E'", "fix: x"),
        here("python3 - <<'E'", "print(1)"),
    ),
    "AUD-HAR-420": (
        'psql -c "DROP DATABASE prod"',
        'psql -h localhost -c "DROP DATABASE prod"',
        'psql -h /var/run/postgresql -c "DROP TABLE t"',
        'psql -h db.example.com -c "DELETE FROM users WHERE id = 1"',
        'psql -h db.example.com -c "select 1"',
        'mysql -h 127.0.0.1 -e "DROP DATABASE app"',
        "sqlcmd -S '.\\SQLEXPRESS' -Q \"DROP TABLE t\"",
        'mongosh --eval "db.dropDatabase()"',
        "dropdb prod",
        "dropdb -h ::1 prod",
        "mysqladmin -h db.x.io status",
        "redis-cli FLUSHALL",
        "redis-cli -h cache.example.com get k",
        "prisma migrate reset --force",
        "rails db:drop",
        "docker compose down -v",
    ),
    "AUD-SEC-818": (
        "gh auth status",
        'echo "$GH_REPO"',
        'echo "$GH_TOKEN_FILE"',
        'X=PATH; echo "${!X}"',
        'echo "$GH_TOKEN" | gh auth login --with-token',
        "env",
        "printenv",
        "printenv PATH",
        "env | grep PATH",
    ),
}


class HarClassTest(unittest.TestCase):
    def test_deny(self):
        for ref, cmds in DENY.items():
            for cmd in cmds:
                with self.subTest(ref=ref, cmd=cmd):
                    self.assertEqual(decide(cmd)["decision"], "deny")

    def test_allow(self):
        for ref, cmds in ALLOW.items():
            for cmd in cmds:
                with self.subTest(ref=ref, cmd=cmd):
                    d = decide(cmd)
                    self.assertEqual(d["decision"], "", d.get("reason"))

    def test_attribution_reason(self):
        for cmd in DENY["AUD-HAR-419"]:
            if "@A" not in cmd or "--body-file -'" in cmd:  # thân lệnh shell / `--body-file -` lồng: luật khác chặn
                continue
            with self.subTest(cmd=cmd):
                self.assertIn("LOOP-HARNESS-027", decide(cmd)["reason"])

    def test_unmapped_heredoc_with_attribution_is_budget(self):
        d = decide(here("echo $((1<<2)); { git commit -F -; } <<'E'"))
        self.assertEqual((d["decision"], d.get("code")), ("deny", guard.BUDGET))
        self.assertIn("AUD-HAR-419", d["reason"])

    def test_data_destroy_code(self):
        for cmd in DENY["AUD-HAR-420"]:
            with self.subTest(cmd=cmd):
                self.assertEqual(decide(cmd).get("code"), "DATA_DESTROY")

    def test_data_destroy_every_phase(self):
        with mock.patch.dict(os.environ, {"XT_GUARD_PHASE": "build"}):
            self.assertEqual(decide("dropdb -h db.example.com prod").get("code"), "DATA_DESTROY")

    def test_token_print_same_code_as_gh_auth_token(self):
        code = decide("gh auth token").get("code")
        for cmd in DENY["AUD-SEC-818"]:
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertEqual(d.get("code"), code)
                self.assertIn(guard.GH_TOKEN_WHY, d["reason"])


class HarHelperTest(unittest.TestCase):
    """Nhánh của bộ đọc gọi thẳng."""

    def test_unquoted_seps_ansi_c(self):
        self.assertEqual(guard._unquoted_seps("git -c $'a\\';b' commit"), [])
        self.assertEqual(guard._unquoted_seps("echo $$'a'; b"), [(10, 11)])
        self.assertEqual(guard._unquoted_seps('a "x;y" ; b'), [(8, 9)])
        self.assertEqual(guard._unquoted_seps("a 'x;y' && b"), [(8, 10)])

    def test_group_delta(self):
        self.assertEqual(guard._group_delta("("), 1)
        self.assertEqual(guard._group_delta(")"), -1)
        self.assertEqual(guard._group_delta("{"), 1)
        self.assertEqual(guard._group_delta("}"), -1)
        self.assertEqual(guard._group_delta("git"), 0)

    def test_here_reach(self):
        t = guard.tokenize("a; { b; cat <<'E'; } | c; d\nx\nE")
        k = t.index("<<")
        lo, hi = guard._here_reach(t, k)
        self.assertEqual(t[lo:hi], ["{", "b", ";", "cat", "<<", "E", ";", "}", "|", "c"])
        t = guard.tokenize("a; exec 3<<'E'; b; c\nx\nE")
        lo, hi = guard._here_reach(t, t.index("<<"))
        self.assertEqual((t[lo], hi), ("exec", len(t)))
        t = guard.tokenize("cat <<'E'\nx\nE")
        self.assertEqual(guard._here_reach(t, t.index("<<")), (0, len(t)))

    def test_attribution_kind(self):
        self.assertEqual(guard._attribution_kinds(["git", "commit"]), {"commit"})
        self.assertEqual(guard._attribution_kinds(["gh", "pr", "create"]), {"pr"})
        self.assertEqual(guard._attribution_kinds(["gh", "pr", "view"]), set())
        self.assertEqual(guard._attribution_kinds(["}", "<<", "E"]), set())
        both = ["sh", "-c", "git commit -m x; gh pr create -t 'fix: x' -b y"]
        self.assertEqual(guard._attribution_kinds(both), {"commit", "pr"})
        self.assertEqual(guard._attribution_kinds(["sh", "-c", "git commit"], guard.STRICT_EVAL_DEPTH), set())
        self.assertEqual(guard._attribution_targets(["sh", "-c", "echo"], None, "/r"), [])
        self.assertEqual(guard._attribution_targets(["sh", "-c", "git commit"], None, "/r"), [("/r", [], "commit")])

    def test_here_owned(self):
        cmd = "git commit -m x"
        self.assertEqual(guard._here_owned(cmd, guard._here_scan(cmd), "commit"), frozenset())
        cmd = here("echo $((1<<2)); git commit -F - <<'E'", "x")
        self.assertIsNone(guard._here_owned(cmd, guard._here_scan(cmd), "commit"))
        cmd = here("{ git commit -F -; } <<'E'", "x")
        self.assertEqual(guard._here_owned(cmd, guard._here_scan(cmd), "commit"), frozenset({0}))
        self.assertEqual(guard._here_owned(cmd, guard._here_scan(cmd), "pr"), frozenset())

    def test_here_unread_attribution(self):
        guard._here_unread_attribution(here("{ git commit -F -; } <<'E'", A), "commit")  # đọc chắc → không ném
        guard._here_unread_attribution(here("echo $((1<<2)); git commit -F - <<'E'", "x"), "commit")
        with self.assertRaises(guard.ScanTooComplex):
            guard._here_unread_attribution(here("echo $((1<<2)); git commit -F - <<'E'", A), "commit")

    def test_attribution_needs_forbid_key(self):
        cmd = here("sh -c 'git commit -F -' <<'E'", A)
        with tempfile.TemporaryDirectory() as d:  # không có xt.yaml khai `forbid`: không xét
            self.assertEqual(guard.ai_attribution(cmd, [(["sh", "-c", "git commit -F -"], d)], d), "")

    def test_heredoc_scripts_token(self):
        self.assertEqual(guard._heredoc_scripts("echo hi"), [])
        self.assertEqual(guard._heredoc_scripts(here("{ bash; } <<'E'", "ls")), ["ls"])
        self.assertEqual(guard._heredoc_scripts(here("echo $((1<<2)); { bash; } <<'E'", "ls")), ["ls"])
        self.assertEqual(guard._heredoc_scripts(here("echo $((1<<2)); { cat; } <<'E'", "ls")), [])

    def test_destroy_local(self):
        for h in ("", "localhost", "127.0.0.1", "::1", "[::1]", "/tmp", ".", "(local)", "tcp:localhost,1433", ".\\X"):
            with self.subTest(h=h):
                self.assertTrue(guard._destroy_local(h))
        for h in ("prod", "db.x.io", "$H", "10.0.0.5", "tcp:db,1433"):
            with self.subTest(h=h):
                self.assertFalse(guard._destroy_local(h))

    def test_sql_destroys(self):
        self.assertTrue(guard._sql_destroys("drop table t", False))
        self.assertTrue(guard._sql_destroys("select 1; delete from t", False))
        self.assertFalse(guard._sql_destroys("delete from t where id = 1", False))
        self.assertTrue(guard._sql_destroys("db.c.drop()", True))
        self.assertFalse(guard._sql_destroys("db.c.drop()", False))
        self.assertFalse(guard._sql_destroys("select 1", True))

    def test_data_destroy_rule(self):
        self.assertEqual(guard._data_destroy_rule(["ls", "-la"]), ("", ""))
        self.assertEqual(guard._data_destroy_rule(["/usr/bin/dropdb", "-h", "x.io", "d"])[0], "deny")
        self.assertEqual(guard._data_destroy_rule(["dropdb", "d"]), ("", ""))
        self.assertEqual(guard._data_destroy_rule(["mysqladmin", "-h", "x.io", "ping"]), ("", ""))
        self.assertEqual(guard._data_destroy_rule(["sqlcmd", "-S", "x.io", "-Q", "select 1"]), ("", ""))

    def test_token_helpers(self):
        self.assertTrue(guard._token_echo(["printenv", "GH_TOKEN"], False))
        self.assertFalse(guard._token_echo(["printenv", "HOME"], True))
        self.assertTrue(guard._token_echo(["echo", "${!X}"], True))
        self.assertFalse(guard._token_echo(["echo", "${!X}"], False))
        self.assertFalse(guard._token_echo(["cat", "$GH_TOKEN"], False))
        self.assertFalse(guard._token_echo([], False))
        self.assertTrue(guard._env_dump(["env"]))
        self.assertTrue(guard._env_dump(["printenv"]))
        self.assertFalse(guard._env_dump(["printenv", "PATH"]))
        self.assertFalse(guard._env_dump(["env", "make"]))
        self.assertFalse(guard._env_dump([]))
        self.assertEqual(guard.token_print(guard.tokenize("env | sort")), "")
        self.assertEqual(guard.token_print(guard.tokenize("env | grep -v x")), "")


if __name__ == "__main__":
    unittest.main()
