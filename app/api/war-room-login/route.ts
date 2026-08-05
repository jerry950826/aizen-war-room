import { ensureControlDb, sha256 } from "../../../lib/control-db";

export async function POST(request: Request) {
  const { email, password } = await request.json() as { email?: string; password?: string };
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  const db = await ensureControlDb();
  const member = await db.prepare(
    "SELECT email,name,role,password_hash FROM members WHERE lower(email)=? AND active=1",
  ).bind(normalizedEmail).first<{ email: string; name: string; role: string; password_hash: string }>();
  if (!member || member.password_hash !== await sha256(password ?? "")) {
    return Response.json({ error: "帳號或密碼不正確" }, { status: 401 });
  }
  const token = crypto.randomUUID();
  await db.prepare("INSERT INTO sessions (token,email,expires_at) VALUES (?,?,?)")
    .bind(token, member.email, Date.now() + 24 * 60 * 60 * 1000).run();
  return Response.json(
    { token, email: member.email, name: member.name, role: member.role },
    { headers: { "Set-Cookie": `war_room_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400` } },
  );
}
