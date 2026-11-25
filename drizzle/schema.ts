import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["admin", "user"] }).default("user").notNull(),
  createdAt: timestampMs("createdAt"),
  updatedAt: timestampMs("updatedAt"),
  lastSignedIn: timestampMs("lastSignedIn"),
});

export const ryzeSessions = sqliteTable("ryze_sessions", {
  id: text("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status", { enum: ["active", "archived"] }).default("active").notNull(),
  createdAt: timestampMs("createdAt"),
  updatedAt: timestampMs("updatedAt"),
}, (table) => [uniqueIndex("ryze_sessions_user_name_uq").on(table.userId, table.name)]);

export const ryzeOpenCodeSessions = sqliteTable("ryze_opencode_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  ryzeSessionId: text("ryzeSessionId").notNull().references(() => ryzeSessions.id, { onDelete: "cascade" }),
  openCodeSessionId: text("openCodeSessionId").notNull(),
  createdAt: timestampMs("createdAt"),
}, (table) => [
  uniqueIndex("ryze_opencode_sessions_user_session_uq").on(table.userId, table.ryzeSessionId),
  uniqueIndex("ryze_opencode_sessions_opencode_id_uq").on(table.openCodeSessionId),
]);

export const ryzeTasks = sqliteTable("ryze_tasks", {
  id: text("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("sessionId").notNull().references(() => ryzeSessions.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  action: text("action").notNull(),
  status: text("status", { enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"] }).default("PENDING").notNull(),
  summary: text("summary"),
  retryCount: integer("retryCount").default(0).notNull(),
  completedSteps: integer("completedSteps").default(0).notNull(),
  totalSteps: integer("totalSteps").default(1).notNull(),
  createdAt: timestampMs("createdAt"),
  updatedAt: timestampMs("updatedAt"),
  completedAt: integer("completedAt", { mode: "timestamp_ms" }),
});

export const ryzeTaskLogs = sqliteTable("ryze_task_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: text("taskId").notNull().references(() => ryzeTasks.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  actor: text("actor", { enum: ["ryze", "nerd", "system"] }).notNull(),
  level: text("level", { enum: ["info", "success", "warning", "error"] }).default("info").notNull(),
  message: text("message").notNull(),
  createdAt: timestampMs("createdAt"),
}, (table) => [uniqueIndex("ryze_task_logs_task_sequence_uq").on(table.taskId, table.sequence)]);

export const ryzeMemory = sqliteTable("ryze_memory", {
  id: text("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  scope: text("scope", { enum: ["core", "evolving"] }).notNull(),
  legacyScope: text("legacyScope", { enum: ["core", "evolving"] }),
  category: text("category", { enum: ["system", "experience", "personal"] }),
  memoryType: text("memoryType", { enum: ["episodic", "semantic", "procedural", "preference", "project"] }),
  ownerScope: text("ownerScope").notNull().default("owner"),
  sourceSystemId: text("sourceSystemId"),
  branchId: text("branchId").notNull().default("main"),
  sourceRef: text("sourceRef"),
  derivedFrom: text("derivedFrom"),
  createdBy: text("createdBy", { enum: ["owner", "ryze_candidate_approved", "system_process"] }),
  updatedAt: timestampMs("updatedAt"),
  version: integer("version"),
  status: text("status", { enum: ["candidate", "active", "superseded", "archived", "legacy_unclassified"] }).default("legacy_unclassified"),
  sensitivity: text("sensitivity", { enum: ["normal", "restricted"] }).default("normal"),
  syncStatus: text("syncStatus", { enum: ["local", "pending", "synced", "conflicted"] }).default("local"),
  kind: text("kind").notNull(),
  content: text("content").notNull(),
  tags: text("tags").notNull(),
  outcome: text("outcome", { enum: ["SUCCESS", "FAIL", "NEUTRAL"] }).default("NEUTRAL").notNull(),
  createdAt: timestampMs("createdAt"),
});

export const ryzeIdentityProfiles = sqliteTable("ryze_identity_profiles", {
  id: text("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  description: text("description").notNull(),
  communicationStyle: text("communicationStyle").notNull(),
  workingPrinciples: text("workingPrinciples").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: timestampMs("createdAt"),
  updatedAt: timestampMs("updatedAt"),
}, (table) => [uniqueIndex("ryze_identity_profiles_user_uq").on(table.userId)]);

export const ryzeIdentityRevisions = sqliteTable("ryze_identity_revisions", {
  id: text("id").primaryKey(),
  profileId: text("profileId").notNull().references(() => ryzeIdentityProfiles.id, { onDelete: "cascade" }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  description: text("description").notNull(),
  communicationStyle: text("communicationStyle").notNull(),
  workingPrinciples: text("workingPrinciples").notNull(),
  version: integer("version").notNull(),
  changedBy: text("changedBy", { enum: ["owner", "system_process"] }).notNull(),
  createdAt: timestampMs("createdAt"),
});

export const ryzeSystemMemory = sqliteTable("ryze_system_memory", {
  id: text("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  memoryType: text("memoryType", { enum: ["episodic", "semantic", "procedural", "preference", "project"] }).notNull(),
  content: text("content").notNull(),
  tags: text("tags").notNull(),
  sourceSystemId: text("sourceSystemId").notNull(),
  branchId: text("branchId").notNull().default("main"),
  sourceRef: text("sourceRef"),
  derivedFrom: text("derivedFrom"),
  createdBy: text("createdBy", { enum: ["owner", "ryze_candidate_approved", "system_process"] }).notNull(),
  version: integer("version").notNull().default(1),
  status: text("status", { enum: ["candidate", "active", "superseded", "archived"] }).notNull().default("active"),
  sensitivity: text("sensitivity", { enum: ["normal", "restricted"] }).notNull().default("normal"),
  syncStatus: text("syncStatus", { enum: ["local", "pending", "synced", "conflicted"] }).notNull().default("local"),
  createdAt: timestampMs("createdAt"),
  updatedAt: timestampMs("updatedAt"),
});

export const ryzeSkills = sqliteTable("ryze_skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  successCount: integer("successCount").default(0).notNull(),
  failCount: integer("failCount").default(0).notNull(),
  updatedAt: timestampMs("updatedAt"),
}, (table) => [uniqueIndex("ryze_skills_user_domain_uq").on(table.userId, table.domain)]);

export const ryzeFiles = sqliteTable("ryze_files", {
  id: text("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: text("taskId").references(() => ryzeTasks.id, { onDelete: "set null" }),
  storageKey: text("storageKey").notNull(),
  url: text("url").notNull(),
  originalName: text("originalName").notNull(),
  mimeType: text("mimeType").notNull(),
  byteSize: integer("byteSize").notNull(),
  category: text("category").notNull(),
  source: text("source", { enum: ["upload", "generated", "telegram"] }).notNull(),
  telegramChatId: text("telegramChatId"),
  telegramSenderId: text("telegramSenderId"),
  telegramMessageId: text("telegramMessageId"),
  createdAt: timestampMs("createdAt"),
}, (table) => [uniqueIndex("ryze_files_telegram_origin_uq").on(table.userId, table.telegramChatId, table.telegramMessageId)]);

export const ryzeSettings = sqliteTable("ryze_settings", {
  userId: integer("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  demoMode: integer("demoMode", { mode: "boolean" }).default(true).notNull(),
  provider: text("provider").default("local-demo").notNull(),
  ryzeModel: text("ryzeModel").default("ryze-safe-demo").notNull(),
  nerdModel: text("nerdModel").default("nerd-safe-demo").notNull(),
  externalLlmEnabled: integer("externalLlmEnabled", { mode: "boolean" }).default(false).notNull(),
  emailEnabled: integer("emailEnabled", { mode: "boolean" }).default(false).notNull(),
  telegramEnabled: integer("telegramEnabled", { mode: "boolean" }).default(false).notNull(),
  updatedAt: timestampMs("updatedAt"),
});

export const ryzeWorkers = sqliteTable("ryze_workers", {
  id: text("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  hostname: text("hostname").notNull(),
  version: text("version").notNull(),
  status: text("status", { enum: ["online", "paused", "degraded", "offline"] }).default("offline").notNull(),
  automationPaused: integer("automationPaused", { mode: "boolean" }).default(false).notNull(),
  lastHeartbeatAt: integer("lastHeartbeatAt", { mode: "timestamp_ms" }),
  updatedAt: timestampMs("updatedAt"),
});

export const ryzeWorkerCommands = sqliteTable("ryze_worker_commands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workerId: text("workerId").notNull().references(() => ryzeWorkers.id, { onDelete: "cascade" }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  command: text("command").notNull(),
  payload: text("payload"),
  status: text("status", { enum: ["queued", "acknowledged", "completed", "failed"] }).default("queued").notNull(),
  createdAt: timestampMs("createdAt"),
  updatedAt: timestampMs("updatedAt"),
});

export const ryzeWorkerEvents = sqliteTable("ryze_worker_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workerId: text("workerId").notNull().references(() => ryzeWorkers.id, { onDelete: "cascade" }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  level: text("level", { enum: ["info", "warning", "error"] }).default("info").notNull(),
  eventType: text("eventType").notNull(),
  message: text("message").notNull(),
  createdAt: timestampMs("createdAt"),
});

export const ryzeTelegramAccounts = sqliteTable("ryze_telegram_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  phoneMasked: text("phoneMasked").notNull(),
  telegramUserId: text("telegramUserId"),
  status: text("status", { enum: ["configured", "authorized", "paused", "removed"] }).default("configured").notNull(),
  createdAt: timestampMs("createdAt"),
  updatedAt: timestampMs("updatedAt"),
}, (table) => [uniqueIndex("ryze_telegram_accounts_user_uq").on(table.userId)]);

export const ryzeTelegramAccess = sqliteTable("ryze_telegram_access", {
  userId: integer("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  adminTelegramUserId: text("adminTelegramUserId"),
  adminTelegramUsername: text("adminTelegramUsername"),
  temporaryTelegramUserId: text("temporaryTelegramUserId"),
  temporaryExpiresAt: integer("temporaryExpiresAt", { mode: "timestamp_ms" }),
  secretCodeHash: text("secretCodeHash"),
  secretCodeExpiresAt: integer("secretCodeExpiresAt", { mode: "timestamp_ms" }),
  permanentSecretCodeHash: text("permanentSecretCodeHash"),
  updatedAt: timestampMs("updatedAt"),
});

export const ryzeTelegramLogs = sqliteTable("ryze_telegram_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: integer("accountId").references(() => ryzeTelegramAccounts.id, { onDelete: "set null" }),
  direction: text("direction", { enum: ["incoming", "outgoing", "system"] }).notNull(),
  telegramUserId: text("telegramUserId"),
  chatId: text("chatId"),
  messagePreview: text("messagePreview").notNull(),
  status: text("status").notNull(),
  createdAt: timestampMs("createdAt"),
});

export type User = typeof users.$inferSelect;
