# ADR-0080: Pha harden vét việc trước, audit và rà độc lập gom về cổng ký

- **Trạng thái:** Đã chấp nhận ngày 2026-11-16 (chủ dự án: "lặp đi lặp lại cho đến khi xong mọi việc, không review-alt
  cho đến khi ký GO-NO-GO mới audit và trả hết nợ mới ký GO"; phiên chính tự duyệt cách máy hoá — D-494).
- **Trạng thái triển khai:** Tài liệu và skill (`/complete`, `orchestration-and-subagents.md`, README mảng 11). Máy không
  đổi: `pr next`, `release-check` hàng `audit`/`review_debt`, `loop next-step --objective harden-to-signoff` đã đủ.
  Cập nhật (2026-11-17, D-500, AUD-HAR-412): máy có đổi — `loop status` ở pha harden trả `milestone_audit: signoff`
  (audit dồn về cổng ký) thay vì đòi audit delta theo mốc; pha build giữ `now|g7` (ADR-0033).
- **Sửa:** ADR-0046 (thứ tự bước của `/complete`: audit và nợ review rời đầu pha về cổng ký). **Giữ:** ADR-0062 (review
  1 lần: 🔴 sửa, 🟠/🟢 ghi nợ), ADR-0079 (`merge_review`), ADR-0057 (`review_debt`), ADR-0009 (một phiên tới khi xong).

## Bối cảnh

Đo ở phiên 2026-11-16 (repo khung, pha harden, `merge_review: optional`):

- Phiên "tiếp tục" làm lát khi **không có vòng sống** (`loop status`: `budget`, gắn phiên khác). Stop hook chỉ giữ phiên
  đã gắn nên mỗi lần chờ CI hay reviewer là một lần phiên ngừng lượt.
- Phiên chính gọi `reviewer-alt` cho từng PR guard dù `pr next` không đòi (hàng "phiên chính thấy rủi ro cụ thể" của
  bảng điều phối). Hai PR (#595, #596) sinh 5 mục 🔴 mới, mỗi mục kéo thêm một PR và một lượt chờ.
- `/complete` đặt audit và nợ review ở **đầu** pha. Mọi lát sửa sau đó lại thành nợ review mới, nên cổng ký luôn phải rà
  thêm một lượt nữa.

Nhánh chính chưa phải bản phát hành: dự án đích chỉ nhận tag. Lỗi lọt qua một PR giữa pha harden vì thế không ra khỏi
repo trước khi `release-check` và chữ ký chặn nó.

## Phương án đã xét

1. Giữ như cũ — audit đầu pha, reviewer theo phán đoán từng PR. Vòng không hội tụ như đã đo.
2. **Vét việc trước, rà một lần ở cổng ký** (chọn).
3. Bỏ rà độc lập, chỉ còn CI và `release-check`. Mất lớp rà trước chữ ký; trái ADR-0062.

## Quyết định

Pha harden lặp hai nhịp cho tới khi `release-check` GO:

1. **Vét việc.** PLAN-harden lập từ sổ audit **đang có** (🔴/🟠 mở, nợ review mở), MUST blueprint mở, sàn Gate và hàng
   FAIL của `release-check`; chỉ audit `full` khi chưa có sổ. Vòng chạy trên vòng sống (`loop init`/`loop attach` trước
   lát đầu tiên): task → Gate (`loop record`) → commit → PR → `pr next` → `merge-watch` nền → **task kế ngay**. Chờ CI,
   chờ merge không phải lý do ngừng lượt. Trong nhịp này không audit, không gọi `reviewer`/`reviewer-alt`; ngoại lệ duy
   nhất là `pr next` trả `review` (nhánh đích đặt `merge_review: required`). `milestone_audit: now` được gom về nhịp 2.
2. **Cổng ký.** Khi Stop hook trả `done` và PR của đợt đã merge: `/audit delta` từ SHA quét gần nhất (xác minh đối kháng
   🔴/🟠), rồi trả nợ review **theo lô trên diff tích luỹ** từ SHA đó (không theo từng PR — thay đổi trung gian triệt
   tiêu nhau; chia cụm theo file/module, các `reviewer-alt` chỉ đọc chạy song song). Phát hiện vào sổ. Sau đó
   `release-check --json` → `loop next-step --objective harden-to-signoff`: `replan` → PLAN-harden kế, quay lại nhịp 1;
   `signoff-package` → `GO-NO-GO.md` → ký.

**Hội tụ.** Lượt cổng ký thứ hai trở đi chỉ rà diff của các bản sửa kể từ lượt trước. Phát hiện "có từ trước" nằm ngoài
diff đó vào sổ và đi theo luật sổ (sửa, hoặc `chấp nhận` có hạn kèm D-NNN, hoặc `bác bỏ` có bằng chứng) — không mở lại rà
toàn bộ. Ký chỉ khi `release-check` không FAIL; điều kiện chữ ký không đổi (ADR-0048, ADR-0074).

## Hệ quả

- Ít lượt reviewer hơn và không còn ngừng giữa pha; đổi lại lỗi của một PR có thể nằm trên nhánh chính tới cổng ký.
  Đường chặn: không cắt tag, không triển khai từ nhánh chính khi `release-check` còn FAIL (đã là luật G7).
- Diff tích luỹ lớn → lượt rà ở cổng ký nặng hơn một PR. Chia cụm giữ mỗi reviewer trong ngân sách context.
- Dự án muốn review từng PR đặt `merge_review: required`; `pr next` trả `review` và nhịp 1 tuân theo.
- Pha build không đổi (ADR-0033/0047: build → audit delta cuối đợt → đợt kế).

Đường lùi: revert ADR này cùng skill `/complete`.
