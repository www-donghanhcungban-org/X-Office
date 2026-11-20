# ADR của X-Office

X-Office là bản phái sinh của [X-Templates](https://github.com/www-donghanhcungban-org/X-Templates): ADR `0001`–`8999`
là ADR của X-Templates, nhận về qua đồng bộ (merge commit) và giữ nguyên số.

- **ADR riêng của X-Office dùng dải `9001+`** ([D-9001](../autopilot/DECISIONS.md)) — số tiếp theo là số lớn nhất trong
  dải này cộng 1, không nối tiếp dãy `00xx` (dãy đó là của X-Templates; dùng số ở đó sẽ trùng ở lần đồng bộ sau).
- **Quyết định `D-NNN` cũng chia dải**: `D-9001+` là quyết định riêng của X-Office (số kế = max+1 của sổ, nên tự nằm
  trong dải); `D-NNN` dưới 9000 — kể cả trong ADR `0001`–`8999` — là của X-Templates, `D-521` trong ADR-0083 là quyết định
  factory của X-Templates (AUD-DOC-306).
- Đổi ý về một ADR đã chấp nhận: viết ADR mới, ADR cũ chỉ đổi dòng trạng thái (`/adr`).
- **Tài liệu lịch sử giữ chữ X-Templates** (ADR `0001`–`8999`, `docs/archive/`, `research/`, báo cáo audit, PLAN đã xong,
  GO-NO-GO đã ký): đó là sự kiện xảy ra trước khi X-Office tách ra (2026-11-19) — không đổi chữ hàng loạt (AUD-DOC-305);
  đổi tên cũng làm mọi lần đồng bộ upstream xung đột ở từng tệp.

| Số | Quyết định |
|---|---|
| [ADR-9001](9001-office-view-renderers.md) | Màn Văn phòng của `xt.py app`: Canvas 2D mặc định, three.js vendor tuỳ chọn (trước là ADR-0082) |
