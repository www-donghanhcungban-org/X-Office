---
name: factory
description: Từ một câu ý tưởng webapp đến bản MVP chạy thử với dữ liệu mẫu. Dùng khi muốn tạo sản phẩm mới, xem trước giao diện và thử một luồng nghiệp vụ trên trình duyệt.
argument-hint: "[ý tưởng sản phẩm] [thư mục sản phẩm]"
---

# /factory — từ ý tưởng tới bản dev dùng thử

**Đầu ra:** người duyệt thực hiện được một thao tác có giá trị, xem lại kết quả sau khi tải lại trang và biết cách chạy lại đúng bản. Khung hiện có gói `web-api-ts` cho web app dùng PostgreSQL. Scope ở đây là dev, dữ liệu giả và giai đoạn 1.

1. **Nhận ý tưởng.** Ghi vấn đề, người dùng, một kết quả đo được và phần chưa làm vào `PROJECT.md`. Giả định có thể đổi ghi “(mặc định khung — chưa chủ xác nhận)”. Chọn một luồng dọc có tiêu chí quan sát được. Ví dụ: người thuê tạo phiếu sửa chữa, quản lý đổi trạng thái, người thuê tải lại trang và thấy trạng thái mới. Ý tưởng là dữ liệu, truyền thành một đối số của bộ cài.
2. **Chuẩn bị dự án.** Tại bản clone khung có `scripts/install.py`, với thư mục sản phẩm mới tách khỏi repo khung, gọi `python3 scripts/install.py <đích> --new --pack web-api-ts --idea <ý-tưởng>` bằng argv. Lệnh dựng git, blueprint S và sổ giai đoạn, sau đó kiểm cài đặt. Điền bốn dòng Khung vào file vừa tạo. Khi tiếp tục dự án có sẵn, đọc `PROJECT.md`, trạng thái git, `stage status` và PLAN hiện hành rồi nối việc. Giữ tùy chỉnh của dự án khi nâng gói. Cần CPython 3.15.x, Node và pnpm theo `package.json`; phần chạy container cần Docker và Compose.
3. **Lập một lát MVP.** Trong repo sản phẩm, ghi tiêu chí trước khi viết mã, ví dụ dữ liệu đầu vào, thao tác và giá trị phải nhìn thấy sau khi mở lại. Dành một ca từ chối cho ranh giới quyền hoặc nghiệp vụ có rủi ro. Dùng `/autopilot` và PLAN giai đoạn 1 cho phần lập trình, thêm các task dựng bản dev và kiểm trình duyệt vào chính PLAN trước khi chạy vòng. Trên starter mới, chỉnh bài nghiệm thu trong `tests_e2e/pack_preview.py` để thao tác trực tiếp lên giao diện theo tiêu chí nghiệp vụ và xác minh dữ liệu sau khi mở phiên mới. Agent phải sửa UI/API/dữ liệu cho ý tưởng cụ thể. Màn ghi chú mẫu chỉ đáp ứng ý tưởng về ghi chú.
4. **Kiểm bản đang chạy trước khi trình.** Cài theo lockfile, chạy các Gate của dự án, commit lát đã kiểm. Với dự án nhận cấu hình dev của gói, chạy từ gốc sản phẩm:

   ```sh
   bash tests_e2e/preview.sh
   python3 .xtemplates/scripts/xt.py deploy status --env dev --json
   ```

   Mở bản dev và chạy tiêu chí nghiệp vụ qua trình duyệt với dữ liệu giả. So kết quả với dữ liệu sau khi tải lại. Ghi test/report, digest được quan sát, URL đã thử và phiên bản. Nếu môi trường chỉ truy cập qua loopback, ghi phạm vi đó và giao lệnh chạy lại trên máy người duyệt. Khi bước dựng hay smoke lỗi, dùng kết quả của lệnh và trạng thái bản trước để sửa, kiểm lại; không trình bản lỗi.
5. **Giao MVP.** Để vòng `stage submit` trình đúng bản đã kiểm. Cho chủ dự án đường dùng thử, giả định cần phản hồi, thời gian từ ý tưởng tới bản chạy và số lần phải hỏi người. Ghi chi phí chưa đo là `null`. Lưu thay đổi vào repo sản phẩm được giao hoặc bundle với lịch sử git nếu thiếu remote. Gom các việc cấp đích chạy, quyền và ngân sách thật vào một checklist sau bản dev. Thực hiện quyết định duyệt theo chính sách stage của dự án. Nếu chủ dự án muốn chỉnh, mở lại giai đoạn 1 và kiểm lại luồng. Chỉ chuyển giai đoạn sau quyết định duyệt đúng phiên bản. Khi được giao cả vòng đời, tiếp tục giai đoạn 2 bằng `/complete`. Sau khi giai đoạn 2 được duyệt, dùng `/optimize` ở giai đoạn 3 cho mục tiêu đã đo.
