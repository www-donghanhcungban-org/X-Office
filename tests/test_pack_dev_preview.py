"""Bản dev web-api-ts: quay lui qua migration, dọn ảnh cũ, seed một lần và sổ mật khẩu khớp volume.

Docker giả là tiến trình thật trên PATH; adapter chạy bằng Node thật. Không cần Docker daemon.
"""

import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
import unittest.mock
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import xt

PACK = Path(__file__).resolve().parents[1] / "framework/templates/packs/web-api-ts"
MANAGED = PACK / "managed"
COMPOSE = MANAGED / "ops/dev/compose.yaml"
SEED = MANAGED / "ops/dev/seed.mjs"
ADAPTER = MANAGED / "scripts/dev-preview.mjs"
NODE = shutil.which("node")

FAKE_DOCKER = r"""#!/bin/sh
[ "$1" = "--host" ] || exit 91
shift 2
echo "$* | skip=${XT_SKIP_MIGRATE-unset}" >> "$FAKE/trace"
case "$1 $2" in
  "build -t") echo "${3#*:}" >> "$FAKE/tags" ;;
  "image save") : > "$4" ;;
  "image load")
    test -f "$4" || exit 92
    tag=$(basename "$4" .image.tar)
    grep -qx "$tag" "$FAKE/tags" 2>/dev/null || echo "$tag" >> "$FAKE/tags" ;;
  "image ls") cat "$FAKE/tags" 2>/dev/null || true ;;
  "image rm")
    tag="${3#*:}"
    grep -vx "$tag" "$FAKE/tags" > "$FAKE/tags.new" || true
    mv "$FAKE/tags.new" "$FAKE/tags" ;;
  "volume ls") if [ -n "${FAKE_VOLUME:-}" ]; then echo "$FAKE_VOLUME"; fi ;;
  compose*) exit "${COMPOSE_EXIT:-0}" ;;
  *) exit 93 ;;
esac
"""


def services(text: str) -> dict[str, str]:
    """Khối văn bản của từng service (thụt 2 dấu cách dưới `services:`)."""
    body = text.split("\nservices:\n", 1)[1] if not text.startswith("services:\n") else text[len("services:\n") :]
    body = re.split(r"\n(?=\S)", body, maxsplit=1)[0]
    parts = re.split(r"^  ([a-z]+):\n", body, flags=re.M)
    return dict(zip(parts[1::2], parts[2::2]))


def setup_script(block: str) -> str:
    lines = block.splitlines()
    index = lines.index("      - -ec")
    return lines[index + 1].removeprefix("      - ")


@unittest.skipUnless(NODE, "cần node")
class AdapterCase(unittest.TestCase):
    def setUp(self):
        self.root = Path(self.enterContext(tempfile.TemporaryDirectory())).resolve()
        self.repo = self.root / "app"
        self.fake = self.root / "fake"
        self.fake.mkdir()
        (self.fake / "docker").write_text(FAKE_DOCKER)
        (self.fake / "docker").chmod(0o755)
        self.repo.mkdir()
        subprocess.run(["git", "init", "-q", str(self.repo)], check=True)
        (self.repo / "scripts").mkdir()
        shutil.copy(ADAPTER, self.repo / "scripts/dev-preview.mjs")
        (self.repo / "docs/ops").mkdir(parents=True)
        git_dir = subprocess.check_output(["git", "rev-parse", "--absolute-git-dir"], cwd=self.repo, text=True).strip()
        self.project = "xtdev" + hashlib.sha256(git_dir.encode()).hexdigest()[:16]
        self.state = Path(git_dir) / "xt-preview/dev"
        self.ledger()

    def archive(self, label: str) -> str:
        """dist/app.tgz tối thiểu mà stageImage đọc; trả digest chủ thể như adapter tính."""
        dist = self.repo / "dist"
        dist.mkdir(exist_ok=True)
        files = {
            "package.json": json.dumps({"name": label}),
            "pnpm-lock.yaml": "",
            "pnpm-workspace.yaml": "",
            "ops/dev/Dockerfile": "FROM scratch\n",
            "ops/dev/compose.yaml": COMPOSE.read_text(),
        }
        buffer = io.BytesIO()
        with tarfile.open(fileobj=buffer, mode="w:gz") as tar:
            for name, text in files.items():
                data = text.encode()
                info = tarfile.TarInfo(name)
                info.size = len(data)
                tar.addfile(info, io.BytesIO(data))
        (dist / "app.tgz").write_bytes(buffer.getvalue())
        raw = hashlib.sha256(buffer.getvalue()).hexdigest()
        return hashlib.sha256(f"dist/app.tgz\0{raw}\n".encode()).hexdigest()

    def ledger(self, current=None, previous=None, events=()):
        def entry(digest):
            return {"subject": {"digest": digest}} if digest else None

        data = {
            "envs": {"dev": {"current": entry(current), "previous": entry(previous), "unknown": current is None}},
            "events": [{"env": "dev", "result": result, "served_digest": served} for result, served in events],
        }
        (self.repo / "docs/ops/DEPLOYS.json").write_text(json.dumps(data))

    def run_adapter(self, action, digest="", previous="", keep="", **extra):
        """`keep` là XT_DEPLOY_KEEP (slot trước khi bộ điều phối ghi đè); None = không đặt."""
        env = {
            **os.environ,
            "PATH": f"{self.fake}{os.pathsep}{os.environ['PATH']}",
            "DOCKER_HOST": "unix:///fake.sock",
            "FAKE": str(self.fake),
            "XT_DEPLOY_ENV": "dev",
            "XT_DEPLOY_STATE": str(self.state),
            "XT_DEPLOY_ARTIFACTS": "dist/app.tgz",
            "XT_DEPLOY_DIGEST": digest,
            "XT_DEPLOY_PREVIOUS": previous,
            "XT_DEPLOY_KEEP": keep,
            **extra,
        }
        if keep is None:
            del env["XT_DEPLOY_KEEP"]
        return subprocess.run(
            [NODE, "scripts/dev-preview.mjs", action], cwd=self.repo, env=env, capture_output=True, text=True
        )

    def trace(self) -> list[str]:
        path = self.fake / "trace"
        return path.read_text().splitlines() if path.exists() else []

    def tags(self) -> set[str]:
        path = self.fake / "tags"
        return set(path.read_text().split()) if path.exists() else set()

    def stored(self, suffix: str) -> set[str]:
        return {p.name.removesuffix(suffix) for p in self.state.glob("*" + suffix)}

    def write_access(self) -> dict:
        self.state.mkdir(parents=True, exist_ok=True)
        access = {
            "owner": {"email": "owner@example.test", "password": "f" * 64},
            "guest": {"email": "guest@example.test", "password": "e" * 64},
            "database": "d" * 64,
        }
        path = self.state / "preview-access.json"
        path.write_text(json.dumps(access))
        path.chmod(0o600)
        return access

    def plant(self, *digests):
        """Ảnh đã lưu của các lần triển khai trước: tệp tar, compose và tag Docker."""
        self.state.mkdir(parents=True, exist_ok=True)
        for digest in digests:
            (self.state / f"{digest}.image.tar").write_bytes(b"img")
            (self.state / f"{digest}.compose.yaml").write_text(COMPOSE.read_text())
        with (self.fake / "tags").open("a") as tags:
            tags.writelines(d + "\n" for d in digests)


class RollbackMigrationTest(AdapterCase):
    def test_rollback_skips_migrations_deploy_and_stop_never_inherit_skip(self):
        first = self.archive("a")
        run = self.run_adapter("deploy", first, XT_SKIP_MIGRATE="1")
        self.assertEqual(run.returncode, 0, run.stderr)
        self.ledger(first, None, [("deployed", first)])
        second = self.archive("b")
        self.assertEqual(self.run_adapter("deploy", second, first).returncode, 0)
        run = self.run_adapter("rollback", second, first, XT_SKIP_MIGRATE="0")
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(self.run_adapter("stop").returncode, 0)
        ups = [line for line in self.trace() if line.startswith("compose ")]
        self.assertEqual(len(ups), 4, ups)
        self.assertTrue(ups[0].endswith("skip=0") and " up " in ups[0], ups[0])
        self.assertTrue(ups[1].endswith("skip=0"), ups[1])
        self.assertTrue(ups[2].endswith("skip=1") and "--pull never" in ups[2], ups[2])
        self.assertTrue(ups[3].endswith("skip=0") and ups[3].split(" | ")[0].endswith(" down"), ups[3])
        self.assertIn(f"image load -i {self.state}/{first}.image.tar | skip=unset", self.trace())


class PruneTest(AdapterCase):
    def test_keeps_target_new_and_slot_before_coordinator_rewrite(self):
        old, stale, gone, prev0, cur0 = ("1" * 64, "2" * 64, "5" * 64, "3" * 64, "4" * 64)
        self.plant(old, stale, gone, prev0, cur0)
        (self.state / f"{old}.image.tmp").write_bytes(b"crash leftover")
        # Bộ điều phối đã ghi slot thành {None, cur0} trước khi gọi adapter; prev0 chỉ còn trong lịch sử.
        self.ledger(
            None,
            cur0,
            [
                ("deployed", stale),
                ("rollback_failed", gone),
                ("deployed", prev0),
                ("rolled_back", prev0),
                ("deployed", cur0),
            ],
        )
        access = self.write_access()
        (self.state / "coordinator.lock").write_text("")
        new = self.archive("new")
        run = self.run_adapter("deploy", new, cur0, f"{cur0} {prev0}", FAKE_VOLUME=f"{self.project}_db")
        self.assertEqual(run.returncode, 0, run.stderr)
        keep = {new, cur0, prev0}
        self.assertEqual(self.stored(".image.tar"), keep)
        self.assertEqual(self.stored(".compose.yaml"), keep)
        self.assertEqual(self.tags(), keep)
        self.assertFalse((self.state / f"{old}.image.tmp").exists())
        self.assertEqual(json.loads((self.state / "preview-access.json").read_text()), access)
        self.assertTrue((self.state / "coordinator.lock").exists())
        removed = sorted(line.split(" | ")[0] for line in self.trace() if line.startswith("image rm"))
        self.assertEqual(removed, sorted(f"image rm {self.project}:{d}" for d in (old, stale, gone)))

    def test_rollback_prunes_but_keeps_failed_candidate_until_next_run(self):
        target, failed, other = "a" * 64, "b" * 64, "c" * 64
        self.plant(target, failed, other)
        self.ledger(None, target, [("deployed", target)])
        self.write_access()
        run = self.run_adapter("rollback", failed, target)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(self.stored(".image.tar"), {target, failed})
        self.assertEqual(self.tags(), {target, failed})

    def test_failed_compose_or_unreadable_ledger_removes_nothing(self):
        kept = "1" * 64
        self.plant(kept)
        new = self.archive("new")
        run = self.run_adapter("deploy", new, "", COMPOSE_EXIT="1")
        self.assertNotEqual(run.returncode, 0)
        self.assertEqual(self.stored(".image.tar"), {kept, new})
        (self.repo / "docs/ops/DEPLOYS.json").write_text("{not json")
        run = self.run_adapter("deploy", new, "")
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(self.stored(".image.tar"), {kept, new})
        self.assertEqual(self.tags(), {kept, new})
        self.assertFalse([line for line in self.trace() if line.startswith("image rm")])

    def test_slot_passed_by_coordinator_survives_failed_rollback_history(self):
        """Sau `rollback_failed` rồi deploy N, slot là {N, A} nhưng hai bản phục vụ gần nhất là N, B: A phải còn."""
        a, b, n = "a" * 64, "b" * 64, self.archive("n")
        self.plant(a, b, n)
        self.write_access()
        # Bộ điều phối đã ghi đè slot {N, A} thành {None, N}; A chỉ còn trong XT_DEPLOY_KEEP.
        self.ledger(None, n, [("deployed", a), ("deployed", b), ("rollback_failed", None), ("deployed", n)])
        run = self.run_adapter("deploy", n, n, f"{n} {a}")
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(self.stored(".image.tar"), {a, n})
        self.assertEqual(self.tags(), {a, n})

    def test_missing_or_invalid_keep_list_removes_nothing(self):
        stale = "1" * 64
        self.plant(stale)
        self.write_access()
        new = self.archive("new")
        for keep in (None, "not-a-digest", f"{stale},{new}"):
            with self.subTest(keep=keep):
                run = self.run_adapter("deploy", new, "", keep)
                self.assertEqual(run.returncode, 0, run.stderr)
                self.assertIn("Bỏ qua dọn ảnh dev cũ", run.stderr)
                self.assertEqual(self.stored(".image.tar"), {stale, new})
                self.assertEqual(self.tags(), {stale, new})

    def test_filesystem_error_while_pruning_does_not_fail_deploy(self):
        """Dọn là best effort sau khi `up` xong: lỗi fs không được làm deploy thoát 1 (kích quay lui)."""
        stale = "1" * 64
        self.write_access()
        blocker = self.state / f"{stale}.image.tar"
        blocker.mkdir()
        (blocker / "inside").write_text("x")
        new = self.archive("new")
        run = self.run_adapter("deploy", new, "")
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertIn("Bỏ qua dọn ảnh dev cũ", run.stderr)
        self.assertTrue((blocker / "inside").exists())


@unittest.skipUnless(NODE, "cần node")
class CoordinatorPruneTest(AdapterCase):
    """Bộ điều phối thật (`xt._dev_execute`) + adapter thật: sổ không bao giờ trỏ tới ảnh đã bị dọn."""

    def setUp(self):
        super().setUp()
        (self.repo / "docs/ops/DEPLOYS.json").unlink()
        self.served = ""
        self.bad = ""
        self.candidate = None
        self.enterContext(unittest.mock.patch.object(xt.DevPreview, "run", self.fake_run))
        self.enterContext(unittest.mock.patch.object(xt, "_dev_candidate", lambda base: self.candidate))

    def fake_run(self, argv, env, sink):
        """Deploy/rollback chạy adapter node; smoke đỏ với digest `bad`; digest đọc bản đang phục vụ."""
        action = argv[-1]
        if action in ("deploy", "rollback"):
            extra = {
                "PATH": f"{self.fake}{os.pathsep}{env['PATH']}",
                "DOCKER_HOST": "unix:///x",
                "FAKE": str(self.fake),
            }
            run = subprocess.run(argv, cwd=self.repo, env={**env, **extra}, capture_output=True, text=True)
            if run.returncode == 0:
                self.served = env["XT_DEPLOY_DIGEST" if action == "deploy" else "XT_DEPLOY_PREVIOUS"]
            return run.returncode
        if action == "digest":
            sink.write(f"{self.served}\n".encode())
        return int(action == "smoke" and self.served == self.bad)

    def deploy(self, label, broken=False):
        digest = self.archive(label)
        raw = hashlib.sha256((self.repo / "dist/app.tgz").read_bytes()).hexdigest()
        identity = {"head": "a" * 40, "content": raw, "digest": digest}
        self.candidate = (identity, [{"path": "dist/app.tgz", "sha256": raw}])
        self.bad = digest if broken else ""
        return digest, xt._dev_execute(self.repo, self.state, 60, False)[0]["result"]

    def rollback(self, broken=""):
        self.bad = broken
        return xt._dev_execute(self.repo, self.state, 60, True)[0]["result"]

    def after_failed_rollback(self):
        """Chuỗi của reviewer: A, B, rollback thủ công đỏ (slot {None, A}), N (slot {N, A}; phục vụ gần nhất N, B)."""
        (a, _), (b, _) = self.deploy("A"), self.deploy("B")
        self.assertEqual(self.rollback(broken=a), "rollback_failed")
        n, result = self.deploy("N")
        self.assertEqual(result, "deployed")
        return a, b, n

    def assert_rolls_back_to(self, a, n):
        self.assertEqual(self.rollback(), "rolled_back")
        self.assertEqual(self.served, a)
        self.assertEqual(self.stored(".image.tar"), {a, n})
        self.assertEqual(self.tags(), {a, n})

    def test_redeploy_same_digest_keeps_previous_after_failed_rollback(self):
        a, b, n = self.after_failed_rollback()
        self.assertEqual(self.deploy("N"), (n, "deployed"))
        self.assertEqual(self.stored(".image.tar"), {a, n})
        self.assertNotIn(b, self.tags())
        self.assert_rolls_back_to(a, n)

    def test_failed_smoke_auto_rollback_keeps_previous_after_failed_rollback(self):
        a, _, n = self.after_failed_rollback()
        m, result = self.deploy("M", broken=True)
        self.assertEqual(result, "rolled_back")
        self.assertEqual(self.served, n)
        self.assertEqual(self.stored(".image.tar"), {a, n, m})
        self.assert_rolls_back_to(a, n)


class AccessVolumeTest(AdapterCase):
    def test_new_password_book_refuses_existing_database_volume(self):
        new = self.archive("new")
        run = self.run_adapter("deploy", new, "", FAKE_VOLUME=f"{self.project}_db")
        self.assertNotEqual(run.returncode, 0)
        self.assertIn(f"docker compose -p {self.project} down -v", run.stderr)
        self.assertFalse((self.state / "preview-access.json").exists())
        self.assertFalse([line for line in self.trace() if line.startswith(("build", "compose"))])

    def test_new_password_book_with_unrelated_or_no_volume_deploys(self):
        for volume in ("", f"{self.project}_db2", f"x{self.project}_db"):
            with self.subTest(volume=volume):
                shutil.rmtree(self.state, ignore_errors=True)
                run = self.run_adapter("deploy", self.archive("v" + volume), "", FAKE_VOLUME=volume)
                self.assertEqual(run.returncode, 0, run.stderr)
                self.assertEqual((self.state / "preview-access.json").stat().st_mode & 0o777, 0o600)


class ComposeTest(unittest.TestCase):
    def setUp(self):
        self.text = COMPOSE.read_text()
        self.blocks = services(self.text)

    def test_db_health_uses_tcp_and_app_holds_no_demo_passwords(self):
        self.assertEqual(set(self.blocks), {"db", "setup", "app"})
        self.assertIn('["CMD", "pg_isready", "-h", "127.0.0.1", "-U", "postgres", "-d", "xt_preview"]', self.text)
        app = self.blocks["app"]
        self.assertNotIn("XT_DEMO_", app)
        self.assertNotIn("migrate", app)
        self.assertNotIn("command:", app)
        self.assertRegex(app, r"setup:\n\s+condition: service_completed_successfully")
        setup = self.blocks["setup"]
        self.assertIn("XT_SKIP_MIGRATE: ${XT_SKIP_MIGRATE:?", setup)
        self.assertIn("XT_DEMO_OWNER_PASSWORD: ${XT_DEMO_OWNER_PASSWORD:?", setup)
        self.assertRegex(setup, r"db:\n\s+condition: service_healthy")

    def test_setup_script_migrates_unless_rollback_then_seeds(self):
        raw = setup_script(self.blocks["setup"])
        self.assertIsNone(re.search(r"(?<!\$)\$(?!\$)", raw), "mọi $ phải được Compose giữ nguyên ($$)")
        script = raw.replace("$$", "$")
        with tempfile.TemporaryDirectory() as temp:
            node = Path(temp, "node")
            node.write_text(
                '#!/bin/sh\necho "$*" >> "$TRACE"\n[ "$1" = src/migrate.ts ] && [ -n "${MIGRATE_FAIL:-}" ] && exit 7\nexit 0\n'
            )
            node.chmod(0o755)
            trace = Path(temp, "trace")
            migrate, seed = "src/migrate.ts up", "ops/dev/seed.mjs"
            for skip, fail, code, calls in [
                ("1", "", 0, [seed]),
                ("0", "", 0, [migrate, seed]),
                ("0", "1", 7, [migrate]),
                ("", "", None, []),
                ("yes", "", None, []),
            ]:
                with self.subTest(skip=skip, fail=fail):
                    trace.unlink(missing_ok=True)
                    env = {**os.environ, "PATH": f"{temp}{os.pathsep}{os.environ['PATH']}", "TRACE": str(trace)}
                    env.update(XT_SKIP_MIGRATE=skip, MIGRATE_FAIL=fail)
                    run = subprocess.run(["sh", "-ec", script], env=env, capture_output=True, text=True)
                    if code is None:
                        self.assertNotEqual(run.returncode, 0)
                    else:
                        self.assertEqual(run.returncode, code, run.stderr)
                    self.assertEqual(trace.read_text().splitlines() if trace.exists() else [], calls)


@unittest.skipUnless(NODE, "cần node")
class SeedGuardTest(unittest.TestCase):
    def test_rejects_query_or_fragment_before_loading_database_code(self):
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp, "ops/dev/seed.mjs")
            target.parent.mkdir(parents=True)
            shutil.copy(SEED, target)
            base = "postgres://postgres:pw@db:5432/xt_preview"
            for url, refused in [
                (base + "?host=/tmp/evil", True),
                (base + "?sslmode=disable", True),
                (base + "#x", True),
                ("postgres://postgres:pw@db.example.com:5432/xt_preview", True),
                (base, False),
            ]:
                with self.subTest(url=url):
                    env = {**os.environ, "XT_PREVIEW_BUILD": "1", "DATABASE_URL": url}
                    run = subprocess.run([NODE, str(target)], env=env, capture_output=True, text=True, cwd=temp)
                    self.assertNotEqual(run.returncode, 0)
                    self.assertEqual("Seed chỉ chạy trên PostgreSQL dev cục bộ" in run.stderr, refused, run.stderr)
                    # Khi URL hợp lệ, lỗi kế tiếp là thiếu mã DB của starter (không có trong thư mục tạm).
                    if not refused:
                        self.assertIn("ERR_MODULE_NOT_FOUND", run.stderr)


if __name__ == "__main__":
    unittest.main()
