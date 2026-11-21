# ADR-0083: Điều phối ba giai đoạn từ bằng chứng của dự án

- **Trạng thái:** Đã chấp nhận ngày 2026-11-20 theo [D-521 của X-Office](https://github.com/www-donghanhcungban-org/X-Templates/blob/3a1cd5471cb1f634656c62369559c4a489a58dcc/docs/autopilot/DECISIONS.md).

## Bối cảnh

Chủ dự án muốn ra MVP nhanh để dùng thử, hoàn thiện sau khi duyệt và tối ưu bằng số đo.
Khung đã có sổ giai đoạn, vòng làm việc, cổng phát hành và receipt. Khi nối lại phiên,
agent cần biết bản nào đang chờ, ai có thể quyết định và phần việc nào còn làm ngay được.

## Quyết định

Giữ sổ hiện tại cho từng quyết định. Phương án tạo thêm một bộ điều phối có sổ trạng thái
riêng đòi đồng bộ lại các lần trình, mở lại và phê duyệt. Thay vào đó, `xt_flow.py` đọc
trạng thái của checkout để đề xuất bước kế. Chỉ gán thời gian hoặc kết quả cho bằng chứng
đã quan sát. Chi phí theo lát, xung đột trước merge và lỗi lọt ra ngoài cần nguồn đo riêng.

| Mốc | Bằng chứng và hành động |
|---|---|
| Ý tưởng, nghiên cứu, đặc tả và thiết kế | Chốt người dùng, một luồng có thể thử, giả định và phạm vi nghiệm thu đã review ở một commit Git trước khi viết tính năng. |
| MVP | Chạy bộ nghiệm thu từ mốc đã duyệt trước và sau khi viết mã. Trình SHA cùng bản dev dùng thử. Phản hồi cần sửa mở lại đúng giai đoạn. |
| Hoàn thiện | Chạy harden, audit và cổng phát hành. Dự án bật deploy dev phải có receipt đang hiệu lực trùng nội dung và digest của artifact. Diễn tập đối chiếu quyền, nhánh và ứng viên để chuẩn bị phát hành. |
| Tối ưu, production, vận hành và tăng trưởng | Đăng ký chỉ số và baseline. So cùng điều kiện, nghiệm thu lại rồi phát hành ứng viên đã tối ưu qua pipeline được cấp quyền. Dùng cửa sổ đo và receipt ở đích để chọn việc sửa lỗi hoặc thử nghiệm tăng trưởng. |

Công cụ xác minh mốc nghiệm thu phải đến từ checkout đã tin cậy. Máy kiểm được nội dung
file và kết quả thực thi. Chủ dự án hoặc chính sách đã cấu hình xác định thẩm quyền duyệt.
Pilot giữ bản MVP ở trạng thái chờ. Bản sao dùng sự kiện mô phỏng để kiểm các vòng tiếp theo.
Kết quả đo và cách chạy lại ở [pilot sửa chữa](../../research/2026-11-20-factory-repair-pilot.md).
Chỉ pipeline được cấp quyền tại đích mới thực hiện phát hành và ghi bằng chứng từ production.

## Xét lại kích thước của công cụ

Nhóm `scripts/*.py` và `scripts/xt_app/` đã vượt ngưỡng xét lại 1 423 648 byte của ADR-0072 khi bổ sung bộ
đọc trạng thái, kiểm phạm vi nghiệm thu và diễn tập. Số đo Git trên nhánh chính trước thay đổi làm mốc mới.

| Nhóm đo | Mốc xét lại mới | Commit của phép đo | Trần byte |
|---|---:|---|---:|
| `scripts/*.py` và `scripts/xt_app/` | 2026-11-20 · 1 414 300 | `6ed37a8bf8140c3e9f65dee17cfb2d6cdc3a8486` | 1 760 431 |

Tổng kích thước tính theo blob Git trong phạm vi của `DIR_CAPS`. Giữ trần tuyệt đối, các mốc cũ và phép
kiểm 2×. Dồn toàn bộ vào `xt.py` cũng tốn ngân sách đó và buộc lệnh thông thường nạp thêm mã.
Các công cụ chạy riêng dùng module riêng. Thời gian nạp, kích thước và số ca hồi quy vẫn đo được ở CI.
Nếu kích thước chạm trần tuyệt đối, cần thu gọn mã trước khi bổ sung chức năng.

## Hệ quả và đường lùi

Repo mới và repo đang làm dùng cùng sổ. Dự án cũ chưa bật deploy dev vẫn dùng cổng hiện tại.
Cài lại khung để nhận công cụ. Khôi phục công cụ bằng phiên bản trước của khung khi cần.
Các lệnh `stage`, `loop` và `perf trial` tiếp tục làm việc với sổ đã có.

Phạm vi và cổng còn lại cho worker ngoài phiên, nghiệm thu độc lập đầy đủ và pilot production
nằm trong [kế hoạch factory](../autopilot/PLAN-factory-e2e.md).
