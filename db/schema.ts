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
