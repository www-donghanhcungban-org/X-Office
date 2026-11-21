---
title: Đề xuất từ stored PR158–166 — mốc 1150 và 1550 hồ sơ, XT-H-132…139
kind: research
updated: 2026-11-18
---

# Đề xuất từ stored: giấy phép theo thư mục, tín hiệu ngừng phát triển, gateway LLM, khoá ngoài tiến trình agent và trình duyệt đã đăng nhập

Bổ sung cho [đợt 11–16/11](2026-11-16-stored-delta-nov-11-16.md). File này chỉ là **research note đề xuất**: chưa sửa yêu cầu trong `framework/`, chưa cấp ID mới, chưa đổi mức hiện có và chưa triển khai công cụ.

## 1. Phạm vi và cách đối chiếu

- Nguồn: `seeker19110/stored` từ `c607013` đến merge [`4de3197`](https://github.com/seeker19110/stored/commit/4de31978989dbdf4b85445477c5eb3d1e72d7bf5) ngày 2026-11-18 (PR #158…#166). Mục liên quan: 06 §7zf, 08 §6c, §6c.4, §6c.5 (lọc lại 694 repo của kho-repo, catalog 1113 → 1563).
- Bàn giao máy đọc: [XT-H-132…139](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/data/xt-handoff.json), [bảng phía stored](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/X-TEMPLATES.md) (§4h, §4i, §5f, §5g).
- Khung đối chiếu: `framework/` tại `3cd50cb` ngày 2026-11-18. Đã rà 131 bàn giao cũ để tránh trùng. Phân loại 3 **nông hơn**, 5 **sâu hơn**, 0 **chưa có** (đã đính chính: bản đầu ghi XT-H-137…139 là nông hơn; đối chiếu lại tại `7cf743f` thấy `CMP-LIC-004`, `OPS-MAINT-008`, `AI-APP-021` đã phủ phần lớn).
- Bằng chứng upstream là đọc README, LICENSE và cây thư mục ghi ngày và SHA, không chạy công cụ.

## 2. Bản đồ 8 đề xuất

| Bàn giao | Phạm vi | ID gần nhất | Cột |
|---|---|---|---|
| XT-H-132 | Thêm công tắc telemetry và kênh dữ liệu từ đợt đọc 40 repo: modern-web-guidance gửi tên agent, ID guide và truy vấn tìm kiếm (tắt bằng DISABLE_TELEMETRY=1); Agno gửi telemetry mỗi agent (AGNO_TELEMETRY=false); TradingAgents kiểm bản mới mỗi ngày (TRADINGAGENTS_NO_UPDATE_CHECK=1); 182 skill của google/skills dặn agent gắn tag agent-skills/1.0 vào User-Agent khi gọi gcloud/REST. | `BASE-DEP-006`, `FE-BUILD-017`, `SEC-INFRA-027`, `LOOP-HARNESS-030` | sâu hơn |
| XT-H-133 | Tên gói và kênh cài bị mạo danh ở phía người dùng: gói agent-reach trên PyPI không phải của dự án; gói npm omo thuộc người khác (đúng là omo-ai); book-to-skill cảnh báo bản re-upload độc hại; Archify ghi kênh chính thức chỉ có archify.si và GitHub. | `BASE-DEP-006`, `BASE-DEP-011`, `XC-OSS-021` | nông hơn |
| XT-H-134 | Giấy phép không phải OSI gặp nhiều ở skill và kit UI: Animate UI (MIT + Commons Clause, chép component vào repo được nhưng không bán lại component gốc), oh-my-openagent (Sustainable Use, chỉ nội bộ/phi thương mại), academic-research-skills (CC BY-NC cho skill), autoresearch (MIT chỉ ghi trong README, không có file LICENSE), Archify (MIT trước một commit mốc, Apache-2.0 sau đó). | `CMP-LIC-004`, `CMP-LIC-022` | sâu hơn |
| XT-H-135 | OpenAI Symphony chạy tool tracker ở phía host bằng auth đã cấu hình và gỡ token tracker khỏi môi trường tiến trình Codex con; agent chỉ thấy kết quả tool, không thấy khóa. | `SEC-AI-007`, `LOOP-HARNESS-022` | nông hơn |
| XT-H-136 | Công cụ nối agent vào trình duyệt thật đã đăng nhập: browser-harness điều khiển cả Chrome qua CDP sau khi bật remote debugging; Agent-Reach chép cookie một trang từ Chrome và khuyên dùng tài khoản phụ; last30days dùng cookie x.com trên trình duyệt. | `QA-E2E-030`, `SEC-AI-007` | nông hơn |
| XT-H-137 | Repo open-core phổ biến để giấy phép khác nhau theo thư mục: Infisical, Onyx, Strapi, SigNoz, TabbyML, Amplication để mã ngoài ee/ theo MIT hoặc Apache-2.0 còn ee/ theo giấy phép thương mại; Docmost và Documenso thêm packages/ee; Dyad để src/pro theo FSL; Stirling-PDF có thư mục proprietary; Medusa ghi tính năng Enterprise trong ENTERPRISE-LICENSE.md. GitHub API và SPDX ở gốc chỉ thấy giấy phép mở. | `CMP-LIC-004`, `CMP-LIC-002` | sâu hơn |
| XT-H-138 | Repo chưa archive và vẫn có commit nhưng README tự nêu không còn phát triển: Rasa Open Source ghi đang ở Maintenance Mode và hướng sang sản phẩm khác; ageron/handson-ml ghi đã lỗi thời và thay bằng handson-ml3; ultralytics/yolov5 vẫn cập nhật nhưng đã có gói ultralytics mới hơn. Lọc chỉ bằng archived hoặc ngày release bỏ sót các trường hợp này. | `OPS-MAINT-008` | sâu hơn |
| XT-H-139 | Một nhóm proxy LLM nhiều sao chuyên định tuyến agent lập trình qua tài khoản thuê bao cá nhân: CLIProxyAPI dùng đăng nhập OAuth của từng nhà cung cấp, 9router xoay vòng nhiều tài khoản và gói đăng ký, opencodex tự cảnh báo một số nhà cung cấp có thể khoá tài khoản khi đi qua proxy và gộp nhiều tài khoản ChatGPT không được bảo đảm. Kho không thêm các repo này. | `AI-APP-021`, `AI-OBS-009` | sâu hơn |

## 3. Delta và phép kiểm đề xuất

### XT-H-132

**Hồ sơ nguồn:** [08-awesome-lists-learning/README.md#6c](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/08-awesome-lists-learning/README.md#6c-kho-repo-của-phan-đông-giang-phandonggiangcomkho-repo-694-repo-32-nhóm-và-24-repo-aiagent-đọc-mã-bảng-người-dùng-dán-kiểm-18112026).

**Khung đã có:** BASE-DEP-006 cấm phụ thuộc bật telemetry mặc định; FE-BUILD-017 tắt telemetry toolchain; SEC-INFRA-027 là bảng công tắc; LOOP-HARNESS-030 đòi bảng kênh dữ liệu rời máy đọc từ mã.

**Phần cần bổ sung:** Chỉ thêm các dòng mới vào bảng công tắc SEC-INFRA-027 và một ví dụ cho LOOP-HARNESS-030: skill có thể dặn agent gắn tag định danh vào lời gọi API, đây cũng là kênh dữ liệu cần ghi. Không cần ID mới.

**Đề xuất:** chỉ thêm ví dụ vào ID hiện có, không cần ID mới.

**Đối chiếu khung:** [BASE-DEP-006](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/01-baseline/dependencies.md#L43), [FE-BUILD-017](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/07-frontend/build-and-tooling.md#L57), [SEC-INFRA-027](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/12-security/infrastructure-and-network.md#L69), [LOOP-HARNESS-030](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/11-autonomous-loop/harness-files.md#L354).

**Liên quan đợt trước:** XT-H-002, XT-H-045; chỉ giữ phần delta nêu trên.

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/GoogleChrome/modern-web-guidance/blob/64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65/README.md) · [nguồn 2](https://github.com/agno-agi/agno/blob/2e9a4521003da1cae559d8049a1c73306fc68004/README.md) · [nguồn 3](https://github.com/TauricResearch/TradingAgents/blob/9fa1196fffbcfd9de5146d2dd2869df84ab99838/README.md) · [nguồn 4](https://github.com/google/skills/blob/739e294750207dcdb90e2a1b74c7517411a974d6/README.md).

### XT-H-133

**Hồ sơ nguồn:** [08-awesome-lists-learning/README.md#6c](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/08-awesome-lists-learning/README.md#6c-kho-repo-của-phan-đông-giang-phandonggiangcomkho-repo-694-repo-32-nhóm-và-24-repo-aiagent-đọc-mã-bảng-người-dùng-dán-kiểm-18112026).

**Khung đã có:** XC-OSS-021 (MAY) bắt repo phát hành ghi kênh chính thức; BASE-DEP-006 kiểm repo trước khi thêm phụ thuộc; BASE-DEP-011 kiểm toàn vẹn khi cài.

**Phần cần bổ sung:** Chưa có luật phía dùng: trước khi cài công cụ, skill hay gói theo tên, đối chiếu tên với kênh chính thức do dự án công bố; integrity chỉ chứng minh đúng gói đã khóa, không chứng minh đúng dự án.

**Đề xuất SHOULD:** Trước khi thêm phụ thuộc, công cụ agent hoặc skill theo tên registry, SHOULD đối chiếu tên gói, owner/repo và domain cài với kênh chính thức trong README hoặc SECURITY.md của dự án, ghi nguồn đối chiếu vào PR; lệnh cài trong tài liệu dự án đích trỏ đúng tên đã đối chiếu. Kiểm fixture: lệnh `npm install omo` trong khi dự án công bố `omo-ai` bị báo lệch.

**Đối chiếu khung:** [BASE-DEP-006](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/01-baseline/dependencies.md#L43), [BASE-DEP-011](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/01-baseline/dependencies.md#L48), [XC-OSS-021](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/18-cross-cutting/open-source-and-community.md#L60).

**Liên quan đợt trước:** XT-H-123; chỉ giữ phần delta nêu trên.

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/Panniantong/Agent-Reach/blob/c70ae6da5d39bc90e09ad2ae0575ccc89f31e284/README.md) · [nguồn 2](https://github.com/code-yeongyu/oh-my-openagent/blob/ac2844b2aa3713455948d3ff82035349971a562f/README.md) · [nguồn 3](https://github.com/virgiliojr94/book-to-skill/blob/e7bb659d3261491c8b28793dcb9102fa64a46c22/README.md) · [nguồn 4](https://github.com/tt-a1i/archify/blob/44781293f38728baf04dbad33ce1a0cef8c39cca/README_EN.md).

### XT-H-134

**Hồ sơ nguồn:** [06-ui-ux-design/README.md#7zf](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/06-ui-ux-design/README.md#7zf-hồ-sơ-imskyleenanimate-ui-animate-ui-primitive-có-animation-thay-thẳng-cho-radix-ui-base-ui-react-aria-giữ-nguyên-component-shadcnui-ảnh-readme-người-dùng-gửi-đọc-mã-17112026), [08-awesome-lists-learning/README.md#6c](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/08-awesome-lists-learning/README.md#6c-kho-repo-của-phan-đông-giang-phandonggiangcomkho-repo-694-repo-32-nhóm-và-24-repo-aiagent-đọc-mã-bảng-người-dùng-dán-kiểm-18112026).

**Khung đã có:** CMP-LIC-004 phân loại riêng source-available (có Commons Clause); CMP-LIC-022 đòi LICENSE/NOTICE/SOURCE cho mã UI chép vào repo.

**Phần cần bổ sung:** Thêm ví dụ: Sustainable Use và CC BY-NC cho skill/prompt pack cũng vào nhóm "review"; giấy phép chỉ ghi trong README không có file LICENSE xếp là chưa rõ; giấy phép đổi theo commit mốc phải ghi commit đã dùng. Không cần ID mới.

**Đề xuất:** chỉ thêm ví dụ vào ID hiện có, không cần ID mới.

**Đối chiếu khung:** [CMP-LIC-004](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/16-compliance-privacy/licensing-and-ip.md#L52), [CMP-LIC-022](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/16-compliance-privacy/licensing-and-ip.md#L70).

**Liên quan đợt trước:** XT-H-025, XT-H-112; chỉ giữ phần delta nêu trên.

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/imskyleen/animate-ui/blob/9873c628afdcdb030e74dc2930774a2aa473bd39/README.md) · [nguồn 2](https://github.com/code-yeongyu/oh-my-openagent/blob/ac2844b2aa3713455948d3ff82035349971a562f/README.md) · [nguồn 3](https://github.com/Imbad0202/academic-research-skills/blob/c70feb7ab43265b31988c3ab38e8731d3bca0784/README.md) · [nguồn 4](https://github.com/karpathy/autoresearch/blob/228791fb499afffb54b46200aca536f79142f117/README.md) · [nguồn 5](https://github.com/tt-a1i/archify/blob/44781293f38728baf04dbad33ce1a0cef8c39cca/README_EN.md).

### XT-H-135

**Hồ sơ nguồn:** [08-awesome-lists-learning/README.md#6c](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/08-awesome-lists-learning/README.md#6c-kho-repo-của-phan-đông-giang-phandonggiangcomkho-repo-694-repo-32-nhóm-và-24-repo-aiagent-đọc-mã-bảng-người-dùng-dán-kiểm-18112026).

**Khung đã có:** SEC-AI-007 đòi identity theo người dùng/phiên, token TTL ngắn, scope hẹp; LOOP-HARNESS-022 đòi sandbox cho phiên không người trực.

**Phần cần bổ sung:** Chưa có luật cho bộ điều phối chạy agent con: khóa dịch vụ ngoài không được truyền vào biến môi trường của tiến trình agent.

**Đề xuất SHOULD:** Với bộ điều phối khởi chạy agent con (Codex, Claude Code, CLI agent khác), SHOULD giữ khóa dịch vụ ngoài ở phía host và gọi qua tool hoặc proxy chạy ngoài tiến trình agent; môi trường của tiến trình agent chỉ nhận biến cần thiết theo allowlist. Kiểm fixture: in môi trường bên trong tiến trình agent không thấy LINEAR_API_KEY hay token tracker dù bộ điều phối có.

**Đối chiếu khung:** [SEC-AI-007](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/12-security/ai-security.md#L59), [LOOP-HARNESS-022](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/11-autonomous-loop/harness-files.md#L346).

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/openai/symphony/blob/be10a1b79df723d6d7612b5651c8522704dafb2e/README.md).

### XT-H-136

**Hồ sơ nguồn:** [08-awesome-lists-learning/README.md#6c](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/08-awesome-lists-learning/README.md#6c-kho-repo-của-phan-đông-giang-phandonggiangcomkho-repo-694-repo-32-nhóm-và-24-repo-aiagent-đọc-mã-bảng-người-dùng-dán-kiểm-18112026).

**Khung đã có:** QA-E2E-030 đòi profile cô lập khi agent dùng trình duyệt để kiểm UI; SEC-AI-007 đòi scope hẹp.

**Phần cần bổ sung:** QA-E2E-030 chỉ nói về kiểm UI; chưa có luật khi công cụ agent cố ý dùng phiên đăng nhập thật của người dùng để đọc hoặc thao tác trên web.

**Đề xuất SHOULD:** Khi công cụ agent nối vào trình duyệt đã đăng nhập (CDP remote debugging, chép cookie), SHOULD dùng profile Chrome riêng chỉ đăng nhập đúng tài khoản cần (ưu tiên tài khoản phụ), chỉ bật trong phiên có người trực, tắt remote debugging sau phiên và ghi danh sách trang được phép. Kiểm: phiên không người trực không khởi được kết nối CDP tới profile chính.

**Đối chiếu khung:** [QA-E2E-030](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/14-testing-quality/e2e-and-accessibility.md#L65), [SEC-AI-007](https://github.com/www-donghanhcungban-org/X-Office/blob/3cd50cb2e1b1c673ded8a2de6e45c7a093f9dd19/framework/12-security/ai-security.md#L59).

**Liên quan đợt trước:** XT-H-005; chỉ giữ phần delta nêu trên.

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/browser-use/browser-harness/blob/4cccf3b8daf992227a6c9019ffbce5f7a2844280/README.md) · [nguồn 2](https://github.com/Panniantong/Agent-Reach/blob/c70ae6da5d39bc90e09ad2ae0575ccc89f31e284/README.md) · [nguồn 3](https://github.com/mvanhorn/last30days-skill/blob/a854f3bcb2c4344d7498426d653378510f8b253a/README.md).

### XT-H-137

**Hồ sơ nguồn:** [08-awesome-lists-learning/README.md#6c5](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/08-awesome-lists-learning/README.md#6c5-lọc-lại-toàn-bộ-kho-đọc-mã-437-repo-giữ-410-repo-18112026).

**Khung đã có:** CMP-LIC-004 đã đòi đọc LICENSE/NOTICE theo từng thư mục con cho skill/prompt pack và phân loại riêng source-available; CMP-LIC-002 có allow/deny/review theo SPDX.

**Phần cần bổ sung:** Chỉ mở rộng chữ của CMP-LIC-004: việc đọc LICENSE theo thư mục con áp cả cho mã ứng dụng open-core khi tự host, fork hoặc vendor (ee/, pro/, proprietary/ như Infisical, Onyx, Strapi, SigNoz, Docmost, Documenso, Dyad, Stirling-PDF), không chỉ skill/prompt pack. Không cần ID mới.

**Đề xuất:** chỉ sửa chữ hoặc thêm ví dụ vào ID hiện có, không cần ID mới (đính chính 18/11/2026).

**Đối chiếu khung:** [CMP-LIC-004](https://github.com/www-donghanhcungban-org/X-Office/blob/7cf743fcd5a70137d9bf8b1e355354985ae76697/framework/16-compliance-privacy/licensing-and-ip.md#L52), [CMP-LIC-002](https://github.com/www-donghanhcungban-org/X-Office/blob/7cf743fcd5a70137d9bf8b1e355354985ae76697/framework/16-compliance-privacy/licensing-and-ip.md#L50).

**Liên quan đợt trước:** XT-H-134; chỉ giữ phần delta nêu trên.

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/Infisical/infisical/tree/f3599d32a83bd37611312cc09f50a91abbb43b8b) · [nguồn 2](https://github.com/onyx-dot-app/onyx/tree/f811615a2224a6734c809c6097e6f4d9eb88954e) · [nguồn 3](https://github.com/strapi/strapi/tree/0b839f98b150485944188cff36e9f059548401c5) · [nguồn 4](https://github.com/SigNoz/signoz/tree/f1f1b14f0004e45486bf4cb41b84f55a773fbdbe) · [nguồn 5](https://github.com/TabbyML/tabby/tree/21b29048d7bcf6b94f9f482f2d0fd05efadfd19f) · [nguồn 6](https://github.com/docmost/docmost/tree/a09332a7c1b48c983cbd4aa088d2ff7aa55c6521) · [nguồn 7](https://github.com/documenso/documenso/tree/125ff95097fb10704520cf03ec511a3df188cb4a) · [nguồn 8](https://github.com/dyad-sh/dyad/tree/63d28b887c1b62b8509373ba58d4b03573bb714a) · [nguồn 9](https://github.com/Stirling-Tools/Stirling-PDF/tree/c718a37074b33a81fbef9201fdb693a04a3c257f) · [nguồn 10](https://github.com/medusajs/medusa/tree/00516a135a621293c224594378122d2e2e070c3a).

### XT-H-138

**Hồ sơ nguồn:** [08-awesome-lists-learning/README.md#6c5](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/08-awesome-lists-learning/README.md#6c5-lọc-lại-toàn-bộ-kho-đọc-mã-437-repo-giữ-410-repo-18112026).

**Khung đã có:** OPS-MAINT-008 đã lấy tín hiệu còn sống từ commit chạm mã, bắt đổi tên/chuyển org, đọc banner README và bảng hỗ trợ SECURITY.md.

**Phần cần bổ sung:** Chỉ thêm ví dụ và một tín hiệu máy: cờ deprecated trên registry (npm deprecate, PyPI classifier Inactive); ví dụ Rasa Open Source ghi Maintenance Mode, ageron/handson-ml ghi lỗi thời và chỉ sang handson-ml3, ultralytics/yolov5 có gói kế nhiệm. Không cần ID mới.

**Đề xuất:** chỉ sửa chữ hoặc thêm ví dụ vào ID hiện có, không cần ID mới (đính chính 18/11/2026).

**Đối chiếu khung:** [OPS-MAINT-008](https://github.com/www-donghanhcungban-org/X-Office/blob/7cf743fcd5a70137d9bf8b1e355354985ae76697/framework/15-operations/maintenance-and-lifecycle.md#L45).

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/RasaHQ/rasa/tree/60a3cff9c08183760355b07bd60f5223d8916d6b) · [nguồn 2](https://github.com/ageron/handson-ml/tree/b7051594afbb1d835f5e031af8664c4363878050) · [nguồn 3](https://github.com/ultralytics/yolov5/tree/1e7cf74cb64d719b34f7315aa13eab9e32cde672).

### XT-H-139

**Hồ sơ nguồn:** [08-awesome-lists-learning/README.md#6c516](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/08-awesome-lists-learning/README.md#6c516-nền-tảng-ai-rag--workflow).

**Khung đã có:** AI-APP-021 cấm mã sản phẩm đọc, lưu hay trung chuyển token OAuth thuê bao Claude.ai, nêu Codex/Gemini CLI theo điều khoản từng nhà cung cấp, backend dùng khoá API/tài khoản tổ chức; AI-OBS-009 giữ key ở gateway.

**Phần cần bổ sung:** Chỉ thêm ví dụ và một vế vào AI-APP-021: không xoay vòng nhiều tài khoản thuê bao để vượt hạn mức, và luật áp cả gateway dùng cho CI hoặc agent tự động, không chỉ mã sản phẩm; ví dụ CLIProxyAPI, 9router, opencodex. Không cần ID mới.

**Đề xuất:** chỉ sửa chữ hoặc thêm ví dụ vào ID hiện có, không cần ID mới (đính chính 18/11/2026).

**Đối chiếu khung:** [AI-APP-021](https://github.com/www-donghanhcungban-org/X-Office/blob/7cf743fcd5a70137d9bf8b1e355354985ae76697/framework/13-ai-engineering/llm-app-foundations.md#L84), [AI-OBS-009](https://github.com/www-donghanhcungban-org/X-Office/blob/7cf743fcd5a70137d9bf8b1e355354985ae76697/framework/13-ai-engineering/observability-and-cost.md#L66).

**Nguồn triển khai upstream:** [nguồn 1](https://github.com/router-for-me/CLIProxyAPI/tree/a5e8f69e56309e1ef6d6872e667da81fdfbce2ce) · [nguồn 2](https://github.com/decolua/9router/tree/1855aa44473e88feac9d3f131b9c0c5fc9706b68) · [nguồn 3](https://github.com/lidge-jun/opencodex/tree/04304da28a2a8c0349f01ad161a58c16dbe8d982).

## 4. Thứ tự gợi ý và giới hạn áp dụng

1. **XT-H-135**: giữ khoá dịch vụ ngoài ở phía host, tiến trình agent con chỉ nhận biến theo allowlist; rủi ro cao, sửa rẻ. Nhà gần nhất `11-autonomous-loop` (`LOOP-HARNESS-022`) và `SEC-AI-007`.
2. **XT-H-136**: profile trình duyệt riêng khi công cụ agent nối vào trình duyệt đã đăng nhập.
3. **XT-H-133**: đối chiếu tên gói với kênh chính thức trước khi thêm phụ thuộc.
4. **Chỉ ví dụ hoặc sửa chữ:** XT-H-139 (`AI-APP-021`: thêm vế không xoay vòng nhiều tài khoản thuê bao, áp cả gateway cho CI và agent tự động), XT-H-137 (`CMP-LIC-004`: đọc LICENSE theo thư mục con cả với mã ứng dụng open-core `ee/`), XT-H-138 (`OPS-MAINT-008`: cờ deprecated của registry), XT-H-132 (`SEC-INFRA-027`), XT-H-134 (`CMP-LIC-004`).

**Áp lên dự án đích:** khi khung thêm ID, dự án chạy lại `install.py`, ghép lại blueprint bằng `xt.py compose`; mục SHOULD vào `BLUEPRINT-BACKLOG.md` và chỉ hiện ở hồ sơ có điều kiện tương ứng (135: dự án có bộ điều phối chạy agent con; 136: agent dùng trình duyệt đã đăng nhập). Phía stored có bảng chi tiết ở `X-TEMPLATES.md` §5f, §5g.

Phiên triển khai tiếp theo tự quyết cách gộp vào ID hiện có hay cấp ID mới; cập nhật module/README/CHANGELOG và ADR khi quy tắc khung yêu cầu. Research note này không cài thêm stack, không sửa blueprint dự án đích và không tự bật auto-merge.

## 5. Nguồn và trạng thái xác minh

- [stored: phương pháp và mức bằng chứng](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/METHOD.md), [catalog](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/data/projects.json), [nguồn](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/SOURCES.md) (các mục "Bổ sung" 2026-11-16 tới 2026-11-18c), [kết luận từng repo của kho-repo](https://github.com/seeker19110/stored/blob/4de31978989dbdf4b85445477c5eb3d1e72d7bf5/data/collections/phandonggiang-kho-repo.json).
- Nguồn trực tiếp và ngày/SHA ở từng hồ sơ phía stored; chỗ **(chưa xác minh)** giữ nguyên mức đó.
- Đã so với các note stored-delta trước và 131 bàn giao cũ; dòng có related_handoffs chỉ đề xuất phần sâu hơn.
