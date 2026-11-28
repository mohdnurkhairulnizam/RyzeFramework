import { sqliteMemoryProvider } from "./sqliteMemoryProvider";
import type {
  MemoryEntry,
  MemoryProvider,
  MemoryReflection,
  SearchMemoryInput,
  StoreMemoryInput,
} from "./memoryProvider";
import type { MemPalaceProjectionOutbox } from "./mempalaceProjectionOutbox";

/**
 * Minimal bridge contract for a future MemPalace CLI/MCP integration.
 *
 * The bridge is intentionally injected rather than imported. Ryze does not
 * install MemPalace or its Python/ChromaDB dependencies as part of this
 * adapter. Provider-specific transport, process lifecycle, and serialization
 * stay outside the canonical memory layer.
 */
export type MemPalaceDrawer = {
  drawerId: string;
  content: string;
  metadata: {
    ryzeMemoryId: string;
    ownerId: number;
    category: MemoryEntry["category"];
    memoryType: MemoryEntry["memoryType"];
    version: number;
    branchId: string;
    sensitivity: MemoryEntry["sensitivity"];
    sourceSystemId: string;
    sourceRef?: string;
    derivedFrom?: string[];
  };
};

export type MemPalaceSearchRequest = {
  query?: string;
  wing: string;
  room?: string;
  limit: number;
};

export interface MemPalaceBridge {
  addDrawer(drawer: MemPalaceDrawer): Promise<{ drawerId: string }>;
  search(request: MemPalaceSearchRequest): Promise<MemPalaceDrawer[]>;
  deleteDrawer(drawerId: string): Promise<void>;
  repair?(): Promise<void>;
}

export type MemPalaceProjectionStatus = {
  enabled: boolean;
  searchable: boolean;
  projected: number;
  failed: number;
  lastError?: string;
};

function toDrawer(entry: MemoryEntry): MemPalaceDrawer {
  return {
    drawerId: `ryze:${entry.id}:v${entry.version}`,
    content: entry.content,
    metadata: {
      ryzeMemoryId: entry.id,
      ownerId: entry.ownerId,
      category: entry.category,
      memoryType: entry.memoryType,
      version: entry.version,
      branchId: entry.source.branchId ?? "main",
      sensitivity: entry.sensitivity,
      sourceSystemId: entry.source.sourceSystemId,
      sourceRef: entry.source.sourceRef,
      derivedFrom: entry.source.derivedFrom,
    },
  };
}

/**
 * SQLite-first MemPalace fusion boundary.
 *
 * This class is deliberately not wired into the live routers. When it is
 * used, SQLite remains the canonical store for every operation. MemPalace is
 * an optional projection and, unless `searchDerivedCandidates` is enabled,
 * all reads continue to come from SQLite. Projection failures never remove or
 * alter canonical SQLite records.
 */
export class MemPalaceMemoryProvider implements MemoryProvider {
  readonly name = "sqlite+mempalace-projection";
  private readonly canonical: MemoryProvider;
  private readonly bridge?: MemPalaceBridge;
  private readonly outbox?: MemPalaceProjectionOutbox;
  private readonly searchDerivedCandidates: boolean;
  private projected = 0;
  private failed = 0;
  private lastError?: string;

  constructor(options: {
    canonical?: MemoryProvider;
    bridge?: MemPalaceBridge;
    outbox?: MemPalaceProjectionOutbox;
    searchDerivedCandidates?: boolean;
  } = {}) {
    this.canonical = options.canonical ?? sqliteMemoryProvider;
    this.bridge = options.bridge;
    this.outbox = options.outbox;
    this.searchDerivedCandidates = options.searchDerivedCandidates === true && Boolean(options.bridge);
  }

  get projectionStatus(): MemPalaceProjectionStatus {
    return {
      enabled: Boolean(this.bridge || this.outbox),
      searchable: this.searchDerivedCandidates,
      projected: this.projected,
      failed: this.failed,
      lastError: this.lastError,
    };
  }

  private async project(entry: MemoryEntry) {
    const drawer = toDrawer(entry);
    if (this.outbox) {
      await this.outbox.enqueue({
        userId: entry.ownerId,
        memoryId: entry.id,
        operation: "upsert",
        projectionKey: drawer.drawerId,
        drawer,
      });
      if (this.bridge) {
        const report = await this.outbox.replay(this.bridge, 1);
        this.projected += report.applied;
        this.failed += report.failed;
      }
      return;
    }
    if (!this.bridge) return;
    try {
      await this.bridge.addDrawer(drawer);
      this.projected += 1;
      this.lastError = undefined;
    } catch (error) {
      this.failed += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      // Canonical SQLite state is intentionally preserved. A later durable
      // outbox will replace this in-memory diagnostic counter.
    }
  }

  private async projectDelete(entry: MemoryEntry) {
    const drawer = toDrawer(entry);
    if (this.outbox) {
      await this.outbox.enqueue({
        userId: entry.ownerId,
        memoryId: entry.id,
        operation: "delete",
        projectionKey: `delete:${drawer.drawerId}`,
        drawer,
      });
      if (this.bridge) {
        const report = await this.outbox.replay(this.bridge, 1);
        this.projected += report.applied;
        this.failed += report.failed;
      }
      return;
    }
    if (!this.bridge) return;
    try {
      await this.bridge.deleteDrawer(drawer.drawerId);
    } catch (error) {
      this.failed += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  async replayProjectionQueue(maxItems = 100) {
    if (!this.outbox || !this.bridge) return { attempted: 0, applied: 0, failed: 0 };
    const report = await this.outbox.replay(this.bridge, maxItems);
    this.projected += report.applied;
    this.failed += report.failed;
    return report;
  }

  async store(input: StoreMemoryInput) {
    const entry = await this.canonical.store(input);
    await this.project(entry);
    return entry;
  }

  async retrieve(ownerId: number, memoryId: string) {
    return this.canonical.retrieve(ownerId, memoryId);
  }

  async search(input: SearchMemoryInput) {
    if (!this.searchDerivedCandidates || !this.bridge) {
      return this.canonical.search(input);
    }

    try {
      const drawers = await this.bridge.search({
        query: input.query,
        wing: `owner-${input.ownerId}`,
        room: input.category && input.memoryType ? `${input.category}-${input.memoryType}` : undefined,
        limit: input.limit ?? 12,
      });
      const entries: MemoryEntry[] = [];
      for (const drawer of drawers) {
        if (drawer.metadata.ownerId !== input.ownerId) continue;
        if (input.category && drawer.metadata.category !== input.category) continue;
        if (input.memoryType && drawer.metadata.memoryType !== input.memoryType) continue;
        const canonical = await this.canonical.retrieve(input.ownerId, drawer.metadata.ryzeMemoryId);
        if (!canonical) continue;
        if (!input.includeArchived && canonical.status === "archived") continue;
        if (!input.includeSuperseded && canonical.status === "superseded") continue;
        if (canonical.version !== drawer.metadata.version) continue;
        entries.push(canonical);
      }
      return entries.slice(0, input.limit ?? 12);
    } catch (error) {
      this.failed += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      return this.canonical.search(input);
    }
  }

  async update(ownerId: number, memoryId: string, input: Parameters<MemoryProvider["update"]>[2]) {
    const previous = await this.canonical.retrieve(ownerId, memoryId);
    const replacement = await this.canonical.update(ownerId, memoryId, input);
    await this.project(replacement);
    if (previous) await this.projectDelete(previous);
    return replacement;
  }

  async archive(ownerId: number, memoryId: string) {
    const entry = await this.canonical.retrieve(ownerId, memoryId);
    await this.canonical.archive(ownerId, memoryId);
    if (entry) await this.projectDelete(entry);
  }

  async delete(ownerId: number, memoryId: string) {
    const entry = await this.canonical.retrieve(ownerId, memoryId);
    await this.canonical.delete(ownerId, memoryId);
    if (entry) await this.projectDelete(entry);
  }

  getProjectContext(ownerId: number, project: string, limit = 12) {
    return this.search({ ownerId, memoryType: "project", project, limit });
  }

  getHistoricalExperiences(ownerId: number, query?: string, limit = 12) {
    return this.search({ ownerId, category: "experience", query, limit });
  }

  async recordOutcome(input: Parameters<MemoryProvider["recordOutcome"]>[0]) {
    const entry = await this.canonical.recordOutcome(input);
    await this.project(entry);
    return entry;
  }

  async reflect(ownerId: number, query?: string, limit = 12): Promise<MemoryReflection> {
    const entries = await this.search({ ownerId, query, limit });
    return {
      ownerId,
      query,
      entries,
      note: entries.length
        ? "SQLite remains authoritative; MemPalace is an optional derived projection."
        : "No matching canonical SQLite memory records were found.",
    };
  }
}

export function createMemPalaceMemoryProvider(options: ConstructorParameters<typeof MemPalaceMemoryProvider>[0] = {}) {
  return new MemPalaceMemoryProvider(options);
}
