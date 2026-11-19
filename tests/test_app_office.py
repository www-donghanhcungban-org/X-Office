"""Test cho scripts/xt_app/api_office.py (SPEC-app §3 `GET /api/office`, F-008) và dữ liệu kiểu văn phòng."""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any, Dict, List, Optional
import unittest.mock as mock

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import xt
from xt_app import api_office, server

PLAN = "## Lát 1\n\n- [x] `T-001` xong\n- [ ] `T-002` mở\n- [ ] `T-003` mở sâu\n- [~] `T-004` bỏ\n"
LOOP = "2026-11-19T10:00:00Z"
NOW = dt.datetime(2026, 11, 19, 10, 30, tzinfo=dt.timezone.utc)  # lần chạy 10:0x còn trong cửa sổ FRESH (30 phút)


def call(base: Path) -> Dict[str, Any]:
    ctx = server.Ctx(xt, base=base, framework=base / "framework", query={}, body=None)
    code, body = api_office.ROUTES[("GET", "/api/office")](ctx)
    assert code == 200
    return body


def write(base: Path, rel: str, text: str) -> None:
    p = base / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def run(task: str, code: int, executor: Optional[str], at: str) -> Dict[str, Any]:
    return {
        "task": task,
        "exit_code": code,
        "started": at,
        "finished": at,
        "head": "a",
        "signature": None,
        "loop": LOOP,
        "executor": executor,
    }


def project(base: Path, runs: List[Dict[str, Any]], **state: Any) -> None:
    write(base, "docs/autopilot/PLAN.md", PLAN)
    st = {"active": True, "started": LOOP, "plan": "docs/autopilot/PLAN.md", "single_session": True, **state}
    write(base, ".autopilot/state.json", json.dumps(st))
    write(base, ".autopilot/runs.jsonl", "".join(json.dumps(r) + "\n" for r in runs))


def seat(body: Dict[str, Any], key: str) -> Dict[str, Any]:
    return next(s for s in body["seats"] if s["key"] == key)


class OfficeApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.base = Path(self._tmp.name) / "văn-phòng"
        self.base.mkdir()
        self._now = mock.patch.object(api_office, "_now", return_value=NOW)
        self._now.start()

    def tearDown(self) -> None:
        self._now.stop()
        self._tmp.cleanup()

    def test_empty_project_all_idle(self) -> None:
        got = call(self.base)
        self.assertEqual(got["project"], "văn-phòng")
        self.assertEqual(got["loop"]["verdict"], "inactive")
        self.assertEqual([s["key"] for s in got["seats"]], [k for k, _, _ in api_office.SEATS])
        self.assertEqual({s["state"] for s in got["seats"] if s["key"] not in api_office.UNTRACKED}, {"idle"})
        self.assertEqual(
            [s["state"] for s in got["seats"] if s["key"] in api_office.UNTRACKED], ["untracked", "untracked"]
        )
        self.assertTrue(all(s["task"] is None for s in got["seats"]))
        self.assertEqual(got["tasks"], {"open": 0, "done": 0, "skipped": 0})
        self.assertEqual(got["pending_human"], [])
        self.assertEqual(got["feed"], [])

    def test_running_loop_maps_runs_to_seats(self) -> None:
        runs = [
            run("T-001", 0, None, "2026-11-19T10:05:00Z"),
            run("T-002", 0, "executor", "2026-11-19T10:06:00Z"),
            run("T-003", 1, "executor-deep", "2026-11-19T10:07:00Z"),
        ]
        project(self.base, runs, deferred={"T-009": {"reason": "cần khoá trả phí", "at": LOOP}, "T-010": "hỏng"})
        with mock.patch.object(xt, "loop_verdict", return_value={"verdict": "continue", "reason": "còn việc"}):
            got = call(self.base)
        main = seat(got, "main")
        self.assertEqual(main["state"], "work")
        self.assertIsNone(main["task"])  # lần chạy cuối của phiên chính là task đã xong → không gắn task
        self.assertEqual(
            seat(got, "executor"),
            {"key": "executor", "label": "Thực thi", "state": "work", "task": {"id": "T-002", "title": "mở"}},
        )
        self.assertEqual(seat(got, "executor-deep")["state"], "fail")
        self.assertEqual(seat(got, "executor-deep")["task"]["id"], "T-003")
        self.assertEqual(seat(got, "reviewer")["state"], "untracked")  # không có nguồn → không khai "rảnh"
        self.assertEqual(got["tasks"], {"open": 2, "done": 1, "skipped": 1})
        self.assertEqual(
            got["pending_human"], [{"id": "T-009", "reason": "cần khoá trả phí"}, {"id": "T-010", "reason": ""}]
        )
        self.assertEqual([r["task"]["id"] for r in got["feed"]], ["T-003", "T-002", "T-001"])  # mới nhất trước
        self.assertEqual([r["agent"] for r in got["feed"]], ["executor-deep", "executor", "main"])
        self.assertEqual([r["ok"] for r in got["feed"]], [False, True, True])
        self.assertEqual(got["feed"][0]["at"], "2026-11-19T10:07:00Z")

    def test_feed_capped_and_unknown_task(self) -> None:
        runs = [run("T-002", 0, "executor", f"2026-11-19T10:{i:02d}:00Z") for i in range(api_office.FEED_MAX + 5)]
        runs.append({**run("T-777", 1, None, ""), "finished": None, "started": "2026-11-19T11:00:00Z"})
        project(self.base, runs)
        got = call(self.base)
        self.assertEqual(len(got["feed"]), api_office.FEED_MAX)
        self.assertEqual(
            got["feed"][0],
            {"at": "2026-11-19T11:00:00Z", "agent": "main", "task": {"id": "T-777", "title": ""}, "ok": False},
        )

    def test_states_follow_verdict(self) -> None:
        project(self.base, [run("T-002", 0, "executor", LOOP)])
        cases = {"done-pending-human": "wait", "blocked": "wait", "done": "done", "stopped": "idle", "verify": "work"}
        for verdict, want in cases.items():
            with (
                self.subTest(verdict=verdict),
                mock.patch.object(xt, "loop_verdict", return_value={"verdict": verdict, "reason": ""}),
            ):
                got = call(self.base)
                self.assertEqual(seat(got, "main")["state"], want)
                # agent con chỉ "làm" khi vòng đang chạy
                self.assertEqual(seat(got, "executor")["state"], "work" if want == "work" else "idle")

    def test_stale_run_is_not_working(self) -> None:
        """Lần chạy cuối cũ hơn FRESH → bàn rảnh, không gắn task (agent có thể đã dừng dù task còn mở)."""
        project(self.base, [run("T-002", 0, "executor", "2026-11-19T09:00:00Z"), run("T-003", 1, None, "garbage")])
        with mock.patch.object(xt, "loop_verdict", return_value={"verdict": "continue", "reason": ""}):
            got = call(self.base)
        self.assertEqual(seat(got, "executor"), {"key": "executor", "label": "Thực thi", "state": "idle", "task": None})
        self.assertEqual(
            seat(got, "main")["state"], "idle"
        )  # vòng "continue" nhưng không lần chạy nào tươi → không khai làm
        self.assertIsNone(seat(got, "main")["task"])  # thời điểm không đọc được → không coi là tươi

    def test_future_run_is_not_working(self) -> None:
        """Thời điểm ở tương lai quá SKEW (đồng hồ lệch/ghi tay) không giữ bàn ở "đang làm"; lệch nhỏ vẫn tính."""
        project(
            self.base,
            [
                run("T-002", 0, "executor", "2099-01-01T00:00:00Z"),
                run("T-003", 1, "executor-deep", "2026-11-19T10:31:00Z"),
            ],
        )
        with mock.patch.object(xt, "loop_verdict", return_value={"verdict": "continue", "reason": ""}):
            got = call(self.base)
        self.assertEqual(seat(got, "executor")["state"], "idle")
        self.assertIsNone(seat(got, "executor")["task"])
        self.assertEqual(seat(got, "executor-deep")["state"], "fail")  # 1 phút sau NOW: trong SKEW

    def test_corrupt_inputs_never_500(self) -> None:
        """Đường PLAN có NUL (resolve ném ValueError) và runs.jsonl lồng quá sâu (RecursionError) → 200, dữ liệu rỗng."""
        project(self.base, [run("T-002", 0, "executor", LOOP)], plan="x\u0000y")
        self.assertEqual(call(self.base)["tasks"], {"open": 0, "done": 0, "skipped": 0})
        with mock.patch.object(xt, "read_runs", side_effect=RecursionError("sâu")):
            self.assertEqual(call(self.base)["feed"], [])

    def test_now_is_utc(self) -> None:
        self._now.stop()
        try:
            self.assertEqual(api_office._now().tzinfo, dt.timezone.utc)
        finally:
            self._now.start()

    def test_broken_inputs_do_not_500(self) -> None:
        project(self.base, [run("T-002", 0, "executor", LOOP)])
        with mock.patch.object(xt, "read_state", side_effect=ValueError("hỏng")):
            got = call(self.base)
        self.assertEqual(got["tasks"], {"open": 2, "done": 1, "skipped": 1})  # không state → PLAN mặc định vẫn đọc được
        with mock.patch.object(xt, "read_runs", side_effect=OSError("hỏng")):
            self.assertEqual(call(self.base)["feed"], [])
        with mock.patch.object(xt, "parse_plan", side_effect=ValueError("hỏng")):
            self.assertEqual(call(self.base)["tasks"], {"open": 0, "done": 0, "skipped": 0})

    def test_non_string_task_ids_ignored(self) -> None:
        project(self.base, [{**run("T-002", 0, "executor", LOOP), "task": "T-002"}])
        self.assertIsNone(api_office._task_ref(5, {}))
        with mock.patch.object(xt, "read_runs", return_value=[run("T-002", 0, "executor", LOOP), "rác"]):
            got = call(self.base)
        self.assertEqual(len(got["feed"]), 1)


class OfficeVendorTest(unittest.TestCase):
    """ADR-0082: three.js vendor đúng từng byte như SOURCE ghi (sha256) và qua vendor-check --strict — lệnh kiểm grep của
    blueprint (BASE-CFG-001/DATA-006) chỉ miễn ba tệp đã ghim nên sửa chúng phải lộ ra ở đây."""

    VENDOR = ROOT / "scripts" / "app" / "vendor" / "three"

    def test_sha256_matches_source(self) -> None:
        source = (self.VENDOR / "SOURCE").read_text(encoding="utf-8")
        pinned = dict(re.findall(r"^(three\.\w+\.js) sha256: ([0-9a-f]{64})$", source, re.M))
        self.assertEqual(set(pinned), {"three.module.js", "three.core.js"})
        for name, digest in pinned.items():
            with self.subTest(name=name):
                self.assertEqual(hashlib.sha256((self.VENDOR / name).read_bytes()).hexdigest(), digest)
        self.assertEqual(
            sorted(p.name for p in self.VENDOR.iterdir()), ["LICENSE", "SOURCE", "three.core.js", "three.module.js"]
        )

    def test_vendor_check_strict_green(self) -> None:
        self.assertEqual(xt.vendor_dir_problems(ROOT, "scripts/app/vendor", set()), [])
        self.assertEqual(xt.vendor_source_gaps(ROOT, "scripts/app/vendor", set()), [])


class OfficeThemesStaticTest(unittest.TestCase):
    """Các kiểu văn phòng chủ dự án yêu cầu phải có trong dữ liệu (đọc tĩnh, không cần trình duyệt)."""

    def test_required_themes_and_seasons(self) -> None:
        text = (ROOT / "scripts" / "app" / "office" / "themes.js").read_text(encoding="utf-8")
        ids = set(re.findall(r'^\s{4}id: "([\w-]+)"', text, re.M))
        self.assertEqual(ids, {"tech", "studio", "library", "night", "cyberpunk", "cafe", "space", "hospital"})
        for season in ("auto", "off", "noel", "tet"):
            self.assertIn(f'id: "{season}"', text)

    def test_every_prop_kind_is_drawn(self) -> None:
        themes = (ROOT / "scripts" / "app" / "office" / "themes.js").read_text(encoding="utf-8")
        scene = (ROOT / "scripts" / "app" / "office" / "scene.js").read_text(encoding="utf-8")
        kinds = set(re.findall(r'kind: "(\w+)"', themes))
        drawn = set(re.findall(r"^const BOX_PROPS = \{([^}]*)\}", scene, re.M)[0].replace(" ", "").split(","))
        drawn = {k.split(":")[0] for k in drawn} | {"rug", "board", "neon", "pipe", "cross"}  # flatProp vẽ 5 loại phẳng
        self.assertEqual(kinds - drawn, set())


if __name__ == "__main__":
    unittest.main()
