import { and, desc, eq, inArray, like, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import {
  ryzeFiles,
  ryzeMemory,
  ryzeOpenCodeSessions,
  ryzeSessions,
  ryzeSettings,
  ryzeSkills,
  ryzeTaskLogs,
  ryzeTasks,
  ryzeWorkerCommands,
  ryzeWorkerEvents,
  ryzeWorkers,
  ryzeTelegramAccounts,
  ryzeTelegramAccess,
  ryzeTelegramLogs,
  ryzeIdentityProfiles,
  ryzeIdentityRevisions,
  ryzeSystemMemory,
  type User,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildPortableExport } from "./ryzeExport";
import { filterOwnedRecords, requireOwnedRecord } from "./ryzeOwnership";
import { FILE_RETENTION_MS } from "../shared/fileRetention";

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

function hashTelegramCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function safeTelegramEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function isTemporaryAuthorizationActive(expiresAt: Date | null | undefined, now = Date.now()) {
  return Boolean(expiresAt && expiresAt.getTime() > now);
}

export async function getTelegramControl(userId: number) {
  const db = await requireDb();
  await db.insert(ryzeTelegramAccess).values({ userId }).onConflictDoNothing();
  const [account] = await db.select().from(ryzeTelegramAccounts).where(eq(ryzeTelegramAccounts.userId, userId)).limit(1);
  const [access] = await db.select().from(ryzeTelegramAccess).where(eq(ryzeTelegramAccess.userId, userId)).limit(1);
  const logs = await db.select().from(ryzeTelegramLogs).where(eq(ryzeTelegramLogs.userId, userId)).orderBy(desc(ryzeTelegramLogs.createdAt)).limit(100);
  return { account: account ?? null, access: access ?? null, logs };
}

export async function saveTelegramAccount(userId: number, input: { label: string; phoneMasked: string; telegramUserId?: string; status?: "configured" | "authorized" | "paused" | "removed" }) {
  const db = await requireDb();
  const existing = await db.select({ id: ryzeTelegramAccounts.id }).from(ryzeTelegramAccounts).where(eq(ryzeTelegramAccounts.userId, userId)).limit(1);
  if (existing[0]) await db.update(ryzeTelegramAccounts).set({ ...input, updatedAt: new Date() }).where(and(eq(ryzeTelegramAccounts.id, existing[0].id), eq(ryzeTelegramAccounts.userId, userId)));
  else await db.insert(ryzeTelegramAccounts).values({ userId, label: input.label, phoneMasked: input.phoneMasked, telegramUserId: input.telegramUserId ?? null, status: input.status ?? "configured" });
  const [account] = await db.select().from(ryzeTelegramAccounts).where(eq(ryzeTelegramAccounts.userId, userId)).limit(1);
  return account!;
}

export async function removeTelegramAccount(userId: number) {
  const db = await requireDb();
  await db.update(ryzeTelegramAccounts).set({ status: "removed", updatedAt: new Date() }).where(eq(ryzeTelegramAccounts.userId, userId));
  await db.update(ryzeTelegramAccess).set({ temporaryTelegramUserId: null, temporaryExpiresAt: null, secretCodeHash: null, secretCodeExpiresAt: null, permanentSecretCodeHash: null, updatedAt: new Date() }).where(eq(ryzeTelegramAccess.userId, userId));
  return getTelegramControl(userId);
}

export async function setTelegramAdminIdentity(userId: number, identity: string) {
  const db = await requireDb();
  const normalized = identity.trim();
  const values = normalized.startsWith("@") ? { adminTelegramUserId: null, adminTelegramUsername: normalized.slice(1).toLowerCase() } : { adminTelegramUserId: normalized, adminTelegramUsername: null };
  await db.insert(ryzeTelegramAccess).values({ userId, ...values }).onConflictDoUpdate({ target: ryzeTelegramAccess.userId, set: { ...values, updatedAt: new Date() } });
  return getTelegramControl(userId);
}

export async function setTelegramPermanentCode(userId: number, code: string) {
  const db = await requireDb();
  await db.insert(ryzeTelegramAccess).values({ userId, permanentSecretCodeHash: hashTelegramCode(code.trim()) }).onConflictDoUpdate({ target: ryzeTelegramAccess.userId, set: { permanentSecretCodeHash: hashTelegramCode(code.trim()), updatedAt: new Date() } });
  await addTelegramLog(userId, { direction: "system", messagePreview: "Permanent Telegram recovery code changed.", status: "recovery-code-updated" });
  return getTelegramControl(userId);
}

export async function issueTelegramSecretCode(userId: number) {
  const db = await requireDb();
  const code = crypto.randomBytes(6).toString("hex").toUpperCase();
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await db.insert(ryzeTelegramAccess).values({ userId, secretCodeHash: hashTelegramCode(code), secretCodeExpiresAt: expires }).onConflictDoUpdate({ target: ryzeTelegramAccess.userId, set: { secretCodeHash: hashTelegramCode(code), secretCodeExpiresAt: expires, updatedAt: new Date() } });
  await addTelegramLog(userId, { direction: "system", messagePreview: "Temporary Telegram authorization code generated.", status: "code-issued" });
  return { code, expiresAt: expires };
}

export async function authorizeTelegramSender(userId: number, telegramUserId: string, codeText: string) {
  const db = await requireDb();
  const [access] = await db.select().from(ryzeTelegramAccess).where(eq(ryzeTelegramAccess.userId, userId)).limit(1);
  const suppliedHash = hashTelegramCode(codeText.trim());
  const valid = Boolean(
    (access?.secretCodeHash && access.secretCodeExpiresAt && access.secretCodeExpiresAt.getTime() > Date.now() && safeTelegramEqual(suppliedHash, access.secretCodeHash)) ||
    (access?.permanentSecretCodeHash && safeTelegramEqual(suppliedHash, access.permanentSecretCodeHash))
  );
  if (!valid) return false;
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await db.update(ryzeTelegramAccess).set({ temporaryTelegramUserId: telegramUserId, temporaryExpiresAt: expires, secretCodeHash: null, secretCodeExpiresAt: null, updatedAt: new Date() }).where(eq(ryzeTelegramAccess.userId, userId));
  await addTelegramLog(userId, { direction: "system", telegramUserId, messagePreview: "Temporary Telegram sender authorization accepted.", status: "temporary-authorized" });
  return true;
}

export async function isTelegramSenderAllowed(userId: number, telegramUserId: string, telegramUsername?: string) {
  const db = await requireDb();
  const [access] = await db.select().from(ryzeTelegramAccess).where(eq(ryzeTelegramAccess.userId, userId)).limit(1);
  if (access?.adminTelegramUserId === telegramUserId) return true;
  if (access?.adminTelegramUsername && telegramUsername && access.adminTelegramUsername === telegramUsername.replace(/^@/, "").toLowerCase()) return true;
  return Boolean(access?.temporaryTelegramUserId === telegramUserId && isTemporaryAuthorizationActive(access.temporaryExpiresAt));
}

export async function addTelegramLog(userId: number, input: { direction: "incoming" | "outgoing" | "system"; telegramUserId?: string; chatId?: string; messagePreview: string; status: string; accountId?: number }) {
  const db = await requireDb();
  await db.insert(ryzeTelegramLogs).values({ userId, accountId: input.accountId ?? null, direction: input.direction, telegramUserId: input.telegramUserId ?? null, chatId: input.chatId ?? null, messagePreview: input.messagePreview.slice(0, 500), status: input.status });
}

export async function hasTelegramReplyBeenSent(userId: number, replyKey: string) {
  const db = await requireDb();
  const rows = await db.select({ id: ryzeTelegramLogs.id }).from(ryzeTelegramLogs).where(and(eq(ryzeTelegramLogs.userId, userId), eq(ryzeTelegramLogs.direction, "outgoing"), eq(ryzeTelegramLogs.status, `sent:${replyKey}`))).limit(1);
  return Boolean(rows[0]);
}

export async function hasTelegramReplyRecord(userId: number, replyKey: string) {
  const db = await requireDb();
  const sent = await hasTelegramReplyBeenSent(userId, replyKey);
  if (sent) return true;
  const rows = await db.select({ id: ryzeTelegramLogs.id }).from(ryzeTelegramLogs).where(and(eq(ryzeTelegramLogs.userId, userId), eq(ryzeTelegramLogs.direction, "system"), eq(ryzeTelegramLogs.status, `queued:${replyKey}`))).limit(1);
  return Boolean(rows[0]);
}

export async function getWorkerForUser(userId: number, workerId: string) {
  const db = await requireDb();
  const rows = await db.select().from(ryzeWorkers).where(and(eq(ryzeWorkers.userId, userId), eq(ryzeWorkers.id, workerId))).limit(1);
  return rows[0] ?? null;
}

export async function getWorkerCommand(userId: number, workerId: string, commandId: number) {
  const db = await requireDb();
  const rows = await db.select().from(ryzeWorkerCommands).where(and(eq(ryzeWorkerCommands.userId, userId), eq(ryzeWorkerCommands.workerId, workerId), eq(ryzeWorkerCommands.id, commandId))).limit(1);
  return rows[0] ?? null;
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

export async function getOpenCodeSessionId(userId: number, ryzeSessionId: string) {
  const db = await requireDb();
  const rows = await db.select({ openCodeSessionId: ryzeOpenCodeSessions.openCodeSessionId })
    .from(ryzeOpenCodeSessions)
    .where(and(eq(ryzeOpenCodeSessions.userId, userId), eq(ryzeOpenCodeSessions.ryzeSessionId, ryzeSessionId)))
    .limit(1);
  return rows[0]?.openCodeSessionId ?? null;
}

export async function saveOpenCodeSessionId(userId: number, ryzeSessionId: string, openCodeSessionId: string) {
  const db = await requireDb();
  const ownedSession = await db.select({ id: ryzeSessions.id }).from(ryzeSessions)
    .where(and(eq(ryzeSessions.id, ryzeSessionId), eq(ryzeSessions.userId, userId))).limit(1);
  if (!ownedSession[0]) throw new Error("Cannot link an OpenCode session to a Ryze session owned by another user.");
  await db.insert(ryzeOpenCodeSessions).values({ userId, ryzeSessionId, openCodeSessionId })
    .onConflictDoUpdate({
      target: [ryzeOpenCodeSessions.userId, ryzeOpenCodeSessions.ryzeSessionId],
      set: { openCodeSessionId },
    });
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

type MemoryCategory = "system" | "experience" | "personal";
type MemoryType = "episodic" | "semantic" | "procedural" | "preference" | "project";
type MemorySensitivity = "normal" | "restricted";
const MEMORY_SOURCE_SYSTEM_ID = "local-ryze";

export async function addMemory(userId: number, input: {
  scope: "core" | "evolving"; kind: string; content: string; tags: string[]; outcome?: "SUCCESS" | "FAIL" | "NEUTRAL";
  category?: Exclude<MemoryCategory, "system">; memoryType?: MemoryType; sourceRef?: string;
  createdBy?: "owner" | "ryze_candidate_approved" | "system_process";
}) {
  const db = await requireDb();
  if ((input.category && !input.memoryType) || (!input.category && input.memoryType)) throw new Error("Memory category and type must be supplied together.");
  const classified = Boolean(input.category && input.memoryType);
  await db.insert(ryzeMemory).values({
    id: `mem_${nanoid(14)}`, userId, scope: input.scope, legacyScope: input.scope,
    category: input.category ?? null, memoryType: input.memoryType ?? null, ownerScope: `owner:${userId}`,
    sourceSystemId: classified ? MEMORY_SOURCE_SYSTEM_ID : null, branchId: "main", sourceRef: input.sourceRef ?? null,
    createdBy: input.createdBy ?? (classified ? "system_process" : null), version: classified ? 1 : null,
    status: classified ? "active" : "legacy_unclassified", sensitivity: "normal", syncStatus: "local",
    kind: input.kind.slice(0, 64), content: input.content.slice(0, 5000), tags: JSON.stringify(input.tags.slice(0, 12)), outcome: input.outcome ?? "NEUTRAL",
  });
}

export async function searchClassifiedMemory(userId: number, input: { query?: string; category?: Exclude<MemoryCategory, "system">; memoryType?: MemoryType; limit?: number }) {
  const db = await requireDb();
  const terms = (input.query ?? "").trim().split(/\s+/).filter(term => term.length > 2).slice(0, 5);
  const filters = [eq(ryzeMemory.userId, userId), eq(ryzeMemory.status, "active")];
  if (input.category) filters.push(eq(ryzeMemory.category, input.category));
  if (input.memoryType) filters.push(eq(ryzeMemory.memoryType, input.memoryType));
  if (terms.length) filters.push(like(ryzeMemory.content, `%${terms.join("%")}%`));
  return db.select().from(ryzeMemory).where(and(...filters)).orderBy(desc(ryzeMemory.updatedAt), desc(ryzeMemory.createdAt)).limit(Math.min(Math.max(input.limit ?? 8, 1), 50));
}

export async function getRyzeIdentity(userId: number) {
  const db = await requireDb();
  const [profile] = await db.select().from(ryzeIdentityProfiles).where(and(eq(ryzeIdentityProfiles.userId, userId), eq(ryzeIdentityProfiles.id, `identity_${userId}`))).limit(1);
  return profile ?? null;
}

export async function ensureRyzeIdentity(userId: number) {
  const db = await requireDb();
  const existing = await getRyzeIdentity(userId);
  if (existing) return existing;
  const profile = { id: `identity_${userId}`, userId, name: "Ryze", role: "single-owner local assistant", description: "A careful local assistant for the owner's approved work.", communicationStyle: "Clear, concise, and explicit about uncertainty and boundaries.", workingPrinciples: "Protect owner data, preserve sources, use bounded actions, and never bypass permissions.", version: 1 } as const;
  await db.insert(ryzeIdentityProfiles).values(profile);
  await db.insert(ryzeIdentityRevisions).values({ id: `identity_revision_${userId}_1`, profileId: profile.id, userId: profile.userId, name: profile.name, role: profile.role, description: profile.description, communicationStyle: profile.communicationStyle, workingPrinciples: profile.workingPrinciples, version: profile.version, changedBy: "system_process" });
  return getRyzeIdentity(userId);
}

export async function listIdentityRevisions(userId: number) {
  const db = await requireDb();
  return db.select().from(ryzeIdentityRevisions).where(eq(ryzeIdentityRevisions.userId, userId)).orderBy(desc(ryzeIdentityRevisions.version));
}

export async function updateRyzeIdentity(userId: number, input: { name: string; role: string; description: string; communicationStyle: string; workingPrinciples: string }) {
  const db = await requireDb();
  const current = await ensureRyzeIdentity(userId);
  const version = current!.version + 1;
  const values = { name: input.name.trim().slice(0, 120), role: input.role.trim().slice(0, 240), description: input.description.trim().slice(0, 2000), communicationStyle: input.communicationStyle.trim().slice(0, 2000), workingPrinciples: input.workingPrinciples.trim().slice(0, 4000) };
  await db.insert(ryzeIdentityRevisions).values({ id: `identity_revision_${userId}_${version}`, profileId: current!.id, userId, ...values, version, changedBy: "owner" });
  await db.update(ryzeIdentityProfiles).set({ ...values, version, updatedAt: new Date() }).where(and(eq(ryzeIdentityProfiles.id, current!.id), eq(ryzeIdentityProfiles.userId, userId)));
  return getRyzeIdentity(userId);
}

export async function createSystemMemory(userId: number, input: { memoryType: MemoryType; content: string; tags: string[]; sourceRef?: string; derivedFrom?: string; sensitivity?: MemorySensitivity }) {
  const db = await requireDb();
  const id = `sysmem_${nanoid(14)}`;
  await db.insert(ryzeSystemMemory).values({ id, userId, memoryType: input.memoryType, content: input.content.slice(0, 5000), tags: JSON.stringify(input.tags.slice(0, 12)), sourceSystemId: MEMORY_SOURCE_SYSTEM_ID, branchId: "main", sourceRef: input.sourceRef ?? null, derivedFrom: input.derivedFrom ?? null, createdBy: "owner", version: 1, status: "active", sensitivity: input.sensitivity ?? "normal", syncStatus: "local" });
  const [created] = await db.select().from(ryzeSystemMemory).where(and(eq(ryzeSystemMemory.id, id), eq(ryzeSystemMemory.userId, userId))).limit(1);
  return created!;
}

export async function searchSystemMemory(userId: number, query?: string) {
  const db = await requireDb();
  const terms = (query ?? "").trim().split(/\s+/).filter(term => term.length > 2).slice(0, 5);
  const where = terms.length ? and(eq(ryzeSystemMemory.userId, userId), eq(ryzeSystemMemory.status, "active"), like(ryzeSystemMemory.content, `%${terms.join("%")}%`)) : and(eq(ryzeSystemMemory.userId, userId), eq(ryzeSystemMemory.status, "active"));
  return db.select().from(ryzeSystemMemory).where(where).orderBy(desc(ryzeSystemMemory.updatedAt)).limit(20);
}

export async function listSystemMemory(userId: number) {
  const db = await requireDb();
  return db.select().from(ryzeSystemMemory).where(eq(ryzeSystemMemory.userId, userId)).orderBy(desc(ryzeSystemMemory.updatedAt));
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

export async function saveFileMetadata(userId: number, input: { taskId?: string; storageKey: string; originalName: string; mimeType: string; byteSize: number; category: string; source: "upload" | "generated"; telegramOrigin?: { chatId: string; senderId: string; messageId: string } }) {
  const db = await requireDb();
  const id = `file_${nanoid(14)}`;
  const file = { id, userId, taskId: input.taskId ?? null, storageKey: input.storageKey, url: `/api/files/${id}/download`, originalName: input.originalName, mimeType: input.mimeType, byteSize: input.byteSize, category: input.category, source: input.source, telegramChatId: input.telegramOrigin?.chatId ?? null, telegramSenderId: input.telegramOrigin?.senderId ?? null, telegramMessageId: input.telegramOrigin?.messageId ?? null };
  await db.insert(ryzeFiles).values(file);
  return file;
}

export async function saveTelegramFileMetadata(userId: number, input: { storageKey: string; originalName: string; mimeType: string; byteSize: number; chatId: string; senderId: string; messageId: string }) {
  const db = await requireDb();
  const existing = await db.select().from(ryzeFiles).where(and(
    eq(ryzeFiles.userId, userId),
    eq(ryzeFiles.telegramChatId, input.chatId),
    eq(ryzeFiles.telegramMessageId, input.messageId),
  )).limit(1);
  if (existing[0]) return existing[0];
  const id = `file_${nanoid(14)}`;
  const file = {
    id, userId, taskId: null, storageKey: input.storageKey, url: `/api/files/${id}/download`,
    originalName: input.originalName, mimeType: input.mimeType, byteSize: input.byteSize,
    category: "uploads", source: "telegram" as const, telegramChatId: input.chatId,
    telegramSenderId: input.senderId, telegramMessageId: input.messageId,
  };
  await db.insert(ryzeFiles).values(file).onConflictDoNothing();
  const [saved] = await db.select().from(ryzeFiles).where(and(
    eq(ryzeFiles.userId, userId),
    eq(ryzeFiles.telegramChatId, input.chatId),
    eq(ryzeFiles.telegramMessageId, input.messageId),
  )).limit(1);
  if (!saved) throw new Error("Telegram file metadata could not be persisted.");
  return saved;
}

export async function getLatestTelegramFile(userId: number, chatId: string, senderId: string) {
  const db = await requireDb();
  const rows = await db.select().from(ryzeFiles).where(and(
    eq(ryzeFiles.userId, userId),
    eq(ryzeFiles.telegramChatId, chatId),
    eq(ryzeFiles.telegramSenderId, senderId),
  )).orderBy(desc(ryzeFiles.createdAt)).limit(1);
  const file = rows[0] ?? null;
  return file && file.createdAt.getTime() + FILE_RETENTION_MS > Date.now() ? file : null;
}

export async function getTelegramFileByOrigin(userId: number, chatId: string, messageId: string) {
  const db = await requireDb();
  const rows = await db.select().from(ryzeFiles).where(and(
    eq(ryzeFiles.userId, userId),
    eq(ryzeFiles.telegramChatId, chatId),
    eq(ryzeFiles.telegramMessageId, messageId),
  )).limit(1);
  return rows[0] ?? null;
}

export async function listFiles(userId: number) {
  const db = await requireDb();
  const files = await db.select().from(ryzeFiles).where(eq(ryzeFiles.userId, userId)).orderBy(desc(ryzeFiles.createdAt));
  const cutoff = Date.now() - FILE_RETENTION_MS;
  return files.filter((file) => file.createdAt.getTime() > cutoff);
}
export async function getFileForUser(fileId: string, userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(ryzeFiles).where(and(eq(ryzeFiles.id, fileId), eq(ryzeFiles.userId, userId))).limit(1);
  const file = rows[0] ?? null;
  return file && file.createdAt.getTime() + FILE_RETENTION_MS > Date.now() ? file : null;
}
export async function getFileForDeletion(fileId: string, userId: number) {
  const db = await requireDb();
  const [file] = await db.select().from(ryzeFiles).where(and(eq(ryzeFiles.id, fileId), eq(ryzeFiles.userId, userId))).limit(1);
  return file ?? null;
}
export async function deleteFileMetadataForUser(fileId: string, userId: number) {
  const db = await requireDb();
  await db.delete(ryzeFiles).where(and(eq(ryzeFiles.id, fileId), eq(ryzeFiles.userId, userId)));
}
export async function listExpiredFiles(cutoff: Date) {
  const db = await requireDb();
  return db.select().from(ryzeFiles).where(lte(ryzeFiles.createdAt, cutoff));
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

export function buildUserScopedExport(userId: number, dashboard: any, stage2?: { identity?: unknown; identityRevisions?: unknown[]; systemMemory?: unknown[] }) {
  const scoped = scopeDashboardData(userId, dashboard);
  return buildPortableExport({
    settings: scoped.settings,
    sessions: scoped.sessions,
    tasks: scoped.tasks,
    taskLogs: scoped.logs,
    memory: scoped.memory,
    identity: stage2?.identity,
    identityRevisions: stage2?.identityRevisions,
    systemMemory: stage2?.systemMemory,
    skills: scoped.skills,
    files: scoped.files,
  });
}

export async function exportUserSandbox(userId: number) {
  const [dashboard, identity, identityRevisions, systemMemory] = await Promise.all([
    getDashboard(userId), ensureRyzeIdentity(userId), listIdentityRevisions(userId), listSystemMemory(userId),
  ]);
  return buildUserScopedExport(userId, dashboard, { identity, identityRevisions, systemMemory });
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
    .where(and(eq(ryzeWorkerCommands.userId, userId), eq(ryzeWorkerCommands.workerId, workerId), inArray(ryzeWorkerCommands.status, ["queued", "acknowledged"]), sql`${ryzeWorkerCommands.id} > ${afterId}`))
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
