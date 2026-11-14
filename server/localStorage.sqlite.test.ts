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
});
