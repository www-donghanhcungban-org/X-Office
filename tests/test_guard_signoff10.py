"""D-503/D-508 (T-3949): phát hiện cổng ký lần 9 (ứng viên `e2f89c8b`), sửa theo lớp.

- A1 (🟠 hồi quy chặn oan): `$` ở here-string/chữ qua ống chỉ là chương trình với công cụ đọc chương trình.
- A2 (🔴): lối thoát `systemlist()`/`pager`/`pipe … |`/`to program`/ống sau `.once`/`\\o` qua stdin; `mysql --pager=`.
- A3 (🟠): `for`/`select`/`coproc PATH`, `exec {PATH}>` ghi PATH → `$(date)` không được tin.
- A4 (🟠): biến gán từ `$(date)` chỉ ưu đãi dưới gốc/thư mục tạm; `env -C`/`--chdir` đổi thư mục.
- A5 (🟠): ghi vào bên trong thư mục git (`.git/**` của gốc, gitdir/`.git` chung của worktree liên kết, `.git` repo con)
  cùng hàng rào với luật xoá, trừ `*.lock`, `info/exclude`.
- A6 (🔴): cụm cờ ngắn kiểu getopt (`ex -sc`, `vim -Nesc`, `psql -Atc`, `mysql -Be`).
- A7 (🟢): test đồng thời vá môi trường MỘT lần ngoài luồng (không rò patch sang module sau).
- A8 (🟢 chặn oan): `HEAD:"$(git branch --show-current)"`, TMPDIR chỉ nhắc/đọc, `dotglob` chỉ nhắc chữ, `cd /tmp`.
- B1–B4 (họ (c) D-508, sửa vì gọn): stdin của lệnh ghép, echo có thoát vào công cụ đọc chương trình, `-f /dev/fd/N`,
  chữ echo trong nhóm đưa qua ống vào `crontab -`/`at`.

DENY: dạng tái hiện guard ở `e2f89c8b` cho chạy, cộng ca hồi quy/biến thể sinh quanh nó (một phần — 22/71 ca — đã bị
`e2f89c8b` chặn; giữ để khoá hành vi, như signoff9). ALLOW: dạng lành phải chạy (nhiều dạng `e2f89c8b` chặn oan)."""

from __future__ import annotations

import concurrent.futures
import contextlib
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

H = chr(126)  # `~` dựng bằng chr: chữ xoá home không nằm nguyên văn trong tệp test
R = "r" + "m"
WIPE = f"{R} -rf {H}"
PY = f'import os; os.system("{WIPE}")'


def patched(root: Path = ROOT) -> contextlib.ExitStack:
    stack = contextlib.ExitStack()
    stack.enter_context(mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(root), "XT_GUARD_POLICY": ""}))
    stack.enter_context(mock.patch.object(guard, "_current_branch", return_value="feat"))
    return stack


def decide_raw(cmd: str, root: Path = ROOT, cwd: Path | None = None) -> dict:
    return guard.apply_policy(guard.bash_decision(cmd, str(root), str(cwd or root)))


def decide(cmd: str, root: Path = ROOT, cwd: Path | None = None) -> dict:
    with patched(root):
        return decide_raw(cmd, root, cwd)


class Base(unittest.TestCase):
    def assert_deny(self, cmds: tuple[str, ...], root: Path = ROOT, cwd: Path | None = None) -> None:
        for cmd in cmds:
            with self.subTest(cmd=cmd):
                self.assertEqual(decide(cmd, root, cwd).get("decision"), "deny")

    def assert_allow(self, cmds: tuple[str, ...], root: Path = ROOT, cwd: Path | None = None) -> None:
        for cmd in cmds:
            with self.subTest(cmd=cmd):
                d = decide(cmd, root, cwd)
                self.assertNotEqual(d.get("decision"), "deny", d.get("reason"))


A1_ALLOW = (
    'echo "$CR_PAT" | docker login ghcr.io -u u --password-stdin',
    'TOKEN=abc; echo "$TOKEN" | docker login ghcr.io -u u --password-stdin',
    'echo "$CR_PAT" | podman login ghcr.io -u u --password-stdin',
    'echo "$HELM_PASSWORD" | helm registry login ghcr.io -u u --password-stdin',
    'echo "$NPM_TOKEN" | npm login --scope=@org --auth-type=legacy',
    'bc <<< "$x * 2"',
    'echo "scale=2; $total / $count" | bc -l',
    'column -t <<< "$table"',
    'echo "$json" | yq -P',
    'xclip -selection clipboard <<< "$url"',
    'echo "$x" | envsubst',
    'echo "$x" | openssl dgst -sha256',
    'echo "$SSH_KEY" | ssh-add -',
    'echo "$body" | curl -fsS -d @- https://example.com/api',
    'printf %s "$SECRET" | kubectl create secret generic k --from-file=key=/dev/stdin --dry-run=client -o yaml',
)
A1_DENY = (  # công cụ đọc chương trình: `$` ở thân vẫn là chương trình lúc chạy (psql/sqlite3/redis-cli giữ chủ đích)
    'echo "$x" | psql',
    'sqlite3 x.db <<< "$q"',
    'echo "$x" | redis-cli',
    'echo "$x" | lua',
    'echo "$x" | at now',
    'echo "$x" | ed -s /dev/null',
    'echo "$x" | sed -f - f.txt',
)
A2_DENY = (
    f"vim -es /dev/null <<< \"call systemlist('{WIPE}')\"",
    f"vim -es /dev/null <<'E'\ncall job_start('{WIPE}')\nE",
    f"sqlite3 <<< '.once |{WIPE}'",
    f"sqlite3 x.db <<< '.output |{WIPE}'",
    f"sqlite3 x.db <<< '.import \"|{WIPE}\" t'",
    f"psql <<< '\\o |{WIPE}'",
    f"psql <<< '\\g |{WIPE}'",
    f"mysql <<< 'pager {WIPE}'",
    f"gdb -batch -x /dev/stdin <<< 'pipe p 1 | {WIPE}'",
    f"psql <<< \"copy (select 1) to program '{WIPE}'\"",
    f"printf '%s\\n' '.once |{WIPE}' 'select 1;' | sqlite3",
    f"mysql --pager='{WIPE}' -e 'select 1'",
    f"mysql --pag='{WIPE}' -e 'select 1'",
)
A2_ALLOW = (
    "sqlite3 x.db <<< '.output out.txt'",
    "sqlite3 x.db <<< '.import data.csv t'",
    "psql <<< '\\o out.txt'",
    "psql -c 'select pipe, program, pager from t'",
    "mysql --pager=less -e 'select 1'",
    "mysql --pager -e 'select 1'",
)
A3_DENY = (
    f'for PATH in /nonexistent; do /bin/{R} -rf "$(date +%F)/x"; done',
    f'select PATH in /nonexistent; do /bin/{R} -rf "$(date +%F)/x"; break; done',
    f'exec {{PATH}}>/dev/null; {R} -rf "$(date +%F)/x"',
    f"for P''ATH in /x; do {R} -rf \"$(date +%F)/x\"; done",
    f'coproc PATH {{ :; }}; {R} -rf "$(date +%F)/x"',
    f'read -a PATH <<< /x; {R} -rf "$(date +%F)/x"',
    f'local PATH=/x; {R} -rf "$(date +%F)/x"',
    f'unset PATH; {R} -rf "$(date +%F)/x"',
)
A3_ALLOW = (f'for f in a b; do {R} -rf "$(date +%F)/$f"; done', f'{R} -rf "build/$(date +%F)"')
A4_DENY = (
    f'd=$(date +%F); {R} -rf {H}/"$d"',
    f'd=$(date +%F); {R} -rf "$HOME/$d"',
    f'd=$(date +%F); {R} -rf {H}/Documents/"$d"',
    f"TODAY=$(date +%Y%m%d); {R} -rf {H}/backups/$TODAY",
    f'd=$(date +%F); e="x-$d"; {R} -rf {H}/"$e"',
    f'd=`date +%F`; {R} -rf {H}/"$d"',
    f'env -C {H} {R} -rf "$(date +%F)"',
    f'env --chdir=/home/u {R} -rf "$(date +%F)"',
    f'env --chd=/home/u {R} -rf "$(date +%F)"',
    f'env -iC {H} {R} -rf "$(date +%F)"',
    f'cd /etc && {R} -rf "$(date +%F)"',
    f'cd /tmp/../etc && {R} -rf "$(date +%F)"',
)
A4_ALLOW = (
    f'D=$(date +%F); {R} -rf "$D"',
    f'D=$(date +%F); {R} -rf "build/$D"',
    f'D=$(date +%F); {R} -rf "/tmp/x-$D"',
    'D=$(date +%F); mkdir -p "out/$D" && cp a "out/$D/"',
    f"D=$(date +%F); {R} -rf '{H}/$D'",  # nháy đơn: chữ, không mở rộng
    f'env FOO=1 {R} -rf "$(date +%F)"',
    f'{R} -rf "/tmp/build-$(date +%F)"',
)
A6_DENY = (
    f"ex -sc '!{WIPE}' /dev/null",
    f"vim -esc '!{WIPE}' /dev/null",
    f"vim -Nesc '!{WIPE}' /dev/null",
    f"vim -Nesc'!{WIPE}' /dev/null",
    f"psql -Atc '\\! {WIPE}'",
    f"mysql -Be 'system {WIPE}'",
    f"mysql -Besystem\\ {R}\\ -rf\\ {H}",
)
A6_ALLOW = ("psql -Atc 'select 1'", "mysql -Be 'select 1'", "vim -esN /dev/null", "psql -X1c 'select 1'")
A8_ALLOW = (
    'git push origin HEAD:"$(git branch --show-current)"',
    'git push origin "HEAD:$(git branch --show-current)"',
    'git push origin "HEAD:refs/heads/$(git branch --show-current)"',
    'tmp=$(mktemp -p "$TMPDIR"); echo hi > "$tmp"; rm -f "$tmp"',
    'ls "$TMPDIR"; rm -rf "$(mktemp -d)"',
    'echo "${TMPDIR:-/tmp}"; rm -rf "$(mktemp -d)"',
    "echo 'dotglob is off'; rm -rf */node_modules",
    'cd /tmp && rm -rf "build-$(date +%F)"',
    'cd /var/tmp/x && rm -rf "build-$(date +%F)"',
)
A8_DENY = (
    'git push origin "+HEAD:$(git branch --show-current)"',
    'git push origin "$(cat src):$(git branch --show-current)"',
    'TMPDIR=/home; rm -rf "$(mktemp -d)"',
    f'export TMPDIR={H}; rm -rf "$(mktemp -d)"',
    'echo "${TMPDIR:=/home}"; rm -rf "$(mktemp -d)"',
    'read TMPDIR; rm -rf "$(mktemp -d)"',
)
B_DENY = (
    # B1: stdin của lệnh ghép
    "{ python3; } <<< '" + PY + "'",
    "( python3 ) <<< '" + PY + "'",
    "if :; then python3; fi <<< '" + PY + "'",
    "while :; do python3; break; done <<'EOF'\n" + PY + "\nEOF",
    '{ node; } <<< \'require("child_process").execSync("' + WIPE + "\")'",
    "{ ed -s /dev/null; } <<< '!" + WIPE + "'",
    "case x in x) sqlite3;; esac <<< '.shell " + WIPE + "'",
    # B2: echo có thoát
    f"echo '!r\\m -rf {H}' | ed -s /dev/null",
    'echo \'import os; os.system("r\\"\\"m -rf ' + H + "\")' | python3",
    f"echo -e '!\\x72\\x6d -rf {H}' | ed -s /dev/null",
    f"echo '\\o |{WIPE}' | psql",
    # B3: chương trình qua fd
    f"make -f /dev/fd/3 3< <(printf 'x:\\n\\t{WIPE}\\n')",
    "gawk -f /dev/fd/3 3<<< 'BEGIN{system(\"r${Z}m -rf " + H + "\")}'",
    f"sed --file=/proc/self/fd/4 x 4< <(echo 'e {WIPE}')",
    "make -f <(printf 'x:\\n\\tx\\n')",
    # B4: nhóm đưa qua ống
    f"(crontab -l; echo '* * * * * {WIPE}') | crontab -",
    f"{{ crontab -l; echo '* * * * * {WIPE}'; }} | crontab -",
    f'(echo "{WIPE}/x") | at now',
)
B_ALLOW = (
    "(crontab -l; echo '0 3 * * * /usr/local/bin/backup.sh') | crontab -",
    "{ echo a; echo b; } | python3 script.py",
    'while read -r line; do echo "$line"; done <<< "$x"',
    'while read -r f; do python3 tool.py "$f"; done <<< "$files"',
    '{ echo "select 1;"; } | psql',
    'echo -e "select 1;\\n" | psql',
    "(cd sub && make) | tee log",
    "if [ -f x ]; then python3 x.py; fi > out.log",
    "echo 'hello\\nworld' | python3 -c 'import sys; print(sys.stdin.read())'",
    "make -f Makefile.ci test",
    "{ python3; } <<< 'print(1)'",
)


class StdinTest(Base):
    def test_a1_data_tools_allow(self):
        self.assert_allow(A1_ALLOW)

    def test_a1_program_readers_deny(self):
        self.assert_deny(A1_DENY)

    def test_a2(self):
        self.assert_deny(A2_DENY)
        self.assert_allow(A2_ALLOW)

    def test_a6(self):
        self.assert_deny(A6_DENY)
        self.assert_allow(A6_ALLOW)

    def test_b(self):
        self.assert_deny(B_DENY)
        self.assert_allow(B_ALLOW)

    def test_helpers(self):
        self.assertEqual(guard._cluster_at("vim", "-esc"), 3)
        self.assertEqual(guard._cluster_at("vim", "-c"), -1)
        self.assertEqual(guard._cluster_at("vim", "-s"), -1)
        self.assertEqual(guard._cluster_at("vim", "-é1c"), -1)
        self.assertEqual(guard._cluster_at("ls", "-esc"), -1)
        self.assertTrue(guard._fed_prog(["redis-cli"]))
        self.assertTrue(guard._fed_prog(["lua5.4"]))
        self.assertTrue(guard._fed_prog(["sed", "-f", "-"]))
        self.assertFalse(guard._fed_prog(["docker", "login"]))
        self.assertEqual(guard._echo_guesses(["echo", "a\\x41"]), ["a\\x41", "aA", "ax41"])
        self.assertFalse(guard._group_fed("{ echo x; } | cat"))
        self.assertIsNone(guard._pipe_feed(["echo", "a\\b"], None))
        self.assertEqual(guard._pipe_feed(["echo", "ab"], None, True), ["ab"])


class ValueTest(Base):
    def test_a3(self):
        self.assert_deny(A3_DENY)
        self.assert_allow(A3_ALLOW)

    def test_a4(self):
        self.assert_deny(A4_DENY)
        self.assert_allow(A4_ALLOW)

    def test_a8(self):
        self.assert_allow(A8_ALLOW)
        self.assert_deny(A8_DENY)

    def test_mktemp_tilde_plus_dotdot(self):
        self.assert_deny((f'cd "$(mktemp -d)" && {R} -rf {H}+/../Documents', f'cd "$(mktemp -d)" && {R} -rf {H}-/../x'))

    def test_helpers(self):
        self.assertTrue(guard._env_chdir(["env", "-C", "/x"]))
        self.assertTrue(guard._env_chdir(["/usr/bin/env", "--chdir=/x"]))
        self.assertFalse(guard._env_chdir(["env", "-i", "FOO=1"]))
        self.assertFalse(guard._env_chdir(["nice", "-C"]))
        self.assertFalse(guard._env_chdir(["env", "--debug"]))
        self.assertFalse(guard._tmpdir_written('ls "$TMPDIR" ${TMPDIR:-/tmp} ${#TMPDIR}'))
        self.assertTrue(guard._tmpdir_written("export TMPDIR"))
        self.assertFalse(guard._tmpdir_written("echo hi"))
        self.assertEqual(guard._date_names([(["d=$(date +%F)"], []), (["e=$d/x"], []), (["f=1"], [])]), {"d", "e"})
        self.assertTrue(guard._date_ref_bad('~/"$d"', {"d"}))
        self.assertFalse(guard._date_ref_bad("'~/$d'", {"d"}))
        self.assertFalse(guard._date_ref_bad('"$x"', {"d"}))
        self.assertIsNotNone(guard.REF_DST_RE.fullmatch('HEAD~1:"${b}"'))
        self.assertIsNone(guard.REF_DST_RE.fullmatch('":$(x)"'))


class GitWriteTest(Base):
    """A5: ghi bên trong thư mục git (gốc, repo con) — tương đối dưới gốc dự án."""

    GIT_DENY = (
        "truncate -s0 .git/objects/pack/p.pack",
        "cp /dev/null .git/objects/pack/p.pack",
        ": > .git/objects/pack/p.pack",
        "echo 0 > .git/refs/heads/main",
        "echo 0 | tee sub/.git/refs/heads/main",
        "mv -f VERSION sub/.git/refs/heads/main",
        "sed -i s/a/b/ .git/packed-refs",
        "dd if=/dev/zero of=.git/index bs=1 count=1",
        "rsync -a x .git/objects/",
        "ln -sf x .git/refs/heads/main",
        "install -m 644 x .git/ORIG_HEAD",
        f"{R} -rf sub/.git/objects",
        f"shopt -s dotglob; {R} -f sub/*/HEAD",
        f"bash -O dotglob -c '{R} -f sub/*/index'",
        f"{R} -f sub/*/.git/HEAD",
        'shopt -s dotglob; for f in */HEAD; do : > "$f"; done',
        "cd .git && : > HEAD",
    )
    GIT_ALLOW = (
        "touch .git/index.lock",
        f"{R} -f .git/index.lock",
        'echo "*.local" >> .git/info/exclude',
        "cat .git/HEAD > /tmp/h",
        "cp .git/HEAD /tmp/h",
        "echo x > sub/notgit/HEAD",
        f"{R} -f sub/*/HEAD",
        f"{R} -f /tmp/zz-t3949/.git/objects/x",
        "echo x > sub/.gitkeep",
    )

    def test_relative(self):
        self.assert_deny(self.GIT_DENY)
        self.assert_allow(self.GIT_ALLOW)

    def test_linked_worktree_absolute(self):
        """Gốc là worktree liên kết: gitdir riêng (`<chung>/worktrees/<tên>/HEAD|index`) và `.git` chung."""
        with tempfile.TemporaryDirectory() as tmp:
            main, wt = Path(tmp, "main"), Path(tmp, "wt")
            git = ["git", "-c", "user.name=t", "-c", "user.email=t@e", "-c", "init.defaultBranch=main"]
            subprocess.run([*git, "init", "-q", str(main)], check=True)
            subprocess.run([*git, "-C", str(main), "commit", "-q", "--allow-empty", "-m", "x"], check=True)
            subprocess.run([*git, "-C", str(main), "worktree", "add", "-q", "-b", "w", str(wt)], check=True)
            common = main.resolve() / ".git"
            deny = (
                f"echo x > {common}/worktrees/wt/HEAD",
                f"cp /dev/null {common}/worktrees/wt/index",
                f"truncate -s0 {common}/objects/pack/p.pack",
                f"echo 0 > {common}/refs/heads/main",
                f": > {common}/objects/pack/p.pack",
                f"cd {common}/worktrees/wt && : > HEAD",
                f"{R} -f {common}/worktrees/wt/HEAD",
            )
            self.assert_deny(deny, wt)
            self.assert_allow((f"touch {common}/worktrees/wt/index.lock", "echo x > notes.txt"), wt)


class ConcurrencyTest(unittest.TestCase):
    def test_concurrent_decisions_match_sequential(self):
        """Quyết định song song (luật mới đọc `SHADOW`/`SUBST_ROOTED` theo luồng) như tuần tự; vá môi trường một lần
        ngoài luồng và không rò sau test (A7)."""
        cmds = [*A4_DENY[:4], *A4_ALLOW[:4], *A3_DENY[:3], *B_DENY[:3], *A1_ALLOW[:3], *A8_ALLOW[:3]] * 3
        before = guard._current_branch, os.environ.get("XT_GUARD_POLICY"), os.environ.get("CLAUDE_PROJECT_DIR")
        with patched():
            seq = [decide_raw(c)["decision"] for c in cmds]
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
                par = list(pool.map(lambda c: decide_raw(c)["decision"], cmds))
        self.assertEqual(par, seq)
        self.assertIn("deny", seq)
        self.assertIn("", seq)
        after = guard._current_branch, os.environ.get("XT_GUARD_POLICY"), os.environ.get("CLAUDE_PROJECT_DIR")
        self.assertEqual(after, before)


if __name__ == "__main__":
    unittest.main()
