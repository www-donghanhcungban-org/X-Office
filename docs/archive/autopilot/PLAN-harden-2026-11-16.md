# PLAN harden X-office 2026-11-16 — đợt 1 (🔴)

> Duyệt: D-495 (phiên chính tự duyệt) · Blueprint: BLUEPRINT.md · Quy trình: ADR-0080 (D-494)

## Tóm tắt
- Mục tiêu: đóng 14 mục 🔴 còn mở của sổ (`AUD-SEC-*`, đều là đường lách guard có từ trước). Đợt 2: 42 🟠. Đợt 3: nợ 🟢.
- Sổ ở `ab17e624`: 🔴 14 · 🟠 42 · nợ review 🟢 94 → `release-check` hàng `audit` FAIL. Blueprint không còn MUST mở.
- Hướng sửa chung: D-415 — dạng guard không đọc chắc → BUDGET; không thêm bộ đọc mới khi BUDGET đủ an toàn.
- Mỗi task: test hồi quy đỏ trước khi sửa, Gate là lớp test đó; mỗi lát một PR ≤ 150 dòng; không gọi reviewer giữa đợt.
- Hết task → cổng ký (ADR-0080): audit delta + trả nợ review theo lô → `release-check`.

## Ngân sách
- Số vòng: mặc định `--single-session` · Chi phí ngoài phiên: 0 · Timeout Gate: 1200 giây · Hạn: 72 giờ.

## Task
### Lát 1 — gán và tên biến
- [x] `T-3893` 🔴 AUD-SEC-790: gán bằng thay lệnh làm tiền tố của lệnh (`d=$(cat f) true`) không đổi giá trị biến của guard — Gate: `python3 -m unittest tests.test_hooks.GuardPrefixAssignSubstTest` (files: .claude/hooks/guard.py, tests/test_hooks.py)
### Lát 2 — tên lệnh git và vị trí đối số
- [x] `T-3894` 🔴 AUD-SEC-741/742/744: `git-<lệnh con>` kích cổng, `config` cấp hai có mở rộng, `$X` trần làm lệch vị trí → BUDGET — Gate: `python3 -m unittest tests.test_hooks.GuardGitDynPositionTest` (files: .claude/hooks/guard.py, tests/test_hooks.py)
- [x] `T-3895` 🔴 AUD-SEC-680: chuyển hướng giữa lệnh con git và đối số không che luật — Gate: `python3 -m unittest tests.test_hooks.GuardGitRedirectArgsTest` (sau: T-3894; files: .claude/hooks/guard.py, tests/test_hooks.py)
### Lát 3 — trình chạy và công cụ đối ngoại
- [x] `T-3896` 🔴 AUD-SEC-743/745: cờ sau `--` của trình chạy và lệnh con có mở rộng của công cụ ngoài git/gh → BUDGET — Gate: `python3 -m unittest tests.test_hooks.GuardRunnerDynTest` (files: .claude/hooks/guard.py, tests/test_hooks.py)
### Lát 4 — IFS
- [x] `T-3897` 🔴 AUD-SEC-752: lệnh nhắc `IFS` bỏ miễn trừ tham số dạng số (`$?`, `$#`, `$$`, `$((…))`) — Gate: `python3 -m unittest tests.test_hooks.GuardIfsDigitTest` (files: .claude/hooks/guard.py, tests/test_hooks.py)
### Lát 5 — nháy lồng
- [x] `T-3898` 🔴 AUD-SEC-750/606: nháy đơn trong nháy kép lồng thay lệnh và thoát `\$`/backtick trong chuỗi lồng → BUDGET — Gate: `python3 -m unittest tests.test_hooks.GuardNestedQuoteTest` (files: .claude/hooks/guard.py, tests/test_hooks.py)
### Lát 6 — hàm và nhóm
- [x] `T-3899` 🔴 AUD-SEC-660/661: thân hàm dùng biến chưa biết, shell trong nhóm/hàm đọc stdin → BUDGET — Gate: `python3 -m unittest tests.test_hooks.GuardFuncScopeTest` (files: .claude/hooks/guard.py, tests/test_hooks.py)
### Lát 7 — thay tiến trình giữa đối số
- [x] `T-3900` 🔴 AUD-SEC-609: thay tiến trình/thay lệnh giữa đối số và từ dính quanh thay lệnh → BUDGET — Gate: `python3 -m unittest tests.test_hooks.GuardMidArgSubstTest` (files: .claude/hooks/guard.py, tests/test_hooks.py)
### Lát 8 — chữ ký GO-NO-GO
- [x] `T-3901` 🔴 AUD-SEC-648: dòng §5 dạng không chuẩn không thành chữ ký sau `format` — đối chiếu bản sửa #566, đóng hoặc sửa phần còn lại — Gate: `python3 -m unittest tests.test_hooks.DevTaskTest tests.test_guard_go_no_go` (files: .claude/hooks/guard.py, scripts/dev-task.sh, tests/)
### Lát 9 — sổ
- [x] `T-3902` Sổ audit không còn 🔴 mở — Gate: `python3 scripts/xt.py audit check docs/ops/AUDIT-STATUS.md && ! grep -E '^\| AUD-[A-Z]+-[0-9]+ \| 🔴 \| mở' docs/ops/AUDIT-STATUS.md` (sau: T-3893, T-3894, T-3895, T-3896, T-3897, T-3898, T-3899, T-3900, T-3901)
