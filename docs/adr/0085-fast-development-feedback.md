# ADR-0085: Rút ngắn vòng phản hồi khi viết mã

- **Trạng thái:** Đã chấp nhận ngày 20/11/2026 theo D-523.

Gói web chạy cây đang sửa trên loopback và đọc lại ba tài sản giao diện khi nhận request. Node theo dõi module TypeScript được import, Vitest theo dõi quan hệ giữa mã và test. Bản để xét duyệt vẫn được đóng gói, triển khai và kiểm qua trình duyệt như ADR-0084. Dự án đang có mã dùng lệnh phát triển của chính dự án. [Node 24](https://nodejs.org/download/release/v24.22.2/docs/api/cli.html#--watch) · [Vitest](https://vitest.dev/guide/lifecycle#watch-mode-lifecycle) (đối chiếu ngày 20/11/2026).

Ở khung, sáu job test của [lượt CI trên main](https://github.com/www-donghanhcungban-org/X-Office/actions/runs/44655863393) mất 218–481 giây. Chia shard đã xét thời lượng nhưng bước xếp việc trong mỗi shard lại xếp tên. Giữ thứ tự nặng trước để giảm thời gian worker chờ lớp cuối. Với PLAN, nhóm theo khóa lệnh có sẵn trong một lần duyệt; mỗi lần verify vẫn kiểm bằng chứng của từng task.

Cả ba thay đổi có thể hoàn tác riêng. Không thay điều kiện duyệt hoặc định dạng bằng chứng. So nhiều lượt CI cùng loại trước khi kết luận về thời gian từ PR tới merge.
