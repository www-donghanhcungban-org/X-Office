// Project-owned domain handlers; auth, HTTP validation and tenant transactions come from the generated app.
const repairRoute: Handler = async ({ db }, req, id) => {
  const who = await principal(db, req);
  const description = req.method === "POST" && !id ? text(await readJson(req), "description", 250) : null;
  return withTenant(db, who.tenantId, async (tx): Promise<[number, unknown]> => {
    const member = (await sql<{ room: string; manager: boolean }>`
      SELECT room, manager FROM repair_members WHERE user_id=${who.userId}
    `.execute(tx)).rows[0];
    if (!member) throw new HttpError(403, "unknown_member");
    if (!id && description !== null) {
      if (member.manager) throw new HttpError(403, "resident_only");
      const created = await sql`INSERT INTO repairs (reporter, room, description)
        VALUES (${who.userId}, ${member.room}, ${description}) RETURNING *`.execute(tx);
      return [201, created.rows[0]];
    }
    if (!id) {
      const visible = member.manager ? sql`TRUE` : sql`reporter=${who.userId}`;
      const result = await sql`SELECT * FROM repairs WHERE ${visible} ORDER BY created_at DESC, id DESC LIMIT 50`.execute(tx);
      return [200, { manager: member.manager, tickets: result.rows }];
    }
    if (!UUID_RE.test(id)) throw new HttpError(404, "not_found");
    if (req.method === "GET") {
      const rows = await sql`SELECT * FROM repairs WHERE id=${id} AND (${member.manager} OR reporter=${who.userId})`.execute(tx);
      if (!rows.rows[0]) throw new HttpError(404, "not_found");
      return [200, rows.rows[0]];
    }
    if (!member.manager) throw new HttpError(403, "manager_only");
    const result = await sql`UPDATE repairs SET status='resolved' WHERE id=${id} RETURNING *`.execute(tx);
    if (!result.rows[0]) throw new HttpError(404, "not_found");
    return [200, result.rows[0]];
  });
};
