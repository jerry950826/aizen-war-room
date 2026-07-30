import { env } from "cloudflare:workers";
import { base64Url, requireSession, signHandoff } from "../../../lib/control-db";

const ADMIN_URL = "https://leaveflow-tw.jerry950826.chatgpt.site";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (!auth) return Response.redirect(new URL("/", request.url), 303);

  const service = new URL(request.url).searchParams.get("service");
  const path = service === "claims" ? "/claims" : service === "leave" ? "/leave" : "";
  if (!path) return Response.json({ error: "不支援的系統" }, { status: 400 });

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
