import { proxyControlApi } from "../../../lib/control-api";

export async function PUT(request: Request) {
  return proxyControlApi(request, "/password");
}
