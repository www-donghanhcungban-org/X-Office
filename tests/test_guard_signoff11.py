"""D-503/D-508 (T-3951): phát hiện cổng ký lần 10 (ứng viên `a20ba307`), sửa theo lớp kèm bộ sinh biến thể.

- A1 (🔴): `>&TỪ`/`>& TỪ`/`1>&TỪ` (TỪ không phải số fd/`-`) ghi TỪ như `&>TỪ` — mọi đích canh.
- A2 (🔴): biến không tính chắc ở lệnh xoá/ghi — bản RỖNG (`"$TMPDIR"/*` → `/*`, `"$OUT"/etc` → `/etc`) và bản GIÁ TRỊ
  BẤT KỲ (`/home/$USER/x`, `~/../$USER`); `"$TMPDIR/x"` (đường chưa có) và biến gán từ `$(mktemp …)` vẫn qua.
- A3 (🔴): tuỳ chọn đặt thư mục của trình chạy (`uv run --directory ~`, `pnpm -C`, `yarn --cwd`, `npm --prefix`…).
- A4 (🔴): chuỗi template JS (`` execSync(`…`) ``, `String.raw`).
- A5 (🔴): Python gọi mô-đun chạy lệnh qua bí danh/`from … import`.
- A6 (🟠): stdin từ `< <(…)`/`<&3`/nhóm vào lệnh ngoài `STDIN_DATA_OK` (`Rscript -`, `julia`).
- A7 (🟠): `git push` theo nhánh hiện tại sau `checkout`/`switch`/`merge` cùng lệnh.
- A8 (🟠): glob đi qua symlink thư mục trỏ ra ngoài (`rm -rf lnk_*/`, `*/.config`, `for d in lnk_*`).
- A9 (🟠): công cụ ngoài bảng ghi nhắm hàng rào (`gsed -i`, `vim -es`, `sponge`, `gzip`, `zstd --rm`).
- A10 (🟢 chặn oan): `grep -rl x src/ | xargs sed -i …`.
- A11 (🔴, AUD-SEC-060): ghi đè/xoá `~/.ssh/**`, `~/.aws/**`, `/etc/**`…; `>` vào rc (chỉ `>>` qua).
- A12/B1: lối thoát theo từng công cụ (`pipe`/`program`/`pager` là chữ SQL; tcl `open "|…"`); Deno.Command/Deno.run.
- B2–B6 (🟢 chặn oan): chữ trong nháy không phải ghi PATH, `cp` vào lá ngày qua biến, `info/sparse-checkout`,
  `d=$(mktemp -d "${TMPDIR:-/tmp}/b.XXXXXX"); rm -rf "$d"`, `redis-cli -x`.

DENY: dạng lọt ở `a20ba307` (đã xác nhận bằng bash thật ở lô cổng ký 10) và biến thể sinh quanh nó. ALLOW: đối chứng lành."""

from __future__ import annotations

import concurrent.futures
import contextlib
import itertools
import os
import shutil
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


def patched(root: Path = ROOT) -> contextlib.ExitStack:
    stack = contextlib.ExitStack()
    stack.enter_context(mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(root), "XT_GUARD_POLICY": ""}))
    stack.enter_context(mock.patch.object(guard, "_current_branch", return_value="feat"))
    return stack


def decide_raw(cmd: str, root: Path = ROOT) -> dict:
    return guard.apply_policy(guard.bash_decision(cmd, str(root), str(root)))


def decide(cmd: str, root: Path = ROOT) -> dict:
    with patched(root):
        return decide_raw(cmd, root)


def wraps(cmd: str) -> list[str]:
    """Bọc lệnh: trơn, `{ }`, `( )`, `if`, `true &&`, `bash -c`, `sh -c` hai tầng, `env`/`nice`/`timeout`/`command`."""
    q = cmd.replace("'", "'\\''")
    inner = f"bash -c '{q}'"
    q2 = inner.replace("'", "'\\''")
    return [
        cmd,
        f"{{ {cmd}; }}",
        f"( {cmd} )",
        f"if :; then {cmd}; fi",
        f"true && {cmd}",
        inner,
        f"sh -c '{q2}'",
        f"env {cmd}" if not cmd.startswith(("echo", ":", "true", "cat")) else f"{cmd} || :",
    ]


class Base(unittest.TestCase):
    def assert_deny(self, cmds: list[str] | tuple[str, ...], root: Path = ROOT) -> None:
        for cmd in cmds:
            with self.subTest(cmd=cmd):
                self.assertEqual(decide(cmd, root).get("decision"), "deny")

    def assert_allow(self, cmds: list[str] | tuple[str, ...], root: Path = ROOT) -> None:
        for cmd in cmds:
            with self.subTest(cmd=cmd):
                d = decide(cmd, root)
                self.assertNotEqual(d.get("decision"), "deny", d.get("reason"))


FENCES = (".git/HEAD", ".claude/settings.json", ".claude/hooks/guard.py", ".autopilot/state.json", ".env")
FENCES += ("docs/ops/GO-NO-GO-v1.md",)
A1_OPS = (">& ", ">&", "1>& ", "1>&")
A1_ALLOW = (
    "echo x >&2",
    "echo x 2>&1",
    "echo x >& 2",
    "echo x >&-",
    "echo x >&3-",
    "echo x >& out.txt",
    "ls >&/dev/null",
)


class A1DupRedirectTest(Base):
    def test_deny_fences(self):
        cmds = [f"{v} {op}{f}" for v, op, f in itertools.product(("echo x", ":", "true"), A1_OPS, FENCES)]
        self.assert_deny([w for c in cmds[:12] for w in wraps(c)] + cmds)

    def test_allow(self):
        self.assert_allow(A1_ALLOW)

    def test_dup_file_tokens(self):
        self.assertEqual(guard._dup_file(["echo", "1", ">&", "f"]), ["echo", "1", ">", "f"])
        self.assertEqual(guard._dup_file(["echo", ">&", "2"]), ["echo", ">&", "2"])
        self.assertEqual(guard._dup_file([">&"]), [">&"])


A2_VARS = ("TMPDIR", "OUT", "BUILD_DIR")
A2_FORMS = ('"${V}"/*', '"$V"/*', "$V/*", '"$V/"*', '"$V"/etc', '"${V}"/bin', '"${V%/}"/usr', '"$V/"')
A2_VERBS = (f"{R} -rf", f"\\{R} -rf", f"command {R} -rf", f"{R} -r", "shred -u", "mv", "truncate -s0")
A2_DENY_EXTRA = (
    f'{R} -rf "/home/$USER/Documents"',
    f"{R} -rf {H}/../$USER",
    f'{R} -rf "/home/$LOGNAME"',
    'echo x | tee "$OUT"/*',
    'echo x | tee -a "$OUT/"*',
    'cp /dev/null "/home/$TMPDIR"',
    'echo x | tee "/home/$USER/Documents"',
    'cp /dev/null "/home/$LOGNAME/Documents"',
    'truncate -s0 ~/../"$USER"',
    "mv ~/../$USER zz",
    f'D=$(git rev-parse --show-toplevel); {R} -rf "$D"/etc',
    f'{R} -rf "${{OUT:-}}"/etc',
    f'{R} -rf "${{OUT-}}"/etc',
)
A2_ALLOW = (
    f'{R} -rf "$TMPDIR/x"',
    f"{R} -rf $TMPDIR/xt-build-a2",
    f'{R} -rf "${{TMPDIR:-/tmp}}"/xt-*',
    f'TMP=$(mktemp -d); {R} -rf "$TMP"/x',
    f'TMP=$(mktemp -d); {R} -rf "$TMP"',
    f'{R} -rf "$OUT"',
    f'{R} -rf build/"$OUT"',
    f'{R} -rf "${{OUT:?}}"/*',
    f'for d in a b; do {R} -rf "$d"/; done',
    'cp a.txt "$OUT"',
    'echo hi > "$LOG"',
    f'X=build; {R} -rf "$X"/*',
)


class A2EmptyReadingTest(Base):
    def test_deny_matrix(self):
        cmds = [f"{v} {f.replace('V', n)}" for v, f, n in itertools.product(A2_VERBS, A2_FORMS, A2_VARS)]
        cmds = [c for c in cmds if not (c.startswith(("mv", "truncate")) and c.endswith('/"'))]
        self.assert_deny(cmds)

    def test_deny_wrapped(self):
        self.assert_deny([w for c in (f'{R} -rf "$TMPDIR"/*', *A2_DENY_EXTRA[:3]) for w in wraps(c)])
        self.assert_deny(A2_DENY_EXTRA)

    def test_allow(self):
        self.assert_allow(A2_ALLOW)

    def test_helpers(self):
        self.assertEqual(guard._empty_seg(["do", "x", "2", ">", "/dev/null"], set(), ""), "")
        self.assertEqual(guard._empty_seg(["x", "2", ">", '"$A"'], set(), "y"), 'x 2> "y"')
        self.assertEqual(guard._empty_seg(["x", "<<<", '"$A"', '"$B"'], set(), "y"), 'x "y"')
        self.assertEqual(guard._empty_word("'$A'$B\\$C${#D}${!E}", set(), ""), "'$A'\\$C0${!E}")
        self.assertFalse(guard._empty_exists(""))


A3_RUNNERS = ("uv run --directory D", "uv --directory D run", "uv run --directory=D", "uvx --directory D")
A3_RUNNERS += (
    "pnpm -C D exec",
    "pnpm --dir D exec",
    "pnpm --dir=D exec",
    "yarn --cwd D exec",
    "npm --prefix D exec --",
)
A3_RUNNERS += ("poetry -C D run", "pdm -p D run", "bunx --cwd D", "systemd-run --user --working-directory=D")
A3_DIRS = (H, "..", "$HOME", "/home")
A3_ALLOW = (
    f"uv run --directory sub {R} -rf build",
    f"pnpm -C packages/web exec {R} -rf dist",
    f"uv run -p 3.12 {R} -rf build",
    "uv run --directory sub pytest",
    "npm --prefix web run build",
)


class A3RunnerChdirTest(Base):
    def test_deny(self):
        cmds = [f"{r.replace('D', d)} {R} -rf Documents" for r, d in itertools.product(A3_RUNNERS, A3_DIRS)]
        cmds += [f"uv run --directory {H} sh -c '{R} -rf Documents'", f'uv run --directory {H} {R} -rf "$(date +%F)"']
        self.assert_deny(cmds + wraps(f"pnpm -C {H} exec {R} -rf Documents"))

    def test_allow(self):
        self.assert_allow(A3_ALLOW)

    def test_chdirs(self):
        self.assertEqual(guard._runner_chdirs(["-Cx", "--dir=y", "--cwd", "z", "-p"]), ["x", "y", "z"])


A4_CALLS = (
    'require("child_process").execSync(`P`)',
    'require("child_process").exec(`P`)',
    'require("child_process").execSync(String.raw`P`)',
    'require("child_process").spawnSync("sh", ["-c", `P`])',
    'const {execSync} = require("child_process"); execSync(`P`, {stdio: "inherit"})',
)
A4_SRC = ("node -e 'S'", "node -p 'S'", "node --eval='S'", "node <<< 'S'", "echo 'S' | node", "bun -e 'S'")
A4_ALLOW = (
    "node -e 'console.log(`hello`)'",
    "node -e 'require(\"child_process\").execSync(`ls -la`)'",
    "node -e 'const x = `a,b`; console.log(x.split(\",\"))'",
)


class A4TemplateTest(Base):
    def test_deny(self):
        self.assert_deny([s.replace("S", c.replace("P", WIPE)) for s, c in itertools.product(A4_SRC, A4_CALLS)])

    def test_allow(self):
        self.assert_allow(A4_ALLOW)

    def test_interp_marker(self):
        m = guard.LITERAL_RE.search("`a ${b} c`")
        self.assertEqual(guard._literal(m), f"a {guard.JS_INTERP_WORD} c")


A5_CALLS = (
    'import subprocess as s; s.run("P", shell=True)',
    'import subprocess as s; s.call("P", shell=1)',
    'from subprocess import run; run("P", shell=True)',
    'from subprocess import run as r; r("P", shell=True)',
    'import os as o; o.system("P")',
    'from os import system; system("P")',
    '__import__("os").system("P")',
)
A5_SRC = ("python3 -c 'S'", "python -c 'S'", "python3 -Ic 'S'", "python3 - <<< 'S'", "echo 'S' | python3")
A5_SRC += ("python3 /dev/stdin <<< 'S'",)
A5_ALLOW = (
    'python3 -c \'import subprocess as s; print(s.run(["git", "status"], capture_output=True).stdout)\'',
    'python3 -c \'from subprocess import run; run(["ls", "-la"])\'',
    "python3 -c 'import os as o; print(o.getcwd())'",
)


class A5PyAliasTest(Base):
    def test_deny(self):
        self.assert_deny([s.replace("S", c.replace("P", WIPE)) for s, c in itertools.product(A5_SRC, A5_CALLS)])

    def test_allow(self):
        self.assert_allow(A5_ALLOW)

    def test_too_many_literals(self):
        script = "import subprocess as s\n" + "\n".join(f"x{i} = 'v{i}'" for i in range(guard.QUOTE_JOIN_MAX + 1))
        with self.assertRaises(guard.ScanTooComplex):
            guard._py_alias_scripts(script)
        self.assertEqual(guard._py_alias_scripts("import subprocess as s"), [])


A7_MOVES = (
    "git checkout main",
    "git checkout -B main",
    "git checkout -q main",
    "git switch main",
    "git switch -c main",
)
# T-3955 B1: `merge`/`pull`/`reset` không đổi nhánh — chỉ `rebase <upstream> <nhánh>` (đổi sang `<nhánh>`)
A7_MOVES += ("git rebase origin/main main", "git reset --hard origin/main")
A7_PUSH = (
    'git push origin "$(git branch --show-current)"',
    'git push -u origin "$(git branch --show-current)"',
    'git push --set-upstream origin "$(git rev-parse --abbrev-ref HEAD)"',
    'B=$(git branch --show-current) && git push origin "$B"',
    'git push origin --delete "$(git branch --show-current)"',
)
A7_ALLOW = (
    'git push origin "$(git branch --show-current)"',
    "git checkout -b feat/y && git push -u origin feat/y",
    'B=$(git branch --show-current) && git push origin "$B"',
)


class A7PushAfterMoveTest(Base):
    def test_deny(self):
        cmds = [f"{m}{sep}{p}" for m, sep, p in itertools.product(A7_MOVES, (" && ", "; "), A7_PUSH)]
        self.assert_deny(cmds + wraps(f"{A7_MOVES[0]} && {A7_PUSH[0]}"))

    def test_allow(self):
        self.assert_allow(A7_ALLOW)


B5_ALLOW = (
    f'd=$(mktemp -d "${{TMPDIR:-/tmp}}/b.XXXXXX"); {R} -rf "$d"',
    f'd=$(mktemp -d "$TMPDIR/b.XXXXXX"); {R} -rf "$d"',
    f'{R} -rf "$(mktemp -d "${{TMPDIR:-/tmp}}/b.XXXXXX")"',
)


class B5MktempTmpdirTest(Base):
    def test_allow(self):
        self.assert_allow(B5_ALLOW)


A9_TOOLS = ("gsed -i d", "vim -es -c '%d|wq'", "ex -sc '%d|x'", "ruby -pi -e 1", "perl -pi -e 1", "gzip", "xz")
A9_TOOLS += ("bzip2", "zstd --rm", "sponge", "python3 -c 'import sys; open(sys.argv[1], \"w\")'")
A9_FENCES = (".git/config", ".git/HEAD", ".claude/settings.json", ".claude/hooks/guard.py", ".autopilot/state.json")
A9_ALLOW = (
    "cat .claude/settings.json",
    "jq . .claude/settings.json",
    "python3 -m json.tool .claude/settings.json",
    "ruff check .claude/hooks",
    "python3 -m py_compile .claude/hooks/guard.py",
    "ar t .claude/hooks/x.a",
    "perl -ne 'print if /unlink/' .autopilot/state.json",
    "(cd .claude && ls); python3 -c \"open('settings.local.json','w').write('{}')\"",
    "eval eval . <(cat f)",
)


class A9FenceArgvTest(Base):
    def test_deny(self):
        cmds = [f"{t} {f}" for t, f in itertools.product(A9_TOOLS, A9_FENCES)]
        cmds += ["tar --remove-files -cf z.tar .claude", "ed -s .git/index <<< w", "printf x | sponge .git/HEAD"]
        self.assert_deny(cmds + wraps(f"gsed -i d {A9_FENCES[0]}"))

    def test_allow(self):
        self.assert_allow(A9_ALLOW[:7])

    def test_scan_needed(self):
        self.assertFalse(guard._fence_scan_needed(["tar", "-tf", "x"]))
        self.assertTrue(guard._fence_scan_needed(["zip", "-m", "x"]))
        self.assertFalse(guard._fence_scan_needed(["sed", "-n", "p"]))
        self.assertFalse(guard._fence_scan_needed(["cd", "x"]))
        self.assertFalse(guard._fence_reader(["ruff", "check", "--fix", "x"]))


class A8GlobSymlinkTest(Base):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(dir=str(Path.home())))  # gốc ngoài /tmp: `..` của gốc dưới /tmp là thư mục tạm
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.root = self.tmp / "proj"
        (self.root / "build" / "a").mkdir(parents=True)
        (self.root / "e").mkdir()
        outside = self.tmp / "outside"
        (outside / ".config").mkdir(parents=True)
        (self.root / "lnk_home").symlink_to(outside)
        (self.root / "lnk_cfg").symlink_to(outside / ".config")

    def test_deny(self):
        cmds = (f"{R} -rf lnk_*/", f"{R} -rf l*/*", f"{R} -rf */.config", "rsync -a --delete e/ l*/")
        cmds += (f'for d in lnk_*; do {R} -rf "$d"/; done', f"bash -c '{R} -rf lnk_*/'", f"{{ {R} -rf l*/*; }}")
        self.assert_deny(cmds, self.root)

    def test_allow(self):
        cmds = (
            f"{R} -rf lnk_*",
            f"{R} -rf build/*",
            f"{R} -rf b*/",
            f"{R} -rf */a",
            f'for d in build e; do {R} -rf "$d"/; done',
        )
        self.assert_allow(cmds, self.root)


A11_DENY = (
    "echo 'export X=1' > ~/.bashrc",
    "echo x > ~/.ssh/authorized_keys",
    "echo x >> ~/.ssh/authorized_keys",
    f"{R} -f ~/.ssh/*",
    f'{R} -f "$HOME"/.ssh/id_ed25519',
    "shred ~/.ssh/id_ed25519",
    "echo 127.0.0.1 x > /etc/hosts",
    "cp x ~/.npmrc",
    "mv x ~/.netrc",
    "echo x | tee ~/.aws/credentials",
    "echo x | tee ~/.zshrc",
    "sed -i s/a/b/ ~/.kube/config",
    "truncate -s0 ~/.profile",
    ": > ~/.gnupg/pubring.kbx",
)
A11_ALLOW = (
    "echo 'export X=1' >> ~/.bashrc",
    "echo x | tee -a ~/.zshrc",
    "cat ~/.ssh/id_ed25519.pub",
    "cat /etc/hosts",
    "cp ~/.ssh/config /tmp/x",
    "echo x > ~/notes.txt",
    "cp /etc/hosts /tmp/hosts.bak",
)


class A11HomeSecretTest(Base):
    def test_deny(self):
        self.assert_deny(list(A11_DENY) + wraps(A11_DENY[1]))

    def test_allow(self):
        self.assert_allow(A11_ALLOW)

    def test_kinds(self):
        self.assertEqual(guard._home_dotfile("relative"), "")
        self.assertEqual(guard._home_dotfile("/etc"), "etc")
        self.assertEqual(guard._home_dotfile("~/.bashrc"), "rc")


A10_ALLOW = (
    "grep -rl 'oldName' src/ | xargs sed -i 's/oldName/newName/g'",
    "grep -rl oldName src | xargs sed -i 's/oldName/newName/g'",
    "rg -l oldName src/ | xargs sed -i 's/oldName/newName/g'",
    "git grep -l oldName -- src | xargs sed -i 's/oldName/newName/g'",
    "grep -rl -e oldName -m 3 src | xargs sed -i 's/a/b/'",
)
A10_DENY = (
    "grep -rl oldName . | xargs sed -i 's/oldName/newName/g'",
    "grep -rl oldName .claude | xargs sed -i 's/oldName/newName/g'",
    "grep -rl oldName | xargs sed -i 's/a/b/'",
    "grep -rl oldName .. | xargs sed -i 's/a/b/'",
    "grep -rl oldName $D | xargs sed -i 's/a/b/'",
)


class A10GrepXargsTest(Base):
    def test_allow(self):
        self.assert_allow(A10_ALLOW)

    def test_deny(self):
        self.assert_deny(A10_DENY)


A6_DENY = (
    f"Rscript - < <(echo 'system(\"{WIPE}\")')",
    "Rscript - <&3",
    f"{{ Rscript -; }} <<< 'system(\"{WIPE}\")'",
    f"( julia ) <<< 'run(`{WIPE}`)'",
    f"julia < <(echo 'run(`{WIPE}`)')",
    f"Rscript - <(echo 'system(\"{WIPE}\")')",
    f"tclsh <<'E'\nset f [open \"|{WIPE}\"]\nE",
    f"{{ tclsh; }} <<< 'set f [open \"|{WIPE}\"]'",
    f"{{ python3; }} <<< 'import os; os.system(f\"{WIPE}\")'",
    f"( python3 ) <<< 'import os; os.system(rb\"{WIPE}\")'",
)
A6_ALLOW = (
    "grep x < <(ls)",
    "mapfile -t a < <(ls)",
    "sort < <(echo b a)",
    "diff <(ls a) <(ls b)",
    '{ grep x; } <<< "$y"',
    "{ cat; echo; } <<< 'hello world'",
    'while read -r l; do echo "$l"; done < <(git ls-files)',
    "comm -12 <(sort a) <(sort b)",
    "paste <(cut -f1 a) <(cut -f2 b)",
    "jq -s . <(echo 1) <(echo 2)",
    "python3 tool.py <(echo x)",
)


class A6ProgReaderTest(Base):
    def test_deny(self):
        self.assert_deny(A6_DENY)

    def test_allow(self):
        self.assert_allow(A6_ALLOW)


B1_ALLOW = (
    "psql -At -c \"select count(*) from jobs where status = 'pipe' and id > $N\"",
    'mysql -e "select program from t where id=$ID"',
    "psql -c \"select * from t where kind = 'program' and id = $ID\"",
    'mysql -Be "select pager, system from cfg where id=$ID"',
)
B1_DENY = (  # đối chứng: lối thoát thật của từng công cụ, có `$`/lệnh có luật
    f"psql -c '\\! {WIPE}'",
    f"psql -c \"copy t to program '{WIPE}'\"",
    f"mysql -e 'system {WIPE}'",
    f"mysql -e '\\! {WIPE}'",
    f"echo '.shell {WIPE}' | sqlite3 x.db",
    f"echo '!{WIPE}' | ed",
    f"echo 'set f [open \"|{WIPE}\"]' | tclsh",
    f"gdb -batch -ex 'shell {WIPE}'",
    f"echo 'pipe info | {WIPE}' | gdb -batch",
    'echo "$x" | psql',
)
DENO_DENY = (
    f'deno eval \'new Deno.Command("sh", {{args: ["-c", "{WIPE}"]}}).outputSync()\'',
    f'deno eval \'Deno.run({{cmd: ["sh", "-c", "{WIPE}"]}})\'',
    f'deno eval \'new Deno.Command("sh",{{args:["-c",`{WIPE}`]}}).outputSync()\'',
)
DENO_ALLOW = ('deno eval \'new Deno.Command("ls", {args: ["-la"]}).outputSync()\'', "deno eval 'Deno.cwd()'")


class B1EscapeTest(Base):
    def test_allow(self):
        self.assert_allow(B1_ALLOW + DENO_ALLOW)

    def test_deny(self):
        self.assert_deny(B1_DENY + DENO_DENY)

    def test_escape_re(self):
        self.assertIs(guard._escape_re(""), guard.PROG_ESCAPE_RE)
        self.assertIs(guard._escape_re("/usr/bin/tclsh8.6"), guard.TCL_ESCAPE_RE)


B_ALLOW = (
    'git commit -m "docs: explain for PATH in loops" && git push -u origin "$(git branch --show-current)"',
    'git commit -m "fix: guard for IFS handling" && cp a "/tmp/a-$(date +%F)"',
    "echo 'note: for PATH in list' && cp a \"/tmp/a-$(date +%F)\"",
    'ts=$(date +%F); cp -r data ~/bk/"$ts"',
    "echo 'src/' >> .git/info/sparse-checkout",
    'echo "$payload" | redis-cli -x set config',
    # corpus lành r8/r9/l5 (T-3951 kiểm hồi quy): giá trị gán có chữ không rỗng, lệnh thụ động/shell đọc script
    'backup="backup-$(date +%F)" && mkdir -p "$backup" && cp -r data "$backup/" && tar -czf "$backup.tgz" "$backup"'
    ' && rm -rf "$backup"',
    "du -sh .git/objects",
    "bash .claude/hooks/x.sh",
)
B_DENY = (  # đối chứng
    f'for PATH in /x; do {R} -rf "$(date +%F)/x"; done',
    f'PATH=/x; {R} -rf "$(date +%F)/x"',
    f'ts=$(date +%F); {R} -rf ~/bk/"$ts"',
    "echo x >> .git/info/attributes",
    'echo "$x" | redis-cli',
    "ls *.json | xargs -I{} sh -c 'jq . {} > /dev/null'",
)


class BRegressionTest(Base):
    def test_allow(self):
        self.assert_allow(B_ALLOW)

    def test_deny(self):
        self.assert_deny(B_DENY)
        d = decide(B_DENY[-1])
        self.assertNotIn("EVIDENCE", str(d.get("code")))


class ConcurrentTest(unittest.TestCase):
    """Quyết định đồng thời (luồng) cho cùng kết quả như tuần tự — contextvars của bản đọc lại không rò giữa luồng."""

    def test_threads(self):
        cmds = [f'{R} -rf "$TMPDIR"/*', f'{R} -rf "$TMPDIR/x"', f"echo x >& {FENCES[1]}", A4_ALLOW[0]] * 4
        with patched():
            want = [decide_raw(c).get("decision") for c in cmds]
            with concurrent.futures.ThreadPoolExecutor(4) as pool:
                got = list(pool.map(lambda c: decide_raw(c).get("decision"), cmds))
        self.assertEqual(got, want)


if __name__ == "__main__":
    unittest.main()
