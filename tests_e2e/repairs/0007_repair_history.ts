import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>) {
  await sql`ALTER TABLE repairs ADD COLUMN resolved_at timestamptz`.execute(db);
}
export async function down(db: Kysely<unknown>) {
  await sql`ALTER TABLE repairs DROP COLUMN resolved_at`.execute(db);
}
