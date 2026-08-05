CREATE TABLE IF NOT EXISTS instructor_app_store (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS instructor_sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS instructor_feedback (
  id TEXT PRIMARY KEY, course_id TEXT NOT NULL, course_title TEXT NOT NULL, cohort INTEGER NOT NULL,
  course_start TEXT NOT NULL, teacher_id TEXT NOT NULL, teacher_name TEXT NOT NULL, teacher_email TEXT NOT NULL,
  member_id TEXT NOT NULL, member_name TEXT NOT NULL, member_email TEXT NOT NULL, reflection TEXT NOT NULL,
  observation TEXT NOT NULL DEFAULT '', follow_up TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_instructor_sessions_expires ON instructor_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_instructor_feedback_course_created ON instructor_feedback(course_id, created_at DESC);
PRAGMA optimize;
