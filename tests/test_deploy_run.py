"""Biên nhận dev: adapter giả là tiến trình thật, ghi nhận artifact qua Git và CLI công khai."""

import hashlib
import json
import os
import subprocess
import sys
import tempfile
import unittest.mock
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_xt_cli import TmpRepoCase, run_main, xt

CONFIG = """deploy_envs: dev prod
url_dev: http://127.0.0.1:4317
release_artifacts: dist/app.tgz
deploy_dev: node scripts/dev-preview.mjs deploy
smoke_dev: node scripts/dev-preview.mjs smoke
digest_dev: node scripts/dev-preview.mjs digest
rollback_dev: node scripts/dev-preview.mjs rollback
"""

FAKE_NODE = """
import hashlib, os, sys
from pathlib import Path
state = Path(os.environ["XT_DEPLOY_STATE"])
action = sys.argv[2]
live = state / "live"
with (state / "calls").open("a") as f:
    print(action, file=f)
if action in ("deploy", "rollback"):
    with (state / "keep").open("a") as f:
        print(action, os.environ.get("XT_DEPLOY_KEEP", "<unset>"), file=f)
if (state / "chatty").exists():
    sys.stderr.write((state / "chatty").read_text())
if (state / ("fail-" + action)).exists():
    hint = state / ("hint-" + action)
    sys.stderr.write(hint.read_text() if hint.exists() else "")
    sys.exit(9)
if action == "deploy":
    artifact = Path(os.environ["XT_DEPLOY_ARTIFACTS"])
    raw = hashlib.sha256(artifact.read_bytes()).hexdigest()
    actual = hashlib.sha256((str(artifact) + chr(0) + raw + chr(10)).encode()).hexdigest()
    live.write_text(actual)
elif action == "rollback":
    live.write_text(os.environ["XT_DEPLOY_PREVIOUS"])
elif action == "smoke":
    sys.exit(int((state / "bad-digest").exists() and live.read_text() == (state / "bad-digest").read_text()))
elif action == "digest":
    assert not {"XT_DEPLOY_DIGEST", "XT_DEPLOY_PREVIOUS", "XT_DEPLOY_KEEP"} & set(os.environ)
    sys.stdout.write((state / "answer").read_text() if (state / "answer").exists() else live.read_text() + chr(10))
"""


class DevPreviewCommandTest(TmpRepoCase):
    def setUp(self):
        super().setUp()
        self.init_repo()
        self.commit_files({"xt.yaml": CONFIG, "scripts/dev-preview.mjs": "// adapter", ".gitignore": "dist/\n"}, 1)
        self.fake = self.tmp / "node"
        self.fake.write_text("#!" + sys.executable + "\n" + FAKE_NODE, encoding="utf-8")
        self.fake.chmod(0o700)
        self.enterContext(
            unittest.mock.patch.dict(
                os.environ,
                {
                    "CLAUDE_PROJECT_DIR": str(self.repo),
                    "PATH": str(self.tmp) + os.pathsep + os.environ["PATH"],
                    "XT_DEPLOY_DIGEST": "inherited",
                    "XT_DEPLOY_PREVIOUS": "inherited",
                    "XT_DEPLOY_KEEP": "inherited",
                    "GITHUB_ACTIONS": "false",
                },
            )
        )
        self.dist = self.repo / "dist/app.tgz"
        self.dist.parent.mkdir()
        self.dist.write_bytes(b"A")
        self.state = self.repo / ".git/xt-preview/dev"
        self.ledger = self.repo / xt.DEPLOY_LEDGER

    def call(self, op="run", rc=0):
        code, out, err = run_main("deploy", op, "--env", "dev", "--json")
        self.assertEqual(code, rc, f"{out}\n{err}")
        return json.loads(out)

    def error(self, *args, rc=2):
        code, out, err = run_main("deploy", *args)
        self.assertEqual(code, rc, f"{out}\n{err}")
        self.assertEqual(out, "")
        return err

    def test_deploy_redeploy_rollback_and_status_share_receipts(self):
        a = self.call()
        self.assertEqual(a["result"], "deployed")
        self.assertEqual(a["served_digest"], a["subject"]["digest"])
        self.assertEqual(a["subject"]["head"], self.git("rev-parse", "HEAD"))
        self.assertEqual(a["artifacts"], [{"path": "dist/app.tgz", "sha256": hashlib.sha256(b"A").hexdigest()}])
        self.assertEqual(self.call()["subject"], a["subject"])
        self.dist.write_bytes(b"B")
        b = self.call()
        self.assertNotEqual(b["subject"]["digest"], a["subject"]["digest"])
        self.call()  # cùng digest giữ lại bản trước khác digest
        self.dist.unlink()  # rollback uses the installed image, independent of current build output
        back = self.call("rollback")
        self.assertEqual((back["result"], back["served_digest"]), ("rolled_back", a["subject"]["digest"]))
        status = self.call("status")
        self.assertEqual(status["envs"]["dev"]["current"]["subject"], a["subject"])
        self.assertEqual(status["envs"]["dev"]["previous"]["subject"], b["subject"])
        self.assertEqual(len(status["events"]), 5)
        self.assertNotIn("inherited", self.ledger.read_text())

    def test_failed_smoke_rolls_back_and_confirms_old_version(self):
        a = self.call()
        self.dist.write_bytes(b"B")
        subject, _ = xt._dev_candidate(self.repo)
        (self.state / "bad-digest").write_text(subject["digest"])
        failed = self.call(rc=1)
        self.assertEqual(failed["result"], "rolled_back")
        self.assertEqual(failed["smoke"]["exit_code"], 1)
        self.assertEqual(failed["served_digest"], a["subject"]["digest"])
        self.assertEqual((self.state / "live").read_text(), a["subject"]["digest"])
        self.assertEqual(self.call("status")["envs"]["dev"]["current"], a)

    def test_stale_artifact_leaves_current_and_ledger_intact(self):
        a = self.call()
        self.commit_files({"src/example.ts": "export const version = 'B';\n"}, 2)
        (self.state / "fail-candidate").touch()
        self.assertIn("pnpm build", self.error("run", "--env", "dev"))
        result = self.call("status")
        self.assertEqual(result["events"], [a])
        self.assertEqual(result["envs"]["dev"]["current"], a)
        self.assertEqual(
            (self.state / "calls").read_text().splitlines(), ["candidate", "deploy", "smoke", "digest", "candidate"]
        )

    def test_wrong_or_invalid_digest_never_certifies_candidate(self):
        self.state.mkdir(parents=True)
        for answer in ("0" * 64, "0" * 64 + "\n extra", "", "not-a-digest"):
            with self.subTest(answer=answer):
                (self.state / "answer").write_text(answer)
                self.assertEqual(self.call(rc=1)["result"], "failed")
                self.assertTrue(self.call("status")["envs"]["dev"]["unknown"])
        (self.state / "fail-digest").touch()
        self.assertIsNone(self.call(rc=1)["served_digest"])

    def test_failed_deploy_and_failed_rollback_mark_unknown_and_allow_recovery(self):
        a = self.call()
        self.dist.write_bytes(b"B")
        (self.state / "fail-deploy").touch()
        (self.state / "fail-rollback").touch()
        failure = self.call(rc=1)
        self.assertEqual(failure["result"], "rollback_failed")
        self.assertIsNone(failure["smoke"])
        self.assertEqual(failure["rollback"]["exit_code"], 9)
        self.assertIsNone(self.call("status")["envs"]["dev"]["current"])
        (self.state / "fail-rollback").unlink()
        recovered = self.call("rollback")
        self.assertEqual(recovered["served_digest"], a["subject"]["digest"])

    def test_preflight_refuses_invalid_env_commands_and_artifact_before_effects(self):
        self.assertIn("dev", self.error("run", "--env", "prod"))
        self.assertIn("chưa có", self.error("rollback", "--env", "dev"))
        (self.dist.parent / "app.tgz.sha256").write_text("a" * 64)
        self.assertIn("sidecar", self.error("run", "--env", "dev"))
        with unittest.mock.patch.object(xt, "_release_artifacts", return_value=(None, [])):
            self.assertIn("dist/app", self.error("run", "--env", "dev"))
        for before, after, message in [
            ("smoke_dev: node scripts/dev-preview.mjs smoke", 'smoke_dev: ""', "adapter"),
            ("127.0.0.1:4317", "remote.invalid", "loopback"),
            ("dist/app.tgz", "xt.yaml", "dist/app"),
            ("dev prod", "staging", "dev"),
        ]:
            (self.repo / "xt.yaml").write_text(CONFIG.replace(before, after))
            self.assertIn(message, self.error("run", "--env", "dev"))
        (self.repo / "xt.yaml").write_text(CONFIG)
        with unittest.mock.patch.dict(os.environ, {"XT_DEPLOY_TIMEOUT": "0"}):
            self.assertIn("XT_DEPLOY_TIMEOUT", self.error("run", "--env", "dev"))
        with unittest.mock.patch.object(xt, "guard_blocks", return_value=["", "", "RULE_DENY", ""]):
            self.assertIn("RULE_DENY", self.error("run", "--env", "dev", rc=126))
        (self.repo / "scripts/dev-preview.mjs").unlink()
        self.assertIn("thiếu", self.error("run", "--env", "dev"))
        self.assertFalse(self.ledger.exists())
        self.assertFalse((self.state / "calls").exists())

    def test_concurrent_and_ambiguous_state_refused(self):
        with xt._dev_lock(self.repo):
            self.error("run", "--env", "dev")
        with unittest.mock.patch.object(xt, "_fcntl", return_value=None):
            self.assertIn("flock", self.error("run", "--env", "dev"))
        with unittest.mock.patch.object(xt, "_git_tree", return_value=None):
            self.assertIn("checkout", self.error("run", "--env", "dev"))
        self.state.rename(self.state.with_name("elsewhere"))
        self.state.symlink_to(self.state.with_name("elsewhere"))
        self.assertIn("symlink", self.error("run", "--env", "dev"))
        self.state.unlink()
        (self.repo / "elsewhere").mkdir()
        (self.repo / "docs").symlink_to(self.repo / "elsewhere")
        self.assertIn("symlink", self.error("run", "--env", "dev"))
        self.assertFalse((self.repo / "elsewhere/ops/DEPLOYS.json").exists())

    def test_interrupted_command_does_not_leave_a_false_current(self):
        a = self.call()
        with unittest.mock.patch.object(
            xt.DevPreview, "invoke", side_effect=[({"exit_code": 0}, None), KeyboardInterrupt]
        ):
            with self.assertRaises(KeyboardInterrupt):
                xt._dev_execute(self.repo, self.state, 5, False)
        slot = self.call("status")["envs"]["dev"]
        self.assertIsNone(slot["current"])
        self.assertEqual(slot["previous"], a)
        self.assertTrue(slot["unknown"])
        self.assertEqual(self.call("rollback")["result"], "rolled_back")

    def test_candidate_failure_and_runner_metadata(self):
        with unittest.mock.patch.object(
            xt, "_release_subject", return_value=({"head": None, "content": None, "digest": None}, "error")
        ):
            self.assertIn("định danh", self.error("run", "--env", "dev"))
        with unittest.mock.patch.dict(
            os.environ, {"GITHUB_ACTIONS": "true", "GITHUB_RUN_ID": "17", "GITHUB_REPOSITORY": "owner/name"}
        ):
            a = self.call()
        self.assertEqual(
            a["runner"], {"kind": "ci", "run_id": "17", "run_url": "https://github.com/owner/name/actions/runs/17"}
        )
        self.assertEqual(run_main("deploy", "run", "--env", "dev")[0], 0)

    def test_missing_timeout_and_interrupted_adapter_process(self):
        driver = xt.DevPreview(self.repo, self.state, 1, {"digest": "a" * 64}, "")
        with tempfile.TemporaryFile() as sink:
            self.assertEqual(driver.run(["/missing-dev-preview-executable"], {}, sink, sink), 127)
            with (
                unittest.mock.patch.object(xt, "_stop_group") as stop,
                unittest.mock.patch.object(subprocess, "Popen") as spawn,
            ):
                spawn.return_value.wait.side_effect = subprocess.TimeoutExpired("fixture", 1)
                self.assertEqual(driver.run(["node"], {}, sink, sink), 124)
                stop.assert_called_once_with(spawn.return_value)
                spawn.return_value.wait.side_effect = KeyboardInterrupt
                with self.assertRaises(KeyboardInterrupt):
                    driver.run(["node"], {}, sink, sink)
                self.assertEqual(stop.call_count, 2)

    def test_keep_reaches_deploy_and_rollback_only_and_none_means_unset(self):
        """AUD-HAR-452 (2, 3): XT_DEPLOY_KEEP tới deploy/rollback (slot trống → chuỗi rỗng, không phải vắng), không tới
        digest (fake assert — đột biến truyền KEEP cho digest làm deploy thất bại); DevPreview mặc định `keep=None` không
        đặt biến (kể cả biến kế thừa của phiên) nên adapter không dọn ảnh."""
        a = self.call()
        self.dist.write_bytes(b"B")
        b = self.call()
        self.call("rollback")
        digest_a, digest_b = a["subject"]["digest"], b["subject"]["digest"]
        self.assertEqual(
            (self.state / "keep").read_text().splitlines(),
            ["deploy ", f"deploy {digest_a}", f"rollback {digest_b} {digest_a}"],
        )
        (self.state / "keep").unlink()
        driver = xt.DevPreview(self.repo, self.state, 5, {"digest": digest_b}, digest_a)
        self.assertIsNone(driver.keep)
        self.assertEqual(driver.invoke("rollback")[0]["exit_code"], 0)
        self.assertEqual((self.state / "keep").read_text(), "rollback <unset>\n")
        self.assertEqual(driver.failures, [])

    def test_adapter_stderr_reaches_user_on_failure_only(self):
        """AUD-A11Y-009: stderr của bước adapter thất bại (vd hướng dẫn `docker compose -p <project> down -v`) tới người
        dùng — ≤ 5 dòng cuối khác rỗng, mỗi dòng ≤ 200 ký tự, đã che bí mật; sổ không giữ; bước thành công không in gì
        kể cả khi adapter có ghi stderr (đột biến "đọc stderr cả khi bước thành công" phải đỏ)."""
        self.state.mkdir(parents=True)
        (self.state / "chatty").write_text("Pulling image… done\n")
        code, _, err = run_main("deploy", "run", "--env", "dev")
        self.assertEqual((code, err), (0, ""))
        self.assertEqual((self.state / "calls").read_text().splitlines(), ["candidate", "deploy", "smoke", "digest"])
        (self.state / "chatty").unlink()
        self.dist.write_bytes(b"B")
        (self.state / "fail-deploy").touch()
        hint = "Xoá dữ liệu dev bằng: docker compose -p xtdev0123 down -v — rồi triển khai lại."
        noise = "".join(f"docker dòng {i}\n" for i in range(8))
        (self.state / "hint-deploy").write_text(
            noise + "\n\npassword=hunter2-secret\n" + "x" * 500 + "\n" + hint + "\n"
        )
        code, out, err = run_main("deploy", "run", "--env", "dev")
        self.assertEqual(code, 1, err)
        self.assertIn("dev: rolled_back", out)
        lines = err.splitlines()
        self.assertEqual(
            lines[:2], ["  adapter deploy (exit 9): docker dòng 6", "  adapter deploy (exit 9): docker dòng 7"]
        )
        self.assertEqual(lines[-1], f"  adapter deploy (exit 9): {hint}")
        self.assertEqual(len(lines), 5)
        self.assertNotIn("hunter2", err)
        self.assertIn("password=***", err)
        self.assertIn("  adapter deploy (exit 9): " + "x" * 200 + "\n", err)
        self.assertNotIn("x" * 201, err)
        self.assertNotIn("down -v", self.ledger.read_text())
        (self.state / "fail-deploy").unlink()
        self.commit_files({"src/example.ts": "export const version = 'C';\n"}, 2)
        (self.state / "fail-candidate").touch()
        (self.state / "hint-candidate").write_text("Artifact chưa khớp mã hiện tại. Chạy node scripts/build.ts.\n")
        err = self.error("run", "--env", "dev")
        self.assertIn("pnpm build rồi thử lại\n  adapter candidate (exit 9): Artifact chưa khớp mã hiện tại.", err)


class AdapterSaidTest(unittest.TestCase):
    """AUD-A11Y-009 (review): `_adapter_said` chỉ đọc đuôi DEV_STDERR_BYTES của stderr — che bí mật cả ở ranh giới cửa
    sổ: dòng đầu cắt dở (tên khoá nằm trước cửa sổ) bị bỏ; khoá PEM dài hơn cửa sổ (mất BEGIN) không lộ thân/END."""

    def said(self, data: bytes) -> list[str]:
        with tempfile.TemporaryFile() as f:
            f.write(data)
            return xt._adapter_said(f)

    def test_window_cut_line_dropped(self):
        line = "mật khẩu password=hunter2xyz ".encode() + b"z" * 8174 + b"\n"
        self.assertGreater(len(line), xt.DEV_STDERR_BYTES)
        self.assertEqual(self.said(line), [])
        self.assertEqual(self.said(line + "cuối\n".encode()), ["cuối"])
        exact = b"a\n" + b"b" * (xt.DEV_STDERR_BYTES - 3) + b"\n"  # vừa khít cửa sổ: dòng đầu đủ, giữ
        self.assertEqual(self.said(exact), ["a", "b" * xt.DEV_STDERR_CHARS])
        self.assertEqual(self.said(b"x" + exact), ["b" * xt.DEV_STDERR_CHARS])

    def test_pem_longer_than_window_masked(self):
        # dấu PEM ghép lúc chạy (như tests/test_xt.py, test_stage.py): gitleaks không bắt khoá giả trong mã nguồn
        begin, end = "-----BEGIN " + "PRIVATE KEY-----\n", "-----END " + "PRIVATE KEY-----\n"
        rsa_begin, rsa_end = "-----BEGIN " + "RSA PRIVATE KEY-----\n", "-----END " + "RSA PRIVATE KEY-----\n"
        body = "".join("MIIE" + str(i % 10) * 60 + "\n" for i in range(140))
        pem = (begin + body + end).encode()
        self.assertGreater(len(pem), xt.DEV_STDERR_BYTES)
        self.assertEqual(self.said(pem), [xt.PEM_MASK])
        tail = self.said(b"truoc\n" + pem + b"sau khoa\n" + (rsa_begin + "AAAA\n" + rsa_end).encode())
        self.assertEqual(tail, [xt.PEM_MASK, "sau khoa", xt.PEM_MASK])
        self.assertEqual(self.said((begin + "MIIE\n" + end + "ok\n").encode()), [xt.PEM_MASK, "ok"])
