"""Đối chiếu báo cáo pilot sổ ghi chú với receipt dev và kết quả chạy trình duyệt."""

import argparse
import json
import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import xt


def require(ok: bool, message: str) -> None:
    if not ok:
        raise ValueError(message)


def nonnegative(value: object) -> bool:
    return type(value) is int and value >= 0 or type(value) is float and math.isfinite(value) and value >= 0


def verify(report_path: Path) -> float:
    """Trả về số giây từ khi nhận ý tưởng tới receipt của ứng viên đã kiểm."""
    markdown = report_path.read_text(encoding="utf-8")
    blocks = re.findall(r"^```json[ \t]*\n(.*?)^```[ \t]*$", markdown, re.MULTILINE | re.DOTALL)
    require(len(blocks) == 1, "Báo cáo cần đúng một khối json số đo pilot")
    summary = json.loads(blocks[0])
    require(isinstance(summary, dict), "Số đo pilot phải là một object")
    require(isinstance(summary.get("idea"), str) and bool(summary["idea"].strip()), "Thiếu ý tưởng gốc")
    for field in ("tasks", "failed_gates", "human_questions"):
        require(type(summary.get(field)) is int and summary[field] >= 0, f"Số đo {field} không hợp lệ")
    require(summary["tasks"] > 0 and summary["human_questions"] == 0, "Pilot cần có task và hoàn tất với 0 lượt hỏi")
    require("cost_usd" in summary, "Thiếu cost_usd (dùng null nếu chưa đo)")
    require(summary["cost_usd"] is None or nonnegative(summary["cost_usd"]), "Số đo cost_usd không hợp lệ")

    evidence_dir = report_path.with_suffix("")
    ledger = xt._validate_deploy_ledger(json.loads((evidence_dir / "DEPLOYS.json").read_text(encoding="utf-8")))
    dev = ledger["envs"].get("dev")
    require(bool(dev) and not dev["unknown"] and dev["current"] is not None, "Chưa xác nhận bản dev đang chạy")
    current = dev["current"]
    require(current in ledger["events"], "Thiếu sự kiện triển khai của ứng viên trong sổ")
    subject = current["subject"]
    require(all(summary.get(k) == subject[k] for k in ("head", "digest")), "SHA/digest của báo cáo khác receipt")
    started = xt._deploy_utc(summary.get("started"))
    require(started is not None and started <= xt._deploy_utc(current["started"]), "Thời điểm bắt đầu pilot sai")

    browser = json.loads((evidence_dir / "preview-browser.json").read_text(encoding="utf-8"))
    require(isinstance(browser, dict), "Kết quả trình duyệt phải là một object")
    require(type(browser.get("schema")) is int and browser["schema"] == 1, "Sai schema kết quả trình duyệt")
    require(browser.get("result") == "passed", "Trình duyệt chưa qua kiểm tra")
    require(browser.get("subject") == subject, "Trình duyệt đã thử ứng viên khác receipt")
    require(browser.get("served_digest") == current["served_digest"], "Digest phục vụ khác kết quả trình duyệt")
    artifacts = [{**item, "problem": None} for item in current["artifacts"]]
    # Dùng cùng phép tính digest của release-check trên danh sách artifact đã ghi.
    computed, _ = xt._release_subject(evidence_dir, artifacts, subject["head"], tree_readable=False)
    require(computed["digest"] == subject["digest"], "Digest ứng viên không khớp danh sách artifact")
    archive = [item["sha256"] for item in artifacts if item["path"] == "dist/app.tgz"]
    require(len(archive) == 1 and browser.get("artifact_sha256") == archive[0], "Sai hash dist/app.tgz")
    require(browser.get("checks") == ["login", "create-note", "reload-note"], "Thiếu luồng đăng nhập, tạo và đọc lại")
    require(nonnegative(browser.get("elapsed_seconds")), "Thiếu thời gian chạy kiểm tra trình duyệt")
    return (xt._deploy_utc(current["finished"]) - started).total_seconds()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    try:
        elapsed = verify(args.report)
    except (OSError, ValueError, RecursionError, xt.DeployError) as error:
        print(f"Pilot chưa đạt: {error}", file=sys.stderr)
        return 1
    print(f"Pilot đã đối chiếu với receipt và trình duyệt. Thời gian tới bản dev: {elapsed:g} giây.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
