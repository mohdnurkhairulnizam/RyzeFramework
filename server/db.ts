import { and, desc, eq, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import {
  ryzeFiles,
  ryzeMemory,
  ryzeSessions,
  ryzeSettings,
  ryzeSkills,
  ryzeTaskLogs,
  ryzeTasks,
  ryzeWorkerCommands,
  ryzeWorkerEvents,
  ryzeWorkers,
  type User,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildPortableExport } from "./ryzeExport";
import { filterOwnedRecords, requireOwnedRecord } from "./ryzeOwnership";

let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: Database.Database | null = null;

export async function getDb() {
  if (!_db) {
    mkdirSync(path.dirname(ENV.databasePath), { recursive: true });
    _sqlite = new Database(ENV.databasePath);
    _sqlite.pragma("foreign_keys = ON");
    _sqlite.pragma("journal_mode = WAL");
    _sqlite.pragma("busy_timeout = 5000");
    _db = drizzle(_sqlite);
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
    migrate(_db, { migrationsFolder: path.resolve(process.cwd(), "drizzle/sqlite") });
  }
  return _db;
}

export async function closeDb() {
  _sqlite?.close();
  _sqlite = null;
  _db = null;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db;
}

export async function upsertUser(user: typeof users.$inferInsert): Promise<void> {
  const db = await requireDb();
  await db.insert(users).values({
    ...user,
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
    lastSignedIn: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: users.openId,
    set: {
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      lastSignedIn: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0];
}

export async function ensureLocalOwner() {
  await upsertUser({
    openId: ENV.localOwnerOpenId,
    name: ENV.localOwnerName,
    loginMethod: "local-password",
    role: "admin",
  });
  const owner = await getUserByOpenId(ENV.localOwnerOpenId);
  if (!owner) throw new Error("Could not initialize the local owner account.");
  await ensureSettings(owner.id);
  return owner;
}

export async function ensureSettings(userId: number) {
  const db = await requireDb();
  await db.insert(ryzeSettings).values({ userId }).onConflictDoUpdate({ target: ryzeSettings.userId, set: { updatedAt: new Date() } });
  const rows = await db.select().from(ryzeSettings).where(eq(ryzeSettings.userId, userId)).limit(1);
  return rows[0]!;
}

export async function updateSafeSettings(userId: number, input: { provider: string; ryzeModel: string; nerdModel: string; demoMode: boolean }) {
  const db = await requireDb();
  await ensureSettings(userId);
  await db.update(ryzeSettings).set({
    provider: input.provider,
    ryzeModel: input.ryzeModel,
    nerdModel: input.nerdModel,
    demoMode: input.demoMode,
    externalLlmEnabled: false,
    emailEnabled: false,
    telegramEnabled: false,
    updatedAt: new Date(),
  }).where(eq(ryzeSettings.userId, userId));
  return ensureSettings(userId);
}

export async function listSessions(userId: number) {
  const db = await requireDb();
  return db.select().from(ryzeSessions).where(and(eq(ryzeSessions.userId, userId), eq(ryzeSessions.status, "active"))).orderBy(desc(ryzeSessions.updatedAt));
}

export async function createSession(userId: number, name?: string) {
  const db = await requireDb();
  const session = { id: `sess_${nanoid(12)}`, userId, name: (name?.trim() || "New sandbox chat").slice(0, 80) };
  await db.insert(ryzeSessions).values(session);
  return session;
}

export async function ensureSession(userId: number, preferredSessionId?: string) {
  const db = await requireDb();
  if (preferredSessionId) {
    const existing = await db.select().from(ryzeSessions).where(and(eq(ryzeSessions.id, preferredSessionId), eq(ryzeSessions.userId, userId))).limit(1);
    if (existing[0]) return requireOwnedRecord(existing[0], userId);
  }
  const sessions = await listSessions(userId);
  return sessions[0] ?? createSession(userId);
}

export async function createTask(userId: number, sessionId: string, prompt: string, action: string) {
  const db = await requireDb();
  const task = { id: `task_${nanoid(14)}`, userId, sessionId, prompt: prompt.slice(0, 5000), action, status: "PENDING" as const, totalSteps: 1 };
  await db.insert(ryzeTasks).values(task);
  await db.update(ryzeSessions).set({ updatedAt: new Date() }).where(and(eq(ryzeSessions.id, sessionId), eq(ryzeSessions.userId, userId)));
  return task;
}

export async function updateTask(userId: number, taskId: string, values: Partial<typeof ryzeTasks.$inferInsert>) {
  const db = await requireDb();
  await db.update(ryzeTasks).set({ ...values, updatedAt: new Date() }).where(and(eq(ryzeTasks.id, taskId), eq(ryzeTasks.userId, userId)));
}

export async function addTaskLog(userId: number, taskId: string, actor: "ryze" | "nerd" | "system", level: "info" | "success" | "warning" | "error", message: string) {
  const db = await requireDb();
  const sequenceRows = await db.select({ count: sql<number>`count(*)` }).from(ryzeTaskLogs).where(and(eq(ryzeTaskLogs.taskId, taskId), eq(ryzeTaskLogs.userId, userId)));
  const sequence = Number(sequenceRows[0]?.count ?? 0) + 1;
  await db.insert(ryzeTaskLogs).values({ id: undefined, userId, taskId, sequence, actor, level, message: message.slice(0, 2000) });
}

export async function addMemory(userId: number, input: { scope: "core" | "evolving"; kind: string; content: string; tags: string[]; outcome?: "SUCCESS" | "FAIL" | "NEUTRAL" }) {
  const db = await requireDb();
  await db.insert(ryzeMemory).values({
    id: `mem_${nanoid(14)}`,
    userId,
    scope: input.scope,
    kind: input.kind.slice(0, 64),
    content: input.content.slice(0, 5000),
    tags: JSON.stringify(input.tags.slice(0, 12)),
    outcome: input.outcome ?? "NEUTRAL",
  });
}

export async function searchMemory(userId: number, query: string) {
  const db = await requireDb();
  const terms = query.trim().split(/\s+/).filter((term) => term.length > 2).slice(0, 5);
  if (!terms.length) return db.select().from(ryzeMemory).where(eq(ryzeMemory.userId, userId)).orderBy(desc(ryzeMemory.createdAt)).limit(8);
  const pattern = `%${terms.join("%")}%`;
  return db.select().from(ryzeMemory).where(and(eq(ryzeMemory.userId, userId), like(ryzeMemory.content, pattern))).orderBy(desc(ryzeMemory.createdAt)).limit(8);
}

export async function awardSkill(userId: number, domain: string, success: boolean) {
  const db = await requireDb();
  const existing = await db.select().from(ryzeSkills).where(and(eq(ryzeSkills.userId, userId), eq(ryzeSkills.domain, domain))).limit(1);
  if (!existing[0]) {
    const xp = success ? 10 : 0;
    await db.insert(ryzeSkills).values({ userId, domain, xp, level: 1 + Math.floor(xp / 100), successCount: success ? 1 : 0, failCount: success ? 0 : 1 });
    return;
  }
  const xp = Math.max(0, existing[0].xp + (success ? 10 : -2));
  await db.update(ryzeSkills).set({ xp, level: 1 + Math.floor(xp / 100), successCount: existing[0].successCount + (success ? 1 : 0), failCount: existing[0].failCount + (success ? 0 : 1), updatedAt: new Date() }).where(eq(ryzeSkills.id, existing[0].id));
}

export async function saveFileMetadata(userId: number, input: { taskId?: string; storageKey: string; originalName: string; mimeType: string; byteSize: number; category: string; source: "upload" | "generated" }) {
  const db = await requireDb();
  const id = `file_${nanoid(14)}`;
  const file = { id, userId, taskId: input.taskId ?? null, storageKey: input.storageKey, url: `/api/files/${id}/download`, originalName: input.originalName, mimeType: input.mimeType, byteSize: input.byteSize, category: input.category, source: input.source };
  await db.insert(ryzeFiles).values(file);
  return file;
}

export async function listFiles(userId: number) {
  const db = await requireDb();
  return db.select().from(ryzeFiles).where(eq(ryzeFiles.userId, userId)).orderBy(desc(ryzeFiles.createdAt));
}

export async function getFileForUser(fileId: string, userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(ryzeFiles).where(and(eq(ryzeFiles.id, fileId), eq(ryzeFiles.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function getDashboard(userId: number) {
  const db = await requireDb();
  const [settings, sessions, tasks, logs, memory, skills, files] = await Promise.all([
    ensureSettings(userId),
    listSessions(userId),
    db.select().from(ryzeTasks).where(eq(ryzeTasks.userId, userId)).orderBy(desc(ryzeTasks.createdAt)).limit(60),
    db.select().from(ryzeTaskLogs).where(eq(ryzeTaskLogs.userId, userId)).orderBy(desc(ryzeTaskLogs.createdAt)).limit(360),
    db.select().from(ryzeMemory).where(eq(ryzeMemory.userId, userId)).orderBy(desc(ryzeMemory.createdAt)).limit(120),
    db.select().from(ryzeSkills).where(eq(ryzeSkills.userId, userId)).orderBy(desc(ryzeSkills.xp)),
    listFiles(userId),
  ]);
  return scopeDashboardData(userId, {
    settings: requireOwnedRecord(settings, userId),
    sessions,
    tasks,
    logs,
    memory,
    skills,
    files,
  });
}

export function scopeDashboardData<
  TSettings extends { userId: number },
  TSessions extends { userId: number },
  TTasks extends { userId: number },
  TLogs extends { userId: number },
  TMemory extends { userId: number },
  TSkills extends { userId: number },
  TFiles extends { userId: number },
>(userId: number, dashboard: {
  settings: TSettings;
  sessions: TSessions[];
  tasks: TTasks[];
  logs: TLogs[];
  memory: TMemory[];
  skills: TSkills[];
  files: TFiles[];
}) {
  return {
    settings: requireOwnedRecord(dashboard.settings, userId),
    sessions: filterOwnedRecords(dashboard.sessions, userId),
    tasks: filterOwnedRecords(dashboard.tasks, userId),
    logs: filterOwnedRecords(dashboard.logs, userId),
    memory: filterOwnedRecords(dashboard.memory, userId),
    skills: filterOwnedRecords(dashboard.skills, userId),
    files: filterOwnedRecords(dashboard.files, userId),
  };
}

export function buildUserScopedExport(userId: number, dashboard: any) {
  const scoped = scopeDashboardData(userId, dashboard);
  return buildPortableExport({
    settings: scoped.settings,
    sessions: scoped.sessions,
    tasks: scoped.tasks,
    taskLogs: scoped.logs,
    memory: scoped.memory,
    skills: scoped.skills,
    files: scoped.files,
  });
}

export async function exportUserSandbox(userId: number) {
  return buildUserScopedExport(userId, await getDashboard(userId));
}

export async function upsertWorkerHeartbeat(userId: number, input: {
  workerId: string;
  hostname: string;
  version: string;
  status: "online" | "paused" | "degraded" | "offline";
  automationPaused: boolean;
}) {
  const db = await requireDb();
  await db.insert(ryzeWorkers).values({
    id: input.workerId,
    userId,
    hostname: input.hostname,
    version: input.version,
    status: input.status,
    automationPaused: input.automationPaused,
    lastHeartbeatAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({ target: ryzeWorkers.id, set: {
    userId,
    hostname: input.hostname,
    version: input.version,
    status: input.status,
    automationPaused: input.automationPaused,
    lastHeartbeatAt: new Date(),
    updatedAt: new Date(),
  } });
  const rows = await db.select().from(ryzeWorkers).where(and(eq(ryzeWorkers.id, input.workerId), eq(ryzeWorkers.userId, userId))).limit(1);
  return requireOwnedRecord(rows[0], userId);
}

export async function listWorkerCommands(userId: number, workerId: string, afterId: number) {
  const db = await requireDb();
  return db.select().from(ryzeWorkerCommands)
    .where(and(eq(ryzeWorkerCommands.userId, userId), eq(ryzeWorkerCommands.workerId, workerId), sql`${ryzeWorkerCommands.id} > ${afterId}`))
    .orderBy(ryzeWorkerCommands.id).limit(50);
}

export async function updateWorkerCommand(userId: number, workerId: string, commandId: number, status: "acknowledged" | "completed" | "failed") {
  const db = await requireDb();
  await db.update(ryzeWorkerCommands).set({ status, updatedAt: new Date() }).where(and(eq(ryzeWorkerCommands.id, commandId), eq(ryzeWorkerCommands.userId, userId), eq(ryzeWorkerCommands.workerId, workerId)));
}

export async function queueWorkerCommand(userId: number, workerId: string, command: string, payload?: Record<string, unknown>) {
  const db = await requireDb();
  const row = { workerId, userId, command, payload: payload ? JSON.stringify(payload) : null };
  await db.insert(ryzeWorkerCommands).values(row);
  const rows = await db.select().from(ryzeWorkerCommands).where(and(eq(ryzeWorkerCommands.userId, userId), eq(ryzeWorkerCommands.workerId, workerId))).orderBy(desc(ryzeWorkerCommands.id)).limit(1);
  return rows[0];
}

export async function addWorkerEvent(userId: number, input: { workerId: string; level: "info" | "warning" | "error"; eventType: string; message: string }) {
  const db = await requireDb();
  await db.insert(ryzeWorkerEvents).values({ userId, workerId: input.workerId, level: input.level, eventType: input.eventType, message: input.message.slice(0, 2000) });
}
