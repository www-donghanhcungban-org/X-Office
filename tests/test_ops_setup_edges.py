"""Trạng thái chưa biết, dữ liệu bị cắt và chỉ dẫn cho chủ repo của admin-plan."""

import json
import os
from pathlib import Path
import subprocess
import sys
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_admin_plan import GithubFixture
from test_xt_cli import TmpRepoCase, run_main, xt
import xt_ops_setup as setup


class SetupEvidenceEdges(GithubFixture, TmpRepoCase):
    def setUp(self):
        super().setUp()
        self.init_repo()
        self.commit_files({"xt.yaml": "deploy_envs: dev\n"}, 1)
        self.enterContext(mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": str(self.repo)}))

    def test_isolated_python_can_load_the_cli_companions(self):
        cmd = subprocess.run(
            [sys.executable, "-I", str(xt.SCRIPT_DIR / "xt.py"), "admin-plan", "--json"],
            cwd=self.repo,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(cmd.returncode, 1, cmd.stderr)
        self.assertEqual(json.loads(cmd.stdout)["dev"], {"state": "absent", "digest": None})

    def test_unavailable_api_cached_and_truncated_lists_never_confirm(self):
        self.fake_github()
        origin = setup.Origin(xt, self.repo)
        with mock.patch.object(subprocess, "run", side_effect=subprocess.TimeoutExpired("gh", 15)) as get:
            self.assertIsNone(origin.get("temporarily-unavailable"))
            self.assertIsNone(origin.get("temporarily-unavailable"))
            get.assert_called_once()
        for response in (None, {"encoding": "base64", "content": 7}, {"encoding": "base64", "content": "%%%"}):
            with self.subTest(response=response), mock.patch.object(origin, "get", return_value=response):
                self.assertIsNone(origin.file("xt.yaml"))
        full_page = [{"name": str(i)} for i in range(100)]
        with mock.patch.object(origin, "get", side_effect=[full_page, [{"name": "last"}]]) as api:
            self.assertEqual(origin.pages("rulesets"), [*full_page, {"name": "last"}])
            self.assertEqual(api.call_args_list[-1].args, ("rulesets?per_page=100&page=2",))
        with mock.patch.object(origin, "get", return_value=full_page) as api:
            self.assertIsNone(origin.pages("rulesets"))
            self.assertEqual(api.call_count, 50)
        self.assertEqual(setup.names_status(origin, set(), None), setup.SKIP)
        self.assertEqual(setup.deploy_secret_status(origin, {"deploy_secrets": "bad-name"}), setup.UNKNOWN)

    def test_ruleset_missing_unreadable_and_inactive_remain_distinct(self):
        origin = mock.Mock(spec=setup.Origin)
        origin.has_origin = True
        origin.sha = "a" * 40
        origin.branch = "main"
        origin.pages.return_value = None
        self.assertEqual(setup.rules_status(origin), setup.UNKNOWN)
        origin.pages.return_value = [{"name": "main", "target": "branch", "id": 7}]
        for raw, expected in [(None, setup.MISSING), ("{", setup.UNKNOWN), ('{"name":"absent"}', setup.MISSING)]:
            with self.subTest(raw=raw):
                origin.file.return_value = raw
                self.assertEqual(setup.rules_status(origin), expected)
        rule = {
            "name": "main",
            "target": "branch",
            "conditions": {},
            "rules": [],
            "bypass_actors": [],
            "enforcement": "active",
        }
        origin.file.return_value = json.dumps(rule)
        origin.get.return_value = {"name": "main"}
        self.assertEqual(setup.rules_status(origin), setup.UNKNOWN)
        self.assertEqual(setup.match_rules(origin, None, rule), setup.UNKNOWN)
        origin.get.return_value = rule
        self.assertEqual(setup.match_rules(origin, 7, {**rule, "enforcement": "disabled"}), setup.MISSING)
        self.assertEqual(setup.match_rules(origin, 7, {**rule, "bypass_actors": [{"actor_id": 5}]}), setup.MISSING)

    def test_incomplete_blueprint_machine_state_and_corrupt_ledger(self):
        def statuses():
            return {item["id"]: item for item in setup.local_items(xt, self.repo)}

        self.assertEqual(statuses()["human-musts"]["status"], setup.UNKNOWN)
        blueprint = self.repo / "BLUEPRINT.md"
        blueprint.write_text("Chưa có checklist hợp lệ.\n")
        self.assertEqual(statuses()["human-musts"]["status"], setup.UNKNOWN)
        blueprint.write_text("- [ ] `OPS-IR-006` **MUST** Diễn tập ứng cứu.\n")
        self.assertEqual(statuses()["human-musts"]["ids"], ["OPS-IR-006"])
        self.assertEqual(statuses()["human-musts"]["status"], setup.MISSING)
        state = xt.state_dir(self.repo) / "state.json"
        state.parent.mkdir(parents=True, exist_ok=True)
        state.write_text("{")
        self.assertEqual(statuses()["deferred"]["status"], setup.UNKNOWN)
        state.write_text(json.dumps({"deferred": {"T-123": {}, "misc": {}}}))
        self.assertEqual(statuses()["deferred"]["ids"], ["T-123"])
        self.assertEqual(statuses()["deferred"]["status"], setup.MISSING)
        state.write_text("{}")
        self.assertEqual(statuses()["deferred"]["status"], setup.OK)
        ledger = self.repo / xt.DEPLOY_LEDGER
        ledger.parent.mkdir(parents=True)
        ledger.write_text("{")
        rc, output, _ = run_main("admin-plan", "--json")
        self.assertEqual(rc, 1)
        self.assertEqual(json.loads(output)["dev"], {"state": "unreadable", "digest": None})

    def test_owner_script_proposes_only_missing_operations(self):
        self.fake_github()
        routing = self.tmp / "routes.json"
        routes = json.loads(routing.read_text())
        routes["automated-security-fixes"] = {"enabled": False}
        routing.write_text(json.dumps(routes))
        rc, script, _ = run_main("admin-plan", "--script")
        self.assertEqual(rc, 1)
        self.assertIn('gh api --method PUT "repos/$GH_REPO/automated-security-fixes"', script)
        self.assertNotIn("gh secret set", script)
        self.assertNotIn("--method POST", script)
