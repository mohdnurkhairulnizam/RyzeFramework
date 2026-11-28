import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { runOneShotProjection } from "./mempalaceOneShotProjector";
import { manifestSha256, type ProjectionApproval } from "./mempalaceProjectionApproval";
import type { MemoryEntry, MemoryProvider } from "./memoryProvider";
import type { MemPalaceBridge, MemPalaceDrawer } from "./memPalaceMemoryProvider";
import type { MemPalaceProjectionOutbox, ProjectionOutboxItem, ProjectionReplayReport, ProjectionOutboxHealth } from "./mempalaceProjectionOutbox";

const commit = "4df7b830ff1398332d4118884520a24f1aab9cc1";
const namespace = "ryze-production-main";
const branch = "main";
const ids = [
  "mem_-2qbyC9Kbh5-UC", "mem_BlyK9b0O92DZSA", "mem_O45yGyaYlLSfyo", "mem_R-ON8F2uJ5CdwG",
  "mem_U13_XNowUjMPPs", "mem_WFQ544hMMuM-QX", "mem_j2Iwoz7u8HdfVE", "mem_vdMi4w6okjaoYd",
];
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function entry(id: string, index: number): MemoryEntry {
  return {
    id, ownerId: 1, category: index === 5 ? "experience" : "personal", memoryType: "preference",
    content: `synthetic-safe-content-${index}`, tags: [], version: 1, status: "active", sensitivity: "normal",
    source: { sourceSystemId: "local-ryze", branchId: branch, sourceRef: `redacted://fixture/${index}` },
    createdBy: "owner", createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

function fixture() {
  const entries = ids.map(entry);
  const manifest = {
    format: "ryze-mempalace-projection-dry-run-v1" as const, mode: "dry-run" as const, writesPerformed: false as const,
    provider: { name: "mempalace" as const, commit }, namespace, branch, recordCount: entries.length,
    operations: entries.map(item => ({ operation: "upsert_projection" as const, ryzeMemoryId: item.id, ownerId: item.ownerId,
      category: item.category, memoryType: item.memoryType, version: item.version, sensitivity: item.sensitivity,
      tagsHash: sha256(JSON.stringify(item.tags)), sanitizedContentHash: sha256(item.content), sourceRefClass: "redacted-reference" as const })),
  };
  const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
  const approval: ProjectionApproval = { manifestSha256: manifestSha256(manifestJson), providerCommit: commit, namespace, branch, operationCount: 8, expiresAt: "2099-01-01T00:00:00.000Z" };
  const records = new Map(entries.map(item => [item.id, item]));
  const canonical: MemoryProvider = {
    name: "fixture",
    retrieve: async (_ownerId, memoryId) => records.get(memoryId) ?? null,
    store: async () => { throw new Error("not used"); }, search: async () => [], update: async () => { throw new Error("not used"); },
    archive: async () => undefined, delete: async () => undefined, getProjectContext: async () => [], getHistoricalExperiences: async () => [],
    recordOutcome: async () => { throw new Error("not used"); }, reflect: async () => ({ ownerId: 1, entries: [], note: "fixture" }),
  };
  const added: MemPalaceDrawer[] = [];
  const bridge: MemPalaceBridge = {
    addDrawer: async drawer => { added.push(drawer); return { drawerId: drawer.drawerId }; },
    deleteDrawer: async () => undefined, search: async () => [],
  };
  const items: ProjectionOutboxItem[] = [];
  const outbox: MemPalaceProjectionOutbox = {
    enqueue: async item => { items.push(item); }, recoverAfterRestart: async () => undefined,
    replay: async (_bridge, maxItems = 100): Promise<ProjectionReplayReport> => ({ attempted: Math.min(items.length, maxItems), applied: Math.min(items.length, maxItems), failed: 0 }),
    getHealth: async (): Promise<ProjectionOutboxHealth> => ({ pending: 0, inFlight: 0, applied: items.length, failed: 0 }),
  };
  return { manifestJson, approval, canonical, bridge, outbox, added, items };
}

describe("manifest-driven one-shot MemPalace projector", () => {
  it("validates and enqueues exactly the approved eight records", async () => {
    const f = fixture();
    const report = await runOneShotProjection({ ...f, mode: "projection-only", providerRevision: commit, namespace, branch });
    expect(report).toMatchObject({ status: "completed", operationCount: 8, validated: 8, attempted: 8, applied: 8, failed: 0 });
    expect(f.items).toHaveLength(8);
    expect(f.added).toHaveLength(0); // the fixture outbox records the bounded replay without contacting a provider
  });

  it("fails closed on a canonical hash mismatch before enqueueing", async () => {
    const f = fixture();
    const original = f.canonical.retrieve;
    f.canonical.retrieve = async (ownerId, memoryId) => {
      const record = await original(ownerId, memoryId);
      return record && memoryId === ids[0] ? { ...record, content: "changed" } : record;
    };
    const report = await runOneShotProjection({ ...f, mode: "projection-only", providerRevision: commit, namespace, branch });
    expect(report.status).toBe("failed");
    expect(report.validated).toBe(0);
    expect(f.items).toHaveLength(0);
  });

  it("refuses any mode other than explicit projection-only", async () => {
    const f = fixture();
    const report = await runOneShotProjection({ ...f, mode: "disabled", providerRevision: commit, namespace, branch });
    expect(report.status).toBe("failed");
    expect(report.error).toContain("mode must be projection-only");
    expect(f.items).toHaveLength(0);
  });
});
