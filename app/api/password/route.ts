import { requireSession, sha256 } from "../../../lib/control-db";

export async function PUT(request: Request) {
  const auth = await requireSession(request);
  if (!auth) return Response.json({ error: "登入已逾時，請重新登入。" }, { status: 401 });

  const { currentPassword, newPassword } = await request.json() as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!newPassword || newPassword.length < 8) {
    return Response.json({ error: "新密碼至少需要 8 個字元。" }, { status: 400 });
  }

  const member = await auth.db.prepare("SELECT password_hash FROM members WHERE email=?")
    .bind(auth.session.email).first<{ password_hash: string }>();
  if (!member || member.password_hash !== await sha256(currentPassword ?? "")) {
    return Response.json({ error: "目前密碼不正確。" }, { status: 400 });
  }

  await auth.db.batch([
    auth.db.prepare("UPDATE members SET password_hash=? WHERE email=?")
      .bind(await sha256(newPassword), auth.session.email),
    auth.db.prepare("DELETE FROM sessions WHERE email=? AND token!=?")
      .bind(auth.session.email, request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? ""),
  ]);
  return Response.json({ ok: true });
}
