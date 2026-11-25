import {
  addMemory,
  archiveMemoryForUser,
  createSystemMemory,
  deleteMemoryForUser,
  getMemoryForUser,
  searchClassifiedMemory,
  searchSystemMemory,
} from "./db";
import type {
  MemoryEntry,
  MemoryProvider,
  MemoryReflection,
  MemorySource,
  SearchMemoryInput,
  StoreMemoryInput,
} from "./memoryProvider";

function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

function sourceFrom(record: { sourceSystemId: string | null; branchId: string; sourceRef: string | null; derivedFrom: string | null }): MemorySource {
  return {
    sourceSystemId: record.sourceSystemId ?? "unknown",
    branchId: record.branchId,
    sourceRef: record.sourceRef ?? undefined,
    derivedFrom: record.derivedFrom ? [record.derivedFrom] : undefined,
  };
}

function normalize(record: any, ownerId: number): MemoryEntry | null {
  if (!record?.category && record?.id?.startsWith("sysmem_")) {
    return {
      id: record.id, ownerId, category: "system", memoryType: record.memoryType, content: record.content,
      tags: parseTags(record.tags), source: sourceFrom(record), createdBy: record.createdBy, version: record.version,
      status: record.status, sensitivity: record.sensitivity, createdAt: record.createdAt, updatedAt: record.updatedAt,
    };
  }
  if (!record?.category || !record?.memoryType || !record?.createdBy || !record?.version || !record?.status || !record?.sensitivity) return null;
  return {
    id: record.id, ownerId, category: record.category, memoryType: record.memoryType, content: record.content,
    tags: parseTags(record.tags), source: sourceFrom(record), createdBy: record.createdBy, version: record.version,
    status: record.status, sensitivity: record.sensitivity, createdAt: record.createdAt, updatedAt: record.updatedAt,
    legacyScope: record.legacyScope ?? undefined, outcome: record.outcome,
  };
}

export class SqliteMemoryProvider implements MemoryProvider {
  readonly name = "sqlite";

  async store(input: StoreMemoryInput) {
    const source = input.source ?? {};
    if (input.category === "system") {
      const record = await createSystemMemory(input.ownerId, {
        memoryType: input.memoryType, content: input.content, tags: input.tags ?? [],
        sourceRef: source.sourceRef, derivedFrom: source.derivedFrom?.[0], sensitivity: input.sensitivity,
      });
      return normalize(record, input.ownerId)!;
    }
    const id = await addMemory(input.ownerId, {
      scope: input.category === "personal" ? "core" : "evolving", kind: input.memoryType,
      category: input.category, memoryType: input.memoryType, content: input.content, tags: input.tags ?? [],
      sourceRef: source.sourceRef, derivedFrom: source.derivedFrom?.[0], createdBy: input.createdBy ?? "owner", sensitivity: input.sensitivity,
    });
    return (await this.retrieve(input.ownerId, id))!;
  }

  async retrieve(ownerId: number, memoryId: string) {
    return normalize(await getMemoryForUser(ownerId, memoryId), ownerId);
  }

  async search(input: SearchMemoryInput) {
    const query = input.project ? `${input.query ?? ""} ${input.project}`.trim() : input.query;
    if (input.category === "system") {
      return (await searchSystemMemory(input.ownerId, query)).map(record => normalize(record, input.ownerId)).filter((record): record is MemoryEntry => Boolean(record)).slice(0, input.limit ?? 20);
    }
    const records = await searchClassifiedMemory(input.ownerId, {
      query, category: input.category, memoryType: input.memoryType, limit: input.limit,
    });
    return records.map(record => normalize(record, input.ownerId)).filter((record): record is MemoryEntry => Boolean(record));
  }

  async update(ownerId: number, memoryId: string, input: Pick<StoreMemoryInput, "content" | "tags" | "source">) {
    const current = await this.retrieve(ownerId, memoryId);
    if (!current) throw new Error("Memory record was not found for this owner.");
    const replacement = await this.store({
      ownerId, category: current.category, memoryType: current.memoryType, content: input.content,
      tags: input.tags, source: { ...input.source, sourceRef: input.source?.sourceRef ?? memoryId, derivedFrom: [memoryId] },
      createdBy: "owner", sensitivity: current.sensitivity,
    });
    await archiveMemoryForUser(ownerId, memoryId);
    return replacement;
  }

  async archive(ownerId: number, memoryId: string) {
    const current = await this.retrieve(ownerId, memoryId);
    if (!current) throw new Error("Memory record was not found for this owner.");
    await archiveMemoryForUser(ownerId, memoryId);
  }

  async delete(ownerId: number, memoryId: string) {
    const current = await this.retrieve(ownerId, memoryId);
    if (!current) throw new Error("Memory record was not found for this owner.");
    await deleteMemoryForUser(ownerId, memoryId);
  }

  getProjectContext(ownerId: number, project: string, limit = 12) {
    return this.search({ ownerId, memoryType: "project", project, limit });
  }

  getHistoricalExperiences(ownerId: number, query?: string, limit = 12) {
    return this.search({ ownerId, category: "experience", query, limit });
  }

  async recordOutcome(input: Omit<StoreMemoryInput, "category" | "memoryType"> & { success: boolean; sourceRef: string }) {
    const source = input.source ?? {};
    const id = await addMemory(input.ownerId, {
      scope: "evolving", kind: "execution_outcome", category: "experience", memoryType: "episodic",
      content: input.content, tags: input.tags ?? [], sourceRef: source.sourceRef ?? input.sourceRef,
      createdBy: input.createdBy ?? "system_process", outcome: input.success ? "SUCCESS" : "FAIL",
    });
    return (await this.retrieve(input.ownerId, id))!;
  }

  async reflect(ownerId: number, query?: string, limit = 12): Promise<MemoryReflection> {
    const entries = await this.search({ ownerId, query, limit });
    return {
      ownerId, query, entries,
      note: entries.length ? "SQLite fallback returns bounded matching records; provider-side semantic reflection is not enabled." : "No matching memory records were found.",
    };
  }
}

export const sqliteMemoryProvider = new SqliteMemoryProvider();
