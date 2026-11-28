import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const dataRoot = mkdtempSync(path.join(os.tmpdir(), "ryze-mempalace-outbox-"));
vi.stubEnv("RYZE_DATA_DIR", dataRoot);
vi.stubEnv("RYZE_LOCAL_OWNER_OPEN_ID", "mempalace-outbox-owner");

const db = await import("./db");
const { SqliteMemPalaceProjectionOutbox } = await import("./mempalaceProjectionOutbox");

const drawer = {
  drawerId: "ryze:mem_fixture:v1",
  content: "Synthetic durable projection fixture",
  metadata: {
    ryzeMemoryId: "mem_fixture",
    ownerId: 1,
    category: "experience" as const,
    memoryType: "episodic" as const,
    version: 1,
    branchId: "main",
    sensitivity: "normal" as const,
    sourceSystemId: "local-ryze",
    sourceRef: "outbox-test",
  },
};

beforeAll(async () => {
  await db.getDb();
  await db.ensureLocalOwner();
});

afterAll(async () => {
  await db.closeDb();
  vi.unstubAllEnvs();
  rmSync(dataRoot, { recursive: true, force: true });
});

describe("durable MemPalace projection outbox", () => {
  it("deduplicates a projection key and replays it after a simulated restart", async () => {
    const outbox = new SqliteMemPalaceProjectionOutbox();
    await outbox.enqueue({ userId: 1, memoryId: drawer.metadata.ryzeMemoryId, operation: "upsert", projectionKey: drawer.drawerId, drawer });
    await outbox.enqueue({ userId: 1, memoryId: drawer.metadata.ryzeMemoryId, operation: "upsert", projectionKey: drawer.drawerId, drawer: { ...drawer, content: "Latest canonical fixture" } });
    expect((await db.listMemoryProjections("pending"))).toHaveLength(1);

    const claimed = await db.claimNextMemoryProjection();
    expect(claimed?.status).toBe("in_flight");
    await outbox.recoverAfterRestart();
    expect((await db.listMemoryProjections("pending"))).toHaveLength(1);

    const addDrawer = vi.fn(async () => ({ drawerId: drawer.drawerId }));
    const report = await outbox.replay({
      addDrawer,
      search: vi.fn(async () => []),
      deleteDrawer: vi.fn(async () => undefined),
    });
    expect(report).toEqual({ attempted: 1, applied: 1, failed: 0 });
    expect(addDrawer).toHaveBeenCalledWith(expect.objectContaining({ content: "Latest canonical fixture" }));
    expect((await db.listMemoryProjections("applied"))).toHaveLength(1);
    await expect(outbox.getHealth()).resolves.toMatchObject({ pending: 0, inFlight: 0, applied: 1, failed: 0 });
  });

  it("retains failed work and replays it successfully when the provider recovers", async () => {
    const outbox = new SqliteMemPalaceProjectionOutbox();
    const key = "ryze:mem_failure:v1";
    await outbox.enqueue({ userId: 1, memoryId: "mem_failure", operation: "upsert", projectionKey: key, drawer: { ...drawer, drawerId: key, metadata: { ...drawer.metadata, ryzeMemoryId: "mem_failure" } } });
    const failing = {
      addDrawer: vi.fn(async () => { throw new Error("synthetic provider unavailable"); }),
      search: vi.fn(async () => []),
      deleteDrawer: vi.fn(async () => undefined),
    };
    expect(await outbox.replay(failing)).toEqual({ attempted: 1, applied: 0, failed: 1 });
    expect((await db.listMemoryProjections("failed"))[0]?.lastError).toContain("provider unavailable");

    const recovered = {
      addDrawer: vi.fn(async () => ({ drawerId: key })),
      search: vi.fn(async () => []),
      deleteDrawer: vi.fn(async () => undefined),
    };
    expect(await outbox.replay(recovered)).toEqual({ attempted: 1, applied: 1, failed: 0 });
    expect((await db.listMemoryProjections("failed"))).toHaveLength(0);
  });

  it("reconciles a deletion as an idempotent durable operation", async () => {
    const outbox = new SqliteMemPalaceProjectionOutbox();
    const key = "ryze:mem_delete:v1";
    await outbox.enqueue({ userId: 1, memoryId: "mem_delete", operation: "delete", projectionKey: `delete:${key}`, drawer: { ...drawer, drawerId: key, metadata: { ...drawer.metadata, ryzeMemoryId: "mem_delete" } } });
    const deleteDrawer = vi.fn(async () => undefined);
    const report = await outbox.replay({ addDrawer: vi.fn(async () => ({ drawerId: key })), search: vi.fn(async () => []), deleteDrawer });
    expect(report.applied).toBe(1);
    expect(deleteDrawer).toHaveBeenCalledWith(key);
    expect((await db.listMemoryProjections("applied"))).toHaveLength(3);
  });
});
