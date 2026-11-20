# Pilot nghiệp vụ báo sửa chữa

Lượt chạy bắt đầu lúc 23:51:35 UTC ngày 2026-11-19, tức sáng 20/11 tại Việt Nam. Từ nền `6ed37a8bf814` và thay đổi trong nhánh này, một repo mới của gói `web-api-ts` đã trình bản MVP. Trạng thái thật là **giai đoạn 1, chờ chủ dự án duyệt**. Sổ ở repo này có 0 sự kiện phê duyệt. Không có triển khai production.

## Hành trình đã quan sát

Chromium đăng nhập bằng tài khoản cư dân, gửi “Vòi nước rò” cho phòng A-101 và nhận ID cùng HTTP 201. Trong một phiên trình duyệt mới, cư dân thấy ID đó ở trạng thái `open`. Quản lý cùng tòa nhà tìm đúng yêu cầu, đánh dấu đã sửa và nhận HTTP 200. Cư dân đăng nhập lần nữa và thấy `resolved`. API trả 404 khi cư dân tòa khác đọc yêu cầu, 403 khi người đó hoặc chính người gửi gọi thao tác của quản lý.

Bộ kiểm tra được ghi ở commit sản phẩm `645f9e067f22` trước mã nghiệp vụ. Lần trình đầu thất bại vì chưa có trang sửa chữa. Công cụ kiểm tra của khung phát hiện khi sửa một byte trong SPEC. SPEC, thư mục nghiệm thu và cấu hình `xt.yaml` khai lệnh smoke đều khớp mốc ban đầu tại cả ba bản trình.

## Số đo của một lần chạy cục bộ

| Bản chạy | Công việc đã nghiệm thu | Thời gian vòng | SHA-256 gói ứng dụng (12 ký tự đầu) |
|---|---|---:|---|
| Repo sản phẩm · MVP | Tạo yêu cầu, phân quyền, xử lý, đọc lại | 51.54 s | `9efbf07e1d8f` |
| Bản sao kiểm thử · hoàn thiện | Lưu `resolved_at`, trả 409 khi xử lý lại | 30.29 s | `34e77bffaeb8` |
| Bản sao kiểm thử · tối ưu | Đọc 50 yêu cầu gần nhất qua index theo tòa nhà | 37.79 s | `db4f0e62b6f3` |

Lệnh khởi tạo repo mất 5.62 s. Từ khởi tạo đến khi trình MVP mất 79.06 s. Toàn bộ lần phát lại mất 169.14 s, gồm cài phụ thuộc từ cache, build, hook commit và mở trình duyệt. Mã sản phẩm và kịch bản kiểm thử đã được viết trước. Thời gian phát triển, thời gian chờ chủ dự án và chi phí mô hình chưa đo được. Trong lần phát lại có 0 lượt hỏi người dùng, 2 lần đỏ có chủ ý trước khi viết tính năng (smoke của bản trình và Gate của task) cùng 3 lần chặn agent tự duyệt.

Hai vòng sau chạy trên bản sao Git và cơ sở dữ liệu PostgreSQL riêng. Cả ba bản đều khởi động ứng dụng Node từ `dist/app.tgz` đã giải nén, dùng Chromium và kiểm tra qua HTTP. Để đi tiếp trong bản sao, bài thử đưa ba sự kiện mang tác nhân `SIMULATED_REVIEWER_TEST_ONLY` vào máy trạng thái kiểm thử. Các sự kiện đó chỉ tồn tại trong bản sao. Trên 12.000 yêu cầu thêm vào để đo, PostgreSQL trả 50 hàng. Một lần `EXPLAIN ANALYZE` trước và sau index lần lượt ghi 14.564 ms với `Seq Scan → Sort → Limit` và 0.064 ms với `Index Scan → Limit`.

## Bằng chứng từ vòng MVP

PLAN đã chốt task T-001 trước mã nghiệp vụ. `loop init` mở vòng, `loop next` chọn task và `loop record` giữ task mở khi trang sửa chữa chưa tồn tại. Sau khi mã được build, Gate chạy trên gói đã giải nén. `loop record` chỉ đánh dấu hoàn tất khi Chromium xác minh đầy đủ hành trình. Sau commit, `loop verify --all` thực thi lại Gate trên đúng cây. Khi `stage submit` chạy smoke lần nữa và ghi nhận kiểm tra cuối, `xt_flow.py --json` giao hành động `check-approval-policy` cho `coordinator`. Repo mới khai `stage_approval: agent` nhưng chưa có xác nhận quyền từ nhánh chính của remote. CLI đã từ chối agent duyệt và bản trình vẫn chờ. Số lượt ghi Gate là 2, trong đó 1 lượt đỏ. Hai vòng sau trong bản sao dùng cổng bản trình.

## Chạy lại

Job sạch của `pack-web-api` chạy `python tests_e2e/factory_lifecycle.py --output "$RUNNER_TEMP/factory-repair-pilot.json"` và tải artifact `factory-repair-pilot`. Để chạy cục bộ, dùng Python 3.15 với Playwright theo lock của gói, Chromium, Node 24, pnpm 12 và PostgreSQL cục bộ. `DATABASE_URL` trỏ vào một cụm kiểm thử có quyền tạo database. Runner tự tạo rồi dọn hai database có tên ngẫu nhiên. Tùy chọn `--work-dir <thư-mục-mới>` giữ hai cây Git để kiểm tra lịch sử nộp bản.
