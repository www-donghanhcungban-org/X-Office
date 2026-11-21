# PLAN harden X-Office 2026-11-20 — đợt 19 (đóng 🟠 cuối)

> Duyệt: phiên chính tự duyệt (ADR-0008) · Blueprint: BLUEPRINT.md · Quy trình: ADR-0080 · Đợt trước: PLAN-harden-2026-11-17

## Tóm tắt
- Mục tiêu: đóng 🟠 AUD-SEC-990 và các 🟠 của audit delta (guard, skill Codex, tài liệu, a11y), rồi cổng ký.
- Hướng chung: D-415; test đỏ trước khi sửa; không nới cổng. CPython cục bộ 3.15.0b4 — CI (3.15.2) là cổng đầy đủ.

## Ngân sách
- Số vòng: `--single-session` · Chi phí ngoài phiên: 0 · Timeout Gate: 1200 giây · Hạn: 24 giờ.

## Task
- [x] `T-4001` 🟠 AUD-SEC-990: giải nén nêu tên thành viên phủ tệp hàng rào → chặn — Gate: `python3 -m unittest tests.test_hooks.FenceExtractMembersTest` (files: .claude/hooks/guard.py, tests/test_hooks.py)
- [x] `T-4003` 🟠 audit delta (guard): `--no-anchored`, `7z -r0`, `--strip-components`, `jar`/`pax`, xargs ở `.github` — Gate: `python3 -m unittest tests.test_hooks.FenceExtractMembersTest tests.test_hooks.FenceAdapterFilesTest` (files: .claude/hooks/guard.py, tests/)
- [x] `T-4004` 🟠 audit delta (install): frontmatter YAML 3 skill không hợp lệ — Gate: `python3 -m unittest tests.test_codex_harness` (files: .claude/skills, .agents/skills, scripts/install.py, tests/test_codex_harness.py)
- [x] `T-4005` 🟠 audit delta (docs): README:73 sai đường dẫn; tên repo trong ADR/CHANGELOG — Gate: `python3 scripts/xt.py checks && python3 -m unittest tests.test_docs_budget` (files: README.md, docs/adr, CHANGELOG.md)
- [x] `T-4006` 🟠 AUD-A11Y-004: hộp lỗi màn Văn phòng dựng lại mỗi poll, mất focus — Gate: `python3 -m unittest tests.test_app_office` (files: scripts/app/views/office.js, tests/)
