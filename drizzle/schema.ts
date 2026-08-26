import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "user"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const ryzeSessions = mysqlTable("ryze_sessions", {
  id: varchar("id", { length: 40 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("ryze_sessions_user_name_uq").on(table.userId, table.name)]);

export const ryzeTasks = mysqlTable("ryze_tasks", {
  id: varchar("id", { length: 40 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("sessionId", { length: 40 }).notNull().references(() => ryzeSessions.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"]).default("PENDING").notNull(),
  summary: text("summary"),
  retryCount: int("retryCount").default(0).notNull(),
  completedSteps: int("completedSteps").default(0).notNull(),
  totalSteps: int("totalSteps").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export const ryzeTaskLogs = mysqlTable("ryze_task_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: varchar("taskId", { length: 40 }).notNull().references(() => ryzeTasks.id, { onDelete: "cascade" }),
  sequence: int("sequence").notNull(),
  actor: mysqlEnum("actor", ["ryze", "nerd", "system"]).notNull(),
  level: mysqlEnum("level", ["info", "success", "warning", "error"]).default("info").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("ryze_task_logs_task_sequence_uq").on(table.taskId, table.sequence)]);

export const ryzeMemory = mysqlTable("ryze_memory", {
  id: varchar("id", { length: 40 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  scope: mysqlEnum("scope", ["core", "evolving"]).notNull(),
  kind: varchar("kind", { length: 64 }).notNull(),
  content: text("content").notNull(),
  tags: text("tags").notNull(),
  outcome: mysqlEnum("outcome", ["SUCCESS", "FAIL", "NEUTRAL"]).default("NEUTRAL").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ryzeSkills = mysqlTable("ryze_skills", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  domain: varchar("domain", { length: 48 }).notNull(),
  xp: int("xp").default(0).notNull(),
  level: int("level").default(1).notNull(),
  successCount: int("successCount").default(0).notNull(),
  failCount: int("failCount").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("ryze_skills_user_domain_uq").on(table.userId, table.domain)]);

export const ryzeFiles = mysqlTable("ryze_files", {
  id: varchar("id", { length: 40 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: varchar("taskId", { length: 40 }).references(() => ryzeTasks.id, { onDelete: "set null" }),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  byteSize: int("byteSize").notNull(),
  category: varchar("category", { length: 48 }).notNull(),
  source: mysqlEnum("source", ["upload", "generated"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ryzeSettings = mysqlTable("ryze_settings", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  demoMode: boolean("demoMode").default(true).notNull(),
  provider: varchar("provider", { length: 32 }).default("local-demo").notNull(),
  ryzeModel: varchar("ryzeModel", { length: 120 }).default("ryze-safe-demo").notNull(),
  nerdModel: varchar("nerdModel", { length: 120 }).default("nerd-safe-demo").notNull(),
  externalLlmEnabled: boolean("externalLlmEnabled").default(false).notNull(),
  emailEnabled: boolean("emailEnabled").default(false).notNull(),
  telegramEnabled: boolean("telegramEnabled").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
