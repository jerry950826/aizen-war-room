import { requireSession } from "../../../lib/control-db";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (!auth) return Response.json({ error: "登入已失效" }, { status: 401 });

  const member = await auth.db.prepare(
    "SELECT email,name,role FROM members WHERE email=? AND active=1",
  ).bind(auth.session.email).first<{ email: string; name: string; role: string }>();
  if (!member) return Response.json({ error: "帳號已停用" }, { status: 401 });

  return Response.json(member, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const auth = await requireSession(request);
  if (auth) {
    const cookie = request.headers.get("Cookie")?.match(/(?:^|;\s*)war_room_session=([^;]+)/)?.[1] ?? "";
    if (cookie) await auth.db.prepare("DELETE FROM sessions WHERE token=?").bind(cookie).run();
  }
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": "war_room_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" } },
  );
}
