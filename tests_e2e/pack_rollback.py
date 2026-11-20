"""Xác nhận artifact cũ bị chặn và Docker tự khôi phục bản dev của gói khi smoke thất bại."""

from __future__ import annotations

import argparse
from hashlib import sha256
from http.client import HTTPConnection
import json
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
from uuid import UUID, uuid4

CLI = [sys.executable, ".xtemplates/scripts/xt.py", "deploy", "run", "--env", "dev", "--json"]
LEDGER = Path("docs/ops/DEPLOYS.json")


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise ValueError(reason)


def check_deploy_gate(digest: str, expected: str) -> None:
    run = subprocess.run(
        [sys.executable, ".xtemplates/scripts/xt.py", "release-check", "--json"],
        capture_output=True,
        text=True,
        timeout=300,
    )
    report = json.loads(run.stdout)
    require(run.returncode == (0 if report["go"] else 1), "Exit code release-check không khớp báo cáo")
    require(report["subject"]["digest"] == digest, "Release-check không kiểm đúng artifact")
    rows = [row for row in report["rows"] if row["id"] == "deploy"]
    require(len(rows) == 1, "Cần đúng một hàng deploy")
    row = rows[0]
    require(row["level"] == "BLOCKER" and row["result"] == expected, f"Hàng deploy sai: {row}")
    require(("deploy" in report["fails"]) == (expected == "FAIL"), "Danh sách blocker sai ở hàng deploy")
    if expected == "FAIL":
        require("bản dev chưa chạy ứng viên này" in row["evidence"], f"Sai lý do từ chối ứng viên: {row}")
    print(f"release-check: deploy {expected} ({digest})")


def stale() -> None:
    css = Path("src/notes-ui/app.css")
    original = css.read_bytes()
    ledger = LEDGER.read_bytes() if LEDGER.exists() else None
    with TemporaryDirectory() as temp:
        # Phát hiện mọi lệnh Docker, kể cả lệnh chỉ đọc hoặc thất bại trước khi tạo container.
        marker = Path(temp, "docker-called")
        command = Path(temp, "docker")
        command.write_text('#!/bin/sh\ntouch "$XT_TEST_DOCKER_MARKER"\nexit 90\n')
        command.chmod(0o755)
        env = {**os.environ, "PATH": temp + os.pathsep + os.environ["PATH"], "XT_TEST_DOCKER_MARKER": str(marker)}
        try:
            css.write_bytes(original + b"\n/* changed after build */\n")
            run = subprocess.run(CLI, capture_output=True, text=True, env=env, timeout=90)
            require(run.returncode == 2 and "chạy pnpm build" in run.stderr, "Cần từ chối đúng bước xác nhận artifact")
            require(not marker.exists(), "Đã gọi Docker cho artifact cũ")
            require((LEDGER.read_bytes() if LEDGER.exists() else None) == ledger, "Đã ghi sổ dù ứng viên sai")
        finally:
            css.write_bytes(original)


def api(path: str, status: int, data: dict | None = None, token: str = "") -> dict:
    conn = HTTPConnection("127.0.0.1", 4317, timeout=10)
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        conn.request("GET" if data is None else "POST", path, json.dumps(data) if data else None, headers)
        response = conn.getresponse()
        require(response.status == status, f"{path}: HTTP {response.status}, cần {status}")
        return json.loads(response.read())
    finally:
        conn.close()


def rollback() -> None:
    before = json.loads(LEDGER.read_text())
    current = before["envs"]["dev"]["current"]
    baseline = current["subject"]["digest"]
    require(current["result"] == "deployed" and api("/healthz", 200)["digest"] == baseline, "Bản A chưa phục vụ")
    access = subprocess.check_output(["node", "scripts/dev-preview.mjs", "credentials"], timeout=10)
    owner = json.loads(access)["owner"]
    token = api("/v1/login", 200, owner)["token"]
    body = "Ghi chú trước rollback " + uuid4().hex
    note = api("/v1/notes", 201, {"body": body}, token)
    note_id = UUID(note["id"])

    source = Path("src/server.ts")
    original = source.read_bytes()
    good = b"return [201, note];"
    require(original.count(good) == 1, "Fixture cần đúng một handler tạo ghi chú")
    try:
        # B vẫn sẵn sàng trên /healthz nhưng trả sai mã HTTP khi tạo ghi chú.
        source.write_bytes(original.replace(good, b"return [200, note];"))
        subprocess.run(["node", "scripts/build.ts"], check=True, timeout=120)
        artifact_sha = sha256(Path("dist/app.tgz").read_bytes()).hexdigest()
        candidate = sha256(f"dist/app.tgz\0{artifact_sha}\n".encode()).hexdigest()
        require(candidate != baseline, "Artifact B trùng A")
        run = subprocess.run(CLI, capture_output=True, text=True, timeout=900)
        require(run.returncode == 1, f"Ứng viên B cần thất bại sau khi smoke, exit {run.returncode}")
        receipt = json.loads(run.stdout)
        after = json.loads(LEDGER.read_text())
        require(after["events"] == [*before["events"], receipt], "Cần một sự kiện mới khớp stdout")
        require(receipt["subject"]["digest"] == candidate and receipt["result"] == "rolled_back", "Chưa rollback B")
        require(receipt["deploy"]["exit_code"] == 0 and receipt["smoke"]["exit_code"] != 0, "Sai bước lỗi của B")
        require(receipt["rollback"]["exit_code"] == 0 and receipt["served_digest"] == baseline, "Chưa khôi phục A")
        state = after["envs"]["dev"]
        require(not state["unknown"] and state["current"] == current, "Sổ dev chưa chỉ về A")
        require(api("/healthz", 200)["digest"] == baseline, "HTTP không xác nhận A")
        restored_token = api("/v1/login", 200, owner)["token"]
        restored = api(f"/v1/notes/{note_id}", 200, token=restored_token)
        require(restored["id"] == note["id"] and restored["body"] == body, "Mất ghi chú của A sau rollback")
        check_deploy_gate(candidate, "FAIL")
    finally:
        source.write_bytes(original)
        subprocess.run(["node", "scripts/build.ts"], check=True, timeout=120)
    print(f"Đã khôi phục {baseline} sau khi smoke {candidate} thất bại. Đã đọc lại ghi chú của bản A.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("case", choices=["stale", "confirmed", "rollback"])
    args = parser.parse_args()
    require(Path.cwd() == (Path(os.environ["RUNNER_TEMP"]) / "app").resolve(), "Cần dự án tạm của job pack-web-api")
    if args.case == "stale":
        stale()
    elif args.case == "confirmed":
        current = json.loads(LEDGER.read_text())["envs"]["dev"]["current"]
        check_deploy_gate(current["subject"]["digest"], "PASS")
    else:
        rollback()
