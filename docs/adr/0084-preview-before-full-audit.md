# ADR-0084: Trình MVP dùng thử trước audit tổng thể

- **Trạng thái:** Đã chấp nhận ngày 20/11/2026 theo D-522.

Trên một repo mới, `loop verify --all` có thể đã xác nhận PLAN trong khi `loop next-step` vẫn đòi audit toàn bộ rồi lập đợt công việc cho mọi MUST. Lần chạy pilot trước gọi trực tiếp `stage submit`, nên chưa kiểm được đường này.

Với giai đoạn 1, `delivery_phase: build`, blueprint S và `preview_smoke` có lệnh thực thi, bộ điều phối trình bản dev sau khi vòng lặp xác minh đúng cây và trạng thái PR đã được đối chiếu. Lệnh trình vẫn chạy smoke và ghim SHA. Phát hiện đang mở thuộc diện phải sửa và lỗi cấu trúc sổ vẫn phải được xử lý. Checklist ngoài PLAN, nhóm chưa quét và nợ phạm vi audit được giữ trong sổ cho giai đoạn 2. Bản trình quay lại giai đoạn 1 nếu người dùng yêu cầu sửa.

Trong pha hoàn thiện, khi đã có sổ đọc được và nhóm đã quét, bộ điều phối đưa các việc đã biết vào PLAN trước lượt rà thay đổi. Khi hết việc, audit và các cổng phát hành vẫn kiểm ứng viên. Mỗi PR tập trung vào một kết quả kiểm được, các commit có thể chia nhỏ để dễ sửa hoặc hoàn tác. Chính sách nhánh đích quyết định khi nào cần reviewer.

Phương án rút ngắn bằng cách tắt kiểm thử cho mọi PR làm mất bằng chứng của từng thay đổi. Thay đổi thứ tự cho phép kiểm cùng các điều kiện phát hành ở ứng viên cuối. Có thể phục hồi thứ tự cũ bằng cách hoàn tác thay đổi bộ chọn bước. Sổ giai đoạn và sổ audit dùng lại được.
