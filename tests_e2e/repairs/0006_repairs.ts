import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>) {
  await sql`
    CREATE TABLE repair_members (
      user_id uuid PRIMARY KEY REFERENCES users,
      tenant_id uuid NOT NULL REFERENCES tenants,
      room text NOT NULL,
      manager boolean NOT NULL
    );
    CREATE TABLE repairs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL DEFAULT app.current_tenant() REFERENCES tenants,
      reporter uuid NOT NULL REFERENCES users, room text NOT NULL, description text NOT NULL CHECK(length(description) BETWEEN 1 AND 250),
      status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')), created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE repair_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE repair_members FORCE ROW LEVEL SECURITY;
    ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE repairs FORCE ROW LEVEL SECURITY;
    CREATE POLICY repair_members_tenant ON repair_members USING (tenant_id=app.current_tenant());
    CREATE POLICY repairs_tenant ON repairs USING (tenant_id=app.current_tenant()) WITH CHECK (tenant_id=app.current_tenant());
    GRANT SELECT ON repair_members TO app_rw;
    GRANT SELECT,INSERT,UPDATE ON repairs TO app_rw;
  `.execute(db);
}
export async function down(db: Kysely<unknown>) {
  await sql`DROP TABLE repairs; DROP TABLE repair_members;`.execute(db);
}
