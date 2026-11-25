import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Archive,
  BrainCircuit,
  CheckCircle2,
  History,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Category = "system" | "experience" | "personal";
type MemoryType =
  | "episodic"
  | "semantic"
  | "procedural"
  | "preference"
  | "project";
type Sensitivity = "normal" | "restricted";
type Draft = {
  category: Category;
  memoryType: MemoryType;
  content: string;
  tags: string;
  sourceRef: string;
  sensitivity: Sensitivity;
  ownerConfirmed: boolean;
};

const categories: Category[] = ["personal", "experience", "system"];
const memoryTypes: MemoryType[] = [
  "preference",
  "episodic",
  "semantic",
  "procedural",
  "project",
];
const initialDraft: Draft = {
  category: "personal",
  memoryType: "preference",
  content: "",
  tags: "",
  sourceRef: "",
  sensitivity: "normal",
  ownerConfirmed: false,
};

export default function MemoryGovernancePanel({
  legacyMemory,
  skills,
}: {
  legacyMemory: any[];
  skills: any[];
}) {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [reviewDraft, setReviewDraft] = useState<Draft | null>(null);
  const [showRevisions, setShowRevisions] = useState(false);
  const [identityDraft, setIdentityDraft] = useState<any>(null);
  const [systemOpen, setSystemOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReviewDraft(draft.content.trim() ? { ...draft } : null);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    draft.category,
    draft.memoryType,
    draft.content,
    draft.tags,
    draft.sensitivity,
  ]);

  const memoryQuery = trpc.ryze.listMemory.useQuery({
    query: debouncedQuery || undefined,
    limit: 50,
  });
  const identityQuery = trpc.ryze.identity.useQuery();
  const revisionsQuery = trpc.ryze.identityRevisions.useQuery(undefined, {
    enabled: showRevisions,
  });
  const systemQuery = trpc.ryze.systemMemory.useQuery();
  const reviewQuery = trpc.ryze.memoryReview.useQuery(
    reviewDraft
      ? {
          category: reviewDraft.category,
          memoryType: reviewDraft.memoryType,
          content: reviewDraft.content.trim(),
          tags: splitTags(reviewDraft.tags),
          sensitivity: reviewDraft.sensitivity,
        }
      : {
          category: draft.category,
          memoryType: draft.memoryType,
          content: "",
          tags: [],
          sensitivity: draft.sensitivity,
        },
    { enabled: Boolean(reviewDraft) }
  );

  const entries = memoryQuery.data ?? [];
  const selected = entries.find(entry => entry.id === selectedId) ?? null;
  const reviewIsCurrent = Boolean(
    reviewDraft &&
      reviewDraft.category === draft.category &&
      reviewDraft.memoryType === draft.memoryType &&
      reviewDraft.content === draft.content &&
      reviewDraft.tags === draft.tags &&
      reviewDraft.sensitivity === draft.sensitivity
  );
  const review = reviewIsCurrent ? reviewQuery.data : undefined;
  const reviewReady = Boolean(
    review &&
      reviewQuery.isSuccess &&
      !reviewQuery.isError &&
      !reviewQuery.isFetching
  );
  const needsOwnerConfirmation = Boolean(review?.requiresOwnerReview);
  const legacy = legacyMemory.filter(entry => !entry.category);
  const categoryCounts = categories.map(category => ({
    category,
    count: entries.filter(entry => entry.category === category).length,
  }));

  const refreshMemory = async () => {
    await Promise.all([
      memoryQuery.refetch(),
      utils.ryze.dashboard.invalidate(),
    ]);
  };
  const createMemory = trpc.ryze.createMemory.useMutation({
    onSuccess: async result => {
      await refreshMemory();
      setDraft(initialDraft);
      setReviewDraft(null);
      toast.success(
        result.created
          ? "Memory saved with owner approval."
          : "Exact duplicate found; no new record was created."
      );
    },
    onError: error => {
      setDraft(current => ({ ...current, ownerConfirmed: false }));
      void reviewQuery.refetch();
      toast.error(error.message);
    },
  });
  const updateMemory = trpc.ryze.updateMemory.useMutation({
    onSuccess: async () => {
      await refreshMemory();
      toast.success(
        "New memory version saved; the previous record remains archived."
      );
    },
    onError: error => toast.error(error.message),
  });
  const archiveMemory = trpc.ryze.archiveMemory.useMutation({
    onSuccess: async () => {
      setSelectedId(null);
      await refreshMemory();
      toast.success("Memory archived.");
    },
    onError: error => toast.error(error.message),
  });
  const deleteMemory = trpc.ryze.deleteMemory.useMutation({
    onSuccess: async () => {
      setSelectedId(null);
      await refreshMemory();
      toast.success("Memory permanently deleted.");
    },
    onError: error => toast.error(error.message),
  });
  const updateIdentity = trpc.ryze.updateIdentity.useMutation({
    onSuccess: async () => {
      await Promise.all([identityQuery.refetch(), revisionsQuery.refetch()]);
      setIdentityDraft(null);
      toast.success("Ryze identity revision approved.");
    },
    onError: error => toast.error(error.message),
  });
  const createSystemMemory = trpc.ryze.createSystemMemory.useMutation({
    onSuccess: async () => {
      await systemQuery.refetch();
      setSystemOpen(false);
      toast.success("Protected System Memory entry approved.");
    },
    onError: error => toast.error(error.message),
  });

  const beginEdit = (entry: any) => {
    setSelectedId(entry.id);
    setEditContent(entry.content);
    setEditTags((entry.tags ?? []).join(", "));
  };
  const submitMemory = () => {
    if (!draft.content.trim())
      return toast.error("Write the memory content before reviewing it.");
    if (!reviewReady)
      return toast.error("Wait for the memory review to finish before saving.");
    if (needsOwnerConfirmation && !draft.ownerConfirmed) {
      return toast.error(
        "Review the duplicate or conflict and confirm before saving."
      );
    }
    if (!review)
      return toast.error(
        "The review result is unavailable. Try the review again."
      );
    createMemory.mutate({
      ...draft,
      tags: splitTags(draft.tags),
      sourceRef: draft.sourceRef.trim() || undefined,
      expectedReview: {
        decision: review.decision,
        requiresOwnerReview: review.requiresOwnerReview,
        exactIds: review.exact.map((entry: any) => entry.id).sort(),
        conflictIds: review.conflicts.map((entry: any) => entry.id).sort(),
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading />

      <section
        aria-label="Memory overview"
        className="mb-5 grid gap-3 sm:grid-cols-3"
      >
        {categoryCounts.map(({ category, count }) => (
          <div
            key={category}
            className="ryze-glass flex items-center justify-between rounded-2xl px-4 py-3"
          >
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                {category} memory
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                {count}
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
              {category === "system" ? (
                <LockKeyhole className="size-4 text-violet-300" />
              ) : (
                <BrainCircuit className="size-4 text-cyan-300" />
              )}
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,.8fr)]">
        <section
          className="ryze-glass rounded-[1.5rem] p-5 sm:p-6"
          aria-labelledby="create-memory-heading"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2
                id="create-memory-heading"
                className="text-lg font-semibold text-white"
              >
                Create or review memory
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                Check for duplicates and possible conflicts before activating an
                owner-scoped record.
              </p>
            </div>
            <Badge className="shrink-0 border border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-200">
              {entries.length} records
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Category"
              value={draft.category}
              options={categories}
              onChange={value =>
                setDraft({
                  ...draft,
                  category: value as Category,
                  ownerConfirmed: false,
                })
              }
            />
            <SelectField
              label="Memory type"
              value={draft.memoryType}
              options={memoryTypes}
              onChange={value =>
                setDraft({
                  ...draft,
                  memoryType: value as MemoryType,
                  ownerConfirmed: false,
                })
              }
            />
          </div>
          <Textarea
            value={draft.content}
            onChange={event =>
              setDraft({
                ...draft,
                content: event.target.value,
                ownerConfirmed: false,
              })
            }
            maxLength={5000}
            aria-label="Memory content"
            placeholder="Write a fact, preference, project decision, or reviewed System Memory instruction…"
            className="mt-3 min-h-28 border-white/10 bg-[#080c15]/70 text-sm leading-6"
          />
          <div className="mt-1 flex justify-end text-[10px] tabular-nums text-slate-600">
            {draft.content.length}/5,000
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Input
              value={draft.tags}
              onChange={event =>
                setDraft({
                  ...draft,
                  tags: event.target.value,
                  ownerConfirmed: false,
                })
              }
              aria-label="Tags"
              placeholder="Tags, comma separated"
              className="border-white/10 bg-[#080c15]/70"
            />
            <Input
              value={draft.sourceRef}
              onChange={event =>
                setDraft({ ...draft, sourceRef: event.target.value })
              }
              aria-label="Source reference"
              placeholder="Source reference (optional)"
              className="border-white/10 bg-[#080c15]/70"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
            <SelectField
              label="Sensitivity"
              value={draft.sensitivity}
              options={["normal", "restricted"]}
              onChange={value =>
                setDraft({
                  ...draft,
                  sensitivity: value as Sensitivity,
                  ownerConfirmed: false,
                })
              }
              inline
            />
            <span className="text-[11px] text-slate-500">
              Restricted records are excluded from contextual retrieval by
              default.
            </span>
          </div>

          {draft.content.trim() ? (
            <ReviewSummary
              review={review}
              loading={!reviewReady}
              error={reviewQuery.isError}
              retry={() => void reviewQuery.refetch()}
              confirmed={draft.ownerConfirmed}
              onConfirm={checked =>
                setDraft({ ...draft, ownerConfirmed: checked })
              }
            />
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={submitMemory}
              disabled={
                createMemory.isPending ||
                !draft.content.trim() ||
                !reviewReady ||
                (needsOwnerConfirmation && !draft.ownerConfirmed)
              }
              className="rounded-xl bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            >
              {createMemory.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              {createMemory.isPending ? "Saving…" : "Review and save"}
            </Button>
            {draft.content || draft.tags || draft.sourceRef ? (
              <Button
                variant="ghost"
                onClick={() => setDraft(initialDraft)}
                className="text-slate-400"
              >
                Clear draft
              </Button>
            ) : null}
          </div>
        </section>

        <IdentityCard
          identity={identityQuery.data}
          revisions={revisionsQuery.data ?? []}
          showRevisions={showRevisions}
          setShowRevisions={setShowRevisions}
          draft={identityDraft}
          setDraft={setIdentityDraft}
          onSave={(input: any) =>
            updateIdentity.mutate({ ...input, ownerConfirmed: true })
          }
          saving={updateIdentity.isPending}
          loading={identityQuery.isLoading}
          retryIdentity={() => void identityQuery.refetch()}
          revisionsLoading={revisionsQuery.isLoading}
          revisionsError={revisionsQuery.isError}
          retryRevisions={() => void revisionsQuery.refetch()}
        />
      </div>

      <section
        className="ryze-glass mt-5 rounded-[1.5rem] p-5 sm:p-6"
        aria-labelledby="inspect-memory-heading"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2
              id="inspect-memory-heading"
              className="text-lg font-semibold text-white"
            >
              Inspectable memory
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Inspect provenance, save a new version, archive, or permanently
              delete a record.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                aria-label="Search owner memory"
                placeholder="Search owner memory…"
                className="h-9 border-white/10 bg-[#080c15]/70 pl-9 text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void memoryQuery.refetch()}
              aria-label="Refresh memory"
              title="Refresh memory"
            >
              <RefreshCcw
                className={cn(
                  "size-4",
                  memoryQuery.isFetching && "animate-spin"
                )}
              />
            </Button>
          </div>
        </div>

        {memoryQuery.isError ? (
          <InlineError
            message="Memory could not be loaded."
            onRetry={() => void memoryQuery.refetch()}
          />
        ) : memoryQuery.isLoading ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] px-4 py-5 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin text-cyan-300" />
            Loading owner memory…
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {entries.map(entry => (
              <button
                key={entry.id}
                type="button"
                onClick={() => beginEdit(entry)}
                aria-pressed={selectedId === entry.id}
                className={cn(
                  "rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
                  selectedId === entry.id
                    ? "border-cyan-300/30 bg-cyan-300/[0.06]"
                    : "border-white/[0.07] bg-black/10 hover:border-white/15"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold capitalize text-cyan-200">
                    {entry.category} · {entry.memoryType}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    v{entry.version}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">
                  {entry.content}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-slate-500">
                  <span className="capitalize">{entry.status}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{entry.sensitivity}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">
                    {entry.source?.sourceRef ?? "Source not specified"}
                  </span>
                </div>
              </button>
            ))}
            {!entries.length ? (
              <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500 lg:col-span-2">
                {debouncedQuery
                  ? `No records match “${debouncedQuery}”.`
                  : "No classified records yet. New reviewed memories will appear here."}
              </p>
            ) : null}
          </div>
        )}

        {selected ? (
          <SelectedMemory
            key={selected.id}
            entry={selected}
            content={editContent}
            tags={editTags}
            setContent={setEditContent}
            setTags={setEditTags}
            onUpdate={() =>
              updateMemory.mutate({
                memoryId: selected.id,
                content: editContent,
                tags: splitTags(editTags),
                sourceRef: selected.source?.sourceRef ?? undefined,
              })
            }
            onArchive={() => archiveMemory.mutate({ memoryId: selected.id })}
            onDelete={() => {
              if (
                window.confirm(
                  "Permanently delete this memory? This cannot be undone."
                )
              ) {
                deleteMemory.mutate({
                  memoryId: selected.id,
                  ownerConfirmed: true,
                });
              }
            }}
            busy={
              updateMemory.isPending ||
              archiveMemory.isPending ||
              deleteMemory.isPending
            }
            close={() => setSelectedId(null)}
          />
        ) : null}
      </section>

      <SystemMemoryCard
        entries={systemQuery.data ?? []}
        loading={systemQuery.isLoading}
        error={systemQuery.isError}
        onRetry={() => void systemQuery.refetch()}
        open={systemOpen}
        setOpen={setSystemOpen}
        saving={createSystemMemory.isPending}
        onSave={(input: any, onSuccess: () => void) =>
          createSystemMemory.mutate(
            { ...input, ownerConfirmed: true },
            { onSuccess }
          )
        }
      />

      {legacy.length ? (
        <section className="ryze-glass mt-5 rounded-[1.5rem] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                Legacy records awaiting classification
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                These records are preserved and searchable; category and type
                are not guessed.
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {legacy.slice(0, 12).map(entry => (
              <div
                key={entry.id}
                className="rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-400"
              >
                <span className="text-xs text-amber-200">{entry.kind}</span>
                <p className="mt-1">{entry.content}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <SkillTree skills={skills} />
    </div>
  );
}

function PageHeading() {
  return (
    <div className="mb-7">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1 text-xs font-semibold text-cyan-200">
        <div className="size-1.5 rounded-full bg-cyan-300" />
        Stage 2 · Gate 3 · Owner controls
      </div>
      <h1 className="text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
        Memory governance
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
        Review, classify, approve, version, archive, and delete owner-scoped
        memory. Nothing is silently captured, merged, or shared.
      </p>
    </div>
  );
}

function ReviewSummary({
  review,
  loading,
  error,
  retry,
  confirmed,
  onConfirm,
}: {
  review: any;
  loading: boolean;
  error: boolean;
  retry: () => void;
  confirmed: boolean;
  onConfirm: (value: boolean) => void;
}) {
  if (error) {
    return (
      <InlineError
        message="Memory review failed. Saving is paused until a fresh review succeeds."
        onRetry={retry}
      />
    );
  }
  if (loading || !review) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/10 p-3 text-xs text-slate-400">
        <Loader2 className="size-3.5 animate-spin text-cyan-300" />
        Checking for duplicates and possible conflicts…
      </div>
    );
  }
  const requiresConfirmation = review.requiresOwnerReview;
  return (
    <div
      className={cn(
        "mt-4 rounded-xl border p-3 text-xs",
        requiresConfirmation
          ? "border-amber-300/20 bg-amber-300/[0.04]"
          : "border-emerald-300/15 bg-emerald-300/[0.035]"
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-slate-200">
        {requiresConfirmation ? (
          <AlertTriangle className="size-3.5 text-amber-300" />
        ) : (
          <CheckCircle2 className="size-3.5 text-emerald-300" />
        )}
        Review result:{" "}
        <span
          className={
            requiresConfirmation ? "text-amber-200" : "text-emerald-200"
          }
        >
          {review.decision}
        </span>
      </div>
      {review.exact?.length ? (
        <ReviewMatches title="Exact duplicate" items={review.exact} />
      ) : null}
      {review.conflicts?.length ? (
        <ReviewMatches
          title={`Possible conflict${review.conflicts.length === 1 ? "" : "s"}`}
          items={review.conflicts}
        />
      ) : null}
      {review.similar?.length ? (
        <ReviewMatches
          title="Other memories in this category and type"
          items={review.similar.slice(0, 3)}
        />
      ) : null}
      {requiresConfirmation ? (
        <label className="mt-3 flex cursor-pointer items-start gap-2 border-t border-amber-200/10 pt-3 leading-5 text-amber-100">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={event => onConfirm(event.target.checked)}
            className="mt-0.5 accent-amber-300"
          />
          <span>
            I reviewed the result and confirm this record should be saved. Exact
            duplicates return the existing record instead of creating another.
          </span>
        </label>
      ) : (
        <p className="mt-2 text-slate-500">
          No duplicate or likely conflict found. Save when ready.
        </p>
      )}
    </div>
  );
}

function ReviewMatches({ title, items }: { title: string; items: any[] }) {
  return (
    <div className="mt-3">
      <p className="font-medium text-slate-300">{title}</p>
      <ul className="mt-1 space-y-1.5">
        {items.map(item => (
          <li
            key={item.id}
            className="rounded-lg border border-white/[0.06] bg-black/10 px-2.5 py-2 text-slate-400"
          >
            <span className="line-clamp-2">{item.content}</span>
            <span className="mt-1 block text-[10px] text-slate-600">
              {item.category} · {item.memoryType} · v{item.version}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function splitTags(value: string) {
  return value
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function SelectField({
  label,
  value,
  options,
  onChange,
  inline = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  inline?: boolean;
}) {
  return (
    <label
      className={cn(
        "text-xs text-slate-400",
        inline && "flex items-center gap-2"
      )}
    >
      {label}
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className={cn(
          "rounded-lg border border-white/10 bg-[#080c15] px-2 text-xs text-slate-200",
          inline ? "ml-2 h-8" : "mt-1 h-10 w-full px-3 text-sm"
        )}
      >
        {options.map(option => (
          <option key={option} value={option}>
            {option[0].toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}

function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-300/15 bg-rose-300/[0.04] p-4 text-sm text-rose-100"
    >
      <span>{message}</span>
      <Button
        size="sm"
        variant="outline"
        onClick={onRetry}
        className="border-rose-200/20"
      >
        Retry
      </Button>
    </div>
  );
}

function IdentityCard({
  identity,
  revisions,
  showRevisions,
  setShowRevisions,
  draft,
  setDraft,
  onSave,
  saving,
  loading,
  retryIdentity,
  revisionsLoading,
  revisionsError,
  retryRevisions,
}: any) {
  return (
    <section
      className="ryze-glass rounded-[1.5rem] p-5 sm:p-6"
      aria-labelledby="identity-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="identity-heading"
            className="text-lg font-semibold text-white"
          >
            Ryze identity
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Versioned separately from Personal Memory.
          </p>
        </div>
        {!draft ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => identity && setDraft({ ...identity })}
            disabled={!identity}
            className="border-white/10 bg-white/[0.03] text-slate-200"
          >
            Edit identity
          </Button>
        ) : null}
      </div>
      {draft ? (
        <div className="mt-4 space-y-2">
          {(
            [
              "name",
              "role",
              "description",
              "communicationStyle",
              "workingPrinciples",
            ] as const
          ).map(field => (
            <Textarea
              key={field}
              value={draft[field] ?? ""}
              onChange={event =>
                setDraft({ ...draft, [field]: event.target.value })
              }
              placeholder={field}
              aria-label={field}
              className="min-h-12 border-white/10 bg-[#080c15]/70 text-xs"
            />
          ))}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onSave(draft)} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-3.5" />
              )}
              Approve revision
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
          <p className="text-[10px] leading-4 text-slate-500">
            Approval creates a new identity revision; previous revisions remain
            available.
          </p>
        </div>
      ) : loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin text-cyan-300" />
          Loading identity…
        </div>
      ) : identity ? (
        <div className="mt-4 space-y-2 text-sm text-slate-300">
          <p className="font-semibold text-cyan-200">{identity.name}</p>
          <p>{identity.role}</p>
          <p className="text-xs leading-5 text-slate-500">
            {identity.description}
          </p>
          <p className="text-[11px] text-slate-600">
            Current revision {identity.version}
          </p>
        </div>
      ) : (
        <InlineError
          message="Identity could not be loaded."
          onRetry={retryIdentity}
        />
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowRevisions(!showRevisions)}
        className="mt-3 px-0 text-xs text-violet-200"
      >
        <History className="mr-2 size-3.5" />
        {showRevisions ? "Hide" : "View"} revision history
      </Button>
      {showRevisions ? (
        revisionsError ? (
          <InlineError
            message="Identity revision history could not be loaded."
            onRetry={retryRevisions}
          />
        ) : (
          revisionsQueryState(revisions, revisionsLoading)
        )
      ) : null}
    </section>
  );
}

function revisionsQueryState(revisions: any[], loading: boolean) {
  if (loading)
    return (
      <div className="mt-2 text-xs text-slate-500">
        Loading revision history…
      </div>
    );
  if (!revisions.length)
    return (
      <div className="mt-2 rounded-lg border border-dashed border-white/10 p-3 text-xs text-slate-500">
        No prior identity revisions.
      </div>
    );
  return (
    <div className="mt-2 max-h-40 space-y-2 overflow-auto">
      {revisions.map((revision: any) => (
        <div
          key={revision.id}
          className="rounded-lg border border-white/[0.06] p-2 text-[11px] text-slate-400"
        >
          <span className="font-semibold text-slate-200">
            v{revision.version}
          </span>{" "}
          · {revision.changedBy} · {String(revision.createdAt)}
        </div>
      ))}
    </div>
  );
}

function SelectedMemory({
  entry,
  content,
  tags,
  setContent,
  setTags,
  onUpdate,
  onArchive,
  onDelete,
  busy,
  close,
}: any) {
  const changed =
    content !== entry.content || tags !== (entry.tags ?? []).join(", ");
  return (
    <div
      className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4"
      aria-label="Selected memory details"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Selected record
          </p>
          <p className="mt-1 break-all text-[11px] text-slate-500">
            {entry.id} · source system{" "}
            {entry.source?.sourceSystemId ?? "unknown"}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="rounded p-1 text-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          aria-label="Close selected memory"
        >
          <XCircle className="size-4" />
        </button>
      </div>
      <Textarea
        value={content}
        onChange={event => setContent(event.target.value)}
        maxLength={5000}
        aria-label="Edit memory content"
        className="mt-3 min-h-24 border-white/10 bg-[#080c15]/70 text-sm"
      />
      <Input
        value={tags}
        onChange={event => setTags(event.target.value)}
        aria-label="Edit memory tags"
        className="mt-2 border-white/10 bg-[#080c15]/70 text-xs"
        placeholder="Tags, comma separated"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={onUpdate}
          disabled={busy || !content.trim() || !changed}
        >
          Save new version
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onArchive}
          disabled={busy}
          className="border-amber-300/20 text-amber-200"
        >
          <Archive className="mr-2 size-3.5" />
          Archive
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDelete}
          disabled={busy}
          className="border-rose-300/20 text-rose-200"
        >
          <Trash2 className="mr-2 size-3.5" />
          Delete permanently
        </Button>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        Updates create a new version and archive this record. Permanent deletion
        asks for confirmation and cannot be undone.
      </p>
    </div>
  );
}

function SystemMemoryCard({
  entries,
  loading,
  error,
  onRetry,
  open,
  setOpen,
  saving,
  onSave,
  onCreated,
}: any) {
  const [content, setContent] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [memoryType, setMemoryType] = useState<MemoryType>("procedural");
  return (
    <section
      className="ryze-glass mt-5 rounded-[1.5rem] p-5 sm:p-6"
      aria-labelledby="system-memory-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="system-memory-heading"
            className="text-lg font-semibold text-white"
          >
            Protected System Memory
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Owner-only review path for stable instructions and architecture
            context. Changes are explicit and never written directly by model
            output.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setOpen(!open);
            if (open) {
              setContent("");
              setSourceRef("");
              setMemoryType("procedural");
            }
          }}
          className="border-white/10 bg-white/[0.03] text-slate-200"
        >
          {open ? "Close form" : "Review / add"}
        </Button>
      </div>
      {open ? (
        <div className="mt-4 rounded-2xl border border-violet-300/15 bg-violet-300/[0.04] p-4">
          <p className="text-xs leading-5 text-slate-400">
            Confirm only stable, reviewed material appropriate for shared system
            context.
          </p>
          <SelectField
            label="Memory type"
            value={memoryType}
            options={memoryTypes}
            onChange={value => setMemoryType(value as MemoryType)}
          />
          <Textarea
            value={content}
            onChange={event => setContent(event.target.value)}
            maxLength={5000}
            aria-label="System Memory content"
            placeholder="Reviewed System Memory content…"
            className="mt-2 min-h-20 border-white/10 bg-[#080c15]/70 text-sm"
          />
          <Input
            value={sourceRef}
            onChange={event => setSourceRef(event.target.value)}
            maxLength={500}
            aria-label="System Memory source reference"
            placeholder="Source reference (optional)"
            className="mt-2 border-white/10 bg-[#080c15]/70 text-xs"
          />
          <Button
            onClick={() =>
              onSave(
                {
                  memoryType,
                  content: content.trim(),
                  tags: ["owner-reviewed"],
                  sourceRef: sourceRef.trim() || undefined,
                  sensitivity: "normal",
                },
                () => {
                  setContent("");
                  setSourceRef("");
                  setMemoryType("procedural");
                  setOpen(false);
                }
              )
            }
            disabled={saving || !content.trim()}
            className="mt-3 bg-violet-500 text-white hover:bg-violet-400"
          >
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 size-4" />
            )}
            Approve System Memory
          </Button>
        </div>
      ) : null}
      {error ? (
        <InlineError
          message="Protected System Memory could not be loaded."
          onRetry={onRetry}
        />
      ) : loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin text-violet-300" />
          Loading protected entries…
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {entries.slice(0, 8).map((entry: any) => (
            <div
              key={entry.id}
              className="rounded-xl border border-white/[0.07] bg-black/10 p-3"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold capitalize text-violet-200">
                  {entry.memoryType} · v{entry.version}
                </span>
                <span className="text-slate-600">{entry.status}</span>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-300">
                {entry.content}
              </p>
              <p className="mt-2 break-all text-[10px] text-slate-600">
                {entry.sourceRef ?? "No source reference"}
              </p>
            </div>
          ))}
          {!entries.length ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
              No protected System Memory entries yet.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function SkillTree({ skills }: { skills: any[] }) {
  return (
    <section className="ryze-glass mt-5 rounded-[1.5rem] p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.04]">
          <BrainCircuit className="size-5 text-violet-300" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Skill tree</h2>
          <p className="text-xs text-slate-500">
            Operational XP remains separate from governed memory.
          </p>
        </div>
      </div>
      {skills.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
          Run a supported demo action to establish skill progression.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {skills.map(skill => (
            <div
              key={skill.id}
              className="rounded-2xl border border-white/[0.07] bg-black/10 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold capitalize text-slate-100">
                  {skill.domain}
                </span>
                <span className="text-xs font-bold text-violet-300">
                  Lv {skill.level}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{skill.xp} XP</span>
                <span>{skill.successCount} successful</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
