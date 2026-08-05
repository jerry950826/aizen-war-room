import { env } from "cloudflare:workers";
import mysql, { type Connection } from "mysql2/promise";

type RuntimeEnv = {
  MYSQL_HOST?: string;
  MYSQL_PORT?: string;
  MYSQL_DATABASE?: string;
  MYSQL_USER?: string;
  MYSQL_PASSWORD?: string;
  MYSQL_SSL?: string;
};

function mysqlConfig() {
  const runtime = env as unknown as RuntimeEnv;
  const required = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"] as const;
  for (const key of required) {
    if (!runtime[key]) throw new Error(`Missing MySQL setting: ${key}`);
  }
  return {
    host: runtime.MYSQL_HOST,
    port: Number(runtime.MYSQL_PORT || 3306),
    database: runtime.MYSQL_DATABASE,
    user: runtime.MYSQL_USER,
    password: runtime.MYSQL_PASSWORD,
    ssl: /^(true|required|1)$/i.test(runtime.MYSQL_SSL || "") ? {} : undefined,
    charset: "UTF8MB4_UNICODE_CI",
    connectTimeout: 10_000,
    disableEval: true,
  };
}

export async function openControlDb() {
  return mysql.createConnection(mysqlConfig());
}

export function decodeDbText(value: string) {
  if (!/[\u0080-\u00ff]/.test(value)) return value;
  return new TextDecoder().decode(Uint8Array.from(value, (character) => character.charCodeAt(0)));
}

export function decodeHexText(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

export async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function signHandoff(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

export function sessionToken(request: Request) {
  const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const cookie = request.headers.get("Cookie")?.match(/(?:^|;\s*)war_room_session=([^;]+)/)?.[1] ?? "";
  return bearer || cookie;
}

export async function requireSession(request: Request, admin = false) {
  const db = await openControlDb();
  const token = sessionToken(request);
  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT s.member_id, m.email, HEX(m.role) AS role_hex, m.active
       FROM sessions s
       JOIN members m ON m.id = s.member_id
      WHERE s.token = ? AND s.expires_at > ?
      LIMIT 1`,
    [token, Date.now()],
  );
  const row = rows[0] as { member_id: string; email: string; role_hex: string; active: number } | undefined;
  const session = row ? { ...row, role: decodeHexText(row.role_hex) } : undefined;
  if (!session || !session.active || (admin && session.role !== "管理員")) {
    await db.end();
    return null;
  }
  return { db, session, token };
}

export async function audit(
  db: Connection,
  actorMemberId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details?: unknown,
) {
  await db.execute(
    "INSERT INTO audit_logs (actor_member_id,action,target_type,target_id,details_json) VALUES (?,?,?,?,?)",
    [actorMemberId, action, targetType, targetId, details === undefined ? null : JSON.stringify(details)],
  );
}
