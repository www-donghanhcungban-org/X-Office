"""Tài liệu lịch sử giữ nguyên chữ của thời điểm xảy ra sự kiện, ID quyết định không trùng (AUD-DOC-309/310).

X-Office tách từ X-Templates ngày 2026-11-19. ADR `0001`–`8999`, `docs/archive/`, research và báo cáo trước ngày đó là
sự kiện của X-Templates: đổi chữ hàng loạt làm sai sự thật lịch sử (ADR-0006 vừa nói X-Office vừa nói X-Templates) và làm
mọi lần đồng bộ upstream xung đột từng tệp. Quyết định riêng của X-Office dùng dải `D-9001+` (docs/adr/README.md).
"""

import collections
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OFFICE_RE = re.compile(r"X-[Oo]ffice")
DECISION_RE = re.compile(r"^### D-(\d{3,})\b", re.M)
OWN_DECISION_FLOOR = 9001


def _read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


SPLIT_DATE = "2026-11-19"
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")


def _before_split(p: Path) -> bool:
    """Tên tệp mang ngày (`research/2026-11-02-x.md`, `AUDIT-REPORT-2026-10-15.md`) trước ngày tách; không ngày → không."""
    m = DATE_RE.search(p.name)
    return m is not None and m.group(0) < SPLIT_DATE


def _history_files() -> list[Path]:
    """ADR của X-Templates (mọi tệp `0xxx`), kho lưu trữ, research và báo cáo audit có ngày trước ngày tách. Bỏ
    `GO-NO-GO-*`: bản ghi có chữ ký §5 của người, guard chỉ cho ghi cả tệp (AUD-DOC-308 — tiêu đề còn chữ X-Office)."""
    files = sorted((ROOT / "docs" / "adr").glob("0*.md"))
    files += sorted((ROOT / "docs" / "archive").rglob("*.md"))
    files += [p for p in sorted((ROOT / "research").glob("*.md")) if _before_split(p)]
    files += [p for p in sorted((ROOT / "docs" / "ops").glob("AUDIT-REPORT-*.md")) if _before_split(p)]
    # PLAN của X-Templates: tên không ngày (PLAN-3.12-lean) hoặc ngày trước ngày tách; PLAN mới của X-Office mang ngày sau
    files += [
        p
        for p in sorted((ROOT / "docs" / "autopilot").glob("PLAN*.md"))
        if _before_split(p) or not DATE_RE.search(p.name)
    ]
    files += sorted((ROOT / "docs" / "autopilot" / "upgrades").glob("*.md"))
    files += sorted((ROOT / "docs" / "ops").glob("ARTIFACT-PILOT-*.md"))
    files += sorted((ROOT / "docs" / "ops").glob("REMEDIATION-PLAN-*.md"))
    files += [ROOT / "CHANGELOG-ARCHIVE.md", ROOT / "docs" / "autopilot" / "DECISIONS-2026-10.md"]
    return [p for p in files if "GO-NO-GO" not in p.name]


class HistoricalDocsKeepNameTest(unittest.TestCase):
    def test_history_files_found(self) -> None:
        """Không kiểm trên tập rỗng: có ADR, kho lưu trữ, research và báo cáo audit."""
        parents = {p.relative_to(ROOT).parts[0:2] for p in _history_files()}
        self.assertIn(("docs", "adr"), parents)
        self.assertIn(("docs", "archive"), parents)
        self.assertIn(("docs", "ops"), parents)
        self.assertTrue(any(p[0] == "research" for p in parents))

    def test_no_x_office_in_pre_split_history(self) -> None:
        """AUD-DOC-309: không còn chữ X-Office trong tài liệu lịch sử trước ngày tách (restore từ bản X-Templates)."""
        bad = [p.relative_to(ROOT).as_posix() for p in _history_files() if OFFICE_RE.search(_read(p))]
        self.assertEqual(bad, [], "đổi chữ hàng loạt làm sai lịch sử — khôi phục chữ X-Templates (docs/adr/README.md)")


class DecisionIdsUniqueTest(unittest.TestCase):
    def logs(self) -> list[Path]:
        d = ROOT / "docs" / "autopilot"
        return [d / "DECISIONS.md", *sorted(d.glob("DECISIONS-20*.md"))]

    def test_decision_ids_unique_across_logs(self) -> None:
        """AUD-DOC-310: mỗi D-NNN đúng một mục xuyên sổ chính và các bản tháng."""
        ids = collections.Counter(m.group(1) for p in self.logs() for m in DECISION_RE.finditer(_read(p)))
        self.assertTrue(ids)
        self.assertEqual(sorted(k for k, v in ids.items() if v > 1), [])

    def test_own_decisions_live_in_own_range(self) -> None:
        """Quyết định riêng X-Office nằm ở dải `D-9001+`; dải dưới là của X-Templates (số kế = max+1 nên tự nằm trong dải)."""
        text = _read(ROOT / "docs" / "autopilot" / "DECISIONS.md")
        own = [int(m.group(1)) for m in DECISION_RE.finditer(text) if int(m.group(1)) >= OWN_DECISION_FLOOR]
        self.assertIn(OWN_DECISION_FLOOR, own)


if __name__ == "__main__":
    unittest.main()
