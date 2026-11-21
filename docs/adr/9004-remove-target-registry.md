# ADR-9004: Gỡ registry sản phẩm đích và nâng bản qua ranh giới dòng phát hành

- **Trạng thái:** Đã chấp nhận ngày 2026-11-21 (chủ dự án quyết: X-Office là dự án đích độc lập, bỏ hẳn cơ chế theo dõi
  dự án đích khác).
- **Trạng thái triển khai:** gỡ trên nhánh `seeker/beautiful-planck-85z2yn`, chưa merge.
- **Thay:** [ADR-9003](9003-release-line-upgrade.md) (toàn bộ); một phần [ADR-9002](9002-release-line.md) (trạng thái
  `legacy-line` của registry) và [ADR-0068](0068-software-factory-direction.md) (lát E: registry nhiều sản phẩm).

## Bối cảnh

D-9007 tách X-Office khỏi X-Templates thành dự án đích độc lập, không phân phối khung cho dự án khác. Sau đó
`docs/ops/registry.json` rỗng (`products: []`) và mục Danh sách của `docs/ops/TARGETS.md` trống, nhưng mã theo dõi vẫn
còn: lệnh `xt.py registry` (`--strict`, `--json`, `registry pull`), trạng thái lệch `legacy-line` (ADR-9002, ADR-9003),
API `GET /api/registry` và màn Registry của `xt.py app`, cùng logic `install.py` coi nâng 3.34.0 → 1.x là nâng bản
(ADR-9003). Đó là mã, test và tài liệu phải bảo trì cho một tính năng không còn dữ liệu và không còn người dùng.

## Phương án đã xét

1. **Giữ nguyên, registry rỗng** (trạng thái sau D-9007): không tốn công gỡ; mã chết vẫn phải qua cổng (coverage 100 %,
   mypy, review), màn app hiện "Chưa có sản phẩm" mãi mãi.
2. **Gỡ hẳn registry, `legacy-line` và nâng bản qua ranh giới; giữ phần độc lập**: ít mã hơn, app gọn hơn; dự án đích
   còn ở 3.34.0 (nếu có) không nhận danh sách bước làm tay khi cài bản 1.x — `install.py` báo hạ bản như trước 1.0.0.

## Quyết định

Chọn **2**.

- Gỡ: `xt.py registry` (gồm `registry pull`), mọi hàm `registry_*`/`_reg_*`/`REG_*`, `docs/ops/registry.json`,
  `scripts/xt_app/api_registry.py`, `scripts/app/views/registry.js` và mục điều hướng (app còn 8 màn), `tests/test_registry.py`
  cùng test `registry pull`.
- Gỡ ở `install.py`: `split_release_line`, `crosses_release_line`, tham số `crossing` của `upgrade_steps`. Bản khung có
  số nhỏ hơn bản đã cài là hạ bản. `upgrade_steps` chỉ đọc CHANGELOG tới tiêu đề ranh giới dòng kế thừa
  (`LEGACY_HEAD_RE`, cùng tập dòng với `CHANGELOG_LINE_RE` của `xt.py`): mục 3.x số lớn hơn 1.x nhưng không bao giờ là bước
  của dòng mới — không có giới hạn này, cài lại 1.0.0 in 246 bước cũ của 57 mục 3.x.
- Giữ: `github_origin_slug` (dùng bởi `admin-plan`); so nhãn tiền phát hành và nhãn git describe của `install.py`
  (`PRERELEASE_RE`, `version_key`, AUD-HAR-453/454); tiêu đề ranh giới trong CHANGELOG và `changelog-check` đọc nó,
  `LEGACY_RELEASE_TAGS` trong `latest_framework_tag` (ADR-9002); `docs/ops/TARGETS.md` và cơ chế phản hồi ADR-0010.

## Hệ quả

- Tốt: bớt một lệnh, một API, một màn và test đi kèm; không còn cổng nào đỏ vì dữ liệu sản phẩm khác.
- Xấu: không còn tín hiệu máy đọc về bản khung của dự án khác; bảng "đích × bản khung × số tuần chậm" chỉ còn ở Routine
  phản hồi (`LOOP-FB-005`). Repo cài khung ở 3.34.0 chạy lại `install.py` bản 1.x vẫn nhận tệp mới nhưng không thấy bước
  làm tay (dòng "hạ bản").
- Nợ: các SPEC xưởng (`SPEC-factory-deploy`, `-learning`, `-parallel`) ghi mục registry là "Ngừng dùng".

## Đường lùi

Khôi phục từ commit trước lần gỡ (`git revert` PR gỡ, hoặc lấy lại các tệp ở commit cha): `scripts/xt.py` phần registry,
`scripts/xt_app/api_registry.py`, `scripts/app/views/registry.js`, `docs/ops/registry.json`, `tests/test_registry.py`
và phần ranh giới của `scripts/install.py`; một PR riêng.
