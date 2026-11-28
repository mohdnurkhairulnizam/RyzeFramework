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
});
