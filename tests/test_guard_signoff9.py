"""D-503/D-507 (T-3947): phát hiện cổng ký lần 8 (ứng viên `7b1ebc84`), sửa theo lớp.

- M5 (🔴/🟠): chương trình qua stdin/cờ — thân bỏ nháy kiểu shell, `$` ở thân here-string/ống, nguồn không phải chữ
  (thay tiến trình, fd khác 0, ống từ khâu đọc nguồn đó), cờ viết tắt/dính giá trị, `+cmd`/`-c` của vi/ex/vim, đối số
  vị trí của sqlite3.
- M9 (🟠 chặn oan): thân SQL/manifest/Dockerfile chỉ quét dòng lối thoát shell.

DENY: dạng phải chặn — phần lớn guard ở `7b1ebc84` cho chạy, một số (15 ca) đã bị chặn từ trước và giữ làm hồi quy.
ALLOW: dạng lành phải chạy."""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
import unittest.mock as mock
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("XT_GUARD_PHASE", "harden")
sys.path.insert(0, str(ROOT / ".claude" / "hooks"))
import guard

H = chr(126)  # `~` dựng bằng chr: chữ xoá home không nằm nguyên văn trong tệp test
R = "r" + "m"
WIPE = f"{R} -rf {H}"


def decide(cmd: str, root: Path = ROOT, cwd: Path | None = None) -> dict:
    with (
        mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(root), "XT_GUARD_POLICY": ""}),
        mock.patch.object(guard, "_current_branch", return_value="feat"),
    ):
        return guard.apply_policy(guard.bash_decision(cmd, str(root), str(cwd or root)))


class Base(unittest.TestCase):
    def assert_deny(self, cmds: tuple[str, ...], root: Path = ROOT, cwd: Path | None = None) -> None:
        for cmd in cmds:
            with self.subTest(cmd=cmd):
                self.assertEqual(decide(cmd, root, cwd).get("decision"), "deny")

    def assert_allow(self, cmds: tuple[str, ...], root: Path = ROOT, cwd: Path | None = None) -> None:
        for cmd in cmds:
            with self.subTest(cmd=cmd):
                d = decide(cmd, root, cwd)
                self.assertNotEqual(d.get("decision"), "deny", d.get("reason"))


STDIN_DENY = (
    # 5a: bỏ nháy kiểu shell, `$` ở thân here-string/ống, `${c:-r}m`
    f"ed -s /dev/null <<< '!r\"\"m -rf {H}'",
    f"sqlite3 x.db <<'EOF'\n.shell r''m -rf {H}\nEOF",
    f"psql -c '\\! r\"\"m -rf {H}'",
    f"at now <<< 'r\"\"m -rf {H}'",
    f"crontab - <<'EOF'\n* * * * * r''m -rf {H}\nEOF",
    f"sqlite3 x.db <<EOF\n.shell ${{c:-r}}m -rf {H}\nEOF",
    f"x='!{WIPE}'; ed -s /dev/null <<< \"$x\"",
    f"x='!{WIPE}'; printf '%s\\n' \"$x\" | ed -s /dev/null",
    f"x='{WIPE}'; printf '%s\\n' \"$x\" | at now",
    f"tclsh <<'EOF'\nexec {WIPE}\nEOF",
    # 5b: nguồn không phải chữ
    f"python3 < <(printf '%s\\n' 'import os; os.system(\"{WIPE}\")')",
    "python3 <(printf '%s\\n' 'import os')",
    "perl <(printf x)",
    "cat <(printf '%s\\n' x) | node",
    f"exec 3< <(printf '%s\\n' '!{WIPE}'); ed -s /dev/null <&3",
    f"exec 3< <(printf '%s\\n' '{WIPE}'); sh <&3",
    f"{{ ed -s /dev/null; }} < <(printf '%s\\n' '!{WIPE}')",
    f"bash /dev/stdin < <(printf '%s\\n' '{WIPE}')",
    f"ed -s /dev/null < <(printf '%s\\n' '!{WIPE}')",
    "python3 /dev/fd/3 3<x.py",
    f"crontab <(echo '* * * * * {WIPE}')",
    f"at now < <(echo '{WIPE}')",
    f"sqlite3 -init <(echo '.shell {R}') x.db",
    # 5c: cờ chương trình
    f"ex -s -c '!{WIPE}' -c q /dev/null",
    f"ex -s +'!{WIPE}' +q x.txt",
    f"vim -es -c '!{WIPE}' -c q",
    f"vim -es +'!{WIPE}' +q /dev/null",
    f"vim -es --cmd '!{WIPE}' -c q /dev/null",
    f"make --eva='x:;{WIPE}' x",
    f"make -E'x:;{WIPE}' x",
    f"gdb -batch --eval-command='shell {WIPE}'",
    f"gdb -batch -ex 'shell {WIPE}'",
    f"sqlite3 :memory: '.shell {WIPE}'",
    f"sqlite3 x.db '.shell {WIPE}'",
    f"sqlite3 -cmd '.system {WIPE}' :memory: .quit",
    f"dc -e'!{WIPE}'",
    f"dc --expression='!{WIPE}'",
    f"expect -c 'exec {WIPE}'",
    f"psql --comm='\\! {WIPE}'",
    f"psql -c'\\! {WIPE}'",
    f"mysql -e'system {WIPE}'",
    # công cụ lạ: mọi từ (như trước)
    f"Rscript -e 'system(\"{WIPE}\")'",
    f"x=(a) <<X\n{WIPE}\nX",
)

STDIN_ALLOW = (
    'psql -d app_test -c "truncate table users restart identity cascade;"',
    "psql app <<'SQL'\nselect now() at time zone 'utc';\nSQL",
    'mysql -e "truncate table users"',
    "psql app <<'SQL'\nselect * from t where a != 1;\nSQL",
    "kubectl apply -f - <<'EOF'\nkind: Pod\nspec:\n  containers:\n    - name: app\n      image: python:3.12\n"
    '      command: ["sh", "-c", "echo hi"]\nEOF',
    "docker build -t app - <<'EOF'\nFROM python:3.12\nRUN pip install flask\nEOF",
    "psql -c 'select 1'",
    "sqlite3 x.db 'select count(*) from t'",
    "vim -es -c '%s/a/b/g' -c wq x.txt",
    "ed -s x.txt <<'EOF'\n,s/a/b/g\nw\nq\nEOF",
    "echo 'print(1)' | python3",
    "cat x.py | python3",
    "python3 < script.py",
    'while read -r f; do python3 tool.py "$f"; done < <(git ls-files)',
    "diff <(sort a) <(sort b)",
    "psql \"$DB\" -c 'select 1'",
    "make -j4 test",
    "make --env x",
    "Rscript -e 'print(1)'",
    ". /dev/stdin <<< 'cd sub'",
    "tool -e x",
    # Gate `/optimize` (D-370): thay tiến trình đọc nội dung đã lưu, dự phòng chỉ thoát
    "python3 -I <(git cat-file blob refs/remotes/origin/HEAD:scripts/xt.py || echo 'raise SystemExit(2)') perf trial"
    " status --check",
    "python3 < <(git show HEAD:tools/x.py)",
)


class StdinProgramTest(Base):
    def test_stdin_programs_denied(self):
        self.assert_deny(STDIN_DENY)

    def test_benign_data_allowed(self):
        self.assert_allow(STDIN_ALLOW)

    def test_modes(self):
        self.assertEqual(guard._stdin_mode(["crontab", "-"]), guard.STDIN_WHOLE)
        self.assertEqual(guard._stdin_mode(["psql"]), guard.STDIN_ESC)
        self.assertEqual(guard._stdin_mode(["Rscript"]), guard.STDIN_WORDS)
        self.assertEqual(guard._stdin_mode([]), guard.STDIN_WORDS)
        self.assertTrue(guard._stdin_body_runs("select $x", guard.STDIN_ESC, True))
        self.assertFalse(guard._stdin_body_runs("select $x", guard.STDIN_WORDS))
        self.assertTrue(guard._stdin_body_runs("echo $HOME", guard.STDIN_WHOLE))
        self.assertTrue(guard._stdin_body_runs("\\! ls $HOME"))

    def test_inline_values(self):
        self.assertEqual(guard._inline_values("vim", ["vim", "+10", "-c", "w", "x"]), ["10", "w"])
        self.assertEqual(guard._inline_values("foo", ["foo", "-c", "x", "-cz"]), [])
        self.assertEqual(guard._inline_values("psql", ["psql", "--co", "a", "--command=b"]), ["a", "b"])
        self.assertEqual(guard._inline_values("dc", ["dc", R, "-e", "x"]), [])
        self.assertTrue(guard._make_eval("--ev"))
        self.assertFalse(guard._make_eval("--env"))

    def test_prog_reader(self):
        self.assertTrue(guard._prog_reader(["crontab", "x"]))
        self.assertTrue(guard._prog_reader(["bash", "/dev/stdin"]))
        self.assertFalse(guard._prog_reader(["python3", "x.py"]))
        self.assertFalse(guard._prog_reader([]))
        self.assertEqual(guard._prog_src_why("ls /dev/null"), "")


COMPUTED_DENY = (
    # 2: giá trị tính được thoát ra ngoài (`..` sau, mktemp `-p`/`--tmpdir`/TMPDIR/mẫu có `/`, cd vào rồi `..`)
    f'{R} -rf "$(mktemp -d -p {H})/../Documents"',
    f'{R} -rf "$(mktemp -d --tmpdir=$HOME)/../Documents"',
    f'{R} -rf "$(mktemp -d)/../Documents"',
    f'cd "$(mktemp -d {H}/x.XXXXXX)" && {R} -rf ../Documents',
    f'export TMPDIR={H}; cd "$(mktemp -d)" && {R} -rf ../Documents',
    f'd=$(mktemp -d -p {H}); {R} -rf "$d/../Documents"',
    f'cd {H} && mkdir -p "$(date +%F)" && {R} -rf "$(date +%F)/../Documents"',
    f'd=$(date +%F); cd {H} && mkdir -p "$d" && {R} -rf "$d/../Documents"',
    f'cd "$(mktemp -d -p {H})" && cd ../.. && {R} -rf home',
    f'cd "$(mktemp -d)" && cd ../.. && {R} -rf home',
    f'cd "$(mktemp -d)" && {R} -rf ../../home',
    f'cd {H}/backups && {R} -rf "$(date +%F)"',
    f'{R} -rf {H}/"$(date +%F)"',
    f'cd /etc && {R} -rf "$(date +%F)"',
    f'popd; {R} -rf "$(date +%F)"',
    # 4: push src:dst từ truy vấn nhánh (HEAD tách rời → xoá nhánh remote)
    'git push origin "$(git branch --show-current):feat/other"',
    'git push origin "$(git symbolic-ref --short -q HEAD):feat/other"',
    'B=$(git branch --show-current); git push origin "$B:feat/other"',
    'git branch -D "x$(git branch --show-current)"',
)

COMPUTED_ALLOW = (
    # 7: truy vấn nhánh ở vị trí tên-ref vô hại
    'git pull origin "$(git branch --show-current)"',
    'git pull --rebase origin "$(git branch --show-current)"',
    'git fetch origin "$(git branch --show-current)"',
    'git rebase "origin/$(git branch --show-current)"',
    'git merge "origin/$(git branch --show-current)"',
    'git checkout "$(git branch --show-current)"',
    'git switch "$(git branch --show-current)"',
    'git branch --set-upstream-to="origin/$(git branch --show-current)"',
    'git branch -u "origin/$(git branch --show-current)"',
    'gh pr create --head "$(git branch --show-current)" --fill',
    'gh pr create --base main --head "$(git branch --show-current)" --fill',
    'git pull origin "$(git rev-parse --abbrev-ref HEAD)"',
    'git push origin "$(git branch --show-current)"',
    'git push -u origin "$(git branch --show-current)"',
    'B=$(git branch --show-current); git push origin "$B"',
    # 8: `[ -eq ]` không phải số học; nhắc chữ tên nhạy không phải ghi
    f'out=$(mktemp); npm test > "$out" 2>&1; status=$?; [ $status -eq 0 ] || tail -50 "$out"; {R} -f "$out"',
    'LOG="logs/$(date +%F).log"; make test > "$LOG" 2>&1; if [ $? -ne 0 ]; then tail "$LOG"; fi',
    f'echo "PATH is set" && {R} -rf "$(mktemp -d)"',
    f'grep -c IFS x.sh; {R} -rf "$(mktemp -d)"',
    f'echo GIT_TRACE; {R} -rf "$(mktemp -d)"',
    # 2: đối chứng lành
    f'{R} -rf "$(mktemp -d)"',
    f'd=$(mktemp -d); touch "$d/a" && {R} -rf "$d"',
    'cd "$(mktemp -d)" && git init -q',
    'mkdir -p "build/$(date +%F)"',
    f'cd sub && {R} -rf "$(date +%F)"',
)

SHADOW_DENY = (
    # 8: ghi biến nhạy vẫn che (gán, nameref, `${X:=}`, `[[ ]]`/`(( ))` số học)
    f'export PATH=/tmp/zq:$PATH; {R} -rf "$(date +%F)"',
    f'declare -n Z=PATH; Z=/tmp/zq:$PATH; {R} -rf "$(date +%F)"',
    f': "${{PATH:=/tmp/zq}}"; {R} -rf "$(date +%F)"',
    f'x=PATH=/tmp/zq; [[ x -eq 0 ]]; {R} -rf "$(date +%F)"',
    f'x=PATH=/tmp/zq; (( x )); {R} -rf "$(date +%F)"',
    f'read PATH <<< /tmp/zq:$PATH; {R} -rf "$(date +%F)"',
)


class ComputedValueTest(Base):
    def test_escapes_denied(self):
        self.assert_deny(COMPUTED_DENY)

    def test_benign_allowed(self):
        self.assert_allow(COMPUTED_ALLOW)

    def test_shadow_writes_still_shadow(self):
        self.assert_deny(SHADOW_DENY)

    def test_shadow_text_levels(self):
        def lv(c: str) -> int:
            return guard._shadow_text(c, guard._CodeView(c))

        self.assertEqual(lv('echo "PATH is set"'), guard.SHADOW_NONE)
        self.assertEqual(lv("[ $s -eq 0 ]"), guard.SHADOW_NONE)
        self.assertEqual(lv("PATH=/x"), guard.SHADOW_EXT)
        self.assertEqual(lv("n=PATH"), guard.SHADOW_EXT)
        self.assertEqual(lv("[[ $s -eq 0 ]]"), guard.SHADOW_EXT)

    def test_session_cwd_outside_root(self):
        self.assert_deny((f'{R} -rf "$(date +%F)"',), ROOT, ROOT.parent)

    def test_cwd_rooted(self):
        def rooted(cmd: str) -> bool:
            return guard._cwd_rooted(guard._simple_cmds(cmd) or [], str(ROOT), str(ROOT))

        self.assertTrue(rooted(f"cd sub && cd {ROOT}/docs && ls"))
        for cmd in ("popd", "cd", "cd /etc", "cd sub*", "cd ..", f"cd {H}", "cd -"):
            with self.subTest(cmd=cmd):
                self.assertFalse(rooted(cmd))
        self.assertFalse(guard._cwd_rooted([], "", None))

    def test_value_helpers(self):
        self.assertTrue(guard._mktemp_ok(["mktemp", "-d", "$OUT/ran.XXXXXX"]))
        self.assertFalse(guard._mktemp_ok(["mktemp", "-p", H]))
        self.assertFalse(guard._mktemp_ok(["date"]))
        self.assertTrue(guard._date_rooted('"/tmp/x-'))
        self.assertFalse(guard._date_rooted("/etc/"))
        self.assertFalse(guard._date_rooted("a/../"))
        self.assertTrue(guard._dyn_dotdot("../x", set(), True))
        self.assertFalse(guard._dyn_dotdot("/x/../y", set(), True))
        self.assertFalse(guard._dyn_dotdot('"$d/../x"', {"d"}, False))
        words = ["git", "log", "x"]
        self.assertEqual(guard._push_ref_ids(words), set())
        self.assertEqual(guard._push_ref_ids(["git"]), set())
        self.assertEqual(guard._push_ref_ids(["gh", "pr", "view", "x"]), set())
        self.assertEqual(guard._push_ref_ids([]), set())


class PathScanTest(unittest.TestCase):
    """10: `source TÊN` quét mọi thư mục PATH trừ ổ Windows gắn của WSL (`/mnt/<ổ>/…`, chậm)."""

    def test_path_has_skips_slow_dirs(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, "zz.env").write_text("x=1\n", encoding="utf-8")
            guard._path_has.cache_clear()
            self.assertTrue(guard._path_has("zz.env", f"/mnt/c/x{os.pathsep}{tmp}"))
            with mock.patch.object(guard.os.path, "isfile", side_effect=AssertionError("không quét /mnt/c")):
                self.assertFalse(guard._path_has("zz.env", f"/mnt/c/Windows{os.pathsep}"))
            guard._path_has.cache_clear()


GIT_DENY = (
    # 1: `.git` qua glob, dotglob/GLOBIGNORE, biến vòng
    f"{R} -f .git/*",
    f"{R} -f .git/p*",
    f"cd .git && {R} -f *",
    f"shopt -s dotglob; {R} -f */objects/pack/*.pack",
    f"GLOBIGNORE=x; {R} -f *it/objects/pack/*.pack",
    f"bash -O dotglob -c '{R} -f */index'",
    "shopt -s dotglob; shred -u */index",
    'shopt -s dotglob; for f in */index; do unlink "$f"; done',
    'shopt -s dotglob; for f in ${x}; do unlink "${f}"; done; for g in */HEAD; do unlink "${g}"; done',
    # 6: ghi đè trạng thái git (AUD-SEC-905), cả repo con
    "mv x .git/HEAD",
    "truncate -s0 .git/index",
    ": > .git/HEAD",
    "cp /dev/null .git/index",
    "echo x | tee .git/HEAD",
    "sed -i s/a/b/ .git/HEAD",
    "ln -sf x .git/HEAD",
    "install x .git/index",
    "mv x sub/.git/HEAD",
    "echo x > sub/.git/config",
)

GIT_ALLOW = (
    f"{R} -f .git/index.lock",
    f"{R} -f .git/*.lock",
    "cp x .git/index.lock",
    "shopt -s dotglob; mv src/* dst/",
    f"{R} -f */*.pyc",
    f"{R} -rf node_modules/*",
    f'for f in *.txt; do {R} -f "$f"; done',
    f'for f in "$@"; do {R} -f "$f"; done',
)


class GitDirTest(Base):
    def test_git_inner_denied(self):
        self.assert_deny(GIT_DENY)

    def test_benign_allowed(self):
        self.assert_allow(GIT_ALLOW)

    def test_linked_worktree_common_git(self):
        # 3: gốc là worktree liên kết (`.git` là TỆP) — `.git` chung của repo chính cũng là hàng rào
        with tempfile.TemporaryDirectory() as tmp:
            main, wt = Path(tmp, "main"), Path(tmp, "wt")
            gitdir = main / ".git" / "worktrees" / "wt"
            gitdir.mkdir(parents=True)
            (gitdir / "commondir").write_text("../..\n", encoding="utf-8")
            wt.mkdir()
            (wt / ".git").write_text(f"gitdir: {gitdir}\n", encoding="utf-8")
            guard._git_dirs.cache_clear()
            pack = f"{main}/.git/objects/pack"
            self.assert_deny(
                (f"{R} -f {pack}/*.pack", f"unlink {gitdir}/HEAD", f"{R} -f ../main/.git/refs/heads/main"), wt
            )
            self.assert_allow((f"{R} -f {main}/build/x.o", f"{R} -f ../main/.git/index.lock"), wt)
            self.assertEqual(guard._git_dirs(str(main)), (f"{os.path.realpath(main)}/.git",))

    def test_git_dirs_unreadable(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, ".git").write_text("gitdir: missing\n", encoding="utf-8")
            guard._git_dirs.cache_clear()
            self.assertEqual(guard._git_dirs(tmp), (f"{os.path.realpath(tmp)}/.git",))
            Path(tmp, ".git").write_bytes(b"\xff\xfe")
            guard._git_dirs.cache_clear()
            self.assertEqual(guard._git_dirs(tmp), (f"{os.path.realpath(tmp)}/.git",))
        guard._git_dirs.cache_clear()


if __name__ == "__main__":
    unittest.main()
