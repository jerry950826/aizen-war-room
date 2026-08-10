interface Env {
  DB: D1Database;
  CONTROL_API_SECRET: string;
}

type Session = { email: string; role: string; active: number };
type PermissionInput = { leave: boolean; claims: boolean; instructors: boolean };

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sessionToken(request: Request) {
  const bearer = request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? "";
  const cookie = request.headers.get("Cookie")?.match(/(?:^|;\s*)war_room_session=([^;]+)/)?.[1] ?? "";
  return bearer || cookie;
}

async function requireSession(request: Request, env: Env, admin = false) {
  const token = sessionToken(request);
  const session = await env.DB.prepare(
    "SELECT s.email,m.role,m.active FROM sessions s JOIN members m ON m.email=s.email WHERE s.token=? AND s.expires_at>?",
  ).bind(token, Date.now()).first<Session>();
  if (!session || !session.active || (admin && session.role !== "管理員")) return null;
  return { token, session };
}

async function audit(env: Env, actorEmail: string | null, action: string, targetEmail: string | null, details?: unknown) {
  await env.DB.prepare(
    "INSERT INTO audit_logs (actor_email,action,target_email,details_json,created_at) VALUES (?,?,?,?,?)",
  ).bind(actorEmail, action, targetEmail, details === undefined ? null : JSON.stringify(details), Date.now()).run();
}

async function login(request: Request, env: Env) {
  const { email, password } = await request.json<{ email?: string; password?: string }>();
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  const member = await env.DB.prepare(
    "SELECT email,name,role,password_hash FROM members WHERE lower(email)=? AND active=1",
  ).bind(normalizedEmail).first<{ email: string; name: string; role: string; password_hash: string }>();
  if (!member || member.password_hash !== await sha256(password ?? "")) {
    return json({ error: "帳號或密碼不正確" }, 401);
  }
  const token = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(Date.now()),
    env.DB.prepare("INSERT INTO sessions (token,email,expires_at) VALUES (?,?,?)")
      .bind(token, member.email, Date.now() + 24 * 60 * 60 * 1000),
  ]);
  await audit(env, member.email, "session.login", member.email);
  return json(
    { token, email: member.email, name: member.name, role: member.role },
    200,
    { "Set-Cookie": `war_room_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400` },
  );
}

async function sessionRoute(request: Request, env: Env) {
  const auth = await requireSession(request, env);
  if (!auth) return json({ error: "登入已失效" }, 401);
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM sessions WHERE token=?").bind(auth.token).run();
    return json({ ok: true }, 200, { "Set-Cookie": "war_room_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
  }
  const member = await env.DB.prepare("SELECT email,name,role FROM members WHERE email=? AND active=1")
    .bind(auth.session.email).first();
  return member ? json(member) : json({ error: "帳號已停用" }, 401);
}

async function controlState(request: Request, env: Env) {
  const auth = await requireSession(request, env, request.method === "POST");
  if (!auth) return json({ error: request.method === "POST" ? "需要管理員權限" : "未登入" }, request.method === "POST" ? 403 : 401);
  if (request.method === "GET") {
    const [members, permissions, organization, departments, systems, systemPermissions] = await Promise.all([
      env.DB.prepare("SELECT email,name,role,active FROM members ORDER BY role DESC,name").all(),
      env.DB.prepare("SELECT email,leave,claims,instructors FROM permissions").all(),
      env.DB.prepare("SELECT lower(english_name) AS id,department,level,job_title AS title,english_name AS english,chinese_name AS name,phone,email,birthday FROM organization_profiles ORDER BY level,department,english_name").all(),
      env.DB.prepare("SELECT id,name,sort_order AS sortOrder,active FROM departments ORDER BY sort_order,name").all(),
      env.DB.prepare("SELECT id,name,category,description,launch_url AS launchUrl,color,icon,active,sort_order AS sortOrder FROM systems ORDER BY sort_order,name").all(),
      env.DB.prepare("SELECT email,system_id AS systemId,can_access AS canAccess,updated_by AS updatedBy,updated_at AS updatedAt FROM member_system_permissions").all(),
    ]);
    return json({
      members: members.results,
      permissions: permissions.results,
      organization: organization.results,
      departments: departments.results,
      systems: systems.results,
      systemPermissions: systemPermissions.results,
    });
  }

  const body = await request.json<{
    action: "add" | "edit" | "toggle" | "remove" | "permissions";
    email: string;
    name?: string;
    role?: "管理員" | "一般成員";
    newEmail?: string;
    active?: boolean;
    permissions?: PermissionInput;
  }>();
  const email = body.email.trim().toLowerCase();
  const name = body.name?.trim() ?? "";
  const validEmail = /^[^\s@]+@ai-zens\.com$/i;
  if (!validEmail.test(email)) return json({ error: "請使用有效的公司信箱" }, 400);

  if (body.action === "add") {
    if (!name) return json({ error: "請輸入姓名" }, 400);
    if (await env.DB.prepare("SELECT 1 AS found FROM members WHERE lower(email)=?").bind(email).first()) {
      return json({ error: "此公司信箱已在名單中" }, 409);
    }
    const english = name.split(" ")[0] || name;
    const chinese = name.split(" ").slice(1).join(" ") || name;
    await env.DB.batch([
      env.DB.prepare("INSERT INTO members (email,name,role,active,password_hash) VALUES (?,?,?,?,?)")
        .bind(email, name, "一般成員", 1, await sha256("Ab123456")),
      env.DB.prepare("INSERT INTO permissions (email,leave,claims,instructors) VALUES (?,?,?,?)").bind(email, 1, 1, 1),
      env.DB.prepare("INSERT INTO member_system_permissions (email,system_id,can_access,updated_by,updated_at) VALUES (?,?,?,?,?)")
        .bind(email, "leave", 1, auth.session.email, Date.now()),
      env.DB.prepare("INSERT INTO member_system_permissions (email,system_id,can_access,updated_by,updated_at) VALUES (?,?,?,?,?)")
        .bind(email, "claims", 1, auth.session.email, Date.now()),
      env.DB.prepare("INSERT INTO member_system_permissions (email,system_id,can_access,updated_by,updated_at) VALUES (?,?,?,?,?)")
        .bind(email, "instructors", 1, auth.session.email, Date.now()),
      env.DB.prepare("INSERT INTO organization_profiles (email,department,level,job_title,english_name,chinese_name) VALUES (?,?,?,?,?,?)")
        .bind(email, "待確認", 3, "待確認", english, chinese),
    ]);
  } else {
    const member = await env.DB.prepare("SELECT role FROM members WHERE email=?").bind(email).first<{ role: string }>();
    if (!member) return json({ error: "找不到此人員" }, 404);
    if (body.action === "edit") {
      const newEmail = body.newEmail?.trim().toLowerCase() ?? "";
      if (!name || !validEmail.test(newEmail)) return json({ error: "請填寫有效姓名與公司信箱" }, 400);
      if (body.role !== "管理員" && body.role !== "一般成員") return json({ error: "請選擇有效的系統角色" }, 400);
      if (member.role === "管理員" && body.role === "一般成員") {
        const otherAdmin = await env.DB.prepare("SELECT 1 AS found FROM members WHERE role='管理員' AND active=1 AND email!=? LIMIT 1").bind(email).first();
        if (!otherAdmin) return json({ error: "系統至少需要保留一位可登入的管理員" }, 400);
      }
      if (newEmail !== email && await env.DB.prepare("SELECT 1 AS found FROM members WHERE lower(email)=?").bind(newEmail).first()) {
        return json({ error: "新信箱已被其他人使用" }, 409);
      }
      const english = name.split(" ")[0] || name;
      const chinese = name.split(" ").slice(1).join(" ") || name;
      await env.DB.batch([
        env.DB.prepare("UPDATE members SET email=?,name=?,role=? WHERE email=?").bind(newEmail, name, body.role, email),
        env.DB.prepare("UPDATE permissions SET email=? WHERE email=?").bind(newEmail, email),
        env.DB.prepare("UPDATE sessions SET email=? WHERE email=?").bind(newEmail, email),
        env.DB.prepare("UPDATE organization_profiles SET email=?,english_name=?,chinese_name=? WHERE email=?").bind(newEmail, english, chinese, email),
      ]);
    } else if (body.action === "toggle") {
      if (!body.active && member.role === "管理員") {
        const otherAdmin = await env.DB.prepare("SELECT 1 AS found FROM members WHERE role='管理員' AND active=1 AND email!=? LIMIT 1").bind(email).first();
        if (!otherAdmin) return json({ error: "系統至少需要保留一位可登入的管理員" }, 400);
      }
      await env.DB.prepare("UPDATE members SET active=? WHERE email=?").bind(body.active ? 1 : 0, email).run();
    } else if (body.action === "remove") {
      if (member.role === "管理員") return json({ error: "管理員不可直接移除，請先調整角色" }, 400);
      await env.DB.batch([
        env.DB.prepare("DELETE FROM member_system_permissions WHERE email=?").bind(email),
        env.DB.prepare("DELETE FROM permissions WHERE email=?").bind(email),
        env.DB.prepare("DELETE FROM organization_profiles WHERE email=?").bind(email),
        env.DB.prepare("DELETE FROM sessions WHERE email=?").bind(email),
        env.DB.prepare("DELETE FROM members WHERE email=?").bind(email),
      ]);
    } else if (body.action === "permissions" && body.permissions) {
      const updatedAt = Date.now();
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO permissions (email,leave,claims,instructors) VALUES (?,?,?,?) ON CONFLICT(email) DO UPDATE SET leave=excluded.leave,claims=excluded.claims,instructors=excluded.instructors",
        ).bind(email, body.permissions.leave ? 1 : 0, body.permissions.claims ? 1 : 0, body.permissions.instructors ? 1 : 0),
        env.DB.prepare(
          "INSERT INTO member_system_permissions (email,system_id,can_access,updated_by,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(email,system_id) DO UPDATE SET can_access=excluded.can_access,updated_by=excluded.updated_by,updated_at=excluded.updated_at",
        ).bind(email, "leave", body.permissions.leave ? 1 : 0, auth.session.email, updatedAt),
        env.DB.prepare(
          "INSERT INTO member_system_permissions (email,system_id,can_access,updated_by,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(email,system_id) DO UPDATE SET can_access=excluded.can_access,updated_by=excluded.updated_by,updated_at=excluded.updated_at",
        ).bind(email, "claims", body.permissions.claims ? 1 : 0, auth.session.email, updatedAt),
        env.DB.prepare(
          "INSERT INTO member_system_permissions (email,system_id,can_access,updated_by,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(email,system_id) DO UPDATE SET can_access=excluded.can_access,updated_by=excluded.updated_by,updated_at=excluded.updated_at",
        ).bind(email, "instructors", body.permissions.instructors ? 1 : 0, auth.session.email, updatedAt),
      ]);
    }
  }
  await audit(env, auth.session.email, `member.${body.action}`, email, body.permissions);
  return json({ ok: true });
}

async function passwordRoute(request: Request, env: Env) {
  const auth = await requireSession(request, env);
  if (!auth) return json({ error: "登入已逾時，請重新登入。" }, 401);
  const { currentPassword, newPassword } = await request.json<{ currentPassword?: string; newPassword?: string }>();
  if (!newPassword || newPassword.length < 8) return json({ error: "新密碼至少需要 8 個字元。" }, 400);
  const member = await env.DB.prepare("SELECT password_hash FROM members WHERE email=?").bind(auth.session.email)
    .first<{ password_hash: string }>();
  if (!member || member.password_hash !== await sha256(currentPassword ?? "")) return json({ error: "目前密碼不正確。" }, 400);
  await env.DB.batch([
    env.DB.prepare("UPDATE members SET password_hash=? WHERE email=?").bind(await sha256(newPassword), auth.session.email),
    env.DB.prepare("DELETE FROM sessions WHERE email=? AND token!=?").bind(auth.session.email, auth.token),
  ]);
  await audit(env, auth.session.email, "password.change", auth.session.email);
  return json({ ok: true });
}

async function authorize(request: Request, env: Env) {
  const auth = await requireSession(request, env);
  if (!auth) return json({ error: "未登入" }, 401);
  const service = new URL(request.url).searchParams.get("service");
  if (service !== "leave" && service !== "claims" && service !== "instructors") return json({ error: "不支援的系統" }, 400);
  const access = await env.DB.prepare(
    "SELECT COALESCE((SELECT can_access FROM member_system_permissions WHERE email=? AND system_id=?),(SELECT CASE ? WHEN 'leave' THEN leave WHEN 'claims' THEN claims WHEN 'instructors' THEN instructors ELSE 0 END FROM permissions WHERE email=?),0) AS canAccess",
  ).bind(auth.session.email, service, service, auth.session.email).first<{ canAccess: number }>();
  if (!access?.canAccess) return json({ error: "你沒有此系統的存取權限" }, 403);
  return json({ email: auth.session.email });
}

function instructorToken(request: Request) {
  return request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? "";
}

async function instructorSessions(request: Request, env: Env) {
  const token = instructorToken(request);
  if (request.method === "POST") {
    const body = await request.json<{ token?: string; userId?: string }>();
    if (!body.token || !body.userId) return json({ error: "Invalid session" }, 400);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM instructor_sessions WHERE expires_at<=?").bind(Date.now()),
      env.DB.prepare("INSERT INTO instructor_sessions (token,user_id,expires_at) VALUES (?,?,?) ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id,expires_at=excluded.expires_at")
        .bind(body.token, body.userId, Date.now() + 24 * 60 * 60 * 1000),
    ]);
    return json({ ok: true });
  }
  if (!token) return json({ error: "Unauthorized" }, 401);
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM instructor_sessions WHERE token=?").bind(token).run();
    return json({ ok: true });
  }
  const row = await env.DB.prepare("SELECT user_id AS userId FROM instructor_sessions WHERE token=? AND expires_at>?")
    .bind(token, Date.now()).first<{ userId: string }>();
  return row ? json(row) : json({ error: "Unauthorized" }, 401);
}

async function instructorStore(request: Request, env: Env) {
  if (request.method === "GET") {
    const [meta, teachers, cohorts, events, templates, auditLogs] = await Promise.all([
      env.DB.prepare("SELECT updated_at AS updatedAt FROM instructor_app_store WHERE key='schedule'").first<{ updatedAt: string }>(),
      env.DB.prepare("SELECT id,name,email,phone FROM instructor_teachers ORDER BY sort_order").all(),
      env.DB.prepare(`SELECT id,cohort,client,location,city,district,village,member_count AS memberCount,notes
        FROM instructor_cohort_records ORDER BY sort_order`).all(),
      env.DB.prepare(`SELECT id,series_id AS seriesId,cohort,client,title,start_at AS start,end_at AS end,
        teacher_id AS teacherId,teacher_name AS teacherName,teacher_email AS teacherEmail,
        teacher_phone AS teacherPhone,location,status,notes FROM instructor_course_events ORDER BY sort_order`).all(),
      env.DB.prepare("SELECT id,name,subject,body FROM instructor_message_templates ORDER BY sort_order").all(),
      env.DB.prepare("SELECT id,action,detail,occurred_at AS at FROM instructor_schedule_audit_logs ORDER BY sort_order").all(),
    ]);
    const updatedAt = meta?.updatedAt ?? new Date(0).toISOString();
    const value = {
      teachers: teachers.results,
      cohortRecords: cohorts.results,
      events: events.results.map((event) => ({
        ...event,
        teacher: {
          id: event.teacherId,
          name: event.teacherName,
          email: event.teacherEmail,
          phone: event.teacherPhone,
        },
        teacherId: undefined,
        teacherName: undefined,
        teacherEmail: undefined,
        teacherPhone: undefined,
      })),
      templates: templates.results,
      auditLogs: auditLogs.results,
      lastUpdatedAt: updatedAt,
    };
    return json({ value: JSON.stringify(value), updatedAt });
  }
  const body = await request.json<{ value?: string; updatedAt?: string }>();
  if (!body.value) return json({ error: "Invalid store" }, 400);
  try {
    JSON.parse(body.value);
  } catch {
    return json({ error: "Invalid store JSON" }, 400);
  }
  const updatedAt = body.updatedAt || new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO instructor_app_store (key,value,updated_at) VALUES ('schedule',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at")
      .bind(body.value, updatedAt),
    env.DB.prepare("DELETE FROM instructor_teachers"),
    env.DB.prepare("DELETE FROM instructor_cohort_records"),
    env.DB.prepare("DELETE FROM instructor_course_events"),
    env.DB.prepare("DELETE FROM instructor_message_templates"),
    env.DB.prepare("DELETE FROM instructor_schedule_audit_logs"),
    env.DB.prepare(`INSERT INTO instructor_teachers (id,name,email,phone,updated_at,sort_order)
      SELECT json_extract(value,'$.id'),COALESCE(json_extract(value,'$.name'),''),
        COALESCE(json_extract(value,'$.email'),''),COALESCE(json_extract(value,'$.phone'),''),?,CAST(key AS INTEGER)
      FROM json_each(?,'$.teachers')`).bind(updatedAt, body.value),
    env.DB.prepare(`INSERT INTO instructor_cohort_records
      (id,cohort,client,location,city,district,village,member_count,notes,updated_at,sort_order)
      SELECT json_extract(value,'$.id'),COALESCE(json_extract(value,'$.cohort'),0),
        COALESCE(json_extract(value,'$.client'),''),COALESCE(json_extract(value,'$.location'),''),
        COALESCE(json_extract(value,'$.city'),''),COALESCE(json_extract(value,'$.district'),''),
        COALESCE(json_extract(value,'$.village'),''),COALESCE(json_extract(value,'$.memberCount'),0),
        COALESCE(json_extract(value,'$.notes'),''),?,CAST(key AS INTEGER)
      FROM json_each(?,'$.cohortRecords')`).bind(updatedAt, body.value),
    env.DB.prepare(`INSERT INTO instructor_course_events
      (id,series_id,cohort,client,title,start_at,end_at,teacher_id,teacher_name,teacher_email,
       teacher_phone,location,status,notes,updated_at,sort_order)
      SELECT json_extract(value,'$.id'),COALESCE(json_extract(value,'$.seriesId'),''),
        COALESCE(json_extract(value,'$.cohort'),0),COALESCE(json_extract(value,'$.client'),''),
        COALESCE(json_extract(value,'$.title'),''),COALESCE(json_extract(value,'$.start'),''),
        COALESCE(json_extract(value,'$.end'),''),COALESCE(json_extract(value,'$.teacher.id'),''),
        COALESCE(json_extract(value,'$.teacher.name'),''),COALESCE(json_extract(value,'$.teacher.email'),''),
        COALESCE(json_extract(value,'$.teacher.phone'),''),COALESCE(json_extract(value,'$.location'),''),
        COALESCE(json_extract(value,'$.status'),''),COALESCE(json_extract(value,'$.notes'),''),?,CAST(key AS INTEGER)
      FROM json_each(?,'$.events')`).bind(updatedAt, body.value),
    env.DB.prepare(`INSERT INTO instructor_message_templates (id,name,subject,body,updated_at,sort_order)
      SELECT json_extract(value,'$.id'),COALESCE(json_extract(value,'$.name'),''),
        COALESCE(json_extract(value,'$.subject'),''),COALESCE(json_extract(value,'$.body'),''),?,CAST(key AS INTEGER)
      FROM json_each(?,'$.templates')`).bind(updatedAt, body.value),
    env.DB.prepare(`INSERT INTO instructor_schedule_audit_logs (id,action,detail,occurred_at,sort_order)
      SELECT json_extract(value,'$.id'),COALESCE(json_extract(value,'$.action'),''),
        COALESCE(json_extract(value,'$.detail'),''),COALESCE(json_extract(value,'$.at'),''),CAST(key AS INTEGER)
      FROM json_each(?,'$.auditLogs')`).bind(body.value),
  ]);
  return json({ ok: true });
}

async function instructorFeedback(request: Request, env: Env) {
  if (request.method === "GET") {
    const courseId = new URL(request.url).searchParams.get("course_id");
    const result = courseId
      ? await env.DB.prepare("SELECT * FROM instructor_feedback WHERE course_id=? ORDER BY created_at DESC").bind(courseId).all()
      : await env.DB.prepare("SELECT * FROM instructor_feedback ORDER BY created_at DESC LIMIT 200").all();
    return json({ feedback: result.results });
  }
  const body = await request.json<Record<string, unknown>>();
  await env.DB.prepare(`INSERT INTO instructor_feedback (
    id,course_id,course_title,cohort,course_start,teacher_id,teacher_name,teacher_email,
    member_id,member_name,member_email,reflection,observation,follow_up,created_by,created_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    body.id, body.courseId, body.courseTitle, Number(body.cohort), body.courseStart,
    body.teacherId, body.teacherName, body.teacherEmail || "", body.memberId, body.memberName,
    body.memberEmail, body.reflection, body.observation || "", body.followUp || "", body.createdBy, body.createdAt,
  ).run();
  return json({ id: body.id, createdAt: body.createdAt }, 201);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.CONTROL_API_SECRET || request.headers.get("X-Control-Api-Secret") !== env.CONTROL_API_SECRET) {
      return json({ error: "Forbidden" }, 403);
    }
    const { pathname } = new URL(request.url);
    if (pathname === "/health") return json({ ok: true, database: "aizen-warroom" });
    if (pathname === "/login" && request.method === "POST") return login(request, env);
    if (pathname === "/session" && (request.method === "GET" || request.method === "DELETE")) return sessionRoute(request, env);
    if (pathname === "/control-state" && (request.method === "GET" || request.method === "POST")) return controlState(request, env);
    if (pathname === "/password" && request.method === "PUT") return passwordRoute(request, env);
    if (pathname === "/authorize" && request.method === "GET") return authorize(request, env);
    if (pathname === "/instructor/sessions" && ["GET", "POST", "DELETE"].includes(request.method)) return instructorSessions(request, env);
    if (pathname === "/instructor/store" && ["GET", "PUT"].includes(request.method)) return instructorStore(request, env);
    if (pathname === "/instructor/feedback" && ["GET", "POST"].includes(request.method)) return instructorFeedback(request, env);
    return json({ error: "Not found" }, 404);
  },
};

export default worker;
