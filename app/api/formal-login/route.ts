import { env } from "cloudflare:workers";

const FORMAL_LOGIN_URL = "https://leaveflow-tw.jerry950826.chatgpt.site/api/login";

export async function POST(request: Request) {
  const { email, password } = await request.json() as { email?: string; password?: string };
  const bypassToken = (env as unknown as { FORMAL_SITE_BYPASS_TOKEN?: string }).FORMAL_SITE_BYPASS_TOKEN ?? "";
  const response = await fetch(FORMAL_LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(bypassToken ? { "OAI-Sites-Authorization": `Bearer ${bypassToken}` } : {}),
    },
    body: JSON.stringify({ email: email?.trim() ?? "", password: password ?? "" }),
  });

  if (!response.ok) {
    return Response.json({ error: "正式帳號或密碼不正確" }, { status: 401 });
  }

  const data = await response.json() as { userId: string; token: string };
  return Response.json({ userId: data.userId, token: data.token });
}
