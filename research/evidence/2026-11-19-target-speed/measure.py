"""Đo chỉ đọc nhịp giao hàng của một dự án đích từ lịch sử git (nhánh chính, --first-parent).

Dùng: python3 -I measure.py <thư mục repo> <dải commit, ví dụ 0d1b62c..HEAD>

In theo NGÀY (UTC): số commit theo loại (tiền tố conventional + từ khoá nâng khung) và dòng THÊM theo loại đường dẫn.
Giới hạn: dòng thêm không phải giá trị sản phẩm; phân loại đường dẫn là heuristic; bỏ file nhị phân và lockfile.
"""

import collections
import os
import re
import subprocess
import sys

repo, rev = sys.argv[1], sys.argv[2]

LOCK = re.compile(r"(package-lock\.json|pnpm-lock\.yaml)$")
HARNESS = re.compile(r"^(\.xtemplates|\.claude|\.agents|\.husky|\.githooks)/")
DOCS = re.compile(r"(^docs/|\.md$)")
TEST = re.compile(r"(^|/)(tests?|e2e|__tests__|fixtures?)/|\.(test|spec)\.[a-z]+$")
PRODUCT = re.compile(r"^(apps|packages|app|lib|adapters|migrations|messages|public|types|design-system|data|postgres)/")
CIOPS = re.compile(r"^(\.github|scripts|security|deploy|ops|perf|nginx)/")
UPGRADE = re.compile(r"(xtemplates|khung|harness)", re.I)
BOOK = re.compile(r"^docs\((autopilot|progress|blueprint|audit|feedback|xtemplates)\)|^chore\(progress\)", re.I)
COLS = [
    "commit",
    "feat",
    "fix",
    "ci/test",
    "sổ sách",
    "nâng khung",
    "khác",
    "mã sp",
    "test",
    "khung",
    "tài liệu",
    "ci/ops",
]


def path_kind(path: str) -> str | None:
    if LOCK.search(path):
        return None
    for name, rx in (("khung", HARNESS), ("tài liệu", DOCS), ("test", TEST), ("mã sp", PRODUCT), ("ci/ops", CIOPS)):
        if rx.search(path):
            return name
    return None


def subject_kind(subject: str) -> str:
    if subject.startswith(("chore", "Update")) and UPGRADE.search(subject):
        return "nâng khung"
    if BOOK.search(subject):
        return "sổ sách"
    if subject.startswith("feat"):
        return "feat"
    if subject.startswith("fix"):
        return "fix"
    if subject.startswith(("ci", "test", "build")):
        return "ci/test"
    return "khác"


out = subprocess.run(
    ["git", "-C", repo, "log", "--first-parent", "--numstat", "--date=format-local:%m-%d", "--format=@@%cd|%s", rev],
    capture_output=True,
    text=True,
    check=True,
    env={**os.environ, "TZ": "UTC"},
).stdout

days: dict[str, collections.Counter[str]] = collections.defaultdict(collections.Counter)
day = ""
for line in out.splitlines():
    if line.startswith("@@"):
        day, subject = line[2:].split("|", 1)
        days[day]["commit"] += 1
        days[day][subject_kind(subject)] += 1
    elif line.strip() and day:
        added, _deleted, path = line.split("\t", 2)
        kind = path_kind(path)
        if added != "-" and kind:
            days[day][kind] += int(added)

print(f"{os.path.basename(repo)} {rev}")
print("ngày | " + " | ".join(COLS))
total: collections.Counter[str] = collections.Counter()
for day in sorted(days):
    print(f"{day} | " + " | ".join(str(days[day][c]) for c in COLS))
    total.update(days[day])
print("TỔNG | " + " | ".join(str(total[c]) for c in COLS))
