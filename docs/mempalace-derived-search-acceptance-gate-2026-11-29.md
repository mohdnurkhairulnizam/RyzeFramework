# MemPalace derived-search acceptance gate — 29 November 2026

**Status:** defined, not approved, not enabled.

Derived MemPalace search is not required by the Stage 2 v1 memory contract. Canonical SQLite retrieval remains the operational path. This gate exists so any future enablement is measured and reversible rather than bundled into projection activation.

## Preconditions

1. SQLite remains authoritative and the provider-neutral `MemoryProvider` contract remains unchanged.
2. Projection approval, lease enforcement, outbox replay, reconciliation, and rollback remain passing.
3. The exact provider revision, namespace, branch, and manifest are recorded for the evaluation.
4. `RYZE_MEMPALACE_SEARCH_DERIVED=false` remains the default and rollback value.
5. Only sanitized, owner-approved synthetic fixtures are used for the first evaluation; no private production corpus is required.

## Required evaluation

Compare SQLite retrieval and derived-provider retrieval over an owner-approved fixed fixture set covering:

- owner isolation;
- category/type filters;
- restricted default exclusion and explicit owner inclusion;
- stale version and archived/superseded rehydration rejection;
- source/provenance preservation;
- duplicate/conflict visibility;
- no-result behavior;
- deterministic result bounds and ordering;
- provider unavailable, timeout, malformed hit, and lease-expiry fallback.

Every derived hit must be rehydrated and authorized against canonical SQLite before it can be returned. Provider IDs must never replace Ryze memory IDs. A provider result that cannot be matched to a current canonical owner/version record must be discarded.

## Acceptance thresholds

- No cross-owner or restricted-default leakage.
- Zero stale/archived/superseded records returned as active context.
- Zero provider-only records returned.
- No change to canonical SQLite rows or fingerprint.
- Provider failure and lease expiry fall back to canonical SQLite without request failure where the canonical path is available.
- Retrieval quality is reported separately for the fixed evaluation and must not be generalized to a production corpus.

## Rollback

Set `RYZE_MEMPALACE_SEARCH_DERIVED=false`; if necessary set `RYZE_MEMPALACE_MODE=disabled`. Re-run the read-only SQLite integrity/count/fingerprint checker and confirm the dashboard and Memory Vault remain available.

## Decision

This gate is **not approved or enabled** by the current Stage 2 closure work. A later approval must identify the fixture set, thresholds, provider revision, lease, resource envelope, and rollback evidence.
