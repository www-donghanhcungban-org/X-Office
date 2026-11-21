"""S-110/111/116/118: release-check dùng bản hiện tại trong sổ schema 1; tên repo từ origin GitHub (admin-plan)."""

import json
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_deploy_receipt import LEDGER, UNDEPLOYED, UNKNOWN, receipt
from test_release_contract import ReleaseCase
from test_xt_cli import xt


def ledger(path, envs, events=()):
    target = path / LEDGER
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({"schema": 1, "envs": envs, "events": list(events)}), encoding="utf-8")
    return target


class ReleaseDeployTest(ReleaseCase):
    def setUp(self):
        super().setUp()
        (self.repo / "dist").mkdir()
        self.artifact = self.repo / "dist/app.tgz"
        self.artifact.write_bytes(b"A")

    def test_opt_in_missing_corrupt_unknown_roll_back_and_current(self):
        self.setup_xt(deploy_envs="dev prod", release_artifacts="dist/app.tgz")
        _, candidate = self.release()
        row = self.by_id(candidate)["deploy"]
        self.assertEqual((row["result"], row["level"]), ("FAIL", "BLOCKER"))
        self.assertIn("deploy run --env dev", row["evidence"])
        self.assertIn("deploy", candidate["fails"])
        self.assertFalse(candidate["go"])
        self.assertFalse((self.repo / LEDGER).exists())
        identity = {k: candidate["subject"][k] for k in ("head", "digest", "content")}
        artifacts = [{k: a[k] for k in ("path", "sha256")} for a in candidate["artifacts"]]
        current = receipt(subject=identity, served_digest=identity["digest"], artifacts=artifacts)
        slot = {**UNDEPLOYED, "current": current}
        target = ledger(self.repo, {"dev": slot}, [current])
        before = target.read_bytes()
        self.commit()
        _, approved = self.release()
        self.assertNotEqual(approved["subject"]["head"], identity["head"])
        self.assertEqual(approved["subject"]["content"], identity["content"])
        self.assertEqual(self.by_id(approved)["deploy"]["result"], "PASS")
        self.assertEqual(target.read_bytes(), before)
        # Sau rollback về A, B có thể còn nằm trong previous và lịch sử. Chỉ current được tính.
        self.artifact.write_bytes(b"B")
        _, after = self.release()
        self.assertEqual(after["subject"]["content"], identity["content"])
        self.assertIn("bản dev chưa chạy ứng viên này", self.by_id(after)["deploy"]["evidence"])
        b = receipt(
            subject={**identity, "digest": after["subject"]["digest"]}, served_digest=after["subject"]["digest"]
        )
        ledger(self.repo, {"dev": {**slot, "previous": b}}, [current, b])
        self.assertIn("deploy", self.release()[1]["fails"])
        self.artifact.write_bytes(b"A")
        (self.repo / "app.txt").write_text("mã mới")
        _, changed = self.release()
        self.assertEqual(changed["subject"]["digest"], identity["digest"])
        self.assertNotEqual(changed["subject"]["content"], identity["content"])
        self.assertIn("deploy", changed["fails"])
        (self.repo / "app.txt").unlink()
        ledger(self.repo, {"dev": {**UNKNOWN, "previous": current}}, [current])
        self.assertIn("deploy", self.release()[1]["fails"])
        target.write_text("{}", encoding="utf-8")
        broken = self.by_id(self.release()[1])["deploy"]
        self.assertIn("schema", broken["evidence"])
        self.assertEqual(broken["result"], "FAIL")

    def test_invalid_config_fails_and_missing_or_empty_opt_in_preserves_promotion(self):
        self.setup_xt(release_artifacts="dist/app.tgz")
        _, old = self.release()
        ledger(self.repo, {}, [])
        self.commit()
        _, still_old = self.release()
        self.assertNotIn("deploy", self.by_id(still_old))
        self.assertEqual(old["verdict"], still_old["verdict"])
        self.assertEqual(old["promotion"]["state"], still_old["promotion"]["state"])
        for config in ("''", "null"):
            self.setup_xt(deploy_envs=config)
            self.assertNotIn("deploy", self.by_id(self.release()[1]))
        for config in ("prod", "dev ../bad"):
            self.setup_xt(deploy_envs=config)
            self.assertIn("deploy_envs", self.by_id(self.release()[1])["deploy"]["evidence"])
        self.setup_xt(deploy_envs="dev")
        self.assertIn("deploy", self.release()[1]["fails"])

    def test_release_check_still_parses_with_standalone_xt(self):
        with mock.patch.object(xt, "SCRIPT_DIR", self.tmp):
            parser = xt.build_parser()
        self.assertIs(parser.parse_args(["release-check"]).fn, xt.cmd_release_check)


class GithubOriginSlugTest(unittest.TestCase):
    def test_github_clone_identity_accepts_only_exact_authority_and_two_path_components(self):
        for origin in ("https://github.com/Org/App.git/", "ssh://git@github.com/Org/App", "git@github.com:Org/App.git"):
            self.assertEqual(xt.github_origin_slug(origin), "Org/App")
        for origin in (
            "",
            "https://[",
            "file:///Org/App",
            "https://github.com.example/Org/App",
            "https://user@github.com/Org/App",
            "ssh://git@github.com:2222/Org/App",
            "git@github.com:/Org/App",
            "https://github.com/Org/App//",
            "https://github.com/Org/..",
            "git@github.com:../App",
            "https://github.com//Org/App",
            "https://github.com/Org/App/tree",
            "https://github.com/Org/App?#",
            "git@github.com:Org/App\n",
            "git@github.com:Org/A pp",
            "https://github.com/Org/Ứng-dụng",
        ):
            with self.subTest(origin=origin):
                self.assertEqual(xt.github_origin_slug(origin), "")
