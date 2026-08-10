-- Preserve the legacy JSON array order after normalized reads are enabled.
ALTER TABLE instructor_teachers ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE instructor_cohort_records ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE instructor_course_events ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE instructor_message_templates ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE instructor_schedule_audit_logs ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE instructor_teachers
SET sort_order = COALESCE((
  SELECT CAST(item.key AS INTEGER)
  FROM instructor_app_store AS store, json_each(store.value, '$.teachers') AS item
  WHERE store.key='schedule' AND json_extract(item.value, '$.id')=instructor_teachers.id
), 0);

UPDATE instructor_cohort_records
SET sort_order = COALESCE((
  SELECT CAST(item.key AS INTEGER)
  FROM instructor_app_store AS store, json_each(store.value, '$.cohortRecords') AS item
  WHERE store.key='schedule' AND json_extract(item.value, '$.id')=instructor_cohort_records.id
), 0);

UPDATE instructor_course_events
SET sort_order = COALESCE((
  SELECT CAST(item.key AS INTEGER)
  FROM instructor_app_store AS store, json_each(store.value, '$.events') AS item
  WHERE store.key='schedule' AND json_extract(item.value, '$.id')=instructor_course_events.id
), 0);

UPDATE instructor_message_templates
SET sort_order = COALESCE((
  SELECT CAST(item.key AS INTEGER)
  FROM instructor_app_store AS store, json_each(store.value, '$.templates') AS item
  WHERE store.key='schedule' AND json_extract(item.value, '$.id')=instructor_message_templates.id
), 0);

UPDATE instructor_schedule_audit_logs
SET sort_order = COALESCE((
  SELECT CAST(item.key AS INTEGER)
  FROM instructor_app_store AS store, json_each(store.value, '$.auditLogs') AS item
  WHERE store.key='schedule' AND json_extract(item.value, '$.id')=instructor_schedule_audit_logs.id
), 0);

CREATE INDEX IF NOT EXISTS idx_instructor_teachers_sort ON instructor_teachers(sort_order);
CREATE INDEX IF NOT EXISTS idx_instructor_cohorts_sort ON instructor_cohort_records(sort_order);
CREATE INDEX IF NOT EXISTS idx_instructor_events_sort ON instructor_course_events(sort_order);
CREATE INDEX IF NOT EXISTS idx_instructor_templates_sort ON instructor_message_templates(sort_order);
CREATE INDEX IF NOT EXISTS idx_instructor_audit_sort ON instructor_schedule_audit_logs(sort_order);

PRAGMA optimize;
