import { env } from "cloudflare:workers";
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
  if (!auth) return Response.redirect(new URL("/", request.url), 303);

  const service = new URL(request.url).searchParams.get("service");
  if (service !== "leave" && service !== "claims" && service !== "instructors") {
    return Response.json({ error: "不支援的系統" }, { status: 400 });
  }
  const access = await auth.db.prepare(
    "SELECT leave,claims,instructors FROM permissions WHERE email=?",
  ).bind(auth.session.email).first<{ leave: number; claims: number; instructors: number }>();
  if (!access?.[service]) return Response.json({ error: "你沒有此系統的存取權限" }, { status: 403 });
  if (service === "instructors") {
    const secret = (env as unknown as { DASHBOARD_SSO_SECRET?: string }).DASHBOARD_SSO_SECRET || "";
    const userId = dashboardUserIds[auth.session.email.toLowerCase()];
    if (!secret) return Response.json({ error: "講師看板登入交接尚未完成設定" }, { status: 503 });
    if (!userId) return Response.json({ error: "此帳號尚未開通講師看板" }, { status: 403 });
    const payload = base64Url(new TextEncoder().encode(JSON.stringify({
      userId,
      exp: Date.now() + 60 * 1000,
    })));
    const signature = await signHandoff(payload, secret);
    return Response.redirect(`${DASHBOARD_URL}/#auth=${payload}.${signature}`, 303);
  }
  const path = service === "claims" ? "/claims" : service === "leave" ? "/leave" : "";

  const secret = (env as unknown as { WAR_ROOM_SSO_SECRET?: string }).WAR_ROOM_SSO_SECRET || "";
  if (!secret) return Response.json({ error: "登入交接尚未完成設定" }, { status: 503 });

  const payload = base64Url(new TextEncoder().encode(JSON.stringify({
    email: auth.session.email,
    path,
    exp: Date.now() + 60 * 1000,
  })));
  const signature = await signHandoff(payload, secret);
  return Response.redirect(`${ADMIN_URL}/api/war-room-sso?auth=${payload}.${signature}`, 303);
}
