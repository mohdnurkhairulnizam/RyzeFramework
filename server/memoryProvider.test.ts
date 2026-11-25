import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const dataRoot = mkdtempSync(path.join(os.tmpdir(), "ryze-memory-provider-test-"));
vi.stubEnv("RYZE_DATA_DIR", dataRoot);
vi.stubEnv("RYZE_LOCAL_OWNER_OPEN_ID", "provider-owner");

const db = await import("./db");
const { sqliteMemoryProvider } = await import("./sqliteMemoryProvider");

let ownerId: number;
let otherId: number;

beforeAll(async () => {
  await db.getDb();
  const owner = await db.ensureLocalOwner();
  ownerId = owner.id;
  await db.upsertUser({ openId: "provider-other", name: "Other", role: "user" });
  otherId = (await db.getUserByOpenId("provider-other"))!.id;
});

afterAll(async () => {
  await db.closeDb();
  vi.unstubAllEnvs();
  rmSync(dataRoot, { recursive: true, force: true });
});

describe("SQLite MemoryProvider fallback", () => {
  it("stores, retrieves, searches, and isolates owner memory", async () => {
    const entry = await sqliteMemoryProvider.store({
      ownerId,
      category: "personal",
      memoryType: "preference",
      content: "Prefer concise technical reports",
      tags: ["writing"],
      createdBy: "owner",
    });
    expect(entry).toMatchObject({ category: "personal", memoryType: "preference", version: 1, status: "active" });
    expect((await sqliteMemoryProvider.retrieve(ownerId, entry.id))?.content).toBe("Prefer concise technical reports");
    expect(await sqliteMemoryProvider.retrieve(otherId, entry.id)).toBeNull();
    expect((await sqliteMemoryProvider.search({ ownerId, query: "concise technical" }))[0]?.id).toBe(entry.id);
  });

  it("updates append-first and preserves the prior revision as archived", async () => {
    const original = await sqliteMemoryProvider.store({ ownerId, category: "experience", memoryType: "procedural", content: "Use the first workflow", tags: ["workflow"] });
    const replacement = await sqliteMemoryProvider.update(ownerId, original.id, { content: "Use the reviewed workflow", tags: ["workflow", "reviewed"], source: { sourceRef: original.id } });
    expect(replacement.id).not.toBe(original.id);
    expect(replacement.source.derivedFrom).toEqual([original.id]);
    expect((await sqliteMemoryProvider.retrieve(ownerId, original.id))?.status).toBe("archived");
    expect((await sqliteMemoryProvider.search({ ownerId, query: "reviewed workflow" }))[0]?.id).toBe(replacement.id);
  });

  it("supports project context, outcomes, reflection, archive, and deletion", async () => {
    const project = await sqliteMemoryProvider.store({ ownerId, category: "experience", memoryType: "project", content: "Ryze Telegram project uses bounded delivery", tags: ["telegram", "ryze"] });
    expect((await sqliteMemoryProvider.getProjectContext(ownerId, "Telegram"))[0]?.id).toBe(project.id);
    const outcome = await sqliteMemoryProvider.recordOutcome({ ownerId, content: "Retry succeeded after provider timeout", tags: ["retry"], success: true, sourceRef: "task_test" });
    expect(outcome.outcome).toBe("SUCCESS");
    expect((await sqliteMemoryProvider.getHistoricalExperiences(ownerId, "provider timeout"))[0]?.id).toBe(outcome.id);
    expect((await sqliteMemoryProvider.reflect(ownerId, "provider", 5)).note).toContain("SQLite fallback");
    await sqliteMemoryProvider.archive(ownerId, project.id);
    expect((await sqliteMemoryProvider.retrieve(ownerId, project.id))?.status).toBe("archived");
    await sqliteMemoryProvider.delete(ownerId, project.id);
    expect(await sqliteMemoryProvider.retrieve(ownerId, project.id)).toBeNull();
  });
});
