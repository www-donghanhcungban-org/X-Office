"""`GET /api/office` — màn Văn phòng (SPEC-app §3.9): ai đang ngồi bàn nào, làm task nào, feed hoạt động.

Chỉ đọc artifact trên đĩa (state vòng, PLAN, `.autopilot/runs.jsonl`) — trạng thái nhân vật là SUY RA từ bằng chứng,
không phải tín hiệu thời gian thực; app không chạy lệnh (ADR-0038). Chủ đề văn phòng nằm ở phía trình duyệt.
"""

from __future__ import annotations

import datetime as _dt
from typing import Any, Dict, List, Optional, Tuple

from xt_app.api_overview import _plan_file, _verdict
from xt_app.server import Ctx, Routes

FEED_MAX = 15
# (khoá, nhãn, agent trong runs.jsonl — None = phiên chính tự làm). Thứ tự = thứ tự bàn. Bàn không có nguồn bằng chứng
# (`UNTRACKED`: reviewer/researcher không ghi vào runs.jsonl) trả `untracked` — không khai "rảnh" khi không biết.
SEATS: Tuple[Tuple[str, str, Optional[str]], ...] = (
    ("main", "Điều phối", None),
    ("executor", "Thực thi", "executor"),
    ("executor-deep", "Thực thi sâu", "executor-deep"),
    ("reviewer", "Review", "reviewer"),
    ("researcher", "Nghiên cứu", "researcher"),
)
UNTRACKED = frozenset({"reviewer", "researcher"})
# Giá trị `loop_verdict` có thể trả (không gồm verdict của trial/perf).
WORKING = frozenset({"continue", "verify"})
WAITING = frozenset({"done-pending-human", "blocked", "budget"})
# Lần chạy cuối cũ hơn cửa sổ này → bàn không còn "đang làm" (agent có thể đã dừng mà task vẫn mở).
FRESH = _dt.timedelta(minutes=30)
SKEW = _dt.timedelta(minutes=2)  # lệch đồng hồ chấp nhận cho thời điểm ở tương lai


def _now() -> _dt.datetime:
    return _dt.datetime.now(_dt.timezone.utc)


def _fresh(ctx: Ctx, row: Dict[str, Any]) -> bool:
    """Lần chạy trong cửa sổ FRESH; thời điểm ở tương lai (quá SKEW — đồng hồ lệch, ghi tay) không tin (AUD-HAR-024)."""
    at = ctx.xt._parse_iso(str(row.get("finished") or row.get("started") or ""))
    return at is not None and -SKEW <= _now() - at <= FRESH


_XT_ERRORS = (OSError, ValueError, KeyError, TypeError, AttributeError)


def _tasks(ctx: Ctx, state: Dict[str, Any]) -> Dict[str, Dict[str, str]]:
    """id → {state, title} của PLAN đang dùng; không có/hỏng → {}."""
    rel = _plan_file(ctx, state)
    if rel is None:
        return {}
    try:
        tasks = ctx.xt.parse_plan(ctx.base / rel)
    except (OSError, ValueError):
        return {}
    return {t["id"]: {"state": t["state"], "title": t["title"]} for t in tasks}


def _runs(ctx: Ctx) -> List[Dict[str, Any]]:
    try:
        rows = ctx.xt.read_runs(ctx.base)
    except _XT_ERRORS:
        return []
    return [r for r in rows if isinstance(r, dict)]


def _main_state(verdict: str) -> str:
    if verdict in WORKING:
        return "work"
    if verdict in WAITING:
        return "wait"
    return "done" if verdict == "done" else "idle"


def _seat_state(ctx: Ctx, row: Optional[Dict[str, Any]], tasks: Dict[str, Dict[str, str]], active: bool) -> str:
    """Bàn của agent con: lần chạy cuối (trong cửa sổ FRESH) là task còn mở của vòng đang chạy → làm (xanh) / sửa (đỏ);
    khác → rảnh."""
    if row is None or not active or tasks.get(str(row.get("task")), {}).get("state") != " " or not _fresh(ctx, row):
        return "idle"
    return "work" if row.get("exit_code") == 0 else "fail"


def _task_ref(task_id: Any, tasks: Dict[str, Dict[str, str]]) -> Optional[Dict[str, str]]:
    if not isinstance(task_id, str):
        return None
    return {"id": task_id, "title": tasks.get(task_id, {}).get("title", "")}


def _state_of(ctx: Ctx, key: str, verdict: str, row: Optional[Dict[str, Any]], tasks: Dict[str, Dict[str, str]]) -> str:
    if key in UNTRACKED:
        return "untracked"
    return _main_state(verdict) if key == "main" else _seat_state(ctx, row, tasks, verdict in WORKING)


def _seats(
    ctx: Ctx, verdict: str, rows: List[Dict[str, Any]], tasks: Dict[str, Dict[str, str]]
) -> List[Dict[str, Any]]:
    last: Dict[Optional[str], Dict[str, Any]] = {}
    for r in rows:
        ex = r.get("executor")
        last[ex if isinstance(ex, str) else None] = r
    out: List[Dict[str, Any]] = []
    for key, label, agent in SEATS:
        row = last.get(agent)
        st = _state_of(ctx, key, verdict, row, tasks)
        open_task = row is not None and tasks.get(str(row.get("task")), {}).get("state") == " " and _fresh(ctx, row)
        task = _task_ref(row.get("task"), tasks) if row is not None and open_task and st in ("work", "fail") else None
        out.append({"key": key, "label": label, "state": st, "task": task})
    return out


def _feed(rows: List[Dict[str, Any]], tasks: Dict[str, Dict[str, str]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for row in reversed(rows[-FEED_MAX:]):
        ex = row.get("executor")
        out.append(
            {
                "at": str(row.get("finished") or row.get("started") or ""),
                "agent": ex if isinstance(ex, str) else "main",
                "task": _task_ref(row.get("task"), tasks),
                "ok": row.get("exit_code") == 0,
            }
        )
    return out


def _counts(tasks: Dict[str, Dict[str, str]]) -> Dict[str, int]:
    states = [t["state"] for t in tasks.values()]
    return {"open": states.count(" "), "done": states.count("x"), "skipped": states.count("~")}


def _office(ctx: Ctx) -> Tuple[int, Dict[str, Any]]:
    try:
        state = ctx.xt.read_state(ctx.base) or {}
    except _XT_ERRORS:
        state = {}
    loop = _verdict(ctx)
    tasks = _tasks(ctx, state)
    rows = _runs(ctx)
    pending = [
        {"id": str(k), "reason": str((v if isinstance(v, dict) else {}).get("reason", ""))}
        for k, v in ctx.xt._deferred(state).items()
    ]
    return 200, {
        "project": ctx.base.name,
        "loop": loop,
        "seats": _seats(ctx, loop["verdict"], rows, tasks),
        "tasks": _counts(tasks),
        "pending_human": pending,
        "feed": _feed(rows, tasks),
    }


ROUTES: Routes = {("GET", "/api/office"): _office}
