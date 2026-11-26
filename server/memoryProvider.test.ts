import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import Database from "better-sqlite3";
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

  it("keeps current search active-only, resolves history intent, and distinguishes similarly named projects", async () => {
    await db.upsertUser({ openId: "provider-history-owner", name: "History Test", role: "user" });
    const retrievalOwnerId = (await db.getUserByOpenId("provider-history-owner"))!.id;
    const r1 = await sqliteMemoryProvider.store({ ownerId: retrievalOwnerId, category: "personal", memoryType: "preference", content: "Prefer concise, one-paragraph weekly project updates." });
    const r2 = await sqliteMemoryProvider.store({ ownerId: retrievalOwnerId, category: "personal", memoryType: "preference", content: "For weekly project reports, use no more than five bullets." });
    const r3 = await sqliteMemoryProvider.store({ ownerId: retrievalOwnerId, category: "experience", memoryType: "project", content: "Atlas project decision: use local SQLite persistence for the Atlas workstream." });
    const r4 = await sqliteMemoryProvider.store({ ownerId: retrievalOwnerId, category: "experience", memoryType: "project", content: "Atlas 2 is a separate Telegram onboarding project; do not treat it as the Atlas persistence workstream." });

    await db.closeDb();
    const raw = new Database(path.join(dataRoot, "data", "ryze.sqlite"));
    try {
      const update = raw.prepare("UPDATE ryze_memory SET createdAt = ?, updatedAt = ?, status = ? WHERE id = ? AND userId = ?");
      update.run(Date.parse("2026-09-02T12:00:00.000Z"), Date.parse("2026-09-02T12:00:00.000Z"), "superseded", r1.id, retrievalOwnerId);
      update.run(Date.parse("2026-11-01T12:00:00.000Z"), Date.parse("2026-11-01T12:00:00.000Z"), "active", r2.id, retrievalOwnerId);
      update.run(Date.parse("2026-10-01T12:00:00.000Z"), Date.parse("2026-10-01T12:00:00.000Z"), "active", r3.id, retrievalOwnerId);
      update.run(Date.parse("2026-10-02T12:00:00.000Z"), Date.parse("2026-10-02T12:00:00.000Z"), "active", r4.id, retrievalOwnerId);
    } finally {
      raw.close();
      await db.getDb();
    }

    const current = await sqliteMemoryProvider.search({ ownerId: retrievalOwnerId, query: "How should I format the current weekly project reports?", category: "personal", memoryType: "preference" });
    expect(current.map(entry => entry.id)).toEqual([r2.id]);
    const earlier = await sqliteMemoryProvider.search({ ownerId: retrievalOwnerId, query: "What was my earlier style for weekly project updates?", category: "personal", memoryType: "preference" });
    expect(earlier.map(entry => entry.id)).toEqual([r1.id]);
    const inventory = await sqliteMemoryProvider.search({ ownerId: retrievalOwnerId, query: "List my Personal Preference records about weekly report format.", category: "personal", memoryType: "preference" });
    expect(new Set(inventory.map(entry => entry.id))).toEqual(new Set([r1.id, r2.id]));
    const history = await sqliteMemoryProvider.search({ ownerId: retrievalOwnerId, query: "Show both the earlier and current weekly-report preferences in date order.", limit: 12 });
    expect(history.map(entry => entry.id)).toEqual([r1.id, r2.id]);

    const atlasPersistence = await sqliteMemoryProvider.search({ ownerId: retrievalOwnerId, query: "What persistence decision was made for the Atlas project?" });
    expect(atlasPersistence.map(entry => entry.id)).toEqual([r3.id]);
    const atlasOnboarding = await sqliteMemoryProvider.search({ ownerId: retrievalOwnerId, query: "Which project is the Telegram onboarding work, Atlas or Atlas 2?" });
    expect(atlasOnboarding.map(entry => entry.id)).toEqual([r4.id]);
    const migrationRule = await sqliteMemoryProvider.store({ ownerId: retrievalOwnerId, category: "experience", memoryType: "semantic", content: "Synthetic migration rule: preserve legacy record IDs, text, tags, outcomes, timestamps, and legacy scope." });
    const retainedFields = await sqliteMemoryProvider.search({ ownerId: retrievalOwnerId, query: "Which fields must the migration retain from legacy records?" });
    expect(retainedFields.map(entry => entry.id)).toContain(migrationRule.id);
    expect(await sqliteMemoryProvider.search({ ownerId: retrievalOwnerId, query: "What music did I listen to while cooking?" })).toEqual([]);
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

  it("stores and retrieves each of the five contract memory types", async () => {
    const fixtures = [
      { category: "experience", memoryType: "episodic", content: "Synthetic episode fixture" },
      { category: "experience", memoryType: "semantic", content: "Synthetic semantic fixture" },
      { category: "experience", memoryType: "procedural", content: "Synthetic procedure fixture" },
      { category: "personal", memoryType: "preference", content: "Synthetic preference fixture" },
      { category: "experience", memoryType: "project", content: "Synthetic project fixture" },
    ] as const;

    for (const fixture of fixtures) {
      const stored = await sqliteMemoryProvider.store({ ownerId, ...fixture });
      const retrieved = await sqliteMemoryProvider.retrieve(ownerId, stored.id);
      expect(retrieved).toMatchObject({
        category: fixture.category,
        memoryType: fixture.memoryType,
        content: fixture.content,
        status: "active",
      });
    }
  });

  it("retains the record and archive state across a SQLite close and reopen", async () => {
    const entry = await sqliteMemoryProvider.store({
      ownerId,
      category: "experience",
      memoryType: "episodic",
      content: "Synthetic restart persistence fixture",
    });
    await sqliteMemoryProvider.archive(ownerId, entry.id);

    await db.closeDb();
    await db.getDb();

    expect(await sqliteMemoryProvider.retrieve(ownerId, entry.id)).toMatchObject({
      id: entry.id,
      content: "Synthetic restart persistence fixture",
      status: "archived",
    });
  });
});
