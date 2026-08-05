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
    const [members, permissions, organization] = await Promise.all([
      env.DB.prepare("SELECT email,name,role,active FROM members ORDER BY role DESC,name").all(),
      env.DB.prepare("SELECT email,leave,claims,instructors FROM permissions").all(),
      env.DB.prepare("SELECT lower(english_name) AS id,department,level,job_title AS title,english_name AS english,chinese_name AS name,phone,email,birthday FROM organization_profiles ORDER BY level,department,english_name").all(),
    ]);
    return json({ members: members.results, permissions: permissions.results, organization: organization.results });
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
        env.DB.prepare("DELETE FROM permissions WHERE email=?").bind(email),
        env.DB.prepare("DELETE FROM organization_profiles WHERE email=?").bind(email),
        env.DB.prepare("DELETE FROM sessions WHERE email=?").bind(email),
        env.DB.prepare("DELETE FROM members WHERE email=?").bind(email),
      ]);
    } else if (body.action === "permissions" && body.permissions) {
      await env.DB.prepare(
        "INSERT INTO permissions (email,leave,claims,instructors) VALUES (?,?,?,?) ON CONFLICT(email) DO UPDATE SET leave=excluded.leave,claims=excluded.claims,instructors=excluded.instructors",
      ).bind(email, body.permissions.leave ? 1 : 0, body.permissions.claims ? 1 : 0, body.permissions.instructors ? 1 : 0).run();
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
  const access = await env.DB.prepare("SELECT leave,claims,instructors FROM permissions WHERE email=?")
    .bind(auth.session.email).first<Record<string, number>>();
  if (!access?.[service]) return json({ error: "你沒有此系統的存取權限" }, 403);
  return json({ email: auth.session.email });
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
    return json({ error: "Not found" }, 404);
  },
};

export default worker;
