import { proxyControlApi } from "../../../lib/control-api";

export async function GET(request: Request) {
  return proxyControlApi(request, "/session");
}

export async function DELETE(request: Request) {
  return proxyControlApi(request, "/session");
}
