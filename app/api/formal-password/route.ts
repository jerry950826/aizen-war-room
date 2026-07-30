const FORMAL_PASSWORD_URL = "https://leaveflow-tw.jerry950826.chatgpt.site/api/password";

export async function PUT(request: Request) {
  const authorization = request.headers.get("Authorization") ?? "";
  const body = await request.text();
  const response = await fetch(FORMAL_PASSWORD_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: authorization },
    body,
  });

  const data = await response.json() as { error?: string };
  if (!response.ok) {
    return Response.json({ error: data.error ?? "正式密碼更新失敗" }, { status: response.status });
  }
  return Response.json({ ok: true });
}
