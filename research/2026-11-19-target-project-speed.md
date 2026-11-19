---
title: Dự án đích ra sản phẩm nhanh nhất — đo bốn dự án đích, nghẽn nằm sau khâu viết mã
kind: research
updated: 2026-11-19
---

# Dự án đích ra sản phẩm nhanh nhất — nghiên cứu 2026-11-19

Đầu vào: chủ dự án 2026-11-19 *"nghiên cứu xem làm sao để dự án đích code ra sản phẩm nhanh nhất"*. Khung ở `main`
`041d26f`. Nối tiếp [tốc độ repo khung 2026-10-28](2026-10-28-velocity.md) và
[xưởng đầu-cuối 2026-11-11](2026-11-11-factory-end-to-end.md). Mười một bản nghiên cứu trước chỉ đo **repo khung**; chưa
bản nào đo thời gian ở dự án đích. Bản này đo bốn dự án đích từ lịch sử git, tra lại nguồn ngoài và tài liệu Claude Code
hôm nay (ba lượt tra độc lập: một kiểm kê trong repo, hai `researcher`). Không đổi luật nào của khung; việc đề xuất ở §6.

## 1. Kết luận

1. **Viết mã không phải nghẽn.** Ở hai dự án xây từ đầu bằng khung, 73 % (hotel-manager) và 76 % (X-Company) dòng mã
   sản phẩm vào nhánh chính trong 2–3 ngày đầu. Ba tuần sau đó gần như không thêm sản phẩm.
2. **Nghẽn là quãng từ "mã xong" tới "bản chạy được có người dùng".** Cả bốn dự án `environments: []` ở
   [registry](../docs/ops/registry.json); hai dự án mới vẫn NO-GO với 73–78 MUST mở, toàn bộ chờ người hoặc hạ tầng.
3. **Bốn khoản tốn thời gian tránh được**, theo số đo: chọn quy mô M từ ngày đầu (473 MUST so với 70 ở S) · nâng khung
   liên tục (16–22 % commit nhánh chính) · mỗi dự án tự dựng lại cổng CI/bảo mật · làm hồ sơ miễn trừ (84 % phản hồi).
4. **Song song hoá là đòn bẩy bậc hai.** Nó rút ngắn khâu vốn chỉ chiếm vài ngày, tốn token gấp nhiều lần và chỉ chạy tốt
   khi có bộ kiểm gần hoàn hảo (§4). Thứ tự đã chốt ở D-420 (triển khai dev → pilot 1 → UI → song song) khớp số đo.
5. Mẫu `delivery_phase: build` và `install.py --new` (mặc định `S`) đã đúng hướng, nhưng **chưa dự án nào chạy trọn dưới
   cấu hình này**; pilot 1 (T-3847) là phép đo còn thiếu quan trọng nhất.

> Đính chính cùng ngày: bản đầu ghi "mặc định của khung đã là S". Sai một nửa — `xt.py compose` (đường của `/autopilot`)
> mặc định `--scale M` và `doctor` nhắc nâng khung mỗi phiên. Hai mặc định này được đổi ở
> [ADR-0081](../docs/adr/0081-build-fast-path.md) (đề xuất C và D ở §6). Đề xuất F (lọc mục lúc ghép) rút lại: ở S
> blueprint `web-app` chỉ còn nhóm `BASE-*` và `PRF-WEB` (70 MUST), không mục AI/realtime nào.

## 2. Số đo ở dự án đích (mới)

Nguồn: `git log --first-parent --numstat` trên bản clone chỉ đọc ngày 2026-11-19, ngày theo UTC, bằng
[`measure.py`](evidence/2026-11-19-target-speed/measure.py). "Dòng" là dòng **thêm**, bỏ lockfile và file nhị phân; loại
đường dẫn và loại commit là heuristic (regex ở đầu script). Dòng thêm không phải giá trị sản phẩm — chỉ dùng để thấy
**công sức rơi vào đâu theo thời gian**.

### 2.1 Hai dự án xây từ đầu bằng khung

| Chỉ số | hotel-manager `0d1b62c..bd5ef22` | X-Company `5f803b1..b689fa7` |
|---|---|---|
| Khoảng đo | 10-15 → 11-08 (25 ngày) | 10-18 → 11-17 (31 ngày) |
| Commit nhánh chính | 150 | 95 |
| Dòng mã sản phẩm | 101 851 | 26 947 |
| — trong những ngày đầu | 74 347 (73 %) trong 3 ngày, 39 commit | 20 573 (76 %) trong 2 ngày, 33 commit |
| Dòng test · khung · tài liệu · CI/ops | 83 446 · 45 560 · 33 805 · 16 356 | 28 848 · 38 688 · 14 068 · 17 996 |
| Commit `feat` | 22 (15 %) | 13 (14 %) |
| Commit nâng khung | 24 (16 %) | 21 (22 %) |
| Commit sổ sách (PROGRESS, blueprint, audit, phản hồi) | 22 (15 %) | 9 (9 %) |
| Quy mô blueprint | M + `saas-multitenant` + `fintech` = 501 MUST | M ≈ 473 MUST (ghép lại ở `041d26f`) |
| MUST còn mở | 73–79 (11-01 → 11-06), đều `loop defer` | 78, đều chờ người/hạ tầng |
| Bản chạy cho người dùng | không; chủ dự án 2026-11-01: "chưa có VPS/tên miền" | không; "chạy local", chưa có production |

Ví dụ rõ nhất, hotel-manager ngày 10-18 và 10-19: 58 commit, **851 dòng mã sản phẩm**; trong đó 12 commit nâng khung,
13 sổ sách, 10 `ci`/`test` (SAST, DAST, SBOM, release-please, commit-lint, ngân sách ảnh…). Hiện repo có 17 workflow
và ruleset 28 required check (`PROGRESS.md` của dự án).

### 2.2 Hai app đang chạy thật, sau khi cài khung

| Chỉ số | xboss `b70e0bed..e2368d9d` | dhcb `54590ead..804f1658` |
|---|---|---|
| Commit nhánh chính | 70 | 84 |
| `feat` · `fix` · nâng khung | 2 · 22 · 5 | 2 · 21 · 7 |
| Dòng mã sản phẩm · dòng khung | 9 876 · 39 667 | 3 181 · 42 042 |

Trước khi cài, dhcb thêm 3 000–116 000 dòng mã sản phẩm mỗi tuần (tuần 36–41). **Không kết luận nhân quả**: dhcb tự
ghi "đóng băng mở rộng phạm vi" và `PROGRESS.md` của khung ghi dự án đích tạm dừng theo yêu cầu. Điều đo được chỉ là
thành phần công việc sau khi cài: sửa lỗi audit và nâng khung, gần như không có tính năng.

### 2.3 Tải do khung đặt lên dự án đích

| Mục | Số | Cách đo |
|---|---|---|
| MUST của blueprint `web-app` theo quy mô | S 70 · M 473 · L 1 154 | `xt.py compose --profile web-app --scale <S\|M\|L>`, đếm `**MUST**` |
| Cỡ `BLUEPRINT.md` agent phải đọc | S 40 KB · M 242 KB · hotel-manager thực tế 971 KB | `wc -c` |
| Bản khung phát hành 10-15 → 11-08 | 53 tag trong 24 ngày | `git tag --sort=creatordate` |
| Phản hồi loại `mien-tru` | 282/337 (84 %): hotel-manager 182/220, X-Company 100/117 | `grep '^- Loại:' docs/xtemplates-feedback/*.md` |
| Nhóm bị xin miễn nhiều nhất | `LOOP-OPT` 40 · `BE-RT` 35 · `UX-AI` 30 · `SEC-AI` 17 · `CMP-AI` 16 · `BE-INT` 15 | cùng tập file, dòng `- ID:` |
| Stack thực tế | 3/4 Next.js 16 + React 19 + `pg`; dhcb Vite + Express + React + `pg` | `package.json` |
| Gói khung cung cấp | một gói `web-api-ts`, không UI | [README gói](../framework/templates/packs/README.md) |

## 3. Đọc số: nghẽn theo thứ tự

1. **Không có đích chạy.** Sản phẩm chỉ tồn tại khi có người mở được. Cả hai dự án mới dừng ở "mã xong, chờ hạ tầng";
   mọi MUST còn mở phụ thuộc đúng việc đó. Không có bản chạy thì cũng không có phản hồi để biết làm đúng thứ cần làm.
2. **Quy mô M trước khi có người dùng.** M nhân số MUST lên 6,8 lần so với S. hotel-manager bắt đầu trước khi có pha
   build ([ADR-0031](../docs/adr/0031-delivery-phase-build-harden.md), [ADR-0046](../docs/adr/0046-autopilot-build-complete-harden.md))
   nên số của nó phản ánh luật cũ; luật mới chưa có số đo.
3. **Thuế nâng khung.** Khung ra 2,2 bản/ngày; mỗi dự án theo bằng 21–24 PR, mỗi PR đi qua cổng và đôi khi kéo theo ghép
   lại blueprint cùng MUST mới. Bot nâng bản (T-3865) nằm ở lát cuối của kế hoạch.
4. **Dựng cổng bằng tay.** Một gói có sẵn UI, CI và quét bảo mật sẽ thay cho cả ngày 10-18 của hotel-manager. Gói hiện
   có không khớp stack mà 3/4 dự án dùng.
5. **Hồ sơ miễn trừ.** Phần lớn mục bị xin miễn thuộc mảng dự án không có (AI, realtime, tìm kiếm). Lọc lúc ghép rẻ hơn
   282 file viết tay.

Thời gian chờ người tính theo giờ, thời lượng phiên và chi phí token: không đo được từ git (§7).

## 4. Dữ kiện ngoài (đọc 2026-11-19)

| Phát hiện | Nguồn · ngày đăng | Mức tin |
|---|---|---|
| Một agent 20 phút/9 USD so với harness ba agent 6 giờ/200 USD; evaluator "worth the cost when the task sits beyond what the current model does reliably solo" | [anthropic.com](https://www.anthropic.com/engineering/harness-design-long-running-apps) · 2026-03-24 | tự công bố, một ca |
| 16 agent song song viết compiler: ~2 000 phiên, ~20 000 USD; "the task verifier is nearly perfect, otherwise Claude will solve the wrong problem" | [anthropic.com](https://www.anthropic.com/engineering/building-c-compiler) · 2026-02-05 | tự công bố, một ca |
| Đa agent dùng ~15 lần token so với chat; "most coding tasks involve fewer truly parallelizable tasks than research" | [anthropic.com](https://www.anthropic.com/engineering/multi-agent-research-system) · 2025-06-13 | tự công bố |
| DORA 2025 (~5 000 người): AI tương quan dương với thông lượng, âm với độ ổn định; chất lượng nền tảng nội bộ tương quan với giá trị khai thác từ AI | [cloud.google.com](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report) · 2025-09-23 | khảo sát, tương quan |
| Đội dùng AI nhiều: PR merge +98 %, thời gian review +91 %, cỡ PR +154 %; không thấy cải thiện cấp công ty | [faros.ai](https://www.faros.ai/blog/ai-productivity-paradox-report-2025) · 2025-07-23 | telemetry của vendor |
| ~Một nửa PR qua bộ chấm SWE-bench sẽ không được maintainer merge | [metr.org](https://metr.org/notes/2026-03-10-many-swe-bench-passing-prs-would-not-be-merged-into-main/) · 2026-03-10 | nghiên cứu nhỏ |
| Xưởng StrongDM: scenario đầu-cuối giữ ngoài codebase như tập holdout; không người viết hay review mã | [factory.strongdm.ai](https://factory.strongdm.ai/) · 2026-02-06 | tuyên bố, không số kết quả |
| Nền prompt-to-app cố định stack (Lovable: React + Vite + Supabase; harness Anthropic: React/Vite/FastAPI/Postgres) | docs.lovable.dev; bài harness ở trên | mô tả, không đo tác động |

Các nguồn cùng chỉ một hướng: tăng tốc khâu viết mã đẩy nghẽn xuống hạ lưu (review, tích hợp, phát hành), và thứ quyết
định là bộ kiểm cùng nền dựng sẵn. Không tìm được số đo độc lập cho "template rút ngắn thời gian tới bản chạy" hay "spec
trước làm agent xong nhanh hơn".

## 5. Năng lực Claude Code hiện hành (tài liệu `code.claude.com/docs`, đọc 2026-11-19; bản 2.1.328)

| Năng lực | Dữ kiện | Ý nghĩa cho tốc độ |
|---|---|---|
| Subagent | mặc định 20 đồng thời, chạy nền, lồng 3 tầng; `isolation: worktree` nhánh từ nhánh mặc định của remote trừ khi `worktree.baseRef: "head"` | đủ cho song song theo file; khung chưa agent nào khai `isolation` |
| Workflow | script điều phối, mặc định 16 agent đồng thời, dùng được ở `-p` | fan-out cho audit/nghiên cứu đã dùng (ADR-0049) |
| Agent teams | thử nghiệm, tắt mặc định, không chạy ở `-p` | chưa dựa vào được |
| Scheduled task | cron tối thiểu 1 giờ; kích bằng API và sự kiện GitHub; mỗi lần chạy là một phiên cloud | kênh cho worker ngoài phiên (T-3853) |
| Hook `asyncRewake` | chạy nền, thoát mã 2 thì đánh thức agent kèm stderr | chạy bộ test đầy đủ ở nền, không chặn lượt |
| Fast mode | "up to 2.5x faster", giá mỗi token gấp 2 giá chuẩn; gói thuê bao chỉ trả bằng usage credits | đổi tiền lấy thời gian — việc của chủ dự án |
| Auto mode | ở `-p` hành động bị chặn thì bỏ qua và làm tiếp, không dừng phiên | phiên không người trông vẫn chạy tiếp |

## 6. Đề xuất

| Đòn bẩy | Chọn | Bằng chứng | Thay thế | Lý do / điều kiện đổi |
|---|---|---|---|---|
| A. Đích chạy trước mọi thứ | Làm xong T-3842…T-3844 (lệnh triển khai, ảnh + compose dev) rồi T-3846/T-3847 (pilot 1 có đo) trước mọi việc khác của khung | §2.1, §3.1 | chờ chủ dự án cấp VPS | Bản dev tự host không cần việc người (ADR-0075); đây đúng là thứ tự D-420 |
| B. Hai dự án mới: ra bản dev, ngừng harden | hotel-manager và X-Company dừng vòng harden; khi T-3844 xong thì dựng bản dev bằng compose để chủ dự án dùng thử | 73–78 MUST mở đều chờ hạ tầng | tiếp tục harden | Việc trong repo đã cạn; harden tiếp chỉ sinh sổ sách |
| C. S + build tới khi có người dùng | Dự án mới giữ mặc định `--scale S`, `delivery_phase: build`; lên M khi có sự kiện thật (người dùng thật, dữ liệu thật, tiền) | 70 so với 473 MUST | M ngay từ đầu | Đổi khi dự án khai `--feature payment`/`pii` hoặc có receipt production |
| D. Ghim khung trong pha build | Dự án đích nâng khung ở ranh giới pha hoặc khi bản mới sửa lỗi bảo mật; khung gom bản cho dự án đích theo tuần | 53 tag/24 ngày; 16–22 % commit | theo từng bản | Kéo phần "kênh ổn định" của T-3865 lên sớm; cần ADR vì đổi cách phát hành |
| E. Gói có UI và cổng dựng sẵn | T-3849 giao luôn UI, E2E trình duyệt và workflow quét bảo mật trong `managed/` | §2.1 ngày 10-18; 3/4 dự án là Next.js + Postgres | thêm gói thứ hai | ADR-0068 giữ một gói trong 3.x; xét gói Next.js khi có số từ pilot |
| F. Lọc mục không áp dụng lúc ghép | `compose` nhận fact phủ định (không AI, không realtime, không tìm kiếm) để bỏ cả module | 282 file miễn trừ | miễn từng mục | Cần ADR: thêm trường cho `compose`, giữ ID |
| G. Đo ở dự án đích | Chạy `measure.py` cho từng dự án trong `feedback aggregate`; pilot ghi "ý tưởng → bản dev" theo giờ | §7 | chỉ đo repo khung | Thiếu số thì mọi ưu tiên tiếp theo là suy luận |
| H. Song song sau pilot | Giữ T-3850…T-3854 ở lát 4; khi làm thì 2–4 worker theo `files:` không giao, mỗi worker một worktree | §4 | song song ngay | Đổi khi pilot cho thấy khâu viết mã chiếm phần lớn thời gian tới bản dev |
| I. Test nền | Thử hook `asyncRewake` chạy bộ test đầy đủ sau commit | §5 | giữ `gate-fast` + CI | Chưa đo; chỉ làm nếu pilot cho thấy chờ CI là đáng kể |

Việc dự án đích tự làm được ngay, không cần đổi khung: C, phần "ghim" của D, và lát đầu tiên là bộ khung chạy được
(đăng nhập + một màn hình + CSDL + `docker compose up`) rồi mỗi lát sau là một luồng dọc trình diễn được.

Fast mode không được đề xuất: nó tiêu tiền thật (AGENTS.md §5) và tăng tốc đúng khâu không phải nghẽn.

## 7. Chưa xác minh, chưa đo

- Thời lượng phiên, token và chi phí mỗi lát ở dự án đích; thời gian chờ người theo giờ; thời gian CI ở dự án đích (phiên
  này chỉ có quyền đọc git, không gọi API GitHub của các repo đó).
- Chất lượng thực của mã hai dự án mới: chưa ai dùng thử, chưa chạy lại bộ test của chúng trong phiên này.
- Tác động của luật mới (pha build, S mặc định): chưa dự án nào chạy trọn.
- Con số "up to 2.5x" của fast mode, số của Faros/StrongDM: tự công bố, chưa tự đo. Trang gốc "harness engineering" của
  OpenAI trả 403 nên không dùng.
- Số phiên cloud đồng thời tối đa và hạn mức scheduled task theo ngày: tài liệu không nêu.
- Nguồn ngoài đọc qua bản tóm tắt của công cụ tải trang; câu trong ngoặc kép cần đối chiếu nguyên văn trước khi trích ở ADR.

## 8. Rủi ro

- Hạ quy mô và ghim khung làm dự án đích nhận bản vá guard chậm hơn; cần ngoại lệ cho bản sửa bảo mật (D).
- Dừng harden ở hai dự án mới (B) để lại 🟢/🟠 mở trong sổ audit; cổng phát hành `release-check` vẫn chặn production.
- Phép đo bằng dòng thêm thiên về mã sinh hàng loạt và không thấy việc xoá hay sửa; chỉ nên đọc xu hướng.
- Lọc module lúc ghép (F) có thể bỏ sót MUST khi dự án thêm tính năng sau; fact phải được kiểm lại ở `/complete`.

## 9. Nhật ký xác minh (2026-11-19)

| Mục | Lệnh | Kết quả |
|---|---|---|
| Nhịp theo ngày | `python3 -I research/evidence/2026-11-19-target-speed/measure.py <repo> <dải>` | bảng §2.1, §2.2 |
| MUST theo quy mô | `xt.py compose --profile web-app --scale S\|M\|L --out <tmp>`; `grep -c '\*\*MUST\*\*'` | 70 · 473 · 1 154; kèm hai ngành: 501 |
| Số bản khung | `git tag --sort=creatordate --format='%(creatordate:short) %(refname:short)'` | 53 tag từ `v2.0.0` (10-15) tới `v3.33.0` (11-08) |
| Loại phản hồi | `grep -h '^- Loại:' <repo>/docs/xtemplates-feedback/*.md \| sort \| uniq -c` | `mien-tru` 182 + 100 |
| Mặc định của khung | `scripts/install.py` dòng `--scale` ("mặc định S"); `framework/templates/xt.yaml` | `S`; `delivery_phase: build` |
| Trạng thái dự án | đọc `PROGRESS.md`, `GO-NO-GO.md`, `xt.yaml`, `BLUEPRINT.md` của bốn repo | hotel-manager, X-Company, dhcb `delivery_phase: harden`; xboss không khai; hai dự án mới `scale: M` |
