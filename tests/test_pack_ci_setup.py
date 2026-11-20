"""CI dự án web-api-ts dùng bộ công cụ ghim phiên bản và PostgreSQL riêng khi dự án chưa cấp CSDL."""

import json
import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

PACK = Path(__file__).resolve().parents[1] / "framework/templates/packs/web-api-ts"
STARTER = PACK / "starter"
TEST = STARTER / "scripts/test-with-postgres.sh"


class PackCiSetupTest(unittest.TestCase):
    def test_pins_match_published_pack_and_frozen_install(self):
        action = (STARTER / ".github/actions/xt-ci-tools/action.yml").read_text()
        refs = re.findall(r"uses: ([^\s]+)", action)
        self.assertEqual([ref.split("@")[0] for ref in refs], ["actions/setup-node", "pnpm/action-setup"])
        for ref in refs:
            self.assertRegex(ref, r"@[0-9a-f]{40}$")
        node = re.search(r'node-version: "([0-9.]+)"', action)[1]
        self.assertIn(f"FROM node:{node}-", (PACK / "managed/ops/dev/Dockerfile").read_text())
        postgres = re.search(r"image: (postgres:\S+)", (PACK / "managed/ops/dev/compose.yaml").read_text())[1]
        self.assertIn(f"image='{postgres}'", TEST.read_text())
        pack = json.loads((PACK / "pack.json").read_text())
        self.assertEqual(pack["xt_yaml"]["setup"], "pnpm install --frozen-lockfile")
        package = json.loads((STARTER / "package.json").read_text())
        self.assertEqual(pack["xt_yaml"]["test"], "pnpm test")
        self.assertEqual(package["scripts"]["test"], "bash scripts/test-with-postgres.sh")
        self.assertEqual(package["packageManager"], "pnpm@" + pack["compat"]["pnpm"])

    def test_test_db_cleans_up_and_preserves_vitest_exit_code(self):
        root = Path(self.enterContext(tempfile.TemporaryDirectory()))
        node = root / "node"
        node.write_text('#!/bin/sh\n[ "$1" = "-p" ] && printf "%048d\\n" 1\n')
        docker = root / "docker"
        docker.write_text(
            '#!/bin/sh\necho "docker $1" >> "$TRACE"\n'
            'case "$1" in\n'
            '  run) test -n "$POSTGRES_PASSWORD" && echo ephemeral-id;;\n'
            '  port) echo "$BIND";;\n'
            '  exec) test "$2 $3" = "ephemeral-id pg_isready";;\n'
            '  rm) test "$2 $3" = "--force ephemeral-id";;\n'
            "  *) exit 61;;\nesac\n"
        )
        pnpm = root / "pnpm"
        pnpm.write_text(
            '#!/bin/sh\necho "pnpm $*" >> "$TRACE"\n'
            'if [ -n "${PG_TOOLS_CONTAINER:-}" ]; then\n'
            '  test "$PG_TOOLS_CONTAINER" = ephemeral-id && test "$DATABASE_URL" = "postgresql://postgres:$POSTGRES_PASSWORD@127.0.0.1:51521/postgres" || exit 60\n'
            'fi\nexit "$TEST_EXIT"\n'
        )
        for f in (node, docker, pnpm):
            f.chmod(0o755)
        trace = root / "calls"
        invoke = "pnpm exec vitest run --reporter=junit"
        full = ["docker run", "docker port", "docker exec", invoke, "docker rm"]
        for ci, database, bind, result, calls in [
            ("true", "", "127.0.0.1:51521", 0, full),
            ("true", "", "127.0.0.1:51521", 17, full),
            ("true", "", "0.0.0.0:51521", 1, ["docker run", "docker port", "docker rm"]),
            ("true", "postgresql://local/test", "", 17, [invoke]),
            ("false", "", "", 17, [invoke]),
        ]:
            with self.subTest(ci=ci, database=database, bind=bind, result=result):
                trace.unlink(missing_ok=True)
                env = dict(
                    os.environ,
                    PATH=str(root) + os.pathsep + os.environ["PATH"],
                    GITHUB_ACTIONS=ci,
                    DATABASE_URL=database,
                    TRACE=str(trace),
                    BIND=bind,
                    TEST_EXIT=str(result),
                    PG_TOOLS_CONTAINER="",
                )
                run = subprocess.run(["bash", str(TEST), "--reporter=junit"], capture_output=True, env=env)
                self.assertEqual(run.returncode, result, run.stderr)
                self.assertEqual(trace.read_text().splitlines(), calls)
