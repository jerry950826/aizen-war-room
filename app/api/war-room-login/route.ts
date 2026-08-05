import { proxyControlApi } from "../../../lib/control-api";

export async function POST(request: Request) {
  return proxyControlApi(request, "/login");
}
