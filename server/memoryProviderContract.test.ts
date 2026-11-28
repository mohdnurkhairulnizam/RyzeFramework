import { describe, expect, it } from "vitest";
import type {
  MemoryEntry,
  MemoryProvider,
  MemoryReflection,
  SearchMemoryInput,
  StoreMemoryInput,
} from "./memoryProvider";
import { buildRetrievalContext, createReviewedMemory, reviewMemory } from "./memoryGovernance";

export class InMemoryContractProvider implements MemoryProvider {
  readonly name = "gate1-in-memory-contract";
  private readonly entries = new Map<string, MemoryEntry>();
  private nextId = 1;

  async store(input: StoreMemoryInput): Promise<MemoryEntry> {
    const now = new Date();
    const entry: MemoryEntry = {
      id: `gate1-${this.nextId++}`,
      ownerId: input.ownerId,
      category: input.category,
      memoryType: input.memoryType,
      content: input.content,
      tags: input.tags ?? [],
      source: {
        sourceSystemId: input.source?.sourceSystemId ?? "gate1-synthetic",
        branchId: input.source?.branchId ?? "main",
        sourceRef: input.source?.sourceRef,
        derivedFrom: input.source?.derivedFrom,
      },
      createdBy: input.createdBy ?? "owner",
      version: 1,
      status: "active",
      sensitivity: input.sensitivity ?? "normal",
      createdAt: now,
      updatedAt: now,
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  async retrieve(ownerId: number, memoryId: string): Promise<MemoryEntry | null> {
    const entry = this.entries.get(memoryId);
    return entry && entry.ownerId === ownerId ? entry : null;
  }

  async search(input: SearchMemoryInput): Promise<MemoryEntry[]> {
    const query = input.query?.trim().toLocaleLowerCase();
    return [...this.entries.values()]
      .filter(entry => entry.ownerId === input.ownerId)
      .filter(entry => !input.category || entry.category === input.category)
      .filter(entry => !input.memoryType || entry.memoryType === input.memoryType)
      .filter(entry => input.includeArchived || entry.status !== "archived")
      .filter(entry => input.includeSuperseded || entry.status !== "superseded")
      .filter(entry => !query || entry.content.toLocaleLowerCase().includes(query))
      .slice(0, input.limit ?? 50);
  }

  async update(ownerId: number, memoryId: string, input: Pick<StoreMemoryInput, "content" | "tags" | "source">): Promise<MemoryEntry> {
    const current = await this.retrieve(ownerId, memoryId);
    if (!current) throw new Error("Memory not found");
    current.status = "archived";
    current.updatedAt = new Date();
    return this.store({
      ownerId,
      category: current.category,
      memoryType: current.memoryType,
      content: input.content,
      tags: input.tags,
      source: { ...input.source, derivedFrom: [current.id] },
      createdBy: current.createdBy,
      sensitivity: current.sensitivity,
    });
  }

  async archive(ownerId: number, memoryId: string): Promise<void> {
    const entry = await this.retrieve(ownerId, memoryId);
    if (!entry) throw new Error("Memory not found");
    entry.status = "archived";
    entry.updatedAt = new Date();
  }

  async delete(ownerId: number, memoryId: string): Promise<void> {
    const entry = await this.retrieve(ownerId, memoryId);
    if (!entry) throw new Error("Memory not found");
    this.entries.delete(entry.id);
  }

  async getProjectContext(ownerId: number, project: string, limit = 12): Promise<MemoryEntry[]> {
    return this.search({ ownerId, project, limit });
  }

  async getHistoricalExperiences(ownerId: number, query?: string, limit = 12): Promise<MemoryEntry[]> {
    return this.search({ ownerId, query, category: "experience", includeArchived: true, includeSuperseded: true, limit });
  }

  async recordOutcome(input: Omit<StoreMemoryInput, "category" | "memoryType"> & { success: boolean; sourceRef: string }): Promise<MemoryEntry> {
    return this.store({ ...input, category: "experience", memoryType: "episodic", source: { ...input.source, sourceRef: input.sourceRef } });
  }

  async reflect(ownerId: number, query?: string, limit = 12): Promise<MemoryReflection> {
    const entries = await this.search({ ownerId, query, limit });
    return { ownerId, query, entries, note: "Synthetic Gate 1 provider reflection." };
  }
}

describe("Gate 1 provider-neutral synthetic contract", () => {
  it("keeps owner isolation and restricted retrieval at the Ryze governance boundary", async () => {
    const provider = new InMemoryContractProvider();
    const ownerEntry = await provider.store({
      ownerId: 101,
      category: "personal",
      memoryType: "preference",
      content: "Owner 101 prefers concise reports",
    });
    await provider.store({
      ownerId: 202,
      category: "personal",
      memoryType: "preference",
      content: "Owner 202 private preference",
    });
    await provider.store({
      ownerId: 101,
      category: "system",
      memoryType: "semantic",
      content: "Synthetic restricted system policy",
      sensitivity: "restricted",
    });

    expect(await provider.retrieve(202, ownerEntry.id)).toBeNull();
    const restricted = await buildRetrievalContext({ ownerId: 101, query: "Synthetic restricted" }, provider);
    expect(restricted.entries).toEqual([]);
    expect(restricted.excludedRestricted).toBe(1);

    const explicitlyIncluded = await buildRetrievalContext({ ownerId: 101, query: "Synthetic restricted", includeRestricted: true }, provider);
    expect(explicitlyIncluded.entries).toHaveLength(1);
    expect(explicitlyIncluded.entries[0]?.sensitivity).toBe("restricted");
  });

  it("requires owner confirmation for exact duplicates, conflicts, and restricted writes", async () => {
    const provider = new InMemoryContractProvider();
    await provider.store({ ownerId: 101, category: "experience", memoryType: "project", content: "Atlas uses SQLite authority", tags: ["atlas"] });

    const duplicate = await reviewMemory({ ownerId: 101, category: "experience", memoryType: "project", content: "Atlas uses SQLite authority", tags: ["atlas"] }, provider);
    expect(duplicate.decision).toBe("duplicate");
    await expect(createReviewedMemory({ ownerId: 101, category: "experience", memoryType: "project", content: "Atlas uses SQLite authority", tags: ["atlas"], ownerConfirmed: false }, provider)).rejects.toThrow("Owner confirmation");

    const conflict = await reviewMemory({ ownerId: 101, category: "experience", memoryType: "project", content: "Atlas uses a remote authority", tags: ["atlas"] }, provider);
    expect(conflict.decision).toBe("conflict");
    await expect(createReviewedMemory({ ownerId: 101, category: "experience", memoryType: "project", content: "Atlas uses a remote authority", tags: ["atlas"], ownerConfirmed: false }, provider)).rejects.toThrow("Owner confirmation");

    await expect(createReviewedMemory({ ownerId: 101, category: "personal", memoryType: "preference", content: "Restricted synthetic preference", sensitivity: "restricted", ownerConfirmed: false }, provider)).rejects.toThrow("Owner confirmation");
  });

  it("preserves append-first version lineage through the provider-neutral interface", async () => {
    const provider = new InMemoryContractProvider();
    const original = await provider.store({ ownerId: 101, category: "experience", memoryType: "procedural", content: "Use the first workflow" });
    const replacement = await provider.update(101, original.id, { content: "Use the reviewed workflow", tags: ["reviewed"], source: { sourceRef: original.id } });

    expect(replacement.id).not.toBe(original.id);
    expect(replacement.source.derivedFrom).toEqual([original.id]);
    expect((await provider.retrieve(101, original.id))?.status).toBe("archived");
    expect(replacement.version).toBe(1);
  });
});
