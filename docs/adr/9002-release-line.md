# ADR-9002: Dòng phát hành riêng của X-Office bắt đầu từ 1.0.0

- **Trạng thái:** Đã chấp nhận ngày 2026-11-21 (phiên chính tự duyệt theo ADR-0008, D-9008).
- **Làm rõ:** ADR-0056 (cắt bản, `release-tag.yml`), ADR-0068 (registry sản phẩm), D-9007 (độc lập khỏi X-Templates).

## Bối cảnh

X-Office là dự án độc lập (D-9007) nhưng `VERSION` vẫn là 3.34.0 của X-Templates; repo có tag kế thừa `v0.15.1`…`v0.19.0`
và `v3.34.0`, không có `v1.x`/`v2.x`. Đặt `VERSION` = 1.0.0 làm vỡ ba công cụ: `changelog-check` (bản phải giảm dần qua
toàn bộ CHANGELOG và lưu trữ), `doctor`/`doctor --drift` (`v3.34.0` luôn là tag lớn nhất nên không bao giờ báo bản
mới) và `registry --strict` (sản phẩm ở lõi 3.34.0 bị tính `ahead`).

## Phương án

1. **Tiếp số dòng X-Templates sau 3.34.0**: không cần sửa công cụ; nhưng số bản tiếp tục gắn với X-Templates, trái D-9007.
2. **Dòng riêng từ 1.0.0, công cụ hiểu ranh giới dòng**: sửa ba chỗ trên, mỗi chỗ chỉ bật khi có dấu hiệu dòng kế thừa.

## Quyết định

Chọn **2** (D-9008). Dòng kế thừa X-Templates kết thúc ở 3.34.0 (CHANGELOG và tag `v3.34.0` giữ nguyên); bản phát
hành đầu của X-Office là 1.0.0, gồm toàn bộ thay đổi sau 3.34.0.

- CHANGELOG: heading `## Dòng kế thừa X-Templates (đến X.Y.Z)` đứng giữa bản cuối của dòng mới và `## [X.Y.Z]` của
  dòng kế thừa. Dưới ranh giới, "giảm dần" tính lại thành chuỗi riêng; bản mới nhất == `VERSION` chỉ xét chuỗi đầu; mục
  kế thừa vẫn kiểm dạng, ngày (giảm dần liên tục qua ranh giới), nhóm. Ranh giới sai dạng, có nhóm `###`, lặp lại, đứng
  trước mọi bản dòng mới hoặc không ngay trên `## [X.Y.Z]` → lỗi. Không có ranh giới → hành vi như cũ.
- `LEGACY_RELEASE_TAGS` = {3.34.0} trong `scripts/xt.py`: bị bỏ khi `latest_framework_tag` tìm tag mới nhất (`doctor`,
  `doctor --drift`). Bản cài lớn hơn tag mới nhất vẫn không bị báo (như cũ).
- `registry`: lõi/gói ở tag thuộc `LEGACY_RELEASE_TAGS` khi `VERSION` nhỏ hơn và không thuộc tập đó → `legacy-line`, không
  tính vào `drift`. Khoá JSON không đổi; chỉ thêm giá trị trạng thái.

## Hệ quả

- `release-tag.yml` gắn `v1.0.0` khi `VERSION` đổi trên main; tag `v3.34.0` giữ nguyên, không xoá.
- Sản phẩm ở lõi kế thừa khác 3.34.0 (vd 3.32.0) vẫn hiện `ahead` và vẫn đỏ ở `--strict`.

## Đường lùi

Bỏ heading ranh giới trong CHANGELOG, đưa `VERSION` về số kế tiếp sau 3.34.0 (tiếp dòng cũ); `LEGACY_RELEASE_TAGS` và `legacy-line` khi
đó không còn tác dụng, gỡ được trong một PR riêng.
