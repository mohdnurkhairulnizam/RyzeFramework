import { describe, expect, it, vi } from "vitest";
import { InMemoryContractProvider } from "./memoryProviderContract.test";
import { MemPalaceMemoryProvider, type MemPalaceBridge, type MemPalaceDrawer } from "./memPalaceMemoryProvider";
import type { MemPalaceProjectionOutbox, ProjectionOutboxItem, ProjectionReplayReport } from "./mempalaceProjectionOutbox";

function bridgeFor(drawers: MemPalaceDrawer[] = []): MemPalaceBridge {
  return {
    addDrawer: vi.fn(async drawer => {
      drawers.push(drawer);
      return { drawerId: drawer.drawerId };
    }),
    search: vi.fn(async () => drawers),
    deleteDrawer: vi.fn(async drawerId => {
      const index = drawers.findIndex(drawer => drawer.drawerId === drawerId);
      if (index >= 0) drawers.splice(index, 1);
    }),
  };
}

function memoryOutbox() {
  const items: ProjectionOutboxItem[] = [];
  const outbox: MemPalaceProjectionOutbox = {
    enqueue: async item => { items.push(item); },
    replay: async (): Promise<ProjectionReplayReport> => ({ attempted: 0, applied: 0, failed: 0 }),
    recoverAfterRestart: async () => undefined,
    getHealth: async () => ({ pending: items.length, inFlight: 0, applied: 0, failed: 0 }),
  };
  return { outbox, items };
}

describe("MemPalace SQLite-first projection adapter", () => {
  it("keeps canonical writes in SQLite and leaves derived search disabled by default", async () => {
    const canonical = new InMemoryContractProvider();
    const bridge = bridgeFor();
    const provider = new MemPalaceMemoryProvider({ canonical, bridge });

    const entry = await provider.store({
      ownerId: 101,
      category: "experience",
      memoryType: "project",
      content: "Synthetic MemPalace adapter fixture",
      source: { sourceRef: "gate1" },
    });

    expect(await canonical.retrieve(101, entry.id)).toMatchObject({ content: entry.content });
    expect(provider.projectionStatus).toMatchObject({ enabled: true, searchable: false, projected: 1, failed: 0 });
    expect(await provider.search({ ownerId: 101, query: "Synthetic MemPalace" })).toHaveLength(1);
    expect(bridge.search).not.toHaveBeenCalled();
    expect(bridge.addDrawer).toHaveBeenCalledTimes(1);
  });

  it("rehydrates only current, owner-scoped canonical records when derived search is enabled", async () => {
    const canonical = new InMemoryContractProvider();
    const drawers: MemPalaceDrawer[] = [];
    const bridge = bridgeFor(drawers);
    const provider = new MemPalaceMemoryProvider({ canonical, bridge, searchDerivedCandidates: true });
    const entry = await provider.store({ ownerId: 101, category: "personal", memoryType: "preference", content: "Synthetic owner preference" });
    await canonical.store({ ownerId: 202, category: "personal", memoryType: "preference", content: "Other owner preference" });

    const found = await provider.search({ ownerId: 101, query: "preference", limit: 12 });
    expect(found.map(item => item.id)).toEqual([entry.id]);
    expect(bridge.search).toHaveBeenCalledWith({ query: "preference", wing: "owner-101", room: undefined, limit: 12 });
  });

  it("rejects stale, archived, owner-mismatched, and version-mismatched provider hits", async () => {
    const canonical = new InMemoryContractProvider();
    const current = await canonical.store({ ownerId: 101, category: "experience", memoryType: "project", content: "Current canonical project" });
    const archived = await canonical.store({ ownerId: 101, category: "experience", memoryType: "episodic", content: "Archived canonical event" });
    await canonical.archive(101, archived.id);
    const otherOwner = await canonical.store({ ownerId: 202, category: "experience", memoryType: "project", content: "Other owner canonical project" });
    const drawers: MemPalaceDrawer[] = [
      {
        drawerId: `ryze:${current.id}:v1`,
        content: current.content,
        metadata: { ryzeMemoryId: current.id, ownerId: 101, category: current.category, memoryType: current.memoryType, version: 1, branchId: "main", sensitivity: "normal", sourceSystemId: "synthetic", sourceRef: "synthetic://current" },
      },
      {
        drawerId: `ryze:${current.id}:v2`,
        content: "Stale provider revision",
        metadata: { ryzeMemoryId: current.id, ownerId: 101, category: current.category, memoryType: current.memoryType, version: 2, branchId: "main", sensitivity: "normal", sourceSystemId: "synthetic", sourceRef: "synthetic://stale" },
      },
      {
        drawerId: `ryze:${archived.id}:v1`,
        content: archived.content,
        metadata: { ryzeMemoryId: archived.id, ownerId: 101, category: archived.category, memoryType: archived.memoryType, version: 1, branchId: "main", sensitivity: "normal", sourceSystemId: "synthetic", sourceRef: "synthetic://archived" },
      },
      {
        drawerId: `ryze:${otherOwner.id}:v1`,
        content: otherOwner.content,
        metadata: { ryzeMemoryId: otherOwner.id, ownerId: 202, category: otherOwner.category, memoryType: otherOwner.memoryType, version: 1, branchId: "main", sensitivity: "normal", sourceSystemId: "synthetic", sourceRef: "synthetic://other-owner" },
      },
    ];
    const provider = new MemPalaceMemoryProvider({ canonical, bridge: bridgeFor(drawers), searchDerivedCandidates: true });

    const found = await provider.search({ ownerId: 101, query: "project", limit: 12 });

    expect(found.map(item => item.id)).toEqual([current.id]);
  });

  it("falls back to canonical SQLite reads when the bridge is unavailable", async () => {
    const canonical = new InMemoryContractProvider();
    const bridge: MemPalaceBridge = {
      addDrawer: vi.fn(async () => { throw new Error("MemPalace bridge unavailable"); }),
      search: vi.fn(async () => { throw new Error("MemPalace bridge unavailable"); }),
      deleteDrawer: vi.fn(async () => { throw new Error("MemPalace bridge unavailable"); }),
    };
    const provider = new MemPalaceMemoryProvider({ canonical, bridge, searchDerivedCandidates: true });
    const entry = await provider.store({ ownerId: 101, category: "experience", memoryType: "episodic", content: "Canonical fallback remains available" });

    expect(await provider.search({ ownerId: 101, query: "fallback" })).toMatchObject([{ id: entry.id }]);
    expect(provider.projectionStatus).toMatchObject({ projected: 0, failed: 2, searchable: true });
  });

  it("keeps canonical writes working and queues projection work when the bridge is offline", async () => {
    const canonical = new InMemoryContractProvider();
    const queued = memoryOutbox();
    const provider = new MemPalaceMemoryProvider({ canonical, outbox: queued.outbox });
    const entry = await provider.store({ ownerId: 101, category: "personal", memoryType: "preference", content: "Queued while provider is offline" });

    expect(await canonical.retrieve(101, entry.id)).toMatchObject({ content: entry.content });
    expect(queued.items).toHaveLength(1);
    expect(queued.items[0]).toMatchObject({ operation: "upsert", memoryId: entry.id, projectionKey: `ryze:${entry.id}:v1` });
    expect(provider.projectionStatus).toMatchObject({ enabled: true, projected: 0, failed: 0 });
  });

  it("reports a bounded read-only health snapshot without making the provider authoritative", async () => {
    const canonical = new InMemoryContractProvider();
    const queued = memoryOutbox();
    const provider = new MemPalaceMemoryProvider({
      canonical,
      outbox: queued.outbox,
      providerRevision: "provider-synthetic-commit",
      namespace: "ryze-dry-run-synthetic",
    });
    await provider.store({ ownerId: 101, category: "experience", memoryType: "project", content: "Health fixture" });

    await expect(provider.getProjectionHealth()).resolves.toMatchObject({
      enabled: true,
      searchable: false,
      providerRevision: "provider-synthetic-commit",
      namespace: "ryze-dry-run-synthetic",
      canonicalSqliteAvailable: true,
      outbox: { pending: 1, inFlight: 0, applied: 0, failed: 0 },
    });
  });
});
