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
