# ADR-9001: Màn Văn phòng của `xt.py app` — bộ vẽ Canvas 2D mặc định, three.js vendor là tuỳ chọn tải lười

- **Số hiệu:** trước là ADR-0082; đổi sang dải 9001+ dành cho ADR riêng của X-Office ngày 2026-11-20 khi
  đồng bộ X-Templates mang ADR-0082 của chính nó (harness Codex) — D-9001. Nội dung quyết định không đổi.
- **Trạng thái:** Đã chấp nhận ngày 2026-11-19 (phiên chính tự duyệt theo ADR-0008; yêu cầu chủ dự án cùng ngày).
- **Trạng thái triển khai:** nhánh `claude/tender-goldberg-u0d4db` (F-008, [`SPEC-app.md`](../specs/SPEC-app.md) §4).
- **Làm rõ:** [ADR-0038](0038-local-app-on-xt.md) (app cục bộ: stdlib, JS thuần không build, CSP `script-src 'self'`,
  không chạy lệnh), CMP-LIC-022 (`xt.py vendor-check`).

## Bối cảnh

Chủ dự án 2026-11-19: *"nghiên cứu phát triển thêm văn phòng 3D"*, kèm ảnh một văn phòng isometric có agent ngồi bàn và
dẫn chiếu dự án `khanh020905/my-office` (MIT, three.js 0.160, Next.js). Sau đó yêu cầu thêm: nhiều kiểu văn phòng
(công nghệ, studio, thư viện, ban đêm, cyberpunk, quán cà phê, vũ trụ, bệnh viện), lớp mùa, *"thêm cả tuỳ chọn three.js"*,
bố cục *"nhiều văn phòng liên thông nhau, hoặc mỗi người 1 phòng riêng"* và *"cho hết vào tuỳ chọn"*.

Nghiên cứu cùng ngày ([`research/2026-11-19-office-3d.md`](../../research/2026-11-19-office-3d.md): ba phương án, ba
giám khảo độc lập, cả ba chọn phương án tiến dần) là cơ sở của quyết định dưới.

Ràng buộc từ ADR-0038: app không bước build, không npm, CSP chặn script inline và nguồn ngoài; `scripts/app/` được
`install.py` chép nguyên sang mọi dự án đích. Dữ kiện (2026-11-19, registry npm): three.js bản stable mới nhất 0.187.0,
MIT; gói không có bản `.min`, `build/three.module.js` + `build/three.core.js` ≈ 2,1 MB chưa nén (≈ 420 KB gzip);
`three.module.js` chỉ import `./three.core.js` nên chạy được không cần import map.

## Phương án

1. **Chỉ Canvas 2D tự viết** (hộp isometric, painter's sort): 0 phụ thuộc, nhẹ, test được; không xoay tự do, không ánh
   sáng/bóng thật.
2. **Chỉ three.js vendor**: 3D thật (ánh sáng, bóng, xoay); mọi người dùng tải ~2 MB, cần WebGL — máy không có WebGL
   (VM, trình duyệt khoá GPU) mất màn hình.
3. **Cả hai, cùng một mô tả cảnh**: `office/scene.js` phát lệnh `box/panel/dot/ring/tag` lên một "sink"; sink Canvas 2D
   (`office/iso.js`) là mặc định, sink three.js (`office/three-view.js`) chỉ được `import()` khi người dùng chọn "3D";
   lỗi WebGL → quay về 2D kèm thông báo.

## Quyết định

Chọn **3**.

- Một nguồn cảnh: kiểu văn phòng (`office/themes.js`), bố cục (`LAYOUTS` trong `scene.js`: mở chung, nhiều phòng liên
  thông, mỗi người một phòng) và lớp mùa là dữ liệu dùng chung cho cả hai bộ vẽ — thêm kiểu/bố cục không sửa bộ vẽ.
- three.js 0.187.0 chép nguyên văn vào `scripts/app/vendor/three/` kèm `LICENSE` và `SOURCE` (URL tarball, sha1 tarball,
  sha256 từng tệp, gitHead, ngày lấy); `xt.py vendor-check --dirs scripts/app/vendor --strict` xanh. Test `OfficeVendorTest`
  (chạy ở CI) đối chiếu sha256 của tệp với `SOURCE` và chạy vendor-check — sửa tệp vendor mà không cập nhật SOURCE thì đỏ;
  lệnh kiểm grep của blueprint chỉ miễn đúng ba tệp đã ghim. Không addon (tự viết
  xoay camera, nhãn là lớp HTML phủ) để khỏi phải sửa đường import `three` của addon.
- An toàn giữ nguyên ADR-0038: không mạng ngoài, không script inline, nhãn dựng bằng `textContent`; vị trí nhãn đặt qua
  CSSOM (`style.setProperty`), không qua thuộc tính `style`.
- Tiếp cận: canvas `role="img"` + `aria-label` tóm tắt; bảng "Ai đang làm gì" là bản tương đương; chuyển động tắt mặc
  định khi `prefers-reduced-motion`; 3D xoay được bằng phím mũi tên khi canvas có focus.

## Hệ quả

- Dự án đích **không** nhận three.js mặc định (vendor làm phần `scripts/` cài sang tăng ~141 %): `install.py
  --with-office-3d` chép `.xtemplates/scripts/app/vendor/three/` (≈ 2,1 MB); bản cài đã có thì nâng khung vẫn giữ. Thiếu
  vendor, chọn 3D báo lỗi và quay về 2D. Máy chủ app đọc mọi tệp tĩnh vào bộ nhớ lúc khởi động (+2,1 MB RAM khi có).
- Nâng three.js = thay hai tệp + cập nhật `SOURCE` (hash, ngày) + chạy E2E `OfficeTest`; ghim bản, không tự nâng.
- Trạng thái bàn là suy ra từ bằng chứng trên đĩa (`runs.jsonl`, verdict vòng), không phải sự kiện thời gian thực;
  bàn Review/Nghiên cứu hiện "chưa có tín hiệu" (`untracked`, không khai "rảnh") cho tới khi vòng ghi hoạt động của các
  agent này; lần chạy cũ hơn 30 phút hay có thời điểm ở tương lai không tính là "đang làm".

## Đường lùi

Bỏ tuỳ chọn 3D: xoá `scripts/app/vendor/three/`, `office/three-view.js` và mục "3D" trong `RENDERERS` của
`views/office.js` — bộ vẽ 2D và dữ liệu cảnh không phụ thuộc chúng. Bỏ cả màn: gỡ `api_office.py`, `views/office.js`,
`office/`, link nav và F-008.
