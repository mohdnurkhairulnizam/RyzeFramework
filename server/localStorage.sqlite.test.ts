import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const dataRoot = mkdtempSync(path.join(os.tmpdir(), "ryze-local-test-"));
vi.stubEnv("RYZE_DATA_DIR", dataRoot);
vi.stubEnv("RYZE_LOCAL_OWNER_OPEN_ID", "ryze-test-owner");

const db = await import("./db");
const storage = await import("./storage");

beforeAll(async () => {
  await db.getDb();
});

afterAll(async () => {
  await db.closeDb();
  vi.unstubAllEnvs();
  rmSync(dataRoot, { recursive: true, force: true });
});

describe("local SQLite and file storage", () => {
  it("runs the SQLite baseline and creates one owner with isolated settings", async () => {
    const owner = await db.ensureLocalOwner();
    expect(owner.openId).toBe("ryze-test-owner");
    expect(owner.role).toBe("admin");
    const settings = await db.ensureSettings(owner.id);
    expect(settings.demoMode).toBe(true);
    expect(settings.externalLlmEnabled).toBe(false);
    expect(settings.telegramEnabled).toBe(false);
  });

  it("supports SQLite upserts and persists task records with Date values", async () => {
    const owner = await db.getUserByOpenId("ryze-test-owner");
    expect(owner).toBeTruthy();
    await db.upsertUser({ openId: owner!.openId, name: "Updated Local Owner", role: "admin" });
    const updated = await db.getUserByOpenId(owner!.openId);
    expect(updated?.name).toBe("Updated Local Owner");
    expect(updated?.role).toBe("admin");

    const session = await db.createSession(owner!.id, "Local test");
    const task = await db.createTask(owner!.id, session.id, "Remember a test setting", "remember");
    await db.addTaskLog(owner!.id, task.id, "system", "info", "SQLite task log");
    const dashboard = await db.getDashboard(owner!.id);
    expect(dashboard.sessions[0]?.id).toBe(session.id);
    expect(dashboard.tasks[0]?.id).toBe(task.id);
    expect(dashboard.logs[0]?.message).toBe("SQLite task log");
    expect(dashboard.tasks[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("writes local file bytes safely and rejects traversal keys", async () => {
    const payload = Buffer.from("private local test file\n", "utf8");
    const { key } = await storage.storagePut("ryze/1/uploads/test.txt", payload, "text/plain");
    const location = await storage.getStoredFilePath(key);
    expect(readFileSync(location).equals(payload)).toBe(true);
    const owner = await db.getUserByOpenId("ryze-test-owner");
    const otherOpenId = "ryze-test-other-owner";
    await db.upsertUser({ openId: otherOpenId, name: "Other owner", role: "user" });
    const other = await db.getUserByOpenId(otherOpenId);
    const metadata = await db.saveFileMetadata(owner!.id, {
      storageKey: key,
      originalName: "test.txt",
      mimeType: "text/plain",
      byteSize: payload.length,
      category: "uploads",
      source: "upload",
    });
    expect(metadata.url).toBe(`/api/files/${metadata.id}/download`);
    expect(await db.getFileForUser(metadata.id, owner!.id)).toMatchObject({ id: metadata.id, userId: owner!.id });
    expect(await db.getFileForUser(metadata.id, other!.id)).toBeNull();
    await expect(storage.getStoredFilePath("../../etc/passwd")).rejects.toThrow(/Invalid local storage key/);
    await expect(storage.getStoredFilePath("ryze/1/../../outside.txt")).rejects.toThrow(/Invalid local storage key/);
  });

  it("preserves legacy memory while requiring explicit classification for new Stage 2 records", async () => {
    const owner = await db.getUserByOpenId("ryze-test-owner");
    expect(owner).toBeTruthy();
    await db.addMemory(owner!.id, { scope: "core", kind: "legacy", content: "An old unclassified fact", tags: ["legacy"] });
    const legacy = await db.searchMemory(owner!.id, "old unclassified fact");
    expect(legacy[0]).toMatchObject({ content: "An old unclassified fact", scope: "core", legacyScope: "core", status: "legacy_unclassified" });
    expect(legacy[0]?.category).toBeNull();

    await db.addMemory(owner!.id, { scope: "core", kind: "preference", category: "personal", memoryType: "preference", createdBy: "owner", content: "Use concise English", tags: ["style"] });
    const classified = await db.searchClassifiedMemory(owner!.id, { query: "concise English", category: "personal", memoryType: "preference" });
    expect(classified[0]).toMatchObject({ category: "personal", memoryType: "preference", status: "active", ownerScope: `owner:${owner!.id}`, version: 1 });
    expect(classified[0]?.sourceSystemId).toBe("local-ryze");
  });

  it("keeps identity revisions and protected System Memory owner-scoped", async () => {
    const owner = await db.getUserByOpenId("ryze-test-owner");
    const otherOpenId = "ryze-stage2-other-owner";
    await db.upsertUser({ openId: otherOpenId, name: "Other Stage 2 owner", role: "user" });
    const other = await db.getUserByOpenId(otherOpenId);
    expect(owner && other).toBeTruthy();

    const identity = await db.ensureRyzeIdentity(owner!.id);
    expect(identity).toMatchObject({ name: "Ryze", version: 1, userId: owner!.id });
    await db.updateRyzeIdentity(owner!.id, { name: "Ryze", role: identity!.role, description: identity!.description, communicationStyle: "Short and clear.", workingPrinciples: identity!.workingPrinciples });
    expect((await db.listIdentityRevisions(owner!.id)).map(revision => revision.version)).toEqual([2, 1]);

    const system = await db.createSystemMemory(owner!.id, { memoryType: "procedural", content: "Keep provider credentials local", tags: ["security"] });
    expect((await db.searchSystemMemory(owner!.id, "credentials"))[0]).toMatchObject({ id: system.id, userId: owner!.id, memoryType: "procedural", createdBy: "owner" });
    expect(await db.searchSystemMemory(other!.id, "credentials")).toHaveLength(0);
  });
});
