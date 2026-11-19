"""D-503 (T-3937): hồi quy tất định của fuzz bất biến cổng ký lần 4 — mọi tổ hợp nguy hiểm (đã xác nhận bằng bash thật
trong hộp cát) không được cho qua.

`tests/fixtures/autonomy/d503_invariant.jsonl`: tập con cố định của bộ sinh có hướng (lệnh có luật × dạng mở rộng ở vị
trí tên/cờ/lệnh con/đích × gốc lọt): một nửa số ca lọt của MỖI gốc (thứ tự id, chỉ số chẵn) — biến gán ngoài mô hình,
tham số vị trí `sh -c`, hậu tố/tên lệnh động sau trình chạy, `cd` vào thay lệnh, xargs, lệnh ghi — cộng mọi dạng trơn.
Gốc `budget:t3949` (T-3951 C2): BUDGET có chủ — ca vô hại về thực tế (`for P''ATH` không phải tên hợp lệ, `local` ngoài
hàm lỗi, `make -f <(printf …)` lành) mà guard giữ chặn vì không mô hình; không phải ca nguy hiểm. Họ `t3951:*`: cổng ký 10.
Họ `fnw:*` (AUD-SEC-890) và `par:887` (T-3943) lấy từ ca lọt ở `1b462999` của ma trận `test_guard_signoff7`, chưa chạy
bash thật: chỉ dạng che chắc đổi lệnh (định nghĩa hàm) và lệnh nguy hiểm nguyên văn."""

from __future__ import annotations

import json
import os
import sys
import unittest
import unittest.mock as mock
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("XT_GUARD_PHASE", "harden")
sys.path.insert(0, str(ROOT / ".claude" / "hooks"))
import guard

FIXTURE = ROOT / "tests" / "fixtures" / "autonomy" / "d503_invariant.jsonl"
ROOTS_MIN = 28  # số gốc lọt của bộ sinh phải có mặt


def decide(cmd: str) -> dict:
    with (
        mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(ROOT), "XT_GUARD_POLICY": ""}),
        mock.patch.object(guard, "_current_branch", return_value="feat"),
    ):
        return guard.apply_policy(guard.bash_decision(cmd, str(ROOT), str(ROOT)))


class D503InvariantTest(unittest.TestCase):
    def test_fixture_covers_every_root(self):
        rows = [json.loads(line) for line in FIXTURE.read_text(encoding="utf-8").splitlines()]
        roots = {r["root"] for r in rows}
        self.assertGreaterEqual(len(roots - {"plain"}), ROOTS_MIN)
        self.assertIn("plain", roots)
        self.assertGreaterEqual(len(rows), 300)

    def test_no_dangerous_combination_allowed(self):
        # Không đo thời gian ở đây (BASE-GATE-005: ngưỡng CPU cứng bị cấm; hiệu năng guard do tests/test_perf và
        # các test cpu_budget giữ) — test này chỉ khẳng định không tổ hợp nguy hiểm nào được cho qua.
        leaked = []
        for line in FIXTURE.read_text(encoding="utf-8").splitlines():
            row = json.loads(line)
            if decide(row["cmd"])["decision"] not in ("deny", "ask"):
                leaked.append(row["id"])
        self.assertEqual(leaked, [])


if __name__ == "__main__":
    unittest.main()
