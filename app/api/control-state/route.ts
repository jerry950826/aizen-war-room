import { proxyControlApi } from "../../../lib/control-api";

export async function GET(request: Request) {
  return proxyControlApi(request, "/control-state");
}

export async function POST(request: Request) {
  return proxyControlApi(request, "/control-state");
}
