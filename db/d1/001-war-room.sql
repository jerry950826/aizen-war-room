CREATE TABLE IF NOT EXISTS members (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('管理員', '一般成員')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  email TEXT PRIMARY KEY,
  leave INTEGER NOT NULL DEFAULT 1 CHECK (leave IN (0, 1)),
  claims INTEGER NOT NULL DEFAULT 1 CHECK (claims IN (0, 1)),
  instructors INTEGER NOT NULL DEFAULT 1 CHECK (instructors IN (0, 1))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS organization_profiles (
  email TEXT PRIMARY KEY,
  department TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 3,
  job_title TEXT NOT NULL,
  english_name TEXT NOT NULL,
  chinese_name TEXT NOT NULL,
  phone TEXT,
  birthday TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_email TEXT,
  details_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_active_role ON members(active, role);
CREATE INDEX IF NOT EXISTS idx_sessions_email_expires ON sessions(email, expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

INSERT OR IGNORE INTO members (email, name, role, active, password_hash) VALUES
  ('maggiefang@ai-zens.com', 'Maggie 房美華', '管理員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('ritahsieh@ai-zens.com', 'Rita 謝雨如', '管理員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('jerrychang@ai-zens.com', 'Jerry 張廷', '管理員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('emilychang@ai-zens.com', 'Emily 張芷瑄', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('jameschien@ai-zens.com', 'James 簡侑俊', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('pearlchen@ai-zens.com', 'Pearl 陳品樺', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('blairpeng@ai-zens.com', 'Blair 彭愛媛', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('seanchang@ai-zens.com', 'Sean 張智翔', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('joannechen@ai-zens.com', 'Joanne 陳靜宜', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('catchen@ai-zens.com', 'Cat 陳瑾虹', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('garyshih@ai-zens.com', 'Gary 石孟玄', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('sinyunpan@ai-zens.com', 'Sharlene 潘欣芸', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311');

INSERT OR IGNORE INTO permissions (email, leave, claims, instructors)
SELECT email, 1, 1, 1 FROM members;

INSERT OR IGNORE INTO organization_profiles
  (email, department, level, job_title, english_name, chinese_name, phone, birthday) VALUES
  ('maggiefang@ai-zens.com', '總經理室', 1, '總經理', 'Maggie', '房美華', '0937-138902', '12-01'),
  ('emilychang@ai-zens.com', '技術部', 2, '前端工程師', 'Emily', '張芷瑄', '0970-672188', '06-10'),
  ('jerrychang@ai-zens.com', '技術部', 2, '前端工程師', 'Jerry', '張廷', '0975-750220', '08-26'),
  ('jameschien@ai-zens.com', '技術部', 2, '後端工程師', 'James', '簡侑俊', '0968-813952', '01-22'),
  ('pearlchen@ai-zens.com', '設計部', 2, '產品設計師', 'Pearl', '陳品樺', '0979-635252', '08-01'),
  ('blairpeng@ai-zens.com', '設計部', 2, '數位設計師', 'Blair', '彭愛媛', '0988-506226', '07-12'),
  ('seanchang@ai-zens.com', '業務部', 2, '資深業務經理', 'Sean', '張智翔', '0985-699592', NULL),
  ('joannechen@ai-zens.com', '業務部', 2, '資深業務經理', 'Joanne', '陳靜宜', '0912-582956', '06-27'),
  ('catchen@ai-zens.com', '行銷部', 2, '行銷主任', 'Cat', '陳瑾虹', '0972-866530', '02-04'),
  ('garyshih@ai-zens.com', '行銷部', 3, '行銷專員', 'Gary', '石孟玄', '0912-818915', '07-23'),
  ('sinyunpan@ai-zens.com', '行銷部', 3, '內容行銷專員', 'Sharlene', '潘欣芸', '0958-031793', '03-17'),
  ('ritahsieh@ai-zens.com', '企劃部', 2, '企劃兼行政', 'Rita', '謝雨如', '0927-765167', '10-10');

INSERT INTO audit_logs (actor_email, action, target_email, details_json, created_at)
SELECT NULL, 'database.initialize', NULL, '{"source":"aizen-war-room"}', unixepoch() * 1000
WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE action = 'database.initialize');

PRAGMA optimize;
