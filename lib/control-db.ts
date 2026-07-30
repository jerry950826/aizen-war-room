import { env } from "cloudflare:workers";

const DEFAULT_HASH = "f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311";

const seeds = [
  ["maggiefang@ai-zens.com", "Maggie 房美華", "管理員"],
  ["ritahsieh@ai-zens.com", "Rita 謝雨如", "管理員"],
  ["jerrychang@ai-zens.com", "Jerry 張廷", "管理員"],
  ["emilychang@ai-zens.com", "Emily 張芷瑄", "一般成員"],
  ["jameschien@ai-zens.com", "James 簡侑俊", "一般成員"],
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

export async function requireSession(request: Request, admin = false) {
  const db = await ensureControlDb();
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const session = await db.prepare(
    "SELECT s.email,m.role,m.active FROM sessions s JOIN members m ON m.email=s.email WHERE s.token=? AND s.expires_at>?",
  ).bind(token, Date.now()).first<{ email: string; role: string; active: number }>();
  if (!session || !session.active || (admin && session.role !== "管理員")) return null;
  return { db, session };
}
