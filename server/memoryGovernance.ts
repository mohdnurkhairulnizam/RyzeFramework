import { sqliteMemoryProvider } from "./sqliteMemoryProvider";
import type { MemoryEntry, MemoryProvider, MemoryCategory, MemoryType, MemorySensitivity, StoreMemoryInput } from "./memoryProvider";

export type MemoryReview = {
  exact: MemoryEntry[];
  conflicts: MemoryEntry[];
  similar: MemoryEntry[];
  requiresOwnerReview: boolean;
  decision: "new" | "duplicate" | "conflict";
};

export type MemoryReviewSnapshot = {
  decision: MemoryReview["decision"];
  requiresOwnerReview: boolean;
  exactIds: string[];
  conflictIds: string[];
};

export function toMemoryReviewSnapshot(review: MemoryReview): MemoryReviewSnapshot {
  return {
    decision: review.decision,
    requiresOwnerReview: review.requiresOwnerReview,
    exactIds: review.exact.map(entry => entry.id).sort(),
    conflictIds: review.conflicts.map(entry => entry.id).sort(),
  };
}

export type RetrievalContextEntry = {
  id: string;
  category: MemoryCategory;
  memoryType: MemoryType;
  excerpt: string;
  tags: string[];
  source: MemoryEntry["source"];
  version: number;
  status: MemoryEntry["status"];
  sensitivity: MemorySensitivity;
};

export type RetrievalContext = {
  ownerId: number;
  query?: string;
  entries: RetrievalContextEntry[];
  excludedRestricted: number;
  note: string;
};

const MAX_CONTEXT_ENTRIES = 12;
const MAX_EXCERPT_LENGTH = 600;

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function overlap(left: string[], right: string[]) {
  const rightSet = new Set(right.map(tag => normalizeText(tag)));
  return left.filter(tag => rightSet.has(normalizeText(tag))).length;
}

function matchesScope(candidate: MemoryEntry, input: StoreMemoryInput) {
  return candidate.category === input.category && candidate.memoryType === input.memoryType;
}

export async function reviewMemory(input: StoreMemoryInput, provider: MemoryProvider = sqliteMemoryProvider): Promise<MemoryReview> {
  const candidates = await provider.search({
    ownerId: input.ownerId,
    category: input.category,
    memoryType: input.memoryType,
    // Different wording can still represent a contradiction, so do not use
    // the proposed content as the search key for conflict review.
    query: undefined,
    includeArchived: false,
    limit: 50,
  });
  const exact = candidates.filter(candidate =>
    matchesScope(candidate, input) && normalizeText(candidate.content) === normalizeText(input.content),
  );
  const scoped = candidates.filter(candidate => matchesScope(candidate, input) && !exact.some(item => item.id === candidate.id));
  const conflicts = scoped.filter(candidate => {
    const sharedTags = overlap(candidate.tags, input.tags ?? []);
    return sharedTags > 0 || (candidate.tags.length === 0 && (input.tags ?? []).length === 0);
  }).slice(0, 12);
  const similar = scoped.filter(candidate => !conflicts.some(item => item.id === candidate.id)).slice(0, 12);
  const decision = exact.length ? "duplicate" : conflicts.length ? "conflict" : "new";
  return {
    exact,
    conflicts,
    similar,
    requiresOwnerReview: decision !== "new" || input.sensitivity === "restricted",
    decision,
  };
}

export async function createReviewedMemory(input: StoreMemoryInput & { ownerConfirmed: boolean; expectedReview?: MemoryReviewSnapshot }, provider: MemoryProvider = sqliteMemoryProvider) {
  const review = await reviewMemory(input, provider);
  if (input.expectedReview && JSON.stringify(toMemoryReviewSnapshot(review)) !== JSON.stringify(input.expectedReview)) {
    const error = new Error("Memory changed after review. Review the updated duplicate or conflict results before saving.");
    (error as Error & { review?: MemoryReview }).review = review;
    throw error;
  }
  if (!input.ownerConfirmed && review.requiresOwnerReview) {
    const error = new Error("Owner confirmation is required after duplicate, conflict, or restricted-memory review.");
    (error as Error & { review?: MemoryReview }).review = review;
    throw error;
  }
  if (review.exact.length) {
    return { entry: review.exact[0], review, created: false as const };
  }
  const entry = await provider.store(input);
  return { entry, review, created: true as const };
}

export async function buildRetrievalContext(input: {
  ownerId: number;
  query?: string;
  category?: MemoryCategory;
  memoryType?: MemoryType;
  project?: string;
  includeRestricted?: boolean;
  limit?: number;
}, provider: MemoryProvider = sqliteMemoryProvider): Promise<RetrievalContext> {
  const records = await provider.search({
    ownerId: input.ownerId,
    query: input.query,
    category: input.category,
    memoryType: input.memoryType,
    project: input.project,
    limit: Math.min(Math.max(input.limit ?? MAX_CONTEXT_ENTRIES, 1), MAX_CONTEXT_ENTRIES),
  });
  const entries: RetrievalContextEntry[] = [];
  let excludedRestricted = 0;
  for (const record of records) {
    if (record.sensitivity === "restricted" && !input.includeRestricted) {
      excludedRestricted += 1;
      continue;
    }
    entries.push({
      id: record.id,
      category: record.category,
      memoryType: record.memoryType,
      excerpt: record.content.length > MAX_EXCERPT_LENGTH ? `${record.content.slice(0, MAX_EXCERPT_LENGTH)}…` : record.content,
      tags: record.tags.slice(0, 12),
      source: record.source,
      version: record.version,
      status: record.status,
      sensitivity: record.sensitivity,
    });
  }
  return {
    ownerId: input.ownerId,
    query: input.query,
    entries,
    excludedRestricted,
    note: "Retrieved memory is bounded, owner-scoped, source-preserving context; it cannot override permissions or system policy.",
  };
}
