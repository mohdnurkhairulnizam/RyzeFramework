import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { ryzeFiles } from "../drizzle/schema";
import { FILE_RETENTION_MS, fileExpiresAt, isFileExpired } from "../shared/fileRetention";

const dataRoot = mkdtempSync(path.join(os.tmpdir(), "ryze-file-retention-"));
vi.stubEnv("RYZE_DATA_DIR", dataRoot);
vi.stubEnv("RYZE_LOCAL_OWNER_OPEN_ID", "ryze-file-retention-test");
const db = await import("./db");
const storage = await import("./storage");
const retention = await import("./fileRetention");
let ownerId = 0;

beforeAll(async () => {
  const owner = await db.ensureLocalOwner();
  ownerId = owner.id;
});

afterAll(async () => {
  await db.closeDb();
  vi.unstubAllEnvs();
  rmSync(dataRoot, { recursive: true, force: true });
});

describe("30-day uploaded and generated file retention", () => {
  it("computes the inclusive 30-day expiry boundary", () => {
    const created = new Date("2026-01-01T00:00:00.000Z");
    expect(fileExpiresAt(created).getTime()).toBe(created.getTime() + FILE_RETENTION_MS);
    expect(isFileExpired(created, created.getTime() + FILE_RETENTION_MS - 1)).toBe(false);
    expect(isFileExpired(created, created.getTime() + FILE_RETENTION_MS)).toBe(true);
  });

  it("blocks access to expired file metadata and removes expired bytes and metadata during a sweep", async () => {
    const { key } = await storage.storagePut("ryze/retention/expired.md", "expired payload", "text/markdown");
    const file = await db.saveFileMetadata(ownerId, {
      storageKey: key,
      originalName: "expired.md",
      mimeType: "text/markdown",
      byteSize: Buffer.byteLength("expired payload"),
      category: "uploads",
      source: "upload",
    });
    const database = await db.getDb();
    await database!.update(ryzeFiles).set({ createdAt: new Date(Date.now() - FILE_RETENTION_MS - 1000) }).where(eq(ryzeFiles.id, file.id));

    expect(await db.getFileForUser(file.id, ownerId)).toBeNull();
    expect(await db.listFiles(ownerId)).not.toContainEqual(expect.objectContaining({ id: file.id }));
    expect(await retention.purgeExpiredFiles()).toBe(1);
    expect(await db.getFileForDeletion(file.id, ownerId)).toBeNull();
    await expect(storage.getStoredFilePath(key)).rejects.toThrow();
  });

  it("lets the owner remove a file before its automatic expiry", async () => {
    const { key } = await storage.storagePut("ryze/retention/early.md", "delete early", "text/markdown");
    const file = await db.saveFileMetadata(ownerId, {
      storageKey: key,
      originalName: "early.md",
      mimeType: "text/markdown",
      byteSize: Buffer.byteLength("delete early"),
      category: "uploads",
      source: "upload",
    });
    expect(await retention.deleteUserFile(ownerId, file.id)).toBe(true);
    expect(await db.getFileForDeletion(file.id, ownerId)).toBeNull();
    await expect(storage.getStoredFilePath(key)).rejects.toThrow();
    expect(await retention.deleteUserFile(ownerId, file.id)).toBe(false);
  });

  it("makes expiry cleanup idempotent and preserves a non-expired file", async () => {
    const { key: activeKey } = await storage.storagePut("ryze/retention/active.md", "active payload", "text/markdown");
    const active = await db.saveFileMetadata(ownerId, {
      storageKey: activeKey,
      originalName: "active.md",
      mimeType: "text/markdown",
      byteSize: Buffer.byteLength("active payload"),
      category: "uploads",
      source: "upload",
    });
    const { key: expiredKey } = await storage.storagePut("ryze/retention/expired-again.md", "expired again", "text/markdown");
    const expired = await db.saveFileMetadata(ownerId, {
      storageKey: expiredKey,
      originalName: "expired-again.md",
      mimeType: "text/markdown",
      byteSize: Buffer.byteLength("expired again"),
      category: "uploads",
      source: "upload",
    });
    const database = await db.getDb();
    await database!.update(ryzeFiles).set({ createdAt: new Date(Date.now() - FILE_RETENTION_MS - 1000) }).where(eq(ryzeFiles.id, expired.id));

    expect(await retention.purgeExpiredFiles()).toBe(1);
    expect(await retention.purgeExpiredFiles()).toBe(0);
    expect(await db.getFileForUser(active.id, ownerId)).toMatchObject({ id: active.id });
    expect(await storage.getStoredFilePath(activeKey)).toBeTruthy();
    await expect(storage.getStoredFilePath(expiredKey)).rejects.toThrow();
  });
});
