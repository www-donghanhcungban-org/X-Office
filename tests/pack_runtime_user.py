"""BASE-SEC-006: kiểm USER cuối trong stage chạy của mỗi Dockerfile do repo theo dõi."""

import os
from pathlib import Path
import re
import subprocess
import sys


def instructions(text: str):
    lines = iter(text.splitlines())
    escape = "\\"
    parts = []
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#"):
            directive = re.fullmatch(r"#\s*escape\s*=\s*([\\`])", line, re.I)
            if directive:
                escape = directive[1]
            continue
        if line.endswith(escape):
            parts.append(line[:-1])
            continue
        parts.append(line)
        statement = " ".join(parts)
        parts.clear()
        yield statement.split()
        # COPY/RUN có thể chứa heredoc nhiều dòng. Nội dung đó là dữ liệu.
        for match in re.finditer(r"""(?:^|\s)\d*<<(-?)(['"]?)([\w.-]+)\2(?=\s|$)""", statement):
            for body in lines:
                if (body.lstrip("\t") if match[1] else body) == match[3]:
                    break
            else:
                raise ValueError("heredoc chưa kết thúc")
    if parts:
        raise ValueError("dòng tiếp nối chưa kết thúc")


def runtime_user(text: str) -> str:
    user = ""
    stage = False
    for fields in instructions(text):
        instruction = fields[0].upper()
        if instruction == "FROM":
            stage = True
            user = ""
        elif stage and instruction == "USER":
            user = fields[1].split(":", 1)[0] if len(fields) == 2 else ""
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.-]*|[0-9]+", user):
        raise ValueError("stage cuối cần USER tĩnh và tường minh")
    if user.lower() == "root" or re.fullmatch(r"0+", user):
        raise ValueError("stage cuối đang dùng root")
    return user


def main() -> int:
    names = subprocess.check_output(["git", "ls-files", "-z", "--", ":(icase,glob)**/Dockerfile*"])
    for name in names.split(b"\0"):
        if name:
            path = Path(os.fsdecode(name))
            try:
                user = runtime_user(path.read_text(encoding="utf-8"))
            except (OSError, ValueError) as error:
                print(f"{path}: {error}", file=sys.stderr)
                return 1
            print(f"{path}: USER {user}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
