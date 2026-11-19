---
title: Đề xuất từ stored PR150–157 — đợt 11–16/11/2026, XT-H-126…131
kind: research
updated: 2026-11-16
---

# Đề xuất từ stored: đo token từ ảnh tham chiếu, kiểm lệch token thiết kế–code, và bốn ví dụ bổ sung

Bổ sung cho [đợt 5–8/11](2026-11-10-stored-delta-nov-5-8.md). File này chỉ là **research note đề xuất**: chưa sửa yêu cầu trong `framework/`, chưa cấp ID mới, chưa đổi mức hiện có và chưa triển khai công cụ.

## 1. Phạm vi và cách đối chiếu

- Nguồn: `seeker19110/stored` từ `82ab9b2` đến merge [`c607013`](https://github.com/seeker19110/stored/commit/c60701366d3e20e24b352ff182ecb725ec05ebcb) ngày 2026-11-16 (PR #150…#157). Các mục liên quan: 03 §8m, 06 §7n.6, §7zc–§7ze, 20 §3zc, 22 §9l.
- Bàn giao máy đọc: [XT-H-126…131](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/data/xt-handoff.json), [bảng phía stored](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/X-TEMPLATES.md) (§4g, §5d, §5e).
- Khung đối chiếu: `framework/` tại `efa521a` ngày 2026-11-16. Đã rà 125 bàn giao cũ để tránh trùng. Phân loại 2 **nông hơn**, 4 **sâu hơn**, 0 **chưa có**.
- Đợt XT-H-117…125 ([research note 2026-11-10](2026-11-10-stored-delta-nov-5-8.md)) chưa thành ID ở `efa521a`; thứ tự ưu tiên gộp hai đợt ở §4.
- Bằng chứng upstream là đọc mã/README/docs ghi ngày, không chạy công cụ.

## 2. Bản đồ 6 đề xuất

| Bàn giao | Phạm vi | ID gần nhất | Cột |
|---|---|---|---|
| XT-H-126 | Dựng lại giao diện theo ảnh tham chiếu: màu ước bằng mắt lệch về bảng màu quen (Design DNA ghi #ff90e8 bị thấy thành #ec4899, ΔE ≈ 29); đo bằng k-means tất định trên pixel thật rồi verify bản dựng bằng ΔE (bun.sh: PASS, ΔE trung bình 0,87; bản ước bằng mắt FAIL, ΔE 9,54). | `FE-START-005`, `UX-DS-014` | nông hơn |
| XT-H-127 | Token và component giữa thiết kế và code lệch âm thầm: sync-figma-token báo khớp/lệch/thiếu, bắt duyệt trước khi áp, chỉ áp phần chênh, lưu báo cáo; component-contracts-figma và uSpec dùng một file contract JSON làm nguồn cho cả code, biến Figma và đặc tả screen reader. | `UX-DS-018`, `UX-DS-014` | nông hơn |
| XT-H-128 | Skill cho một thư viện ghi rõ phiên bản đích (threejs-skills nhắm three.js r186, R3F 9.8, drei 10.7) và mục "Common Mistakes" ghi code cũ → cách đúng ở bản đó, vì dữ liệu huấn luyện trộn nhiều bản. | `XC-DOCAI-012`, `OPS-MAINT-015`, `WF-DOC-019` | sâu hơn |
| XT-H-129 | Kiểm giao diện app điện thoại bằng probe tự động (evondevKit probe --mobile): vùng chạm nhỏ, chữ nhỏ, dòng cuối bị thanh tab che, sheet thiếu lớp phủ, ô nhập số thiếu inputmode, ô thiếu nhãn, màn lỗi chung chung, màn mất nút quay lại. | `UX-A11Y-006`, `FE-FORM-004`, `PRF-MOB-011` | sâu hơn |
| XT-H-130 | Thêm ca tên chuẩn: kepano/obsidian-skills chuyển về obsidianmd/obsidian-skills; godly.website chuyển 301 về recent.design; link achimala/dream không tồn tại (repo đúng achimala/dream-loop); README của REA dặn chỉ tải từ repo, site và gói npm chính thức vì tên repo giống nhau không chứng minh bản chính thức. | `SEC-SUPPLY-026` | sâu hơn |
| XT-H-131 | Nghiên cứu 36.710 repo, 217 vòng lặp tự trị (arXiv 2608.21884) thấy gần như không repo nào commit file trạng thái mà các bài hướng dẫn khuyên; bài arXiv 2611.06946 tách ranh: cơ chế cho một lần chạy thuộc agent harness, cơ chế qua từ hai lần chạy hoặc mang trạng thái sang lần sau thuộc lớp factory. | `LOOP-DESIGN-006`, `LOOP-CTX-006` | sâu hơn |

## 3. Delta và phép kiểm đề xuất

### XT-H-126

**Hồ sơ nguồn:** [22-motion-design-animation/README.md#9l](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/22-motion-design-animation/README.md#9l-kiểm-ảnh-4-skill-claude-code-làm-animation-threejs-gsap-design-dna-motion-design-ảnh-người-dùng-gửi-đọc-mã-16112026).

**Khung đã có:** FE-START-005 (MAY) dặn chỉ tham khảo bố cục, không chép asset/logo/văn bản; UX-DS-014 đòi ảnh trước/sau khi đổi token.

**Phần cần bổ sung:** Chưa có yêu cầu cho bước agent trích token từ ảnh hoặc trang tham chiếu: màu do model ước dễ trôi về bảng màu mặc định, và chưa có phép đo sau khi dựng lại.

**Đề xuất SHOULD:** Khi agent trích token (màu, chữ, spacing) từ ảnh hoặc trang tham chiếu, SHOULD đo màu bằng công cụ tất định trên pixel thật (mã hex, tỉ lệ phủ, vai trò) thay vì để model ước; sau khi dựng, chụp bản dựng và so từng token với số đo, ghi ΔE và ngưỡng đạt; giữ nguồn tham chiếu và giới hạn quyền theo FE-START-005. Kiểm fixture: ảnh có màu nhấn hồng #ff90e8 thì token trích ra không được thành #ec4899; bản dựng lệch nền đen gần (#16151b → #000000) phải FAIL.

**Đối chiếu khung:** [FE-START-005](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/07-frontend/starter-layouts.md#L45), [UX-DS-014](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/06-design-ux/design-system-and-tokens.md#L61).

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/zanwei/design-dna/blob/593e39bc9e3652734653bd75544a333d7d43615e/README.md) · [nguồn 2](https://github.com/zanwei/design-dna/blob/593e39bc9e3652734653bd75544a333d7d43615e/SKILL.md).

### XT-H-127

**Hồ sơ nguồn:** [06-ui-ux-design/README.md#7ze](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/06-ui-ux-design/README.md#7ze-kiểm-ảnh-bộ-skill-figma-cho-claude-telos-academy-11-skill-từ-figma-use-tới-cc-figma-tokens-ảnh-người-dùng-gửi-đọc-mã-16112026).

**Khung đã có:** UX-DS-018 (MAY) xuất token sang Penpot/Figma và ghi ngày đồng bộ; UX-DS-014 đưa thay đổi token qua PR riêng có ảnh trước/sau.

**Phần cần bổ sung:** Chưa có kiểm lệch hai chiều giữa biến của công cụ thiết kế và token trong code, chưa có bước duyệt trước khi ghi vào file thiết kế.

**Đề xuất SHOULD:** Với dự án dùng công cụ thiết kế có biến (Figma, Penpot), SHOULD giữ một nguồn token/contract trong repo; CI hoặc lệnh định kỳ so biến thiết kế với token code và báo ba trạng thái khớp/lệch/thiếu, lưu báo cáo có ngày; ghi ngược vào file thiết kế chỉ sau khi người duyệt bản chênh và chỉ áp phần chênh. Kiểm fixture: radius/lg 24px trong thiết kế và 20px trong code phải báo lệch; color/muted có ở thiết kế mà thiếu trong code phải báo thiếu.

**Đối chiếu khung:** [UX-DS-018](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/06-design-ux/design-system-and-tokens.md#L65), [UX-DS-014](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/06-design-ux/design-system-and-tokens.md#L61).

**Liên quan đợt trước:** XT-H-125; chỉ giữ phần delta nêu trên.

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/firebenders/sync-figma-token-skill/blob/c017392e2061874124eef61b9f29a7301ad844d1/skills/sync-figma-token/SKILL.md) · [nguồn 2](https://github.com/nvillapiano/component-contracts-figma/blob/14db03bba7727122a7704d46aef1a5f28a2d6dcc/skills/cc-figma-component/SKILL.md) · [nguồn 3](https://github.com/nvillapiano/component-contracts-figma/blob/14db03bba7727122a7704d46aef1a5f28a2d6dcc/skills/cc-figma-tokens/SKILL.md) · [nguồn 4](https://github.com/redongreen/uSpec/blob/1e25e9b8bc2e694689ba0489594f38807a341f14/README.md) · [nguồn 5](https://github.com/redongreen/uSpec/blob/1e25e9b8bc2e694689ba0489594f38807a341f14/skills/create-voice/SKILL.md).

### XT-H-128

**Hồ sơ nguồn:** [22-motion-design-animation/README.md#9l](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/22-motion-design-animation/README.md#9l-kiểm-ảnh-4-skill-claude-code-làm-animation-threejs-gsap-design-dna-motion-design-ảnh-người-dùng-gửi-đọc-mã-16112026).

**Khung đã có:** XC-DOCAI-012 đòi tài liệu nạp cho agent có phiên bản và ngày; OPS-MAINT-015 ghi phiên bản harness; WF-DOC-019 ghim lệnh cài.

**Phần cần bổ sung:** Thêm ví dụ: skill hoặc tài liệu cho agent về một dependency ghi phiên bản đích, và dự án so phiên bản đó với lockfile; lệch thì báo trước khi agent dùng snippet. Gắn với XT-H-095 (requested/served version), không cần ID mới.

**Xử lý:** chỉ thêm ví dụ/fixture vào ID hiện có, không cần ID mới.

**Đối chiếu khung:** [XC-DOCAI-012](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/18-cross-cutting/docs-for-ai-agents.md#L54), [OPS-MAINT-015](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/15-operations/maintenance-and-lifecycle.md#L52), [WF-DOC-019](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/10-workflow/documentation-workflow.md#L63).

**Liên quan đợt trước:** XT-H-095; chỉ giữ phần delta nêu trên.

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/CloudAI-X/threejs-skills/blob/0e181866f095b5f06d005133876e926515390d95/README.md) · [nguồn 2](https://github.com/CloudAI-X/threejs-skills/blob/0e181866f095b5f06d005133876e926515390d95/LICENSE).

### XT-H-129

**Hồ sơ nguồn:** [06-ui-ux-design/README.md#7n6](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/06-ui-ux-design/README.md#7n6-đọc-lại-16112026-v093-làm-tốt-cả-mobile-app-ui-skill-landing-evonlanding-đang-được-audit-bài-đăng-người-dùng-gửi).

**Khung đã có:** UX-A11Y-006 đo vùng chạm; FE-FORM-004 đòi type/inputmode đúng; PRF-MOB-011 đòi a11y theo nền tảng.

**Phần cần bổ sung:** Thêm ví dụ bộ kiểm tự động cho khung 375×812: dòng cuối không bị thanh tab che sau khi cuộn hết, sheet có lớp phủ, màn con có nút quay lại. Ba điểm này chưa nằm trong ID nào nhưng nhỏ, gộp làm fixture của QA E2E mobile.

**Xử lý:** chỉ thêm ví dụ/fixture vào ID hiện có, không cần ID mới.

**Đối chiếu khung:** [UX-A11Y-006](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/06-design-ux/accessibility.md#L44), [FE-FORM-004](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/07-frontend/forms-and-validation.md#L43), [PRF-MOB-011](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/02-profiles/mobile-app.md#L71).

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/evondev/evondevKit/blob/5a892ceac93d1bb286391663eb01cbd011706886/README.vi.md) · [nguồn 2](https://github.com/evondev/evondevKit/blob/5a892ceac93d1bb286391663eb01cbd011706886/NEXT.md).

### XT-H-130

**Hồ sơ nguồn:** [06-ui-ux-design/README.md#7zc](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/06-ui-ux-design/README.md#7zc-hai-mươi-trang-cảm-hứng-và-tài-nguyên-thiết-kế-gallery-từng-phần-giao-diện-chuyển-động-làm-web-bằng-ai-danh-sách-người-dùng-gửi-đọc-16112026), [06-ui-ux-design/README.md#7zd](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/06-ui-ux-design/README.md#7zd-sáu-công-cụ-cho-designer-dùng-ai-dream-loop-hairline-skill-emil-kowalski-skill-meng-to-rea-html-demo-danh-sách-người-dùng-gửi-đọc-mã-16112026), [20-claude-plugins-ecosystem/README.md#3zc](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/20-claude-plugins-ecosystem/README.md#3zc-kiểm-bài-5-repo-skill-đáng-lưu-matt-pocock-addy-osmani-cloudflare-obsidian-google-egm-bài-người-dùng-gửi-đọc-mã-16112026).

**Khung đã có:** SEC-SUPPLY-026 đọc bảo trì theo lịch sử thật. Đề xuất tên chuẩn đã ở XT-H-123.

**Phần cần bổ sung:** Chỉ thêm ba ví dụ và một ca âm (link không tồn tại) cho fixture của XT-H-123; không cần ID mới.

**Xử lý:** chỉ thêm ví dụ/fixture vào ID hiện có, không cần ID mới.

**Đối chiếu khung:** [SEC-SUPPLY-026](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/12-security/supply-chain.md#L72).

**Liên quan đợt trước:** XT-H-123; chỉ giữ phần delta nêu trên.

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/obsidianmd/obsidian-skills/blob/398127736bd4ba42d767b1419fee1a927508370b/README.md) · [nguồn 2](https://github.com/obsidianmd/obsidian-skills/blob/398127736bd4ba42d767b1419fee1a927508370b/LICENSE) · [nguồn 3](https://github.com/morluto/rea/blob/8ffea11ee30d5e0d442a8d14b27e05b0441b9e18/README.md) · [nguồn 4](https://github.com/morluto/rea/blob/8ffea11ee30d5e0d442a8d14b27e05b0441b9e18/LICENSE).

### XT-H-131

**Hồ sơ nguồn:** [03-agentic-patterns-loops/README.md#8m](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/03-agentic-patterns-loops/README.md#8m-kiểm-ảnh-và-bài-ai-coding-is-moving-beyond-the-agent-5-lớp-model--harness--loop--graph--software-factory-ảnh-và-bài-viết-lại-người-dùng-gửi-đối-chiếu-nguồn-gốc-11112026).

**Khung đã có:** LOOP-DESIGN-006 (MUST@L) và LOOP-CTX-006 (MUST) đã bắt trạng thái bền nằm trong repo; X-office làm đúng điều số đông bỏ qua.

**Phần cần bổ sung:** Thêm bằng chứng nguồn cho LOOP-DESIGN-006 và tiêu chí phân ranh harness/factory cho tài liệu 11-autonomous-loop; không đổi mức, không cần ID mới.

**Xử lý:** chỉ thêm ví dụ/fixture vào ID hiện có, không cần ID mới.

**Đối chiếu khung:** [LOOP-DESIGN-006](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/11-autonomous-loop/loop-design.md#L67), [LOOP-CTX-006](https://github.com/seeker19110/X-Templates/blob/efa521a64e2c2be2cdd596b7b8fd59bab8029cf0/framework/11-autonomous-loop/context-and-token-budget.md#L73).

**Nguồn triển khai upstream:** [nguồn 1](https://arxiv.org/abs/2608.21884) · [nguồn 2](https://arxiv.org/abs/2611.06946).

## 4. Thứ tự gợi ý (gộp đợt 117…125 còn chờ) và giới hạn áp dụng

1. **XT-H-122** (đợt trước): tool gửi tin của connector MCP là hành động đối ngoại; vẫn là rủi ro cao nhất.
2. **XT-H-127**: một nguồn token trong repo, báo khớp/lệch/thiếu giữa biến thiết kế và code, ghi vào file thiết kế sau khi duyệt. Nhà gần nhất `06-design-ux` (`UX-DS-018` đang là MAY).
3. **XT-H-126**: đo token từ ảnh tham chiếu và verify bằng ΔE; hợp làm một bước của skill `/ui-verify` hoặc quy trình dựng theo mẫu.
4. **XT-H-123 + XT-H-130**: kiểm tên chuẩn trong `doctor`, thêm ba ví dụ và một ca link không tồn tại.
5. **Chỉ ví dụ:** XT-H-128 (nối XT-H-095), 129 (fixture E2E mobile), 131 (nguồn cho `LOOP-DESIGN-006`).

**Áp lên dự án đích:** khi khung thêm ID, dự án chạy lại `install.py`, ghép lại blueprint bằng `xt.py compose`; mục SHOULD vào `BLUEPRINT-BACKLOG.md` và chỉ hiện ở hồ sơ có điều kiện tương ứng (126/127: dự án dựng UI theo mẫu hoặc có file thiết kế dùng biến; 129: `mobile-app`). Phía stored có bảng chi tiết ở `X-TEMPLATES.md` §5e.

Phiên triển khai tiếp theo tự quyết cách gộp vào ID hiện có hay cấp ID mới; cập nhật module/README/CHANGELOG và ADR khi quy tắc khung yêu cầu. Research note này không cài thêm stack, không sửa blueprint dự án đích và không tự bật auto-merge.

## 5. Nguồn và trạng thái xác minh

- [stored: phương pháp và mức bằng chứng](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/METHOD.md), [catalog](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/data/projects.json), [nguồn](https://github.com/seeker19110/stored/blob/c60701366d3e20e24b352ff182ecb725ec05ebcb/SOURCES.md) (các mục "Bổ sung" 2026-11-11 tới 2026-11-16f).
- Nguồn trực tiếp và ngày/SHA ở từng hồ sơ phía stored; chỗ **(chưa xác minh)** giữ nguyên mức đó.
- Đã so với các note stored-delta trước và 125 bàn giao cũ; dòng có related_handoffs chỉ đề xuất phần sâu hơn.
