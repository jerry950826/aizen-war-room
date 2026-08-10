PRAGMA foreign_keys = ON;

-- 公司部門主檔：統一組織圖、成員資料與各業務系統使用的部門名稱。
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 業務系統主檔：戰情室卡片與權限選項不再寫死於前端。
CREATE TABLE IF NOT EXISTS systems (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  launch_url TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 成員系統權限：以一人一系統一列取代 permissions 的固定欄位。
CREATE TABLE IF NOT EXISTS member_system_permissions (
  email TEXT NOT NULL,
  system_id TEXT NOT NULL,
  can_access INTEGER NOT NULL DEFAULT 1 CHECK (can_access IN (0, 1)),
  updated_by TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (email, system_id),
  FOREIGN KEY (email) REFERENCES members(email) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (system_id) REFERENCES systems(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_departments_active_sort
ON departments(active, sort_order);

CREATE INDEX IF NOT EXISTS idx_systems_active_sort
ON systems(active, sort_order);

CREATE INDEX IF NOT EXISTS idx_member_system_permissions_system_access
ON member_system_permissions(system_id, can_access);

INSERT OR IGNORE INTO departments (id, name, sort_order, active, created_at, updated_at) VALUES
  ('executive', '經營管理', 10, 1, unixepoch() * 1000, unixepoch() * 1000),
  ('engineering', '技術部', 20, 1, unixepoch() * 1000, unixepoch() * 1000),
  ('design', '設計部', 30, 1, unixepoch() * 1000, unixepoch() * 1000),
  ('sales', '業務部', 40, 1, unixepoch() * 1000, unixepoch() * 1000),
  ('marketing', '行銷部', 50, 1, unixepoch() * 1000, unixepoch() * 1000),
  ('planning', '企劃部', 60, 1, unixepoch() * 1000, unixepoch() * 1000);

INSERT OR IGNORE INTO systems (id, name, category, description, launch_url, color, icon, active, sort_order, created_at, updated_at) VALUES
  ('leave', '請假系統', '人事作業', '假單申請、簽核進度與年度假別餘額', 'https://leaveflow-tw.jerry950826.chatgpt.site/leave', '#0073df', '休', 1, 10, unixepoch() * 1000, unixepoch() * 1000),
  ('claims', '請款系統', '財務作業', '費用申請、單據核銷與付款進度追蹤', 'https://leaveflow-tw.jerry950826.chatgpt.site/claims', '#ff0000', '款', 1, 20, unixepoch() * 1000, unixepoch() * 1000),
  ('instructors', '講師看板', '教育營運', '講師排程、授課時數與合作狀態總覽', 'https://aizen-instructor-dashboard.jerry950826.chatgpt.site', '#1685c5', '講', 1, 30, unixepoch() * 1000, unixepoch() * 1000);

INSERT OR IGNORE INTO member_system_permissions (email, system_id, can_access, updated_at)
SELECT p.email, 'leave', p.leave, unixepoch() * 1000 FROM permissions p;

INSERT OR IGNORE INTO member_system_permissions (email, system_id, can_access, updated_at)
SELECT p.email, 'claims', p.claims, unixepoch() * 1000 FROM permissions p;

INSERT OR IGNORE INTO member_system_permissions (email, system_id, can_access, updated_at)
SELECT p.email, 'instructors', p.instructors, unixepoch() * 1000 FROM permissions p;

INSERT INTO audit_logs (actor_email, action, target_email, details_json, created_at)
SELECT NULL, 'database.core-master-data.initialize', NULL, '{"source":"003-core-master-data"}', unixepoch() * 1000
WHERE NOT EXISTS (
  SELECT 1 FROM audit_logs WHERE action = 'database.core-master-data.initialize'
);

PRAGMA optimize;
