import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { createUser } from "../src/auth.ts";
import { createDb } from "../src/db.ts";

const db = createDb(process.env.DATABASE_URL);
const accounts = JSON.parse(process.env.REPAIR_ACCOUNTS);
try {
  const home = randomUUID();
  const away = randomUUID();
  await db.insertInto("tenants").values([{ id: home, name: "Nhà A" }, { id: away, name: "Nhà B" }]).execute();
  for (const [name, account] of Object.entries(accounts)) {
    const tenant = name === "outsider" ? away : home;
    const user = await createUser(db, tenant, account.email, account.password);
    await sql`INSERT INTO repair_members (user_id,tenant_id,room,manager)
      VALUES (${user},${tenant},${name === "outsider" ? "B-201" : "A-101"},${name === "manager"})`.execute(db);
  }
} finally {
  await db.destroy();
}
