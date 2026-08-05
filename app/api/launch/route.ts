import { env } from "cloudflare:workers";
import mysql from "mysql2/promise";
import { base64Url, requireSession, signHandoff } from "../../../lib/control-db";

const ADMIN_URL = "https://leaveflow-tw.jerry950826.chatgpt.site";
const DASHBOARD_URL = "https://aizen-instructor-dashboard.jerry950826.chatgpt.site";
const dashboardUserIds: Record<string, string> = {
  "maggiefang@ai-zens.com": "maggie",
  "emilychang@ai-zens.com": "emily",
  "jerrychang@ai-zens.com": "jerry",
  "jameschien@ai-zens.com": "james",
  "pearlchen@ai-zens.com": "pearl",
  "blairpeng@ai-zens.com": "blair",
  "seanchang@ai-zens.com": "sean",
  "joannechen@ai-zens.com": "joanne",
  "catchen@ai-zens.com": "cat",
  "garyshih@ai-zens.com": "gary",
  "sinyunpan@ai-zens.com": "sharlene",
  "ritahsieh@ai-zens.com": "rita",
};

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (!auth) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("returnTo", new URL(request.url).searchParams.get("service") || "dashboard");
    return Response.redirect(loginUrl, 303);
  }

  const service = new URL(request.url).searchParams.get("service");
  if (service !== "leave" && service !== "claims" && service !== "instructors") {
    await auth.db.end();
    return Response.json({ error: "不支援的系統" }, { status: 400 });
  }
  const [permissionRows] = await auth.db.execute<mysql.RowDataPacket[]>(
    "SELECT can_access FROM member_system_permissions WHERE member_id=? AND system_id=? LIMIT 1",
    [auth.session.member_id, service],
  );
  const access = permissionRows[0] as { can_access: number } | undefined;
  if (!access?.can_access) {
    await auth.db.end();
    return Response.json({ error: "你沒有此系統的存取權限" }, { status: 403 });
  }
  if (service === "instructors") {
    const secret = (env as unknown as { DASHBOARD_SSO_SECRET?: string }).DASHBOARD_SSO_SECRET || "";
    const userId = dashboardUserIds[auth.session.email.toLowerCase()];
    if (!secret) { await auth.db.end(); return Response.json({ error: "講師看板登入交接尚未完成設定" }, { status: 503 }); }
    if (!userId) { await auth.db.end(); return Response.json({ error: "此帳號尚未開通講師看板" }, { status: 403 }); }
    const payload = base64Url(new TextEncoder().encode(JSON.stringify({
      userId,
      exp: Date.now() + 60 * 1000,
    })));
    const signature = await signHandoff(payload, secret);
    await auth.db.end();
    return Response.redirect(`${DASHBOARD_URL}/#auth=${payload}.${signature}`, 303);
  }
  const path = service === "claims" ? "/claims" : service === "leave" ? "/leave" : "";

  const secret = (env as unknown as { WAR_ROOM_SSO_SECRET?: string }).WAR_ROOM_SSO_SECRET || "";
  if (!secret) { await auth.db.end(); return Response.json({ error: "登入交接尚未完成設定" }, { status: 503 }); }

  const payload = base64Url(new TextEncoder().encode(JSON.stringify({
    email: auth.session.email,
    path,
    exp: Date.now() + 60 * 1000,
  })));
  const signature = await signHandoff(payload, secret);
  await auth.db.end();
  return Response.redirect(`${ADMIN_URL}/api/war-room-sso?auth=${payload}.${signature}`, 303);
}
