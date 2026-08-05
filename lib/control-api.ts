import { env } from "cloudflare:workers";

type ControlApiEnv = {
  CONTROL_API_URL?: string;
  CONTROL_API_SECRET?: string;
};

export async function controlApiRequest(request: Request, path: string, method = request.method) {
  const runtime = env as unknown as ControlApiEnv;
  if (!runtime.CONTROL_API_URL || !runtime.CONTROL_API_SECRET) {
    return Response.json({ error: "戰情室資料服務尚未完成設定" }, { status: 503 });
  }
  const headers = new Headers();
  headers.set("X-Control-Api-Secret", runtime.CONTROL_API_SECRET);
  for (const name of ["Cookie", "Content-Type"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const authorization = request.headers.get("Authorization");
  if (authorization && /^Bearer\s+\S+/i.test(authorization)) {
    headers.set("Authorization", authorization);
  }
  const response = await fetch(new URL(path, runtime.CONTROL_API_URL), {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer(),
  });
  return new Response(response.body, { status: response.status, headers: response.headers });
}

export async function proxyControlApi(request: Request, path: string) {
  return controlApiRequest(request, path);
}
