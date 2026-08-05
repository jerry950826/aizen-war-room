import mysql from "mysql2/promise";
import { decodeHexText, requireSession, sessionToken } from "../../../lib/control-db";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (!auth) return Response.json({ error: "登入已失效" }, { status: 401 });
  try {
    const [rows] = await auth.db.execute<mysql.RowDataPacket[]>(
      "SELECT email,HEX(display_name) AS name_hex,HEX(role) AS role_hex FROM members WHERE id=? AND active=1 LIMIT 1",
      [auth.session.member_id],
    );
    const row = rows[0] as { email: string; name_hex: string; role_hex: string } | undefined;
    const member = row ? { email: row.email, name: decodeHexText(row.name_hex), role: decodeHexText(row.role_hex) } : undefined;
    if (!member) return Response.json({ error: "帳號已停用" }, { status: 401 });
    await auth.db.execute("UPDATE sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE token=?", [auth.token]);
    return Response.json(member, { headers: { "Cache-Control": "no-store" } });
  } finally {
    await auth.db.end();
  }
}

export async function DELETE(request: Request) {
  const auth = await requireSession(request);
  if (auth) {
    try {
      await auth.db.execute("DELETE FROM sessions WHERE token=?", [sessionToken(request)]);
    } finally {
      await auth.db.end();
    }
  }
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": "war_room_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" } },
  );
}
