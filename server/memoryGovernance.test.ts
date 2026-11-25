import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const dataRoot = mkdtempSync(path.join(os.tmpdir(), "ryze-memory-governance-test-"));
vi.stubEnv("RYZE_DATA_DIR", dataRoot);
vi.stubEnv("RYZE_LOCAL_OWNER_OPEN_ID", "governance-owner");

const db = await import("./db");
const { sqliteMemoryProvider } = await import("./sqliteMemoryProvider");
const { buildRetrievalContext, createReviewedMemory, reviewMemory } = await import("./memoryGovernance");

let ownerId: number;
let otherId: number;

beforeAll(async () => {
  await db.getDb();
  ownerId = (await db.ensureLocalOwner()).id;
  await db.upsertUser({ openId: "governance-other", name: "Other", role: "user" });
  otherId = (await db.getUserByOpenId("governance-other"))!.id;
});

afterAll(async () => {
  await db.closeDb();
  vi.unstubAllEnvs();
  rmSync(dataRoot, { recursive: true, force: true });
});

describe("Gate 3 memory governance", () => {
  it("returns exact duplicates without silently creating another record", async () => {
    const input = { ownerId, category: "personal" as const, memoryType: "preference" as const, content: "Prefer compact reports", tags: ["writing"], createdBy: "owner" as const };
    const first = await createReviewedMemory({ ...input, ownerConfirmed: true });
    const second = await createReviewedMemory({ ...input, ownerConfirmed: true });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.entry.id).toBe(first.entry.id);
    expect((await sqliteMemoryProvider.search({ ownerId, query: "compact reports" })).filter(item => item.content === input.content)).toHaveLength(1);
  });

  it("requires confirmation for a conflicting same-scope record", async () => {
    const input = { ownerId, category: "experience" as const, memoryType: "procedural" as const, content: "Use the reviewed workflow", tags: ["workflow"], createdBy: "owner" as const };
    await sqliteMemoryProvider.store({ ...input, content: "Use the legacy workflow" });
    const review = await reviewMemory(input);
    expect(review.decision).toBe("conflict");
    expect(review.requiresOwnerReview).toBe(true);
    await expect(createReviewedMemory({ ...input, ownerConfirmed: false })).rejects.toThrow("Owner confirmation");
  });

  it("bounds excerpts, excludes restricted entries by default, and isolates owners", async () => {
    const restricted = await sqliteMemoryProvider.store({ ownerId, category: "personal", memoryType: "semantic", content: `PrivateRestricted ${"R".repeat(1000)}`, sensitivity: "restricted", tags: ["private"] });
    await sqliteMemoryProvider.store({ ownerId: otherId, category: "personal", memoryType: "semantic", content: "Other owner secret", tags: ["private"] });
    const context = await buildRetrievalContext({ ownerId, query: "PrivateRestricted" });
    expect(context.entries).toHaveLength(0);
    expect(context.excludedRestricted).toBe(1);
    const permitted = await buildRetrievalContext({ ownerId, query: "PrivateRestricted", includeRestricted: true });
    expect(permitted.entries[0]?.id).toBe(restricted.id);
    expect(permitted.entries[0]?.excerpt.length).toBeLessThanOrEqual(601);
    expect(permitted.entries.some(entry => entry.excerpt.includes("Other owner"))).toBe(false);
  });
});
