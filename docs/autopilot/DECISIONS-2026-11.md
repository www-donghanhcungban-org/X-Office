# Nhật ký quyết định tự duyệt — tháng 11/2026 (phần đầu)

> Bản tháng của [`DECISIONS.md`](DECISIONS.md) (cách T-3651): 106 mục D-292…D-400 (2026-11-01…08; đợt 2 D-311…D-330 dời 2026-11-04, đợt 3 D-331…D-333, đợt 4 D-334…D-338, đợt 5 D-340, đợt 6 D-341…D-343, đợt 7 D-344…D-347 đợt 8 D-348, D-351 đợt 9 D-356 và đợt 10 D-357, D-360 dời 2026-11-05; không có D-339, D-349, D-350 — số bỏ hẳn; đợt 11 D-352…D-400 dời 2026-11-17) dời nguyên văn để `docs/autopilot` còn trong trần byte (ADR-0043, không nới trần). `loop decide` vẫn ghi vào `DECISIONS.md`; mọi công cụ đọc cả bản tháng. Không sửa mục cũ — đổi ý ghi quyết định mới "thay D-NNN".

### D-292 · 2026-11-01T03:17:20+00:00 · Duyệt PLAN-upgrade-2026-11-01 (ADR-0061 Adaptive Agent theo nhận định chủ dự án; stored ưu tiên 1-3; sửa batch audit delta) và cách máy hoá ADR-0061

- Phương án: (1) Bảng topology máy đọc, mặc định self, giữ hai tầng executor cho parallel, đợt 4, rethink tối đa 1 mỗi PR, thêm KPI thời gian vào loop stats; 7 lát mỗi lát một PR, tự làm (topo self), lát chạm harness topo review · (2) Giữ mặc định giao executor và chờ số đo LOOP-ORCH-020 như ADR-0045 · (3) Bỏ hẳn executor và executor-deep, chỉ một agent cộng reviewer
- Chọn: Bảng topology máy đọc, mặc định self, giữ hai tầng executor cho parallel, đợt 4, rethink tối đa 1 mỗi PR, thêm KPI thời gian vào loop stats; 7 lát mỗi lát một PR, tự làm (topo self), lát chạm harness topo review
- Lý do (tiêu chí chất lượng cuối): Tiêu chí 1: khớp thực tế vận hành phiên 2026-10-31 và dữ kiện sống 2026-11-01 (Harness design: đơn giản nhất, chỉ tăng khi cần; ROI: cost per task, PR cycle time); tiêu chí 2: đường lùi một dòng topo parallel trả hành vi cũ; tiêu chí 3: số đo LOOP-ORCH-020 vẫn chạy và có thêm trục thời gian; chủ dự án có quyền cuối, số 4 và 1 rethink ghi là khởi điểm tự đặt; phương án 2 không bao giờ có số, phương án 3 mất chuyển cấp ADR-0029
- Đường lùi: Revert PR từng lát; PLAN ghi topo parallel cho mọi task; max_rethink 0

### D-293 · 2026-11-01T04:33:04+00:00 · T-3606: khung chưa có scanner prompt-assets-scan (chỉ bảng ai-security.md:106 trỏ script dự án đích) — lát này làm gì?

- Phương án: (1) Tài liệu trước: SEC-AI-018 thêm luật XT-H-024 (lời bỏ xác nhận/không từ chối, gói không ghim, quét README/docs), CMP-LIC-024 mới cho XT-H-026; scanner thành T-3613 đợt kế (lát ≤ 150 dòng, mỗi lát một PR) · (2) Hiện thực xt.py prompt-assets-scan ngay (4 luật cũ + 2 mới + miễn trừ + test, ~300 dòng) trong lát này
- Chọn: Tài liệu trước: SEC-AI-018 thêm luật XT-H-024 (lời bỏ xác nhận/không từ chối, gói không ghim, quét README/docs), CMP-LIC-024 mới cho XT-H-026; scanner thành T-3613 đợt kế (lát ≤ 150 dòng, mỗi lát một PR)
- Lý do (tiêu chí chất lượng cuối): Đúng/an toàn ngang nhau (luật đã có nhà, scanner là công cụ cưỡng chế); phương án 1 nhỏ, đảo ngược được, đúng trần lát của ADR-0061; scanner là feature riêng cần spec miễn trừ + fixture, ghi task T-3613 kèm Gate test
- Đường lùi: Bỏ T-3613, sửa lại chữ SEC-AI-018/CMP-LIC-024 về bản trước (giữ ID)

### D-294 · 2026-11-01T04:46:03+00:00 · ADR-0060 (sáu skill theo tác vụ, #365) chưa có D-NNN — ghi hồi tố cách nào? (AUD-DOC-133)

- Phương án: (1) Ghi D-NNN hồi tố 2026-11-01 xác nhận phiên chính đã tự duyệt ADR-0060 theo tiêu chí chất lượng cuối; dòng Trạng thái ADR-0060 dẫn D-NNN kèm chữ 'hồi tố' · (2) Để trống, coi ADR-0060 là quyết định của chủ repo (yêu cầu 2026-10-31) không cần D-NNN
- Chọn: Ghi D-NNN hồi tố 2026-11-01 xác nhận phiên chính đã tự duyệt ADR-0060 theo tiêu chí chất lượng cuối; dòng Trạng thái ADR-0060 dẫn D-NNN kèm chữ 'hồi tố'
- Lý do (tiêu chí chất lượng cuối): AGENTS.md §4: quyết định chuyên môn phiên chính tự duyệt phải có D-NNN; ADR-0060 là thiết kế (chọn 6 skill, mẫu) dù yêu cầu từ chủ repo; ghi hồi tố giữ dấu vết, không sửa lịch sử
- Đường lùi: Xoá câu dẫn D-NNN ở ADR-0060 (giữ mục D trong sổ)

### D-295 · 2026-11-01T11:05:35+00:00 · Máy hoá cấu hình review/merge mới của chủ dự án 2026-11-01 (review 1 lần, 3 mức rủi ro, cổng production) cho khung và dự án đích thế nào?

- Phương án: (1) ADR-0062 thay ADR-0059 §1-2: review 1 lần; 🔴 sửa trong 1 commit rồi pr debt --fixed (không review lại), 🟠/🟢 ghi nợ; rủi ro thấp = làn nhanh (CI + tự rà diff, máy merge ghim head); trung bình = làn chuẩn, 1 review logic/phạm vi/test; cao = ngoại lệ cứng + schema/migration, review độc lập bắt buộc kể cả pha build; release-check thêm hàng migration/rollback/acceptance · (2) Chỉ sửa tài liệu/skill, giữ máy ADR-0059 (review 2 lần) — kỷ luật thay máy · (3) Review 1 lần nhưng 🔴 vẫn cần review lại delta sau sửa (giữ một phần ADR-0059)
- Chọn: ADR-0062 thay ADR-0059 §1-2: review 1 lần; 🔴 sửa trong 1 commit rồi pr debt --fixed (không review lại), 🟠/🟢 ghi nợ; rủi ro thấp = làn nhanh (CI + tự rà diff, máy merge ghim head); trung bình = làn chuẩn, 1 review logic/phạm vi/test; cao = ngoại lệ cứng + schema/migration, review độc lập bắt buộc kể cả pha build; release-check thêm hàng migration/rollback/acceptance
- Lý do (tiêu chí chất lượng cuối): Đúng chữ chủ dự án (người có quyền cuối, ADR-0008): 'chỉ review 1 lần: nghiêm trọng thì sửa, cam/xanh ghi nợ cho merge'. An toàn: 🔴 vẫn không ghi nợ (phải sửa, ghi đã sửa ở sổ tại head), cao rủi ro không hoãn review ở pha build (chặt hơn ADR-0037), audit cuối pha quét lại diff là lưới đỡ cho bản sửa không review lại; giữ đường lùi (revert ADR + REVIEW_ROUNDS). PA2 trái luật mới (PR vẫn đứng ở lượt 2); PA3 trái 'chỉ review 1 lần'.
- Đường lùi: Revert PR của ADR-0062: REVIEW_ROUNDS=2 và _debt_problem cũ (ADR-0059), bỏ hàng release-check mới; dự án đích nâng khung bản kế

### D-296 · 2026-11-01T14:49:58+00:00 · Kế hoạch sửa audit cuối pha 2026-11-01 (0 🔴, 6 🟠 mới, 7 🟢; 4 🟠 là hồi quy của đợt)?

- Phương án: (1) Ba đợt theo nhà file: guard (SEC-270/271, PERF-004, + nợ SEC-254/256) · xt.py (SEC-272, CODE-034, HAR-181/182 + 🟢 scanner rẻ) · tài liệu (DOC-162…165, XFEAT-043, HAR-185/187); mỗi đợt 1 PR, test đỏ trước, review 1 lần theo ADR-0062; rồi audit delta lại 7 nhóm chưa quét · (2) Một PR gộp mọi 🟠 · (3) Ghi nợ hết, sang đợt kế
- Chọn: Ba đợt theo nhà file: guard (SEC-270/271, PERF-004, + nợ SEC-254/256) · xt.py (SEC-272, CODE-034, HAR-181/182 + 🟢 scanner rẻ) · tài liệu (DOC-162…165, XFEAT-043, HAR-185/187); mỗi đợt 1 PR, test đỏ trước, review 1 lần theo ADR-0062; rồi audit delta lại 7 nhóm chưa quét
- Lý do (tiêu chí chất lượng cuối): Đúng/an toàn: hồi quy guard (perf treo hook, sed/+= lọt) sửa trước; PR theo nhà file nhỏ, review 1 lần đủ tập trung; PA2 quá lớn (>150 dòng, nhiều nhà); PA3 để lỗ bảo mật đã tái hiện
- Đường lùi: Revert PR từng đợt

### D-297 · 2026-11-01T16:50:34+00:00 · Quét lại T-3623: 5 🟠 mới (guard sed bậc hai, awk stdin, API shell Perl/Ruby/PHP, printf -v PS4; test perf xanh giả) — làm gì?

- Phương án: (1) Đợt 5 một PR guard sửa cả 5 (test đỏ trước, OR với luật cũ, bench), rồi Đợt 6 quét lại DOC/XFEAT/HAR cụm nhỏ · (2) Ghi nợ hết, sang cắt bản
- Chọn: Đợt 5 một PR guard sửa cả 5 (test đỏ trước, OR với luật cũ, bench), rồi Đợt 6 quét lại DOC/XFEAT/HAR cụm nhỏ
- Lý do (tiêu chí chất lượng cuối): 4/5 là lỗ guard đã tái hiện chạy thật (lệnh nguy hiểm lọt) — tiêu chí (1) an toàn; cùng nhà file nên một PR; PA2 để lỗ bảo mật vào bản phát hành
- Đường lùi: Revert PR đợt 5

### D-298 · 2026-11-01T17:44:20+00:00 · Sau PLAN-fix-2026-11-01 (#389–#392), máy đòi audit delta lại các PR sửa — làm tiếp hay dừng đợt?

- Phương án: (1) Dừng đợt: không quét delta lặp các PR sửa (đã review 1 lần theo ADR-0062); audit tổng thể kế tiếp ở đầu đợt /complete trước khi cắt 3.30.0, gom nợ còn lại (🟠 SEC-276/287/288/290/291/292, HAR-182 phần còn lại + 🔴 guard có từ trước) thành PLAN mới · (2) Quét delta tiếp sau mỗi đợt sửa
- Chọn: Dừng đợt: không quét delta lặp các PR sửa (đã review 1 lần theo ADR-0062); audit tổng thể kế tiếp ở đầu đợt /complete trước khi cắt 3.30.0, gom nợ còn lại (🟠 SEC-276/287/288/290/291/292, HAR-182 phần còn lại + 🔴 guard có từ trước) thành PLAN mới
- Lý do (tiêu chí chất lượng cuối): Cấu hình chủ dự án 2026-11-01: audit tổng thể MỘT lần cuối mỗi giai đoạn + review 1 lần mỗi PR; quét lặp các bản sửa đã cho thấy mỗi lượt sinh 🟠 mới ở chính bản sửa (vòng không hội tụ, chi phí lớn); nợ đã có ID ở sổ, release-check vẫn NO-GO nên không phát hành mang nợ
- Đường lùi: Chạy /audit delta 457a69e..HEAD bất kỳ lúc nào

### D-299 · 2026-11-01T23:29:52+00:00 · Đầu /complete trước 3.30.0: sổ còn 18 🔴 + 26 🟠 lách bộ phân tích bash của guard (AUD-SEC-180…292) — sửa thế nào?

- Phương án: (1) Vá từng phát hiện như các đợt trước (mỗi ca một luật nhận dạng) · (2) Tập con chuẩn: guard chặn (BUDGET, fail-closed) mọi cấu trúc nó không mô phỏng chắc ở vùng mã (backtick, comment có nháy, IFS mở rộng, bảng alias, ~N, PID-rồi-ngoặc, brace có thăng, nháy không đóng, bash -c/eval thân động, ghi biến prompt, ống vào shell) + lệnh gh đăng nội dung chỉ nhận thân chữ nguyên văn/file chữ — ADR-0063 · (3) Chấp nhận rủi ro các 🔴 lách cố ý (chủ + hạn), dựa vào bộ phân loại Auto
- Chọn: Tập con chuẩn: guard chặn (BUDGET, fail-closed) mọi cấu trúc nó không mô phỏng chắc ở vùng mã (backtick, comment có nháy, IFS mở rộng, bảng alias, ~N, PID-rồi-ngoặc, brace có thăng, nháy không đóng, bash -c/eval thân động, ghi biến prompt, ống vào shell) + lệnh gh đăng nội dung chỉ nhận thân chữ nguyên văn/file chữ — ADR-0063
- Lý do (tiêu chí chất lượng cuối): (1) an toàn: đóng theo lớp thay vì từng ca — #372 cho thấy vá từng ca không hội tụ (7 lượt review, mỗi lượt lộ ca mới); (3) đơn giản, test được: luật cấu trúc ngắn, mỗi lớp một test; đo trên 1567 lệnh Bash thật của các phiên: vùng mã chạm luật mới ~24 lệnh (đều là backtick trong message commit nháy kép — bash thực thi thật, tức lỗi) → chặn oan ~0; PA3 để 🔴 an toàn vào bản phát hành (vi phạm tiêu chí 1)
- Đường lùi: Revert PR của từng lớp; luật mới OR với luật cũ nên gỡ một lớp không mở lại lớp khác

### D-300 · 2026-11-01T23:53:42+00:00 · Duyệt PLAN-harden-2026-11-01 (/complete trước 3.30.0): 7 lát — A–D guard theo ADR-0063, E xt.py, F sổ (🟢 nợ review), G release-check

- Phương án: (1) Duyệt nguyên PLAN, mỗi lát một PR, lát guard một review tập trung trước merge · (2) Gộp lát A–D thành một PR guard lớn
- Chọn: Duyệt nguyên PLAN, mỗi lát một PR, lát guard một review tập trung trước merge
- Lý do (tiêu chí chất lượng cuối): (1) an toàn + (2) đường lùi: mỗi lớp một PR revert được độc lập; PR ≤ ~150 dòng mã theo luật harden; (3) test được: mỗi lát có mẫu tái hiện của sổ làm test đỏ trước; PA2 vượt trần dòng và khó review
- Đường lùi: Sửa PLAN (bỏ/tách task) bằng D mới; loop init lại

### D-301 · 2026-11-02T03:21:39+00:00 · Lát C (T-3632) sau review trước PR (4 🔴): nguồn thân của gh đăng được — danh sách đen từng dạng hay danh sách trắng?

- Phương án: (1) Vá thêm từng dạng reviewer nêu, giữ 17 ca đối chứng cũ ($(ls|wc), $(git log --oneline), xargs -I{}, nhóm < tệp) · (2) Danh sách trắng (ADR-0063 lát C): thân chỉ là chữ nguyên văn, $(cat <<'EOF'…), $(cat tệp nguyên văn), tệp/stdin-chuyển-hướng trên chính gh ở thư mục biết; endpoint api đọc dấu; 17 ca đối chứng cũ thành chặn
- Chọn: Danh sách trắng (ADR-0063 lát C): thân chỉ là chữ nguyên văn, $(cat <<'EOF'…), $(cat tệp nguyên văn), tệp/stdin-chuyển-hướng trên chính gh ở thư mục biết; endpoint api đọc dấu; 17 ca đối chứng cũ thành chặn
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: dấu đi qua được tên tệp (ls), thông điệp commit (guard không chặn commit mang dấu: git log --oneline/%s, show --stat), tr/printf — danh sách đen không hội tụ (ADR-0063, #372). Đo 1567 lệnh Bash thật: luật gh mới đổi 0 quyết định; đường thay thế cho agent: ghi thân ra tệp rồi --body-file (lệnh riêng).
- Đường lùi: Trả _gh_strict_why về a41e64c và expect của 17 ca guard-control-* trong tests/fixtures/autonomy/guard.json
### D-302 · 2026-11-02T04:20:53+00:00 · Kế hoạch sửa sau audit toàn bộ 2026-11-02 (AUDIT-REPORT-2026-11-02-full.md): 3 🟠 mới + 21 🟢, 4 🔴 guard có từ trước — chủ dự án triển khai sau

- Phương án: (1) Ba đợt theo tác động/chi phí: P0 trước 3.30.0 (4 🔴 guard lát C ADR-0063 + SEC-248 tiền tố docs/autopilot, CODE-036 khoá reviews.json, HAR-197 hàng go_no_go_file, HAR-036/198 matcher hook, CI-027 schedule secret-scan, DOC-175 PROGRESS); P1 2–4 tuần (DOC-180 lưu trữ sổ + trần docs, SEC-329 mã lý do làm khoá chính, PERF-013 cache guard kiểm sha256, HAR-199 đo chặn oan, CODE-037/038, CI-028, DEP-010, TEST-051); P2 cần ADR (sandbox/egress bắt buộc cho autopilot, tách xt.py theo lát, nội dung DOC-176…178/181, XFEAT-046) · (2) Gộp tất cả vào PLAN-harden-2026-11-01 đang chạy, không phân đợt · (3) Chỉ sửa 🔴 rồi cắt 3.30.0, hoãn toàn bộ 🟠/🟢
- Chọn: Ba đợt theo tác động/chi phí: P0 trước 3.30.0 (4 🔴 guard lát C ADR-0063 + SEC-248 tiền tố docs/autopilot, CODE-036 khoá reviews.json, HAR-197 hàng go_no_go_file, HAR-036/198 matcher hook, CI-027 schedule secret-scan, DOC-175 PROGRESS); P1 2–4 tuần (DOC-180 lưu trữ sổ + trần docs, SEC-329 mã lý do làm khoá chính, PERF-013 cache guard kiểm sha256, HAR-199 đo chặn oan, CODE-037/038, CI-028, DEP-010, TEST-051); P2 cần ADR (sandbox/egress bắt buộc cho autopilot, tách xt.py theo lát, nội dung DOC-176…178/181, XFEAT-046)
- Lý do (tiêu chí chất lượng cuối): (1) an toàn: 🔴 và 🟠 chạm merge/hàng rào đi trước, mỗi đợt một PR nhỏ đảo ngược được; (3) bền và test được: 🟠 có Gate đỏ trước; P2 đổi cấu trúc nên cần ADR riêng thay vì chèn vào PLAN đang chạy (PA2 phình phạm vi lát guard, PA3 để lại 🟠 CODE-036/HAR-197 làm lệch G7 lặp lại)
- Đường lùi: Sửa thứ tự/đợt bằng D mới; mỗi PR revert độc lập

### D-303 · 2026-11-02T05:16:50+00:00 · ADR-0064 harness đa nhà cung cấp — ba lựa chọn triển khai sau khi chủ dự án trả lời 2026-11-02 (1: cả 6 công cụ; 2: nâng LOOP-HARNESS-022 nếu không làm chậm code; 3: vị trí luật 'cái nào tốt thì làm')

- Phương án: (1) Lát B làm cả 6 adapter (Codex, Gemini CLI, Cursor, Copilot CLI, Grok Build, OpenCode) theo thứ tự OSI trước; LOOP-HARNESS-022 nâng SHOULD → MUST@M chỉ cho phiên autopilot không người trực (doctor kiểm, chủ dự án chấp nhận chi phí cài một lần + allowlist); luật giữ ở .claude/hooks/guard.py làm nhà vật lý duy nhất, thêm chế độ core trung lập, adapter mỏng ở .xtemplates/harness/<tool>/ gọi lõi — không dời thư mục trong 3.x · (2) Như trên nhưng dời guard.py sang .xtemplates/harness/core.py ngay, .claude/hooks chỉ còn shim · (3) Chỉ Codex + Gemini đợt đầu, LOOP-HARNESS-022 giữ SHOULD
- Chọn: Lát B làm cả 6 adapter (Codex, Gemini CLI, Cursor, Copilot CLI, Grok Build, OpenCode) theo thứ tự OSI trước; LOOP-HARNESS-022 nâng SHOULD → MUST@M chỉ cho phiên autopilot không người trực (doctor kiểm, chủ dự án chấp nhận chi phí cài một lần + allowlist); luật giữ ở .claude/hooks/guard.py làm nhà vật lý duy nhất, thêm chế độ core trung lập, adapter mỏng ở .xtemplates/harness/<tool>/ gọi lõi — không dời thư mục trong 3.x
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: MUST@M cho phiên không người trực đóng lỗ 'guard không phải sandbox' ở 5/7 công cụ tắt sandbox mặc định; chi phí là cài một lần + allowlist registry/git, không chạm vòng code (phiên tương tác không bị ép) nên không làm chậm tiến độ; (2) đường lùi: giữ guard.py tại chỗ là diff nhỏ nhất, revert từng adapter độc lập; dời thư mục (PA2) đụng DIR_CAPS, harness.sha256.json, hàng trăm tham chiếu test và cả 3 công cụ đang nạp .claude/settings.json — chỉ xét ở 4.0 cùng mốc 2027-01-21; (3) bền, test được: lõi một nơi, adapter là dữ liệu + fixture theo phiên bản; PA3 bỏ 4 công cụ chủ dự án đã chọn
- Đường lùi: Mỗi adapter một PR revert độc lập; mức LOOP-HARNESS-022 hạ lại bằng D mới + CHANGELOG; dời thư mục làm ADR riêng khi cần

### D-304 · 2026-11-02T05:23:27+00:00 · Gom mọi đề xuất/nâng cấp ngày 2026-11-02 (chủ dự án: 'cập nhật tất cả đề xuất, nâng cấp trong hôm nay rồi tối ưu lại và triển khai') thành một PLAN

- Phương án: (1) Một PLAN-upgrade-2026-11-02 thay PLAN-harden-2026-11-01: 5 task mở của harden chép cùng ID + P0/P1/P2 của D-302 + lát A–E ADR-0064 (D-303), gộp việc trùng (SEC-329↔lát A, DOC-181↔lát A, HAR-036/198↔CI-027/028, TEST-051↔HAR-199), xếp 🔴 guard → 🟠 audit → lõi/sandbox → P1 → adapter → nội dung → sổ/phát hành; để ngoài ARCH-008, DOC-179, PERF-014 · (2) Ba PLAN song song (harden, audit, harness) chạy lần lượt · (3) Chỉ chạy PLAN-harden tới 3.30.0 rồi mới lập PLAN cho audit + ADR-0064
- Chọn: Một PLAN-upgrade-2026-11-02 thay PLAN-harden-2026-11-01: 5 task mở của harden chép cùng ID + P0/P1/P2 của D-302 + lát A–E ADR-0064 (D-303), gộp việc trùng (SEC-329↔lát A, DOC-181↔lát A, HAR-036/198↔CI-027/028, TEST-051↔HAR-199), xếp 🔴 guard → 🟠 audit → lõi/sandbox → P1 → adapter → nội dung → sổ/phát hành; để ngoài ARCH-008, DOC-179, PERF-014
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: 🔴 guard vẫn đi đầu, không task nào làm yếu cổng; một sổ máy đọc (loop status) thay ba; (3) đơn giản, test được: gộp 4 cặp trùng bớt ~4 PR, phụ thuộc sau: rõ trong một file; PA2 ba vòng loop init chồng nhau, PA3 trì hoãn 🟠 CODE-036/HAR-197 làm lệch G7 ngay ở lần cắt 3.30.0; việc để ngoài cần ADR/research riêng (D-142, đợt nội dung)
- Đường lùi: Tách lại PLAN bằng D mới; task giữ ID nên loop init mang bằng chứng theo

### D-305 · 2026-11-02T08:39:37+00:00 · AUD-TEST-052: test_quote_like_repeat_not_cubic đỏ ngẫu nhiên khi cổng chạy song song — sửa test thế nào?

- Phương án: (1) giữ ngưỡng tỉ lệ mặc định, chỉ đổi đồng hồ sang process_time · (2) dùng cpu_budget.assert_not_quadratic ratio 40 ở cỡ 16 (đồng hồ process_time) — chỉ canh bậc ba trở lên · (3) sửa _quote_exec_scripts thành tuyến tính rồi giữ ngưỡng cũ
- Chọn: dùng cpu_budget.assert_not_quadratic ratio 40 ở cỡ 16 (đồng hồ process_time) — chỉ canh bậc ba trở lên
- Lý do (tiêu chí chất lượng cuối): đo (review #405 R10): main và HEAD cùng bậc hai (n=16→64: 0,068→1,18 s CPU) do thân trích Θ(n²) theo đầu vào — có từ trước, không phải hồi quy; ngưỡng cũ chỉ xanh nhờ SLACK; tên test canh bậc ba và cpu_budget cho phép ratio 40 cho test canh hàm mũ; bậc ba vẫn bị bắt. Phương án 3 là việc tối ưu riêng, không thuộc lát sửa
- Đường lùi: trả ratio mặc định trong test_quote_like_repeat_not_cubic khi _quote_exec_scripts tuyến tính (mở task PERF)

### D-306 · 2026-11-02T08:59:29+00:00 · T-3653/AUD-CODE-038: gộp 4 runner subprocess (run_gate_shell, _git, _floor_run, _perf_run) thành một _run(cmd, cwd, timeout, env)?

- Phương án: (1) gộp thành một _run theo PLAN · (2) giữ 4 runner (mỗi cái một giao ước riêng), chỉ gộp đường GET REST: latest_framework_tag qua _gh_api
- Chọn: giữ 4 runner (mỗi cái một giao ước riêng), chỉ gộp đường GET REST: latest_framework_tag qua _gh_api
- Lý do (tiêu chí chất lượng cuối): đọc mã 2026-11-02: _floor_run đã gọi run_gate_shell (không phải biến thể); run_gate_shell = bash pipefail + guard (LOOP-STOP-027) + nhóm tiến trình + output qua file tạm (review #220); _git = GIT_SAFE_READ + không grafts (AUD-SEC-158) + errors=replace; _perf_run = đo không lượng tử bằng thread waitpid (AUD-PERF-003). Gộp phải mang cờ cho từng giao ước — thêm nhánh, dễ làm mất bảo đảm an toàn đã sửa (tiêu chí 1 > 3); xác minh đối kháng của audit cũng ghi PARTIAL. Đường REST trùng thật nên gộp
- Đường lùi: tách hàm chung khi có runner thứ năm cùng giao ước; phần AUD-CODE-038 về runner ghi bác bỏ kèm D này

### D-307 · 2026-11-02T09:22:29+00:00 · T-3652/AUD-PERF-013: cache bytecode guard.py khoá theo sha256 nguồn để bớt ~0,13 s mỗi lệnh Bash?

- Phương án: (1) cache marshal khoá sha256 nguồn trong thư mục do install/doctor tạo (theo PLAN) · (2) không cache; giữ compile từ nguồn (AUD-SEC-074), sổ ghi chấp nhận chi phí; tăng tốc thật đi qua tách guard/nạp lười (AUD-ARCH-008, cần ADR) · (3) tiến trình guard thường trú (daemon) giữ module đã nạp
- Chọn: không cache; giữ compile từ nguồn (AUD-SEC-074), sổ ghi chấp nhận chi phí; tăng tốc thật đi qua tách guard/nạp lười (AUD-ARCH-008, cần ADR)
- Lý do (tiêu chí chất lượng cuối): đọc mã + mô hình đe doạ 2026-11-02: khoá sha256 chỉ ràng buộc NGUỒN, không ràng buộc bytecode — ai ghi được file cache (đặt tên theo sha256 nguồn công khai) thì thay mã guard mà git diff không thấy (cache bị gitignore), đúng lớp lỗi AUD-SEC-074 (pyc giả khớp header). Không có bí mật nào để ký trong máy agent. Sửa thẳng guard.py thì hiện trong diff và review. Tiêu chí 1 (an toàn) > 5 (tốc độ): ~0,13 s × ~1.500 lệnh ≈ 3–4 phút/phiên được chấp nhận. Daemon thêm bề mặt tấn công và trạng thái sống lâu
- Đường lùi: nếu có nơi lưu agent không ghi được (thư mục người dùng chỉ đọc, ký bằng khoá ngoài máy agent) thì làm phương án 1 qua ADR mới

### D-308 · 2026-11-02T10:14:40+00:00 · T-3640/AUD-SEC-329: chính sách guard suy từ chuỗi lý do — sửa bằng cách mỗi luật trả code tường minh (PLAN) hay khoá bằng test?

- Phương án: (1) mỗi luật (100+ chỗ trả lý do) trả code tường minh, REASON_CODES chỉ còn fallback · (2) giữ REASON_CODES; ReasonCodeLockTest: mỗi mã trong REASON_CODES có ≥ 1 lệnh thật chạy end-to-end và khẳng định mã — đổi câu chữ lý do làm test đỏ thay vì âm thầm cho qua
- Chọn: giữ REASON_CODES; ReasonCodeLockTest: mỗi mã trong REASON_CODES có ≥ 1 lệnh thật chạy end-to-end và khẳng định mã — đổi câu chữ lý do làm test đỏ thay vì âm thầm cho qua
- Lý do (tiêu chí chất lượng cuối): rủi ro của AUD-SEC-329 là đổi câu chữ làm deny thành cho qua MÀ KHÔNG AI BIẾT; test khoá biến lỗi im lặng thành CI đỏ với diff nhỏ (66 dòng test, 31 dòng guard cho chế độ core), tái hiện của sổ ('push thẳng nhánh chính' → 'đẩy thẳng…') nay đỏ ở ca PUSH_MAIN. Sửa 100+ luật chạm toàn guard 9,4k dòng — rủi ro hồi quy cao hơn lợi ích khi đã có khoá (tiêu chí 1–3). ADR-0017 §2 (AUD-DOC-181) chưa làm, giữ nợ
- Đường lùi: khi đổi lớn bộ luật guard (tách guard_core) thì chuyển sang code tường minh từng luật, giữ ReasonCodeLockTest làm hàng rào

### D-309 · 2026-11-02T11:12:12+00:00 · T-3645: git hook pre-commit chạy lại cổng commit trong phiên Claude Code (hook Bash của khung đã chạy cổng trước git commit) — chạy hai lần hay bỏ qua?

- Phương án: (1) luôn chạy (cổng chạy hai lần mỗi commit trong phiên Claude) · (2) bỏ qua khi CLAUDECODE đặt VÀ dự án có .claude/hooks/pre-bash-guard.sh · (3) dấu tem (cây chỉ mục đã qua cổng) do hook Claude ghi, pre-commit so tem
- Chọn: bỏ qua khi CLAUDECODE đặt VÀ dự án có .claude/hooks/pre-bash-guard.sh
- Lý do (tiêu chí chất lượng cuối): Claude Code đặt CLAUDECODE cho shell của nó (kiểm 2026-11-02 trong phiên); hook Bash của khung đã chạy đúng cổng ngay trước commit, chạy lại chỉ tốn thời gian (gate-fast có thể vài phút). Tem trong .git cũng giả được như biến môi trường mà phức tạp hơn. Sàn git hook nhắm sai sót của công cụ không có hook chặn, không phải agent cố lách: agent đặt CLAUDECODE=1 để lách là hành vi lách (LOOP-STOP-025) — ghi giới hạn
- Đường lùi: bỏ điều kiện trong pre-commit (luôn chạy) nếu thấy công cụ khác đặt CLAUDECODE hay bị lách

### D-310 · 2026-11-02T11:25:40+00:00 · T-3642…3644 adapter: kiểm bằng gì và xử lý host tự đọc .claude/settings.json (Copilot, Cursor, Grok) thế nào?

- Phương án: (1) theo PLAN: ≥ 10 ca autonomy-bench mỗi công cụ (nhóm bench mới) + tránh nạp hai lần · (2) test bảng tests/test_adapters.py (≥ 10 ca/host qua hàm thật, giao thức chặn từng host, plugin OpenCode chạy thật bằng bun) + chấp nhận hook Claude chạy thêm ở Copilot/Cursor/Grok
- Chọn: test bảng tests/test_adapters.py (≥ 10 ca/host qua hàm thật, giao thức chặn từng host, plugin OpenCode chạy thật bằng bun) + chấp nhận hook Claude chạy thêm ở Copilot/Cursor/Grok
- Lý do (tiêu chí chất lượng cuối): bench cần nhóm ca mới trong engine autonomy-bench (đọc payload từng host) — nhiều mã hơn cho cùng bảo đảm mà test bảng cho; test chạy đúng hàm của adapter và guard thật. Hai lần chạy không đổi quyết định (cùng một guard, deny thắng); Copilot/Cursor không có cơ chế khử trùng theo nguồn, công tắc duy nhất là tắt toàn cục (disableAllHooks, Third-Party Imports) sẽ tắt luôn hook của khung — tiêu chí 1 > 5
- Đường lùi: thêm nhóm 'adapter' vào autonomy-bench khi số host/ca tăng; bỏ hook adapter của host nào đọc .claude/settings.json nếu đo được hook Claude chặn đúng ở host đó

### D-311 · 2026-11-02T04:56:37+00:00 · AUD-XFEAT-039 (#401): PR Dependabot không ghi được review sạch — miễn luật năng lực cho tác giả bot thế nào?

- Phương án: (1) Không miễn: steward/người merge PR bot · (2) Miễn khi tác giả PR và MỌI commit không phải merge là bot tin cậy (TRUSTED_BOTS), kiểm qua REST đúng PR/head mà sổ ghi; reviewer chỉ cần họ model rõ · (3) Miễn theo login người mở PR
- Chọn: Miễn khi tác giả PR và MỌI commit không phải merge là bot tin cậy (TRUSTED_BOTS), kiểm qua REST đúng PR/head mà sổ ghi; reviewer chỉ cần họ model rõ
- Lý do (tiêu chí chất lượng cuối): Yêu cầu chủ dự án 2026-11-02 (mọi PR tự kiểm + tự merge). (1) an toàn: review #401 cho thấy phương án 3 né được bằng URL ghép/chữ số Unicode và commit người đẩy thêm; phương án 2 đóng cả hai. (3) đơn giản: dùng lại TRUSTED_BOTS của steward.
- Đường lùi: Bỏ nhánh TRUSTED_BOTS trong _review_models_error và _bot_author_error (scripts/xt.py), bỏ cờ trong pr-review.yml

### D-312 · 2026-11-02T16:17:51+00:00 · PR 401: sau review chặn ở 4b3ff99, mã đã đổi (bản sửa 🟠 AUD-SEC-353/354 ở 6886950 + gộp main xung đột _pr_reviewed với khoá sổ T-3648) — pr debt từ chối vì không có 🔴; đi tiếp thế nào? (#401)

- Phương án: (1) pr rethink: mở một lượt review mới ở head hiện tại (max_rethink 1), reviewer-alt rà toàn diff rồi pr reviewed · (2) Đổi mức hai dòng 🟠 thành 🔴 để pr debt --fixed nhận · (3) Để steward/người merge, phiên không đi tiếp
- Chọn: pr rethink: mở một lượt review mới ở head hiện tại (max_rethink 1), reviewer-alt rà toàn diff rồi pr reviewed
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: mã sau review đổi thật ở đúng hàm vừa giải xung đột (_pr_reviewed + update_reviews) — cần một lượt rà độc lập ở head mới, không ghi nợ được; đổi mức để máy nhận là sửa lời khai cho khớp máy (phương án 2 sai P1); (2) giữ đường lùi: rethink dùng đúng trần max_rethink 1 (ADR-0061); chủ dự án yêu cầu 2026-11-02 giải xung đột và merge PR 401
- Đường lùi: Không review lại: đóng PR 401, mở PR mới từ main với cùng thay đổi và review một lần

### D-313 · 2026-11-02T16:18:45+00:00 · PR 401 kẹt sau D-312: pr rethink không mở lượt review (ADR-0062 trần 1), pr debt từ chối vì mã đổi sau review mà không có 🔴 — merge nội dung PR 401 thế nào? (#401)

- Phương án: (1) PR thay thế từ main: một commit = diff ròng của PR 401 (đã gộp main), review một lần ở head mới, đóng PR 401 kèm liên kết · (2) Đổi mức 🟠 AUD-SEC-353/354 thành 🔴 để pr debt --fixed nhận · (3) Revert bản sửa 🟠 ở PR 401 rồi ghi nợ
- Chọn: PR thay thế từ main: một commit = diff ròng của PR 401 (đã gộp main), review một lần ở head mới, đóng PR 401 kèm liên kết
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: bản sửa 🟠 và phần giải xung đột ở _pr_reviewed chưa được rà — PR mới cho đúng một lượt review độc lập trên toàn diff; phương án 2 sửa lời khai cho khớp máy (sai P1); phương án 3 bỏ bản sửa an toàn đã có test. (2) đường lùi: PR 401 đóng chứ không xoá, mở lại được; chủ dự án yêu cầu 2026-11-02 giải xung đột và merge PR 401
- Đường lùi: Mở lại PR 401, đóng PR thay thế

### D-314 · 2026-11-02T19:44:29+00:00 · T-3651 DIR_CAPS cho docs/ops và docs/autopilot: có đếm file lưu trữ (AUDIT-STATUS-ARCHIVE.md, DECISIONS-YYYY-MM.md) vào trần không?

- Phương án: (1) Đếm cả file lưu trữ (trần = tổng sau lưu trữ + 5 %) · (2) Loại file lưu trữ khỏi pathspec; trần = file đang dùng + 5 %; lưu trữ đóng băng, không trần
- Chọn: Loại file lưu trữ khỏi pathspec; trần = file đang dùng + 5 %; lưu trữ đóng băng, không trần
- Lý do (tiêu chí chất lượng cuối): (1) đúng: mục tiêu AUD-DOC-180 là chặn sổ ĐANG ĐỌC/GHI phình (lint, audit check parse mỗi PR); đếm lưu trữ làm việc lưu trữ không bao giờ hạ tổng → trần chạm sau ~20 PR mà không có đường hợp lệ nào xuống dưới trừ xoá lịch sử (trái P1). (3) đơn giản: một pathspec loại trừ. Lưu trữ chỉ thêm khi chạy đợt lưu trữ có PR riêng
- Đường lùi: Bỏ hai pathspec :(exclude) và đặt trần theo tổng gồm lưu trữ

### D-315 · 2026-11-02T23:29:24+00:00 · AUD-DOC-183: D-303 ghi LOOP-HARNESS-022 → MUST@M nhưng ADR-0064/harness-files/CHANGELOG ghi MUST@L — đính chính mức nào?

- Phương án: (1) Giữ MUST@L, ghi D này đính chính D-303; ADR-0064 và CHANGELOG trỏ D-303 + D này · (2) Đổi sang MUST@M như chữ D-303
- Chọn: Giữ MUST@L, ghi D này đính chính D-303; ADR-0064 và CHANGELOG trỏ D-303 + D này
- Lý do (tiêu chí chất lượng cuối): (1) đúng: harness-files.md đã có 4 MUST trơn; MUST@M thành 5 MUST hiệu lực ở M, `xt.py validate` đỏ "trần 4" (ADR-0004, review orange-docs đã chạy). (3) theo chuẩn khung: trần MUST/module là luật. D-303 sai chữ, không sai ý (chủ dự án chọn bắt buộc khi chạy không người trực)
- Đường lùi: Hạ MUST khác của harness-files.md xuống SHOULD rồi đổi LOOP-HARNESS-022 sang MUST@M (cần D mới)

### D-316 · 2026-11-02T23:29:25+00:00 · AUD-DOC-194: T-3649 làm hàng release-check `go_no_go` BLOCKER ở mọi quy mô, khác PLAN (`go_no_go_file`, BLOCKER ở M/L, S = SHOULD) — giữ bản đã làm?

- Phương án: (1) Giữ: tên go_no_go, BLOCKER mọi quy mô; PLAN T-3649 ghi Đổi theo D này · (2) Sửa mã theo PLAN: S = SHOULD
- Chọn: Giữ: tên go_no_go, BLOCKER mọi quy mô; PLAN T-3649 ghi Đổi theo D này
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: phát hành không có GO-NO-GO đã ký là lỗi ở mọi quy mô (3.29.0 thiếu file); chặt hơn PLAN. (3) đơn giản: một quy tắc; README, --help, mẫu GO-NO-GO đã khớp mã (orange-docs)
- Đường lùi: Thêm nhánh quy mô S → SHOULD trong _release_go_no_go

### D-317 · 2026-11-02T23:29:25+00:00 · AUD-DOC-228: validate --stale bỏ sót ~95 % ngày nguồn (dòng ghi đọc/rà YYYY-MM-DD) — sửa thế nào?

- Phương án: (1) (a) nới VERIFIED_AT_RE nhận đọc/rà, loại chưa/không … lại, 403 · (2) (b) chuẩn hoá ~248 dòng Nguồn sang chữ xác minh theo conventions §5 · (3) (c) chấp nhận có hạn — --stale chỉ tham khảo, không ở cổng
- Chọn: (c) chấp nhận có hạn — --stale chỉ tham khảo, không ở cổng
- Lý do (tiêu chí chất lượng cuối): (1) đúng: --stale không thuộc gate/CI nên không có xanh giả ở cổng; (a) đổi nghĩa 'xác minh' theo chữ tự do dễ đếm sai lần nữa (AUD-DOC-216), (b) chạm ~248 dòng ở nhiều module — làm cùng đợt nội dung AUD-DOC-179 (PLAN riêng). (5) chi phí: phá hoà
- Đường lùi: Làm (b) trong PLAN nội dung kế; hoặc (a) nếu đưa --stale vào cổng

### D-318 · 2026-11-02T23:50:44+00:00 · AUD-HAR-205 phần còn: loop run --agent host khác Claude chưa có cờ chế độ quyền — thêm cờ tự duyệt từng host hay mở --agent-args?

- Phương án: (1) Thêm cờ tự duyệt từng host (codex --full-auto, gemini --yolo, …) vào bảng lệnh · (2) Mở --agent-args cho người dùng tự truyền cờ; bảng lệnh không thêm cờ bỏ qua quyền; research cờ từng host rồi mới thêm · (3) Chấp nhận nợ, không làm
- Chọn: Mở --agent-args cho người dùng tự truyền cờ; bảng lệnh không thêm cờ bỏ qua quyền; research cờ từng host rồi mới thêm
- Lý do (tiêu chí chất lượng cuối): (1) an toàn: cờ tự duyệt chưa xác minh có thể là chế độ bỏ qua quyền (LOOP-STOP-028 cấm khung tự bật); cờ do người chạy truyền vào là quyết định của họ. (2) giữ đường lùi: thêm cờ đã research sau. Phần Claude đã sửa (--permission-mode auto). Việc này cần /research từng host nên làm sau PLAN này
- Đường lùi: Bỏ --agent-args

### D-319 · 2026-11-03T00:23:23+00:00 · Nhánh guard (#420): AUD-SEC-373 (sổ giai đoạn bảo vệ bằng liệt kê lệnh ghi) và AUD-SEC-374 (lời gọi thực thi sau literal lạ coi là trong chuỗi) — sửa tận gốc cần ADR; đóng PLAN thế nào? Kèm hệ quả chặn mới grep -rl … docs | xargs sed -i

- Phương án: (1) Chấp nhận có hạn 2027-01-31: ADR mới chọn bảo vệ theo tiền tố docs/ (như .autopilot/) hoặc vân tay sổ do xt.py stage ghi; tách literal theo họ trình thông dịch hoặc coi lời gọi trong vùng chưa chắc là lời gọi; nhận chặn mới (hướng chặt) · (2) Làm ngay trong PR này · (3) Để mở, chặn phát hành
- Chọn: Chấp nhận có hạn 2027-01-31: ADR mới chọn bảo vệ theo tiền tố docs/ (như .autopilot/) hoặc vân tay sổ do xt.py stage ghi; tách literal theo họ trình thông dịch hoặc coi lời gọi trong vùng chưa chắc là lời gọi; nhận chặn mới (hướng chặt)
- Lý do (tiêu chí chất lượng cuối): (1) an toàn: cả hai là giới hạn của cách liệt kê đã biết (ADR-0063) — bản sửa hiện tại đóng mọi dạng đã tái hiện; đổi mô hình bảo vệ là quyết định kiến trúc cần ADR + đo chặn oan trên kho lệnh thật, làm vội trong PR nợ dễ hồi quy (#372, ADR-0061). (2) giữ đường lùi: chấp nhận có hạn, chủ phiên chính. Chặn mới grep|xargs sed -i dưới docs là hướng chặt, đường thay thế: sửa từng file bằng Edit
- Đường lùi: Mở ADR sớm hơn và làm trước 3.30.0 nếu chủ dự án đòi

### D-320 · 2026-11-03T03:46:58+00:00 · T-3635: đóng 39 dòng nợ review còn mở sau hai lô sửa rẻ thế nào (24 chấp nhận, 2 bác bỏ, 2 đã sửa từ trước theo phân loại có bằng chứng; 11 sửa-ngay mà lô bỏ qua vì chạm file ngoài phạm vi lô)?

- Phương án: (1) Ghi theo phân loại; 11 dòng bỏ qua → chấp nhận hạn 2026-12-15 (đợt kế), chủ phiên chính · (2) Sửa nốt 11 dòng trong PR này · (3) Để mở
- Chọn: Ghi theo phân loại; 11 dòng bỏ qua → chấp nhận hạn 2026-12-15 (đợt kế), chủ phiên chính
- Lý do (tiêu chí chất lượng cuối): (1) đúng: mỗi dòng có lý do/bằng chứng phân loại đã chạy (reviewer agent, chỉ đọc); 11 dòng chưa sửa không được ghi đã sửa (P1). (2) giữ đường lùi: hạn ngắn, chủ rõ; PR này đã lớn (hai lô ~1.100 dòng), thêm sửa làm review kém (bài học #372). (3) audit check --strict nhận chấp nhận có chủ + hạn
- Đường lùi: Mở lại từng dòng (đổi chấp nhận → mở) khi có lô sửa

### D-321 · 2026-11-03T05:19:35+00:00 · AUD-SEC-388 lượt 2: 7 lệnh dạng n=$(…) + $((n±k)) + $var không nháy còn bị chặn (BUDGET) — giữ chặn hay tin lệnh chỉ in số (wc, date +%s, grep -c)?

- Phương án: (1) Giữ chặn; lý do chặn gợi viết "$var" · (2) Tin lệnh chỉ in số (heuristic)
- Chọn: Giữ chặn; lý do chặn gợi viết "$var"
- Lý do (tiêu chí chất lượng cuối): (1) an toàn: bash đánh giá đệ quy giá trị biến trong số học nên n=$(…) gán được IFS (đã tái hiện bash 5.2.21); danh sách lệnh 'chỉ in số' là danh sách trắng dễ lách (ADR-0063, bài học #372). (4) UX: đường viết thay một bước (nháy biến), đo 3884 lệnh thật chỉ 9 đổi quyết định
- Đường lùi: Thêm danh sách trắng lệnh đếm khi đo được chặn oan đáng kể

### D-322 · 2026-11-03T06:11:39+00:00 · PR 422: review tìm thêm 5 dạng lách IFS (function NAME { IFS=…}, "((" giả, từ lệnh có nháy, read định nghĩa trong eval, IFS=… exec read) — base cũng lọt cả 5; vá tiếp trong PR hay đổi cách?

- Phương án: (1) Vá tiếp 5 dạng trong PR này (lần thứ tư) · (2) Merge PR (chặt hơn base, không mở đường mới — ADR-0056); AUD-SEC-388 trả về mở, liệt kê dạng còn lọt; PR kế: ADR mới — luật chung theo ADR-0063: mọi gán IFS/tên-đích-động có mặt thì mọi mở rộng không đọc chắc → BUDGET, chỉ một mẫu cho phép neo chặt (while IFS= read -r v … "$v"), không suy theo cấu trúc · (3) Chấp nhận lớp IFS là giới hạn đã biết, giao sandbox
- Chọn: Merge PR (chặt hơn base, không mở đường mới — ADR-0056); AUD-SEC-388 trả về mở, liệt kê dạng còn lọt; PR kế: ADR mới — luật chung theo ADR-0063: mọi gán IFS/tên-đích-động có mặt thì mọi mở rộng không đọc chắc → BUDGET, chỉ một mẫu cho phép neo chặt (while IFS= read -r v … "$v"), không suy theo cấu trúc
- Lý do (tiêu chí chất lượng cuối): (1) an toàn: ba lượt vá theo cấu trúc lệnh đều lọt dạng mới (#372, ADR-0061 max_rethink) — hội tụ cần đổi mô hình (danh sách trắng, không suy cấu trúc), là quyết định kiến trúc → ADR; head chặn mọi dạng đã biết trước đó, 5 dạng mới base cũng lọt nên merge không làm tệ hơn. (2) giữ đường lùi: 🔴 vẫn mở ở sổ → release-check chặn phát hành tới khi xong. Phương án 3 trái tiêu chí 1 khi sandbox chưa bắt buộc ở mọi quy mô
- Đường lùi: Đóng PR 422, gom vào PR ADR mới

### D-323 · 2026-11-03T09:50:44+00:00 · AUD-SEC-388 sau ADR-0065 (sửa review lượt 2 đóng dạng toán hạng có nháy): giữ đã sửa hay trả về mở?

- Phương án: (1) Giữ đã sửa; review 1 lần của PR #423 (ADR-0062, reviewer-alt) là review độc lập lượt 3 — 🔴 mới thì sửa trong PR, không ghi nợ · (2) Trả về mở tới khi có review riêng lượt 3 rồi mới mở PR
- Chọn: Giữ đã sửa; review 1 lần của PR #423 (ADR-0062, reviewer-alt) là review độc lập lượt 3 — 🔴 mới thì sửa trong PR, không ghi nợ
- Lý do (tiêu chí chất lượng cuối): (1) đúng/an toàn: review đối kháng của PR vẫn chặn merge nếu còn dạng lọt (🔴 không thành nợ); (3) đơn giản: không tạo thêm vòng ngoài luồng review 1 lần; mọi dạng của review lượt 1-2 có test đỏ trước
- Đường lùi: Đổi hàng AUD-SEC-388 về mở trong sổ nếu review #423 hoặc audit sau tìm dạng lọt

### D-324 · 2026-11-03T11:38:52+00:00 · AUD-SEC-400 (ghi script rồi chạy cùng lệnh) chặn oan 6,8 % lệnh thật (260 dạng cat > f <<'EOF' … EOF; python3 f): giữ chặn hay quét thân heredoc có nháy như script?

- Phương án: (1) A: giữ chặn mọi ghi-rồi-chạy cùng lệnh; viết lại bằng Write rồi chạy ở lệnh riêng · (2) B: khi cat/tee là nơi duy nhất ghi tệp bằng > từ heredoc CÓ NHÁY và tệp được shell/trình thông dịch chạy cùng lệnh, guard quét thân heredoc như script của trình đó (như bash <<'EOF' / python3 - <<'EOF'); mọi dạng khác giữ chặn
- Chọn: B: khi cat/tee là nơi duy nhất ghi tệp bằng > từ heredoc CÓ NHÁY và tệp được shell/trình thông dịch chạy cùng lệnh, guard quét thân heredoc như script của trình đó (như bash <<'EOF' / python3 - <<'EOF'); mọi dạng khác giữ chặn
- Lý do (tiêu chí chất lượng cuối): (1) an toàn hơn A: A chỉ đẩy nội dung sang lệnh riêng mà guard không đọc tệp, B quét thật nội dung (bắt cả cat > x.sh <<'EOF' rm -rf ~ mà base cho qua); (4) gỡ ~260 chặn oan; (3) dùng lại đường quét heredoc sẵn có, không suy cấu trúc mới — đúng tinh thần ADR-0065 (miễn theo giá trị chắc chắn)
- Đường lùi: Bỏ nhánh miễn B trong _script_run_why, trả fixture d270 về BUDGET

### D-325 · 2026-11-03T12:02:49+00:00 · T-3635: 5 nợ review 🟢 còn mở cần sửa mã/thử nghiệm (AUD-SEC-376 cần PR thử trên GitHub, HAR-216 go_no_go fence, HAR-217 argparse --agent-args, HAR-218 research cờ host, SEC-381 danger prompt-assets) — sửa ngay trước 3.30.0 hay chấp nhận có hạn?

- Phương án: (1) Chấp nhận có hạn 2027-01-21 (chủ: phiên chính), lý do từng dòng; sửa ở PLAN sau 3.30.0 · (2) Sửa cả 5 trước khi cắt 3.30.0
- Chọn: Chấp nhận có hạn 2027-01-21 (chủ: phiên chính), lý do từng dòng; sửa ở PLAN sau 3.30.0
- Lý do (tiêu chí chất lượng cuối): (2) giữ đường lùi + (5) tốc độ: cả 5 là 🟢, không lùi so với base, không chặn hành động nguy hiểm mới; 376 cần dựng PR thử (ra khỏi máy), 218 cần /research — không làm trong lát khép PLAN; T-3635 cho phép chấp nhận (chủ + hạn)
- Đường lùi: Đổi các dòng về mở và thêm task vào PLAN kế

### D-326 · 2026-11-03T12:37:03+00:00 · Review #426: 🔴 AUD-SEC-399/400 khai đóng sớm (miễn D-324 quét sai thư mục/stdin/uniq, /dev/shm; mảng chữ nguyên văn và $@ không áp luật) + lỗ liệt kê trình chạy/writer có từ trước (python3 -m, PATH=., iconv -o, …) — xử lý thế nào?

- Phương án: (1) Sửa mọi dạng do mã mới cho qua (D-324 thu hẹp: không miễn khi có cd/pushd/popd, stdin/here-string/đối số của trình chạy, writer ngoài cat/tee; /dev/ chỉ bỏ null/std*/fd/tty; mảng chữ thay phần tử vào argv rồi áp luật, $@ sau set --/hàm là mảng nhiễm) thành ID 🔴 mới đã sửa; lỗ liệt kê có từ trước ghi ID 🔴 mở riêng (chặn phát hành, PLAN kế); 🟠/🟢 sửa luôn · (2) Bỏ hẳn miễn D-324 và mọi phần 399 mới, trả 399/400 về mở
- Chọn: Sửa mọi dạng do mã mới cho qua (D-324 thu hẹp: không miễn khi có cd/pushd/popd, stdin/here-string/đối số của trình chạy, writer ngoài cat/tee; /dev/ chỉ bỏ null/std*/fd/tty; mảng chữ thay phần tử vào argv rồi áp luật, $@ sau set --/hàm là mảng nhiễm) thành ID 🔴 mới đã sửa; lỗ liệt kê có từ trước ghi ID 🔴 mở riêng (chặn phát hành, PLAN kế); 🟠/🟢 sửa luôn
- Lý do (tiêu chí chất lượng cuối): (1) đóng mọi lỗ do PR này mở ra, ghi trung thực phần còn lại (không khai đóng sớm — bài học #423); (4) giữ gỡ chặn oan D-324; lỗ liệt kê là giới hạn mô hình danh sách đen, cần ADR riêng (sandbox/allowlist trình chạy) — không vá tiếp trong lát này
- Đường lùi: Revert commit sửa review #426

### D-327 · 2026-11-03T13:21:18+00:00 · AUD-SEC-406: lỗ liệt kê trình chạy/trình ghi của luật ghi-rồi-chạy (AUD-SEC-400) — đóng bằng cách nào; và chặn oan 'cd trước cat > f' của D-326?

- Phương án: (1) Vá tiếp danh sách trình chạy/trình ghi · (2) ADR-0066: xét theo TÊN tệp đích ghi được nhắc lại ở chỗ khác của lệnh (trừ lệnh chỉ đọc trong danh sách trắng với tệp không đuôi script), thêm -o/--output và đích ghi của bộ quét script; miễn D-324 chỉ mất khi cd nằm giữa ghi và chạy · (3) Bắt buộc sandbox Claude Code
- Chọn: ADR-0066: xét theo TÊN tệp đích ghi được nhắc lại ở chỗ khác của lệnh (trừ lệnh chỉ đọc trong danh sách trắng với tệp không đuôi script), thêm -o/--output và đích ghi của bộ quét script; miễn D-324 chỉ mất khi cd nằm giữa ghi và chạy
- Lý do (tiêu chí chất lượng cuối): (1) không phụ thuộc danh sách trình chạy — lệnh lạ bị tính (hướng an toàn); sandbox không chặn force-push qua mạng; (4) gỡ chặn oan cd-trước của D-326; (3) dùng dữ liệu đích ghi sẵn có, không suy cấu trúc mới (ADR-0065)
- Đường lùi: Revert PR triển khai; AUD-SEC-406 về mở

### D-328 · 2026-11-03T14:26:55+00:00 · ADR-0066 chặn mới 340/5237 lệnh (6,5 %): giữ nguyên, thêm lệnh không chạy mã vào danh sách trắng (B), miễn tệp dữ liệu đưa cho script có sẵn (C), hay B+C? Giữ 3 miễn theo giá trị (p.json đối số dữ liệu của -c chỉ đọc; tên gốc bỏ đuôi không tính với đuôi dữ liệu; tệp nội dung gh -F/--body-file/< F)?

- Phương án: (1) A: giữ nguyên · (2) B: thêm mkdir/echo/printf/chmod/sha*sum/md5sum/touch/sed -n chỉ in vào danh sách trắng; giữ 3 miễn theo giá trị · (3) B+C: thêm cả miễn tệp dữ liệu cho script có sẵn
- Chọn: B: thêm mkdir/echo/printf/chmod/sha*sum/md5sum/touch/sed -n chỉ in vào danh sách trắng; giữ 3 miễn theo giá trị
- Lý do (tiêu chí chất lượng cuối): (1) B chỉ thêm lệnh không chạy mã — không mở đường thực thi; C đảo phần AUD-SEC-407 vừa siết và tin vào nội dung script có sẵn (có thể exec đối số) → loại; 3 miễn theo giá trị có kiểm _read_only_script/đuôi dữ liệu/đọc nội dung — giữ (giữ 6 ca D-270); (4) bớt chặn oan ~24 ca
- Đường lùi: Bỏ các lệnh B khỏi danh sách trắng

### D-329 · 2026-11-03T15:12:36+00:00 · #427 review chặn: 7 🔴 (3 hồi quy do miễn mới — AUD-SEC-410 trả sớm mở lại find . -delete qua rebase --exec/make --eval; D-324 cd bỏ mất gán CDPATH; -oVALUE dính; 3 lỗ miễn mới — perl do $ARGV, chiếm tên lệnh đọc qua PATH, LESSOPEN/GIT_EXTERNAL_DIFF; AUD-SEC-406 khai đóng sai với tên dựng lúc chạy) — đổi chiến lược thế nào (max_rethink, ADR-0061)?

- Phương án: (1) Vá tiếp từng 🔴 trong PR · (2) Thu PR về luật CHẶN, bỏ/siết mọi miễn mới: AUD-SEC-410 về hành vi base (bỏ trả sớm); D-324 về hành vi #426 (có cd/pushd/popd/gán biến trước writer là mất miễn); _reuse_data_arg chỉ họ python; lệnh đọc mất miễn khi tên lệnh trùng tên gốc tệp vừa ghi hoặc lệnh có gán/export biến (GIT_*, LESS*, PATH), bỏ less; -o đọc cụm cờ kiểu getopt (miễn git grep theo n[:2]); AUD-SEC-406 giữ MỞ (tên dựng lúc chạy) — T-3635 bỏ tick, sửa câu ADR · (3) Đóng PR, giữ AUD-SEC-406 mở
- Chọn: Thu PR về luật CHẶN, bỏ/siết mọi miễn mới: AUD-SEC-410 về hành vi base (bỏ trả sớm); D-324 về hành vi #426 (có cd/pushd/popd/gán biến trước writer là mất miễn); _reuse_data_arg chỉ họ python; lệnh đọc mất miễn khi tên lệnh trùng tên gốc tệp vừa ghi hoặc lệnh có gán/export biến (GIT_*, LESS*, PATH), bỏ less; -o đọc cụm cờ kiểu getopt (miễn git grep theo n[:2]); AUD-SEC-406 giữ MỞ (tên dựng lúc chạy) — T-3635 bỏ tick, sửa câu ADR
- Lý do (tiêu chí chất lượng cuối): (1) gỡ mọi hồi quy và lỗ do miễn mới, giữ phần chặn đã chứng minh; khai trung thực 406 còn mở (bài học #423/#426); (2) đường lùi: revert PR; vá tiếp từng 🔴 (phương án 1) là mô hình #372 không điểm dừng
- Đường lùi: Đóng PR #427, revert về main

### D-330 · 2026-11-03T15:40:20+00:00 · docs/ops còn 6 B dưới trần (ADR-0043) và mọi dòng đã sửa có ở tag v3.29.0 đã lưu trữ hết — lấy chỗ cho sổ nợ review #427 thế nào?

- Phương án: (1) Nới trần docs/ops · (2) Lưu trữ đợt 2: dòng đã sửa có nguyên văn trên origin/main (PR sửa đã merge), cũ nhất trước, dời nguyên văn sang AUDIT-STATUS-ARCHIVE.md; ghi tiêu chí mới ở đầu file lưu trữ · (3) Rút gọn chữ các dòng đang mở
- Chọn: Lưu trữ đợt 2: dòng đã sửa có nguyên văn trên origin/main (PR sửa đã merge), cũ nhất trước, dời nguyên văn sang AUDIT-STATUS-ARCHIVE.md; ghi tiêu chí mới ở đầu file lưu trữ
- Lý do (tiêu chí chất lượng cuối): (1)(3) không nới cổng (LOOP-CI-001), không sửa chữ người khác; dòng đã sửa trên main là lịch sử đóng băng, máy đọc cả hai file; tiêu chí tag chỉ là mốc thuận tiện, mốc main vẫn bất biến
- Đường lùi: Dời các dòng về AUDIT-STATUS.md

### D-331 · 2026-11-03T15:49:52+00:00 · Hai 🔴 mở AUD-SEC-406 (tên dựng/ngầm) và AUD-SEC-414 (HOME/CDPATH trước cd, patch) thuộc lớp lách guard bằng tên/mã dựng lúc chạy — vá tiếp, chặn rộng, bật sandbox bắt buộc, hay chấp nhận có hạn?

- Phương án: (1) Vá tiếp từng dạng · (2) Chặn mọi mở rộng/tệp ghi trong lệnh chạy mã · (3) Bật sandbox bắt buộc trong settings của khung · (4) ADR-0067: chấp nhận có hạn 2027-01-21 lớp lách bằng tên/mã dựng lúc chạy khi mọi dạng nguyên văn đã chặn; ranh giới cứng ở ruleset GitHub/CI/review; đánh giá sandbox opt-in trước hạn
- Chọn: ADR-0067: chấp nhận có hạn 2027-01-21 lớp lách bằng tên/mã dựng lúc chạy khi mọi dạng nguyên văn đã chặn; ranh giới cứng ở ruleset GitHub/CI/review; đánh giá sandbox opt-in trước hạn
- Lý do (tiêu chí chất lượng cuối): (3) phân tích tĩnh shell không đầy đủ theo nguyên lý — vá tiếp là vòng không điểm dừng kèm hồi quy (#426/#427); (1) không nới luật, không khai đóng, force-push/xoá nhánh chính bị ruleset máy chủ chặn; (2) chỉ đổi trạng thái sổ; chặn rộng/sandbox bắt buộc gây chặn oan lớn hoặc chưa chạy được ở cloud
- Đường lùi: Đổi AUD-SEC-406/414/410/413 về mở

### D-332 · 2026-11-03T16:19:32+00:00 · Review #428 chặn: ADR-0067 chấp nhận quá phạm vi (AUD-SEC-414 và phần nguyên văn của 406 — sponge/tar/unzip/openssl/xxd, tệp nạp ngầm — vẫn lọt dù nguyên văn; nói quá lớp ngoài; đảo ADR-0065 không ghi) — sửa thế nào?

- Phương án: (1) Giữ chấp nhận, sửa câu chữ · (2) Thu hẹp ADR-0067 về ĐÚNG lớp tên dựng lúc chạy (điều kiện a/b/c), ghi Thay một phần ADR-0065; 414 về mở; tách 2 ID 🔴 mở mới (trình ghi chưa liệt kê; tệp nạp ngầm); task T-3663 sửa luật tĩnh; T-3635 bỏ tick; sửa mô tả lớp ngoài (review không là ranh giới máy chủ; tắt hook cục bộ không có lớp cứng khi sandbox tắt)
- Chọn: Thu hẹp ADR-0067 về ĐÚNG lớp tên dựng lúc chạy (điều kiện a/b/c), ghi Thay một phần ADR-0065; 414 về mở; tách 2 ID 🔴 mở mới (trình ghi chưa liệt kê; tệp nạp ngầm); task T-3663 sửa luật tĩnh; T-3635 bỏ tick; sửa mô tả lớp ngoài (review không là ranh giới máy chủ; tắt hook cục bộ không có lớp cứng khi sandbox tắt)
- Lý do (tiêu chí chất lượng cuối): (1) cách hiểu chặt: dạng nguyên văn sửa được bằng luật tĩnh nên không được chấp nhận; cổng --strict không xanh giả; (3) giữ điểm dừng cho đúng lớp không giải được tĩnh
- Đường lùi: Đổi các dòng sổ về trạng thái trước #428

### D-333 · 2026-11-03T17:43:50+00:00 · T-3663: luật AUD-SEC-415 chặn lệnh Kiểm PRF-CLI-004 (git ls-files --error-unmatch scripts/xt.py … && python3 scripts/xt.py --help) — viết lại lệnh Kiểm hay miễn git ls-files?

- Phương án: (1) Viết lại lệnh Kiểm: bỏ scripts/xt.py khỏi git ls-files (CI chỉ có tệp đã track), theo tiền lệ UX-DS-021 · (2) Thêm git ls-files vào danh sách đọc REUSE_GIT_READS
- Chọn: Viết lại lệnh Kiểm: bỏ scripts/xt.py khỏi git ls-files (CI chỉ có tệp đã track), theo tiền lệ UX-DS-021
- Lý do (tiêu chí chất lượng cuối): (1) không thêm miễn trừ mới vào guard (bài học hồi quy #426/#427); lệnh Kiểm lỏng hơn chút ở máy dev nhưng CI giữ nguyên ý (tệp tồn tại = đã track); (3) đơn giản
- Đường lùi: Trả lệnh Kiểm cũ và thêm miễn ls-files bằng ADR

### D-334 · 2026-11-03T19:08:57+00:00 · Nợ #429 (PR #430): AUD-SEC-419 — duyệt 2 lệnh chặn→qua có chủ đích (shellcheck, git log là lệnh đọc; mất miễn khi GIT_*/-C/-c/*PAGER=) và chấp nhận phần (b) git apply/patch từ tệp diff vẫn BUDGET?

- Phương án: (1) Duyệt: (a) gỡ chặn oan bằng danh sách đọc có điều kiện mất miễn; (b) chấp nhận chặn oan có chủ đích tới 2027-01-21 · (2) Giữ chặn cả (a)
- Chọn: Duyệt: (a) gỡ chặn oan bằng danh sách đọc có điều kiện mất miễn; (b) chấp nhận chặn oan có chủ đích tới 2027-01-21
- Lý do (tiêu chí chất lượng cuối): (1) shellcheck/which/type/command -v/git log không chạy mã tệp; git log chỉ chạy textconv/pager qua cấu hình mà guard đã chặn (HOOK_BYPASS) hoặc qua GIT_*/-c/*PAGER= — đã làm mất miễn; (b) diff từ tệp không đọc được đích nên giữ chặn là hướng an toàn; (4) gỡ chặn oan đo được
- Đường lùi: Bỏ shellcheck/which/type/command -v/git log khỏi danh sách đọc

### D-335 · 2026-11-03T20:51:21+00:00 · Đính chính D-334 (review #430/#431): lý do 'git log chỉ chạy textconv/pager qua cấu hình mà guard đã chặn (HOOK_BYPASS)' sai tiền đề — ghi thô ~/.gitconfig từng lọt (AUD-SEC-424, nay chặn ở #431) và pager không chạy khi không TTY — giữ hay bỏ miễn git log?

- Phương án: (1) Giữ miễn git log (D-334), sửa lý do: an toàn dựa trên chặn ghi mọi tệp cấu hình git (.git/config, config.worktree, gitconfig toàn cục — #431/#432) + mất miễn khi GIT_*/-C/-c; pager không chạy khi không TTY · (2) Bỏ miễn git log
- Chọn: Giữ miễn git log (D-334), sửa lý do: an toàn dựa trên chặn ghi mọi tệp cấu hình git (.git/config, config.worktree, gitconfig toàn cục — #431/#432) + mất miễn khi GIT_*/-C/-c; pager không chạy khi không TTY
- Lý do (tiêu chí chất lượng cuối): (1) sau #431/#432 mọi đường ghi cấu hình git đã chặn nên git log không chạy được mã mới; (4) gỡ chặn oan; thay lý do D-334
- Đường lùi: Bỏ git log khỏi danh sách đọc

### D-336 · 2026-11-03T21:58:57+00:00 · AUD-SEC-434 (phía đọc cấu hình git: HOME=/XDG_CONFIG_HOME=/GIT_CONFIG_GLOBAL=tệp vừa ghi ở lệnh trước, declare -x GIT_CONFIG_*) — vá theo tệp ghi hay luật phía đọc? (kèm đính chính D-335)

- Phương án: (1) Tiếp tục chặn phía ghi theo từng tệp/đường · (2) Luật phía đọc: lệnh git có HOME=/XDG_CONFIG_HOME=/GIT_CONFIG_GLOBAL|SYSTEM=(khác /dev/null)/GIT_CONFIG_PARAMETERS/GIT_CONFIG_COUNT|KEY_n|VALUE_n gán bằng mọi cách (đầu lệnh, export, declare -x, env, typeset -x) trong cùng lệnh → commit/push xử như bỏ qua hook (luật no_verify sẵn có); lệnh git khác → BUDGET; giữ chặn phía ghi
- Chọn: Luật phía đọc: lệnh git có HOME=/XDG_CONFIG_HOME=/GIT_CONFIG_GLOBAL|SYSTEM=(khác /dev/null)/GIT_CONFIG_PARAMETERS/GIT_CONFIG_COUNT|KEY_n|VALUE_n gán bằng mọi cách (đầu lệnh, export, declare -x, env, typeset -x) trong cùng lệnh → commit/push xử như bỏ qua hook (luật no_verify sẵn có); lệnh git khác → BUDGET; giữ chặn phía ghi
- Lý do (tiêu chí chất lượng cuối): (1) đóng cả lớp: tệp ghi ở lệnh trước không cần dò, git chỉ đọc cấu hình lạ khi có biến này; OR với luật cũ; (3) một luật thay cho vá từng tệp (#431/#432 lặp); đính chính D-335: miễn git log an toàn nhờ luật phía đọc này + chặn ghi tệp cấu hình
- Đường lùi: Bỏ luật phía đọc

### D-337 · 2026-11-03T22:44:43+00:00 · T-3666/AUD-SEC-434: luật phía đọc D-336 áp cho biến trỏ TỆP cấu hình (HOME, XDG_CONFIG_HOME, GIT_CONFIG_GLOBAL|SYSTEM) hay cả GIT_CONFIG_PARAMETERS/GIT_CONFIG_COUNT|KEY_n|VALUE_n?

- Phương án: (1) Chỉ biến trỏ tệp; biến cấu hình một lần guard đọc được nguyên giá trị nên xét bằng luật khoá sẵn có (hooksPath, khoá chạy lệnh, alias) · (2) Đủ danh sách D-336, chấp nhận chặn oan push/alias qua biến môi trường
- Chọn: Chỉ biến trỏ tệp; biến cấu hình một lần guard đọc được nguyên giá trị nên xét bằng luật khoá sẵn có (hooksPath, khoá chạy lệnh, alias)
- Lý do (tiêu chí chất lượng cuối): (1) giá trị GIT_CONFIG_PARAMETERS/KEY_n/VALUE_n nằm ngay trong lệnh — luật khoá đã chặn khoá nguy hiểm (không có tệp ẩn để đọc); chỉ biến trỏ tệp mới đưa nội dung guard không thấy; (4) giữ hành vi đúng của test adapter/alias; thu hẹp D-336 theo bằng chứng
- Đường lùi: Mở rộng luật phía đọc cho đủ danh sách

### D-338 · 2026-11-03T23:42:17+00:00 · Đính chính D-336 (review #433): 'git chỉ đọc cấu hình lạ khi có các biến này' sai — GIT_DIR/--git-dir, GIT_TEMPLATE_DIR/--template, GIT_EXEC_PATH/--exec-path, hard link cũng dẫn git tới cấu hình/mã ngoài; luật phía đọc mở rộng thế nào?

- Phương án: (1) Mở rộng luật phía đọc (D-336/337) thêm GIT_DIR/--git-dir/GIT_COMMON_DIR (khác .git của dự án), GIT_TEMPLATE_DIR/--template, GIT_EXEC_PATH/--exec-path; chặn ghi qua hard link bằng so inode — T-3667 · (2) Chấp nhận lớp này theo ADR-0067
- Chọn: Mở rộng luật phía đọc (D-336/337) thêm GIT_DIR/--git-dir/GIT_COMMON_DIR (khác .git của dự án), GIT_TEMPLATE_DIR/--template, GIT_EXEC_PATH/--exec-path; chặn ghi qua hard link bằng so inode — T-3667
- Lý do (tiêu chí chất lượng cuối): (1) các dạng này nguyên văn trong một lệnh nên luật tĩnh bắt được (ADR-0067 chỉ chấp nhận tên dựng lúc chạy); (3) cùng một luật phía đọc, không thêm miễn trừ
- Đường lùi: Bỏ các biến/cờ mới khỏi luật phía đọc

### D-340 · 2026-11-04T01:05:06+00:00 · Audit delta 2026-11-04: xử lý nợ Git guard sau #434 thế nào?

- Phương án: (1) Sửa các đường lách Git guard tái hiện được, giữ test hồi quy có đối chứng và chạy cổng đầy đủ trước PR · (2) Giữ các phát hiện mở và hoãn sang đợt sandbox
- Chọn: Sửa các đường lách Git guard tái hiện được, giữ test hồi quy có đối chứng và chạy cổng đầy đủ trước PR
- Lý do (tiêu chí chất lượng cuối): Hai ca scratch cho Git đọc cấu hình đổi hook hoặc chạy alias mà guard cho qua. Chặn ở đầu đọc và ghi theo phạm vi hẹp, giữ đường lùi bằng một lát PR. Chạy phiên tương tác.
- Đường lùi: Revert commit sửa guard và mở lại phát hiện với bằng chứng tái hiện.

### D-341 · 2026-11-04T05:34:12+00:00 · Nhận 90 bài học stored XT-H-027…116 (chủ dự án yêu cầu 2026-11-04): mức và phạm vi?

- Phương án: (1) Một PR nội dung: bổ sung vào ID có sẵn giữ mức; ID mới mặc định SHOULD; đổi mức chỉ khi đề xuất có và module còn chỗ (WF-CI-016 SHOULD→MUST@L vì ci-cd-pipeline đủ 4 MUST@M; CMP-AI-017 MAY→SHOULD; mới MUST@L: SEC-SUPPLY-033, AI-AGENTIC-020); công cụ (ci-check agent-action, bước actionlint/zizmor trong templates/ci.yml, release-check provenance, baseline.json) tách task T-3669 · (2) Áp đúng mức đề xuất (WF-CI-016 MUST@M, nhiều MUST@L) và làm công cụ cùng PR
- Chọn: Một PR nội dung: bổ sung vào ID có sẵn giữ mức; ID mới mặc định SHOULD; đổi mức chỉ khi đề xuất có và module còn chỗ (WF-CI-016 SHOULD→MUST@L vì ci-cd-pipeline đủ 4 MUST@M; CMP-AI-017 MAY→SHOULD; mới MUST@L: SEC-SUPPLY-033, AI-AGENTIC-020); công cụ (ci-check agent-action, bước actionlint/zizmor trong templates/ci.yml, release-check provenance, baseline.json) tách task T-3669
- Lý do (tiêu chí chất lượng cuối): (1) MUST@M vượt trần 4 MUST/module (ADR-0004) và mục MUST cần Kiểm máy có thật — công cụ chưa có thì không nâng; (2) mỗi đổi mức một dòng CHANGELOG, đường lùi rõ; (3) nội dung và công cụ tách lát, PR nội dung dễ review; dữ kiện xác minh nguồn sống trước khi ghép (P2)
- Đường lùi: Hạ các mức đã nâng về mức cũ ở PR sau; ID mới đổi MAY + Ngừng dùng

### D-342 · 2026-11-04T08:39:09+00:00 · T-3671 lỗ 5 (AUD-SEC-457): cd tới thư mục không có nối bằng ; / xuống dòng / || — đích ghi sau đó giải thế nào?

- Phương án: (1) Xét cả hai nhánh: đường đã giải và thư mục không biết (D-106), lấy kết quả chặt hơn · (2) Chỉ coi thư mục là không biết (None) như spec ban đầu
- Chọn: Xét cả hai nhánh: đường đã giải và thư mục không biết (D-106), lấy kết quả chặt hơn
- Lý do (tiêu chí chất lượng cuối): (1) phương án 2 mở lỗ mới đo được: mkdir .autopilot; cd .autopilot; echo x > v (lúc kiểm chưa có thư mục, lúc chạy có) và đỏ 3 test cũ; xét cả hai nhánh giữ mọi chặn cũ và thêm chặn mới; cd X && … giữ nguyên
- Đường lùi: Gỡ _failed_cd_scan

### D-343 · 2026-11-04T08:39:10+00:00 · T-3671 lỗ 4 (AUD-SEC-456): git config --rename-section — chặn mọi rename hay chỉ khi đích ngoài danh sách section an toàn?

- Phương án: (1) Chặn khi nguồn là section bảo vệ (core/include/includeIf/alias/biến) hoặc đích có tên con hay ngoài danh sách an toàn (user, author, committer, color, push, pull, status, log, i18n, column, advice, rerere, gc, pack, tag, fetch) · (2) Chặn mọi --rename-section
- Chọn: Chặn khi nguồn là section bảo vệ (core/include/includeIf/alias/biến) hoặc đích có tên con hay ngoài danh sách an toàn (user, author, committer, color, push, pull, status, log, i18n, column, advice, rerere, gc, pack, tag, fetch)
- Lý do (tiêu chí chất lượng cuối): (1) đổi tên vào section bảo vệ (vd user→core) hay từ section bảo vệ đều bị chặn; (4) không chặn oan đổi tên section vô hại; danh sách chặt theo git-config(1), thêm section mới cần quyết định mới
- Đường lùi: Chặn mọi --rename-section

### D-344 · 2026-11-04T08:39:11+00:00 · Thay D-123 (AUD-CI-031, review PR 435): mẫu secret-scan dùng gitleaks-action hay CLI?

- Phương án: (1) CLI gitleaks 8.30.1 ghim SHA-256 kiểm trước khi giải nén, quyền contents: read, quét lịch sử + diff merge (#435 đã làm, chủ repo mở); dương tính giả ở commit merge tạm miễn bằng vân tay file:rule:line trong .gitleaksignore hay gitleaks:allow · (2) Quay lại gitleaks-action
- Chọn: CLI gitleaks 8.30.1 ghim SHA-256 kiểm trước khi giải nén, quyền contents: read, quét lịch sử + diff merge (#435 đã làm, chủ repo mở); dương tính giả ở commit merge tạm miễn bằng vân tay file:rule:line trong .gitleaksignore hay gitleaks:allow
- Lý do (tiêu chí chất lượng cuối): (1) action bỏ sót commit thứ 31+ (AUD-CI-030) và cần secret giấy phép cho org; CLI ghim checksum là chuỗi cung ứng chặt hơn; (3) giữ tên required check gitleaks; thay D-123 vì chủ repo đã tự làm lát CLI ở #435
- Đường lùi: Khôi phục gitleaks-action ghim SHA ở secret-scan.yml và mẫu

### D-345 · 2026-11-04T08:39:12+00:00 · Đính chính D-338 (AUD-SEC-451, review PR 435): D-338 ghi 'không thêm miễn trừ' nhưng #434/#435 thêm miễn .git của dự án (gốc, dấu / cuối, --separate-git-dir của chính dự án); 4 dạng còn bị chặn oan (GIT_DIR=.git/worktrees/w, GIT_DIR=$CLAUDE_PROJECT_DIR/.git, GIT_DIR=$(git rev-parse --git-dir), touch sub/.git) — sửa hay chấp nhận?

- Phương án: (1) Chấp nhận có hạn 2027-01-21: lý do chặn có câu viết lại (bỏ GIT_DIR khi chạy trong dự án, dùng git -C; tạo tệp rỗng bằng tên khác); miễn trừ đã thêm chỉ là .git của chính dự án, ghi đúng ở D này · (2) Thêm miễn cho từng dạng
- Chọn: Chấp nhận có hạn 2027-01-21: lý do chặn có câu viết lại (bỏ GIT_DIR khi chạy trong dự án, dùng git -C; tạo tệp rỗng bằng tên khác); miễn trừ đã thêm chỉ là .git của chính dự án, ghi đúng ở D này
- Lý do (tiêu chí chất lượng cuối): (1) giá trị dựng lúc chạy ($(…), biến) guard không giải chắc — miễn là nới (ADR-0067 chỉ chấp nhận, không miễn); worktree gitdir trỏ commondir có thể khác; (4) cả 4 dạng có cách viết tương đương không bị chặn
- Đường lùi: Thêm miễn cho .git/worktrees/<tên> có commondir trỏ .git dự án

### D-346 · 2026-11-04T11:44:42+00:00 · Đính chính D-342 (review PR 438, T-3672): cd hỏng xét theo thư mục 'không biết' chặn oan lệnh thường; cd - theo OLDPWD tự theo dõi bị lách (OLDPWD=X cd -, PWD=X) — mô hình thư mục chạy thế nào?

- Phương án: (1) Tập ứng viên: cd không chắc hiệu lực (; / xuống dòng / || không theo exit, sau !, đường có .. mà phần trước chưa có, đích bị xoá/dời trước đó, cdable_vars) → {thư mục trước} ∪ {đích}; cd trong ống/nền/nhóm ống không đổi thư mục lệnh sau; cd - và cd -- - luôn KHÔNG BIẾT (None, D-106); CDPATH giữ None; luật đích xét mọi ứng viên, chặt nhất thắng · (2) Giữ D-342 (None khi cd hỏng) và theo dõi OLDPWD
- Chọn: Tập ứng viên: cd không chắc hiệu lực (; / xuống dòng / || không theo exit, sau !, đường có .. mà phần trước chưa có, đích bị xoá/dời trước đó, cdable_vars) → {thư mục trước} ∪ {đích}; cd trong ống/nền/nhóm ống không đổi thư mục lệnh sau; cd - và cd -- - luôn KHÔNG BIẾT (None, D-106); CDPATH giữ None; luật đích xét mọi ứng viên, chặt nhất thắng
- Lý do (tiêu chí chất lượng cuối): (1) đóng cả lớp cd hỏng/ống/nền đã tái hiện bằng bash 5.2 thật (AUD-SEC-459/460) và hồi quy cd - (AUD-SEC-466); (4) gỡ 4 chặn oan đo được (AUD-SEC-463); một mô hình thay cho vá từng ca; thay D-342
- Đường lùi: Khôi phục _failed_cd_scan (D-342)

### D-347 · 2026-11-04T13:24:36+00:00 · Audit delta guard 2026-11-04 (sau 438): mô hình tập ứng viên theo từng bước (D-346) vẫn lọt 4 🔴 mới + 3 🔴 có từ trước (cd trong if/while/hàm/eval, cd -P, lastpipe, || exit/return, repo trần chỉ xét ứng viên đầu) — mô phỏng luồng điều khiển bash không hội tụ; chọn mô hình nào?

- Phương án: (1) Hợp mọi đích (bảo thủ): từ lệnh cd/pushd/popd/eval-chứa-cd ĐẦU TIÊN trở đi (trừ chuỗi chỉ gồm cd đích nguyên văn nối bằng && từ đầu lệnh, không khối điều khiển/hàm/ống), mọi lệnh sau xét trên HỢP {thư mục đầu} ∪ {mọi đích cd nguyên văn đã giải theo chữ và theo realpath}; có đích không biết (biến, cd -, .. lặp trong vòng, eval) → None (D-106); mọi phép xét đích ghi/repo trần/Git dir giả/pending xét đủ mọi ứng viên; bỏ miễn || exit|return; alias đặt cùng lệnh lưu trong ScanBudget cho shell lồng/eval · (2) Tiếp tục vá D-346 theo từng ca (lastpipe, exit, -P, khối điều khiển…)
- Chọn: Hợp mọi đích (bảo thủ): từ lệnh cd/pushd/popd/eval-chứa-cd ĐẦU TIÊN trở đi (trừ chuỗi chỉ gồm cd đích nguyên văn nối bằng && từ đầu lệnh, không khối điều khiển/hàm/ống), mọi lệnh sau xét trên HỢP {thư mục đầu} ∪ {mọi đích cd nguyên văn đã giải theo chữ và theo realpath}; có đích không biết (biến, cd -, .. lặp trong vòng, eval) → None (D-106); mọi phép xét đích ghi/repo trần/Git dir giả/pending xét đủ mọi ứng viên; bỏ miễn || exit|return; alias đặt cùng lệnh lưu trong ScanBudget cho shell lồng/eval
- Lý do (tiêu chí chất lượng cuối): (1) hợp mọi đích là xấp xỉ trên đúng (sound) cho mọi luồng điều khiển: bash chỉ có thể đứng ở thư mục đầu hoặc một đích đã cd tới — không cần mô phỏng if/while/hàm/ống/exit; (3) một luật thay cho vá 7 ca, test được; (4) giữ gỡ chặn oan AUD-SEC-463 vì ứng viên là thư mục biết, không phải None; đánh đổi: thêm chặn oan khi đích cd là thư mục canh — chấp nhận theo tiêu chí (1) > (4); thay D-346
- Đường lùi: Khôi phục _CwdWalk theo D-346

### D-348 · 2026-11-04T14:31:31+00:00 · T-3673 (AUD-SEC-475): tệp archive do tar -c/zip/ar/jar/cpio -o/pax -w/7z a/python -m zipfile -c tạo ra vào write_targets kéo theo luật ADR-0066 — tạo archive rồi nhắc lại ở lệnh khác cùng lệnh Bash bị BUDGET (tar -czf a.tgz src && tar -tzf a.tgz) — giữ hay miễn?

- Phương án: (1) Giữ chặt (A): như mọi tệp tự ghi theo ADR-0066; lý do chặn có câu viết lại (tách lệnh) · (2) Chỉ xét archive ở _write_asks (B) · (3) Giữ A + miễn khi lệnh sau chỉ đọc archive (C)
- Chọn: Giữ chặt (A): như mọi tệp tự ghi theo ADR-0066; lý do chặn có câu viết lại (tách lệnh)
- Lý do (tiêu chí chất lượng cuối): (1) archive vừa tạo có thể được chạy như script (tar -cf x p && sh x) — miễn theo kiểu lệnh đọc là bề mặt lách mới; (3) nhất quán ADR-0066, không thêm miễn trừ (ADR-0065); (4) chi phí: agent tách lệnh, đo trên lệnh/CI repo này không dùng dạng đó
- Đường lùi: Phương án C với test cho từng lệnh chỉ đọc

### D-351 · 2026-11-04T18:39:44+00:00 · Review #439 🔴 AUD-SEC-490: cd tương đối trong thân vòng lặp/hàm chỉ giải từ tập lúc gặp, không giải lại từ đích cd đứng sau (cuối thân vòng, nơi gọi hàm) — D-347 khai 'đúng cho mọi luồng điều khiển' là sai; sửa thế nào?

- Phương án: (1) Đích cd tương đối (kể cả ..) trong thân vòng lặp/hàm/trap → thêm None (thư mục không biết, D-106); đích tuyệt đối giữ như cũ · (2) Lặp điểm bất động trên mọi lệnh cd của thân vòng/hàm cho tới khi tập ổn định, quá CWD_UNION_MAX thì None
- Chọn: Đích cd tương đối (kể cả ..) trong thân vòng lặp/hàm/trap → thêm None (thư mục không biết, D-106); đích tuyệt đối giữ như cũ
- Lý do (tiêu chí chất lượng cuối): (1) cả hai đều sound; (3) phương án 1 là một luật, không cần mô phỏng thêm, test được, khép cả nơi gọi hàm lẫn trap; (4) chặn oan thêm chỉ khi cd tương đối nguyên văn trong vòng/hàm rồi ghi đích nhạy cảm/chạy git — dạng hiếm (corpus review 10 815 lệnh không đổi quyết định nào ở head); (1) > (4). Đính chính D-347: câu 'đúng cho mọi luồng điều khiển' chỉ đúng khi đích cd trong vòng/hàm là tuyệt đối.
- Đường lùi: Lặp điểm bất động (phương án 2) nếu đo thấy chặn oan trên lệnh thật

### D-356 · 2026-11-04T22:53:05+00:00 · T-3551: chốt ADR-0071 perf trial — 14 điểm hở của bản nháp (ID FLOW, nơi đo candidate, nguồn cấu hình, kiểm trỏ đúng cây, start khi HEAD lệch cây giữ, held-out, falsifier, PERF-LOG, --resume, neo công cụ chấm, sửa file khoá, khoá điểm nóng, đo xen kẽ)

- Phương án: (1) Nhận cả 14 đề xuất của bản nháp: FLOW giữ nghĩa nghiên cứu §10 cho 20…23, ca mới FLOW-27…34; candidate đo ở worktree dựng lại; cấu hình JSON đọc từ commit gốc; kiểm trỏ đúng cây bằng probe + quét .pth/symlink; từ chối start khi HEAD^{tree} ≠ kept_tree; held-out hạt giống lúc finish, phải improved; falsifier trúng → thu hồi; PERF-LOG miễn khi chỉ nối thêm; --resume R1 rơi về R2; công cụ chấm neo cả exec blob gốc lẫn Gate <(git show); sửa file khoá → thu hồi + tính lượt; khoá điểm nóng theo đường file + kiểm diff; luôn đo xen kẽ · (2) Giữ phương án B cho ID FLOW (đổi nghĩa FLOW-20…23 theo PLAN) và đo candidate tại chỗ cho rẻ hơn
- Chọn: Nhận cả 14 đề xuất của bản nháp: FLOW giữ nghĩa nghiên cứu §10 cho 20…23, ca mới FLOW-27…34; candidate đo ở worktree dựng lại; cấu hình JSON đọc từ commit gốc; kiểm trỏ đúng cây bằng probe + quét .pth/symlink; từ chối start khi HEAD^{tree} ≠ kept_tree; held-out hạt giống lúc finish, phải improved; falsifier trúng → thu hồi; PERF-LOG miễn khi chỉ nối thêm; --resume R1 rơi về R2; công cụ chấm neo cả exec blob gốc lẫn Gate <(git show); sửa file khoá → thu hồi + tính lượt; khoá điểm nóng theo đường file + kiểm diff; luôn đo xen kẽ
- Lý do (tiêu chí chất lượng cuối): (1) spike đo được: đo theo khối 18 % improved sai trong A/A, đo tại chỗ bị .pth bị ignore lừa — các phương án chặt hơn chặn cả hai; (3) ID ổn định theo conventions (không đổi nghĩa ID đã dùng); (2) mỗi task một PR, perf trial là lệnh mới, Gate mẫu cũ giữ nguyên làm đường lùi; chi phí +0,8 s/cây chỉ phá hoà (5)
- Đường lùi: Gỡ skill /optimize khỏi perf trial, quay về Gate mẫu perf-gate.sh; finish --no-apply là lối tạm

### D-357 · 2026-11-04T22:54:48+00:00 · T-3680…T-3687 (perf trial, ADR-0071): mỗi task một PR (8 PR) hay gộp?

- Phương án: (1) 4 PR, mỗi PR hai task liền kề (3680+3681, 3682+3683, 3684+3685, 3686+3687), mỗi task một commit, nhánh xếp chồng, gộp origin/main sau mỗi merge (không force-push) · (2) 8 PR, mỗi task một PR như PLAN
- Chọn: 4 PR, mỗi PR hai task liền kề (3680+3681, 3682+3683, 3684+3685, 3686+3687), mỗi task một commit, nhánh xếp chồng, gộp origin/main sau mỗi merge (không force-push)
- Lý do (tiêu chí chất lượng cuối): (3) mỗi PR ~300–400 dòng vẫn review trọn được (review #439 ~1100 dòng chạm trần lượt); tiền lệ D-244 gộp T-3548…T-3550; (2) mỗi task một commit nên revert từng task được; (5) giảm nửa số vòng CI + review
- Đường lùi: Tách lại theo task nếu reviewer báo PR quá lớn (INCONCLUSIVE)

### D-360 · 2026-11-04T23:33:14+00:00 · Review #440 (ADR-0071) 4 🔴: (1) agent tự chọn baseline qua --base/vòng mới; (2) start bỏ qua kiểm cây, held-out chỉ so start_head; (3) PERF-LOG miễn ở start nhưng nằm trong candidate_files/vân tay → kẹt sau 2 lần thu hồi; (4) điểm nóng mồi reset bộ đếm ba lần. Kèm đính chính D-357 (repo squash-merge nên không revert được theo task).

- Phương án: (1) Sửa chặt: (1) base = merge-base(HEAD, nhánh mặc định được bảo vệ) do máy tính, bỏ --base, vòng mới chỉ khi merge-base đổi; (2) bỏ 'hoặc bỏ qua', finish kiểm file khoá không đổi base..start_head và held-out so cả với base; (3) PERF-LOG dựng từ perf-trials.jsonl bằng 'perf trial log', start/finish không ghi cây, bỏ miễn; (4) điểm nóng là danh sách đường chuẩn hoá (bỏ ::SYM), file candidate ngoài điểm nóng → thu hồi off-hotspot, start exit 3 nếu bất kỳ đường nào đã cạn · (2) Giữ --base nhưng ghim lúc loop init của PLAN-opt; PERF-LOG loại nhất quán khỏi candidate_files/vân tay/kept_tree; đếm ba lần theo hợp các điểm nóng
- Chọn: Sửa chặt: (1) base = merge-base(HEAD, nhánh mặc định được bảo vệ) do máy tính, bỏ --base, vòng mới chỉ khi merge-base đổi; (2) bỏ 'hoặc bỏ qua', finish kiểm file khoá không đổi base..start_head và held-out so cả với base; (3) PERF-LOG dựng từ perf-trials.jsonl bằng 'perf trial log', start/finish không ghi cây, bỏ miễn; (4) điểm nóng là danh sách đường chuẩn hoá (bỏ ::SYM), file candidate ngoài điểm nóng → thu hồi off-hotspot, start exit 3 nếu bất kỳ đường nào đã cạn
- Lý do (tiêu chí chất lượng cuối): (1) phương án 1 đóng cả bốn đường lách bằng dữ kiện agent không sửa được (nhánh bảo vệ cần review để đổi; sổ jsonl do máy ghi) — phương án 2 còn phụ thuộc state agent đọc/ghi được và loại trừ đặc biệt dễ sót; (3) ít luật hơn, test được. D-357 đính chính: mỗi task một commit chỉ giúp đọc/bisect trên nhánh, squash-merge làm revert theo PR; lý do giữ gộp 4 PR là (3)/(5) cỡ review và số vòng CI
- Đường lùi: Giữ --base với ghim lúc loop init (phương án 2) nếu dự án đích không có nhánh mặc định được bảo vệ

### D-361 · 2026-11-05T00:00:58+00:00 · ADR-0071 sau review #440: sáu chi tiết ngoài D-360 — lệnh prepare, mã thoát 4, Gate status --check, cây đo bằng clone --shared, khoá cả pyproject.toml/package.json, nhánh mặc định lấy từ origin/HEAD

- Phương án: (1) Nhận năm chi tiết như bản sửa (prepare riêng; exit 4; Gate perf trial status --check theo target; clone --shared để mã candidate không thấy cây gốc qua git worktree list — T-3702 đo, chậm/hỏng thì về worktree add và ghi giới hạn; khoá cả file pyproject.toml/package.json); riêng nhánh mặc định: lấy từ máy chủ (git ls-remote --symref origin HEAD) khi có mạng, ngoại tuyến mới dùng refs/remotes/origin/HEAD và guard phải chặn git remote set-head/ghi refs/remotes (T-3701 thêm test guard) · (2) Nhận nguyên sáu đề xuất, origin/HEAD cục bộ là nguồn nhánh mặc định
- Chọn: Nhận năm chi tiết như bản sửa (prepare riêng; exit 4; Gate perf trial status --check theo target; clone --shared để mã candidate không thấy cây gốc qua git worktree list — T-3702 đo, chậm/hỏng thì về worktree add và ghi giới hạn; khoá cả file pyproject.toml/package.json); riêng nhánh mặc định: lấy từ máy chủ (git ls-remote --symref origin HEAD) khi có mạng, ngoại tuyến mới dùng refs/remotes/origin/HEAD và guard phải chặn git remote set-head/ghi refs/remotes (T-3701 thêm test guard)
- Lý do (tiêu chí chất lượng cuối): (1) origin/HEAD cục bộ do agent đổi được bằng git remote set-head → chọn lại baseline, đúng lỗ 🔴1 mà D-360 đóng; nguồn máy chủ không đổi được nếu không có quyền admin repo; (1) khoá cả file chặt hơn khoá mục; (3) prepare/exit 4/status --check tách hành vi để mỗi task có Gate riêng, test được
- Đường lùi: Dùng origin/HEAD cục bộ (phương án 2) nếu dự án đích thường chạy ngoại tuyến và guard đã chặn set-head

### D-362 · 2026-11-05T00:17:42+00:00 · Review #441 (trả nợ #439) lại BLOCKING: 1 🔴 do diff (AUD-SEC-496 dò Git dir dừng ở thư mục con khi guard thừa hưởng GIT_OBJECT_DIRECTORY mà lệnh gỡ biến), 2 🟠 (AUD-SEC-493 heredoc/here-string có chuyển hướng thành UNSEEN; quyết định phụ thuộc kiểu stdin /dev/./stdin), 5 🟢, 4 có từ trước (🔴 /dev/./stdin không chuẩn hoá trong STDIN_SCRIPTS; 🟠 env -S; 🟠 . ./script có sẵn chứa cd; 🟢 giới hạn D-106 cd "$X"; ..) — vòng review guard không hội tụ, làm sao cắt 3.30.0?

- Phương án: (1) Sửa trong #441: hai 🔴 (dò cả hai nhánh có/không objdir, chặn nếu nhánh nào gặp khoá nguy hiểm; chuẩn hoá đường /dev, /proc trong STDIN_SCRIPTS và đường nguồn), hai 🟠 (heredoc có nháy/here-string giải như eval kể cả khi có chuyển hướng thêm; mọi đường dưới /dev hay /proc là UNSEEN sau chuẩn hoá), 🟢 chặn oan tar/unzip (repo chờ '' chỉ khi có repo trần chờ thật), gỡ FD_SCRIPT_RE trùng (giữ một định nghĩa + test), sửa chữ sổ/CHANGELOG; chấp nhận có hạn 2027-01-21 (ADR-0067): 🟢 mở rộng tên khớp với tập phủ định cpio (chưa thấy lỗ), 🟢 AUD-PERF-019 cách giảm khác, 🟠 env -S, 🟠 source script có sẵn chứa cd (guard không quét nội dung script — giới hạn đã ghi ở PROGRESS), 🟢 D-106 cd "$X" + .. · (2) Sửa hết mọi mục kể cả có từ trước rồi review lại
- Chọn: Sửa trong #441: hai 🔴 (dò cả hai nhánh có/không objdir, chặn nếu nhánh nào gặp khoá nguy hiểm; chuẩn hoá đường /dev, /proc trong STDIN_SCRIPTS và đường nguồn), hai 🟠 (heredoc có nháy/here-string giải như eval kể cả khi có chuyển hướng thêm; mọi đường dưới /dev hay /proc là UNSEEN sau chuẩn hoá), 🟢 chặn oan tar/unzip (repo chờ '' chỉ khi có repo trần chờ thật), gỡ FD_SCRIPT_RE trùng (giữ một định nghĩa + test), sửa chữ sổ/CHANGELOG; chấp nhận có hạn 2027-01-21 (ADR-0067): 🟢 mở rộng tên khớp với tập phủ định cpio (chưa thấy lỗ), 🟢 AUD-PERF-019 cách giảm khác, 🟠 env -S, 🟠 source script có sẵn chứa cd (guard không quét nội dung script — giới hạn đã ghi ở PROGRESS), 🟢 D-106 cd "$X" + ..
- Lý do (tiêu chí chất lượng cuối): (1) sửa mọi 🔴 và 🟠 thuộc diff, cùng 🔴 có từ trước rẻ (chuẩn hoá đường); phần còn lại là giới hạn phân tích tĩnh đã được ADR-0067 chấp nhận có hạn — hàng rào lớp hai (sandbox) xét trước 2027-01-21; (2) mỗi mục chấp nhận có dòng sổ + hạn, không ẩn; (5) phương án 2 không hội tụ (D-347: bốn lượt review liên tiếp đều lộ lỗ mới), chặn phát hành 3.30.0 vô hạn
- Đường lùi: Mở lại dòng chấp nhận thành mở và sửa trong PR guard kế tiếp

### D-363 · 2026-11-05T00:42:29+00:00 · T-3700/T-3701: ca FLOW perf trial gọi xt.py nào — bản sao .xtemplates/scripts/xt.py trong repo đồ chơi (giống dự án đích, mất coverage) hay ROOT/scripts/xt.py (coverage tính được)? Kèm: tên trường sổ jsonl và schema chưa chốt

- Phương án: (1) Gọi ROOT/scripts/xt.py; luật ADR §5 'exec công cụ chấm từ blob gốc' chỉ exec khi byte của file đang chạy KHÁC blob ở base (bằng nhau thì chạy tiếp, không exec) — không có cờ/biến môi trường riêng cho test; T-3701 chốt tên trường perf-trials.jsonl (event, reason), schema 1, setup là chuỗi shell và ghi vào ADR §3; vế held-out so cả gốc của AUD-HAR-231 thêm test đơn vị ở T-3705 · (2) Gọi bản sao trong repo đồ chơi; test_perf_trial phủ 100 % trong tiến trình bằng cách tắt exec qua biến môi trường
- Chọn: Gọi ROOT/scripts/xt.py; luật ADR §5 'exec công cụ chấm từ blob gốc' chỉ exec khi byte của file đang chạy KHÁC blob ở base (bằng nhau thì chạy tiếp, không exec) — không có cờ/biến môi trường riêng cho test; T-3701 chốt tên trường perf-trials.jsonl (event, reason), schema 1, setup là chuỗi shell và ghi vào ADR §3; vế held-out so cả gốc của AUD-HAR-231 thêm test đơn vị ở T-3705
- Lý do (tiêu chí chất lượng cuối): (1) không thêm cửa sau tắt exec (biến môi trường tắt bộ chấm là bề mặt lách); so byte với blob gốc là điều kiện đúng nghĩa: cùng byte thì chính là công cụ gốc; (3) coverage 100 % giữ được qua coverage subprocess sẵn có; (3) tên trường chốt một nơi (ADR §3)
- Đường lùi: Gọi bản sao (phương án 2) nếu so byte gây sai khi dự án đích sửa dòng cuối file (CRLF)

### D-364 · 2026-11-05T01:20:18+00:00 · Sửa #441 lộ thêm hai lỗ có từ trước: (1) ghi qua thư mục mở trên fd — printf x > /dev/fd/3/guard.py 3< .claude/hooks (guard bỏ qua đích dưới /dev/); (2) bash ./link <<'EOF' với link → /dev/stdin (_stdin_shell không lần symlink theo thư mục chạy)

- Phương án: (1) (1) sửa ngay: đích có tiền tố /dev/fd/N/…, /dev/std*/…, /proc/*/fd/N/… coi là thư mục không biết (D-106), áp _where lên phần đuôi (AUD-SEC-521); (2) chấp nhận có hạn 2027-01-21 theo ADR-0067, cùng lớp AUD-SEC-519 (AUD-SEC-522) · (2) Chặn thẳng mọi đích ghi đi qua fd và sửa cả (2) bằng truyền thư mục ứng viên vào _stdin_shell
- Chọn: (1) sửa ngay: đích có tiền tố /dev/fd/N/…, /dev/std*/…, /proc/*/fd/N/… coi là thư mục không biết (D-106), áp _where lên phần đuôi (AUD-SEC-521); (2) chấp nhận có hạn 2027-01-21 theo ADR-0067, cùng lớp AUD-SEC-519 (AUD-SEC-522)
- Lý do (tiêu chí chất lượng cuối): (1) lỗ (1) ghi được hook nên sửa; cách (a) chặt mà gần như không chặn oan (4) — chặn thẳng thô hơn; (2) cần sửa nhiều chỗ gọi, cùng lớp giới hạn đã chấp nhận ở D-362 — (5) không chặn 3.30.0
- Đường lùi: Chặn thẳng mọi đích ghi qua fd nếu (a) lọt biến thể

### D-365 · 2026-11-05T01:46:16+00:00 · T-3701/T-3702 perf trial: duyệt sáu quyết định nhỏ của người viết và chọn thời điểm gỡ ID FLOW khỏi XFAIL

- Phương án: (1) Nhận cả sáu (done= cho ca đã xanh; log đòi HEAD^{tree} = cây giữ/log gần nhất; điểm nóng nhận file có ở HEAD do lần giữ trước thêm; khoá mặc định **/ và từ chối khoá lạ; đếm ba lần qua mọi vòng, base từ SHA máy chủ; setup qua /bin/sh -c) — thư mục tạm của exec blob gốc phải dọn ở T-3703; gỡ ID khỏi XFAIL ở T-3707 cùng lúc sửa Gate T-3700 · (2) Giữ cơ chế done= vĩnh viễn
- Chọn: Nhận cả sáu (done= cho ca đã xanh; log đòi HEAD^{tree} = cây giữ/log gần nhất; điểm nóng nhận file có ở HEAD do lần giữ trước thêm; khoá mặc định **/ và từ chối khoá lạ; đếm ba lần qua mọi vòng, base từ SHA máy chủ; setup qua /bin/sh -c) — thư mục tạm của exec blob gốc phải dọn ở T-3703; gỡ ID khỏi XFAIL ở T-3707 cùng lúc sửa Gate T-3700
- Lý do (tiêu chí chất lượng cuối): (1) năm điểm chặt hơn hoặc trung tính; điểm nóng do lần giữ thêm đã qua máy kiểm; (3) XFAIL không còn ca là rác — gỡ ở task cuối giữ Gate T-3700 đúng nghĩa; (2) rò thư mục tạm có task chủ
- Đường lùi: Giữ done= nếu sửa Gate T-3700 làm loop verify lịch sử đỏ

### D-366 · 2026-11-05T02:10:21+00:00 · Review #442 🔴: 'máy chủ' của D-361 là URL origin cục bộ — agent đổi set-url/config remote.*.url/insteadOf/GIT_CONFIG_*/packed-refs/.git/refs/remotes để tự chọn gốc vòng; 🟠 hạ cấp gốc bằng nhánh từ tổ tiên cũ; 🟠 diff.ignoreSubmodules lách luật HEAD^{tree}; 🟠 HOME từ env (usercustomize); 🟠 os.walk nuốt lỗi quyền; 5 🟢

- Phương án: (1) Hai lớp: (guard) deny mọi đổi URL/pushurl/refspec/insteadOf của remote kể cả -c và GIT_CONFIG_* đi kèm xt.py, và mọi ghi thẳng .git/packed-refs, .git/refs/remotes/** (Bash lẫn Edit/Write); (xt.py) perf trial lọc env git theo allowlist, bỏ cấu hình git toàn cục/hệ thống khi gọi ls-remote (GIT_CONFIG_NOSYSTEM, GIT_CONFIG_GLOBAL=/dev/null), từ chối khi có insteadOf áp lên URL origin, ghi URL origin vào sổ ở start đầu và từ chối khi đổi. Gốc = ĐẦU nhánh mặc định do máy chủ báo (start đòi HEAD chứa đầu nhánh, không còn merge-base tuỳ tổ tiên) — chặn hạ cấp. So HEAD^{tree} bằng SHA rev-parse, mọi diff thêm --ignore-submodules=none --no-ext-diff --no-textconv. HOME = pwd.getpwuid, PYTHONNOUSERSITE=1. os.walk onerror → exit 2; dọn chmod. Sửa cả 5 🟢 (exec giữ gốc dự án qua CLAUDE_PROJECT_DIR; đọc __file__ /dev/fd → không exec sai; mỗi cây một mkdtemp + remote remove origin trong clone; cây đo phải ngoài cây agent; escape mốc PERF-LOG) và khoá mặc định thêm setup.py, requirements*.txt. ADR §1/§4 ghi giới hạn còn lại: cùng uid sửa trực tiếp file trong .git ngoài guard (lớp hai: sandbox, ADR-0067) · (2) Chỉ ghi giới hạn vào ADR, giữ mã
- Chọn: Hai lớp: (guard) deny mọi đổi URL/pushurl/refspec/insteadOf của remote kể cả -c và GIT_CONFIG_* đi kèm xt.py, và mọi ghi thẳng .git/packed-refs, .git/refs/remotes/** (Bash lẫn Edit/Write); (xt.py) perf trial lọc env git theo allowlist, bỏ cấu hình git toàn cục/hệ thống khi gọi ls-remote (GIT_CONFIG_NOSYSTEM, GIT_CONFIG_GLOBAL=/dev/null), từ chối khi có insteadOf áp lên URL origin, ghi URL origin vào sổ ở start đầu và từ chối khi đổi. Gốc = ĐẦU nhánh mặc định do máy chủ báo (start đòi HEAD chứa đầu nhánh, không còn merge-base tuỳ tổ tiên) — chặn hạ cấp. So HEAD^{tree} bằng SHA rev-parse, mọi diff thêm --ignore-submodules=none --no-ext-diff --no-textconv. HOME = pwd.getpwuid, PYTHONNOUSERSITE=1. os.walk onerror → exit 2; dọn chmod. Sửa cả 5 🟢 (exec giữ gốc dự án qua CLAUDE_PROJECT_DIR; đọc __file__ /dev/fd → không exec sai; mỗi cây một mkdtemp + remote remove origin trong clone; cây đo phải ngoài cây agent; escape mốc PERF-LOG) và khoá mặc định thêm setup.py, requirements*.txt. ADR §1/§4 ghi giới hạn còn lại: cùng uid sửa trực tiếp file trong .git ngoài guard (lớp hai: sandbox, ADR-0067)
- Lý do (tiêu chí chất lượng cuối): (1) phương án 1 đóng mọi đường đã tái hiện bằng hai lớp độc lập; đòi HEAD chứa đầu nhánh chặt hơn merge-base và bỏ lựa chọn tổ tiên của agent; phần còn lại là giới hạn cùng uid đã được ADR-0067 chấp nhận — ghi rõ, sửa tiền đề D-361; (3) mỗi điểm có test tái hiện
- Đường lùi: Trở về merge-base nếu đòi HEAD chứa đầu nhánh làm vòng tối ưu phải gộp main quá thường

### D-367 · 2026-11-05T04:10:16+00:00 · Chủ repo 2026-11-05: tận dụng tối đa nhân CPU khi chạy test, áp cho cả dự án đích — dev-task tự dò hiện chạy pytest/unittest một tiến trình

- Phương án: (1) dev-task tự dò: pytest → 'pytest -q -n auto' khi import được xdist (không thì 'pytest -q' kèm gợi ý cài pytest-xdist), unittest → mỗi module test một tiến trình qua xargs -P; số tiến trình = XT_JOBS nếu đặt, mặc định nproc; Go/Rust/Node giữ (đã song song mặc định); thêm mục SHOULD ở quality-gates.md (test chạy song song theo số nhân + test độc lập thứ tự) và CHANGELOG 'Dự án đích'; dự án đích đã khai lệnh test trong xt.yaml: không đè, PR nâng bản đề xuất cờ song song phù hợp · (2) Chỉ ghi hướng dẫn trong tài liệu, không đổi dev-task
- Chọn: dev-task tự dò: pytest → 'pytest -q -n auto' khi import được xdist (không thì 'pytest -q' kèm gợi ý cài pytest-xdist), unittest → mỗi module test một tiến trình qua xargs -P; số tiến trình = XT_JOBS nếu đặt, mặc định nproc; Go/Rust/Node giữ (đã song song mặc định); thêm mục SHOULD ở quality-gates.md (test chạy song song theo số nhân + test độc lập thứ tự) và CHANGELOG 'Dự án đích'; dự án đích đã khai lệnh test trong xt.yaml: không đè, PR nâng bản đề xuất cờ song song phù hợp
- Lý do (tiêu chí chất lượng cuối): (4) dự án dùng lệnh tự dò được lợi ngay; (2) chỉ đổi lệnh tự dò, lệnh khai báo trong xt.yaml giữ nguyên, XT_JOBS=1 trả về tuần tự; (1) test phụ thuộc thứ tự lộ ra là lỗi thật (frontend-testing.md đã nêu) — mục SHOULD đòi test độc lập
- Đường lùi: XT_JOBS=1 hoặc khai lệnh test tường minh trong xt.yaml

### D-368 · 2026-11-05T05:06:07+00:00 · Review #443 (perf trial finish): 🔴 status --check không ràng HEAD (commit lạ sau lần giữ vẫn exit 0); 🟠 candidate_files thành pathspec glob cuốn sổ .autopilot vào stash; 🟠 cache đĩa (HOME/XDG/TMPDIR một lần mỗi cây, kênh scratch) tính thành tăng tốc; 🟠 candidate tự mang interpreter (.venv/bin, node_modules/.bin đầu PATH không khoá); 6 🟢

- Phương án: (1) Sửa hết trong #443: check đòi cây sạch ngoài .autopilot và HEAD^{tree} == cây neo (sai → exit 1 'commit lạ sau lần giữ'); mọi pathspec qua --pathspec-from-file=- --pathspec-file-nul + GIT_LITERAL_PATHSPECS=1 (sửa luôn Argument list too long); HOME/XDG_*/TMPDIR tạo mới MỖI mẫu, file khớp scratch xoá giữa các mẫu wall; khoá mặc định thêm **/.venv/**, **/node_modules/**, .gitignore và thu hồi khi file candidate nằm dưới thư mục PATH của cây; 🟢: PERF_SUSPECT_RE thêm atexit/sys.stdout/builtins (so toàn stdout với gốc để T-3705), SIGTERM dọn cây + giết nhóm tiến trình + pha về started, README mô tả finish/status --check và sửa 'merge-base' theo D-366, test thứ tự xen kẽ, thông báo --no-apply trỏ T-3706 · (2) Chỉ sửa 🔴, ghi nợ 🟠/🟢
- Chọn: Sửa hết trong #443: check đòi cây sạch ngoài .autopilot và HEAD^{tree} == cây neo (sai → exit 1 'commit lạ sau lần giữ'); mọi pathspec qua --pathspec-from-file=- --pathspec-file-nul + GIT_LITERAL_PATHSPECS=1 (sửa luôn Argument list too long); HOME/XDG_*/TMPDIR tạo mới MỖI mẫu, file khớp scratch xoá giữa các mẫu wall; khoá mặc định thêm **/.venv/**, **/node_modules/**, .gitignore và thu hồi khi file candidate nằm dưới thư mục PATH của cây; 🟢: PERF_SUSPECT_RE thêm atexit/sys.stdout/builtins (so toàn stdout với gốc để T-3705), SIGTERM dọn cây + giết nhóm tiến trình + pha về started, README mô tả finish/status --check và sửa 'merge-base' theo D-366, test thứ tự xen kẽ, thông báo --no-apply trỏ T-3706
- Lý do (tiêu chí chất lượng cuối): (1) ba 🟠 là đường giữ oan/hỏng sổ đã tái hiện — lệnh này sắp thành Gate thật ở T-3707 cùng bản 3.30.0, nợ sẽ chặn release-check anyway; (3) mỗi điểm có ca tái hiện chuyển thành test; (5) sửa một lần rẻ hơn ghi nợ rồi PR riêng
- Đường lùi: Tách 🟢 sang PR sau nếu PR quá lớn để review

### D-369 · 2026-11-05T05:08:03+00:00 · Review #444 (T-3708): bộ chia unittest theo module tự viết gây xanh giả (lớp định nghĩa ở module khác bị bỏ), đỏ giả (setUpClass/setUpModule skip → zero_tests_red exit 5; load_tests/doctest, FunctionTestCase, stdout lúc import lẫn vào danh sách); pytest -n ép cả khi cấu hình tắt xdist; BASE-GATE-020 chép QA-STRAT-007; CI đỏ BASE-CFG-003 (XT_JOBS thiếu README)

- Phương án: (1) Unittest trở về discover tuần tự như cũ (bỏ bộ chia); chỉ pytest + xdist song song: python3 -m pytest -q -n <JOBS>, dò bằng importlib.util.find_spec('xdist'), bỏ -n khi PYTEST_DISABLE_PLUGIN_AUTOLOAD đặt hoặc cấu hình pytest (pytest.ini/pyproject/setup.cfg/tox.ini) có 'no:xdist'; XT_JOBS có trần 4×nproc; README thêm XT_JOBS; BASE-GATE-020 chỉ giữ ý song song, trỏ QA-STRAT-007 cho độc lập thứ tự, sửa '→ Kiểm'; CHANGELOG ghi cwd vào sys.path; sửa hàm phụ tests_dir bị gom thành test · (2) Sửa bộ chia unittest (TestLoader ghi module, gom output, dò không-test toàn cục)
- Chọn: Unittest trở về discover tuần tự như cũ (bỏ bộ chia); chỉ pytest + xdist song song: python3 -m pytest -q -n <JOBS>, dò bằng importlib.util.find_spec('xdist'), bỏ -n khi PYTEST_DISABLE_PLUGIN_AUTOLOAD đặt hoặc cấu hình pytest (pytest.ini/pyproject/setup.cfg/tox.ini) có 'no:xdist'; XT_JOBS có trần 4×nproc; README thêm XT_JOBS; BASE-GATE-020 chỉ giữ ý song song, trỏ QA-STRAT-007 cho độc lập thứ tự, sửa '→ Kiểm'; CHANGELOG ghi cwd vào sys.path; sửa hàm phụ tests_dir bị gom thành test
- Lý do (tiêu chí chất lượng cuối): (1) bộ chia tự viết sai ở 7 dạng hợp lệ của unittest — xanh giả là lỗi nặng nhất của một cổng; discover tuần tự đúng sẵn; (3) pytest-xdist là công cụ chuẩn, đã kiểm; (4) dự án Python muốn song song dùng pytest-xdist (BASE-GATE-020 nói cách); (5) tốc độ chỉ phá hoà
- Đường lùi: Mở task riêng cho bộ chia unittest có TestLoader ghi module nếu dự án đích unittest-thuần cần tốc độ

### D-370 · 2026-11-05T07:03:50+00:00 · Review #445 (perf trial T-3705…T-3707): 🔴 Gate mẫu <(git cat-file …) xanh khi không đọc được công cụ (pipefail không áp cho process substitution); 🔴 SIGTERM sau đóng băng đưa pha về started không tốn lượt → rút lại hạt giống held-out vô hạn; 🟠 held-out chỉ đòi improved còn target chỉ xét chỉ số chính; 🟠 chưa so đầu ra chỉ số chính với gốc (atexit print); 🟠 chết giữa dòng decide và state decided → --resume ghi decide trùng; 🟠 --no-apply kept rồi abort làm vòng kẹt

- Phương án: (1) Sửa hết trong #445: Gate mẫu fail-closed '<(git cat-file blob refs/remotes/origin/HEAD:… || echo raise SystemExit\(2\))' + test qua run_gate_shell khi thiếu origin/HEAD và sai đường; ngắt sau đóng băng tiêu lần đo lại duy nhất (chung bộ đếm resumes), ngắt/chết lần hai → incomplete, sửa ADR §9; target đòi cả held-out gộp đạt; chỉ số chính gom đầu ra và so với gốc như held-out (khác → inequivalent); finish/--resume kiểm dòng decide đã có trước khi ghi; abort sau --no-apply kept ghi dòng aborted và thu hồi nhất quán (không kẹt); 🟢 lý do kept không nhắc held-out khi không khai, lệnh stash in ra theo pathspec nghĩa đen · (2) Chỉ sửa hai 🔴, ghi nợ 🟠
- Chọn: Sửa hết trong #445: Gate mẫu fail-closed '<(git cat-file blob refs/remotes/origin/HEAD:… || echo raise SystemExit\(2\))' + test qua run_gate_shell khi thiếu origin/HEAD và sai đường; ngắt sau đóng băng tiêu lần đo lại duy nhất (chung bộ đếm resumes), ngắt/chết lần hai → incomplete, sửa ADR §9; target đòi cả held-out gộp đạt; chỉ số chính gom đầu ra và so với gốc như held-out (khác → inequivalent); finish/--resume kiểm dòng decide đã có trước khi ghi; abort sau --no-apply kept ghi dòng aborted và thu hồi nhất quán (không kẹt); 🟢 lý do kept không nhắc held-out khi không khai, lệnh stash in ra theo pathspec nghĩa đen
- Lý do (tiêu chí chất lượng cuối): (1) bốn 🟠 là đường giữ oan/kẹt đã tái hiện trên chính Gate sắp phát hành ở 3.30.0 — nợ sẽ chặn release-check; (3) mỗi điểm có kịch bản tái hiện chuyển thành test; ADR §9 đã hứa 'đo lại tới khi may không làm được quá một lần'
- Đường lùi: Tách 🟠 sang PR sau nếu PR quá lớn để review

### D-371 · 2026-11-05T08:07:48+00:00 · Audit delta T-3557 (#435–#445): 5 🟠 — F1 vòng /optimize không tới done (commit sổ sách làm status --check đỏ, merge mở vòng mới), F2 start từ chối khi PLAN-opt/D-NNN commit trên nhánh, F3 module giả (unittest.py/pytest.py) ở gốc lừa equiv, F4 Gate dự phòng perf-gate.sh bị guard chặn (đường lùi khai ở ADR-0071/D-356/CHANGELOG không dùng được), F5 trial_verdict không có test bắt đảo luật giữ; ~20 🟢

- Phương án: (1) Sửa hết 🟠 + 🟢 rẻ trong hai PR song song trước khi cắt 3.30.0: (A, xt.py perf trial) so cây neo ở start/log/status --check bỏ qua đường sổ sách docs/autopilot/**, PROGRESS.md, đường PERF-LOG (cấu hình không được trỏ lệnh đo/khoá vào các đường này — kiểm ở start), check nhận lần giữ của vòng trước khi cây neo == HEAD^{tree} trừ sổ sách; file mới của candidate trùng tên mô-đun nhập được ở cây gốc (unittest, pytest, …) → tampered, khoá mặc định thêm cấu hình runner (.pytest.ini, jest/vitest config, .mocharc*); test đơn vị trial_verdict + GIT_CONFIG cô lập; 🟢 interrupt ghim candidate_fp, log dùng trial_live, ⚠ khi ls-remote rơi về ref cục bộ, tree_fingerprint --ignore-submodules=none; đường lùi = gỡ skill khỏi perf trial, dùng perf compare/guard tay (bỏ lời hứa perf-gate.sh qua loop); đồng bộ ADR/README/skill/optimization-loop/CHANGELOG. (B, phần còn lại) harness-files.md theo #442, DEPENDENCIES.md thêm Gitleaks CLI, GlobCommandNameTest dùng thời gian CPU, dev-task coi pytest.py/conftest gốc là cấu hình cổng, PLAN-upgrade tick T-3670/T-3671; 🟢 nghi ngờ chưa tái hiện ghi sổ mở · (2) Cắt 3.30.0 ngay, chấp nhận có hạn các 🟠
- Chọn: Sửa hết 🟠 + 🟢 rẻ trong hai PR song song trước khi cắt 3.30.0: (A, xt.py perf trial) so cây neo ở start/log/status --check bỏ qua đường sổ sách docs/autopilot/**, PROGRESS.md, đường PERF-LOG (cấu hình không được trỏ lệnh đo/khoá vào các đường này — kiểm ở start), check nhận lần giữ của vòng trước khi cây neo == HEAD^{tree} trừ sổ sách; file mới của candidate trùng tên mô-đun nhập được ở cây gốc (unittest, pytest, …) → tampered, khoá mặc định thêm cấu hình runner (.pytest.ini, jest/vitest config, .mocharc*); test đơn vị trial_verdict + GIT_CONFIG cô lập; 🟢 interrupt ghim candidate_fp, log dùng trial_live, ⚠ khi ls-remote rơi về ref cục bộ, tree_fingerprint --ignore-submodules=none; đường lùi = gỡ skill khỏi perf trial, dùng perf compare/guard tay (bỏ lời hứa perf-gate.sh qua loop); đồng bộ ADR/README/skill/optimization-loop/CHANGELOG. (B, phần còn lại) harness-files.md theo #442, DEPENDENCIES.md thêm Gitleaks CLI, GlobCommandNameTest dùng thời gian CPU, dev-task coi pytest.py/conftest gốc là cấu hình cổng, PLAN-upgrade tick T-3670/T-3671; 🟢 nghi ngờ chưa tái hiện ghi sổ mở
- Lý do (tiêu chí chất lượng cuối): (1) F1/F2 làm tính năng chính của bản (/optimize qua perf trial) không dùng được theo đúng tài liệu — phát hành như vậy là khai xong sai; F3/F5 là đường giữ oan/test không bắt; (2) miễn sổ sách chỉ cho đường không thuộc lệnh đo/khoá, kiểm ở start; (5) hai PR song song theo vùng file
- Đường lùi: Bỏ miễn sổ sách, đòi PLAN-opt + D-NNN vào main trước start (tài liệu hoá F2) nếu miễn bị lách

### D-372 · 2026-11-05T09:06:50+00:00 · Review #447: miễn sổ sách của D-371 (trọn thư mục docs/autopilot) bị lách — symlink từ cây mã vào docs/autopilot/fast.py, sửa file đó sau lần giữ, Gate xanh cho mã chưa đo (hồi quy so main); 🟠 F3 bỏ sót gói namespace; 🟠 Gate nhận lần giữ vòng trước khi main đã đổi mã

- Phương án: (1) Thu hẹp miễn về đúng file sổ sách thường: docs/autopilot/PLAN*.md, DECISIONS*.md, PERF-LOG (đường cấu hình), PROGRESS.md — file thường, không symlink; cây candidate/HEAD có symlink trỏ vào đường sổ sách → tampered; candidate (diff start_head..candidate) nhắc chuỗi đường sổ sách (docs/autopilot, PROGRESS.md) ngoài chính các file sổ sách → tampered; F3 coi gói namespace là nhập được; check chỉ nhận lần giữ vòng trước khi cây gốc vòng mới == cây gốc vòng trước trừ sổ sách hoặc == HEAD^{tree} (squash-merge); ghi rủi ro còn lại (đường dựng lúc chạy, cùng uid) vào ADR §2 và optimization-loop.md · (2) Bỏ hẳn miễn sổ sách (đường lùi D-371): F1/F2 quay lại, /optimize không tới done
- Chọn: Thu hẹp miễn về đúng file sổ sách thường: docs/autopilot/PLAN*.md, DECISIONS*.md, PERF-LOG (đường cấu hình), PROGRESS.md — file thường, không symlink; cây candidate/HEAD có symlink trỏ vào đường sổ sách → tampered; candidate (diff start_head..candidate) nhắc chuỗi đường sổ sách (docs/autopilot, PROGRESS.md) ngoài chính các file sổ sách → tampered; F3 coi gói namespace là nhập được; check chỉ nhận lần giữ vòng trước khi cây gốc vòng mới == cây gốc vòng trước trừ sổ sách hoặc == HEAD^{tree} (squash-merge); ghi rủi ro còn lại (đường dựng lúc chạy, cùng uid) vào ADR §2 và optimization-loop.md
- Lý do (tiêu chí chất lượng cuối): (1) phương án 1 đóng cả R1, R1b (symlink → tampered; nhắc đường → tampered) và giữ được F1/F2; phần còn lại là đường dựng lúc chạy cùng lớp giới hạn đã chấp nhận (ADR-0067); (4) phương án 2 làm tính năng chính không dùng được theo tài liệu; thay D-371 ở phần phạm vi miễn
- Đường lùi: Bỏ hẳn miễn (đường lùi D-371) nếu review sau lại lách được

### D-352 · 2026-11-04T10:29:48+00:00 · Chủ dự án 2026-11-04: cho phép agent quyết định khi nào đã đạt và tuyên bố đạt MVP — đảo một phần ADR-0058 (duyệt giai đoạn chỉ người). Làm thế nào?

- Phương án: (1) Khoá xt.yaml stage_approval: human|agent, có hiệu lực khi cả cây làm việc lẫn bản đã commit ở nhánh chính khai agent (như delivery_phase của guard); agent stage approve chỉ khi bản trình còn nguyên (vân tay/SHA khớp), init --adopt và dạng mờ vẫn chỉ người; next-step trả stage-approve; mặc định mã là human, mẫu dự án đích đặt agent · (2) Bỏ hẳn kiểm người/agent ở stage approve và luật STAGE_APPROVE của guard (mọi dự án agent tự duyệt) · (3) Giữ ADR-0058, agent chỉ ghi đề xuất duyệt vào sổ, người vẫn approve
- Chọn: Khoá xt.yaml stage_approval: human|agent, có hiệu lực khi cả cây làm việc lẫn bản đã commit ở nhánh chính khai agent (như delivery_phase của guard); agent stage approve chỉ khi bản trình còn nguyên (vân tay/SHA khớp), init --adopt và dạng mờ vẫn chỉ người; next-step trả stage-approve; mặc định mã là human, mẫu dự án đích đặt agent
- Lý do (tiêu chí chất lượng cuối): (1) đúng/an toàn: quyền do xt.yaml đã commit ở nhánh chính cấp, phiên không tự cấp cho mình; bản trình phải còn nguyên; init --adopt, dạng mờ, strict vẫn chặn; (2) đường lùi: xoá khoá hoặc đặt human là về ADR-0058, một dòng xt.yaml; (3) đơn giản: dùng lại _stage_changed, _committed_xt_text, mẫu build_phase của guard, không thêm sổ; phương án 2 bỏ luôn lớp chặn nhầm cho mọi dự án; phương án 3 không đáp ứng yêu cầu agent tự tuyên bố đạt MVP
- Đường lùi: Đặt stage_approval: human (hoặc bỏ khoá) trong xt.yaml của dự án; ở khung: revert PR ADR-0069, giữ ADR-0058 nguyên bản
- Đính chính số (khi gộp `main` 2026-11-04): ghi lúc đầu là D-342 trên nhánh `claude/amazing-brahmagupta-9jqbg1`; `main` (#438) đã cấp D-342 cho quyết định khác — đánh số lại thành D-347 để không tái sử dụng ID; commit cũ của nhánh còn ghi D-342.
- Đính chính số (khi gộp `main` #439, 2026-11-05): `main` đã cấp D-347/D-348/D-351 cho quyết định khác — D-347 của nhánh `claude/amazing-brahmagupta-9jqbg1` đánh số lại thành D-352 để không tái sử dụng ID.

### D-353 · 2026-11-04T11:11:50+00:00 · ADR-0068 định hướng xưởng phần mềm: chủ dự án trả lời bốn câu hỏi ở research 2026-11-04 §9 thế nào?

- Phương án: (1) 1a gói đầu tiên trong repo khung tại framework/templates/packs/<stack>/ (phiên bản theo VERSION), chuyển repo riêng khi ≥ 2 gói hoặc owner khác; 2a stack của dự án đích hotel-manager (lát B và C dùng chung một gói; stack xác minh khi đọc repo ở PLAN lát B); 3a evidence v3 chỉ thêm trường, release-check --json thêm promotion/subject, giữ go/verdict/exit code ≥ 1 bản minor; 4a tuyến hai API/worker cùng stack, host Codex và Gemini CLI trước, công bố hỗ trợ chỉ khi checks-run · (2) Giữ ADR-0068 ở trạng thái Đề xuất, chưa lập PLAN
- Chọn: 1a gói đầu tiên trong repo khung tại framework/templates/packs/<stack>/ (phiên bản theo VERSION), chuyển repo riêng khi ≥ 2 gói hoặc owner khác; 2a stack của dự án đích hotel-manager (lát B và C dùng chung một gói; stack xác minh khi đọc repo ở PLAN lát B); 3a evidence v3 chỉ thêm trường, release-check --json thêm promotion/subject, giữ go/verdict/exit code ≥ 1 bản minor; 4a tuyến hai API/worker cùng stack, host Codex và Gemini CLI trước, công bố hỗ trợ chỉ khi checks-run
- Lý do (tiêu chí chất lượng cuối): Chủ dự án chốt 2026-11-04 (1a, 2a hotel-manager, 3a, 4a) đúng với đề xuất của phiên theo tiêu chí chất lượng cuối: (1) đúng/an toàn — trường cũ giữ nghĩa, quyền promote ở CI/IAM hệ đích; (2) đường lùi — xoá thư mục gói, đặt lại khoá; (3) đơn giản — một gói, một VERSION, tái dùng install.py manifest và cơ chế sẵn có; ràng buộc §3b giữ nguyên (D-142, ADR-0043/0050/0058/0064)
- Đường lùi: Đổi trạng thái ADR-0068 về Đề xuất hoặc viết ADR mới thay; chưa lát nào có mã nên chỉ cần revert tài liệu
- Đính chính số (khi gộp `main` 2026-11-04): ghi lúc đầu là D-343 trên nhánh `claude/amazing-brahmagupta-9jqbg1`; `main` (#438) đã cấp D-343 cho quyết định khác — đánh số lại thành D-348 để không tái sử dụng ID; commit cũ của nhánh còn ghi D-343.
- Đính chính số (khi gộp `main` #439, 2026-11-05): `main` đã cấp D-347/D-348/D-351 cho quyết định khác — D-348 của nhánh `claude/amazing-brahmagupta-9jqbg1` đánh số lại thành D-353 để không tái sử dụng ID.

### D-354 · 2026-11-04T15:17:01+00:00 · Chủ dự án 2026-11-04: tài liệu repo khung giữ cả lịch sử đã bỏ — làm lại thành dự án không lịch sử, giữ nguyên, hay dời lịch sử vào kho?

- Phương án: (1) Dời lịch sử của chính repo khung (PLAN đã đóng, báo cáo audit/GO-NO-GO/đo cũ) sang docs/archive/ bằng git mv, sửa liên kết; giữ nguyên framework/ (ID Ngừng dùng, Nguồn+ngày, lý do luật), sổ audit, sổ quyết định, PLAN còn mở, đầu vào sống của công cụ; bộ cấp số task quét cả kho; .ignore để ripgrep bỏ qua kho · (2) Làm lại thành dự án mới không lịch sử (xoá ID Ngừng dùng, Nguồn, ADR, CHANGELOG cũ, repo mới) · (3) Giữ nguyên hiện trạng
- Chọn: Dời lịch sử của chính repo khung (PLAN đã đóng, báo cáo audit/GO-NO-GO/đo cũ) sang docs/archive/ bằng git mv, sửa liên kết; giữ nguyên framework/ (ID Ngừng dùng, Nguồn+ngày, lý do luật), sổ audit, sổ quyết định, PLAN còn mở, đầu vào sống của công cụ; bộ cấp số task quét cả kho; .ignore để ripgrep bỏ qua kho
- Lý do (tiêu chí chất lượng cuối): (1) đúng/an toàn: installer chỉ chép framework/ và research được trỏ nên docs/ không tới dự án đích; framework/ giữ cam kết ID ổn định (conventions.md) và P2; bộ cấp số task vẫn thấy ID cũ nên không tái sử dụng T-NNNN; (2) đường lùi: git mv đảo ngược được, lịch sử file giữ; (3) đơn giản: theo tiền lệ T-3651 (file lưu trữ không tính trần); phương án 2 phá ID dự án đích đang tick, vi phạm P2 và AGENTS.md §9, rewrite history bị guard chặn; phương án 3 để docs/autopilot còn 2 KB dưới trần, chặn PLAN lát A ADR-0068
- Đường lùi: git mv ngược các file trong docs/archive/ về chỗ cũ, khôi phục liên kết bằng revert commit; bỏ docs/archive khỏi _plan_paths và .ignore
- Đính chính số (khi gộp `main` 2026-11-04): ghi lúc đầu là D-344 trong lát chưa commit; `main` (#438) đã cấp D-344 cho quyết định khác — đánh số lại thành D-349 để không tái sử dụng ID.
- Đính chính số (khi gộp `main` #439, 2026-11-05): `main` đã cấp D-347/D-348/D-351 cho quyết định khác — D-349 của nhánh `claude/amazing-brahmagupta-9jqbg1` đánh số lại thành D-354 để không tái sử dụng ID.

### D-355 · 2026-11-04T17:18:37+00:00 · ADR-0068 lát A: 'evidence v3' mở rộng ở đâu?

- Phương án: (1) Chỉ hợp đồng phát hành: release-check --json thêm schema 3, subject (head, vân tay cây, digest artifact), artifacts[], results[] theo adapter (JUnit XML/SARIF/pip-audit JSON qua khoá xt.yaml <key>_report), promotion (approved/pending_human/rejected/blocked); evidence v2 của loop record giữ nguyên · (2) Cả evidence của loop record lên v3 (artifacts/results theo task) cùng hợp đồng phát hành
- Chọn: Chỉ hợp đồng phát hành: release-check --json thêm schema 3, subject (head, vân tay cây, digest artifact), artifacts[], results[] theo adapter (JUnit XML/SARIF/pip-audit JSON qua khoá xt.yaml <key>_report), promotion (approved/pending_human/rejected/blocked); evidence v2 của loop record giữ nguyên
- Lý do (tiêu chí chất lượng cuối): (1) đúng phần Xác nhận A của ADR-0068 (promotion + fixture âm ở release-check), không đổi nghĩa go/verdict/human/exit; (2) chỉ thêm trường, khoá xt.yaml mới tuỳ chọn — bỏ khoá là về hành vi cũ; (3) một nhà cho hợp đồng phát hành, không chạm đường verify của loop (đã ổn định, coverage 100 %); evidence v3 của loop chờ khi có nhu cầu đo theo task
- Đường lùi: Bỏ khoá <key>_report/release_artifacts trong xt.yaml: release-check chạy như trước; revert các commit lát A trên nhánh
- Đính chính số (khi gộp `main` #439, 2026-11-05): `main` đã cấp D-347/D-348/D-351 cho quyết định khác — D-350 của nhánh `claude/amazing-brahmagupta-9jqbg1` đánh số lại thành D-355 để không tái sử dụng ID.

### D-358 · 2026-11-04T22:54:48+00:00 · Duyệt PLAN-harden-2026-11-05 (harden nhánh claude/amazing-brahmagupta-9jqbg1, không PR/merge theo chủ dự án)?

- Phương án: (1) Duyệt: 5 task T-3680…3684 (🔴 F1 hai lớp, 🟠 F2/F3, tài liệu); nợ 🟢 ghi sổ; guard của main để phiên guard · (2) Chỉ ghi nợ mọi phát hiện ADR-0069, không sửa trên nhánh
- Chọn: Duyệt: 5 task T-3680…3684 (🔴 F1 hai lớp, 🟠 F2/F3, tài liệu); nợ 🟢 ghi sổ; guard của main để phiên guard
- Lý do (tiêu chí chất lượng cuối): (1) F1 là nới hàng rào so với main (agent duyệt bản đã đổi, sổ ghi người) — phải sửa trước khi nhánh tới main; sửa hai lớp (xt.py đòi bản còn nguyên, guard dạng chữ rõ chặt) đóng cả đường né biến môi trường; (2) mọi thay đổi là siết, khoá vắng = như cũ; (3) không đụng phần guard của #439 để tránh xung đột với phiên guard
- Đường lùi: Revert các commit T-3680…3684 trên nhánh; ADR-0069 về hành vi commit e295301

### D-359 · 2026-11-04T23:16:33+00:00 · Duyệt PLAN-factory-BE: phạm vi lát B–E ADR-0068 trên nhánh (không PR/merge)

- Phương án: (1) B gói web-api-ts tối giản (node:http + kysely/pg + RLS + vitest + biome, không Next.js) + CI lát dọc + 3 ca sai; C install.py --pack (starter chỉ repo sạch, managed theo manifest, drift, lùi bằng cài lại bản cũ) + chạy --plan trên bản clone hotel-manager; D worker cùng gói (trùng/timeout/crash/reconcile), fixture host thật hoãn (cần tài khoản trả phí của chủ); E registry JSON + xt.py registry + trang app · (2) Gói đầy đủ như hotel-manager (Next.js 16 + better-auth) và chạy codex thật để lấy fixture · (3) Chỉ làm B, hoãn C–E tới khi B merge
- Chọn: B gói web-api-ts tối giản (node:http + kysely/pg + RLS + vitest + biome, không Next.js) + CI lát dọc + 3 ca sai; C install.py --pack (starter chỉ repo sạch, managed theo manifest, drift, lùi bằng cài lại bản cũ) + chạy --plan trên bản clone hotel-manager; D worker cùng gói (trùng/timeout/crash/reconcile), fixture host thật hoãn (cần tài khoản trả phí của chủ); E registry JSON + xt.py registry + trang app
- Lý do (tiêu chí chất lượng cuối): (1) đúng/an toàn: không dùng tài khoản trả phí của chủ khi chưa được giao, không đụng repo đích (không PR); (2) đường lùi: gói là thư mục xoá được, --pack opt-in; (3) đơn giản/test được: gói nhỏ chạy được trong CI với Postgres thật, cùng thư viện lõi hotel-manager (kysely/pg/RLS/vitest/biome) nên C dùng chung; Next.js thêm bề mặt lớn không cần cho lát dọc API
- Đường lùi: xoá framework/templates/packs/, bỏ cờ --pack, xoá registry; ADR-0068 trạng thái về 'lát B–E chưa làm'

### D-373 · 2026-11-05T10:50:02+00:00 · Audit ARCH T-3557: .claude/hooks/ đạt 843 817 B = 2,28× mốc 2026-10-26 (369 274 B) từ #433 — ADR-0050 đòi ADR xét lại khi vượt 2× trước 2027-01-21, chưa có ADR, không cổng máy nào bắt

- Phương án: (1) ADR-0072 xét lại: giữ trần nhóm hiện có (1 417 969 B, chưa chạm), chấp nhận mức tăng vì là bản vá an ninh guard (#433–#442, ADR-0065/0066/0067); đặt mốc mới 2026-11-05 cho .claude/hooks và scripts; thêm cổng máy trong tests/test_docs_budget.py: mỗi nhóm ≤ 2× mốc gần nhất trừ khi có ADR xét lại khai trong test; T-3709 đo chi phí compile guard.py mỗi lệnh Bash (AUD-PERF-013) và xét cache bytecode trước 2027-01-21 cùng đợt đánh giá sandbox · (2) Chấp nhận 🟠 có hạn 2027-01-21 không ADR
- Chọn: ADR-0072 xét lại: giữ trần nhóm hiện có (1 417 969 B, chưa chạm), chấp nhận mức tăng vì là bản vá an ninh guard (#433–#442, ADR-0065/0066/0067); đặt mốc mới 2026-11-05 cho .claude/hooks và scripts; thêm cổng máy trong tests/test_docs_budget.py: mỗi nhóm ≤ 2× mốc gần nhất trừ khi có ADR xét lại khai trong test; T-3709 đo chi phí compile guard.py mỗi lệnh Bash (AUD-PERF-013) và xét cache bytecode trước 2027-01-21 cùng đợt đánh giá sandbox
- Lý do (tiêu chí chất lượng cuối): (1) ADR-0050 ghi 'phải có ADR' — chấp nhận không ADR trái chính quyết định cũ; (3) cổng máy bắt lần vượt sau thay vì dựa vào audit; (2) giữ trần, không nới; chi phí compile chưa đo được trong phiên (guard chặn script đọc guard.py) nên giao task đo có hạn
- Đường lùi: Tách guard.py (ADR riêng) nếu T-3709 đo chi phí compile vượt ngân sách hook

### D-374 · 2026-11-05T11:29:58+00:00 · PR #448 (cắt 3.30.0): review lượt 1 chưa sạch (0 🔴, 3 🟠 GO-NO-GO lỗi thời, mốc scripts vô hiệu cổng 2×, test mốc không đọc ADR; 4 🟢) — PR cắt bản không ghi nợ (ADR-0059 §6); đi tiếp thế nào?

- Phương án: (1) Sửa HẾT 3 🟠 + 4 🟢 trong một commit trên PR, rồi review lượt 2 cả PR ở head mới bằng reviewer-alt (effort max) · (2) Tách ADR-0072 + cổng 2× sang PR riêng, PR cắt bản chỉ còn VERSION/CHANGELOG/báo cáo
- Chọn: Sửa HẾT 3 🟠 + 4 🟢 trong một commit trên PR, rồi review lượt 2 cả PR ở head mới bằng reviewer-alt (effort max)
- Lý do (tiêu chí chất lượng cuối): (1) các phát hiện đều nhỏ, sửa được ngay, có tái hiện; (3) tách PR làm báo cáo/ARCH lệch khỏi bản đang cắt; (5) một lượt sửa + một review rẻ hơn hai PR
- Đường lùi: Tách ADR-0072 sang PR riêng nếu review lượt 2 vẫn chặn ở phần đó

### D-375 · 2026-11-05T12:47:31+00:00 · AUD-HAR-301 (xboss nâng 3.30.0): harness_permissions: own đổi 11 lệnh hook dạng ${CLAUDE_PROJECT_DIR} sang tương đối — đúng giao ước đã ghi (harness-files.md, test own_permissions_keeps_project_permissions_and_relative_hooks, chủ repo duyệt 2026-10-22 cho dhcb); sửa trong 3.30.1?

- Phương án: (1) 3.30.1 giữ giao ước, ghi chú ở harness-files.md + CHANGELOG 'Dự án đích': dự án cần lệnh hook tuyệt đối thì không dùng own (hoặc gộp tay); 3.31.0 xét own giữ dạng lệnh sẵn có của dự án (ADR mới) · (2) Đổi giao ước ngay trong 3.30.1
- Chọn: 3.30.1 giữ giao ước, ghi chú ở harness-files.md + CHANGELOG 'Dự án đích': dự án cần lệnh hook tuyệt đối thì không dùng own (hoặc gộp tay); 3.31.0 xét own giữ dạng lệnh sẵn có của dự án (ADR mới)
- Lý do (tiêu chí chất lượng cuối): (2) bản vá không đổi giao ước đã được chủ repo duyệt; (1) xboss hiện chạy đúng (PR #706 xanh, hook tuyệt đối giữ ở lần cài này) — rủi ro chỉ ở lần cài sau, đã ghi; (3) đổi giao ước cần ADR và test mới
- Đường lùi: Đổi trong 3.30.x nếu dự án đích nào hỏng hook vì dạng tương đối trước 3.31.0

### D-376 · 2026-11-05T13:13:38+00:00 · PR #450 (cắt 3.30.1): review lượt 1 chặn — 🔴 trần docs/ops vượt 970 B (GO-NO-GO §2 khai test_docs_budget exit 0 khi file mới chưa vào index); 🟠 cổng ký tự vô hình bỏ sót research/ (install.py cài vào dự án đích), PROGRESS.md, xt.yaml, .github/; 🟠 mẫu xt.yaml nói own giữ dạng lệnh hook — ngược giao ước D-375; 5 🟢 (regex code span thiếu lookbehind/escape, test dán ký tự vô hình thật, PROGRESS, harness-files lặp ý, chuỗi VS dài vô hạn)

- Phương án: (1) Sửa HẾT trong một commit: lưu trữ dòng đã sửa đủ chỗ + đo lại sau git add; cổng quét mọi file tracked trừ tests/ (lỗi UTF-8 → báo, không bỏ qua); sửa chú thích mẫu xt.yaml + docstring install.py theo giao ước; 🟢: regex code span theo CommonMark tối thiểu (lookbehind backtick, \` escape) + test, test dùng escape, PROGRESS 3.30.1, harness-files một câu, giới hạn chuỗi selector ≤ 1 liên tiếp; rồi review lượt 2 cả PR · (2) Tách cổng ký tự vô hình mở rộng sang PR sau
- Chọn: Sửa HẾT trong một commit: lưu trữ dòng đã sửa đủ chỗ + đo lại sau git add; cổng quét mọi file tracked trừ tests/ (lỗi UTF-8 → báo, không bỏ qua); sửa chú thích mẫu xt.yaml + docstring install.py theo giao ước; 🟢: regex code span theo CommonMark tối thiểu (lookbehind backtick, \` escape) + test, test dùng escape, PROGRESS 3.30.1, harness-files một câu, giới hạn chuỗi selector ≤ 1 liên tiếp; rồi review lượt 2 cả PR
- Lý do (tiêu chí chất lượng cuối): (1) research/ được cài vào dự án đích — đúng lớp lỗi bản vá nhắm tới; (1) tài liệu own sai là gốc lỗi xboss; (3) đều nhỏ, có tái hiện; PR cắt bản không mang nợ (ADR-0059 §6)
- Đường lùi: Tách cổng mở rộng nếu quét mọi file chặn oan nội dung hợp lệ

### D-377 · 2026-11-05T13:50:11+00:00 · Nhánh ADR-0068 (3.31.0) sau gộp 3.30.0: 4 điểm mở — nhóm DATA ghi N/A dù gói web-api-ts có migration; AUD-SEC-498 🟠 python3 -c gọi xt.main lách guard; BASE-SEC-005 đỏ vì POSTGRES_PASSWORD literal trong pack-web-api.yml; AUD-SEC-502 phần baseline.json chép đè được trong cùng PR

- Phương án: (1) Chặt cả bốn: quét nhóm DATA cho gói (audit, không giải trình thay); thêm luật guard cho AUD-SEC-498 kèm test + ca autonomy-bench; CI dùng POSTGRES_HOST_AUTH_METHOD: trust cho service container (không literal mật khẩu, không nới lệnh kiểm); CI so contract với baseline.json của nhánh gốc, chỉ cho đổi baseline khi PR tăng phiên bản gói · (2) Giải trình DATA, chấp nhận có hạn AUD-SEC-498, thu hẹp lệnh kiểm BASE-SEC-005, giữ review tay baseline
- Chọn: Chặt cả bốn: quét nhóm DATA cho gói (audit, không giải trình thay); thêm luật guard cho AUD-SEC-498 kèm test + ca autonomy-bench; CI dùng POSTGRES_HOST_AUTH_METHOD: trust cho service container (không literal mật khẩu, không nới lệnh kiểm); CI so contract với baseline.json của nhánh gốc, chỉ cho đổi baseline khi PR tăng phiên bản gói
- Lý do (tiêu chí chất lượng cuối): (1) gói cài migration và guard vào dự án đích — lỗ ở đây nhân lên mọi dự án; không nới cổng (LOOP-CI-001); (3) mỗi điểm có test; (5) chỉ phá hoà
- Đường lùi: Chấp nhận có hạn từng điểm nếu sửa làm vỡ hành vi dự án đích đã dùng gói

### D-378 · 2026-11-05T14:28:05+00:00 · PR #450 (cắt 3.30.1): review lượt 2 còn 3 🟢 — F1 hồi quy so main (che code span theo cả dòng ghép backtick lẻ của hai ô bảng → link hỏng ở ô giữa không báo), F2 danh sách số vắng thiếu D-352…355, F3 lookbehind sai với backtick sau backtick đã escape; trần rethink đã dùng

- Phương án: (1) Thu hẹp: rút phần sửa check-links (AUD-CODE-061, FB-115) khỏi 3.30.1 — trả scripts/check-links.py và test về main, AUD-CODE-061 về mở (sửa ở 3.31.0 bằng bộ quét backtick theo CommonMark + tách ô GFM), CHANGELOG bỏ dòng; sửa F2; review lượt 3 chỉ delta · (2) Sửa F1/F3 bằng bộ quét mới ngay trong 3.30.1
- Chọn: Thu hẹp: rút phần sửa check-links (AUD-CODE-061, FB-115) khỏi 3.30.1 — trả scripts/check-links.py và test về main, AUD-CODE-061 về mở (sửa ở 3.31.0 bằng bộ quét backtick theo CommonMark + tách ô GFM), CHANGELOG bỏ dòng; sửa F2; review lượt 3 chỉ delta
- Lý do (tiêu chí chất lượng cuối): (1) bản vá không được mang hồi quy (F1); regex che code span đã hai lượt lộ ca sai — viết bộ quét đúng là việc của bản thường; (2) mục tiêu chính 3.30.1 (AI-GUARD-018, compose, cổng ký tự vô hình) đã sạch qua hai lượt review; FB-115 là báo oan có từ trước, giữ thêm một bản không tệ hơn
- Đường lùi: Đưa lại phần check-links vào 3.30.x nếu bộ quét mới xong trước khi dự án đích cần

### D-379 · 2026-11-05T14:57:43+00:00 · PR #450: review lượt 3 chặn vì phần sót của D-378 (CHANGELOG còn hứa check-links bỏ code span; GO-NO-GO số đo cũ)

- Phương án: (1) Đã sửa ở 31dbad4; review delta lượt 4 · (2) Tách PR
- Chọn: Đã sửa ở 31dbad4; review delta lượt 4
- Lý do (tiêu chí chất lượng cuối): (1) chỉ là chữ sót của D-378, đã sửa và đo lại sau git add; (5) tách PR không thêm an toàn
- Đường lùi: Tách PR nếu lượt 4 còn chặn

### D-380 · 2026-11-05T15:13:01+00:00 · gate-fast tự gây đỏ: test_fast/test chạy xargs -P nproc (16) khiến test đo thời gian (GlobCommandNameTest cpu-ratio, PerfGateExampleTest) đỏ do chính tải của cổng; covpar 8 tiến trình thì ổn định

- Phương án: (1) test_fast và test dùng -P bằng nửa số nhân (tối thiểu 1); không nới ngưỡng test nào · (2) Nới ngưỡng các test thời gian
- Chọn: test_fast và test dùng -P bằng nửa số nhân (tối thiểu 1); không nới ngưỡng test nào
- Lý do (tiêu chí chất lượng cuối): (1) cổng phải ổn định, không đỏ do chính nó; nới ngưỡng là nới cổng (LOOP-CI-001); (5) nửa số nhân vẫn nhanh gấp ~3 lần tuần tự (đo covpar 8: 5 phút 51 giây)
- Đường lùi: Trả về -P nproc nếu test thời gian được làm bền với tải

### D-381 · 2026-11-05T15:30:38+00:00 · PR #450: lượt 4 còn chữ sai (tiêu đề/thân PR khai check-links; GO-NO-GO số đo; PROGRESS)

- Phương án: (1) Sửa chữ tại chỗ, review lượt 5 · (2) Tách PR
- Chọn: Sửa chữ tại chỗ, review lượt 5
- Lý do (tiêu chí chất lượng cuối): (1) chỉ là chữ; (5) tách không thêm an toàn
- Đường lùi: Tách PR

### D-382 · 2026-11-05T22:05:08+00:00 · Hook PreToolUse Bash (guard) quá 600 s khi commit chạy cổng đủ bộ dưới tải

- Phương án: (1) Nâng timeout hook lên 1200 s · (2) Bỏ qua hook khi commit
- Chọn: Nâng timeout hook lên 1200 s
- Lý do (tiêu chí chất lượng cuối): Chủ dự án chọn; giữ hàng rào, chỉ nới thời gian chờ
- Đường lùi: Đặt lại 600 trong .claude/settings.json

### D-383 · 2026-11-06T01:32:34+00:00 · AUD-HAR-301: harness_permissions own đổi lệnh hook khung dạng CLAUDE_PROJECT_DIR sang tương đối (xboss hỏng khi phiên mở ngoài gốc repo)

- Phương án: (1) own giữ dạng lệnh hook sẵn có của dự án: có lệnh khung dạng CLAUDE_PROJECT_DIR thì giữ tuyệt đối, không có thì tương đối (ADR-0073) · (2) khoá riêng chọn dạng lệnh hook · (3) giữ giao ước, ghi chú dự án cần dạng tuyệt đối không dùng own
- Chọn: own giữ dạng lệnh hook sẵn có của dự án: có lệnh khung dạng CLAUDE_PROJECT_DIR thì giữ tuyệt đối, không có thì tương đối (ADR-0073)
- Lý do (tiêu chí chất lượng cuối): (1) đúng: dạng tuyệt đối chạy ở mọi cwd, không bao giờ hạ cấp hook của dự án; giao ước dhcb (tương đối) giữ nguyên vì dhcb không có lệnh tuyệt đối; (3) không thêm khoá cấu hình
- Đường lùi: Trả settings_changes về luôn _relative_hooks khi own; ADR mới thay ADR-0073

### D-384 · 2026-11-06T01:32:34+00:00 · AUD-HAR-300: .gitignore của dự án che file khung trong .xtemplates/

- Phương án: (1) install.py dò git check-ignore trên file vừa cài và cảnh báo, không sửa .gitignore · (2) install.py thêm !.xtemplates/** vào .gitignore
- Chọn: install.py dò git check-ignore trên file vừa cài và cảnh báo, không sửa .gitignore
- Lý do (tiêu chí chất lượng cuối): (1) an toàn: không đổi luật của dự án; !.xtemplates/** kéo cả file dự án cố ý bỏ qua (__pycache__, file tạm) vào repo
- Đường lùi: Bỏ warn_ignored_framework khỏi install()

### D-385 · 2026-11-06T03:26:13+00:00 · PR #454 (cắt 3.31.0): review lượt 1 BLOCKING (F1 test timeout đỏ giả ở main; F2–F7 chữ GO-NO-GO/CHANGELOG) — đã sửa hết ở 616f512, CI xanh

- Phương án: (1) Thêm một lượt sửa hết phát hiện rồi review lại chỉ delta 6f416ea..616f512 (ADR-0059 §6) · (2) Tách PR sửa test riêng, PR cắt bản chỉ chữ
- Chọn: Thêm một lượt sửa hết phát hiện rồi review lại chỉ delta 6f416ea..616f512 (ADR-0059 §6)
- Lý do (tiêu chí chất lượng cuối): (1) đã sửa hết kèm bằng chứng (0/48 dưới tải, mutant vẫn đỏ); (3) delta nhỏ, tách PR thêm vòng CI mà không giảm rủi ro
- Đường lùi: Đóng #454, tách PR test rồi cắt lại

### D-386 · 2026-11-06T03:58:20+00:00 · PR #454 (cắt 3.31.0): review lượt 2 BLOCKING chỉ vì F-A (CHANGELOG khai dự án đích nhận timeout hook khi cài lại, nhưng gộp hooks không đồng bộ timeout)

- Phương án: (1) Sửa tận gốc trong PR: install.py _sync_timeout (nâng, không hạ) + test, rồi review delta 6b7fedc..head · (2) Chỉ sửa chữ CHANGELOG thành bước tay, ghi sổ install.py làm sau
- Chọn: Sửa tận gốc trong PR: install.py _sync_timeout (nâng, không hạ) + test, rồi review delta 6b7fedc..head
- Lý do (tiêu chí chất lượng cuối): (1) dự án đích nhận đúng hạn chờ hook không cần tay — tránh kẹt hook 600 s như D-382; câu CHANGELOG thành đúng; (3) thay đổi nhỏ theo mẫu _sync_on_failure, có test đỏ trước
- Đường lùi: Bỏ _sync_timeout khỏi _merge_hook_events, CHANGELOG ghi bước tay

### D-387 · 2026-11-07T01:35:11+00:00 · Đưa sửa installer #455…#458 tới dự án đích thế nào

- Phương án: (1) Cắt 3.31.1 ngay (bản vá, chỉ installer), cập nhật các PR nâng 3.31.0 đang mở lên 3.31.1 · (2) Chờ gom vào 3.32.0
- Chọn: Cắt 3.31.1 ngay (bản vá, chỉ installer), cập nhật các PR nâng 3.31.0 đang mở lên 3.31.1
- Lý do (tiêu chí chất lượng cuối): (1) dự án đích đang nâng 3.31.0 gặp đúng các lỗi này (Prettier đỏ ở X-Company, diff settings.json phình ở dhcb); (2) bản vá nhỏ, không đổi ID/khoá, lùi được bằng cài lại 3.31.0; (3) theo semver patch
- Đường lùi: Dự án đích cài lại bằng bản khung 3.31.0

### D-388 · 2026-11-07T02:00:01+00:00 · PR #461 (cắt 3.31.1): review lượt 1 REQUEST CHANGES — 2 🟠 lời khai sai (trạng thái dự án đích; nguyên nhân review_debt) + 3 🟢

- Phương án: (1) Sửa hết trên nhánh (ADR-0059 §6: PR cắt bản không mang nợ) rồi review lại delta · (2) Ghi nợ và cắt bản như hiện tại
- Chọn: Sửa hết trên nhánh (ADR-0059 §6: PR cắt bản không mang nợ) rồi review lại delta
- Lý do (tiêu chí chất lượng cuối): (1) GO-NO-GO là tài liệu người ký — lời khai sai không được ship; review_debt sẽ đỏ cả trên main nếu không dời SHA nhóm 4; (3) sửa nhỏ, chỉ tài liệu/sổ/1 test
- Đường lùi: Revert commit sửa của lượt 2

### D-389 · 2026-11-07T04:00:25+00:00 · AUD-HAR-219: gắn chữ ký GO-NO-GO §5 với ứng viên thế nào để chữ ký ở commit A không duyệt cây đổi mã sau đó?

- Phương án: (1) Dòng 'subject: content <64 hex>' (evidence_fingerprint — vân tay nội dung trừ GO-NO-GO/DECISIONS/PROGRESS) và, khi khai release_artifacts, 'subject: digest <64 hex>'; so đủ 64 hex đúng ô · (2) Dòng subject theo SHA HEAD (40 hex) · (3) Giữ so 12 hex digest bất kỳ đâu, thêm cảnh báo
- Chọn: Dòng 'subject: content <64 hex>' (evidence_fingerprint — vân tay nội dung trừ GO-NO-GO/DECISIONS/PROGRESS) và, khi khai release_artifacts, 'subject: digest <64 hex>'; so đủ 64 hex đúng ô
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: SHA HEAD đổi ngay khi commit chữ ký nên không ký được; vân tay nội dung đã loại file ký nên ổn định qua commit ký và squash, đổi khi mã đổi; so đúng ô đủ 64 hex bỏ khớp ngẫu nhiên. (2) đường lùi: khoá tuỳ chọn cũ giữ nguyên, chỉ thêm dòng. (3) tái dùng evidence_fingerprint có test
- Đường lùi: Revert PR; promotion quay về so 12 hex digest

### D-390 · 2026-11-07T04:00:30+00:00 · AUD-SEC-497: chặn agent tự ghi dòng ký §5 của GO-NO-GO*.md ở đâu?

- Phương án: (1) Guard: Edit/Write/MultiEdit vào GO-NO-GO*.md làm xuất hiện dòng ký mới (tên + ngày) ở §5 → deny; Bash ghi vào GO-NO-GO*.md → deny (sửa bằng Edit để guard so được) · (2) Chỉ dựa review PR · (3) Chặn mọi sửa GO-NO-GO*.md
- Chọn: Guard: Edit/Write/MultiEdit vào GO-NO-GO*.md làm xuất hiện dòng ký mới (tên + ngày) ở §5 → deny; Bash ghi vào GO-NO-GO*.md → deny (sửa bằng Edit để guard so được)
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: mẫu ghi chữ ký là của người, agent tự ký được thì promotion approved không còn nghĩa; chặn mọi sửa thì agent không lập được phần máy. (3) đơn giản, test bằng payload giả. Giới hạn còn lại (script ghi file với tên dựng lúc chạy) ghi ở harness-files như AUD-SEC-406
- Đường lùi: Revert PR; guard thôi chặn, lớp sau là review PR

### D-391 · 2026-11-07T04:05:22+00:00 · AUD-TEST-061 lộ ra: SARIF thật của gitleaks 8.30.1 không ghi level, adapter coi là warning nên report có leak ra PASS — xử lý thế nào?

- Phương án: (1) Kết quả của công cụ quét bí mật (tool.driver.name gitleaks) là error bất kể level · (2) Giữ theo SARIF §3.27.10, dựa exit code công cụ · (3) Mọi warning là FAIL
- Chọn: Kết quả của công cụ quét bí mật (tool.driver.name gitleaks) là error bất kể level
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: một leak ra PASS là xanh giả; release-check đọc report, không đọc exit code, nên --exit-code 0 làm cổng xanh. Phương án 3 làm FAIL giả với CodeQL/ruff warning. (3) hẹp, test được bằng fixture thật
- Đường lùi: Revert commit; gitleaks quay về luật level mặc định SARIF

### D-392 · 2026-11-07T04:49:32+00:00 · AUD-SEC-497 (tiếp): agent sửa tiêu đề phiên bản hay dòng subject của GO-NO-GO đã ký → chữ ký người chuyển sang ứng viên mới; guard có chặn?

- Phương án: (1) File trên đĩa đã có dòng ký §5: deny Edit/Write đổi dòng '# ' đầu tiên hoặc dòng 'subject:' (thêm/sửa/xoá) · (2) Giữ cho sửa, review PR là lớp sau
- Chọn: File trên đĩa đã có dòng ký §5: deny Edit/Write đổi dòng '# ' đầu tiên hoặc dòng 'subject:' (thêm/sửa/xoá)
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: sau AUD-HAR-219 (D-389) chữ ký gắn ứng viên qua dòng subject — agent đổi được dòng đó là lách được cả hai sửa; agent cần đổi thì xoá dòng ký trước (được phép), người ký lại. (2) đường lùi: xoá dòng ký vẫn mở
- Đường lùi: Revert commit; guard chỉ chặn dòng ký

### D-393 · 2026-11-07T05:11:40+00:00 · AUD-HAR-319: subject.content loại file theo TÊN ở mọi cấp (src/DECISIONS.md, src/x/GO-NO-GO-y.md đổi mã vẫn approved) — sửa thế nào?

- Phương án: (1) Vân tay riêng cho subject: chỉ loại GO-NO-GO*.md ở GO_NO_GO_DIRS, sổ DECISIONS_LOG, PROGRESS.md gốc và .autopilot/; giữ evidence_fingerprint cũ cho gói stage · (2) Thu hẹp _signoff_excluded chung · (3) Chấp nhận, ghi giới hạn ở mẫu §1
- Chọn: Vân tay riêng cho subject: chỉ loại GO-NO-GO*.md ở GO_NO_GO_DIRS, sổ DECISIONS_LOG, PROGRESS.md gốc và .autopilot/; giữ evidence_fingerprint cũ cho gói stage
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: approved phải phủ mọi mã; tập loại trừ hẹp đúng các file ký/sổ máy đọc. (2) đường lùi và không hồi quy: không đổi evidence_fingerprint/_changed_since mà gói stage và AUD-HAR-164 dựa vào. (3) test được bằng repo tạm
- Đường lùi: Revert; subject.content quay về evidence_fingerprint

### D-394 · 2026-11-07T05:35:38+00:00 · Nợ #462/#463: SARIF suppression vắng status, suppression của gitleaks, bản tháng DECISIONS trong vân tay subject — luật nào?

- Phương án: (1) Chặt: chỉ bỏ qua khi mọi suppression ghi rõ status accepted; công cụ quét bí mật không bao giờ bỏ qua (D-391); bản tháng DECISIONS vẫn tính vào vân tay · (2) Lỏng: vắng status = accepted, gitleaks cũng bỏ qua, loại bản tháng
- Chọn: Chặt: chỉ bỏ qua khi mọi suppression ghi rõ status accepted; công cụ quét bí mật không bao giờ bỏ qua (D-391); bản tháng DECISIONS vẫn tính vào vân tay
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: mặc định khi vắng status chưa xác minh được trong SARIF 2.1.0 errata01 §3.35.3 — cách hiểu chặt; lệch về đỏ giả an toàn hơn xanh giả; bí mật bị chặn trong report vẫn là bí mật trong lịch sử. (2) nới sau được khi có nguồn
- Đường lùi: Đổi một biểu thức trong _sarif_suppressed / bỏ nhánh SECRET_SCANNERS

### D-395 · 2026-11-07T11:38:43+00:00 · Cắt bản sau #462…#469 — 3.31.2 hay 3.32.0?

- Phương án: (1) 3.32.0 (minor): đổi việc dự án đích phải làm (dòng subject GO-NO-GO, D-389) và guard chặn ký §5; không phá tương thích ngược dữ liệu · (2) 3.31.2 (patch)
- Chọn: 3.32.0 (minor): đổi việc dự án đích phải làm (dòng subject GO-NO-GO, D-389) và guard chặn ký §5; không phá tương thích ngược dữ liệu
- Lý do (tiêu chí chất lượng cuối): (1) đúng: SemVer — #463 thêm yêu cầu mới với dự án đích (GO-NO-GO cũ ở lại pending_human tới khi ký lại), không phải vá lỗi thuần; (3) theo chuẩn; nợ review đã trả hết (audit check --strict exit 0), release-check GO chờ người
- Đường lùi: Không merge PR cắt bản; hoặc cắt bản vá sau đó

### D-396 · 2026-11-07T12:18:23+00:00 · PR #470 (cắt 3.32.0): review lượt 1 APPROVE với 1 🟢 — câu GO-NO-GO khai sai trạng thái AUD-SEC-538, sót AUD-HAR-321

- Phương án: (1) Sửa một dòng GO-NO-GO trên nhánh theo đề xuất reviewer (ngoài vân tay subject) · (2) Ghi nhận, giữ nguyên
- Chọn: Sửa một dòng GO-NO-GO trên nhánh theo đề xuất reviewer (ngoài vân tay subject)
- Lý do (tiêu chí chất lượng cuối): (1) GO-NO-GO là tài liệu người ký — không ship lời khai sai; sửa không đổi subject.content (GO-NO-GO ngoài vân tay, đã kiểm)
- Đường lùi: Revert commit sửa

### D-397 · 2026-11-08T00:33:49+00:00 · AUD-HAR-325: install.py ghi git_hooks của manifest.json thế nào khi thư mục hook nằm ngoài cây dự án (git worktree, core.hooksPath ngoài)?

- Phương án: (1) Trong cây dự án → tương đối dự án (như cũ); trong git common dir → '.git/' + đường tương đối common dir (vd .git/hooks/pre-commit, đúng với mọi bản sao); ngoài cả hai → 'core.hooksPath/<tên>' (không ghi đường máy) · (2) Chỉ ghi tên hook · (3) Giữ tuyệt đối, sửa tay mỗi lần
- Chọn: Trong cây dự án → tương đối dự án (như cũ); trong git common dir → '.git/' + đường tương đối common dir (vd .git/hooks/pre-commit, đúng với mọi bản sao); ngoài cả hai → 'core.hooksPath/<tên>' (không ghi đường máy)
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: manifest.json được commit — không lộ đường máy, giống nhau giữa bản sao chính và worktree; (2) giữ dạng tương đối cũ cho ca thường; (3) git_hooks chỉ để ghi nhận (AUD-HAR-204), không nơi nào đọc lại nên đổi dạng không phá
- Đường lùi: Revert PR; shown_path ghi tuyệt đối như cũ

### D-398 · 2026-11-08T01:54:45+00:00 · Dùng nguồn nào để xác minh artifact sau deploy trong pilot xboss?

- Phương án: (1) Dùng SHA và health do workflow deploy báo. · (2) Staging cô lập tải archive đúng run, kiểm hash và đối chiếu HTTP với bản cài.
- Chọn: Staging cô lập tải archive đúng run, kiểm hash và đối chiếu HTTP với bản cài.
- Lý do (tiêu chí chất lượng cuối): Chủ dự án chọn staging cô lập ngày 2026-11-08. Hash archive và probe HTTP độc lập kiểm được lỗi tráo artifact hoặc route cũ trong khi dùng dữ liệu giả.
- Đường lùi: Gỡ workflow pilot và bỏ biên nhận staging. Luồng production giữ quyền duyệt hiện hành.

### D-399 · 2026-11-08T02:27:59+00:00 · AUD-HAR-327: đóng đề xuất 'Khi chạy thật' thế nào mà không sửa mục cũ của sổ (LOOP-STOP-019)?

- Phương án: (1) Dòng THÊM mới máy đọc: lệnh 'xt.py loop decide-prod --ref D-NNN --choice …' ghi vào sổ hiện hành một mục có dòng 'Khi chạy thật đã quyết (D-NNN): …'; release-check trừ đề xuất có D-NNN đã có dòng quyết; nhãn cũ giữ nguyên · (2) Đổi nhãn dòng cũ (#477) · (3) Ghi quyết định ở GO-NO-GO §5, máy đọc từ đó
- Chọn: Dòng THÊM mới máy đọc: lệnh 'xt.py loop decide-prod --ref D-NNN --choice …' ghi vào sổ hiện hành một mục có dòng 'Khi chạy thật đã quyết (D-NNN): …'; release-check trừ đề xuất có D-NNN đã có dòng quyết; nhãn cũ giữ nguyên
- Lý do (tiêu chí chất lượng cuối): (1) đúng luật sổ chỉ thêm, dấu vết đầy đủ; máy đếm theo ID nên không lệch bản tháng; (2) đường lùi: xoá mục thêm; (3) một lệnh, test được; phương án 3 trộn hai việc (ký bản và quyết dịch vụ) và dời theo từng bản
- Đường lùi: Revert PR; quay về nhãn đổi tay

### D-400 · 2026-11-08T02:56:02+00:00 · Chủ dự án quyết đề xuất "Khi chạy thật" của D-126: Khi cần nhiều người hoặc dùng trên điện thoại: web app lưu trữ (phương án 3) dùng lại API JSON của SPEC-app, cần chủ repo chọn hosting và đăng nhập

- Phương án: (1) Chuyển theo đề xuất của D-126 · (2) Giữ tự host
- Chọn: giữ tự host xt.py app (cục bộ, không hosting/tài khoản), chưa chuyển sang web app lưu trữ; xét lại khi thật sự cần nhiều người hay dùng trên điện thoại — chủ repo quyết 2026-11-08
- Lý do (tiêu chí chất lượng cuối): chủ dự án quyết ở G7 (GO-NO-GO #18) — điểm dừng về hành động, không phải phiên tự duyệt
- Đường lùi: đổi ý → `loop decide` mới nhắc mục này và D-126 (kèm `--prod` nếu chuyển dịch vụ)
- Khi chạy thật đã quyết (D-126): giữ tự host xt.py app (cục bộ, không hosting/tài khoản), chưa chuyển sang web app lưu trữ; xét lại khi thật sự cần nhiều người hay dùng trên điện thoại — chủ repo quyết 2026-11-08

### D-401 · 2026-11-08T09:40:44+00:00 · Chủ repo 2026-11-08: 'cho agent ký GO-NO-GO' — agent ký §5 thế nào cho đúng và an toàn, áp ở đâu?

- Phương án: (1) Khoá release_signoff: agent theo mẫu ADR-0069 (cây + nhánh chính, HARD_GATED); lệnh xt.py release-sign chỉ ký khi release-check không FAIL BLOCKER, việc người còn lại chỉ là chữ ký, subject khớp; ô tên ghi agent; guard chỉ cho một lệnh đơn chữ rõ; repo khung bật, mẫu dự án đích để trống (opt-in) · (2) Bỏ luật GO_SIGN, agent ghi dòng ký bằng Edit như người · (3) Cùng khoá nhưng mẫu dự án đích bật sẵn agent như stage_approval
- Chọn: Khoá release_signoff: agent theo mẫu ADR-0069 (cây + nhánh chính, HARD_GATED); lệnh xt.py release-sign chỉ ký khi release-check không FAIL BLOCKER, việc người còn lại chỉ là chữ ký, subject khớp; ô tên ghi agent; guard chỉ cho một lệnh đơn chữ rõ; repo khung bật, mẫu dự án đích để trống (opt-in)
- Lý do (tiêu chí chất lượng cuối): Tiêu chí 1 (đúng/an toàn, cách hiểu chặt): chữ ký agent chỉ có khi máy đã đạt mọi hàng BLOCKER và ghi rõ là agent (không mạo danh người, P1); quyền đến từ cấu hình đã commit ở nhánh chính nên phiên không tự cấp; tiêu chí 2: đường lùi một dòng. Dự án đích có thể có người dùng thật/DPIA nên chỉ bật khi chủ dự án chọn (phương án 3 chặt kém hơn).
- Đường lùi: Đặt release_signoff: human hoặc xoá khoá ở xt.yaml (PR người merge); chữ ký agent cũ hết hạn sau release_approval_days

### D-402 · 2026-11-08T10:03:55+00:00 · Phản biện ADR-0074: PR mồi vừa thêm release_signoff vào HARD_GATED_KEYS vừa bật khoá — steward chạy xt.py của main (chưa biết khoá) có thể tự merge; điều kiện ký chưa xét loop defer và quy mô M/L; in-process và --blueprint/--status làm giả release-check; đổi nhánh mặc định dời ruleset khỏi main. Làm gì?

- Phương án: (1) Tách: PR này chỉ thêm mã + khoá dạng chú thích, PR sau bật khoá (người merge); release-sign đòi scale S và không còn loop defer; bỏ --blueprint/--status/--unchecked-must; guard chặn in-process sign/release, đổi nhánh mặc định, MCP ghi thẳng main · (2) Giữ một PR bật luôn khoá, ghi giới hạn vào ADR
- Chọn: Tách: PR này chỉ thêm mã + khoá dạng chú thích, PR sau bật khoá (người merge); release-sign đòi scale S và không còn loop defer; bỏ --blueprint/--status/--unchecked-must; guard chặn in-process sign/release, đổi nhánh mặc định, MCP ghi thẳng main
- Lý do (tiêu chí chất lượng cuối): Tiêu chí 1: khoá nới chỉ có hiệu lực khi người merge một PR mà máy đã biết là khoá chỉ người đổi; điều kiện ký chặt theo cách hiểu an toàn; đóng ba đường làm giả mà phản biện tìm ra. Tiêu chí 2: mỗi phần đảo ngược được bằng revert.
- Đường lùi: Revert từng thay đổi guard/xt.py; khoá vẫn tắt nên không có hiệu lực tới khi PR bật được merge

### D-403 · 2026-11-08T10:39:31+00:00 · Cắt bản sau #472…#479 (decide-prod, AUD-HAR-325/327…331) — 3.33.0 hay 3.32.1, cắt ngay hay chờ PR đang mở (#474, #480)?

- Phương án: (1) 3.33.0 (minor) cắt ngay từ main a09f7a7: thêm lệnh loop decide-prod và mẫu GO-NO-GO #18 trỏ lệnh này (đổi việc dự án đích); AUD-HAR-329 làm GO-NO-GO đã ký của dự án đích về chờ người — vá sớm; PR đang mở vào bản kế · (2) 3.32.1 (patch) cắt ngay · (3) Chờ #480/#474 merge rồi cắt chung
- Chọn: 3.33.0 (minor) cắt ngay từ main a09f7a7: thêm lệnh loop decide-prod và mẫu GO-NO-GO #18 trỏ lệnh này (đổi việc dự án đích); AUD-HAR-329 làm GO-NO-GO đã ký của dự án đích về chờ người — vá sớm; PR đang mở vào bản kế
- Lý do (tiêu chí chất lượng cuối): (1) đúng: SemVer — #478 thêm lệnh mới và đổi mẫu dự án đích, không phải vá thuần; AUD-HAR-329 đang làm chữ ký §5 của dự án đích về pending_human khi ghi quyết định vào bản tháng — giữ lại là để lỗi chạy tiếp; release-check trên main a09f7a7 ra GO (sau unshallow); (2) PR đang mở chưa review/CI đỏ (#480 gitleaks), chờ chúng là treo bản vá vô hạn; AGENTS §7 cắt bản sớm khi đổi việc dự án đích
- Đường lùi: Không merge PR cắt bản; hoặc cắt bản vá sau đó

### D-404 · 2026-11-09T01:53:24+00:00 · PR #480 (release-sign, ADR-0074): kiểm lại bản sửa ac81683 còn 2 🔴 (NO-GO người trên nhánh PR bị xoá rồi ký; dự án thư mục con quét rỗng) và 🟠 (ô Không GO/Hold, đổi VERSION né lọc, dòng NO-GO thiếu ngày, xoá đã lên main). Sửa thế nào?

- Phương án: (1) Quét LỊCH SỬ: release_sign từ chối khi bất kỳ blob GO-NO-GO*.md (mọi thư mục, mọi độ sâu, mọi phiên bản) từng xuất hiện trong lịch sử của mọi ref cục bộ và remote (git log --all) có dòng quyết định của người (tên khác agent) mà ô quyết định không phải GO — kể cả thiếu ngày/ô ?; lời từ chối chỉ hết hiệu lực khi một commit sau nó thêm dòng GO của người, hoặc quá release_approval_days tính từ ngày commit; không đọc được lịch sử → từ chối · (2) Vá từng lỗ trên cách quét hiện có (thêm ref nhánh PR, sửa đường thư mục con, coi ô ? là từ chối, bỏ lọc VERSION) · (3) Bỏ hẳn release-sign khỏi PR này, chỉ giữ nghiên cứu + ADR ở trạng thái Đề xuất
- Chọn: Quét LỊCH SỬ: release_sign từ chối khi bất kỳ blob GO-NO-GO*.md (mọi thư mục, mọi độ sâu, mọi phiên bản) từng xuất hiện trong lịch sử của mọi ref cục bộ và remote (git log --all) có dòng quyết định của người (tên khác agent) mà ô quyết định không phải GO — kể cả thiếu ngày/ô ?; lời từ chối chỉ hết hiệu lực khi một commit sau nó thêm dòng GO của người, hoặc quá release_approval_days tính từ ngày commit; không đọc được lịch sử → từ chối
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: lịch sử git là nơi lời từ chối của người không xoá được bằng commit mới — đóng cùng lúc nhánh PR, xoá đã lên main, đổi tên/đổi VERSION, thư mục con (pathspec theo tên ở mọi độ sâu), dòng thiếu ngày/ô ?; phương án 2 vẫn là danh sách chặn từng lỗ (đã vỡ 2 lần); (2) giữ đường lùi: khoá release_signoff vẫn tắt mặc định, bỏ dòng khoá là về người ký; (3) một luật, test được bằng fixture sẵn có; phương án 3 bỏ yêu cầu của chủ repo (D-401) khi có cách làm đúng. Còn lại có từ trước, ghi nợ: neo tin cậy ref theo dõi cũ (agent không fetch) — cùng lớp release_agent_signoff/_main_key_is
- Đường lùi: Revert commit sửa; hoặc bỏ release-sign (phương án 3)

### D-405 · 2026-11-09T02:15:25+00:00 · D-404 (quét lịch sử lời từ chối GO-NO-GO): hạn hiệu lực theo release_approval_days đọc từ xt.yaml cây làm việc — agent đặt release_approval_days: 1 là mọi NO-GO cũ hết hiệu lực. Giữ hạn thế nào?

- Phương án: (1) Bỏ hết hạn theo tuổi: lời từ chối của người chỉ gỡ bằng một dòng GO của người ở commit sau (thay một phần D-404) · (2) Đưa release_approval_days vào HARD_GATED_KEYS (ảnh hưởng cả promotion) · (3) Hạn = max(cấu hình, 30 ngày) · (4) Đọc khoá cả ở nhánh chính như _main_key_is
- Chọn: Bỏ hết hạn theo tuổi: lời từ chối của người chỉ gỡ bằng một dòng GO của người ở commit sau (thay một phần D-404)
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: không còn tham số agent sửa được trong điều kiện ký; người đã từ chối thì người gỡ — đúng ý ADR-0074 'Giữ: lời từ chối NO-GO'; phương án 3 vẫn hết hạn tự động, 2/4 thêm bề mặt cấu hình; (3) bỏ một nhánh mã và một nguồn cấu hình, test được; (4) dự án có NO-GO cũ mà người chưa ký GO lần nào sau đó thì agent không ký được — người ký một lần là gỡ
- Đường lùi: Khôi phục nhánh hết hạn theo release_approval_days (D-404 nguyên bản)

### D-406 · 2026-11-09T06:03:25+00:00 · PR #480 vòng kiểm 3: quét lịch sử git CỤC BỘ (D-404) lách được bằng lệnh guard cho qua — merge -s ours (giản lược lịch sử), fetch --depth=1 (shallow), branch -rd / filter-branch / push --delete (xoá ref), fetch repo ngoài (GO người lạ gỡ mọi NO-GO); config log.showRoot; gỡ lời từ chối toàn cục; chặn oan GO viết tự do. Neo tin cậy ở đâu?

- Phương án: (1) Neo ở REMOTE: release_sign tự clone --mirror mới của remote origin (gồm refs/pull/*/head GitHub giữ vĩnh viễn) vào thư mục tạm, cấu hình git cô lập (GIT_CONFIG_GLOBAL/NOSYSTEM, -c log.showRoot=true), quét git log --all --full-history -p ở đó; lời từ chối = hợp của bản mirror và lịch sử cục bộ; dòng GO gỡ lời từ chối CHỈ tính từ bản mirror và chỉ gỡ lời từ chối cùng phiên bản (vX.Y.Z trong tên tệp/tiêu đề) hoặc phiên bản lớn hơn; không clone được (mạng, không có origin) → từ chối; nhận ô GO viết tự do (bỏ **, sau GO là dấu câu/chữ) · (2) Vá tiếp trên lịch sử cục bộ: chặn branch -rd/fetch --depth/merge -s ours ở guard, --full-history, lọc ref ngoài · (3) Rút release-sign khỏi PR #480, giữ nghiên cứu + ADR-0074 ở trạng thái Đề xuất, làm lại ở PR riêng
- Chọn: Neo ở REMOTE: release_sign tự clone --mirror mới của remote origin (gồm refs/pull/*/head GitHub giữ vĩnh viễn) vào thư mục tạm, cấu hình git cô lập (GIT_CONFIG_GLOBAL/NOSYSTEM, -c log.showRoot=true), quét git log --all --full-history -p ở đó; lời từ chối = hợp của bản mirror và lịch sử cục bộ; dòng GO gỡ lời từ chối CHỈ tính từ bản mirror và chỉ gỡ lời từ chối cùng phiên bản (vX.Y.Z trong tên tệp/tiêu đề) hoặc phiên bản lớn hơn; không clone được (mạng, không có origin) → từ chối; nhận ô GO viết tự do (bỏ **, sau GO là dấu câu/chữ)
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: agent không viết lại được lịch sử remote (guard chặn force-push, ruleset main) và không xoá được refs/pull/* — đóng cả lớp xoá ref/shallow/rewrite/repo ngoài một lần, thay vì danh sách chặn guard (đã vỡ 3 vòng); GO gỡ chỉ từ remote nên fetch repo ngoài không gỡ được; fail-closed khi offline; (2) đường lùi: khoá release_signoff vẫn tắt mặc định; (3) một nguồn tin cậy, test bằng remote bare cục bộ; (4) chi phí: clone mirror mỗi lần ký — chấp nhận, ký hiếm. Phương án 3 bỏ yêu cầu D-401 khi đã có cách làm đúng. Giới hạn còn lại đã khai: GO_SIGN lọt tên dựng lúc chạy (dòng GO giả tên người) — ranh giới là sandbox
- Đường lùi: Revert commit; hoặc phương án 3

### D-407 · 2026-11-09T07:58:16+00:00 · AUD-SEC-551 (nợ #480): guard cho git push --delete nhánh remote khác main và filter-branch -- --all; NO-GO của người trên nhánh chưa có PR bị xoá thì release-sign ký được. Sửa thế nào?

- Phương án: (1) Guard xếp vào nhóm không đảo ngược (deny): xoá nhánh/tag remote khác nhánh hiện tại của phiên — git push <remote> --delete|-d <ref>, git push <remote> :<ref>, git push --prune, gh api -X DELETE …/git/refs/…; và git filter-branch / filter-repo có --all hoặc --branches/--tags; xoá nhánh của chính phiên (HEAD hiện tại) vẫn cho · (2) Chỉ ghi luật: NO-GO của người phải đi qua PR (refs/pull/*) mới bền; không đổi guard · (3) release-sign từ chối khi reflog/ref theo dõi cục bộ có nhánh remote đã mất
- Chọn: Guard xếp vào nhóm không đảo ngược (deny): xoá nhánh/tag remote khác nhánh hiện tại của phiên — git push <remote> --delete|-d <ref>, git push <remote> :<ref>, git push --prune, gh api -X DELETE …/git/refs/…; và git filter-branch / filter-repo có --all hoặc --branches/--tags; xoá nhánh của chính phiên (HEAD hiện tại) vẫn cho
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: xoá nhánh của người khác và viết lại mọi ref là hành động khó đảo ngược — đúng nhóm máy chặn của ADR-0018, và đóng đường xoá NO-GO khỏi neo D-406; phương án 2 để lỗ mở, 3 không đáng tin (reflog/ref cục bộ agent sửa được); (2) đường lùi: người tự chạy lệnh ngoài phiên; xoá nhánh của chính phiên vẫn được; (3) luật guard test được bằng payload giả + autonomy-bench (đo chặn oan trên corpus)
- Đường lùi: Gỡ luật mới khỏi guard (revert PR)

### D-408 · 2026-11-09T13:20:05+00:00 · AUD-SEC-571 (🔴): cờ ăn giá trị đứng trước lệnh con gh (cobra nhấc lên) lách các luật gh khác (api xoá repo, api xoá ref, api gộp PR, repo edit visibility). Sửa thế nào?

- Phương án: (1) Chuẩn hoá một lần ở đầu _gh_rule: tách cờ ăn giá trị trước lệnh con theo cobra stripFlags rồi dời đường lệnh con lên đầu, mọi luật gh đọc dạng đã chuẩn hoá; giữ cách đọc cũ làm đường chặt (deny nếu một trong hai cách đọc deny) · (2) Vá từng luật (api, các cặp trong GH_ASK)
- Chọn: Chuẩn hoá một lần ở đầu _gh_rule: tách cờ ăn giá trị trước lệnh con theo cobra stripFlags rồi dời đường lệnh con lên đầu, mọi luật gh đọc dạng đã chuẩn hoá; giữ cách đọc cũ làm đường chặt (deny nếu một trong hai cách đọc deny)
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: đóng cả lớp một lần cho mọi luật gh hiện có và sau này — vá từng luật đã để lọt ở AUD-SEC-570 rồi 571; đọc cả hai cách (như push AUD-SEC-102) giữ chiều chặt; (3) một chỗ, test được bằng corpus; (2) đường lùi: revert
- Đường lùi: Revert PR sửa AUD-SEC-571

### D-409 · 2026-11-09T16:03:32+00:00 · AUD-SEC-575/577/578/579 + AUD-DOC-281: ngoài _gh_rule, các nơi khác trong guard đọc lệnh gh nguyên văn (_gh_kind cho alias/extension/lệnh lạ, luật dấu review, luật ghi công AI/tiêu đề PR, luật gửi bí mật) nên cờ đứng trước lệnh con lách được. Sửa thế nào?

- Phương án: (1) Một điểm vào duy nhất: mọi luật đọc lệnh gh nhận dạng chuẩn hoá cobra (đường lệnh con theo cobra stripFlags, KHÔNG phụ thuộc bảng nhóm khi xác định token đầu — để alias/extension/lệnh lạ cũng được nhận đúng) và dạng nguyên văn; quyết định chặt hơn thắng; thay D-408 ở phạm vi (D-408 chỉ áp trong _gh_rule) · (2) Vá từng luật còn lại
- Chọn: Một điểm vào duy nhất: mọi luật đọc lệnh gh nhận dạng chuẩn hoá cobra (đường lệnh con theo cobra stripFlags, KHÔNG phụ thuộc bảng nhóm khi xác định token đầu — để alias/extension/lệnh lạ cũng được nhận đúng) và dạng nguyên văn; quyết định chặt hơn thắng; thay D-408 ở phạm vi (D-408 chỉ áp trong _gh_rule)
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: đã vá từng luật hai lần (570, 571) và vẫn sót ba lớp — một điểm vào đóng cả lớp kể cả luật thêm sau; đọc hai cách giữ chiều chặt; (3) một hàm, test bằng corpus đối chiếu dạng cờ-trước-lệnh-con với dạng chuẩn cho MỌI ca gh đang có
- Đường lùi: Revert PR sửa

### D-410 · 2026-11-10T06:37:59+00:00 · Review #491: phần gỡ chặn oan REVIEW_FORGE (AUD-HAR-364: GH_POST_ARGV_RE, _gh_wrapped điều kiện dương) nới hai đường giả dấu review mà main chặn (lệnh con dính mở rộng rỗng gh pr comment$Z; lệnh trong tham số sh -c và giá trị TÊN=… như GIT_EDITOR). Xử lý thế nào?

- Phương án: (1) Rút phần AUD-HAR-364 khỏi #491, khôi phục hành vi main cho lọc dấu review, thêm test ghim mọi dạng giả dấu reviewer tìm ra (deny REVIEW_FORGE); AUD-HAR-364 về mở, làm lại ở PR riêng với thiết kế chặt · (2) Vá ngay trong #491 (đuôi regex nhận $/backtick, quay về phép thử chữ ghép khi có token động, đọc giá trị TÊN=… như chữ shell)
- Chọn: Rút phần AUD-HAR-364 khỏi #491, khôi phục hành vi main cho lọc dấu review, thêm test ghim mọi dạng giả dấu reviewer tìm ra (deny REVIEW_FORGE); AUD-HAR-364 về mở, làm lại ở PR riêng với thiết kế chặt
- Lý do (tiêu chí chất lượng cuối): (1) đúng và an toàn: REVIEW_FORGE là luật 🔴; gỡ một chặn oan 🟢 không đáng đổi bằng hai đường giả dấu — rút về main là chắc chắn không nới; vá tại chỗ là thiết kế mới chưa được review; (2) đường lùi: PR riêng cho AUD-HAR-364; (3) test ghim giữ chiều chặt cho lần sau
- Đường lùi: Khôi phục phần AUD-HAR-364 ở PR riêng sau review

### D-411 · 2026-11-10T07:46:13+00:00 · AUD-SEC-587 (tên lệnh/cờ gh có mở rộng): ở XT_GUARD_POLICY=strict trả ask/BUDGET hay raise ScanTooComplex (chặn ở mọi chính sách như lớp A ADR-0065)?

- Phương án: (1) ask/BUDGET: mặc định chặn, strict hỏi người; lệnh có dấu review giữ mã REVIEW_FORGE · (2) ScanTooComplex: chặn ở mọi chính sách; ca REVIEW_FORGE đổi thành BUDGET
- Chọn: ask/BUDGET: mặc định chặn, strict hỏi người; lệnh có dấu review giữ mã REVIEW_FORGE
- Lý do (tiêu chí chất lượng cuối): (1) an toàn: không có đường cho qua — mặc định chặn, strict là chế độ người duyệt từng lệnh nên hỏi là đúng ngữ nghĩa strict; (3) giữ mã REVIEW_FORGE chính xác hơn cho lệnh giả dấu, test ghim D-410 không phải đổi
- Đường lùi: Đổi _gh_dyn_name sang raise ScanTooComplex
