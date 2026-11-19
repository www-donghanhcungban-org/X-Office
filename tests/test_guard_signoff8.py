"""D-503/D-506 (T-3945): phát hiện cổng ký lần 7 (ứng viên `b76d7af5`), sửa theo lớp.

- F1–F4 (🔴): giá trị tính được `$(date …)`/`$(mktemp …)`/`$(git …)`/`$(cat …)`/`$(pwd)` dựa vào TÊN lệnh — đảo chiều
  thành danh sách đóng (`_shadow_level`): chỉ tin khi mọi tầng chỉ có cấu trúc trong danh sách; `$(pwd)` (builtin) chỉ
  mất ưu đãi trước cấu trúc đổi được builtin. Truy vấn nhánh hiện tại chỉ tính ở refspec `git push`.
- F5/R1 (🟠/🔴): `env_parallel`/`parset`, `source`/`.` tên không có `/`, argv `parallel` từ trình thông dịch → BUDGET.
- R2 (🔴): chương trình đọc từ stdin/heredoc/cờ `-e` của công cụ ngoài danh sách đọc-dữ-liệu → BUDGET khi chạy lệnh có luật.
- R3 (🔴): xoá không đệ quy trong `.git` (trừ `*.lock`), `find`/xargs duyệt vào `.git`.
- R4–R6, R8 (🟠/🟢 chặn oan): ranh giới từ của `DYN_NAME_SET_RE`, `PATH` không che `$(pwd)`, ngăn xếp `pushd`/`popd` một
  tầng, địa chỉ sed từ biến vòng chữ số.

DENY: dạng tái hiện guard ở `b76d7af5` cho chạy. ALLOW: dạng lành phải chạy."""

from __future__ import annotations

import concurrent.futures
import contextlib
import itertools
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

H = chr(126)  # `~` dựng bằng chr: chữ xoá home không nằm nguyên văn trong tệp test
RF = "rm -rf"
WIPE = f"{RF} {H}"
UP = "/usr/bin/pwd"
BC = "BASH" + "_CMDS"
NONE, EXT, ALL = guard.SHADOW_NONE, guard.SHADOW_EXT, guard.SHADOW_ALL


def patched(root: Path = ROOT) -> contextlib.ExitStack:
    """Môi trường và nhánh giả cho quyết định — vào MỘT lần ở luồng chính: `mock.patch` vào/ra lồng nhau từ nhiều luồng
    trả giá trị gốc sai thứ tự và rò `_current_branch`/env sang module test sau (T-3949, AUD-TEST-119)."""
    stack = contextlib.ExitStack()
    stack.enter_context(mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(root), "XT_GUARD_POLICY": ""}))
    stack.enter_context(mock.patch.object(guard, "_current_branch", return_value="feat"))
    return stack


def decide_raw(cmd: str, root: Path = ROOT) -> dict:
    return guard.apply_policy(guard.bash_decision(cmd, str(root), str(root)))


def decide(cmd: str, root: Path = ROOT) -> dict:
    with patched(root):
        return decide_raw(cmd, root)


SHADOW_DENY = (
    # F1: BASH_CMDS, P''ATH, trap DEBUG định nghĩa hàm, printf -v vào BASH_CMDS
    f'{BC}[date]={UP}; cd {H} && {RF} "$(date +%F)"',
    f'{BC}[mktemp]={UP}; cd {H} && {RF} "$(mktemp)"',
    f"{BC}['date']={UP}; cd {H} && {RF} \"$(date +%s)\"",
    f'while :; do {BC}[date]={UP}; cd {H} && {RF} "$(date +%F)"; break; done',
    f"export P''ATH=/tmp/zq:$PATH; cd /etc && {RF} \"$(date -I)/ssl\"",
    f"trap 'date(){{ echo /etc; }}' DEBUG; :; {RF} \"$(date -I)/ssl\"",
    f"printf -v '{BC}[date]' %s {UP}; cd {H} && {RF} \"$(date -I)\"",
    # F2: PATH ghi qua builtin, tên có nháy/thoát/brace/ANSI-C/động, nameref, số học
    f'read PATH <<< /tmp/zq:$PATH; cd {H} && {RF} "$(date +%F)"',
    f'printf -v PATH %s /tmp/zq:$PATH; cd {H} && {RF} "$(date +%F)"',
    f"printf -v P''ATH %s /tmp/zq:$PATH; cd {H} && {RF} \"$(date +%F)\"",
    f'export PA\\TH=/tmp/zq:$PATH; cd {H} && {RF} "$(date +%F)"',
    f"declare P''ATH=/tmp/zq:$PATH; cd {H} && {RF} \"$(date +%F)\"",
    f'export {{P,}}ATH=/tmp/zq:$PATH; cd {H} && {RF} "$(date +%F)"',
    f'declare -n Z=PATH; Z=/tmp/zq:$PATH; cd {H} && {RF} "$(date +%F)"',
    f"export $'P\\x41TH'=/tmp/zq:$PATH; cd {H} && {RF} \"$(date +%F)\"",
    f'n=PATH; declare "$n=/tmp/zq:$PATH"; cd {H} && {RF} "$(date +%F)"',
    f': $((PATH=0)); cd {H} && {RF} "$(date +%F)/ssl"',
    f'mapfile -t PATH <<< /tmp/zq; cd {H} && {RF} "$(date +%F)"',
    f'export LD_PRELOAD=/tmp/x.so; cd /etc && {RF} "$(date +%F)/ssl"',
    f'x=PA; y=TH; z=$x$y=0; : $((z)); cd {H} && {RF} "$(date +%F)"',
    # F3: thân trap
    f"trap 'date(){{ echo /etc; }}' DEBUG; :; {RF} \"$(date +%F)/ssl\"",
    f"trap 'hash -p {UP} mktemp' DEBUG; :; cd {H} && {RF} \"$(mktemp)\"",
    f"trap 'pwd(){{ echo /etc; }}' DEBUG; :; {RF} \"$(pwd)/ssl\"",
    f'trap "$T" DEBUG; :; {RF} "$(pwd)/ssl"',
    # F4: truy vấn nhánh ở đích đường dẫn (HEAD tách rời → rỗng)
    f'{RF} "$(git branch --show-current)/etc"',
    f'{RF} "/$(git symbolic-ref --short HEAD)"',
    f'cd /etc && {RF} "$(git rev-parse --abbrev-ref HEAD)/ssl"',
    'source ./x.sh; git push origin "$(git branch --show-current):main"',
)

SHADOW_ALLOW = (
    f'export PATH="$HOME/.local/bin:$PATH" && {RF} "$(pwd)/build"',  # R5: PATH không che builtin `pwd`
    f'PATH=/usr/local/bin:$PATH {RF} "$(pwd)/dist"',
    f'export PATH="$PWD/node_modules/.bin:$PATH" && {RF} "$(pwd)/dist"',
    f'cd build && {RF} "$(date +%F)"',
    f'TMP=$(mktemp -d) && {RF} "$TMP"',
    f'{RF} "$(mktemp -d)"',
    'mv a.log "logs/$(date +%F).log"',
    f'set -euo pipefail; TMP=$(mktemp -d); trap \'{RF} "$TMP"\' EXIT; cd "$TMP" && ls',
    f'trap "{RF} $TMP" EXIT; {RF} "$(mktemp -d)"',
    f'export V=1; declare -x W=2; readonly R=3; local L 2>/dev/null; {RF} "$(mktemp -d)"',
    f'command -v jq >/dev/null && {RF} "$(mktemp -d)"',
    f'echo "$PATH" "${{PATH%%:*}}" && {RF} "$(mktemp -d)"',
    f'echo $((1 + 2)) && {RF} "$(mktemp -d)"',
    'git push -u origin "$(git branch --show-current)"',
    'git push origin "$(git rev-parse --abbrev-ref HEAD)"',
    'cd web && rm -rf dist && echo "build ready: $(date +%T)"',
)


class ShadowTest(unittest.TestCase):
    def test_deny(self):
        for cmd in SHADOW_DENY:
            with self.subTest(cmd=cmd):
                self.assertEqual(decide(cmd)["decision"], "deny")

    def test_allow(self):
        for cmd in SHADOW_ALLOW:
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertEqual(d["decision"], "", d.get("reason"))

    def test_concurrent_decisions_match_sequential(self):
        """`SHADOW` là ContextVar theo luồng, mức nhớ (`lru_cache`) không trộn tầng giữa các quyết định đồng thời."""
        cmds = [*SHADOW_DENY[:8], *SHADOW_ALLOW[:8]] * 3
        before = guard._current_branch, os.environ.get("XT_GUARD_POLICY"), os.environ.get("CLAUDE_PROJECT_DIR")
        with patched():
            seq = [decide_raw(c)["decision"] for c in cmds]
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
                par = list(pool.map(lambda c: decide_raw(c)["decision"], cmds))
        self.assertEqual(par, seq)
        after = guard._current_branch, os.environ.get("XT_GUARD_POLICY"), os.environ.get("CLAUDE_PROJECT_DIR")
        self.assertEqual(after, before)  # không rò patch sang test sau


class ShadowLevelTest(unittest.TestCase):
    """Mức che của từng cấu trúc (danh sách đóng — mỗi nhánh của `_shadow_level`)."""

    def test_levels(self):
        cases = {
            # chữ: tên nhạy ở chỗ không phải đọc
            "export BASH_ENV=./x.sh": ALL,
            "env 'BASH_FUNC_date%%=() { :; }' bash -c date": ALL,
            "BASH_ALIASES[date]=x": ALL,
            "PATH=. date": EXT,
            "echo ${PATH:=/tmp}": EXT,
            "echo $PATH ${PATH} ${#PATH} ${PATH%%:*} ${!PATH}": NONE,
            "GIT_DIR=/x git status": EXT,
            "IFS=/ read a": EXT,
            # số học
            "echo $((i+1))": EXT,
            "echo $((1+2)) $[3]": EXT,
            "echo $((1 + 2))": NONE,
            "(( n++ ))": EXT,
            "a[i]=1": EXT,
            "echo ${s:n}": EXT,
            "[[ $a -eq 1 ]]": EXT,
            "a[0]=1; echo ${a[0]}": NONE,
            # định nghĩa hàm, không đọc chắc
            "f(){ :; }": ALL,
            "function f { :; }": ALL,
            "echo 'x": ALL,
            # tên lệnh
            '"$X" -v': ALL,
            "${Y} a": ALL,
            "$(echo eval) b": ALL,
            "ev?l c": ALL,
            "{e,}val d": ALL,
            "[ -f x ]": NONE,
            "./eval x": NONE,
            "/usr/bin/env x": NONE,
            "time -p ls": NONE,
            "time eval x": ALL,
            "! export A=1": NONE,
            "if true; then X=1 y; fi; for a in 1 2; do echo $a; done": NONE,
            "case x in a) eval x;; esac": ALL,
            'case "$1" in *) echo;; esac; [[ -f "$f" ]]': NONE,
            "command -v jq": NONE,
            "command -V jq": NONE,
            "command -v eval": ALL,  # tên sau trình bọc cũng xét (chặt: không phân biệt truy vấn)
            "nice -n 5 hash -p /x date": ALL,
            "command eval x": ALL,
            "builtin eval y": ALL,
            "builtin cd /": NONE,
            "command": NONE,
            "eval x": ALL,
            "source ./x": ALL,
            ". ./x": ALL,
            "alias a=b": ALL,
            "hash -p /x date": ALL,
            "enable -n pwd": ALL,
            "let x=1": EXT,
            "cd /; pwd; echo; true; set -e; shopt -s nullglob; exec 3>&1": NONE,
            # trap
            "trap 'date(){ :; }' EXIT": NONE,
            "trap -- 'x(){ :; }' 0 SIGEXIT": NONE,
            "trap -p DEBUG": NONE,
            "trap -l": NONE,
            "trap INT": NONE,
            'trap "$T" DEBUG': ALL,
            "trap 'echo $x' DEBUG": NONE,
            "trap 'hash -p /x d' DEBUG": ALL,
            "trap 'PATH=/x' ERR": EXT,
            # builtin ghi biến theo tên
            "declare -f f": ALL,
            "typeset -F": ALL,
            "declare -n r=x": EXT,
            "local -i n=1": EXT,
            "export A=1 B+=2 C[0]=3 D": NONE,
            "export 'A=1'": EXT,
            "readonly $n": EXT,
            "read -r -p 'Tên: ' a b": NONE,
            'read -r "$n"': EXT,
            "read -a 'x[0]'": EXT,
            "mapfile -t -d '' lines": NONE,
            "getopts ab: opt": NONE,
            'getopts ab: "$o"': EXT,
            "printf -v out %s x": NONE,
            "printf -vout %s x": NONE,
            'printf -v "$o" %s x': EXT,
            "printf '%s' x": NONE,
            "wait -p pid": NONE,
            'wait -p "$v"': EXT,
            "unset -v a b": NONE,
            'unset "$n"': EXT,
        }
        for cmd, want in cases.items():
            with self.subTest(cmd=cmd):
                self.assertEqual(guard._shadow_level(cmd), want)

    def test_unreadable(self):
        """Bộ tách lệnh đơn không chắc (lỗi tập con hay None) → `SHADOW_ALL` (mặc định chặt)."""
        with mock.patch.object(guard, "_simple_cmds", side_effect=guard.ScanTooComplex("x")):
            self.assertEqual(guard._shadow_level("echo t3945-raise"), ALL)
        with mock.patch.object(guard, "_simple_cmds", return_value=None):
            self.assertEqual(guard._shadow_level("echo t3945-none"), ALL)

    def test_layers(self):
        self.assertEqual(guard._shadow(), NONE)
        token = guard.SHADOW.set(("echo x", "PATH=. y", "echo z"))
        try:
            self.assertEqual(guard._shadow(), EXT)
            self.assertEqual(guard._trusted_call("date +%F"), [])
            self.assertEqual(guard._trusted_call("pwd", EXT), ["pwd"])
            self.assertIn("$PWD", guard.tokenize("echo $(pwd)"))  # PATH không che builtin
            self.assertFalse(guard._subst_computed('"$(date +%F)"', 1))
            self.assertTrue(guard._subst_computed('"$(pwd)"', 1))
        finally:
            guard.SHADOW.reset(token)

    def test_subst_computed(self):
        sub = guard._subst_computed
        self.assertTrue(sub('"$(mktemp -d)"', 1))
        self.assertFalse(sub('"$(mktemp "$(x)")"', 1))
        self.assertTrue(sub('"$(date -I)"', 1))
        self.assertFalse(sub('"$(git branch --show-current)"', 1))
        self.assertTrue(sub('"$(git branch --show-current)"', 1, True))
        self.assertFalse(sub('"$(id -u)"', 1, True))
        self.assertFalse(sub('"${x}"', 1))


# Ma trận che × giá trị tính được × lớp bọc (như `test_guard_signoff7`, các cách che của cổng ký lần 7)
USES = {
    "date": f'cd {H} && {RF} "$(date +%F)"',
    "dateiso": f'cd /etc && {RF} "$(date -I)/ssl"',
    "mktemp": f'cd {H} && {RF} "$(mktemp -d)"',
}
SHADOWS = {
    "bc": f"{BC}[{{N}}]={UP}; ",
    "bcq": f"{BC}['{{N}}']={UP}; ",
    "bcplus": f"{BC}+=([{{N}}]={UP}); ",
    "bcdecl": f"declare -A {BC}=([{{N}}]={UP}); ",
    "pathq": "export P''ATH=/tmp/zq:$PATH; ",
    "pathesc": "export PA\\TH=/tmp/zq:$PATH; ",
    "pathread": "read PATH <<< /tmp/zq; ",
    "pathprintf": "printf -v PATH %s /tmp/zq; ",
    "pathmap": "mapfile -t PATH <<< /tmp/zq; ",
    "pathref": "declare -n R=PATH; R=/tmp/zq; ",
    "patharith": ": $((PATH=0)); ",
    "trapfn": "trap '{N}(){ echo /etc; }' DEBUG; :; ",
    "traphash": f"trap 'hash -p {UP} {{N}}' DEBUG; :; ",
    "ldpre": "export LD_PRELOAD=/tmp/x.so; ",
    "execignore": "EXECIGNORE=/usr/bin/{N}; ",
}
WRAPS = {
    "bare": "{B}",
    "brace": "{{ {B}; }}",
    "sub": "( {B} )",
    "if": "if true; then {B}; fi",
    "while": "while :; do {B}; break; done",
    "bashc": "bash -c '{B}'",
}


def shadow_matrix() -> list[tuple[str, str]]:
    out = []
    for (u, use), (s, sdef), (w, wrap) in itertools.product(USES.items(), SHADOWS.items(), WRAPS.items()):
        name = "date" if u.startswith("date") else u
        body = sdef.replace("{N}", name) + use
        if "'" in body and w == "bashc":
            continue
        out.append((f"{u}|{s}|{w}", wrap.format(B=body)))
    return out


class ShadowMatrixTest(unittest.TestCase):
    def test_matrix_denied(self):
        leaked = [k for k, cmd in shadow_matrix() if decide(cmd)["decision"] not in ("deny", "ask")]
        self.assertEqual(leaked, [])


PARALLEL_DENY = (
    f". env_parallel.bash; env_parallel {{1}}{{2}} -rf {H} ::: r ::: m",
    f"source env_parallel.bash; env_parallel {{1}}{{2}} -rf {H} ::: r ::: m",
    f"parset v {{1}}{{2}} -rf {H} ::: r ::: m",
    "PATH=/tmp/zq:$PATH; . x.sh",  # lệnh ghi PATH: tệp tra PATH không biết
)
PY = "python3 -c 'import subprocess; subprocess.{}([{}])'"
PAR = f'"parallel","eval",":::","{WIPE}"'
RUNNER_DENY = (
    PY.format("run", PAR),
    PY.format("Popen", PAR),
    PY.format("call", '"timeout","5",' + PAR),
    PY.format("check_output", '"env",' + PAR),
    PY.format("run", '"xargs","-0",' + PAR),
    f'python3 -c \'import os; os.spawnlp(os.P_WAIT,"parallel","parallel","eval",":::","{WIPE}")\'',
    f'node -e \'require("child_process").spawnSync("parallel",["eval",":::","{WIPE}"])\'',
    f'perl -e \'system("parallel","eval",":::","{WIPE}")\'',
)
RUNNER_ALLOW = (
    'python3 -c \'import subprocess; subprocess.run(["git", "status"])\'',
    ". ./scripts/env.sh && make build",
    "source .venv/bin/activate && pytest -q",
    "test -f .env && source .env",  # không có trong PATH: bash đọc tệp ở thư mục hiện tại
)


class ParallelRunnerTest(unittest.TestCase):
    def test_deny(self):
        for cmd in (*PARALLEL_DENY, *RUNNER_DENY):
            with self.subTest(cmd=cmd):
                self.assertEqual(decide(cmd)["decision"], "deny")

    def test_allow(self):
        for cmd in RUNNER_ALLOW:
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertEqual(d["decision"], "", d.get("reason"))

    def test_source_on_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, "env_parallel.bash").write_text("", encoding="utf-8")
            with mock.patch.dict(os.environ, {"PATH": f"{tmp}{os.pathsep}{os.pathsep}/usr/bin"}):
                self.assertEqual(decide(". env_parallel.bash")["decision"], "deny")
                self.assertEqual(decide("source -- env_parallel.bash")["decision"], "deny")
                self.assertEqual(decide("source ./env_parallel.bash")["decision"], "")
                self.assertEqual(decide("source nope.bash")["decision"], "")


STDIN_DENY = (
    f"make -f - <<'D'\nall: ; {WIPE}\nD",
    f"make -f /dev/stdin <<'D'\nall: ; {WIPE}\nD",
    f"printf 'all: ; {WIPE}\\n' | make -f -",
    f"make --eval='all: ; {WIPE}'",
    "make -E 'all: ; :'",
    f"gmake -f- <<'D'\nall: ; {WIPE}\nD",
    f"make --file=- <<'D'\nall: ; {WIPE}\nD",
    f"ed -s f <<'D'\n!{WIPE}\nq\nD",
    f"ex -s f <<'D'\n!r\\m -rf {H}\nD",
    f"sqlite3 x.db <<'D'\n.shell {WIPE}\nD",
    f"gdb -batch <<'D'\nshell {WIPE}\nD",
    f"at now <<'D'\n{WIPE}\nD",
    f"printf '* * * * * {WIPE}\\n' | crontab -",
    f"cat <<'D' | crontab -\n* * * * * {WIPE}\nD",
    f"crontab - <<< '* * * * * {WIPE}'",
    f"tclsh <<'D'\nexec {WIPE}\nD",
    f"psql <<'D'\n\\! {WIPE}\nD",
    f"Rscript -e 'system(\"{WIPE}\")'",
    f"psql -c '\\! {WIPE}'",
    f"mysql --execute='system {WIPE}'",
    f"dc <<'D'\n!{WIPE}\nD",
    f"expect <<'D'\nspawn {WIPE}\nD",
    "sqlite3 x.db <<'D'\n.shell echo $(id)\nD",
    f"sed -f - f <<'D'\n1e {WIPE}\nD",
    f"awk -f /dev/stdin f <<'D'\nBEGIN {{ system(\"{WIPE}\") }}\nD",
)
STDIN_ALLOW = (
    "cat > notes.txt <<'EOF'\nhello git world\nEOF",
    "git commit -F - <<'EOF'\nfix: dọn rm tạm\nEOF",
    "gh pr create --title 'docs: ghi chú' --body-file - <<'EOF'\nfind lỗi, sửa env\nEOF",
    "psql -d x <<'EOF'\nselect 1;\nEOF",
    "make -f build.mk all",
    "make test",
    "grep -e 'git push' notes.txt",
    "sed -f fix.sed notes.txt",
    "printf 'a\\nb\\n' | sort | uniq",
    "while read -r l; do echo \"$l\"; done <<'EOF'\na\nEOF",
    "jq . <<< '{\"a\": 1}'",
    "Rscript -e 'print(1)'",
)


class StdinProgramTest(unittest.TestCase):
    def test_deny(self):
        for cmd in STDIN_DENY:
            with self.subTest(cmd=cmd):
                self.assertEqual(decide(cmd)["decision"], "deny")

    def test_allow(self):
        for cmd in STDIN_ALLOW:
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertEqual(d["decision"], "", d.get("reason"))

    def test_helpers(self):
        self.assertFalse(guard._stdin_prog(["bash"]))
        self.assertFalse(guard._stdin_prog(["python3", "-"]))
        self.assertTrue(guard._stdin_prog(["tclsh"]))
        self.assertTrue(guard._stdin_prog(["sed", "-f", "-"]))
        self.assertFalse(guard._stdin_prog(["sed", "-f", "x.sed"]))
        self.assertFalse(guard._stdin_script(["cat", "-f", "-"]))
        self.assertTrue(guard._stdin_script(["awk", "--file=/dev/stdin"]))
        self.assertFalse(guard._inline_prog(["grep", "-e", "git push"]))
        self.assertFalse(guard._inline_prog(["Rscript", "-e"]))
        self.assertFalse(guard._inline_prog(["docker", "run", "img", "sh", "-c", "rm -rf x"]))  # phần sau: lệnh khác
        self.assertFalse(guard._inline_prog(["tool", "-c", "rm -rf x"]))  # `-c` chỉ ở client CSDL
        self.assertFalse(guard._inline_prog(["capsh", "--", "-c", "rm -rf x"]))
        self.assertTrue(guard._stdin_body_runs("echo `id`"))
        self.assertFalse(guard._stdin_body_runs("select 1;"))
        self.assertEqual(guard._stdin_prog_why("echo x"), "")


GIT_DENY = (
    "rm -f .git/objects/pack/*.pack",
    "rm -f .git/HEAD",
    "rm .git/index",
    "rm -f .git/refs/heads/main",
    "unlink .git/HEAD",
    "shred -u .git/HEAD",
    "cd .git && rm -f HEAD",
    "rm -f ./.git//HEAD x/../.git/ORIG_HEAD",
    "rm -f .gi?/HEAD",
    "find . -name '*.pack' | xargs rm -f",
    "find .git -name '*.pack' | xargs rm -f",
    "find . -name HEAD | xargs rm -f",
    "find .git/objects -type f | xargs rm -f",
    "find ./sub/../.git -name x | xargs rm -f",
)
GIT_ALLOW = (
    "rm -f .git/index.lock",
    "rm -f .git/refs/heads/x.lock .git/*.lock",
    "rm -f .gitignore",
    "rm -f .git",  # chính `.git` (tệp gitdir của worktree): luật cũ cho qua, không đệ quy
    "rm -f .gi?",
    "rm -f *.log",
    "find . -name '*.orig' | xargs rm -f",
    "find src -name '*.pyc' | xargs rm -f",
)


class GitInnerTest(unittest.TestCase):
    def test_deny(self):
        for cmd in GIT_DENY:
            with self.subTest(cmd=cmd):
                self.assertEqual(decide(cmd)["decision"], "deny")

    def test_allow(self):
        for cmd in GIT_ALLOW:
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertEqual(d["decision"], "", d.get("reason"))

    def test_helper(self):
        inner = guard._git_inner
        self.assertFalse(inner(".git/HEAD", "", None))
        self.assertFalse(inner("~-/.git/HEAD", str(ROOT), None))
        self.assertFalse(inner("$X/.git/HEAD", str(ROOT), None))
        self.assertTrue(inner(".git/HEAD", str(ROOT), None))
        self.assertFalse(inner("*/HEAD", str(ROOT), None))
        self.assertTrue(inner(f"{ROOT}/.g*/HEAD", str(ROOT), None))
        code = decide("rm -f .git/HEAD")["code"]
        self.assertEqual(code, "WIPE_OUTSIDE")


FALSE_BLOCK_ALLOW = (
    'cd web && rm -rf .next dist && npm run build && echo "ready on $PORT"',  # R4
    'cd web && readlink -f "$PWD" && rm -rf dist',
    'cd docs && rm -f _build/a.html && echo "see readme.md for $X"',
    'cd web && rm -rf dist && evaluate "$X"',
    "pushd web && npm ci && popd && rm -rf dist",  # R6
    "pushd web >/dev/null && npm ci && popd >/dev/null && rm -rf dist",
    "pushd /tmp && popd && rm -rf zz",
    'for n in 10 30; do sed -n "${n}p" f; done',  # R8
    'for n in 10 30; do sed -i "${n}d" f; done',
)
FALSE_BLOCK_DENY = (
    "cd ~ && pushd /tmp && popd && rm -rf zz",  # F3-SEC-877 giữ chặn
    "cd /etc && pushd /tmp >/dev/null && popd >/dev/null ; rm -rf ssl",
    "pushd web && popd && popd && rm -rf dist",
    "pushd web && pushd ~ && popd && popd && rm -rf dist",
    'pushd "$X" && popd && rm -rf dist',
    "pushd -n ~ && popd && rm -rf dist",
    "for d in a b; do popd; pushd web; done; rm -rf dist",
    "pushd web && popd +1 && rm -rf dist",
    "cd ~ && pushd web; popd; rm -rf .ssh",
    "pushd . >/dev/null; DIRSTACK[1]=/etc; popd >/dev/null; rm -rf ssl",  # ngăn xếp bị sửa: popd về đâu không biết
    "pushd . >/dev/null; read 'DIRSTACK[1]' <<< /etc; popd >/dev/null; rm -rf ssl",
    'pushd web; printf -v "$n" %s /etc; popd; rm -rf ssl',
    'for n in 10 3x; do sed -n "${n}p" f; done',
    'for n in 1 2; do n=x; sed -n "${n}p" f; done',
    'for n in "1;e id" 2; do sed -n "${n}p" f; done',
    'cd web && read -r "$X" && rm -rf dist',
)


class FalseBlockTest(unittest.TestCase):
    def test_allow(self):
        for cmd in FALSE_BLOCK_ALLOW:
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertEqual(d["decision"], "", d.get("reason"))

    def test_deny(self):
        for cmd in FALSE_BLOCK_DENY:
            with self.subTest(cmd=cmd):
                self.assertEqual(decide(cmd)["decision"], "deny")

    def test_dyn_name_boundary(self):
        rx = guard.DYN_NAME_SET_RE
        for text in ('echo "ready on $P"', 'readlink "$PWD"', "readme $X", "evaluate $X", "readFile $X"):
            with self.subTest(text=text):
                self.assertIsNone(rx.search(text))
        for text in ('read "$N"', "eval $X", "mapfile -t $A", 'printf -v "$N" x'):
            with self.subTest(text=text):
                self.assertIsNotNone(rx.search(text))

    def test_cwd_stack(self):
        placed = guard._commands_with_cwds(guard.tokenize("cd /etc && pushd /tmp && popd && rm -rf ssl"), str(ROOT))
        self.assertIn("/etc", placed[-1][1])
        placed = guard._commands_with_cwds(guard.tokenize("pushd a; pushd b; popd; ls"), str(ROOT))
        self.assertIn(None, placed[-1][1])


if __name__ == "__main__":
    unittest.main()
