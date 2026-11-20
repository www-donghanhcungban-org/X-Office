"""E2E trình duyệt cho app cục bộ `xt.py app` (T-1992, D-133, PRF-WEB-006): 8 màn × 2 viewport, console sạch, không
cuộn ngang ở 390 px, đi được bằng bàn phím, axe 0 vi phạm `critical`/`serious`, một luồng ghi BLUEPRINT.md.

Chạy cục bộ bằng `pip install --require-hashes -r requirements-e2e.txt`, `python -m playwright install --only-shell chromium`
rồi `python3 -m unittest discover -s tests_e2e`. CI thử mở Chromium và chỉ cài thư viện hệ thống khi thiếu.
`XT_E2E_CHROMIUM=<đường chrome/headless_shell>` dùng
trình duyệt có sẵn thay bản Playwright tải. Máy chủ là `xt_app.server.make_server` thật (cổng 0, thread) trên dự án tạm;
`xt._gh_api` bị thay bằng hàm ném `PrInputError` — không gọi `gh`/mạng.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import unittest.mock as mock
from urllib.parse import urlsplit

from playwright.sync_api import Browser, BrowserContext, Page, Playwright, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import xt
from xt_app import server

FW = ROOT / "framework"
STATIC = ROOT / "scripts" / "app"
AXE = Path(__file__).resolve().parent / "vendor" / "axe" / "axe.min.js"
# axe được phục vụ bằng `page.route` dưới đúng origin của app nên CSP `script-src 'self'` của app vẫn nguyên (không
# `bypass_csp`): axe là công cụ kiểm của test, không phải mã app, và không nằm trong scripts/app.
AXE_PATH = "/__e2e__/axe.min.js"
AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
BLOCKING = ("critical", "serious")
VIEWPORTS = {"desktop": (1280, 800), "mobile": (390, 844)}
SCREENS: Tuple[Tuple[str, str], ...] = (
    ("", "Tổng quan"),
    ("catalog", "Thư viện yêu cầu"),
    ("compose", "Ghép blueprint"),
    ("blueprint", "Tiến độ blueprint"),
    ("plan", "Kế hoạch và phân chia việc"),
    ("loop", "Vòng tự động"),
    ("office", "Văn phòng"),
    ("pr", "PR"),
    ("registry", "Registry sản phẩm"),
)
TIMEOUT_MS = 20000

PLAN = """# PLAN

## Lát 1
- [x] `T-001` dựng khung (files: src/a.py)
- [ ] `T-002` màn chính — Gate: `true` (sau: T-001; files: src/b.py)
- [ ] `T-003` kiểm sâu (exec: deep) (sau: T-002; files: src/c.py)
"""
DECISIONS = """# Nhật ký quyết định

### D-001 · 2026-10-21T10:00:00+00:00 · Chọn cách lưu

- Phương án: (1) Tệp · (2) SQLite
- Chọn: Tệp
- Lý do (tiêu chí chất lượng cuối): Tiêu chí 3: đơn giản.
- Đường lùi: đổi sang SQLite
"""
ADR = "# ADR-0001: Dùng tệp phẳng\n\n- **Trạng thái:** Đã chấp nhận\n"
REGISTRY = """{"schema": 1, "products": [{"repo": "owner/a-very-long-product-repository-name-for-narrow-table", "owner": "o",
 "type": "web-api", "risk": "high", "core": "1.0.0", "pack": null, "environments": ["prod"], "slo": "",
 "release": {"version": "1.0.0", "date": "2026-10-01", "digest": null},
 "exceptions": [{"id": "EX-1", "until": "2020-01-01", "why": "<script>alert(1)</script>"}]}]}"""

_pw: Optional[Playwright] = None
_browser: Optional[Browser] = None
_gh_patch = mock.patch.object(xt, "_gh_api", side_effect=xt.PrInputError("không có gh"))


def setUpModule() -> None:
    global _pw, _browser
    _gh_patch.start()
    _pw = sync_playwright().start()
    exe = os.environ.get("XT_E2E_CHROMIUM") or None
    _browser = _pw.chromium.launch(executable_path=exe)


def tearDownModule() -> None:
    if _browser is not None:
        _browser.close()
    if _pw is not None:
        _pw.stop()
    _gh_patch.stop()


def browser() -> Browser:
    assert _browser is not None, "setUpModule chưa chạy"
    return _browser


def compose_blueprint(base: Path) -> None:
    """BLUEPRINT.md ghép thật bằng `xt.py compose` (cùng lệnh người dùng chạy)."""
    cmd = [sys.executable, str(ROOT / "scripts" / "xt.py"), "--framework", str(FW), "compose"]
    cmd += ["--profile", "web-app", "--scale", "S", "--out", str(base / "BLUEPRINT.md")]
    res = subprocess.run(cmd, capture_output=True, text=True, cwd=base, check=False)
    assert res.returncode == 0, res.stderr


def make_project(base: Path, with_blueprint: bool) -> None:
    (base / "docs" / "autopilot").mkdir(parents=True)
    (base / "docs" / "adr").mkdir(parents=True)
    (base / "docs" / "autopilot" / "PLAN.md").write_text(PLAN, encoding="utf-8")
    (base / "docs" / "autopilot" / "DECISIONS.md").write_text(DECISIONS, encoding="utf-8")
    (base / "docs" / "adr" / "0001-flat-files.md").write_text(ADR, encoding="utf-8")
    (base / "docs" / "ops").mkdir(parents=True)
    (base / "docs" / "ops" / "registry.json").write_text(REGISTRY, encoding="utf-8")  # màn Registry có bảng
    if with_blueprint:
        compose_blueprint(base)


class AppCase(unittest.TestCase):
    """Một dự án tạm + một máy chủ thật cho mỗi lớp test."""

    with_blueprint = True

    @classmethod
    def setUpClass(cls) -> None:
        cls._tmp = tempfile.TemporaryDirectory()
        cls.base = Path(cls._tmp.name) / "proj"
        make_project(cls.base, cls.with_blueprint)
        cls.srv, cls.token = server.make_server(xt, base=cls.base, framework=FW, static_root=STATIC)
        cls.srv.quiet = True
        cls.origin = f"http://127.0.0.1:{cls.srv.server_address[1]}"
        cls._thread = threading.Thread(target=cls.srv.serve_forever, daemon=True)
        cls._thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.srv.shutdown()
        cls.srv.server_close()
        cls._thread.join(timeout=5)
        cls._tmp.cleanup()

    def new_context(self, viewport: str = "desktop") -> BrowserContext:
        width, height = VIEWPORTS[viewport]
        ctx = browser().new_context(viewport={"width": width, "height": height})
        ctx.set_default_timeout(TIMEOUT_MS)
        self.addCleanup(ctx.close)
        return ctx

    def open_app(self, ctx: BrowserContext) -> Tuple[Page, Watch]:
        """Trang mới mở bằng URL có token (như URL in ở terminal); `Watch` gắn TRƯỚC khi tải để bắt cả lỗi lúc nạp."""
        page = ctx.new_page()
        watch = Watch(page)
        page.goto(f"{self.origin}/#t={self.token}")
        wait_screen(page, "Tổng quan")
        return page, watch


def wait_screen(page: Page, title: str) -> None:
    """Chờ `main h1` đúng tiêu đề và hết mọi trạng thái `.state.loading`."""
    page.locator("main h1").filter(has_text=re.compile(rf"^{re.escape(title)}$")).wait_for()
    page.wait_for_function("() => !document.querySelector('.state.loading')")


def go(page: Page, route: str, title: str) -> None:
    page.evaluate("(r) => { location.hash = '#/' + r; }", route)
    wait_screen(page, title)


class Watch:
    """Thu lỗi console (mức error), lỗi JS chưa bắt và phản hồi 4xx/5xx/thất bại tới `/api/*` của một trang."""

    def __init__(self, page: Page) -> None:
        self.problems: List[str] = []
        page.on("console", self._console)
        page.on("pageerror", lambda e: self.problems.append(f"pageerror: {e}"))
        page.on("response", self._response)
        page.on("requestfailed", lambda r: self._api(r.url) and self.problems.append(f"requestfailed: {r.url}"))

    def _console(self, msg: Any) -> None:
        if msg.type == "error":
            self.problems.append(f"console: {msg.text} @ {msg.location.get('url', '')}")

    @staticmethod
    def _api(url: str) -> bool:
        return urlsplit(url).path.startswith("/api/")

    def _response(self, resp: Any) -> None:
        if self._api(resp.url) and resp.status >= 400:
            self.problems.append(f"{resp.status} {resp.url}")

    def take(self) -> List[str]:
        out, self.problems[:] = list(self.problems), []
        return out


def axe_violations(page: Page, origin: str) -> Tuple[int, List[Dict[str, Any]]]:
    """(số luật đạt, vi phạm mức chặn `critical`/`serious`) của trang hiện tại; nạp axe một lần mỗi tài liệu. Số luật
    đạt > 0 chứng minh axe đã chạy thật trên tài liệu (không phải 0 vi phạm vì không quét gì)."""
    if not page.evaluate("() => typeof window.axe === 'object'"):
        page.add_script_tag(url=origin + AXE_PATH)
    found = page.evaluate(
        """async (tags) => {
            const r = await axe.run(document, {runOnly: {type: 'tag', values: tags}});
            return {passes: r.passes.length, violations: r.violations.map(v => ({id: v.id, impact: v.impact,
                    help: v.help, targets: v.nodes.map(n => n.target.join(' '))}))};
        }""",
        AXE_TAGS,
    )
    return found["passes"], [v for v in found["violations"] if v["impact"] in BLOCKING]


def serve_axe(ctx: BrowserContext, origin: str) -> None:
    ctx.route(origin + AXE_PATH, lambda r: r.fulfill(path=str(AXE), content_type="text/javascript; charset=utf-8"))


def horizontal_overflow(page: Page) -> int:
    return page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")


def assert_clean(tc: unittest.TestCase, page: Page, watch: Watch, origin: str) -> None:
    """Không lỗi console/JS/API, không cuộn ngang, axe chạy thật và 0 vi phạm `critical`/`serious`."""
    tc.assertEqual(watch.take(), [])
    tc.assertLessEqual(horizontal_overflow(page), 0, "cuộn ngang")
    passes, bad = axe_violations(page, origin)
    tc.assertGreater(passes, 0, "axe không chạy")
    tc.assertEqual(bad, [], "\n".join(f"{v['impact']} {v['id']}: {v['help']} → {v['targets']}" for v in bad))
    tc.assertEqual(watch.take(), [])  # axe không gây lỗi console


class ScreensTest(AppCase):
    """PRF-WEB-006: mọi màn × hai viewport — tải không lỗi, không cuộn ngang, axe 0 vi phạm critical/serious."""

    def test_every_screen_every_viewport(self) -> None:
        checked = 0
        for name in VIEWPORTS:
            ctx = self.new_context(name)
            serve_axe(ctx, self.origin)
            page = ctx.new_page()
            watch = Watch(page)
            page.goto(f"{self.origin}/#t={self.token}")
            wait_screen(page, "Tổng quan")
            for route, title in SCREENS:
                with self.subTest(viewport=name, screen=route or "overview"):
                    go(page, route, title)
                    self.check_screen(page, watch, route)
                    checked += 1
        self.assertEqual(checked, len(VIEWPORTS) * len(SCREENS))

    def check_screen(self, page: Page, watch: Watch, route: str) -> None:
        if route == "pr":  # không có gh: màn PR báo rõ, các màn khác vẫn dùng được
            page.get_by_text("Không đọc được GitHub").wait_for()
        if route == "office":  # canvas có mô tả văn bản; bảng tương đương có đủ 5 bàn
            page.locator("canvas.office-canvas[aria-label^='Văn phòng kiểu']").wait_for()
            self.assertEqual(page.locator("main tbody tr").count(), 5)
        if route == "registry":  # bảng có dòng; lý do ngoại lệ chứa thẻ HTML hiện thành chữ, không thành phần tử
            page.get_by_text("hết hạn · EX-1", exact=False).wait_for()
            self.assertEqual(page.locator("main script").count(), 0)
        assert_clean(self, page, watch, self.origin)

    def test_catalog_module_detail_mobile(self) -> None:
        """Trạng thái sâu hơn của màn Thư viện ở 390 px: mở mảng, chọn module → danh sách mục dài."""
        ctx = self.new_context("mobile")
        serve_axe(ctx, self.origin)
        page, watch = self.open_app(ctx)
        go(page, "catalog", "Thư viện yêu cầu")
        with_must = page.locator("button.link").filter(has_text=re.compile(r"\([1-9]\d*/"))  # module có MUST
        area = page.locator("main details").filter(has=with_must).first
        area.locator("summary").click()
        area.locator("button.link").filter(has_text=re.compile(r"\([1-9]\d*/")).first.click()
        page.locator("main section ul.items li").first.wait_for()
        assert_clean(self, page, watch, self.origin)


class OfficeTest(AppCase):
    """F-008: mọi kiểu × bố cục vẽ không lỗi ở 2D; bộ vẽ 3D (three.js vendor) bật được, kéo xoay được, nhãn đủ 5 bàn."""

    def test_office_options_2d_and_3d(self) -> None:
        ctx = self.new_context("desktop")
        serve_axe(ctx, self.origin)
        page, watch = self.open_app(ctx)
        go(page, "office", "Văn phòng")
        page.uncheck("#office-motion")
        themes = page.eval_on_selector_all("#office-theme option", "os => os.map(o => o.value)")
        layouts = page.eval_on_selector_all("#office-layout option", "os => os.map(o => o.value)")
        scales = page.eval_on_selector_all("#office-scale option", "os => os.map(o => o.value)")
        self.assertEqual(len(themes), 8)
        self.assertEqual(layouts, ["open", "connected", "private"])
        self.assertEqual(scales, ["team", "company", "corp"])
        frames = "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))"
        seasons = page.eval_on_selector_all("#office-season option", "os => os.map(o => o.value)")
        self.assertLessEqual({"noel", "tet"}, set(seasons))
        for scale in scales:
            page.select_option("#office-scale", scale)
            for season in seasons:  # lớp mùa đặt theo `plan.season` của từng quy mô
                page.select_option("#office-season", season)
                page.evaluate(frames)
            page.select_option("#office-season", "auto")
            for layout in layouts:
                page.select_option("#office-layout", layout)
                for theme in themes:
                    page.select_option("#office-theme", theme)
                    page.evaluate(frames)  # vẽ thật từng tổ hợp (cờ dirty gộp nhiều lần đổi vào một khung hình)
        self.assertEqual(watch.take(), [])
        # Cửa hẹp hơn 1 ô vẫn mở đúng mép (review #6): đoạn vách không phủ khoảng cửa nào.
        segs = page.evaluate(
            "async () => (await import('/office/scene.js')).wallSegments(0, 12.6, [[0.6, 1.4], [6.8, 7.6]])"
        )
        self.assertEqual(segs[0], [0, 0.6])
        self.assertTrue(all(not (a < 1.4 and b > 0.6) and not (a < 7.6 and b > 6.8) for a, b in segs))
        self.assertAlmostEqual(sum(b - a for a, b in segs), 12.6 - 0.8 - 0.8)
        # Dữ liệu mặt bằng (plans.js): 3 quy mô; công ty đủ phòng chức năng; 5 bàn agent thật đứng trước bàn minh hoạ.
        plan = page.evaluate(
            "async () => { const m = await import('/office/plans.js'); const p = m.planFor('company', 'open');"
            " return {scales: m.SCALES.map(s => s.id), rooms: p.rooms.map(r => r.id), desks: p.desks.length,"
            " extra: p.extraDesks.length, corp: m.planFor('corp', 'open').levels}; }"
        )
        self.assertEqual(plan["scales"], scales)
        self.assertEqual(
            set(plan["rooms"]), {"reception", "director", "meeting", "server", "pantry", "nap", "work", "garden"}
        )
        self.assertEqual((plan["desks"], plan["extra"]), (5, 23))
        self.assertGreater(plan["corp"], 0)
        # Quy mô công ty: nút "Tới phòng" đủ 8 phòng + Toàn cảnh; bấm → chỉ nút đó aria-pressed và cảnh đổi; tới bàn →
        # không nút nào pressed (kể cả Toàn cảnh).
        page.select_option("#office-scale", "company")
        rooms = page.locator(".office-rooms button")
        self.assertEqual(rooms.count(), 9)
        canvas2d = page.locator("canvas.office-canvas")
        page.evaluate(frames)
        whole = canvas2d.screenshot()
        page.click(".office-rooms button[data-room='meeting']")
        pressed = (
            "() => [...document.querySelectorAll('.office-rooms button')].map(b => b.getAttribute('aria-pressed'))"
        )
        self.assertEqual(page.evaluate(pressed).count("true"), 1)
        self.assertEqual(page.get_attribute(".office-rooms button[data-room='meeting']", "aria-pressed"), "true")
        page.evaluate(frames)
        self.assertNotEqual(whole, canvas2d.screenshot())  # camera tới phòng họp
        page.locator("main tbody tr th button").first.click()
        self.assertEqual(page.evaluate(pressed).count("true"), 0)
        # Làm mới (poll) với dữ liệu không đổi không gỡ nút đang giữ focus (WCAG 2.4.3).
        first = page.locator("main tbody tr th button").first
        first.focus()
        with page.expect_response(lambda r: "/api/office" in r.url) as polled:
            page.evaluate(
                "() => [...document.querySelectorAll('main button')].find(b => b.textContent === 'Làm mới').click()"
            )
        polled.value.finished()
        page.evaluate(frames)
        self.assertTrue(
            page.evaluate("() => document.activeElement === document.querySelector('main tbody tr th button')")
        )
        # 2D: phím mũi tên khi canvas có focus → dời góc nhìn; "0" → về giữa.
        page.click(".office-rooms button[data-room='']")
        canvas2d.focus()
        page.keyboard.press("0")  # phím trước ảnh mốc: vòng :focus-visible có mặt ở cả hai ảnh
        page.evaluate(frames)
        centred = canvas2d.screenshot()
        page.keyboard.press("ArrowLeft")
        page.evaluate(frames)
        self.assertNotEqual(centred, canvas2d.screenshot())
        page.keyboard.press("0")
        page.evaluate(frames)
        self.assertEqual(centred, canvas2d.screenshot())
        self.assertRegex(page.text_content(".office-counters") or "", r"^5 agent \+ \d+ nhân viên minh hoạ")
        page.uncheck("#office-npc")
        self.assertRegex(page.text_content(".office-counters") or "", r"^5 agent · ")
        page.select_option("#office-scale", "corp")
        page.select_option("#office-renderer", "3d")
        canvas3d = page.locator("canvas.office-3d")
        canvas3d.wait_for()
        self.assertTrue(page.locator("canvas.office-canvas:not(.office-3d)").is_hidden())
        # Ngay khung hình 3D đầu (chuyển động tắt: không vẽ lại khi không đổi gì) và ngay sau đổi quy mô nhóm nhỏ → công
        # ty (số nhãn tăng): phần tử nhãn thứ i là nhãn thứ i — nhãn agent không bị nhãn phòng ghi đè.
        agents_now = (
            "() => document.querySelectorAll('.office-labels .office-tag[data-kind=agent]:not([hidden])').length"
        )
        page.wait_for_function("() => document.querySelectorAll('.office-labels .office-tag').length > 0")
        self.assertEqual(page.evaluate(agents_now), 5)
        page.select_option("#office-scale", "team")
        page.evaluate(frames)
        self.assertEqual(page.evaluate(agents_now), 5)
        page.select_option("#office-scale", "company")
        page.evaluate(frames)
        self.assertEqual(page.evaluate(agents_now), 5)
        page.select_option("#office-scale", "corp")
        page.evaluate(frames)
        page.wait_for_function(  # đúng 5 nhãn tên agent hiện, bám nhân vật (nhãn phòng/trạng thái là loại khác)
            "() => document.querySelectorAll('.office-labels .office-tag[data-kind=agent]:not([hidden])').length === 5"
        )
        # 3D ở Tập đoàn (review PR quy mô 🔴): camera nhắm đúng tầng thượng — toàn cảnh, tới phòng, tới bàn đều giữ nhãn
        # trong khung (nhãn ngoài stage = phòng/agent bị đẩy ra ngoài hình).
        inside = (
            "(sel) => { const s = document.querySelector('.office-stage').getBoundingClientRect();"
            " return [...document.querySelectorAll(sel)].filter(e => !e.hidden).map(e => {"
            " const r = e.getBoundingClientRect(); return [e.textContent, r.top >= s.top - 1 && r.bottom <= s.bottom + 1"
            " && r.left >= s.left - 1 && r.right <= s.right + 1]; }); }"
        )
        page.evaluate(frames)
        rooms3d = page.evaluate(inside, ".office-labels .office-tag[data-kind=room]")
        # Toàn cảnh: không phòng nào ra khỏi hình (ẩn vì `off-room` = camera cắt mất phòng). Nhãn nhường nhãn agent
        # (`overlap`) tuỳ cỡ chữ của máy — không phải lỗi khung camera nên không đếm.
        why = page.eval_on_selector_all(
            ".office-labels .office-tag[data-kind=room]", "es => es.map(e => [e.textContent, e.dataset.why || ''])"
        )
        self.assertEqual(len(why), 8)
        self.assertEqual([n for n, w in why if w == "off-room"], [])
        clamped = page.eval_on_selector_all(  # camera ôm trọn toà nhà: không nhãn phòng nào phải kéo từ ngoài khung vào
            ".office-labels .office-tag[data-kind=room]:not([hidden])",
            "es => es.filter(e => e.dataset.clamped).map(e => e.textContent)",
        )
        self.assertEqual(clamped, [])
        self.assertEqual(len(rooms3d), 8, why)
        self.assertTrue(all(ok for _, ok in rooms3d), rooms3d)
        page.click(".office-rooms button[data-room='meeting']")
        page.evaluate(frames)
        self.assertIn(["▸ Phòng họp", True], page.evaluate(inside, ".office-labels .office-tag[data-kind=room]"))
        page.locator("main tbody tr th button").first.click()
        page.evaluate(frames)
        agents = page.evaluate(inside, ".office-labels .office-tag[data-kind=agent]")
        self.assertTrue(agents and agents[0][1], agents)
        page.click(".office-rooms button[data-room='']")
        page.get_by_role("button", name="Làm mới").focus()  # Tab tới canvas: vòng focus vẽ TRONG canvas — WCAG 2.4.7
        for _ in range(20):  # Tab qua các nút (Tới phòng…) tới canvas
            page.keyboard.press("Tab")
            if page.evaluate("() => document.activeElement.classList.contains('office-3d')"):
                break
        state = page.evaluate(
            "() => { const c = document.activeElement; return [c.className, c.matches(':focus-visible'),"
            " getComputedStyle(c).outlineOffset]; }"
        )
        self.assertEqual(state, ["office-canvas office-3d", True, "-3px"])
        box = canvas3d.bounding_box()
        assert box is not None
        before = canvas3d.screenshot()
        page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        page.mouse.down()
        page.mouse.move(box["x"] + box["width"] / 2 + 120, box["y"] + box["height"] / 2, steps=4)
        page.mouse.up()
        page.wait_for_timeout(300)
        self.assertNotEqual(before, canvas3d.screenshot())  # kéo → góc nhìn đổi
        page.select_option("#office-renderer", "2d")
        self.assertEqual(page.locator("canvas.office-3d").count(), 0)  # rời 3D → giải phóng canvas WebGL
        # Đổi liên tiếp trong lúc three.js đang tải (review #6): 3D + đổi kiểu → đúng 1 canvas; 3D rồi 2D ngay → 0 canvas.
        flip = (
            "([a, b]) => { const r = document.querySelector('#office-renderer'), t = document.querySelector('#office-theme');"
            " r.value = a; r.dispatchEvent(new Event('change')); if (b === 'theme') { t.value = 'cafe';"
            " t.dispatchEvent(new Event('change')); } else { r.value = b; r.dispatchEvent(new Event('change')); } }"
        )
        page.evaluate(flip, ["3d", "theme"])
        page.wait_for_timeout(1500)
        self.assertEqual(page.locator("canvas.office-3d").count(), 1)
        self.assertEqual(page.locator(".office-labels").count(), 1)
        page.select_option("#office-renderer", "2d")
        page.evaluate(flip, ["3d", "2d"])
        page.wait_for_timeout(1500)
        self.assertEqual(page.locator("canvas.office-3d").count(), 0)
        self.assertEqual(page.locator(".office-labels").count(), 0)
        assert_clean(self, page, watch, self.origin)

    def test_office_labels_focus_and_keys(self) -> None:
        """Review PR #10: nhãn phòng đủ tương phản và neo đúng phòng; chú thích theo lựa chọn ngay; focus giữ (không
        cuộn) khi dữ liệu đổi; Toàn cảnh pressed đúng; tổ hợp Ctrl để lại cho trình duyệt; gợi ý phím gắn với canvas."""
        ctx = self.new_context("desktop")
        serve_axe(ctx, self.origin)
        page, watch = self.open_app(ctx)
        go(page, "office", "Văn phòng")
        page.uncheck("#office-motion")
        frames = "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))"
        # Dữ liệu: chữ nhãn phòng ≥ 4,5:1 trên màu nhấn của MỌI kiểu. Neo nhãn: điểm sàn cùng hình chiếu isometric
        # (x − z, y − z) KHÔNG rơi vào phòng khác — nhãn treo cao sau vách thấp (lỗi PR #10) chiếu đè lên phòng phía sau.
        data = page.evaluate(
            "async () => { const iso = await import('/office/iso.js'), th = await import('/office/themes.js'),"
            " sc = await import('/office/scene.js'), pl = await import('/office/plans.js');"
            " const out = {contrast: th.THEMES.map(t => [t.id, iso.contrast(iso.inkOn(t.trim), t.trim)]), anchors: [],"
            " desks: []};"
            " for (const s of ['company', 'corp']) { const p = pl.planFor(s, 'open');"
            " for (const r of p.rooms) { const [x, y, z] = sc.roomLabelAt(r), fx = x - z, fy = y - z;"
            " const other = p.rooms.find(o => o !== r && fx > o.x && fx < o.x + o.w && fy > o.y && fy < o.y + o.d);"
            " const own = x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.d && z >= 0 && z <= p.H;"
            " out.anchors.push([s, r.id, other ? other.id : null, own]); }"
            " out.desks.push([...p.desks, ...p.extraDesks].map(d => d.join(','))); } return out; }"
        )
        # 2D: nhãn phòng thật sự vẽ (fillText "▸ …") — khung rộng đủ 8; khung hẹp nhường bớt (không chồng).
        drawn = page.evaluate(
            "async () => { const sc = await import('/office/scene.js'), th = await import('/office/themes.js');"
            " const out = {}; for (const [w, h] of [[1118, 680], [358, 302]]) { const c = document.createElement('canvas');"
            " c.width = w; c.height = h; const g = c.getContext('2d'), seen = []; const f = g.fillText.bind(g);"
            " g.fillText = (t, ...r) => { if (String(t).startsWith('▸ ')) seen.push(t); return f(t, ...r); };"
            " sc.drawScene(g, w, h, {theme: th.themeById('night'), scale: 'company', layout: 'open', seats: [],"
            " names: true, npc: true, motion: false, t: 0, zoom: 1, pan: {x: 0, y: 0}, quality: 'high'});"
            " out[w] = seen.length; } return out; }"
        )
        # Phòng đang xem phát nhãn TRƯỚC (nên thắng khi nhãn phải nhường nhau ở khung hẹp).
        firsts = page.evaluate(
            "async () => { const sc = await import('/office/scene.js'), th = await import('/office/themes.js');"
            " const first = (focus) => { const tags = [], nop = () => {};"
            " const sink = {box: nop, panel: nop, dot: nop, ring: nop, tag: (...a) => tags.push(a)};"
            " sc.compose(sink, {theme: th.themeById('night'), scale: 'company', layout: 'open', seats: [], names: true,"
            " npc: true, motion: false, t: 0, focus}); return tags.find(a => a[7] === 'room')[8]; };"
            " return [first(null), first('server'), first('garden')]; }"
        )
        self.assertEqual(firsts, ["reception", "server", "garden"])
        self.assertEqual(drawn["1118"], 8)
        self.assertTrue(3 <= drawn["358"] < 8, drawn)
        self.assertEqual(len(data["contrast"]), 8)
        self.assertTrue(all(c >= 4.5 for _, c in data["contrast"]), data["contrast"])
        self.assertEqual(len(data["anchors"]), 16)
        self.assertEqual(
            [a for a in data["anchors"] if a[2] or not a[3]], []
        )  # trong chính phòng VÀ không chiếu sang phòng khác
        for desks in data["desks"]:  # 28 bàn khác nhau; 5 bàn agent là 5 ô đầu lưới (hàng trước), minh hoạ theo sau
            self.assertEqual(len(set(desks)), 28)
            order = sorted(desks, key=lambda d: (float(d.split(",")[1]), float(d.split(",")[0])))
            self.assertEqual(desks, order)
        # Trước khi bấm gì: "Toàn cảnh" là nút đang chọn.
        page.select_option("#office-scale", "company")
        toan = ".office-rooms button[data-room='']"
        self.assertEqual(page.get_attribute(toan, "aria-pressed"), "true")
        page.locator("main tbody tr th button").first.click()
        self.assertEqual(page.get_attribute(toan, "aria-pressed"), "false")
        page.click(toan)
        self.assertEqual(page.get_attribute(toan, "aria-pressed"), "true")
        # Chú thích đổi NGAY khi đổi "Nhãn tên" (không lệch một nhịp).
        legend = "() => document.querySelector('.office-counters').nextElementSibling.nextElementSibling.textContent"
        page.uncheck("#office-names")
        self.assertTrue(page.evaluate(legend).startswith("Nhãn tên đang tắt"), page.evaluate(legend))
        page.check("#office-names")
        self.assertTrue(page.evaluate(legend).startswith("Người có nhãn là agent thật"), page.evaluate(legend))
        # Dữ liệu bàn ĐỔI khi làm mới: bảng dựng lại, focus về đúng nút thứ 3, trang không bị kéo cuộn.
        page.set_viewport_size({"width": 1280, "height": 500})
        flip = {"n": 0}

        def handle(route: Any) -> None:
            res = route.fetch()
            body = res.json()
            flip["n"] += 1
            body["seats"][0]["state"] = "fail" if flip["n"] % 2 else "idle"
            route.fulfill(response=res, json=body)

        page.route("**/api/office*", handle)
        third = page.locator("main tbody tr th button").nth(2)
        third.focus()
        page.evaluate("() => window.scrollTo(0, 0)")  # người dùng cuộn lên xem cảnh, focus vẫn ở nút thứ 3
        self.assertTrue(  # tiền điều kiện: nút đang ngoài tầm nhìn — focus() thiếu preventScroll sẽ kéo cuộn
            page.evaluate(
                "() => document.querySelectorAll('main tbody tr th button')[2].getBoundingClientRect().top"
                " > window.innerHeight"
            )
        )
        before = page.evaluate("() => window.scrollY")
        state = "() => document.querySelector('main tbody tr td span').textContent"
        old_state = page.evaluate(state)
        with page.expect_response(lambda r: "/api/office" in r.url) as polled:
            page.evaluate(
                "() => [...document.querySelectorAll('main button')].find(b => b.textContent === 'Làm mới').click()"
            )
        polled.value.finished()
        page.wait_for_function(
            "(s) => document.querySelector('main tbody tr td span').textContent !== s", arg=old_state
        )
        self.assertTrue(
            page.evaluate("() => document.activeElement === document.querySelectorAll('main tbody tr th button')[2]")
        )
        self.assertEqual(page.evaluate("() => window.scrollY"), before)
        page.unroute("**/api/office*")
        page.set_viewport_size({"width": 1280, "height": 900})
        # Canvas 2D: gợi ý phím hiển thị, gắn aria-describedby; Ctrl+− là phóng của trình duyệt — cảnh không đổi zoom.
        canvas2d = page.locator("canvas.office-canvas")
        self.assertEqual(canvas2d.get_attribute("aria-describedby"), "office-keys")
        self.assertIn("mũi tên dời", page.text_content("#office-keys") or "")
        zoom = "() => JSON.parse(localStorage.getItem('xt-office') || '{}').zoom || 1"
        z0 = page.evaluate(zoom)
        canvas2d.focus()
        page.keyboard.press("Control+Minus")
        self.assertEqual(page.evaluate(zoom), z0)
        page.keyboard.press("Minus")
        self.assertLess(page.evaluate(zoom), z0)
        # Alt/Ctrl/⌘ + mũi tên không bị canvas giành (không preventDefault); mũi tên trơn thì có.
        keyed = (
            "(sel) => [{altKey: true}, {ctrlKey: true}, {metaKey: true}, {}].map(m => document.querySelector(sel)"
            ".dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true, cancelable: true, ...m})))"
        )
        self.assertEqual(page.evaluate(keyed, "canvas.office-canvas"), [True, True, True, False])
        self.check_pan_bounds(page, canvas2d, frames)
        # 3D công ty: mọi kiểu — nhãn phòng (HTML) đạt axe color-contrast; gợi ý phím đổi theo bộ vẽ.
        page.select_option("#office-renderer", "3d")
        page.locator("canvas.office-3d").wait_for()
        page.wait_for_function(
            "() => document.querySelectorAll('.office-labels .office-tag[data-kind=room]:not([hidden])').length === 8"
        )
        self.assertIn("xoay", page.text_content("#office-keys") or "")
        self.assertEqual(page.get_attribute("canvas.office-3d", "aria-describedby"), "office-keys")
        self.check_room_labels_apart(page, frames)
        page.click(".office-rooms button[data-room='']")
        page.wait_for_function(
            "() => document.querySelectorAll('.office-labels .office-tag[data-kind=room]:not([hidden])').length === 8"
        )
        self.assertEqual(page.evaluate(keyed, "canvas.office-3d"), [True, True, True, False])  # (xoay az: làm sau cùng)
        for theme in page.eval_on_selector_all("#office-theme option", "os => os.map(o => o.value)"):
            page.select_option("#office-theme", theme)
            page.evaluate(frames)
            passes, bad = axe_violations(page, self.origin)
            self.assertGreater(passes, 0)
            self.assertEqual([v["id"] for v in bad], [], (theme, bad))
        page.select_option("#office-renderer", "2d")
        assert_clean(self, page, watch, self.origin)

    def test_office_without_data_and_bad_prefs(self) -> None:
        """Lần tải đầu lỗi: bộ đếm, chú thích và tên khung cảnh nói "chưa có dữ liệu" (không khai "không ai đang làm").
        Lựa chọn đã lưu không hợp lệ → mặc định; bộ vẽ 3D đã lưu mở thẳng 3D, có gợi ý phím gắn aria-describedby."""
        ctx = self.new_context("desktop")
        ctx.add_init_script(
            "try { localStorage.setItem('xt-office', JSON.stringify({scale: 'huge', theme: 'nope', renderer: '3d',"
            " motion: false})); } catch (e) {}"
        )
        page, watch = self.open_app(ctx)
        page.route("**/api/office*", lambda r: r.fulfill(status=500, json={"error": "lỗi thử"}))
        go(page, "office", "Văn phòng")
        page.locator("canvas.office-3d").wait_for()
        self.assertEqual(page.input_value("#office-scale"), "team")
        self.assertEqual(page.input_value("#office-theme"), "night")
        self.assertIn("Chưa có dữ liệu agent", page.text_content(".office-counters") or "")
        legend = "() => document.querySelector('.office-counters').nextElementSibling.nextElementSibling.textContent"
        self.assertTrue(page.evaluate(legend))
        self.assertIn("chưa có dữ liệu", page.get_attribute("canvas.office-3d", "aria-label") or "")
        self.assertEqual(page.get_attribute("canvas.office-3d", "aria-describedby"), "office-keys")
        self.assertIn("xoay", page.text_content("#office-keys") or "")
        problems = watch.take()
        self.assertIn(f"500 {self.origin}/api/office", problems)  # lỗi chủ ý đã xảy ra
        self.assertEqual([p for p in problems if "/api/office" not in p], [])  # ngoài lỗi chủ ý: sạch

    def check_pan_bounds(self, page: Page, canvas2d: Any, frames: str) -> None:
        """Biên dời 2D theo cỡ cảnh đã phóng; thu nhỏ thì góc nhìn được kẹp lại (cảnh không biến khỏi khung)."""

        # Biên dời 2D theo cỡ cảnh đã phóng: ở 4× vẫn dời tiếp quá một khung (biên cũ ±1 khung dừng ở ~28 lần ←);
        # thu nhỏ hết cỡ thì góc nhìn được kẹp lại — cảnh vẫn trong khung (không phải canvas trống).
        page.select_option("#office-season", "off")
        for _ in range(12):
            page.click("button[aria-label='Phóng to']")
        canvas2d.focus()  # bấm nút đã lấy focus — trả về canvas để "0" và mũi tên tới đúng chỗ
        page.keyboard.press("0")
        for _ in range(32):
            page.keyboard.press("ArrowLeft")
        page.evaluate(frames)
        at32 = canvas2d.screenshot()
        for _ in range(12):
            page.keyboard.press("ArrowLeft")
        page.evaluate(frames)
        self.assertNotEqual(at32, canvas2d.screenshot())
        for _ in range(12):
            page.click("button[aria-label='Thu nhỏ']")
        page.evaluate(frames)
        drawn = (
            "() => { const c = document.querySelector('canvas.office-canvas'), g = c.getContext('2d');"
            " const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0;"
            " for (let i = 0; i < d.length; i += 16) if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2]) n++;"
            " return n / (d.length / 16); }"
        )
        self.assertGreater(page.evaluate(drawn), 0.05)
        canvas2d.focus()
        page.keyboard.press("0")
        zoom = "() => JSON.parse(localStorage.getItem('xt-office') || '{}').zoom || 1"
        while page.evaluate(zoom) < 0.95:  # trả mức phóng về ~1 cho phần sau của test
            page.click("button[aria-label='Phóng to']")
        self.assertLess(page.evaluate(zoom), 1.05)

    def check_room_labels_apart(self, page: Page, frames: str) -> None:
        """3D, tới bàn: nhãn phòng ngoài hình ẩn; nhãn còn hiện nằm trọn trong khung, không chồng nhau."""

        # Tới bàn ở 3D: nhãn phòng ngoài hình ẩn đi — nhãn còn hiện nằm trọn trong khung và không chồng nhau.
        page.locator("main tbody tr th button").first.click()
        page.evaluate(frames)
        boxes = page.evaluate(self.ROOM_BOXES)
        names = [b[0] for b in boxes]
        self.assertTrue(0 < len(boxes) < 8, names)  # còn nhãn (không kiểm trên tập rỗng), nhưng không phải mọi phòng
        self.assertIn("▸ Khu làm việc", names)  # bàn agent nằm trong Khu làm việc
        far = page.eval_on_selector_all(  # phòng xa hẳn bàn: ẩn vì ra khỏi phòng của nó, không phải nhường chỗ
            ".office-labels .office-tag[data-kind=room]", "es => es.map(e => [e.textContent, e.dataset.why || ''])"
        )
        self.assertEqual(
            {n: w for n, w in far if n in ("▸ Vườn & hồ bơi", "▸ Ngủ trưa")},
            {"▸ Vườn & hồ bơi": "off-room", "▸ Ngủ trưa": "off-room"},
        )
        # Phòng xa hẳn khỏi bàn (ra ngoài hình) không bị ghim vào mép khung.
        self.assertEqual({"▸ Vườn & hồ bơi", "▸ Ngủ trưa", "▸ Pantry"} & set(names), set(), names)
        self.assert_labels_apart(boxes)
        # Phóng to rồi "Tới phòng" Lễ tân: phòng đang xem luôn giữ nhãn, kẹp trọn trong khung.
        for _ in range(3):
            page.click("button[aria-label='Phóng to']")
        page.click(".office-rooms button[data-room='reception']")
        page.evaluate(frames)
        boxes = page.evaluate(self.ROOM_BOXES)
        self.assertIn("▸ Lễ tân", [b[0] for b in boxes])
        self.assert_labels_apart(boxes)
        for _ in range(3):
            page.click("button[aria-label='Thu nhỏ']")

    # Hộp mọi nhãn đang hiện: [loại, chữ, x0, y0, x1, y1].
    ALL_BOXES = (
        "() => [...document.querySelectorAll('.office-labels .office-tag')].filter(e => !e.hidden).map(e => {"
        " const r = e.getBoundingClientRect(); return [e.dataset.kind, e.textContent, r.left, r.top, r.right, r.bottom]; })"
    )

    def test_office_room_labels_when_zoomed(self) -> None:
        """Nợ review PR #11: nhãn phòng ẩn/hiện theo chỗ nhãn đứng có còn là sàn/tường của CHÍNH phòng (không theo hộp
        nhãn) — phóng to ở toàn cảnh, phòng còn trong hình vẫn giữ nhãn; nhãn phòng không đè nhãn agent/trạng thái (3D
        lẫn 2D)."""
        ctx = self.new_context("desktop")
        ctx.add_init_script(
            "try { localStorage.setItem('xt-office', JSON.stringify({scale: 'company', renderer: '3d',"
            " motion: false, season: 'off'})); } catch (e) {}"
        )
        page, watch = self.open_app(ctx)
        go(page, "office", "Văn phòng")
        page.locator("canvas.office-3d").wait_for()
        page.wait_for_function(
            "() => document.querySelectorAll('.office-labels .office-tag[data-kind=room]:not([hidden])').length === 8"
        )
        frames = "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))"
        for _ in range(3):
            page.click("button[aria-label='Phóng to']")
        page.evaluate(frames)
        # Phóng 1,95×: các phòng hàng sau giữa hình vẫn còn — nhãn của chúng không bị ẩn chỉ vì điểm neo ra ngoài khung.
        names = [b[0] for b in page.evaluate(self.ROOM_BOXES)]
        self.assertLessEqual({"▸ Giám đốc", "▸ Phòng họp", "▸ Server"}, set(names), names)
        for _ in range(2):
            page.click("button[aria-label='Phóng to']")
        page.evaluate(frames)
        boxes = page.evaluate(self.ALL_BOXES)
        rooms = [b for b in boxes if b[0] == "room"]
        others = [b for b in boxes if b[0] != "room"]
        self.assertTrue(rooms and others, boxes)
        for a in rooms:
            for b in others:
                self.assertFalse(a[2] < b[4] and b[2] < a[4] and a[3] < b[5] and b[3] < a[5], (a[1], b[1]))
        # Phóng tối đa + xoay sát biên rồi "Tới phòng": chỗ nhãn kẹp vào không còn trên tường/sàn của phòng (luật ẩn) —
        # phòng đang xem vẫn giữ nhãn, trọn trong khung.
        zoom = "() => JSON.parse(localStorage.getItem('xt-office') || '{}').zoom || 1"
        for _ in range(10):  # có trần: mức phóng tối đa đổi hay không còn lưu → đỏ ở assert dưới, không treo
            if page.evaluate(zoom) >= 4:
                break
            page.click("button[aria-label='Phóng to']")
        self.assertGreaterEqual(page.evaluate(zoom), 4)
        page.locator("canvas.office-3d").focus()
        for _ in range(8):
            page.keyboard.press("ArrowLeft")
        for rid, name in (("director", "▸ Giám đốc"), ("nap", "▸ Ngủ trưa")):
            page.click(f".office-rooms button[data-room='{rid}']")
            page.evaluate(frames)
            focused = page.evaluate(self.ROOM_BOXES)
            self.assertIn(name, [b[0] for b in focused])
            self.assert_labels_apart(focused)
        # 2D cùng luật: chặn fillText, ghi hộp từng nhãn (tagBox) — nhãn phòng không chồng nhãn bám người.
        hits = page.evaluate(
            "async () => { const sc = await import('/office/scene.js'), th = await import('/office/themes.js'),"
            " iso = await import('/office/iso.js'); const seats = ['Điều phối', 'Thực thi', 'Thực thi sâu', 'Review',"
            " 'Nghiên cứu'].map(label => ({label, state: 'work', task: {id: 'T-1'}})); const out = [];"
            " for (const [w, h, zoom] of [[1118, 680, 1], [1118, 680, 2.44], [358, 302, 1]]) {"
            " const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');"
            " const boxes = [], texts = []; const orig = iso.Iso.prototype.tag;"
            " iso.Iso.prototype.tag = function (x, y, z, text, ...r) { boxes.push([String(text).startsWith('▸ '),"
            " this.tagBox(x, y, z, text)]); texts.push(String(text)); return orig.call(this, x, y, z, text, ...r); };"
            " try { sc.drawScene(g, w, h, {theme: th.themeById('night'), scale: 'company', layout: 'open', seats,"
            " names: true, npc: true, motion: false, t: 0, zoom, pan: {x: 0, y: 0}, quality: 'high'}); }"
            " finally { iso.Iso.prototype.tag = orig; }"
            " for (const [ra, a] of boxes) for (const [rb, b] of boxes) if (ra && !rb && iso.overlaps(a, b, 0))"
            " out.push(['chồng', w, zoom]);"
            " out.push(['vẽ', w, zoom, texts.filter(t => t.startsWith('▸ ')).length, texts.filter(t => !t.startsWith('▸ ')).length,"
            " texts.includes('▸ Khu làm việc')]); } return out; }"
        )
        self.assertEqual([h for h in hits if h[0] == "chồng"], [])
        drawn2d = [h[1:] for h in hits if h[0] == "vẽ"]
        # Không rỗng mà vẫn qua: có nhãn phòng và nhãn bám người được vẽ; khung hẹp vẫn còn nhãn phòng lớn nhất
        # (Khu làm việc — dịch tránh nhãn agent thay vì bị bỏ).
        self.assertTrue(all(rooms >= 4 and people >= 5 for _, _, rooms, people, _ in drawn2d), drawn2d)
        self.assertTrue(all(work for *_, work in drawn2d), drawn2d)
        # Hết chỗ (mọi hộp nhãn phủ cả khung): nhãn phòng khác nhường, nhãn của phòng đang xem vẫn được vẽ.
        crowded = page.evaluate(
            "async () => { const sc = await import('/office/scene.js'), th = await import('/office/themes.js'),"
            " iso = await import('/office/iso.js'); const orig = iso.Iso.prototype.tagBox, seen = [];"
            " iso.Iso.prototype.tagBox = function (...a) { return {...orig.apply(this, a), l: -1e6, r: 1e6, t: -1e6, b: 1e6}; };"
            " const c = document.createElement('canvas'); c.width = 600; c.height = 400; const g = c.getContext('2d');"
            " const f = g.fillText.bind(g); g.fillText = (t, ...r) => { seen.push(String(t)); return f(t, ...r); };"
            " try { sc.drawScene(g, 600, 400, {theme: th.themeById('night'), scale: 'company', layout: 'open',"
            " seats: [{label: 'Điều phối', state: 'idle'}], names: true, npc: true, motion: false, t: 0, zoom: 1,"
            " pan: {x: 0, y: 0}, quality: 'high', focus: 'server'}); } finally { iso.Iso.prototype.tagBox = orig; }"
            " return seen.filter(t => t.startsWith('▸ ')); }"
        )
        self.assertEqual(crowded, ["▸ Server"])
        self.assertEqual(watch.take(), [])

    # Hộp các nhãn phòng đang hiện, theo toạ độ của sân khấu: [chữ, x0, y0, x1, y1, rộng, cao].
    ROOM_BOXES = (
        "() => { const s = document.querySelector('.office-stage').getBoundingClientRect();"
        " return [...document.querySelectorAll('.office-labels .office-tag[data-kind=room]')].filter(e => !e.hidden)"
        ".map(e => { const r = e.getBoundingClientRect(); return [e.textContent, r.left - s.left, r.top - s.top,"
        " r.right - s.left, r.bottom - s.top, s.width, s.height]; }); }"
    )

    def test_office_focus_label_in_crowd(self) -> None:
        """390 px, mọi agent đang làm (thêm nhãn trạng thái), phóng 1,95× rồi tới Khu làm việc: quanh nhãn phòng chật kín
        nhãn bám người, không còn chỗ trống để dịch — nhãn của phòng đang xem vẫn hiện (không nhường như phòng khác)."""
        ctx = self.new_context("mobile")
        ctx.add_init_script(
            "try { localStorage.setItem('xt-office', JSON.stringify({scale: 'company', renderer: '3d',"
            " motion: false})); } catch (e) {}"
        )
        page, watch = self.open_app(ctx)

        def busy(route: Any) -> None:
            res = route.fetch()
            body = res.json()
            for seat in body["seats"]:
                seat["state"], seat["task"] = "work", {"id": "T-1234", "title": "x"}
            route.fulfill(response=res, json=body)

        page.route("**/api/office*", busy)
        go(page, "office", "Văn phòng")
        page.locator("canvas.office-3d").wait_for()
        page.wait_for_function(
            "() => document.querySelectorAll('.office-labels .office-tag[data-kind=state]:not([hidden])').length >= 3"
        )
        for _ in range(3):
            page.click("button[aria-label='Phóng to']")
        page.click(".office-rooms button[data-room='work']")
        page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
        self.assertIn("▸ Khu làm việc", [b[0] for b in page.evaluate(self.ROOM_BOXES)])
        self.assertEqual(watch.take(), [])

    def assert_labels_apart(self, boxes: List[Any]) -> None:
        """Mọi nhãn nằm trọn trong khung và không hai nhãn nào chồng nhau."""
        for name, x0, y0, x1, y1, w, h in boxes:
            self.assertTrue(x0 >= -1 and y0 >= -1 and x1 <= w + 1 and y1 <= h + 1, (name, x0, y0, x1, y1))
        for i, a in enumerate(boxes):
            for b in boxes[i + 1 :]:
                self.assertFalse(a[1] < b[3] and b[1] < a[3] and a[2] < b[4] and b[2] < a[4], (a[0], b[0]))

    def test_office_3d_narrow_and_loading(self) -> None:
        """Màn hẹp 390 px, 3D công ty: nhãn phòng trọn trong khung, không chồng (sát nhau thì nhường, phòng đang xem
        luôn giữ). Khi
        /api/office còn đang tải: tên khung báo "chưa có dữ liệu" và gợi ý phím đã có (đích aria-describedby)."""
        ctx = self.new_context("mobile")
        ctx.add_init_script(
            "try { localStorage.setItem('xt-office', JSON.stringify({scale: 'company', renderer: '3d',"
            " motion: false})); } catch (e) {}"
        )
        page, watch = self.open_app(ctx)
        held: List[Any] = []
        page.route("**/api/office*", lambda r: held.append(r))  # giữ yêu cầu: màn đang tải
        go(page, "office", "Văn phòng")
        page.wait_for_function("() => (document.querySelector('#office-keys') || {}).textContent")
        canvas_name = "() => document.querySelector('canvas.office-canvas').getAttribute('aria-label')"
        self.assertIn("chưa có dữ liệu", page.evaluate(canvas_name))
        self.assertIn("Chưa có dữ liệu agent", page.text_content(".office-counters") or "")
        self.assertTrue(held)  # yêu cầu thật sự đang bị giữ
        page.unroute("**/api/office*")  # gỡ route → Playwright cho các yêu cầu đang giữ đi tiếp
        page.locator("canvas.office-3d").wait_for()
        page.wait_for_function(
            "() => document.querySelectorAll('.office-labels .office-tag[data-kind=room]:not([hidden])').length >= 4"
        )
        frames = "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))"
        page.evaluate(frames)
        boxes = page.evaluate(self.ROOM_BOXES)
        self.assertGreaterEqual(len(boxes), 4)  # nhãn sát nhau thì nhường — nhưng vẫn đủ để định hướng
        self.assert_labels_apart(boxes)
        # Khi nhãn phải nhường nhau, phòng đang xem luôn giữ nhãn (Server nhường ở toàn cảnh 390 px).
        hidden_before = "▸ Server" not in [b[0] for b in boxes]
        page.click(".office-rooms button[data-room='server']")
        page.evaluate(frames)
        boxes = page.evaluate(self.ROOM_BOXES)
        self.assertIn("▸ Server", [b[0] for b in boxes], hidden_before)
        self.assert_labels_apart(boxes)
        # "Tới phòng" Khu làm việc ở 390 px: điểm nhãn bị kẹp không còn trên tường trái của phòng — vẫn giữ nhãn vì là
        # phòng đang xem.
        page.click(".office-rooms button[data-room='work']")
        page.evaluate(frames)
        boxes = page.evaluate(self.ROOM_BOXES)
        self.assertIn("▸ Khu làm việc", [b[0] for b in boxes])
        self.assert_labels_apart(boxes)
        everyone = page.evaluate(self.ALL_BOXES)  # nhãn phòng đang xem dịch tránh nhãn bám người, không đè lên
        work = [b for b in everyone if b[1] == "▸ Khu làm việc"][0]
        for o in (b for b in everyone if b[0] != "room"):
            self.assertFalse(work[2] < o[4] and o[2] < work[4] and work[3] < o[5] and o[3] < work[5], o[1])
        self.assertEqual(watch.take(), [])


class OfficeMotionTest(AppCase):
    """S-017: prefers-reduced-motion thắng "Chuyển động" đã lưu; bấm phóng to không ghi đè lựa chọn đã lưu."""

    def test_reduced_motion_wins_and_is_not_saved(self) -> None:
        ctx = self.new_context("desktop")
        ctx.add_init_script("try { localStorage.setItem('xt-office', JSON.stringify({motion: true})); } catch (e) {}")
        page, watch = self.open_app(ctx)
        page.emulate_media(reduced_motion="reduce")
        go(page, "office", "Văn phòng")
        self.assertFalse(page.is_checked("#office-motion"))
        page.click("button[aria-label='Phóng to']")
        saved = page.evaluate("() => JSON.parse(localStorage.getItem('xt-office'))")
        self.assertTrue(saved["motion"])
        self.assertGreater(saved["zoom"], 1)
        for _ in range(12):  # thu/phóng có biên 0.5–4
            page.click("button[aria-label='Thu nhỏ']")
        self.assertEqual(page.evaluate("() => JSON.parse(localStorage.getItem('xt-office')).zoom"), 0.5)
        for _ in range(12):
            page.click("button[aria-label='Phóng to']")
        self.assertEqual(page.evaluate("() => JSON.parse(localStorage.getItem('xt-office')).zoom"), 4)
        self.assertEqual(watch.take(), [])


class KeyboardTest(AppCase):
    """Đi bằng bàn phím: link bỏ qua là điểm Tab đầu, Enter không đổi màn; Tab tới nav, Enter chuyển màn, focus vào main."""

    def active(self, page: Page) -> Dict[str, Any]:
        return page.evaluate(
            "() => { const a = document.activeElement;"
            " return {tag: a.tagName, id: a.id, text: a.textContent.trim(), href: a.getAttribute('href')}; }"
        )

    def test_skip_link_first_and_keeps_screen(self) -> None:
        page, watch = self.open_app(self.new_context())
        page.keyboard.press("Tab")
        self.assertEqual(self.active(page)["text"], "Bỏ qua tới nội dung")
        page.keyboard.press("Enter")
        page.wait_for_function("() => document.activeElement && document.activeElement.id === 'main'")
        self.assertEqual(page.locator("main h1").inner_text(), "Tổng quan")
        self.assertEqual(page.locator("nav a[aria-current=page]").get_attribute("href"), "#/")
        self.assertEqual(watch.take(), [])

    def test_tab_to_nav_enter_moves_focus_to_main(self) -> None:
        page, watch = self.open_app(self.new_context("mobile"))
        seen = []
        for _ in range(4):
            page.keyboard.press("Tab")
            seen.append(self.active(page)["href"])
            if seen[-1] == "#/catalog":
                break
        self.assertEqual(seen, ["#main", "#/", "#/catalog"])
        page.keyboard.press("Enter")
        wait_screen(page, "Thư viện yêu cầu")
        page.wait_for_function("() => document.activeElement && document.activeElement.id === 'main'")
        self.assertEqual(page.locator("nav a[aria-current=page]").get_attribute("href"), "#/catalog")
        self.assertEqual(watch.take(), [])


class TokenTest(AppCase):
    """Phân quyền: có token → API trả 200; không token → app báo mở lại bằng URL; token sai → API từ chối."""

    def fetch_status(self, page: Page, token: str) -> int:
        return page.evaluate("async (t) => (await fetch('/api/overview', {headers: {'X-XT-Token': t}})).status", token)

    def test_allowed_with_token(self) -> None:
        page, _watch = self.open_app(self.new_context())
        self.assertEqual(self.fetch_status(page, self.token), 200)

    def test_denied_without_or_with_wrong_token(self) -> None:
        page = self.new_context().new_page()
        page.goto(self.origin + "/")
        page.get_by_role("alert").filter(has_text="Mở lại bằng URL in ở terminal.").wait_for()
        self.assertGreaterEqual(self.fetch_status(page, "sai-" + self.token), 400)
        self.assertGreaterEqual(self.fetch_status(page, ""), 400)


class ConcurrentTest(AppCase):
    """Hai tab cùng tải màn nhiều request song song (Vòng tự động: 3 API cùng lúc) — không lỗi, không lẫn dữ liệu."""

    def test_two_tabs_load_together(self) -> None:
        ctx = self.new_context()
        pages = [ctx.new_page(), ctx.new_page()]
        watches = [Watch(p) for p in pages]
        for p in pages:
            p.goto(f"{self.origin}/#t={self.token}", wait_until="commit")
        for p in pages:
            wait_screen(p, "Tổng quan")
            p.evaluate("() => { location.hash = '#/loop'; }")
        for p, w in zip(pages, watches):
            wait_screen(p, "Vòng tự động")
            p.get_by_text("D-001").wait_for()
            self.assertEqual(w.take(), [])


class ComposeWriteTest(AppCase):
    """Luồng ghi: Ghép blueprint `cli-tool` quy mô S → Xem trước (số MUST) → Ghi BLUEPRINT.md (xác nhận) → file có thật."""

    with_blueprint = False

    def test_preview_then_write(self) -> None:
        ctx = self.new_context("mobile")  # bản xem trước dài nhất ở viewport hẹp: kiểm cuộn ngang + axe
        serve_axe(ctx, self.origin)
        page, watch = self.open_app(ctx)
        go(page, "compose", "Ghép blueprint")
        page.select_option("#cp-profile", "cli-tool")
        page.select_option("#cp-scale", "S")
        page.get_by_role("button", name="Xem trước").click()
        counts = page.locator("main section p").filter(has_text=re.compile(r"^MUST \d+ · SHOULD \d+"))
        counts.wait_for()
        must = int(re.match(r"MUST (\d+)", counts.inner_text()).group(1))
        self.assertGreater(must, 0)
        assert_clean(self, page, watch, self.origin)
        self.assertFalse((self.base / "BLUEPRINT.md").exists())
        dialogs: List[str] = []
        page.on("dialog", lambda d: (dialogs.append(d.message), d.accept()))
        page.get_by_role("button", name="Ghi BLUEPRINT.md").click()
        page.get_by_text(re.compile(r"^Đã ghi ")).wait_for()
        self.assertEqual(len(dialogs), 1)
        text = (self.base / "BLUEPRINT.md").read_text(encoding="utf-8")
        self.assertEqual(len(re.findall(r"^- \[ \] `[A-Z0-9-]+` \*\*MUST\*\*", text, re.M)), must)
        self.assertEqual(watch.take(), [])


if __name__ == "__main__":
    unittest.main()
