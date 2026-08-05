import mysql from "mysql2/promise";
import { decodeHexText, openControlDb, sha256 } from "../../../lib/control-db";

export async function POST(request: Request) {
  const { email, password } = await request.json() as { email?: string; password?: string };
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  const db = await openControlDb();
  try {
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT id,email,HEX(display_name) AS name_hex,HEX(role) AS role_hex,password_hash FROM members WHERE lower(email)=? AND active=1 LIMIT 1",
      [normalizedEmail],
    );
    const row = rows[0] as { id: string; email: string; name_hex: string; role_hex: string; password_hash: string } | undefined;
    const member = row ? { ...row, name: decodeHexText(row.name_hex), role: decodeHexText(row.role_hex) } : undefined;
    if (!member || member.password_hash !== await sha256(password ?? "")) {
      return Response.json({ error: "帳號或密碼不正確" }, { status: 401 });
    }
    const token = crypto.randomUUID();
    await db.execute("DELETE FROM sessions WHERE expires_at <= ?", [Date.now()]);
    await db.execute(
      "INSERT INTO sessions (token,member_id,expires_at) VALUES (?,?,?)",
      [token, member.id, Date.now() + 24 * 60 * 60 * 1000],
    );
    return Response.json(
      { token, email: member.email, name: member.name, role: member.role },
      { headers: { "Set-Cookie": `war_room_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400` } },
    );
  } finally {
    await db.end();
  }
}
