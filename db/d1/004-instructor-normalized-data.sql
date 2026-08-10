-- 講師聯絡資料：提供課表篩選、登入身分與聯絡資訊維護。
CREATE TABLE IF NOT EXISTS instructor_teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

-- 梯次主檔：保存每一期的客戶、地點、行政區及學員數。
CREATE TABLE IF NOT EXISTS instructor_cohort_records (
  id TEXT PRIMARY KEY,
  cohort INTEGER NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  village TEXT NOT NULL DEFAULT '',
  member_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

-- 課程場次：保存每堂課的時間、講師、地點、狀態與系列關係。
CREATE TABLE IF NOT EXISTS instructor_course_events (
  id TEXT PRIMARY KEY,
  series_id TEXT NOT NULL DEFAULT '',
  cohort INTEGER NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  teacher_id TEXT NOT NULL DEFAULT '',
  teacher_name TEXT NOT NULL DEFAULT '',
  teacher_email TEXT NOT NULL DEFAULT '',
  teacher_phone TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

-- 寄信範本：保存 Outlook 寄信功能使用的主旨與內文。
CREATE TABLE IF NOT EXISTS instructor_message_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

-- 講師看板操作紀錄：保存排程與名單異動軌跡。
CREATE TABLE IF NOT EXISTS instructor_schedule_audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_instructor_teachers_email
ON instructor_teachers(email);

CREATE INDEX IF NOT EXISTS idx_instructor_cohort_records_cohort
ON instructor_cohort_records(cohort);

CREATE INDEX IF NOT EXISTS idx_instructor_course_events_cohort_start
ON instructor_course_events(cohort, start_at);

CREATE INDEX IF NOT EXISTS idx_instructor_course_events_teacher_start
ON instructor_course_events(teacher_id, start_at);

CREATE INDEX IF NOT EXISTS idx_instructor_schedule_audit_occurred
ON instructor_schedule_audit_logs(occurred_at DESC);

-- 從既有 schedule JSON 快照回填；舊快照保留供相容讀取與緊急回復。
INSERT OR REPLACE INTO instructor_teachers (id,name,email,phone,updated_at)
SELECT
  json_extract(item.value, '$.id'),
  COALESCE(json_extract(item.value, '$.name'), ''),
  COALESCE(json_extract(item.value, '$.email'), ''),
  COALESCE(json_extract(item.value, '$.phone'), ''),
  store.updated_at
FROM instructor_app_store AS store, json_each(store.value, '$.teachers') AS item
WHERE store.key = 'schedule';

INSERT OR REPLACE INTO instructor_cohort_records (
  id,cohort,client,location,city,district,village,member_count,notes,updated_at
)
SELECT
  json_extract(item.value, '$.id'),
  COALESCE(json_extract(item.value, '$.cohort'), 0),
  COALESCE(json_extract(item.value, '$.client'), ''),
  COALESCE(json_extract(item.value, '$.location'), ''),
  COALESCE(json_extract(item.value, '$.city'), ''),
  COALESCE(json_extract(item.value, '$.district'), ''),
  COALESCE(json_extract(item.value, '$.village'), ''),
  COALESCE(json_extract(item.value, '$.memberCount'), 0),
  COALESCE(json_extract(item.value, '$.notes'), ''),
  store.updated_at
FROM instructor_app_store AS store, json_each(store.value, '$.cohortRecords') AS item
WHERE store.key = 'schedule';

INSERT OR REPLACE INTO instructor_course_events (
  id,series_id,cohort,client,title,start_at,end_at,teacher_id,teacher_name,
  teacher_email,teacher_phone,location,status,notes,updated_at
)
SELECT
  json_extract(item.value, '$.id'),
  COALESCE(json_extract(item.value, '$.seriesId'), ''),
  COALESCE(json_extract(item.value, '$.cohort'), 0),
  COALESCE(json_extract(item.value, '$.client'), ''),
  COALESCE(json_extract(item.value, '$.title'), ''),
  COALESCE(json_extract(item.value, '$.start'), ''),
  COALESCE(json_extract(item.value, '$.end'), ''),
  COALESCE(json_extract(item.value, '$.teacher.id'), ''),
  COALESCE(json_extract(item.value, '$.teacher.name'), ''),
  COALESCE(json_extract(item.value, '$.teacher.email'), ''),
  COALESCE(json_extract(item.value, '$.teacher.phone'), ''),
  COALESCE(json_extract(item.value, '$.location'), ''),
  COALESCE(json_extract(item.value, '$.status'), ''),
  COALESCE(json_extract(item.value, '$.notes'), ''),
  store.updated_at
FROM instructor_app_store AS store, json_each(store.value, '$.events') AS item
WHERE store.key = 'schedule';

INSERT OR REPLACE INTO instructor_message_templates (id,name,subject,body,updated_at)
SELECT
  json_extract(item.value, '$.id'),
  COALESCE(json_extract(item.value, '$.name'), ''),
  COALESCE(json_extract(item.value, '$.subject'), ''),
  COALESCE(json_extract(item.value, '$.body'), ''),
  store.updated_at
FROM instructor_app_store AS store, json_each(store.value, '$.templates') AS item
WHERE store.key = 'schedule';

INSERT OR REPLACE INTO instructor_schedule_audit_logs (id,action,detail,occurred_at)
SELECT
  json_extract(item.value, '$.id'),
  COALESCE(json_extract(item.value, '$.action'), ''),
  COALESCE(json_extract(item.value, '$.detail'), ''),
  COALESCE(json_extract(item.value, '$.at'), '')
FROM instructor_app_store AS store, json_each(store.value, '$.auditLogs') AS item
WHERE store.key = 'schedule';

PRAGMA optimize;
