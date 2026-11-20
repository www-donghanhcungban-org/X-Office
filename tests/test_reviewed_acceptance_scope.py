"""Phạm vi nghiệm thu gắn với commit độc lập, kiểm cả index và nội dung tệp trên đĩa."""

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import xt_acceptance as lock


class AcceptanceScopeTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(self.enterContext(tempfile.TemporaryDirectory())).resolve()
        self.git("init", "-q")
        self.git("config", "user.name", "Fixture")
        self.git("config", "user.email", "factory@example.invalid")
        self.spec = self.root / "SPEC v1.md"
        self.spec.write_text("Chủ phòng xác nhận phiếu đã xử lý.\n")
        self.case = self.root / "acceptance" / "owner.case"
        self.case.parent.mkdir()
        self.case.write_text("chủ phòng đọc lại kết quả\n")
        self.scope = self.root / lock.SCOPE_FILE
        self.scope.parent.mkdir(parents=True)
        self.scope.write_text("# Tuỳ dự án\n\nSPEC v1.md\nacceptance\n")
        self.git("add", ".")
        self.git("commit", "-qm", "acceptance: chốt luồng trước khi viết mã")
        self.base = self.git("rev-parse", "HEAD")

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.root), *args], text=True).strip()

    def invoke(self, *options, code=0):
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts/xt_acceptance.py"), "check", "--base", self.base, *options],
            cwd=self.root,
            text=True,
            capture_output=True,
        )
        self.assertEqual(result.returncode, code, result.stdout + result.stderr)
        return json.loads(result.stdout) if code < 2 else result.stderr

    def test_change_product_with_locked_scope_or_explicit_paths(self):
        (self.root / "app.py").write_text("# triển khai\n")
        self.git("add", "app.py")
        self.git("commit", "-qm", "feat: triển khai")
        with patch.dict(os.environ, {"GIT_DIR": "/missing-other-repository", "GIT_INDEX_FILE": "/missing-index"}):
            proof = self.invoke()
        self.assertEqual(
            (proof["status"], proof["scope_source"], proof["reviewed_files"]), ("unchanged", lock.SCOPE_FILE, 3)
        )
        self.assertEqual(self.invoke("--", "SPEC v1.md")["scope_source"], "arguments")
        self.scope.write_text("SPEC v1.md\n")
        self.assertIn(lock.SCOPE_FILE, self.invoke(code=1)["changed"])

    def test_unchanged_worktree_cannot_cover_different_index_or_commit(self):
        original = self.case.read_bytes()
        self.case.write_text("khác\n")
        self.git("add", str(self.case.relative_to(self.root)))
        self.case.write_bytes(original)
        self.assertEqual(self.invoke(code=1)["changed"], ["acceptance/owner.case"])
        self.git("commit", "-qm", "test: cập nhật tạm")
        self.git("add", str(self.case.relative_to(self.root)))
        self.assertEqual(self.invoke(code=1)["changed"], ["acceptance/owner.case"])

    def test_untracked_additions_removal_modes_and_raw_worktree_changes(self):
        self.case.chmod(0o755)
        self.assertIn("acceptance/owner.case", self.invoke(code=1)["changed"])
        self.case.chmod(0o644)
        self.git("update-index", "--assume-unchanged", "acceptance/owner.case")
        self.case.write_text("thay đổi đã được Git bỏ qua\n")
        (self.root / ".gitignore").write_text("*.case\n")
        (self.case.parent / "new.case").write_text("thêm ca\n")
        self.assertEqual(self.invoke(code=1)["changed"], ["acceptance/new.case", "acceptance/owner.case"])
        self.case.unlink()
        self.assertIn("acceptance/owner.case", self.invoke(code=1)["changed"])
        self.case.symlink_to(self.spec)
        self.assertIn("acceptance/owner.case", self.invoke(code=1)["changed"])

    def test_requires_real_ancestor_and_nonempty_normal_path(self):
        with self.assertRaises(ValueError):
            lock.check(self.root, "HEAD", [])
        blob = self.git("rev-parse", "HEAD:SPEC v1.md")
        with self.assertRaises(ValueError):
            lock.check(self.root, blob, [])
        for path in ["", "../outside", str(self.spec), "./acceptance", "missing"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                lock.check(self.root, self.base, [path])
        tree = self.git("rev-parse", "HEAD^{tree}")
        other = self.git("commit-tree", tree, "-m", "independent")
        with self.assertRaises(subprocess.CalledProcessError):
            lock.check(self.root, other, [])
        self.assertTrue(self.invoke("--", "missing", code=2))

    def test_rejects_empty_scope_unsupported_object_and_supports_sha256(self):
        self.scope.write_text("# phạm vi trống\n")
        linked = self.root / "external"
        linked.symlink_to("SPEC v1.md")
        self.git("add", ".")
        self.git("commit", "-qm", "fixture: kiểu file chưa hỗ trợ")
        self.base = self.git("rev-parse", "HEAD")
        self.assertIn("thiếu đường dẫn", self.invoke(code=2))
        self.assertIn("file thường", self.invoke("--", "external", code=2))
        sha = subprocess.check_output(["git", "hash-object", "--no-filters", str(self.spec)], text=True).strip()
        self.assertTrue(lock.matches(self.root, self.spec.name, "100644", sha))

        raw = self.spec.read_bytes()
        sha256 = hashlib.sha256(f"blob {len(raw)}\0".encode() + raw).hexdigest()
        self.assertTrue(lock.matches(self.root, self.spec.name, "100644", sha256))
