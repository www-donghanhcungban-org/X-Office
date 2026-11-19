"""D-502 (T-3929): lớp "giá trị guard không tính chắc ở vị trí đích/cờ của lệnh có luật" → BUDGET (D-415).

Mỗi ID một bộ DENY (mẫu tái hiện bằng bash thật, guard ở `b68527fc` cho chạy) và một bộ ALLOW (dạng lành gần nhất)."""

from __future__ import annotations

import os
import sys
import unittest
import unittest.mock as mock
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tests"))
import cpu_budget

os.environ.setdefault("XT_GUARD_PHASE", "harden")
sys.path.insert(0, str(ROOT / ".claude" / "hooks"))
import guard

H = chr(126)  # `~` dựng bằng chr: chữ xoá home không nằm nguyên văn trong tệp test


def decide(cmd: str) -> dict:
    with (
        mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(ROOT), "XT_GUARD_POLICY": ""}),
        mock.patch.object(guard, "_current_branch", return_value="feat"),
    ):
        return guard.apply_policy(guard.bash_decision(cmd.replace("@H", H), str(ROOT)))


DENY = {
    "AUD-SEC-821": (
        ': @H; rm -rf "$_"',
        ': --hard; git reset "$_"',
        ': --force; git push "$_" origin feat',
        'f() { :; }; f @H; rm -rf "$_"',
        'read <<< @H; rm -rf "$REPLY"',
        '[[ @H =~ .* ]]; rm -rf "$BASH_REMATCH"',
        ': @H; x="$_"; rm -rf "$x"',  # giá trị mờ truyền qua gán
        ': @H; for x in "$_"; do rm -rf "$x"; done',
        ': .autopilot/state.json; cp x "$_"',
        ': .autopilot/state.json; echo x > "$_"',  # đích chuyển hướng ghi ở lệnh không luật
        "bash -c ': @H; rm -rf \"$_\"'",
        'mapfile <<< @H; rm -rf "$MAPFILE"',
        'getopts a: o -a @H; rm -rf "$OPTARG"',
    ),
    "AUD-SEC-822": (
        "printf -v d '%s' --hard; git reset \"$d\"",
        "command printf -v d '%s' --hard; git reset \"$d\"",
        'X=1 printf -v d %s @H; rm -rf "$d"',
        'printf -v d %s @H; rm -rf "$d"',
        'X=HOME; rm -rf "${!X}"',
        'X=HOME; rm -r "${!X}"',
        'declare -n r=HOME; rm -rf "$r"',
        'n=d; printf -v "$n" %s @H; rm -rf "$x"',  # tên đích động: mọi biến thành mờ
    ),
    "AUD-SEC-823": (
        'rm -rf "${HOME:0:1}"',
        'rm -rf "${PWD%%/[a-z]*}/"',
        'rm -rf "${BASH%bin/bash}"',
        'rm -rf "${HOME%/*}"',
        'rm -rf "${HOME:?}"',
        'rm -rf "${OLDPWD%/}"',
        'rm -rf "${SHELL%/bin/*}"',
        'rm -rf "${0%bash}"',
        'rm -rf "${HOME-x}"',
    ),
    "AUD-SEC-820": (
        'set -o errexit -- @H; for x do rm -rf "$x"; done',
        "'set' -- @H; for x do rm -rf \"$x\"; done",
        'set -- @H; rm -rf "${!#}"',
        'set -- @H; n=1; rm -rf "${!n}"',
        'set -eo pipefail @H; for x; do rm -rf "$x"; done',
    ),
    "AUD-SEC-828": (
        "X=/homeX; rm -rf ${X/X}",
        "X=--hardX; git reset ${X/X}",
        "X=--hardX; git reset ${X/X/}",
        "X=--hardX; git reset ${X//X}",
        "X=force; git push ${X/#/--} origin feat/x",
        "read X <<< force; git push ${X/#/--} origin feat/x",
        "git push ${X/#/--} origin feat/x",
    ),
    "AUD-SEC-829": (
        "for X in /home/x; do rm -rf ${X%/x}; done",
        "for X in xx--hard; do git reset ${X:2}; done",
        "X=xx--hard; X=${X:2}; git reset $X",
        "X=12345678--hard; git reset ${X:010}",
        "X=12345678--hard; git reset ${X:0x8}",
    ),
    "AUD-SEC-830": (
        "d=/tmp/x; f() { rm -rf \"$d\"; }; trap 'd=@H' DEBUG; f",
        'd=/tmp/x; f() { rm -rf "$d"; }; n=d; printf -v "$n" %s @H; f',
        "trap 'd=@H' DEBUG; d=/tmp/x; rm -rf \"$d\"",
    ),
    # D-503: toán tử trên biến không gán chữ ở lệnh xoá — trước D-503 là ALLOW (chặt hơn, ghi ở CHANGELOG)
    "D-503": (
        'rm -rf "${TMPDIR%/}/x"',
        'rm -f "${f%.txt}.md"',
        'for f in *.txt; do rm -f "${f/.txt/.bak}"; done',
    ),
}

ALLOW = {
    "AUD-SEC-821": (
        'echo "$_"',
        'mkdir -p d && cd "$_"',
        "while read; do printf '%s\\n' \"$REPLY\"; done < f",
        '[[ $x =~ ^a ]] && echo "${BASH_REMATCH[0]}"',
        'for f in *.txt; do rm "$f"; done',
        'rm -rf "$TMPDIR/x"',
        'while read -r f; do echo "$f"; done',
        "rm -f '$_'",
        'mkdir -p build/out && cp README.md "$_"',  # D-503: `$_` tính được — bản thay quét như lệnh
    ),
    "AUD-SEC-822": (
        "printf -v d '%s' x; echo \"$d\"",
        'X=HOME; echo "${!X}"',
        'declare -n r=HOME; echo "$r"',
        'git log "${BRANCH:-main}"',
    ),
    "AUD-SEC-823": (
        'echo "${HOME%/*}"',
        'for f in *.txt; do mv "$f" "${f%.txt}.md"; done',
        'HOME=/tmp/h; rm -rf "${HOME%/h}/x"',
    ),
    "AUD-SEC-820": (
        'set -- a b; echo "$1"',
        "set -euo pipefail; echo hi",
        'set -o errexit -- a; for x do echo "$x"; done',
        "set -o pipefail; rm -rf build",
        'set -o pipefail; rm -f "$1"',
    ),
    "AUD-SEC-828": (
        "X=--hardX; echo ${X/X}",
        'X=a.txt; rm -f "${X/.txt/.bak}"',
        "X=feat/xX; git push origin ${X/X}",
    ),
    "AUD-SEC-829": (
        "for X in a b; do echo ${X%b}; done",
        'for X in a/x b/x; do rm -rf "${X%/x}"; done',
        'X=xxfeat; X=${X:2}; git push origin "$X"',
        "X=abc; git log ${X:1}",
    ),
    "AUD-SEC-830": (
        'd=/tmp/x; f() { rm -rf "$d"; }; f',
        "tmp=/tmp/x; trap 'rm -rf \"$tmp\"' EXIT; echo hi",
        "trap cleanup EXIT INT TERM; echo hi",
    ),
    "AUD-SEC-835": (
        'ext=.txt; f=a.txt; echo "${f%$ext}"',
        'echo "${f%.[a-z]*}"',
        'line="#x"; echo "${line#\\#}"',
        'f=a.txt; echo "${f%.[a-z]*}"',
    ),
}


class ValueClassTest(unittest.TestCase):
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

    def test_opaque_gate_is_budget(self):
        for cmd in (DENY["AUD-SEC-821"][3], DENY["AUD-SEC-822"][2], DENY["AUD-SEC-823"][0], DENY["AUD-SEC-820"][0]):
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertEqual(d.get("code"), guard.BUDGET)
                self.assertIn("viết lại", str(d["reason"]))

    def test_octal_offset_is_not_computed(self):
        m = guard.VAR_SLICE_RE.fullmatch("${X:010}")
        assert m is not None
        self.assertIsNone(guard._slice_value("12345678--hard", m))


class ValueHelperTest(unittest.TestCase):
    """Nhánh của bộ đọc giá trị (D-502) gọi thẳng."""

    def test_opaque_gate_edges(self):
        self.assertEqual(guard._opaque_value_why("rm -rf x"), "")  # không `$`
        with mock.patch.object(guard, "_simple_cmds", return_value=None):
            self.assertEqual(guard._opaque_value_why('rm -rf "$_"'), "")
        self.assertIsNone(guard._simple_cmds("a=(b"))
        self.assertEqual(guard._var_refs("plain"), set())
        self.assertEqual(guard._var_refs("'$_'"), set())
        self.assertFalse(guard._ruled_env_op("$HOME", set()))
        self.assertFalse(guard._ruled_env_op("${HOME%/*}", {"HOME"}))
        self.assertTrue(guard._ruled_env_op('"${PWD:0:1}"', set()))
        self.assertFalse(guard._ruled_env_op('"${PWD:?}" ${HOME?} ${HOME:+x} ${HOME/a/b}', set()))
        self.assertEqual(guard._opaque_checked(["echo", ">", '"$_"'], ["echo"]), [('"$_"', True)])
        self.assertEqual(guard._opaque_checked([], []), [])

    def test_ref_names(self):
        self.assertEqual(guard._seg_ref_names(["printf", "-vd", "%s", "x"]), ["d"])
        self.assertEqual(guard._seg_ref_names(["printf", "-v", '"$n"', "x"]), [guard.OPAQUE_ANY])
        self.assertEqual(guard._seg_ref_names(["local", "-n", "r=HOME"]), ["r"])
        self.assertEqual(guard._seg_ref_names(["read", '"$n"']), [guard.OPAQUE_ANY])
        self.assertEqual(guard._seg_ref_names(["read", "-r", "-p", "[$d]: ", "--", "b"]), [])
        self.assertEqual(guard._seg_ref_names(["getopts", "a:", '"$n"', "$@"]), [guard.OPAQUE_ANY])
        self.assertEqual(guard._seg_ref_names(["export", "a=1"]), [])
        self.assertEqual(guard._seg_ref_names(["rm", "x"]), [])
        self.assertEqual(guard._seg_ref_names([]), [])
        self.assertEqual(guard._seg_assigned(["select", "x", "in", "a"]), ["x"])
        names = guard._opaque_names([(["read", '"$n"'], ["read", '"$n"']), (["x=$_"], [])])
        self.assertIn(guard.OPAQUE_ANY, names)
        self.assertTrue(guard._opaque_ref({"d"}, {guard.OPAQUE_ANY}))
        self.assertFalse(guard._opaque_ref({"!"}, {guard.OPAQUE_ANY}))

    def test_trap_forms(self):
        for cmd in (
            "x=1",
            "trap 'rm -rf ./tmp' INT",
            "trap -p",
            "trap -l",
            "trap -- 'd=1' EXIT",
            "trap 'd=1' 0",
            "trap 'echo hi' INT",
            "trap",
        ):
            with self.subTest(cmd=cmd):
                self.assertEqual(guard._trap_assign_why(cmd), "")
        for cmd in (
            "trap -- 'd=1' INT",
            "trap f DEBUG",
            "trap 'read d' SIGTERM",
            "trap 'unset d' RETURN",
            "trap '. ./f' USR1",
        ):
            with self.subTest(cmd=cmd):
                self.assertIn("830", guard._trap_assign_why(cmd))
        with mock.patch.object(guard, "_simple_cmds", return_value=None):
            self.assertEqual(guard._trap_assign_why("trap 'd=1' INT"), "")

    def test_set_forms(self):
        self.assertTrue(guard._sets_positional("set", ["-"]))
        self.assertTrue(guard._sets_positional("set", ["+euo", "pipefail", "x"]))
        self.assertFalse(guard._sets_positional("set", ["-eo", "pipefail"]))
        self.assertFalse(guard._set_value_opt("--"))

    def test_slice_and_replace(self):
        def sub(text: str, **env: str) -> str:
            return guard._sub_case(text, env)

        self.assertEqual(sub("${X/b/-}", X="abcb"), "a-cb")
        self.assertEqual(sub("${X//b/-}", X="abcb"), "a-c-")
        self.assertEqual(sub("${X/%b/-}", X="abcb"), "abc-")
        self.assertEqual(sub("${X/#z/-}", X="abc"), "abc")
        self.assertEqual(sub("${X/}", X="abc"), "abc")
        self.assertEqual(sub("${X/[!a]?/}", X="abcd"), "ad")
        self.assertEqual(sub("${X/\\./_}", X="a.b"), "a_b")
        self.assertEqual(sub("${X%$E}", X="a.txt", E=".txt"), "a")
        self.assertEqual(sub("${X/b/-}"), "${X/b/-}")  # biến không biết giữ nguyên
        for text in ("${X/*/-}", "${X/b/&}", "${X/(b)/-}", "${X%$Y}", "${X:08}", "${X/b/$Y}", "${X%(b)}"):
            with self.subTest(text=text), self.assertRaises(guard.ScanTooComplex):
                sub(text, X="abcb")
        self.assertIsNone(guard._glob_pieces("a]"))

    def test_dyn_assigned_with_env(self):
        env = {"X": "ab"}
        self.assertEqual(guard._dyn_assigned(["for", "x", "in", "a", "b"], env), [])
        self.assertEqual(guard._dyn_assigned(["for", "x", "in", "*.txt"], env), ["x"])
        self.assertEqual(guard._dyn_assigned(["for", "x"], env), ["x"])
        self.assertEqual(guard._dyn_assigned(["y=${X:1}"], env), [])
        self.assertEqual(guard._dyn_assigned(["y=${Z:-a}"], env), ["y"])
        self.assertEqual(guard._dyn_assigned(["y=${#X}"], env), ["y"])
        self.assertEqual(guard._dyn_assigned(["y=$X"]), ["y"])

    def test_param_word(self):
        def word(text: str) -> str:
            m = guard.PARAM_OP_RE.fullmatch(text)
            assert m is not None
            return guard._param_word(m, True)

        self.assertEqual(word("${X:+--f}"), "--f")
        self.assertEqual(word("${X:+${Y:+~}}"), "~")
        self.assertEqual(guard._param_rewrites("a ${Y/p/c}"), ["a c", "a ${Y}c${Y}"])
        self.assertEqual(word("${X/#a/--}"), "--${X}")
        self.assertEqual(word("${X/%a/-}"), "${X}-")
        self.assertEqual(word("${X//a/-}"), "${X}-${X}")
        self.assertEqual(guard._blank_quoted_heredocs("cat <<E\n${A:+a}\nE"), "cat <<E\n${A:+a}\nE")


class ParamRewriteScopeTest(unittest.TestCase):
    """AUD-SEC-832: chỗ không mở rộng (heredoc nháy, nháy đơn, `$'…'`) không đếm; không nhân lần quét theo đệ quy."""

    def test_quoted_regions_not_counted(self):
        body = "\n".join(f"x{i} = f(${{X{i}:+a}})" for i in range(9))
        for cmd in (
            f"cat > x.py <<'PYEOF'\n{body}\nPYEOF",
            "echo '" + " ".join(f"${{X{i}:+a}}" for i in range(9)) + "'",
            "echo $'" + " ".join(f"${{X{i}:+a}}" for i in range(9)) + "'",
        ):
            with self.subTest(cmd=cmd[:40]):
                self.assertEqual(decide(cmd)["decision"], "", decide(cmd).get("reason"))

    def test_unquoted_heredoc_still_counted(self):
        body = " ".join(f"${{X{i}:+a}}" for i in range(9))
        self.assertIsNone(guard._param_rewrites(f"cat <<E\n{body}\nE"))

    def test_rewrites_not_combinatorial(self):
        def work(n: int) -> None:
            decide("echo " + " ".join(f"${{A{i}:+a}}" for i in range(n)) + "; true")

        cpu_budget.assert_not_quadratic(self, work, 2)

    def test_single_rewrite_pass(self):
        calls = []
        real = guard._param_rewrites

        def spy(cmd: str):
            calls.append(cmd)
            return real(cmd)

        with mock.patch.object(guard, "_param_rewrites", side_effect=spy):
            decide("echo ${A:+a} ${B:+b} ${C:+c}; true")
        rewritten = [c for c in calls if guard.PARAM_OP_RE.search(c) and "${" in c]
        self.assertLessEqual(len(rewritten), 2, rewritten)


if __name__ == "__main__":
    unittest.main()
