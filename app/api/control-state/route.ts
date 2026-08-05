import mysql from "mysql2/promise";
import { audit, decodeHexText, requireSession, sha256 } from "../../../lib/control-db";

type PermissionInput = { leave: boolean; claims: boolean; instructors: boolean };

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (!auth) return Response.json({ error: "未登入" }, { status: 401 });
  try {
    const [members] = await auth.db.query<mysql.RowDataPacket[]>(
      "SELECT email,HEX(display_name) AS name_hex,HEX(role) AS role_hex,active FROM members ORDER BY role DESC,display_name",
    );
    const [permissions] = await auth.db.query<mysql.RowDataPacket[]>(`
      SELECT m.email,
             MAX(CASE WHEN p.system_id='leave' THEN p.can_access ELSE 0 END) AS \`leave\`,
             MAX(CASE WHEN p.system_id='claims' THEN p.can_access ELSE 0 END) AS \`claims\`,
             MAX(CASE WHEN p.system_id='instructors' THEN p.can_access ELSE 0 END) AS \`instructors\`
        FROM members m
        LEFT JOIN member_system_permissions p ON p.member_id=m.id
       GROUP BY m.id,m.email
    `);
    return Response.json({
      members: members.map((member) => ({
        ...member,
        name: decodeHexText(String(member.name_hex)),
        role: decodeHexText(String(member.role_hex)),
        name_hex: undefined,
        role_hex: undefined,
      })),
      permissions,
    });
  } finally {
    await auth.db.end();
  }
}

export async function POST(request: Request) {
  const auth = await requireSession(request, true);
  if (!auth) return Response.json({ error: "需要管理員權限" }, { status: 403 });
  try {
    const body = await request.json() as {
      action: "add" | "edit" | "toggle" | "remove" | "permissions";
      email: string;
      name?: string;
      role?: "管理員" | "一般成員";
      newEmail?: string;
      active?: boolean;
      permissions?: PermissionInput;
    };
    const email = body.email.trim().toLowerCase();
    const name = body.name?.trim() ?? "";
    const validEmail = /^[^\s@]+@ai-zens\.com$/i;
    if (!validEmail.test(email)) return Response.json({ error: "請使用有效的公司信箱" }, { status: 400 });

    const [memberRows] = await auth.db.execute<mysql.RowDataPacket[]>(
      "SELECT id,HEX(role) AS role_hex FROM members WHERE lower(email)=? LIMIT 1",
      [email],
    );
    const memberRow = memberRows[0] as { id: string; role_hex: string } | undefined;
    const member = memberRow ? { ...memberRow, role: decodeHexText(memberRow.role_hex) } : undefined;

    if (body.action === "add") {
      if (!name) return Response.json({ error: "請輸入姓名" }, { status: 400 });
      if (member) return Response.json({ error: "此公司信箱已在名單中" }, { status: 409 });
      const baseId = email.split("@")[0].replace(/[^a-z0-9]/g, "").slice(0, 24) || crypto.randomUUID().slice(0, 8);
      const id = `${baseId}-${crypto.randomUUID().slice(0, 6)}`;
      const parts = name.split(/\s+/);
      const englishName = parts[0] || name;
      const chineseName = parts.slice(1).join(" ") || name;
      await auth.db.beginTransaction();
      await auth.db.execute(
        `INSERT INTO members
          (id,email,display_name,english_name,chinese_name,department_id,job_title,organization_level,role,active,password_hash)
         VALUES (?,?,?,?,?,'planning','公司成員',3,'一般成員',1,?)`,
        [id, email, name, englishName, chineseName, await sha256("Ab123456")],
      );
      for (const systemId of ["leave", "claims", "instructors"]) {
        await auth.db.execute(
          "INSERT INTO member_system_permissions (member_id,system_id,can_access,updated_by) VALUES (?,?,1,?)",
          [id, systemId, auth.session.member_id],
        );
      }
      await audit(auth.db, auth.session.member_id, "member.add", "member", id, { email, name });
      await auth.db.commit();
    } else if (body.action === "edit") {
      const newEmail = body.newEmail?.trim().toLowerCase() ?? "";
      const newRole = body.role;
      if (!member) return Response.json({ error: "找不到此人員" }, { status: 404 });
      if (!name) return Response.json({ error: "請輸入姓名" }, { status: 400 });
      if (!validEmail.test(newEmail)) return Response.json({ error: "請使用有效的公司信箱" }, { status: 400 });
      if (newRole !== "管理員" && newRole !== "一般成員") return Response.json({ error: "請選擇有效的系統角色" }, { status: 400 });
      if (member.role === "管理員" && newRole === "一般成員") {
        const [admins] = await auth.db.execute<mysql.RowDataPacket[]>(
          "SELECT id FROM members WHERE role='管理員' AND active=1 AND id!=? LIMIT 1",
          [member.id],
        );
        if (!admins[0]) return Response.json({ error: "系統至少需要保留一位可登入的管理員" }, { status: 400 });
      }
      if (newEmail !== email) {
        const [duplicates] = await auth.db.execute<mysql.RowDataPacket[]>("SELECT id FROM members WHERE lower(email)=? LIMIT 1", [newEmail]);
        if (duplicates[0]) return Response.json({ error: "新信箱已被其他人使用" }, { status: 409 });
      }
      await auth.db.execute("UPDATE members SET email=?,display_name=?,role=? WHERE id=?", [newEmail, name, newRole, member.id]);
      await audit(auth.db, auth.session.member_id, "member.edit", "member", member.id, { email: newEmail, name, role: newRole });
    } else if (body.action === "toggle") {
      if (!member) return Response.json({ error: "找不到此人員" }, { status: 404 });
      if (!body.active && member.role === "管理員") {
        const [admins] = await auth.db.execute<mysql.RowDataPacket[]>(
          "SELECT id FROM members WHERE role='管理員' AND active=1 AND id!=? LIMIT 1",
          [member.id],
        );
        if (!admins[0]) return Response.json({ error: "系統至少需要保留一位可登入的管理員" }, { status: 400 });
      }
      await auth.db.execute("UPDATE members SET active=? WHERE id=?", [body.active ? 1 : 0, member.id]);
      await audit(auth.db, auth.session.member_id, "member.toggle", "member", member.id, { active: Boolean(body.active) });
    } else if (body.action === "remove") {
      if (!member) return Response.json({ error: "找不到此人員" }, { status: 404 });
      if (member.role === "管理員") return Response.json({ error: "管理員不可直接移除，請先調整角色" }, { status: 400 });
      await audit(auth.db, auth.session.member_id, "member.remove", "member", member.id, { email });
      await auth.db.execute("DELETE FROM members WHERE id=?", [member.id]);
    } else if (body.action === "permissions" && body.permissions) {
      if (!member) return Response.json({ error: "找不到此人員" }, { status: 404 });
      for (const [systemId, canAccess] of Object.entries(body.permissions)) {
        await auth.db.execute(
          `INSERT INTO member_system_permissions (member_id,system_id,can_access,updated_by)
           VALUES (?,?,?,?)
           ON DUPLICATE KEY UPDATE can_access=VALUES(can_access),updated_by=VALUES(updated_by)`,
          [member.id, systemId, canAccess ? 1 : 0, auth.session.member_id],
        );
      }
      await audit(auth.db, auth.session.member_id, "permission.update", "member", member.id, body.permissions);
    }
    return Response.json({ ok: true });
  } catch (error) {
    try { await auth.db.rollback(); } catch { /* no active transaction */ }
    throw error;
  } finally {
    await auth.db.end();
  }
}
