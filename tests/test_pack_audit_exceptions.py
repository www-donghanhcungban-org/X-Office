"""Ngoại lệ quét phụ thuộc npm của gói web-api-ts (BASE-DEP-004, D-504): mỗi GHSA bị `pnpm audit` bỏ qua phải có dòng
ngoại lệ chưa hết hạn, mỗi dòng ngoại lệ phải đang được bỏ qua, và job CI giữ ngưỡng `--audit-level moderate`. Danh sách
hiện rỗng (GHSA-fc5q-39xc-vjpf bị rút 2026-11-18, T-3958); cơ chế và test giữ cho ngoại lệ sau này."""

from __future__ import annotations

import datetime as dt
import json
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STARTER = ROOT / "framework" / "templates" / "packs" / "web-api-ts" / "starter"
WORKFLOW = ROOT / ".github" / "workflows" / "dep-audit.yml"
GHSA = re.compile(r"^GHSA(-[2-9cfghjmpqrvwx]{4}){3}$")


CVE = re.compile(r"^CVE-\d{4}-\d{4,}$")
FLOW = re.compile(r"\[([^\]]*)\]")


def code_lines(text: str) -> list[str]:
    """Phần mã của từng dòng (bỏ dòng chú thích, chú thích ` # …` cuối dòng, dòng trống)."""
    lines = (re.sub(r"\s#.*$", "", ln).rstrip() for ln in text.splitlines() if not ln.lstrip().startswith("#"))
    return [ln for ln in lines if ln.strip()]


def flow_ids(key: str, rest: str) -> list[str]:
    flow = FLOW.fullmatch(rest)
    if flow is None:
        raise ValueError(f"không đọc được {key}: {rest}")
    return [s.strip().strip("'\"") for s in flow.group(1).split(",") if s.strip()]


def ignored_ids(text: str, key: str) -> list[str]:
    """Đọc khối `auditConfig.<key>` của pnpm-workspace.yaml (chỉ stdlib): danh sách `- ID` hay dạng flow `[A, B]`; dạng
    khác (giá trị vô hướng, flow nhiều dòng) không đọc chắc → ValueError (test đỏ, T-3940). Fail-closed như
    `check-audit-exceptions.ts` (T-3958): dòng nhắc `key` không đúng dạng `  key:` (khoá có nháy, `key :`, `? key`) hay mục
    danh sách lạ → ValueError."""
    out: list[str] = []
    in_ignore = False
    for line in code_lines(text):
        head = re.fullmatch(rf"\s+{key}:(?:\s+(.*))?", line)
        if head:
            rest = (head.group(1) or "").strip()
            in_ignore = rest == ""
            out += [] if in_ignore else flow_ids(key, rest)
            continue
        if key in line:
            raise ValueError(f"không đọc chắc dòng nhắc {key}: {line.strip()}")
        m = re.fullmatch(r"\s+-\s+(\S+)", line)
        if in_ignore and m is None and line.lstrip().startswith("-"):
            raise ValueError(f"không đọc được mục {key}: {line.strip()}")
        in_ignore = in_ignore and m is not None
        out += [m.group(1).strip("'\"")] if in_ignore and m else []
    return out


def ignored_ghsas(text: str) -> list[str]:
    return ignored_ids(text, "ignoreGhsas")


def expired(exceptions: list[dict], today: dt.date) -> list[str]:
    return [e["ghsa"] for e in exceptions if dt.date.fromisoformat(e["expires"]) < today]


def load() -> tuple[list[str], list[dict]]:
    ws = (STARTER / "pnpm-workspace.yaml").read_text(encoding="utf-8")
    data = json.loads((STARTER / "audit-exceptions.json").read_text(encoding="utf-8"))
    return ignored_ghsas(ws), data["exceptions"]


class PackAuditExceptionsTest(unittest.TestCase):
    def test_ignored_and_exceptions_match_both_ways(self):
        ignored, exceptions = load()
        listed = [e["ghsa"] for e in exceptions]
        self.assertEqual(sorted(ignored), sorted(listed))
        self.assertEqual(len(set(listed)), len(listed), "GHSA trùng trong audit-exceptions.json")

    def test_ignored_cves_have_exception(self):
        ws = (STARTER / "pnpm-workspace.yaml").read_text(encoding="utf-8")
        _, exceptions = load()
        cves = ignored_ids(ws, "ignoreCves")
        self.assertEqual(sorted(cves), sorted(c for c in (e["cve"] for e in exceptions) if c in cves))
        self.assertLessEqual(set(cves), {e["cve"] for e in exceptions})

    def test_exceptions_complete_and_not_expired(self):
        _, exceptions = load()
        today = dt.datetime.now(dt.UTC).date()  # cùng mốc UTC với `check-audit-exceptions.ts`
        for e in exceptions:
            with self.subTest(ghsa=e.get("ghsa")):
                for key in ("ghsa", "package", "reason", "owner", "approved_by", "expires"):
                    self.assertTrue(str(e.get(key, "")).strip(), f"thiếu `{key}`")
                self.assertRegex(e["ghsa"], GHSA)
                # BASE-DEP-004: khoá `cve` bắt buộc; `null` chỉ khi advisory chưa có CVE (định danh là `ghsa`)
                self.assertIn("cve", e)
                self.assertTrue(e["cve"] is None or CVE.fullmatch(e["cve"]), e["cve"])
                self.assertRegex(e["expires"], r"^\d{4}-\d{2}-\d{2}$")  # cùng dạng mà bản TS nhận
        self.assertEqual(expired(exceptions, today), [], "có ngoại lệ hết hạn: xét lại hoặc bỏ")

    def test_starter_ships_exception_check(self):
        pkg = json.loads((STARTER / "package.json").read_text(encoding="utf-8"))
        self.assertEqual(pkg["scripts"]["audit:exceptions"], "node scripts/check-audit-exceptions.ts")
        script = (STARTER / "scripts" / "check-audit-exceptions.ts").read_text(encoding="utf-8")
        for needle in ("ignoreGhsas", "ignoreCves", "expires", "process.exit"):
            self.assertIn(needle, script)

    def test_flow_lists_read_or_red(self):
        self.assertEqual(
            ignored_ghsas("auditConfig:\n  ignoreGhsas: [GHSA-aaaa-bbbb-cccc, 'GHSA-dddd-eeee-ffff']\n"),
            [
                "GHSA-aaaa-bbbb-cccc",
                "GHSA-dddd-eeee-ffff",
            ],
        )
        self.assertEqual(
            ignored_ids("auditConfig:\n  ignoreCves: [CVE-2026-1234]  # x\n", "ignoreCves"), ["CVE-2026-1234"]
        )
        for bad in ("  ignoreGhsas: GHSA-aaaa-bbbb-cccc\n", "  ignoreGhsas: [GHSA-aaaa-bbbb-cccc,\n"):
            with self.subTest(text=bad), self.assertRaises(ValueError):
                ignored_ghsas("auditConfig:\n" + bad)

    def test_unread_key_forms_are_red(self):
        """T-3958: khoá nhắc `ignoreGhsas` mà không đúng dạng `  ignoreGhsas:` → đỏ, không đọc thành rỗng im lặng."""
        for bad in UNREAD_FORMS:
            with self.subTest(text=bad), self.assertRaises(ValueError):
                ignored_ghsas(bad)
        self.assertEqual(ignored_ghsas(f"{BLOCK}  ignoreCves: []\n"), ["GHSA-aaaa-bbbb-cccc"])
        self.assertEqual(
            ignored_ghsas("auditConfig:  # x\n  ignoreGhsas:  # y\n    - 'GHSA-aaaa-bbbb-cccc'\n"),
            ["GHSA-aaaa-bbbb-cccc"],
        )

    def test_expired_exception_is_red(self):
        ex = [{"ghsa": "GHSA-aaaa-bbbb-cccc", "expires": "2026-12-18"}]
        self.assertEqual(expired(ex, dt.date(2026, 12, 18)), [])  # đúng ngày hạn còn hiệu lực
        self.assertEqual(expired(ex, dt.date(2026, 12, 19)), ["GHSA-aaaa-bbbb-cccc"])
        for bad in ("2026-13-45", "2026-02-30"):
            with self.subTest(expires=bad), self.assertRaises(ValueError):
                expired([{"ghsa": "GHSA-aaaa-bbbb-cccc", "expires": bad}], dt.date(2026, 1, 1))

    def test_parser_edge_cases(self):
        self.assertEqual(ignored_ghsas(""), [])
        self.assertEqual(ignored_ghsas("auditConfig:\n  ignoreGhsas: []\n"), [])
        text = "auditConfig:\n  ignoreGhsas:\n    # ghi chú\n    - GHSA-aaaa-bbbb-cccc  # lý do\n    - GHSA-dddd-eeee-ffff\nother: 1\n"
        self.assertEqual(ignored_ghsas(text), ["GHSA-aaaa-bbbb-cccc", "GHSA-dddd-eeee-ffff"])

    def test_ci_job_keeps_moderate_threshold(self):
        wf = WORKFLOW.read_text(encoding="utf-8")
        job = wf.split("  pack-npm-audit:", 1)[1]
        self.assertIn("run: pnpm audit --audit-level moderate\n", job)
        self.assertNotIn("--ignore", job)
        self.assertNotIn("audit-level high", job)
        self.assertNotIn("audit-level critical", job)

    def test_workflows_check_exceptions_before_install(self):
        """BASE-DEP-004 (T-3958): ngoại lệ có hạn phải được máy kiểm hạn — `pnpm audit:exceptions` chạy ngay sau
        `pnpm audit` ở job khung `pack-npm-audit` và ở workflow mẫu `pack-acceptance`, trước khi cài phụ thuộc; pnpm 12
        mặc định cài trước `pnpm <script>` nên bước tắt `verify-deps-before-run`."""
        acceptance = STARTER.parent / "managed" / ".github" / "workflows" / "pack-acceptance.yml"
        jobs = {
            "pack-npm-audit": WORKFLOW.read_text(encoding="utf-8").split("  pack-npm-audit:", 1)[1],
            "pack-acceptance": acceptance.read_text(encoding="utf-8"),
        }
        for name, job in jobs.items():
            with self.subTest(job=name):
                audit = job.index("run: pnpm audit --audit-level moderate\n")
                check = job.index("run: pnpm audit:exceptions\n")
                self.assertLess(audit, check)
                self.assertNotIn("pnpm install", job[:check])
                step = job[job.rindex("- name:", 0, check) : check]
                self.assertIn('PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "false"', step)


NODE = shutil.which("node")
CHECKER = STARTER / "scripts" / "check-audit-exceptions.ts"
GOOD = {
    "ghsa": "GHSA-aaaa-bbbb-cccc",
    "cve": None,
    "package": "x",
    "reason": "chưa có bản vá",
    "owner": "team",
    "approved_by": "lead",
    "expires": "2099-01-01",
}
BLOCK = "auditConfig:\n  ignoreGhsas:\n    - GHSA-aaaa-bbbb-cccc\n"
# T-3958: các dạng YAML hợp lệ mà bộ đọc dòng không đọc chắc — phải đỏ, không thành danh sách rỗng.
UNREAD_FORMS = (
    'auditConfig:\n  "ignoreGhsas": [GHSA-aaaa-bbbb-cccc]\n',
    "auditConfig:\n  'ignoreGhsas':\n    - GHSA-aaaa-bbbb-cccc\n",
    "auditConfig:\n  ignoreGhsas : [GHSA-aaaa-bbbb-cccc]\n",
    "auditConfig:\n  ? ignoreGhsas\n  : [GHSA-aaaa-bbbb-cccc]\n",
    "auditConfig: # chú thích\n  { ignoreGhsas: [GHSA-aaaa-bbbb-cccc] }\n",
    "auditConfig:\n  ignoreGhsas:\n    - GHSA-aaaa-bbbb-cccc GHSA-dddd-eeee-ffff\n",
)


@unittest.skipUnless(NODE, "không có node — chỉ chạy được kiểm Python ở trên")
class TsCheckerTest(unittest.TestCase):
    """T-3942 F6: `check-audit-exceptions.ts` (chạy bằng node, gỡ kiểu sẵn có) đỏ với hạn không phải ngày, chữ bắt buộc
    rỗng, `auditConfig` dạng flow-mapping."""

    def problems(self, workspace: str, row: dict | None) -> list:
        rows = [row] if row else []  # không dòng ngoại lệ: bộ đọc lỏng trả rỗng thì không lỗi nào khác che đi
        with tempfile.TemporaryDirectory() as tmp:
            probe = Path(tmp, "probe.mjs")
            probe.write_text(
                f"import {{ problems }} from {json.dumps(CHECKER.as_uri())};\n"
                f"console.log(JSON.stringify(problems({json.dumps(workspace)}, {json.dumps(rows)}, '2026-11-18')));\n",
                encoding="utf-8",
            )
            out = subprocess.run([str(NODE), str(probe)], capture_output=True, text=True, timeout=60, check=True)
        return json.loads(out.stdout.strip().splitlines()[-1])

    def test_good_row_passes(self):
        self.assertEqual(self.problems(BLOCK, GOOD), [])

    def test_bad_rows_are_red(self):
        for change in ({"expires": None}, {"expires": "never"}, {"expires": "2099-1-1"}, {"reason": ""}):
            with self.subTest(change=change):
                self.assertNotEqual(self.problems(BLOCK, {**GOOD, **change}), [])
        self.assertTrue(any("hết hạn" in e for e in self.problems(BLOCK, {**GOOD, "expires": "2020-01-01"})))
        self.assertTrue(any("rỗng" in e for e in self.problems(BLOCK, {**GOOD, "owner": "  "})))

    def test_flow_mapping_is_red(self):
        errs = self.problems("auditConfig: { ignoreGhsas: [GHSA-aaaa-bbbb-cccc] }\n", GOOD)
        self.assertTrue(any("flow-mapping" in e for e in errs), errs)

    def test_unread_key_forms_are_red(self):
        """T-3958: khoá có nháy, `key :`, `? key`, `auditConfig: # …` rồi flow-mapping dòng sau, mục danh sách lạ —
        đỏ (fail-closed) ngay cả khi không có dòng ngoại lệ nào để lộ lệch; dạng khối có chú thích vẫn qua."""
        for text in UNREAD_FORMS:
            with self.subTest(text=text):
                self.assertNotEqual(self.problems(text, None), [])
        commented = "auditConfig:  # x\n  ignoreGhsas:  # y\n    - 'GHSA-aaaa-bbbb-cccc'  # z\n  ignoreCves: []\n"
        self.assertEqual(self.problems(commented, GOOD), [])

    def test_expires_must_be_a_real_utc_date(self):
        """T-3958: `2026-13-45`, `2026-02-30` đúng dạng nhưng không phải ngày → đỏ (round-trip `Date` UTC)."""
        for bad in ("2026-13-45", "2026-02-30", "2026-00-10"):
            with self.subTest(expires=bad):
                errs = self.problems(BLOCK, {**GOOD, "expires": bad})
                self.assertTrue(any("YYYY-MM-DD" in e for e in errs), errs)
        self.assertEqual(self.problems(BLOCK, {**GOOD, "expires": "2028-02-29"}), [])  # năm nhuận
        self.assertEqual(self.problems(BLOCK, {**GOOD, "expires": "2026-11-18"}), [])  # đúng ngày hạn còn hiệu lực


if __name__ == "__main__":
    unittest.main()
