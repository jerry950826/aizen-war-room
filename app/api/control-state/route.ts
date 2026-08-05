import { requireSession, sha256 } from "../../../lib/control-db";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (!auth) return Response.json({ error: "未登入" }, { status: 401 });
  const members = await auth.db.prepare("SELECT email,name,role,active FROM members ORDER BY role DESC,name").all();
  const permissions = await auth.db.prepare("SELECT email,leave,claims,instructors FROM permissions").all();
  const organization = await auth.db.prepare(
    "SELECT lower(english_name) AS id,department,level,job_title AS title,english_name AS english,chinese_name AS name,phone,email,birthday FROM organization_profiles ORDER BY level,department,english_name",
  ).all();
  return Response.json({ members: members.results, permissions: permissions.results, organization: organization.results });
}

export async function POST(request: Request) {
  const auth = await requireSession(request, true);
  if (!auth) return Response.json({ error: "需要管理員權限" }, { status: 403 });
  const body = await request.json() as {
    action: "add" | "edit" | "toggle" | "remove" | "permissions";
    email: string;
    name?: string;
    role?: "管理員" | "一般成員";
    newEmail?: string;
    active?: boolean;
    permissions?: { leave: boolean; claims: boolean; instructors: boolean };
  };
  const email = body.email.trim().toLowerCase();
  const name = body.name?.trim() ?? "";
  const validEmail = /^[^\s@]+@ai-zens\.com$/i;
  if (!validEmail.test(email)) {
    return Response.json({ error: "請使用有效的公司信箱" }, { status: 400 });
  }
  if (body.action === "add") {
    if (!name) return Response.json({ error: "請輸入姓名" }, { status: 400 });
    const existing = await auth.db.prepare("SELECT 1 AS found FROM members WHERE lower(email)=?")
      .bind(email).first();
    if (existing) return Response.json({ error: "此公司信箱已在名單中" }, { status: 409 });
    await auth.db.batch([
      auth.db.prepare("INSERT INTO members (email,name,role,active,password_hash) VALUES (?,?,?,?,?)")
        .bind(email, name, "一般成員", 1, await sha256("Ab123456")),
      auth.db.prepare("INSERT INTO permissions (email,leave,claims,instructors) VALUES (?,?,?,?)")
        .bind(email, 1, 1, 1),
      auth.db.prepare("INSERT INTO organization_profiles (email,department,level,job_title,english_name,chinese_name) VALUES (?,?,?,?,?,?)")
        .bind(email, "待確認", 3, "待確認", name.split(" ")[0] || name, name.split(" ").slice(1).join(" ") || name),
    ]);
  } else if (body.action === "edit") {
    const newEmail = body.newEmail?.trim().toLowerCase() ?? "";
    const newRole = body.role;
    if (!name) return Response.json({ error: "請輸入姓名" }, { status: 400 });
    if (!validEmail.test(newEmail)) {
      return Response.json({ error: "請使用有效的公司信箱" }, { status: 400 });
    }
    const member = await auth.db.prepare("SELECT role FROM members WHERE email=?")
      .bind(email).first<{ role: string }>();
    if (!member) return Response.json({ error: "找不到此人員" }, { status: 404 });
    if (newRole !== "管理員" && newRole !== "一般成員") {
      return Response.json({ error: "請選擇有效的系統角色" }, { status: 400 });
    }
    if (member.role === "管理員" && newRole === "一般成員") {
      const otherAdmin = await auth.db.prepare(
        "SELECT 1 AS found FROM members WHERE role='管理員' AND active=1 AND email!=? LIMIT 1",
      ).bind(email).first();
      if (!otherAdmin) return Response.json({ error: "系統至少需要保留一位可登入的管理員" }, { status: 400 });
    }
    if (newEmail !== email) {
      const existing = await auth.db.prepare("SELECT 1 AS found FROM members WHERE lower(email)=?")
        .bind(newEmail).first();
      if (existing) return Response.json({ error: "新信箱已被其他人使用" }, { status: 409 });
    }
    await auth.db.batch([
      auth.db.prepare("UPDATE members SET email=?,name=?,role=? WHERE email=?").bind(newEmail, name, newRole, email),
      auth.db.prepare("UPDATE permissions SET email=? WHERE email=?").bind(newEmail, email),
      auth.db.prepare("UPDATE sessions SET email=? WHERE email=?").bind(newEmail, email),
      auth.db.prepare("UPDATE organization_profiles SET email=?,english_name=?,chinese_name=? WHERE email=?")
        .bind(newEmail, name.split(" ")[0] || name, name.split(" ").slice(1).join(" ") || name, email),
    ]);
  } else if (body.action === "toggle") {
    if (!body.active) {
      const member = await auth.db.prepare("SELECT role FROM members WHERE email=?")
        .bind(email).first<{ role: string }>();
      if (member?.role === "管理員") {
        const otherAdmin = await auth.db.prepare(
          "SELECT 1 AS found FROM members WHERE role='管理員' AND active=1 AND email!=? LIMIT 1",
        ).bind(email).first();
        if (!otherAdmin) return Response.json({ error: "系統至少需要保留一位可登入的管理員" }, { status: 400 });
      }
    }
    await auth.db.prepare("UPDATE members SET active=? WHERE email=?").bind(body.active ? 1 : 0, email).run();
  } else if (body.action === "remove") {
    await auth.db.batch([
      auth.db.prepare("DELETE FROM permissions WHERE email=?").bind(email),
      auth.db.prepare("DELETE FROM organization_profiles WHERE email=?").bind(email),
      auth.db.prepare("DELETE FROM members WHERE email=? AND role!='管理員'").bind(email),
    ]);
  } else if (body.action === "permissions" && body.permissions) {
    await auth.db.prepare(
      "INSERT INTO permissions (email,leave,claims,instructors) VALUES (?,?,?,?) ON CONFLICT(email) DO UPDATE SET leave=excluded.leave,claims=excluded.claims,instructors=excluded.instructors",
    ).bind(email, body.permissions.leave ? 1 : 0, body.permissions.claims ? 1 : 0, body.permissions.instructors ? 1 : 0).run();
  }
  return Response.json({ ok: true });
}
