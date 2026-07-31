import { env } from "cloudflare:workers";

const DEFAULT_HASH = "f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311";

const seeds = [
  ["maggiefang@ai-zens.com", "Maggie 房美華", "管理員"],
  ["ritahsieh@ai-zens.com", "Rita 謝雨如", "管理員"],
  ["jerrychang@ai-zens.com", "Jerry 張廷", "管理員"],
  ["emilychang@ai-zens.com", "Emily 張芷瑄", "一般成員"],
  ["jameschien@ai-zens.com", "James 簡侑俊", "一般成員"],
  ["pearlchen@ai-zens.com", "Pearl 陳品樺", "一般成員"],
  ["blairpeng@ai-zens.com", "Blair 彭愛媛", "一般成員"],
  ["seanchang@ai-zens.com", "Sean 張智翔", "一般成員"],
  ["joannechen@ai-zens.com", "Joanne 陳靜宜", "一般成員"],
  ["catchen@ai-zens.com", "Cat 陳瑾虹", "一般成員"],
  ["garyshih@ai-zens.com", "Gary 石孟玄", "一般成員"],
  ["sinyunpan@ai-zens.com", "Sharlene 潘欣芸", "一般成員"],
] as const;

export async function ensureControlDb() {
  const db = env.DB;
  const statements = [
    db.prepare("CREATE TABLE IF NOT EXISTS members (email TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, password_hash TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS permissions (email TEXT PRIMARY KEY, leave INTEGER NOT NULL DEFAULT 1, claims INTEGER NOT NULL DEFAULT 1, instructors INTEGER NOT NULL DEFAULT 1)"),
    db.prepare("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL)"),
  ];
  for (const [email, name, role] of seeds) {
    statements.push(
      db.prepare("INSERT OR IGNORE INTO members (email,name,role,active,password_hash) VALUES (?,?,?,?,?)").bind(email, name, role, 1, DEFAULT_HASH),
      db.prepare("INSERT OR IGNORE INTO permissions (email,leave,claims,instructors) VALUES (?,?,?,?)").bind(email, 1, 1, 1),
    );
  }
  await db.batch(statements);
  return db;
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

export async function requireSession(request: Request, admin = false) {
  const db = await ensureControlDb();
  const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const cookie = request.headers.get("Cookie")?.match(/(?:^|;\s*)war_room_session=([^;]+)/)?.[1] ?? "";
  const token = bearer || cookie;
  const session = await db.prepare(
    "SELECT s.email,m.role,m.active FROM sessions s JOIN members m ON m.email=s.email WHERE s.token=? AND s.expires_at>?",
  ).bind(token, Date.now()).first<{ email: string; role: string; active: number }>();
  if (!session || !session.active || (admin && session.role !== "管理員")) return null;
  return { db, session };
}
