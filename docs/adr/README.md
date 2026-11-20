# ADR của X-Office

X-Office là bản phái sinh của [X-Templates](https://github.com/www-donghanhcungban-org/X-Templates): ADR `0001`–`8999`
là ADR của X-Templates, nhận về qua đồng bộ (merge commit) và giữ nguyên số.

- **ADR riêng của X-Office dùng dải `9001+`** ([D-521](../autopilot/DECISIONS.md)) — số tiếp theo là số lớn nhất trong
  dải này cộng 1, không nối tiếp dãy `00xx` (dãy đó là của X-Templates; dùng số ở đó sẽ trùng ở lần đồng bộ sau).
- Đổi ý về một ADR đã chấp nhận: viết ADR mới, ADR cũ chỉ đổi dòng trạng thái (`/adr`).

| Số | Quyết định |
|---|---|
| [ADR-9001](9001-office-view-renderers.md) | Màn Văn phòng của `xt.py app`: Canvas 2D mặc định, three.js vendor tuỳ chọn (trước là ADR-0082) |
