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
- [x] `T-4003` 🟠 audit delta (guard): `tar --no-anchored`/`TAR_OPTIONS`, `7z -r0`, `--strip-components` bóc hết đường thành viên, `jar xf`/`pax -r` nêu thành viên, nguồn xargs/grep ở `.github` (cha của `.github/hooks`) lách rào AUD-SEC-989/990 — Gate: `python3 -m unittest tests.test_hooks.FenceExtractMembersTest tests.test_hooks.FenceAdapterFilesTest` (files: .claude/hooks/guard.py, tests/test_hooks.py, tests/fixtures/autonomy/guard.json, tests/test_guard_fuzz.py)
- [x] `T-4004` 🟠 audit delta (install): frontmatter YAML của skill gate/autopilot/complete không hợp lệ (`description` chứa `: ` không nháy) bị chép sang `.agents/skills/` cho Codex — bọc nháy, `render_skill` kiểm tập con phẳng, test — Gate: `python3 -m unittest tests.test_codex_harness` (files: .claude/skills/gate/SKILL.md, .claude/skills/autopilot/SKILL.md, .claude/skills/complete/SKILL.md, .agents/skills, scripts/install.py, tests/test_codex_harness.py)
- [x] `T-4005` 🟠 audit delta (docs): README.md:73 trỏ `/tmp/x-templates`; đổi tên hàng loạt ghi "X-Office" đè sự kiện lịch sử ở ADR-0006/0007/0068/0078, mục CHANGELOG [3.34.0], framework-feedback.md:80 → trả tên cũ cho chỗ lịch sử — Gate: `python3 scripts/xt.py checks && python3 -m unittest tests.test_docs_budget` (files: README.md, docs/adr, CHANGELOG.md, framework/11-autonomous-loop/framework-feedback.md)
