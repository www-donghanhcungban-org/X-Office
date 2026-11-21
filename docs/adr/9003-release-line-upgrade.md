# ADR-9003: Nâng bản qua ranh giới dòng phát hành, `legacy-line` vẫn là lệch

- **Trạng thái:** Đã chấp nhận ngày 2026-11-21 (phiên chính tự duyệt theo ADR-0008; review độc lập trước khi cắt 1.0.0).
  **Bị thay bởi [ADR-9004](9004-remove-target-registry.md)** (2026-11-21).
- **Làm rõ:** ADR-9002 (dòng phát hành riêng) — điều chỉnh hai điểm, ADR-9002 giữ nguyên.

## Bối cảnh

Review độc lập của PR cắt bản 1.0.0 tìm ra hai chỗ ADR-9002 để hở: (1) `install.py` coi nâng 3.34.0 → 1.0.0 là hạ bản,
nên dự án đích đang ở dòng kế thừa không nhận bước làm tay của dòng mới; (2) `registry` không tính `legacy-line` là lệch,
trong khi dự án ở 3.34.0 thiếu mọi thay đổi của 1.x và registry là tín hiệu tự động duy nhất còn nhắc họ.

## Quyết định

- `registry`: `legacy-line` giữ làm nhãn riêng (đúng hơn `ahead`) nhưng **tính vào `drift`**; `--strict` đỏ cho tới khi
  dự án nâng lên dòng mới.
- `install.py`: phân loại mục CHANGELOG theo **vị trí** so với tiêu đề ranh giới, không theo tên (số bản có thể trùng giữa
  hai dòng). Nâng "qua ranh giới" chỉ khi bản cũ là mục dòng kế thừa và bản khung là mục dòng mới: không phải hạ bản,
  in bước của mọi mục dòng mới và mục kế thừa lớn hơn bản cũ. Bản cũ không có ở hai dòng (vd. 1.0.1 khi khung là 1.0.0)
  → so số như thường, tức hạ bản. Đang ở dòng mới thì không in mục kế thừa.

## Hệ quả

- Dự án đích ở 3.34.0 hiện `legacy-line` và đỏ ở `registry --strict` tới khi chạy lại `install.py`.
- `doctor --drift` của dự án đích chạy `xt.py` đã cài (tag lớn nhất vẫn v3.34.0) nên không tự nhắc: nâng 1.0.0 ghi ở
  CHANGELOG và registry.

## Đường lùi

Trả `REG_DRIFT_OK` về gồm `legacy-line` và bỏ nhánh `crossing` trong `upgrade_steps`; một PR riêng.
