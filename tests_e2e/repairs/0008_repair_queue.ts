import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>) {
  await sql`CREATE INDEX repairs_tenant_queue ON repairs (tenant_id, created_at DESC, id DESC)`.execute(db);
}
export async function down(db: Kysely<unknown>) {
  await sql`DROP INDEX repairs_tenant_queue`.execute(db);
}
