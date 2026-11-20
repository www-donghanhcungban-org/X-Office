"""Reproduce the repair pilot in a fresh project and a separate, disposable stage simulation."""

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tarfile
import tempfile
import time
from urllib.parse import unquote, urlsplit, urlunsplit

REPO = Path(__file__).resolve().parents[1]
FIX = Path(__file__).parent / "repairs"
IDEA = "Cư dân báo sửa chữa cho phòng của mình, quản lý tòa nhà xử lý, cư dân xem lại trạng thái."
XT = [sys.executable, ".xtemplates/scripts/xt.py"]
LOCK = [sys.executable, str(REPO / "scripts/xt_acceptance.py"), "check"]
PROOF = ["REPAIR-SPEC.md", "acceptance", "xt.yaml"]
MVP_PLAN = "docs/autopilot/PLAN-repair-mvp.md"
RECORD = [*XT, "loop", "record", "--task", "T-001", "--", "python3", "acceptance/journey.py"]


def run(cwd, argv, env=None, expected=0):
    proc = subprocess.run(argv, cwd=cwd, env=env, text=True, capture_output=True, timeout=240)
    if proc.returncode != expected:
        # Avoid printing ambient credentials, connection strings, or authenticated HTTP request headers.
        tail = (proc.stdout + proc.stderr).splitlines()[-45:]
        for value in (env or {}).values():
            if isinstance(value, str) and ("://" in value or '"password"' in value):
                tail = [line.replace(value, "[redacted]") for line in tail]
        raise RuntimeError(f"{Path(str(argv[0])).name} exit {proc.returncode}, expected {expected}: " + "\n".join(tail))
    return proc.stdout + proc.stderr


def replace(path, before, after):
    source = path.read_text()
    if source.count(before) != 1:
        raise ValueError(f"Expected one occurrence in {path.name}: {before[:50]}")
    path.write_text(source.replace(before, after))


def commit(app, message, env):
    run(app, ["git", "add", "-A"], env)
    # Each commit is a disposable product revision. Product hooks run by default.
    run(app, ["git", "commit", "-qm", "test: " + message], env)
    return run(app, ["git", "rev-parse", "HEAD"], env).strip()


def register(app, number, name):
    module = f"{number}_{name}"
    shutil.copy(FIX / (module + ".ts"), app / f"src/migrations/{module}.ts")
    path = app / "src/migrate.ts"
    replace(
        path,
        "export const MIGRATIONS:",
        f'import * as m{number} from "./migrations/{module}.ts";\n\nexport const MIGRATIONS:',
    )
    replace(path, "};\n\nfunction migrator", f'  "{module}": m{number},\n}};\n\nfunction migrator')


def add_iteration(app, stage):
    server = app / "src/server.ts"
    if stage == 1:
        register(app, "0006", "repairs")
        replace(
            app / "test/slice.test.ts",
            '["job_effects", "jobs", "notes"]',
            '["job_effects", "jobs", "notes", "repair_members", "repairs"]',
        )
        replace(server, "import { readFileSync }", 'import { sql } from "kysely";\nimport { readFileSync }')
        replace(server, "function route(", (FIX / "handlers.ts").read_text() + "\nfunction route(")
        route = '  if (method === "POST" && path === "/v1/login")'
        replace(
            server,
            route,
            """  if (path === "/v1/repairs" && (method === "POST" || method === "GET")) return [repairRoute, ""];
  const repair = /^\\/v1\\/repairs\\/([^/]+)(\\/resolve)?$/.exec(path);
  if (repair?.[1] && ((!repair[2] && method === "GET") || (repair[2] && method === "POST"))) return [repairRoute, repair[1]];
"""
            + route,
        )
        for name in ("repairs.html", "repairs.js"):
            shutil.copy(FIX / name, app / "src/notes-ui" / name)
        replace(
            app / "src/notes-ui.ts",
            "const entries = [",
            """const entries = [
  ["/repairs", "repairs.html", "text/html"],
  ["/repairs.js", "repairs.js", "text/javascript"],""",
        )
        shutil.copy(FIX / "seed.mjs", app / "scripts/seed-repairs.mjs")
    elif stage == 2:
        register(app, "0007", "repair_history")
        replace(
            server,
            "UPDATE repairs SET status='resolved' WHERE id=",
            "UPDATE repairs SET status='resolved', resolved_at=now() WHERE status='open' AND id=",
        )
        replace(
            server,
            'if (!result.rows[0]) throw new HttpError(404, "not_found");',
            """if (!result.rows[0]) {
      const visible = await sql`SELECT id FROM repairs WHERE id=${id}`.execute(tx);
      throw visible.rows[0] ? new HttpError(409, "already_resolved") : new HttpError(404, "not_found");
    }""",
        )
    else:
        register(app, "0008", "repair_queue")


def deps(app, env):
    cmd = ["pnpm", "install", "--frozen-lockfile"]
    if env.get("REPAIR_PNPM_STORE"):
        env["pnpm_config_store_dir"] = env["REPAIR_PNPM_STORE"]
        env["pnpm_config_enable_global_virtual_store"] = "false"
        cmd.append("--offline")
    run(app, cmd, env)


@contextmanager
def serve(app, env):
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    env.update(PORT=str(port), REPAIR_URL=f"http://127.0.0.1:{port}")
    script = """import {createApp} from './src/server.ts'; import {createDb} from './src/db.ts';
    createApp(createDb(process.env.DATABASE_URL)).listen(Number(process.env.PORT), '127.0.0.1');"""
    proc = subprocess.Popen(["node", "--input-type=module", "-e", script], cwd=app, env=env, stdout=subprocess.DEVNULL)
    try:
        for _ in range(100):
            if proc.poll() is not None:
                raise RuntimeError("Repair server exited before readiness")
            conn = http.client.HTTPConnection("127.0.0.1", port, timeout=1)
            try:
                conn.request("GET", "/healthz")
                if conn.getresponse().status == 200:
                    break
            except OSError:
                pass
            finally:
                conn.close()
            time.sleep(0.1)
        else:
            raise TimeoutError("Repair server readiness timed out")
        yield
    finally:
        proc.terminate()
        proc.wait(timeout=10)


def stage_status(app, env):
    return json.loads(run(app, [*XT, "stage", "status", "--json"], env))["stage"]


def fixture_event(clone, workspace):
    # Simulate a state-machine input only on the isolated fixture clone. No process impersonates a human.
    if clone != workspace / "simulation" or not (clone / ".git/TEST-FIXTURE-ONLY").is_file():
        raise ValueError("This operation belongs only to the temporary simulation")
    sys.path.insert(0, str(clone / ".xtemplates/scripts"))
    try:
        import xt

        xt.update_stage(
            clone,
            lambda state: xt._stage_approve(
                state, state["submitted"]["sha"], "SIMULATED_REVIEWER_TEST_ONLY", "Fixture input; no human approval"
            ),
        )
    finally:
        sys.path.pop(0)


def sql(env, query, *args):
    return run(REPO, ["psql", "-XqAt", "-v", "ON_ERROR_STOP=1", *args, "-c", query], env).strip()


def queue_plan(app, env, stage):
    tenant = sql(env, "SELECT id FROM tenants WHERE name='Nhà A'")
    if stage == 2:
        sql(
            env,
            """INSERT INTO repairs (tenant_id, reporter, room, description, created_at)
        SELECT m.tenant_id, m.user_id, m.room, 'sample', now() - i * interval '1 second'
        FROM repair_members m CROSS JOIN generate_series(1,12000) i WHERE m.manager; ANALYZE repairs""",
        )
    raw = run(
        app,
        ["psql", "-XqAt", "-v", "ON_ERROR_STOP=1", "-v", f"tenant={tenant}", "-f", str(app / "acceptance/queue.sql")],
        env,
    )
    plan = json.loads(raw)[0]
    root = plan["Plan"]
    if root["Actual Rows"] != 50:
        raise ValueError("Expected 50 sampled repair requests")
    nodes = []

    def walk(node):
        nodes.append(node["Node Type"])
        for child in node.get("Plans", []):
            walk(child)

    walk(root)
    if stage == 3 and ("repairs_tenant_queue" not in raw or "Sort" in nodes):
        raise ValueError("Bounded queue did not use its intended index")
    return {"sample_rows": 12000, "returned": 50, "plan_nodes": nodes, "execution_ms": plan["Execution Time"]}


def verify_lock(app, baseline, env):
    run(app, [*LOCK, "--project", str(app), "--base", baseline], env)


def exercise(app, stage, baseline, env, workspace):
    started = time.monotonic()
    add_iteration(app, stage)
    env["REPAIR_PHASE"] = str(stage)
    run(
        app, ["pnpm", "exec", "biome", "check", "--write", "src", "scripts/seed-repairs.mjs", "test/slice.test.ts"], env
    )
    run(app, ["pnpm", "typecheck"], env)
    run(app, ["pnpm", "build"], env)
    artifact = hashlib.sha256((app / "dist/app.tgz").read_bytes()).hexdigest()
    run(app, ["node", "src/migrate.ts", "up"], env)
    if stage == 1:
        run(app, ["node", "scripts/seed-repairs.mjs"], env)
    queue = queue_plan(app, env, stage) if stage > 1 else None
    verify_lock(app, baseline, env)
    with tempfile.TemporaryDirectory(prefix="repair-artifact-") as output:
        runtime = Path(output)
        with tarfile.open(app / "dist/app.tgz") as archive:
            archive.extractall(runtime, filter="data")
        (runtime / "node_modules").symlink_to(app / "node_modules", target_is_directory=True)
        with serve(runtime, env):
            if stage == 1:
                run(app, RECORD, env)
                checked = (FIX / "PLAN-repair-mvp.md").read_text().replace("- [ ]", "- [x]")
                assert (app / MVP_PLAN).read_text() == checked, "Only the verified task checkbox may change"
            head = commit(app, f"repair iteration {stage}", env)
            verify_lock(app, baseline, env)
            if stage == 1:
                run(app, [*XT, "loop", "verify", "--all"], env)
                # Pilot chạy trong repo cục bộ mới, chưa mở PR cho đợt này.
                prs = workspace / "mvp-prs.json"
                prs.write_text("[]", encoding="utf-8")
                decision = json.loads(run(app, [*XT, "loop", "next-step", "--prs", str(prs), "--json"], env))
                assert decision["action"] == "stage-submit", decision["reason"]
                verified = json.loads((app / ".autopilot/verified.json").read_text())
                assert verified["ok"] and verified["mode"] == "all"
                assert any(
                    row["task"] == "T-001"
                    and row["gate"] == "python3 acceptance/journey.py"
                    and row["exit_code"] == 0
                    and not row.get("kept")
                    for row in verified["results"]
                )
            approval = (
                "real project, approval pending" if stage == 1 else f"simulation only, queue {queue['plan_nodes']}"
            )
            run(app, [*XT, "stage", "submit", "--evidence", f"Browser + PostgreSQL repair journey; {approval}"], env)
    submitted_after = time.monotonic() - started
    state = stage_status(app, env)
    assert (state["stage"], state["status"], state["submitted"]["sha"]) == (stage, "awaiting_approval", head)
    assert state["submitted"]["smoke"] == "`python3 acceptance/journey.py` exit 0"
    denied = run(app, [*XT, "stage", "approve", "--sha", head, "--note", "Verify human boundary"], env, 2)
    assert "chỉ người duyệt" in denied
    assert stage_status(app, env) == state
    result = {
        "stage": stage,
        "subject": head,
        "artifact_sha256": artifact,
        "runtime": "extracted dist/app.tgz, loopback Node HTTP, PostgreSQL, Chromium",
        "gate": "passed",
        "seconds_to_submission": round(submitted_after, 3),
        "agent_approval": "denied",
    }
    if stage == 1:
        assert state["submitted"]["verified"] == "loop verify --all xanh trên cây này"
        flow = json.loads(run(app, [sys.executable, ".xtemplates/scripts/xt_flow.py", "--json"], env))
        assert (flow["next"]["action"], flow["next"]["owner"]) == ("check-approval-policy", "coordinator")
        result["loop"] = {
            "task": "T-001",
            "red_before_implementation": True,
            "final_gate": "passed",
            "verification": "all",
            "next": flow["next"]["action"],
            "owner": flow["next"]["owner"],
            "gate_runs": flow["metrics"]["gate_runs"],
            "failed_gate_runs": flow["metrics"]["failed_gate_runs"],
        }
    if queue:
        result["queue"] = queue
        fixture_event(app, workspace)
    result["elapsed_seconds"] = round(time.monotonic() - started, 3)
    return result


def pilot(workspace, env):
    app = workspace / "product"
    simulation = workspace / "simulation"
    started = time.monotonic()
    run(REPO, [sys.executable, "scripts/install.py", str(app), "--new", "--pack", "web-api-ts", "--idea", IDEA], env)
    scaffold_seconds = round(time.monotonic() - started, 3)
    deps(app, env)
    env.update(CLAUDE_PROJECT_DIR=str(app), AI_AGENT="1")
    if not stage_status(app, env):
        run(app, [*XT, "stage", "init"], env)
    assert stage_status(app, env)["status"] == "active"
    (app / "acceptance").mkdir()
    for name in ("journey.py", "queue.sql"):
        shutil.copy(FIX / name, app / "acceptance" / name)
    shutil.copy(FIX / "SPEC.md", app / "REPAIR-SPEC.md")
    shutil.copy(FIX / "PLAN-repair-mvp.md", app / MVP_PLAN)
    config = app / "xt.yaml"
    content, count = re.subn(
        r"^preview_smoke:.*$", "preview_smoke: python3 acceptance/journey.py", config.read_text(), flags=re.M
    )
    if count != 1:
        raise ValueError("Generated pack is missing its smoke hook")
    config.write_text(content)
    (app / "docs/autopilot/ACCEPTANCE.paths").write_text("\n".join(PROOF) + "\n")
    base = commit(app, "record independent scenarios before product code", env)
    verify_lock(app, base, env)
    spec = app / "REPAIR-SPEC.md"
    original = spec.read_bytes()
    try:
        spec.write_bytes(original + b" ")
        inspect = run(app, [*LOCK, "--project", str(app), "--base", base], env, expected=1)
        assert "REPAIR-SPEC.md" in inspect
    finally:
        spec.write_bytes(original)
    with serve(app, env):
        red = run(app, [*XT, "stage", "submit", "--evidence", "Pre-implementation regression"], env, 2)
        assert "Repair page is missing" in red and stage_status(app, env)["status"] == "active"
        run(app, [*XT, "loop", "init", "--plan", MVP_PLAN], env)
        assert "T-001" in run(app, [*XT, "loop", "next"], env)
        red_gate = run(app, RECORD, env, expected=1)
        assert "Repair page is missing" in red_gate and "- [ ]" in (app / MVP_PLAN).read_text()
    before_implementation = time.monotonic() - started
    first = exercise(app, 1, base, env, workspace)
    elapsed = round(before_implementation + first["seconds_to_submission"], 3)
    # Clone the actual, pending product. The owner-facing original stays at stage 1.
    commit(app, "record pending MVP submission", env)
    run(workspace, ["git", "clone", "--quiet", "--no-local", str(app), str(simulation)], env)
    run(simulation, ["git", "remote", "remove", "origin"], env)
    for hook in ("pre-commit", "commit-msg"):
        shutil.copy2(app / ".git/hooks" / hook, simulation / ".git/hooks" / hook)
    (simulation / ".git/TEST-FIXTURE-ONLY").touch()
    env["CLAUDE_PROJECT_DIR"] = str(simulation)
    deps(simulation, env)
    fixture_event(simulation, workspace)
    sim_db = env["PGDATABASE"] + "_sim"
    admin = unquote(urlsplit(os.environ["DATABASE_URL"]).path.lstrip("/")) or "postgres"
    run(REPO, ["createdb", "--maintenance-db", admin, "--template", env["PGDATABASE"], sim_db], env)
    simulation_env = {
        **env,
        "PGDATABASE": sim_db,
        "DATABASE_URL": urlunsplit(urlsplit(env["DATABASE_URL"])._replace(path="/" + sim_db)),
    }
    try:
        second = exercise(simulation, 2, base, simulation_env, workspace)
        third = exercise(simulation, 3, base, simulation_env, workspace)
    finally:
        run(REPO, ["dropdb", "--maintenance-db", admin, sim_db], env)
    assert stage_status(simulation, env)["status"] == "completed"
    original = stage_status(app, {**env, "CLAUDE_PROJECT_DIR": str(app)})
    assert original["status"] == "awaiting_approval" and original["stage"] == 1
    return {
        "measurement": "Replay of prewritten project iterations; development and owner wait time are unmeasured",
        "development_seconds": None,
        "scaffold_seconds": scaffold_seconds,
        "framework_base": run(REPO, ["git", "rev-parse", "HEAD"], env).strip(),
        "started_utc": env["REPAIR_STARTED"],
        "baseline": base,
        "product": first,
        "idea_to_submitted_mvp_seconds": elapsed,
        "simulation_only": [second, third],
        "actual_stage": 1,
        "actual_status": "awaiting_approval",
        "human_approvals": 0,
        "acceptance_lock": {"scope": PROOF, "one_byte_change": "rejected", "unchanged_at_all_submissions": True},
        "simulated_reviewer_events": 3,
        "intentional_preimplementation_gate_failures": {"stage_smoke": 1, "task_gate": 1},
        "agent_approval_denials": 3,
        "human_questions": 0,
        "cost_usd": None,
        "checks": [
            "resident_create_201",
            "fresh_session_open",
            "manager_resolve_200",
            "fresh_session_resolved",
            "foreign_read_404",
            "foreign_update_403",
            "resident_update_403",
        ],
        "total_seconds": round(time.monotonic() - started, 3),
    }


def main():
    if not __debug__ or os.environ.get("PYTHONOPTIMIZE"):
        raise RuntimeError("Pilot requires Python assertions")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--work-dir", type=Path, help="New directory to retain generated product and simulation")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    admin = urlsplit(os.environ["DATABASE_URL"])
    if (
        admin.hostname not in {"127.0.0.1", "localhost"}
        or admin.scheme not in {"postgresql", "postgres"}
        or admin.query
        or admin.fragment
    ):
        raise ValueError("Set DATABASE_URL to a local, disposable PostgreSQL server")
    name = "xt_repair_" + secrets.token_hex(8)
    env = dict(
        {k: v for k, v in os.environ.items() if not k.startswith(("GIT_", "PG")) or k == "PG_TOOLS_CONTAINER"},
        PYTHONDONTWRITEBYTECODE="1",
        REPAIR_STARTED=datetime.now(timezone.utc).isoformat(),
        GIT_AUTHOR_NAME="Repair pilot fixture",
        GIT_AUTHOR_EMAIL="repair-pilot@example.invalid",
        GIT_COMMITTER_NAME="Repair pilot fixture",
        GIT_COMMITTER_EMAIL="repair-pilot@example.invalid",
    )
    env["REPAIR_ACCOUNTS"] = json.dumps(
        {
            role: {"email": role + "@example.test", "password": secrets.token_hex(24)}
            for role in ("resident", "manager", "outsider")
        }
    )
    env["DATABASE_URL"] = urlunsplit(admin._replace(path="/" + name))
    # psql consumes PGDATABASE even when given -f. Restrict credential propagation to this disposable run.
    env.update(
        PGDATABASE=name,
        PGHOST=admin.hostname,
        PGPORT=str(admin.port or 5432),
        PGUSER=unquote(admin.username or "postgres"),
    )
    if admin.password:
        env["PGPASSWORD"] = unquote(admin.password)
    maintenance = unquote(admin.path.lstrip("/")) or "postgres"
    run(REPO, ["createdb", "--maintenance-db", maintenance, name], env)
    try:
        with tempfile.TemporaryDirectory(prefix="xt-repair-") as temp:
            workspace = args.work_dir.resolve() if args.work_dir else Path(temp)
            if args.work_dir:
                workspace.mkdir(exist_ok=False)
            report = pilot(workspace, env)
            args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
            print(json.dumps(report, ensure_ascii=False))
    finally:
        run(REPO, ["dropdb", "--maintenance-db", maintenance, name], env)


if __name__ == "__main__":
    main()
