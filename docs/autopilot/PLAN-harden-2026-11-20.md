# PLAN harden X-Office 2026-11-20 — đợt 19 (đóng 🟠 cuối)

> Duyệt: phiên chính tự duyệt (ADR-0008) · Blueprint: BLUEPRINT.md · Quy trình: ADR-0080 · Đợt trước: PLAN-harden-2026-11-17 (còn T-3970)

## Tóm tắt
- Mục tiêu: đóng 🟠 AUD-SEC-990 (giải nén ghi đè tệp hàng rào) — mục chặn duy nhất của `release-check` hàng `audit`; sau đó cổng ký (audit delta từ SHA quét gần nhất, nợ review theo lô) để hàng `review_debt` xanh.
- Hướng chung: D-415 — dạng guard không đọc chắc → BUDGET (viết lại bằng lệnh đơn); test hồi quy đỏ trước khi sửa; không nới cổng.
- Runtime cục bộ: CPython 3.15.0b4 (không có 3.15.x ổn định trong container) — CI (3.15.2) là cổng đầy đủ.

## Ngân sách
- Số vòng: mặc định `--single-session` · Chi phí ngoài phiên: 0 · Timeout Gate: 1200 giây · Hạn: 24 giờ.

## Task
- [x] `T-4001` 🟠 AUD-SEC-990 (đợt 18, T-3970 chưa làm): giải nén (`tar -x`, `unzip`) có thành viên nêu tên phủ tệp hàng rào (`.claude/settings.json`, `.codex/hooks.json`, `.cursor/hooks.json`) → chặn; giải nén cả tệp nén vào gốc dự án → phân tích ranh giới — Gate: `python3 -m unittest tests.test_hooks.FenceExtractMembersTest` (files: .claude/hooks/guard.py, tests/test_hooks.py)
