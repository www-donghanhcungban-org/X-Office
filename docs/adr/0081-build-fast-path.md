# ADR-0081: Đường nhanh pha build — quy mô mặc định S và ghim phiên bản khung

- **Trạng thái:** Đã chấp nhận ngày 2026-11-19 (D-511).
- **Trạng thái triển khai:** Mã và test ở #673, phát hành ở 3.34.0 (tag `v3.34.0`, 2026-11-19). Dự án đích nhận khi nâng khung: X-Company #114, xboss #747, dhcb #1506 đã nâng 3.34.0; hotel-manager #159 chờ chủ dự án xử lý check đỏ có từ trước. Nâng kèm bước CI `actions/setup-python` 3.15.2 (ADR-0078) ở workflow gọi `xt.py`. Nợ: AUD-HAR-440 (`/complete` chưa chạy lại `doctor` sau khi đặt `harden`, D-515).

## Bối cảnh

Chủ dự án 2026-11-19: *"code nhanh nhất là được, xong rồi tạo PR, chờ cắt bản xong rồi triển khai"*. Số đo cùng ngày ở
bốn dự án đích ([nghiên cứu](../../research/2026-11-19-target-project-speed.md)) cho thấy khâu viết mã không phải
nghẽn; hai khoản việc do chính khung gây ra chiếm phần lớn thời gian sau những ngày đầu:

- **Quy mô M từ ngày đầu.** `xt.py compose` mặc định `--scale M`, và bảng chọn quy mô hỏi "có người dùng thật ngoài đội
  phát triển?" — agent lập kế hoạch cho sản phẩm *sẽ* có người dùng nên chọn M khi chưa có ai dùng. Blueprint `web-app`
  có 473 MUST ở M so với 70 ở S; hai dự án xây từ đầu đều ở M, còn 73–78 MUST mở sau ba tuần, chưa có bản chạy.
  Chỉ `install.py --new` mặc định S.
- **Nâng khung mỗi phiên.** `doctor` (bước đầu của `/autopilot`) cảnh báo mỗi khi có tag mới hơn, và "⚠ là việc của
  phiên". Khung ra 53 tag trong 24 ngày; nâng khung chiếm 16–22 % commit nhánh chính ở hai dự án đó.

## Phương án đã xét

1. Giữ nguyên, chỉ viết hướng dẫn "nên chọn S". Mặc định của máy vẫn kéo về M và vẫn nhắc nâng khung; hướng dẫn đã có
   ở `composition.md` mà không đổi được kết quả.
2. Đổi mặc định của máy theo pha: `compose` mặc định S, `doctor` không cảnh báo chậm bản trong pha build; phần nặng dồn
   về ranh giới pha (`/complete`), nơi cổng phát hành đã có.
3. Thêm fact phủ định cho `compose` để bỏ cả module không áp dụng. Đo lại: ở S blueprint chỉ còn baseline và hồ sơ
   (không mục AI/realtime nào) nên phương án 2 đã bỏ gần hết hồ sơ miễn trừ; không làm.

## Quyết định

Chọn phương án 2.

1. **Quy mô theo hiện trạng, không theo dự định.** `xt.py compose` không `--scale`: giữ quy mô của bản đã ghép ở `--out`
   (ghép lại không ngầm hạ M/L xuống S), chưa có bản nào thì S; stderr in một dòng nói rõ nguồn. Bảng chọn quy mô
   ([`composition.md`](../../framework/00-method/composition.md)) hỏi về hiện tại: **đang** có người dùng, tiền hay dữ
   liệu thật thì M/L ngay; chưa thì S ở pha build và lên M ở `/complete` bước 1, trước khi phát hành cho người dùng thật.
2. **Ghim khung trong pha build.** `doctor` ở dự án `delivery_phase: build` không cảnh báo khi bản cài chậm MINOR/PATCH;
   vẫn cảnh báo khi chậm MAJOR. Ở harden (và khi khoá vắng hay lạ) cảnh báo như cũ, nên `/complete` nâng khung một lần
   ở ranh giới pha. `doctor --drift` vẫn báo mọi độ chậm ở cả hai pha.

## Hệ quả

- Dự án mới vào bằng `/autopilot` làm 70 MUST sàn thay vì 473 trong lúc xây; MUST của M được làm ở harden, vẫn trước
  `release-check`. Cổng phát hành không đổi: quy mô khai ở blueprint vẫn quyết định sàn Gate và hàng `blueprint`.
- Dự án đang ở M/L không đổi gì: ghép lại không `--scale` giữ quy mô cũ.
- Bản vá guard tới dự án đang ở pha build chậm hơn (tới ranh giới pha hoặc khi người/agent chủ động chạy `install.py`).
  Chấp nhận: pha build kéo dài vài ngày theo số đo, và bản MAJOR vẫn được nhắc.
- Rủi ro chọn S cho sản phẩm thật sự đã có người dùng: bảng chọn quy mô và `/complete` bước 1 là hai chỗ chặn; máy
  không tự biết có người dùng thật hay chưa.

Đường lùi: `compose --scale M` ghi rõ ở dự án; khôi phục mặc định cũ bằng revert PR của ADR này (không đổi dữ liệu).
