import mysql from "mysql2/promise";
import { audit, requireSession, sha256 } from "../../../lib/control-db";

export async function PUT(request: Request) {
  const auth = await requireSession(request);
  if (!auth) return Response.json({ error: "登入已逾時，請重新登入。" }, { status: 401 });
  try {
    const { currentPassword, newPassword } = await request.json() as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!newPassword || newPassword.length < 8) {
      return Response.json({ error: "新密碼至少需要 8 個字元。" }, { status: 400 });
    }
    const [rows] = await auth.db.execute<mysql.RowDataPacket[]>(
      "SELECT password_hash FROM members WHERE id=? LIMIT 1",
      [auth.session.member_id],
    );
    const member = rows[0] as { password_hash: string } | undefined;
    if (!member || member.password_hash !== await sha256(currentPassword ?? "")) {
      return Response.json({ error: "目前密碼不正確。" }, { status: 400 });
    }
    await auth.db.beginTransaction();
    await auth.db.execute("UPDATE members SET password_hash=? WHERE id=?", [await sha256(newPassword), auth.session.member_id]);
    await auth.db.execute("DELETE FROM sessions WHERE member_id=? AND token!=?", [auth.session.member_id, auth.token]);
    await audit(auth.db, auth.session.member_id, "password.change", "member", auth.session.member_id);
    await auth.db.commit();
    return Response.json({ ok: true });
  } catch (error) {
    await auth.db.rollback();
    throw error;
  } finally {
    await auth.db.end();
  }
}
