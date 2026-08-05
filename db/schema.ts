import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
