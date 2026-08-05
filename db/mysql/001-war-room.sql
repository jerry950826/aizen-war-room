CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(32) PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  english_name VARCHAR(80) NOT NULL,
  chinese_name VARCHAR(80) NOT NULL,
  department_id VARCHAR(32) NOT NULL,
  job_title VARCHAR(120) NOT NULL,
  organization_level TINYINT UNSIGNED NOT NULL DEFAULT 3,
  phone VARCHAR(32) NULL,
  birthday CHAR(5) NULL,
  role VARCHAR(20) NOT NULL DEFAULT '一般成員',
  active TINYINT(1) NOT NULL DEFAULT 1,
  password_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_members_department FOREIGN KEY (department_id) REFERENCES departments(id),
  INDEX idx_members_department (department_id),
  INDEX idx_members_active_role (active, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS systems (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  launch_url VARCHAR(500) NOT NULL,
  color CHAR(7) NOT NULL,
  icon VARCHAR(16) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS member_system_permissions (
  member_id VARCHAR(32) NOT NULL,
  system_id VARCHAR(32) NOT NULL,
  can_access TINYINT(1) NOT NULL DEFAULT 1,
  updated_by VARCHAR(32) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id, system_id),
  CONSTRAINT fk_permission_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_permission_system FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,
  CONSTRAINT fk_permission_updated_by FOREIGN KEY (updated_by) REFERENCES members(id) ON DELETE SET NULL,
  INDEX idx_permission_system (system_id, can_access)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token CHAR(36) PRIMARY KEY,
  member_id VARCHAR(32) NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_sessions_member (member_id),
  INDEX idx_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_member_id VARCHAR(32) NULL,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id VARCHAR(190) NULL,
  details_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_member_id) REFERENCES members(id) ON DELETE SET NULL,
  INDEX idx_audit_created_at (created_at),
  INDEX idx_audit_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO departments (id, name, sort_order) VALUES
  ('executive', '總經理室', 10),
  ('engineering', '技術部', 20),
  ('design', '設計部', 30),
  ('sales', '業務部', 40),
  ('marketing', '行銷部', 50),
  ('planning', '企劃部', 60)
ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order);

INSERT INTO systems (id, name, category, description, launch_url, color, icon, active, sort_order) VALUES
  ('leave', '請假系統', '人事作業', '假單申請、簽核進度與年度假別餘額', 'https://leaveflow-tw.jerry950826.chatgpt.site/leave', '#0073df', '休', 1, 10),
  ('claims', '請款系統', '財務作業', '費用申請、單據核銷與付款進度追蹤', 'https://leaveflow-tw.jerry950826.chatgpt.site/claims', '#ff0000', '款', 1, 20),
  ('instructors', '講師看板', '教務營運', '講師排程、授課時數與合作狀態總覽', 'https://aizen-instructor-dashboard.jerry950826.chatgpt.site', '#1685c5', '講', 1, 30)
ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category), description = VALUES(description), launch_url = VALUES(launch_url), color = VALUES(color), icon = VALUES(icon), active = VALUES(active), sort_order = VALUES(sort_order);

INSERT INTO members (id, email, display_name, english_name, chinese_name, department_id, job_title, organization_level, phone, birthday, role, active, password_hash) VALUES
  ('maggie', 'maggiefang@ai-zens.com', 'Maggie 房美華', 'Maggie', '房美華', 'executive', '總經理', 1, '0937-138902', '12-01', '管理員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('emily', 'emilychang@ai-zens.com', 'Emily 張芷瑄', 'Emily', '張芷瑄', 'engineering', '前端工程師', 2, '0970-672188', '06-10', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('jerry', 'jerrychang@ai-zens.com', 'Jerry 張廷', 'Jerry', '張廷', 'engineering', '前端工程師', 2, '0975-750220', '08-26', '管理員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('james', 'jameschien@ai-zens.com', 'James 簡侑俊', 'James', '簡侑俊', 'engineering', '後端工程師', 2, '0968-813952', '01-22', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('pearl', 'pearlchen@ai-zens.com', 'Pearl 陳品樺', 'Pearl', '陳品樺', 'design', '產品設計師', 2, '0979-635252', '08-01', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('blair', 'blairpeng@ai-zens.com', 'Blair 彭愛媛', 'Blair', '彭愛媛', 'design', '數位設計師', 2, '0988-506226', '07-12', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('sean', 'seanchang@ai-zens.com', 'Sean 張智翔', 'Sean', '張智翔', 'sales', '資深業務經理', 2, '0985-699592', NULL, '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('joanne', 'joannechen@ai-zens.com', 'Joanne 陳靜宜', 'Joanne', '陳靜宜', 'sales', '資深業務經理', 2, '0912-582956', '06-27', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('cat', 'catchen@ai-zens.com', 'Cat 陳瑾虹', 'Cat', '陳瑾虹', 'marketing', '行銷主任', 2, '0972-866530', '02-04', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('gary', 'garyshih@ai-zens.com', 'Gary 石孟玄', 'Gary', '石孟玄', 'marketing', '行銷專員', 3, '0912-818915', '07-23', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('sharlene', 'sinyunpan@ai-zens.com', 'Sharlene 潘欣芸', 'Sharlene', '潘欣芸', 'marketing', '內容行銷專員', 3, '0958-031793', '03-17', '一般成員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311'),
  ('rita', 'ritahsieh@ai-zens.com', 'Rita 謝雨如', 'Rita', '謝雨如', 'planning', '企劃兼行政', 2, '0927-765167', '10-10', '管理員', 1, 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), english_name = VALUES(english_name), chinese_name = VALUES(chinese_name), department_id = VALUES(department_id), job_title = VALUES(job_title), organization_level = VALUES(organization_level), phone = VALUES(phone), birthday = VALUES(birthday);

INSERT INTO member_system_permissions (member_id, system_id, can_access) VALUES
  ('maggie', 'leave', 1), ('maggie', 'claims', 1), ('maggie', 'instructors', 1),
  ('rita', 'leave', 1), ('rita', 'claims', 1), ('rita', 'instructors', 0),
  ('jerry', 'leave', 0), ('jerry', 'claims', 1), ('jerry', 'instructors', 1),
  ('emily', 'leave', 1), ('emily', 'claims', 1), ('emily', 'instructors', 1),
  ('james', 'leave', 1), ('james', 'claims', 1), ('james', 'instructors', 1),
  ('pearl', 'leave', 1), ('pearl', 'claims', 1), ('pearl', 'instructors', 1),
  ('blair', 'leave', 1), ('blair', 'claims', 1), ('blair', 'instructors', 1),
  ('sean', 'leave', 1), ('sean', 'claims', 1), ('sean', 'instructors', 1),
  ('joanne', 'leave', 1), ('joanne', 'claims', 1), ('joanne', 'instructors', 1),
  ('cat', 'leave', 1), ('cat', 'claims', 1), ('cat', 'instructors', 1),
  ('gary', 'leave', 1), ('gary', 'claims', 1), ('gary', 'instructors', 1),
  ('sharlene', 'leave', 1), ('sharlene', 'claims', 1), ('sharlene', 'instructors', 1)
ON DUPLICATE KEY UPDATE can_access = VALUES(can_access);
