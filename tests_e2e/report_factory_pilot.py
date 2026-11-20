"""Ghi báo cáo pilot sổ ghi chú từ kết quả các bước GitHub Actions của ca sạch."""

import argparse
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tests_e2e.verify_factory_pilot import require, verify, xt

GATES = (
    "scaffold",
    "dependencies",
    "static_checks",
    "unit_gate",
    "build_candidate",
    "browser_setup",
    "browser_preview",
    "restore_gate",
)
OUTCOMES = {"success", "failure", "cancelled", "skipped"}


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def capture_gates(steps, output):
    """Giữ cả outcome trước continue-on-error; chỉ xuất các trường của tám bước đo."""
    output.mkdir(parents=True, exist_ok=False)
    measured = {}
    for name in GATES:
        item = steps.get(name, {})
        measured[name] = {
            key: item.get(key) if item.get(key) in OUTCOMES else "missing" for key in ("outcome", "conclusion")
        }
    failed = sum("failure" in row.values() for row in measured.values())
    write_json(output / "ci-steps.json", {"steps": measured, "failed_gates": failed})
    require(
        all(row == {"outcome": "success", "conclusion": "success"} for row in measured.values()),
        "Cổng starter đỏ, thiếu hoặc bỏ qua; xem ci-steps.json",
    )
    return len(measured), failed


def generate(app, browser_path, started_file, idea, steps, run_url, output):
    tasks, failed = capture_gates(steps, output)
    quoted = "\n".join("> " + line for line in idea.split("\n"))
    require(
        f"## Ý tưởng gốc\n\n{quoted}\n\n" in (app / "PROJECT.md").read_text(encoding="utf-8"),
        "Ý tưởng không khớp PROJECT.md của repo vừa tạo",
    )
    with tempfile.TemporaryDirectory(dir=output) as scratch:
        # Chỉ công bố bản Markdown sau khi kiểm cả hai snapshot dưới đây.
        docs = Path(scratch) / "docs"
        report = docs / "ops/FACTORY-PILOT-1.md"
        evidence = report.with_suffix("")
        evidence.mkdir(parents=True)
        shutil.copyfile(app / "docs/ops/DEPLOYS.json", evidence / "DEPLOYS.json")
        shutil.copyfile(browser_path, evidence / "preview-browser.json")
        ledger = xt._validate_deploy_ledger(read_json(evidence / "DEPLOYS.json"))
        current = ledger["envs"].get("dev", {}).get("current")
        require(current is not None, "Thiếu receipt dev")
        events = [entry for entry in ledger["events"] if entry["env"] == "dev"]
        require(
            len(events) == 2
            and events[0] == current
            and events[-1]["result"] == "rolled_back"
            and events[-1]["served_digest"] == current["subject"]["digest"]
            and events[-1]["subject"]["digest"] != current["subject"]["digest"],
            "Sổ chưa xác nhận quay lại bản A",
        )
        require(
            bool(run_url)
            and all(e["runner"]["kind"] == "ci" and e["runner"]["run_url"] == run_url for e in events)
            and read_json(evidence / "preview-browser.json").get("run_url") == run_url,
            "Receipt và trình duyệt phải cùng lượt CI",
        )
        summary = {
            "idea": idea,
            "started": started_file.read_text(encoding="utf-8").strip(),
            "head": current["subject"]["head"],
            "digest": current["subject"]["digest"],
            "tasks": tasks,
            "failed_gates": failed,
            "human_questions": 0,
            "cost_usd": None,
        }
        block = json.dumps(summary, indent=2, ensure_ascii=False)
        report.write_text(f"# Pilot 1 · Sổ ghi chú\n\n```json\n{block}\n```\n", encoding="utf-8")
        elapsed = verify(report)
        with report.open("a", encoding="utf-8") as stream:
            stream.write(
                f"\nTừ lệnh tạo repo tới receipt dev của bản A mất **{elapsed:g} giây**. "
                "Trình duyệt đăng nhập, tạo và đọc lại ghi chú trên loopback của runner. "
                "Sau phép thử smoke lỗi có chủ ý ở bản B, runner xác nhận bản A và dữ liệu được khôi phục.\n\n"
                f"Số task là {tasks} bước CI của ca starter, từ tạo repo tới kiểm tra quay lui. "
                "Số cổng đỏ đếm các bước này có kết quả failure trước hoặc sau continue-on-error. "
                "Ca lỗi có chủ ý được tính thành công khi runner quan sát đúng kết quả mong đợi. "
                "Job không tương tác với người. Thời gian làm tính năng mới, công duyệt và chi phí chưa được đo.\n\n"
                "Bản dev chỉ phục vụ trong runner. Chưa có phê duyệt, triển khai production hay số liệu vận hành.\n\n"
                f"[Lượt CI]({run_url}) · [Kết quả từng bước](../../ci-steps.json) · "
                "[Receipt](FACTORY-PILOT-1/DEPLOYS.json) · [Trình duyệt](FACTORY-PILOT-1/preview-browser.json)\n"
            )
        verify(report)
        docs.rename(output / "docs")
    return output / "docs/ops/FACTORY-PILOT-1.md"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for option in ("app", "browser", "started-file", "output-dir"):
        parser.add_argument("--" + option, type=Path, required=True)
    parser.add_argument("--idea", required=True)
    parser.add_argument("--run-url", required=True)
    args = parser.parse_args()
    try:
        result = generate(
            args.app,
            args.browser,
            args.started_file,
            args.idea,
            json.loads(os.environ["XT_PILOT_STEPS"]),
            args.run_url,
            args.output_dir,
        )
    except (KeyError, OSError, ValueError, xt.DeployError) as error:
        print(f"Pilot chưa đạt: {error}", file=sys.stderr)
        return 1
    print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
