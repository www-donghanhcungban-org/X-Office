# Đóng góp cho khung X-office

> Luật vận hành cho người và AI: [`AGENTS.md`](AGENTS.md). Quy ước viết module: [`framework/00-method/conventions.md`](framework/00-method/conventions.md).

## Trước khi bắt đầu
- Một thay đổi = một nhánh (`feat/...`, `fix/...`, `docs/...`) = một PR nhỏ. Mọi merge vào `main` qua PR, **squash**, tiêu đề dạng conventional commit.
- Việc lớn (thêm mảng, đổi cấu trúc, đổi hành vi `xt.py`): mở issue/ADR trước (`docs/adr/`, `/adr`).

## Vòng làm việc
1. `python3 scripts/xt.py validate` và `python3 -m unittest discover -s tests` phải xanh **trước** khi commit (hook `pre-bash-guard` tự chạy `scripts/dev-task.sh gate-fast` theo `commit_gate` của `xt.yaml`; cổng đầy đủ là CI).
2. Thêm/sửa mục checklist: giữ ID cũ, không tái sử dụng ID; mục bỏ → `MAY` + "Ngừng dùng". Mọi MUST có `→ Kiểm:`.
3. Phiên bản/chuẩn/luật: nguồn chính thống + ngày xác minh; không xác minh được → "(chưa xác minh)".
4. Cập nhật README chỉ mục của mảng và `CHANGELOG.md` (mục *Unreleased*).
5. Mở PR theo mẫu; CI (`quality`, `gitleaks`, `protection-guard`, `dep-audit`, `pack-npm-audit`) xanh mới merge — máy merge ghim head qua `pr next`, không bật auto-merge của GitHub (ADR-0036).

## Bảo vệ nhánh `main`
`.github/rulesets/main.json` là ruleset **import được** (Settings → Rules → Rulesets → New ruleset → Import a ruleset): bắt buộc PR, chỉ squash,
required check `quality` · `protection-guard` · `gitleaks` · `dep-audit` · `pack-npm-audit`, cấm xoá/force-push, không ai bypass (`merge-gate.yml` chỉ là stub tạm giữ context cũ tới khi chủ repo gỡ khỏi ruleset sống — D-122, ADR-0036). Job `protection-guard` kiểm (1) mọi required check là job có thật
(đổi tên job mà quên sửa ruleset = khoá `main` vĩnh viễn trong khi CI vẫn xanh) — **đỏ** nếu lệch; (2) ruleset có đang hiệu lực không — hiện chỉ
**cảnh báo** để repo mới chưa import vẫn merge được; muốn ép buộc, đổi `::warning` thành `exit 1` trong `ci.yml`.

`required_approving_review_count` = 0 vì repo một người: GitHub không cho tự duyệt PR của mình và `bypass_actors` rỗng, đặt 1 sẽ khoá mọi PR.
Nâng lên ≥ 1 ngay khi có người thứ hai (sửa JSON qua PR rồi import lại).

## Harness `.claude/`
Hook/skill/agent trong `.claude/` được `scripts/install.py` copy sang dự án đích (copy-if-absent). Sửa chúng = sửa hành vi của mọi dự án dùng khung:
giữ fail-open, không hard-code stack, thêm test payload trong `tests/test_hooks.py`.

## Giấy phép đóng góp
Đóng góp theo nguyên tắc *inbound = outbound*: nội dung bạn gửi phát hành theo [MIT](LICENSE) như phần còn lại của repo.
Chỉ gửi nội dung bạn có quyền cấp phép: không chép nguyên văn chuẩn có bản quyền (ISO, CIS, PCI DSS…), tài liệu CC BY-SA/NC
hay mã của dự án khác — tóm tắt bằng lời mình và dẫn link. Mã bên thứ ba bắt buộc vendor thì giữ `LICENSE`/`SOURCE` cạnh nó
(`CMP-LIC-022`) và thêm vào [`NOTICE`](NOTICE).

## Phong cách
Tiếng Việt có dấu; thuật ngữ kỹ thuật giữ tiếng Anh; tên file kebab-case tiếng Anh; không "số ma thuật" không nguồn; một chủ đề một nhà.
