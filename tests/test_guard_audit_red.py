"""T-3924 (ADR-0080, audit delta cổng ký): ba lỗ 🔴 của guard — gán muộn dạng `for`/`select`/`${X:=…}`/`getopts`/`unset`
cho biến thân hàm dùng (AUD-SEC-801), `eval --` (AUD-SEC-802), mở rộng tham số có từ thay thế/biến đổi (AUD-SEC-803).

Mỗi ID: mẫu tái hiện phải bị chặn (bash chạy tải) và ca lành gần nhất vẫn chạy."""

from __future__ import annotations

import os
import sys
import unittest
import unittest.mock as mock
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("XT_GUARD_PHASE", "harden")
sys.path.insert(0, str(ROOT / ".claude" / "hooks"))
import guard


def decide(cmd: str) -> dict:
    # Nhánh hiện tại ghim về `feat` như `tests/test_guard_strict.py`: quyết định không phụ thuộc nhánh checkout
    with (
        mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(ROOT), "XT_GUARD_POLICY": ""}),
        mock.patch.object(guard, "_current_branch", return_value="feat"),
    ):
        return guard.apply_policy(guard.bash_decision(cmd, str(ROOT)))


class AuditRedCase(unittest.TestCase):
    def assert_denied(self, cases: dict) -> None:
        for cmd, code in cases.items():
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertEqual((d["decision"], d.get("code")), ("deny", code), d.get("reason"))

    def assert_allowed(self, cmds: tuple) -> None:
        for cmd in cmds:
            with self.subTest(cmd=cmd):
                d = decide(cmd)
                self.assertNotEqual(d["decision"], "deny", d.get("reason"))


class LateAssignFormsTest(AuditRedCase):
    """AUD-SEC-801: thân hàm quét lúc định nghĩa; biến nó dùng gán lại SAU bằng dạng ngoài `X=`/`read`/`export`."""

    def test_late_assign_forms_denied(self):
        self.assert_denied(
            {
                'd=/tmp/x; f() { rm -rf "$d"; }; for d in ~; do f; done': "BUDGET",
                'd=/tmp/x; f() { rm -rf "$d"; }; unset d; : ${d:=~}; f': "BUDGET",
                'b=feat; f() { git push origin "$b"; }; for b in main; do f; done': "BUDGET",
                'd=/tmp/x; f() { rm -rf "$d"; }; select d in ~; do f; done': "BUDGET",
                'd=/tmp/x; f() { rm -rf "$d"; }; getopts ab d; f': "BUDGET",
                'd=/tmp/x; f() { rm -rf "$d/"; }; unset d; f': "WIPE_OUTSIDE",  # T-3951 A2: bản rỗng `/` là gốc hệ thống
                "f() { echo ~; }; for HOME in /; do f; done": "BUDGET",
                # đối chứng đã chặn trước bản sửa: gán `d=` và `${d=…}`
                'd=/tmp/x; f() { rm -rf "$d"; }; d=~; f': "BUDGET",
                'd=/tmp/x; f() { rm -rf "$d"; }; : ${d=~}; f': "BUDGET",
            }
        )

    def test_other_variable_or_no_late_assign_allowed(self):
        self.assert_allowed(
            (
                'd=/tmp/x; f() { rm -rf "$d"; }; f',
                'd=/tmp/x; f() { rm -rf "$d"; }; for x in ~; do f; done',
                'd=/tmp/x; f() { rm -rf "$d"; }; unset x; f',
                'b=feat; f() { git push origin "$b"; }; f',
            )
        )

    def test_late_assigned_unit(self):
        live = 'f() { echo "$d"; }; for d in a; do f; done'
        self.assertTrue(guard._late_assigned(live, live.index("{")))
        live = 'f() { echo "$d"; }; for dd in a; do f; done'
        self.assertFalse(guard._late_assigned(live, live.index("{")))


class EvalDashDashTest(AuditRedCase):
    """AUD-SEC-802: `eval -- <lệnh>` — bash bỏ `--` rồi chạy phần còn lại như `eval <lệnh>`."""

    def test_eval_dashdash_denied(self):
        self.assert_denied(
            {
                "eval -- rm -rf ~": "RULE_DENY",
                "eval -- git push --force origin main": "RULE_DENY",
                "eval rm -rf ~": "RULE_DENY",  # đối chứng không `--`: đã chặn
            }
        )

    def test_eval_dashdash_harmless_allowed(self):
        self.assert_allowed(("eval -- echo hi", "eval -- git status", "eval --"))

    def test_eval_scripts_drop_dashdash(self):
        self.assertEqual(guard._eval_scripts(guard.tokenize("eval -- rm -rf x")), ["rm -rf x"])
        self.assertEqual(guard._eval_scripts(guard.tokenize("eval --")), [])


class ParamOperatorTest(AuditRedCase):
    """AUD-SEC-803: `${X:+từ}`, `${X+từ}`, `${X/mẫu/từ}`, mặc định lồng `${X:-$HOME}`, đổi hoa/thường biến đã biết."""

    def test_param_operator_words_denied(self):
        self.assert_denied(
            {
                "git push ${HOME:+--force} origin feat": "RULE_DENY",
                "X=1; git push ${X:+--force} origin feat": "RULE_DENY",
                "git push ${HOME/*/--force} origin feat": "RULE_DENY",
                "git push ${HOME//x/--force} origin feat": "RULE_DENY",
                "git push ${HOME+--force} origin feat": "RULE_DENY",
                "git reset ${HOME:+--hard}": "RULE_DENY",
                "git clean ${PWD:+-fdx}": "RULE_DENY",
                "rm -rf ${HOME:+/home/x}": "WIPE_OUTSIDE",
                "rm -rf ${PWD:+$HOME}": "RULE_DENY",
                "rm -rf ${X:-$HOME}": "RULE_DENY",
                "rm -rf ${X:-${HOME}}": "RULE_DENY",
                "rm -rf ${X:+${Y:+~}}": "RULE_DENY",
                "git push ${A:+--dry-run} ${B:+--force} origin feat": "RULE_DENY",
                "X=--HARD; git reset ${X,,}": "RULE_DENY",
                'X=--HARD; git reset "${X@L}"': "RULE_DENY",
                # đối chứng đã chặn trước bản sửa
                "git reset --hard": "RULE_DENY",
                "X=--force; git push $X origin feat": "RULE_DENY",
            }
        )

    def test_benign_param_forms_allowed(self):
        self.assert_allowed(
            (
                'echo "${X:-default}"',
                "echo ${#arr[@]}",
                'f=a.txt; echo "${f%.txt}"',
                "echo ${X:+a}",
                "echo ${X:+--force}",
                "git log ${X:+--oneline}",
                "git status ${X:+--short}",
                "git push ${X:+--dry-run} origin feat",
                "echo '${HOME:+--force}'",
                'X=Hello; echo "${X,,}"',
                'X=a; echo "${X^}"',
            )
        )

    def test_param_rewrites_unit(self):
        self.assertEqual(guard._param_rewrites("echo ${X:-a} ${X%b}"), [])
        self.assertEqual(guard._param_rewrites("echo '${X:+a}'"), [])
        self.assertEqual(guard._param_rewrites("a ${X:+b} c"), ["a b c"])
        # AUD-SEC-828 (T-3929): thêm bản ghép `${Y}c${Y}` — từ thay dính phần còn lại của Y (chặt hơn)
        self.assertEqual(
            guard._param_rewrites("a ${X:+b} ${Y/p/c}"), ["a b c", "a b ${Y/p/c}", "a ${X:+b} c", "a b ${Y}c${Y}"]
        )
        self.assertIsNone(guard._param_rewrites(" ".join(["${X:+a}"] * (guard.PARAM_REWRITE_MAX + 1))))

    def test_too_many_param_operators_budget(self):
        d = decide("git status " + " ".join(["${X:+a}"] * (guard.PARAM_REWRITE_MAX + 1)))
        self.assertEqual((d["decision"], d.get("code")), ("deny", "BUDGET"))
        self.assertIn("803", str(d["reason"]))

    def test_case_conversion_of_known_values(self):
        env = {"X": "aBc"}
        got = [guard._sub_vars("${X" + op + "}", env) for op in ("^^", ",,", "~~", "^", ",", "~", "@U", "@L", "@u")]
        self.assertEqual(got, ["ABC", "abc", "AbC", "ABc", "aBc", "ABc", "ABC", "abc", "ABc"])
        self.assertEqual(guard._sub_vars("${Y,,}", env), "${Y,,}")
        self.assertEqual(guard._known_vars("${X^^}", env), "ABC")


class ConcurrentDecisionTest(unittest.TestCase):
    """Quyết định chạy đồng thời (hook song song trong một tiến trình thử): bản viết lại không rò trạng thái giữa luồng."""

    def test_parallel_decisions_stable(self):
        cmds = [
            "git push ${HOME:+--force} origin feat",
            "echo ${X:+a}",
            "eval -- rm -rf ~",
            "eval -- echo hi",
            'd=/tmp/x; f() { rm -rf "$d"; }; for d in ~; do f; done',
            'd=/tmp/x; f() { rm -rf "$d"; }; f',
        ] * 4
        expect = [decide(c)["decision"] for c in cmds]
        # vá môi trường MỘT lần ngoài các luồng (mock.patch không an toàn luồng), luồng chỉ gọi guard
        with (
            mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(ROOT), "XT_GUARD_POLICY": ""}),
            mock.patch.object(guard, "_current_branch", return_value="feat"),
            ThreadPoolExecutor(max_workers=8) as pool,
        ):
            got = list(pool.map(lambda c: guard.apply_policy(guard.bash_decision(c, str(ROOT)))["decision"], cmds))
        self.assertEqual(got, expect)
        self.assertEqual(expect[:6], ["deny", "", "deny", "", "deny", ""])


if __name__ == "__main__":
    unittest.main()
