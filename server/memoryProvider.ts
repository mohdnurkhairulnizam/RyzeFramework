export type MemoryCategory = "system" | "experience" | "personal";
export type MemoryType = "episodic" | "semantic" | "procedural" | "preference" | "project";
export type MemoryStatus = "candidate" | "active" | "superseded" | "archived" | "legacy_unclassified";
export type MemorySensitivity = "normal" | "restricted";

export type MemorySource = {
  sourceSystemId: string;
  branchId?: string;
  sourceRef?: string;
  derivedFrom?: string[];
};

export type MemoryEntry = {
  id: string;
  ownerId: number;
  category: MemoryCategory;
  memoryType: MemoryType;
  content: string;
  tags: string[];
  source: MemorySource;
  createdBy: "owner" | "ryze_candidate_approved" | "system_process";
  version: number;
  status: MemoryStatus;
  sensitivity: MemorySensitivity;
  createdAt: Date;
  updatedAt: Date;
  legacyScope?: "core" | "evolving";
  outcome?: "SUCCESS" | "FAIL" | "NEUTRAL";
};

export type StoreMemoryInput = {
  ownerId: number;
  category: MemoryCategory;
  memoryType: MemoryType;
  content: string;
  tags?: string[];
  source?: Partial<MemorySource>;
  createdBy?: MemoryEntry["createdBy"];
  sensitivity?: MemorySensitivity;
};

export type SearchMemoryInput = {
  ownerId: number;
  query?: string;
  category?: MemoryCategory;
  memoryType?: MemoryType;
  project?: string;
  /** Include archived lifecycle records in addition to the normal active set. */
  includeArchived?: boolean;
  /** Include superseded versions; normal search remains active-only. */
  includeSuperseded?: boolean;
  /** Stable chronological order for history-oriented requests. */
  sortOrder?: "relevance" | "createdAtAsc";
  limit?: number;
};

export type MemoryReflection = {
  ownerId: number;
  query?: string;
  entries: MemoryEntry[];
  note: string;
};

/**
 * Provider-neutral boundary. Providers are retrieval/storage engines only;
 * Ryze remains responsible for ownership, approval, permissions, and policy.
 */
export interface MemoryProvider {
  readonly name: string;
  store(input: StoreMemoryInput): Promise<MemoryEntry>;
  retrieve(ownerId: number, memoryId: string): Promise<MemoryEntry | null>;
  search(input: SearchMemoryInput): Promise<MemoryEntry[]>;
  update(ownerId: number, memoryId: string, input: Pick<StoreMemoryInput, "content" | "tags" | "source">): Promise<MemoryEntry>;
  archive(ownerId: number, memoryId: string): Promise<void>;
  delete(ownerId: number, memoryId: string): Promise<void>;
  getProjectContext(ownerId: number, project: string, limit?: number): Promise<MemoryEntry[]>;
  getHistoricalExperiences(ownerId: number, query?: string, limit?: number): Promise<MemoryEntry[]>;
  recordOutcome(input: Omit<StoreMemoryInput, "category" | "memoryType"> & { success: boolean; sourceRef: string }): Promise<MemoryEntry>;
  reflect(ownerId: number, query?: string, limit?: number): Promise<MemoryReflection>;
}
