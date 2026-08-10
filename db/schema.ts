import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("members", {
  email: text("email").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  passwordHash: text("password_hash").notNull(),
});

export const permissions = sqliteTable("permissions", {
  email: text("email").primaryKey(),
  leave: integer("leave", { mode: "boolean" }).notNull().default(true),
  claims: integer("claims", { mode: "boolean" }).notNull().default(true),
  instructors: integer("instructors", { mode: "boolean" }).notNull().default(true),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  email: text("email").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const organizationProfiles = sqliteTable("organization_profiles", {
  email: text("email").primaryKey(),
  department: text("department").notNull(),
  level: integer("level").notNull().default(3),
  jobTitle: text("job_title").notNull(),
  englishName: text("english_name").notNull(),
  chineseName: text("chinese_name").notNull(),
  phone: text("phone"),
  birthday: text("birthday"),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  targetEmail: text("target_email"),
  detailsJson: text("details_json"),
  createdAt: integer("created_at").notNull(),
});

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const systems = sqliteTable("systems", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  launchUrl: text("launch_url").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const memberSystemPermissions = sqliteTable(
  "member_system_permissions",
  {
    email: text("email").notNull(),
    systemId: text("system_id").notNull(),
    canAccess: integer("can_access", { mode: "boolean" }).notNull().default(true),
    updatedBy: text("updated_by"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.email, table.systemId] })],
);

export const instructorTeachers = sqliteTable("instructor_teachers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const instructorCohortRecords = sqliteTable("instructor_cohort_records", {
  id: text("id").primaryKey(),
  cohort: integer("cohort").notNull(),
  client: text("client").notNull().default(""),
  location: text("location").notNull().default(""),
  city: text("city").notNull().default(""),
  district: text("district").notNull().default(""),
  village: text("village").notNull().default(""),
  memberCount: integer("member_count").notNull().default(0),
  notes: text("notes").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const instructorCourseEvents = sqliteTable("instructor_course_events", {
  id: text("id").primaryKey(),
  seriesId: text("series_id").notNull().default(""),
  cohort: integer("cohort").notNull(),
  client: text("client").notNull().default(""),
  title: text("title").notNull(),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  teacherId: text("teacher_id").notNull().default(""),
  teacherName: text("teacher_name").notNull().default(""),
  teacherEmail: text("teacher_email").notNull().default(""),
  teacherPhone: text("teacher_phone").notNull().default(""),
  location: text("location").notNull().default(""),
  status: text("status").notNull().default(""),
  notes: text("notes").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const instructorMessageTemplates = sqliteTable("instructor_message_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const instructorScheduleAuditLogs = sqliteTable("instructor_schedule_audit_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  detail: text("detail").notNull().default(""),
  occurredAt: text("occurred_at").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
