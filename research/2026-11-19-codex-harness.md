---
title: Harness cho Codex CLI — skill, agent, hook và tệp do `/import` sinh
kind: research
updated: 2026-11-19
---

# Harness cho Codex CLI — nghiên cứu 2026-11-19

Đầu vào: chủ repo 2026-11-19 *"cái nào liên quan đến harness thì tích hợp hết"* — ở gốc repo khung có ba nhóm tệp chưa
track sinh ngày 2026-11-14 (`.agents/skills/`, `.codex/agents/`, `.codex/hooks.json` + `.codex/hooks/`). Bản này xác
minh quy ước hiện hành của Codex CLI và nguồn gốc các tệp đó. Nối tiếp
[harness đa nhà cung cấp 2026-11-02](2026-11-02-multi-provider-harness.md) (§ Codex, §9). Dùng cho
[ADR-0082](../docs/adr/0082-codex-harness-generated.md).

Cách đọc: tài liệu chính thức (`developers.openai.com/codex/*` chuyển hướng 308 sang `learn.chatgpt.com/docs/*`) và mã
nguồn `github.com/openai/codex` tại tag `rust-v0.170.0` (commit `29eb79e9866b3262a777fdf8195c1b9e63684c91`), đọc bằng
`git show`/`git grep`, không chạy Codex. Mọi mục đọc ngày 2026-11-19.

## 1. Phiên bản

| Dữ kiện | Giá trị | Nguồn |
|---|---|---|
| Bản stable | `@openai/codex` 0.170.0, phát hành 2026-11-18, Apache-2.0 | registry.npmjs.org/@openai/codex/latest · api.github.com/repos/openai/codex/releases |
| Bản trước (research 2026-11-02) | 0.166.0 | — |

## 2. Skill

| Dữ kiện | Giá trị | Nguồn |
|---|---|---|
| Đường dẫn trong repo | `.agents/skills/<tên>/SKILL.md`, quét từ cwd lên gốc repo; cấp người dùng `$HOME/.agents/skills`; không nêu `.codex/skills` | learn.chatgpt.com/docs/build-skills |
| Frontmatter | bắt buộc `name`, `description`; metadata tuỳ chọn ở `agents/openai.yaml` | như trên |
| Symlink | được hỗ trợ (theo đích) | như trên |
| Ngân sách | danh sách skill ban đầu ≤ 2 % cửa sổ ngữ cảnh (hoặc 8 000 ký tự); quá thì rút gọn mô tả rồi bỏ bớt skill, có cảnh báo; không nêu trần một `SKILL.md` | như trên |
| Gọi | `/skills` hoặc `$tên`; Codex cũng tự chọn theo mô tả; không cần cờ bật | như trên |

## 3. Agent tuỳ biến (subagent)

| Dữ kiện | Giá trị | Nguồn |
|---|---|---|
| Đường dẫn | `.codex/agents/*.toml` (dự án), `~/.codex/agents/` (cá nhân); mỗi tệp một agent | learn.chatgpt.com/docs/agent-configuration/subagents |
| Khoá bắt buộc | `name` (nguồn sự thật, không phải tên tệp), `description`, `developer_instructions` | như trên |
| Khoá tuỳ chọn | `model`, `model_reasoning_effort`, `model_reasoning_summary`, `model_verbosity`; `sandbox_mode`/`approval_policy` không ghi đè agent cha | như trên |
| `model_reasoning_effort` | tài liệu: `low, medium, high, xhigh, max, ultra` (ba mức trên tuỳ model); enum trong mã thêm `none`, `minimal` | `codex-rs/protocol/src/openai_models.rs:74` |
| Bật | mặc định bật (`agents.enabled` = true) | tài liệu + `codex-rs/config/src/config_toml.rs` |

## 4. Hook

| Dữ kiện | Giá trị | Nguồn |
|---|---|---|
| Sự kiện | 14: `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStart`, `SubagentStop`, `Stop`, `PreModelRequest`, `PostModelRequest`, `Interrupt`, `SessionStart`, `SessionEnd` (2026-11-02: 12) | learn.chatgpt.com/docs/hooks |
| Chặn ở `PreToolUse` | `hookSpecificOutput.permissionDecision: "deny"` hoặc exit 2; `ask` **không hỗ trợ** (hook tính là lỗi, tool vẫn chạy) | như trên |
| cwd và môi trường | lệnh hook chạy ở cwd của phiên; không có biến gốc dự án (không `CLAUDE_PROJECT_DIR`) — ví dụ chính thức dùng `git rev-parse --show-toplevel` | tài liệu + `codex-rs/hooks/src/engine/command_runner.rs` |
| Tin cậy | hook dự án chỉ chạy sau khi người xem và tin cậy bằng `/hooks` (theo hash; đổi tệp phải tin cậy lại); lớp `.codex/` của dự án chưa tin cậy bị bỏ qua | tài liệu hooks, config-advanced |
| Timeout mặc định | 600 s (`SessionEnd`/`Interrupt` 1 s) | tài liệu hooks |
| `codex exec` | tài liệu không nói; mã có xử lý sự kiện hook ở `codex-rs/exec/src/lib.rs` — suy ra có chạy, **(chưa xác minh)** bằng chạy thật | mã |

## 5. `/import` — nguồn gốc các tệp chưa track

| Dữ kiện | Giá trị | Nguồn |
|---|---|---|
| Tính năng | lệnh `/import` (Claude Code hoặc Cursor): instruction → `AGENTS.md`, skill → `.agents/skills/`, subagent → `.codex/agents/`, hook → `.codex/hooks.json` + `.codex/hooks/` | learn.chatgpt.com/docs/import · crate `codex-rs/external-agent-migration` |
| `hooks.json` | chép script từ `.claude/hooks` sang `.codex/hooks`, viết lệnh với đường **tuyệt đối** của máy (`rewrite_hook_command_for_source`); chỉ chuyển hook `type=command` không `async`, bỏ nhóm có `if` hoặc khoá lạ | `hooks_common.rs`, `hooks_cla.rs` |
| Agent | `.claude/agents/*.md` → `<tên>.toml` với `name`, `description`, `model_reasoning_effort` (từ `effort`), `developer_instructions` (thân tệp); không chép `model` | `subagents.rs:27-30,226-260` |
| Lỗi đã biết | thay "claude" thành "Codex" trong nội dung, kể cả đường dẫn (issue #40147, còn mở) | github.com/openai/codex/issues/40147 |

Đối chiếu với tệp ở gốc repo khung (đọc 2026-11-19): `hooks.json` có 6 sự kiện với đường tuyệt đối và **không có
`PreToolUse`** (hook `PreToolUse` của `.claude/settings.json` mang khoá `onFailure`; importer bỏ nhóm có khoá lạ — suy từ
mã, chưa chạy lại importer); `.codex/hooks/guard.py` trùng
byte với `.claude/hooks/guard.py` ở commit `331145c1` (2026-11-13); bốn tệp agent có đường `.Codex/agents/…`,
`.Codex/skills/…` không tồn tại và thiếu `reviewer`; 11/16 skill trùng byte với `.claude/skills/`, 5 skill đã lạc hậu.
Công cụ và phiên bản đã chạy ngày 2026-11-14: **(chưa xác minh)**.

## 6. `error.log`

`codex cloud` ghi `error.log` vào cwd (`append_error_log`, `codex-rs/cloud-tasks/src/util.rs:19-30`), gồm dòng
`auth: set ChatGPT-Account-Id header: <id>` — tệp ở gốc repo khung chứa ID tài khoản; đã đưa `/error.log` vào
`.gitignore` (#682). Tài liệu chính thức không nhắc tệp này.

## 7. Chưa xác minh

- Hook có chạy ở `codex exec` không (chỉ suy từ mã).
- "Không có biến gốc dự án cho lệnh hook": dựa trên tài liệu và `git grep` trong `codex-rs/hooks/src`; lượt tìm trên toàn
  `codex-rs` lỗi mạng nên chưa phủ hết mã. Timeout 600 s của hook thường chỉ có ở tài liệu.
- Thứ tự ưu tiên khi trùng tên skill giữa các vị trí; trần dung lượng một `SKILL.md`.
- Giá trị mặc định của số luồng và độ sâu subagent.
- Payload stdin nguyên văn của `PreToolUse` ở 0.170.0 (adapter của khung dựng theo schema 2026-11-02).
- Danh sách chính thức "tệp nào dưới `.codex/`, `.agents/` nên commit" — tài liệu chỉ nói cấu hình nhóm "checked into repos".
