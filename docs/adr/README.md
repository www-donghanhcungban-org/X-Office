# ADR của X-Office

X-Office là dự án độc lập, không còn đồng bộ với X-Templates (D-9007). ADR `0001`–`8999` là lịch sử kế thừa, giữ nguyên số;
ADR mới nối tiếp dải `9001+`.

- **Số ADR kế tiếp** là số lớn nhất của dải `9001+` cộng 1 (hiện đã có ADR-9004); không dùng lại số `00xx`
  ([D-9001](../autopilot/DECISIONS.md)).
- **Quyết định `D-NNN`**: số kế = max+1 của sổ (`loop decide`), nên tự tiếp nối `D-9001+`; `D-NNN` dưới 9000 là lịch sử kế thừa.
- Đổi ý về một ADR đã chấp nhận: viết ADR mới, ADR cũ chỉ đổi dòng trạng thái (`/adr`).
- Tài liệu lịch sử (ADR `0001`–`8999`, `docs/archive/`, `research/`, báo cáo audit, PLAN đã xong, GO-NO-GO đã ký) ghi tên
  repo là **X-Office**; tên `.xtemplates/`, `xt.py`, `xt.yaml` là định danh kỹ thuật giữ nguyên
  ([ADR-0006](0006-keep-technical-identifiers-after-rename.md)); liên kết ngoài tới repo khác giữ nguyên.

| Số | Quyết định |
|---|---|
| [ADR-9001](9001-office-view-renderers.md) | Màn Văn phòng của `xt.py app`: Canvas 2D mặc định, three.js vendor tuỳ chọn (trước là ADR-0082) |
| [ADR-9002](9002-release-line.md) | Dòng phát hành riêng từ 1.0.0: ranh giới CHANGELOG, `LEGACY_RELEASE_TAGS`, registry `legacy-line` — registry và `legacy-line` bị thay một phần bởi ADR-9004 |
| [ADR-9003](9003-release-line-upgrade.md) | Nâng bản qua ranh giới dòng (`install.py`); `legacy-line` vẫn là lệch — bị thay bởi ADR-9004 |
| [ADR-9004](9004-remove-target-registry.md) | Gỡ registry sản phẩm đích (`xt.py registry`, màn Registry, `legacy-line`) và nâng bản qua ranh giới dòng |
