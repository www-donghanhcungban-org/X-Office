"""D-503 (T-3943): phát hiện cổng ký lần 7 — GNU `parallel`/`sem` chạy chuỗi lệnh từ `:::`/`::::`/stdin/đối số
(AUD-SEC-887, 🔴: mặc định chặn), `$(pwd)` trong thân shell lồng thay bằng `$PWD` ở tầng ngoài trước khi tầng lồng thấy
`pwd(){ …; }` (AUD-SEC-890, 🔴: luật che tên của T-3942 không áp qua `bash -c '…'`), hạn giờ ở bản thay biến/sed lớn
(AUD-SEC-888, 🟢).

DENY: mẫu tái hiện mà guard ở `1b462999` cho chạy. ALLOW: dạng lành phải chạy. Ma trận che tên: mọi giá trị guard tính
được (`$(pwd)`, `$(date …)`, `$(mktemp …)`, truy vấn nhánh, `$(cat TỆP)` trong sed) × mọi cách che tên × mọi lớp bọc."""

from __future__ import annotations

import itertools
import os
import sys
import time
import unittest
import unittest.mock as mock
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("XT_GUARD_PHASE", "harden")
sys.path.insert(0, str(ROOT / ".claude" / "hooks"))
import guard

H = chr(126)  # `~` dựng bằng chr: chữ xoá home không nằm nguyên văn trong tệp test
FP = "git push " + "--force origin main"  # đẩy đè nhánh chính
WIPE = "rm -rf " + H


def decide(cmd: str, root: Path = ROOT) -> dict:
    with (
        mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(root), "XT_GUARD_POLICY": ""}),
        mock.patch.object(guard, "_current_branch", return_value="feat"),
    ):
        return guard.apply_policy(guard.bash_decision(cmd, str(root), str(root)))


PARALLEL_DENY = (
    # AUD-SEC-887: các dạng nêu trong báo cáo
    f"parallel bash -c ::: '{FP}'",
    f"parallel eval ::: '{FP}'",
    f"echo '{FP}' | parallel",
    f"sem '{FP}'",
    f"parallel -j2 '{FP}' ::: x",
    f"parallel sh -c ::: '{WIPE}'",
    f"printf '%s\\n' '{WIPE}' | parallel -j4",
    "parallel :::: cmds.txt",
    "parallel -a cmds.txt",
    f"sem --fg '{WIPE}'",
    f"sem -j+0 '{WIPE}'; sem --wait",
    # sau gán/trình bọc
    f"PARALLEL=-j2 parallel eval ::: '{WIPE}'",
    f"env parallel eval ::: '{WIPE}'",
    f"env -S 'parallel eval' ::: '{WIPE}'",
    f"env --split-string='sem {WIPE}'",
    f"nice -n 5 parallel eval ::: '{WIPE}'",
    f"timeout 30 sem '{WIPE}'",
    f"command parallel eval ::: '{WIPE}'",
    f"exec sem '{WIPE}'",
    f"nohup parallel eval ::: '{WIPE}'",
    f"stdbuf -oL parallel eval ::: '{WIPE}'",
    f"setsid sem '{WIPE}'",
    f"time parallel eval ::: '{WIPE}'",
    f"xargs parallel eval ::: '{WIPE}'",
    f"busybox parallel eval ::: '{WIPE}'",
    f"watch -n1 sem '{WIPE}'",
    f"flock /tmp/l sem '{WIPE}'",
    f"uv run sem '{WIPE}'",
    f"direnv exec . sem '{FP}'",
    f"nix develop -c sem '{WIPE}'",
    # shell lồng
    f"sh -c \"parallel eval ::: '{WIPE}'\"",
    f"bash -c 'sem \"{WIPE}\"'",
    f"eval 'sem \"{WIPE}\"'",
    f"bash <<'EOF'\nsem '{WIPE}'\nEOF",
    # tên bị che: nháy, thoát, đường dẫn, glob, brace, `$'…'`
    f"'par''allel' eval ::: '{WIPE}'",
    f'"sem" "{WIPE}"',
    f"par\\allel eval ::: '{WIPE}'",
    f"\\sem '{WIPE}'",
    f"/usr/bin/parallel eval ::: '{WIPE}'",
    f"./sem '{WIPE}'",
    f"$'parallel' eval ::: '{WIPE}'",
    f"paralle[l] eval ::: '{WIPE}'",
    f"se? '{WIPE}'",
    f"par[^x]llel eval ::: '{WIPE}'",
    f"{{parallel,eval}} ::: '{WIPE}'",
    # không có dạng hẹp an toàn: cả lệnh lành tên parallel/sem
    "parallel --version",
    "parallel echo ::: a b",
    "parallel gzip ::: *.log",
    "sem --wait",
)

PARALLEL_ALLOW = (
    "echo parallel is great",
    "git commit -m 'run tests in parallel'",
    "grep -rn parallel docs",
    "ls sem",
    "cat parallel.txt",
    "pytest -k parallel",
    "pytest -k sem",
    "make parallel",
    "parallel_x echo",
    "semx a",
    "[ -f sem ]",
    "sem[a] x",
    "for x in a b; do echo $x; done",
    "echo a & echo b & wait",
)


class ParallelTest(unittest.TestCase):
    def test_deny(self):
        for cmd in PARALLEL_DENY:
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertEqual(d["decision"], "deny", d.get("reason"))

    def test_budget_reason(self):
        d = decide(f"parallel eval ::: '{FP}'")
        self.assertEqual(d.get("code"), "BUDGET")
        self.assertIn("AUD-SEC-887", d["reason"])

    def test_allow(self):
        for cmd in PARALLEL_ALLOW:
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertEqual(d["decision"], "", d.get("reason"))

    def test_helpers(self):
        self.assertEqual(guard._parallel_why("echo parallel"), "")
        self.assertEqual(guard._parallel_why("a 'b"), "")  # không tách được: luật khác chặn
        self.assertIn("parallel", guard._parallel_why("env -S 'parallel x'"))
        name = guard._parallel_name
        self.assertTrue(name("sem"))
        self.assertTrue(name("p*l"))
        self.assertFalse(name("*"))  # glob trần: mẫu `case`, D-155
        self.assertFalse(name("s*"))
        self.assertFalse(name("semx"))
        self.assertFalse(name("[a]"))
        self.assertFalse(name("["))


# --- AUD-SEC-890: ma trận che tên × giá trị tính được × lớp bọc ---------------------------------------------------
# Thân chỉ dùng nháy kép (lớp bọc dùng nháy đơn). `{N}` = tên bị che, `{O}` = chữ hàm giả in ra.
USES = {
    "pwd": ("pwd", "/etc", 'rm -rf "$(pwd)/ssl"'),
    "pwdtick": ("pwd", "/etc", "rm -rf `pwd`/ssl"),
    "pwdcd": ("pwd", "/etc", 'cd "$(pwd)" && rm -rf ssl'),
    "pwdvar": ("pwd", "/etc", 'X=$(pwd); rm -rf "$X/ssl"'),
    "pwdflag": ("pwd", "-rf", 'rm "$(pwd)" ' + H),
    "date": ("date", "/etc/ssl", 'rm -rf "$(date +%F)"'),
    "dateiso": ("date", "/etc/ssl", 'rm -rf "$(date -I)"'),
    "mktemp": ("mktemp", "/etc/ssl", 'rm -rf "$(mktemp -d)"'),
    "branch": ("git", "/etc/ssl", 'rm -rf "$(git branch --show-current)"'),
    "sedcat": ("cat", "x/;1e " + WIPE + ";#", 'sed -i "s/x/$(cat VERSION)/" notes.txt'),
}
SHADOWS = {
    "fn": '{N}(){{ echo "{O}"; }}; ',
    "fnsp": '{N} () {{ echo "{O}"; }}; ',
    "fnkw": 'function {N} {{ echo "{O}"; }}; ',
    "fnsub": '{N}() ( echo "{O}" ); ',
    "evalfn": 'eval "{N}(){{ echo \\"{O}\\"; }}"; ',
    "alias": 'alias {N}="echo {O}"; ',
    "hash": "hash -p /usr/bin/printf {N}; ",
    "path": "PATH=/tmp/zq:/usr/bin; ",
    "source": "source ./x.sh; ",
    "dot": ". ./x.sh; ",
    "enable": "enable -n {N}; ",
    "declare": "declare -f {N} >/dev/null; ",
}
WRAPS = {
    "bare": "{B}",
    "shc": "sh -c '{B}'",
    "bashc": "bash -c '{B}'",
    "bashlc": "bash -lc '{B}'",
    "nice": "nice bash -c '{B}'",
    "timeout": "timeout 30 sh -c '{B}'",
    "env": "env X=1 bash -c '{B}'",
    "cmd": "command bash -c '{B}'",
    "xargs": "xargs -0 bash -c '{B}' < /dev/null",
    "find": "find . -maxdepth 0 -exec bash -c '{B}' \\;",
    "flock": "flock /tmp/l bash -c '{B}'",
    "eval": "eval '{B}'",
    "here": "bash <<'EOF'\n{B}\nEOF",
    "pipe": "printf '%s\\n' '{B}' | bash",
    "two": "bash -c 'sh -c \"{E}\"'",
    "three": 'sh -c \'bash <<"EOF"\nbash -c "{E}"\nEOF\n\'',
}


def _esc(body: str) -> str:
    """Thân trong nháy kép của tầng giữa: thoát `\\`, `"`, `$`, backtick."""
    return "".join("\\" + c if c in '\\"$`' else c for c in body)


def shadow_matrix() -> list[tuple[str, str]]:
    out = []
    for (u, (name, val, use)), (s, sdef), (w, wrap) in itertools.product(USES.items(), SHADOWS.items(), WRAPS.items()):
        if name == "pwd" and s == "path":  # T-3945 (R5): `pwd` là builtin — PATH không che (cho qua: ShadowLevelTest)
            continue
        body = sdef.format(N=name, O=val) + use
        out.append((f"{u}|{s}|{w}", wrap.format(B=body, E=_esc(body))))
    # hàm định nghĩa ở tầng ngoài, đưa vào shell con qua `export -f`/BASH_ENV
    for (u, (name, val, use)), (w, wrap) in itertools.product(USES.items(), WRAPS.items()):
        if w != "bare":
            inner = wrap.format(B=use, E=_esc(use))
            out.append((f"{u}|exportf|{w}", f'{name}(){{ echo "{val}"; }}; export -f {name}; {inner}'))
            out.append((f"{u}|bashenv|{w}", f"BASH_ENV=./x.sh {inner}"))
    return out


# Đối chứng: cùng giá trị tính được, không che tên, đích lành → cho qua ở mọi lớp bọc guard đọc được.
CLEAN_USES = (
    'rm -rf "$(pwd)/build"',
    'mv out.json "out-$(date -I).json"',
    'mv out.json "out-$(date -u +%Y%m%dT%H%M%SZ).json"',
    'TMP=$(mktemp -d); rm -rf "$TMP"',
    'sed -i "s/x/$(date -I)/" notes.txt',
)
CLEAN_WRAPS = ("bare", "shc", "bashc", "nice", "timeout", "env", "cmd")


class ShadowMatrixTest(unittest.TestCase):
    def test_matrix_denied(self):
        start = time.monotonic()
        leaked = [k for k, cmd in shadow_matrix() if decide(cmd)["decision"] not in ("deny", "ask")]
        self.assertEqual(leaked, [])
        self.assertLess(time.monotonic() - start, 120)

    def test_reported(self):
        for wrap in ("sh -c", "bash -c"):
            with self.subTest(wrap=wrap):
                d = decide(wrap + " 'pwd(){ echo /etc; }; rm -rf \"$(pwd)/ssl\"'")
                self.assertEqual(d["decision"], "deny", d.get("reason"))

    def test_clean_allowed(self):
        for use, w in itertools.product(CLEAN_USES, CLEAN_WRAPS):
            cmd = WRAPS[w].format(B=use, E=_esc(use))
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertEqual(d["decision"], "", d.get("reason"))

    def test_pwd_subst(self):
        sub = guard._pwd_subst
        self.assertEqual(sub('rm "$(pwd)/x"'), 'rm "$PWD/x"')
        self.assertEqual(sub("bash -c 'rm $(pwd)/x'"), "bash -c 'rm $(pwd)/x'")  # tầng lồng tự thay
        self.assertEqual(sub('bash -c "rm $(pwd)/x"'), 'bash -c "rm $PWD/x"')  # tầng này mở rộng nháy kép
        self.assertEqual(sub("echo `pwd`"), "echo `pwd`")  # backtick: ngoài tập con (`_CodeView.why`)
        self.assertEqual(sub("echo x"), "echo x")
        token = guard.SHADOW.set(("pwd(){ :; }",))
        try:
            self.assertEqual(sub("echo $(pwd)"), "echo $(pwd)")
        finally:
            guard.SHADOW.reset(token)


FIND_DEL = "find . -name x -delete"
HEREDOC_ALLOW = (
    f"cat > notes.md <<'EOF'\n{FIND_DEL}\nEOF",
    f'cat > notes.md <<"EOF"\n{FIND_DEL}\nEOF\n',
    f"cat <<'EOF' > docs/notes.md\n{FIND_DEL}\nEOF",
    f"cat >> notes.md <<'EOF'\n# ghi chú\n{FIND_DEL}\nxong\nEOF",
)
HEREDOC_DENY = (
    f"cat > notes.md <<EOF\n{FIND_DEL}\nEOF",  # delimiter không nháy
    f"cat > notes.md <<'EOF'\nEOF\n{FIND_DEL}\nEOF",  # bash đóng heredoc sớm: phần sau là lệnh
    f"cat > notes.md <<'EOF'\n{FIND_DEL}\nEOF\nfind . -delete",
    f"cat <<'EOF' | sh\n{FIND_DEL}\nEOF",
    f"cat > x.sh <<'EOF'\n{FIND_DEL}\nEOF\nbash x.sh",
    f"bash > out.txt <<'EOF'\n{FIND_DEL}\nEOF",
    f"sh <<'EOF' > out.txt\n{FIND_DEL}\nEOF",
    f"cat > notes.md <<-'EOF'\n{FIND_DEL}\nEOF",
    f"cat > \"$F\" <<'EOF'\n{FIND_DEL}\nEOF",
    f"cat > notes.md <<'EOF' && sh notes.md\n{FIND_DEL}\nEOF",
    f"cat > notes.md <<'EOF'\n{FIND_DEL}\nEOFX",
    f"cat > notes.md <<'EOF'\n{FIND_DEL}\nEOF\n{WIPE}",
)


class HeredocDataTest(unittest.TestCase):
    """AUD-SEC-889: heredoc dữ liệu (delimiter có nháy, `cat` ghi tệp, cả lệnh chỉ có vậy) không còn bị luật `find` xoá
    từ gốc (D-153) chặn oan; mọi heredoc vào shell/trình thông dịch, không nháy, hay kèm lệnh khác giữ chặn."""

    def test_allow(self):
        for cmd in HEREDOC_ALLOW:
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertEqual(d["decision"], "", d.get("reason"))

    def test_deny(self):
        for cmd in HEREDOC_DENY:
            with self.subTest(cmd=cmd):
                self.assertEqual(decide(cmd)["decision"], "deny")

    def test_head(self):
        head = guard._data_heredoc_head
        self.assertEqual(head(HEREDOC_ALLOW[0]), "cat > notes.md <<'EOF'")
        self.assertEqual(head("cat > notes.md <<'EOF'\nEOF"), "cat > notes.md <<'EOF'")  # thân rỗng
        self.assertEqual(head(HEREDOC_DENY[1]), HEREDOC_DENY[1])
        self.assertEqual(head("cat > a <<'EOF'\nx\nEND"), "cat > a <<'EOF'\nx\nEND")


class DeadlineTest(unittest.TestCase):
    """AUD-SEC-888: lệnh ~50 KB nhiều `sed`/nhiều `for` trả quyết định trong hạn `DECISION_SECONDS` (đo T-3943, máy rảnh:
    nhiều sed 16–20 s → 15,0 s; 45 s khi máy tải; nhiều for ~9 s). Ngưỡng rộng (30 s) để không giòn trên CI song song."""

    @staticmethod
    def _grow(part: str, sep: str, head: str = "") -> str:
        out: list[str] = []
        while len(head) + len(sep.join(out)) < 50_000:
            out.append(part.format(len(out)))
        return head + sep.join(out)

    def _timed(self, cmd: str) -> dict:
        start = time.monotonic()
        d = decide(cmd)
        self.assertLess(time.monotonic() - start, 30)
        return d

    def test_many_sed(self):
        d = self._timed(self._grow('sed -i "s/x{0}/$V/" f{0}.md', " && ", "V=1.2.3; "))
        self.assertEqual(d["decision"], "deny")

    def test_many_for(self):
        self._timed(self._grow('for f{0} in a{0}.txt b{0}.txt; do mv "$f{0}" "${{f{0}%.txt}}.md"; done', "; "))

    def test_var_scripts_tick(self):
        tokens = guard.tokenize("X=1; echo $X")
        with mock.patch.object(guard, "DEADLINE", guard.contextvars.ContextVar("D", default=-1.0)):
            with self.assertRaises(guard.ScanTimeout):
                guard._var_scripts(tokens)


if __name__ == "__main__":
    unittest.main()
