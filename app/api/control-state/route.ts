import { requireSession, sha256 } from "../../../lib/control-db";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (!auth) return Response.json({ error: "未登入" }, { status: 401 });
  const members = await auth.db.prepare("SELECT email,name,role,active FROM members ORDER BY role DESC,name").all();
  const permissions = await auth.db.prepare("SELECT email,leave,claims,instructors FROM permissions").all();
  return Response.json({ members: members.results, permissions: permissions.results });
}

export async function POST(request: Request) {
  const auth = await requireSession(request, true);
  if (!auth) return Response.json({ error: "需要管理員權限" }, { status: 403 });
  const body = await request.json() as {
    action: "add" | "toggle" | "remove" | "permissions";
    email: string;
    name?: string;
    active?: boolean;
    permissions?: { leave: boolean; claims: boolean; instructors: boolean };
  };
  const email = body.email.trim().toLowerCase();
  if (body.action === "add") {
    await auth.db.batch([
      auth.db.prepare("INSERT INTO members (email,name,role,active,password_hash) VALUES (?,?,?,?,?)")
        .bind(email, body.name || email.split("@")[0], "一般成員", 1, await sha256("Ab123456")),
      auth.db.prepare("INSERT INTO permissions (email,leave,claims,instructors) VALUES (?,?,?,?)")
        .bind(email, 1, 1, 1),
    ]);
  } else if (body.action === "toggle") {
    await auth.db.prepare("UPDATE members SET active=? WHERE email=?").bind(body.active ? 1 : 0, email).run();
  } else if (body.action === "remove") {
    await auth.db.batch([
      auth.db.prepare("DELETE FROM permissions WHERE email=?").bind(email),
      auth.db.prepare("DELETE FROM members WHERE email=? AND role!='管理員'").bind(email),
    ]);
  } else if (body.action === "permissions" && body.permissions) {
    await auth.db.prepare(
      "INSERT INTO permissions (email,leave,claims,instructors) VALUES (?,?,?,?) ON CONFLICT(email) DO UPDATE SET leave=excluded.leave,claims=excluded.claims,instructors=excluded.instructors",
    ).bind(email, body.permissions.leave ? 1 : 0, body.permissions.claims ? 1 : 0, body.permissions.instructors ? 1 : 0).run();
  }
  return Response.json({ ok: true });
}
