"""Cô lập mạng cho lớp test chạy guard/hook/adapter (AUD-TEST-109/112): không lớp nào được gọi `gh`/`curl` thật.

`isolate_network(case)` làm hai việc, cả hai tự hoàn lại ở cuối test:
- `guard.merge_check` trả kết quả giả (mặc định "lỗi" — như máy không có mạng; truyền `MERGE_OK` cho ca cần xanh);
- đặt shim `gh`/`curl` lỗi ở đầu PATH của tiến trình (tiến trình con của hook/adapter thừa kế), mỗi lời gọi ghi một dòng
  vào tệp log → test đếm được số lời gọi mạng lọt qua.
"""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
import unittest.mock as mock
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).resolve().parent.parent
HOOKS = ROOT / ".claude" / "hooks"

SHA = "a" * 40
MERGE_OK = {"verdict": "merge", "hard": [], "head": SHA, "eligible": True, "reasons": ["ok"]}
MERGE_ERR = {"verdict": "lỗi", "reasons": ["merge-check giả (cô lập mạng)"]}

SHIM = '#!/bin/sh\necho "${0##*/} $*" >> "$NET_SHIM_LOG"\nexit 1\n'
SHIM_TOOLS = ("gh", "curl")


def make_shims(directory: Path) -> Path:
    """Tạo shim `gh`/`curl` lỗi trong `directory`; trả đường tệp log (chưa tồn tại tới khi có lời gọi đầu)."""
    for tool in SHIM_TOOLS:
        shim = directory / tool
        shim.write_text(SHIM, encoding="utf-8")
        shim.chmod(0o755)
    return directory / "net.log"


def calls(log: Path) -> list[str]:
    return log.read_text(encoding="utf-8").splitlines() if log.exists() else []


def isolate_network(case: unittest.TestCase, merge_check: dict | None = None, *guards: ModuleType) -> Path:
    """Gọi trong `setUp`; trả đường tệp log lời gọi shim."""
    if str(HOOKS) not in sys.path:
        sys.path.insert(0, str(HOOKS))
    import guard

    td = Path(case.enterContext(tempfile.TemporaryDirectory()))
    log = make_shims(td)
    outer = os.environ.get("NET_SHIM_LOG")  # test bao ngoài (đếm lời gọi) đã đặt log → dùng chung để đếm được
    log = Path(outer) if outer else log
    env = {"PATH": f"{td}{os.pathsep}{os.environ.get('PATH', '')}", "NET_SHIM_LOG": str(log)}
    case.enterContext(mock.patch.dict(os.environ, env))
    # `xt_adapter.load_guard` thay `sys.modules["guard"]` bằng bản nạp mới → test giữ tham chiếu cũ (import đầu file,
    # `setUpClass`) có thể là module khác: mock cả những module được truyền vào.
    for mod in {id(m): m for m in (guard, *guards)}.values():
        case.enterContext(mock.patch.object(mod, "merge_check", return_value=merge_check or MERGE_ERR))
    return log


def guard_loader(load, merge_check: dict | None = None):
    """Bọc bộ nạp guard của adapter (nạp BẢN MỚI từ nguồn mỗi lần → mock `guard.merge_check` ở tiến trình test không tới
    được): bản vừa nạp được gắn merge-check giả trước khi dùng."""

    def loader(root: str):
        g = load(root)
        if g is not None:
            g.merge_check = lambda *_a, **_k: merge_check or MERGE_ERR
        return g

    return loader
