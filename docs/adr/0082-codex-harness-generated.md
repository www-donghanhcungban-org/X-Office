# ADR-0082: Harness Codex sinh từ `.claude/` — adapter hook, skill và agent

- **Trạng thái:** Đã chấp nhận ngày 2026-11-19 (D-519).
- **Trạng thái triển khai:** Mã, test và tệp sinh trong PR của ADR này; dự án đích nhận khi chạy `install.py --harness codex` sau bản cắt kế.

## Bối cảnh

Chủ repo 2026-11-19: *"cái nào liên quan đến harness thì tích hợp hết"*. Ở gốc repo khung có ba nhóm tệp chưa track do
lệnh `/import` của Codex CLI sinh ngày 2026-11-14 từ cấu hình Claude Code
([nghiên cứu](../../research/2026-11-19-codex-harness.md) §5):

- `.codex/hooks.json` ghi đường tuyệt đối của máy và **không có `PreToolUse`** — lệnh của Codex trong repo không qua guard;
  `.codex/hooks/` là bản sao `.claude/hooks/` ở commit `331145c1` (2026-11-13), thiếu mọi đợt harden sau đó.
- `.codex/agents/*.toml` trỏ đường không tồn tại (`.Codex/agents/…`, lỗi importer #40147) và thiếu `reviewer`.
- `.agents/skills/` là bản sao `.claude/skills/`; 5/16 skill đã lạc hậu sau năm ngày.

Khung đã có đường chính thức cho hook của Codex ([ADR-0064](0064-multi-provider-harness.md) lát B):
`.codex/hooks.json` gọi `xt_adapter.py codex`, dùng **một** guard ở `.claude/hooks/guard.py`. Phần còn thiếu là skill và
agent: Codex đọc `.agents/skills/<tên>/SKILL.md` và `.codex/agents/<tên>.toml` (nghiên cứu §2, §3), khung chưa sinh hai
thứ đó.

## Phương án đã xét

1. **Commit nguyên trạng tệp do `/import` sinh.** Đưa vào repo một bản guard thứ hai đã cũ (trái "một chủ đề một nhà",
   hàng rào lệch), đường tuyệt đối của một máy, đường dẫn sai trong agent; mỗi lần đổi skill phải nhập lại tay.
2. **Symlink `.agents/skills` → `.claude/skills`.** Codex theo symlink, không trùng lặp; nhưng agent TOML vẫn phải sinh,
   symlink trong git không chạy trên Windows/zip, và `install.py` cố ý không ghi xuyên symlink ở thư mục harness
   (AUD-SEC-650/651).
3. **Sinh từ `.claude/` bằng máy, có test giữ đồng bộ.** `.claude/` là nguồn duy nhất; tệp cho Codex là sản phẩm sinh,
   commit vào repo để Codex đọc được ngay sau clone, và test đỏ khi lệch.

## Quyết định

Chọn phương án 3.

1. **Hook:** `.codex/hooks.json` chỉ có `PreToolUse` gọi `xt_adapter.py codex` (mẫu
   [`codex-hooks.json`](../../framework/templates/harness/codex-hooks.json)); không chép `.claude/hooks/` sang `.codex/hooks/`.
   Sáu sự kiện khác mà importer chuyển (`Stop`, `SessionStart`, `PreCompact`, `PermissionRequest`, `PostToolUse`,
   `SubagentStop`) **không** đưa vào: script của chúng đọc payload Claude, chưa kiểm với payload Codex; `ask` Codex không hỗ
   trợ (nghiên cứu §4). Repo khung dùng cùng mẫu với đường `scripts/xt_adapter.py`.
2. **Skill:** `.agents/skills/<tên>/SKILL.md` là bản sao byte của `.claude/skills/<tên>/SKILL.md` cho mọi skill của khung.
3. **Agent:** `.codex/agents/<tên>.toml` sinh từ `.claude/agents/<tên>.md` cho cả năm agent: `name`, `description`,
   `model_reasoning_effort` (từ `effort`), `developer_instructions` (thân tệp, giữ nguyên đường `.claude/…` vì các tệp đó
   vẫn ở repo). Không ghi `model`: tên model Claude không có nghĩa với Codex — agent thừa hưởng model của phiên.
4. **Một bộ sinh, hai nơi dùng:** `install.py --harness codex` sinh ba nhóm trên ở dự án đích (ghi `manifest.json`); repo
   khung commit đúng đầu ra của bộ sinh đó, và test so từng byte với đầu ra sinh lại — lệch thì đỏ kèm lệnh sinh lại.

## Hệ quả

- Lệnh shell/ghi tệp/MCP của Codex trong repo khung và dự án đích qua cùng guard với Claude Code, **sau khi** người dùng tin
  cậy hook bằng `/hooks` (theo hash; đổi `hooks.json` phải tin cậy lại). Chưa tin cậy thì Codex bỏ qua cả lớp `.codex/`.
- Sửa skill hay agent ở `.claude/` phải sinh lại (một lệnh); test giữ cho không trôi. Tốn ~80 KB tệp trùng trong repo.
- Giới hạn đã biết: (a) vòng "chạy đến khi xong" của autopilot dựa vào Stop hook — chưa có ở Codex; (b) luật "reviewer
  năng lực cao hơn người viết" (`LOOP-ORCH-005`) ở Codex không giữ được cho cặp mặc định: `executor` và `reviewer` đều không
  khai effort nên chạy như nhau; chỉ `executor-deep` (high) với `reviewer-alt` (max) còn khác bậc; (c) tool đọc tệp của Codex không qua
  adapter (như ghi ở [`harness/README.md`](../../framework/templates/harness/README.md)); (d) mức hỗ trợ Codex vẫn là
  **thử nghiệm** tới khi có payload thật (ADR-0068 lát D).
- Chưa làm trong ADR này (ghi sổ): guard chưa xếp `.agents/skills/*`, `.codex/agents/*`, `.codex/hooks.json` vào nhóm
  "năng lực" cần duyệt như `.claude/{agents,skills}` ở dự án đích (AUD-SEC-987); `doctor --drift` chưa kiểm `codex_files`;
  ngoài repo git lệnh hook thoát 2 nên Codex chặn mọi tool khớp matcher.
- Tệp `/import` cũ ở máy dev (`.codex/hooks/`, bản `hooks.json` có đường tuyệt đối) không thuộc repo: người dùng xoá hoặc
  để ngoài; `git pull` sẽ từ chối ghi đè tệp chưa track trùng tên cho tới khi dời chúng đi.

Đường lùi: xoá `.agents/skills/`, `.codex/` khỏi repo và bỏ nhánh sinh trong `install.py` (revert PR của ADR này); Claude
Code không bị ảnh hưởng.
