# MemPalace bounded ongoing-operation policy — 29 November 2026

**Status:** policy defined; no activation authorized by this document.

## Operating mode

The only supported non-disabled mode is `projection-only`. SQLite is the operational and authoritative store. MemPalace is an optional, rebuildable projection. The default and emergency state is:

```text
RYZE_MEMPALACE_MODE=disabled
RYZE_MEMPALACE_SEARCH_DERIVED=false
```

A controlled window may use:

```text
RYZE_MEMPALACE_MODE=projection-only
RYZE_MEMPALACE_SEARCH_DERIVED=false
RYZE_MEMPALACE_MAX_REPLAY_ITEMS=1
```

## Scope boundary

Each activation requires a new owner approval bound to:

- exact manifest SHA-256;
- unique memory ID/version pairs;
- pinned provider revision;
- namespace and branch;
- operation count;
- expiry lease;
- replay limit and resource envelope;
- rollback and approval-removal procedure.

An expired approval cannot be renewed in place for new records. Any changed manifest, provider revision, namespace, branch, operation count, or replay policy requires a new review and approval.

Automatic capture, broad provider writes, System Memory projection, restricted-memory projection, cross-agent sharing, and provider-derived search remain disabled. New memory records must be accepted by canonical SQLite first; projection failure must not fail or roll back the canonical operation.

## Monitoring cadence

At activation, after restart, after any replay, and before rollback, capture only sanitized health metadata:

- mode, enabled, searchable;
- provider revision, namespace, manifest hash, approved operation count;
- lease active/expiry and replay limit;
- canonical SQLite availability;
- reconciliation status;
- outbox pending, in-flight, applied, and failed counts.

Do not collect memory bodies, source references, credentials, approval JSON, `.env` contents, databases, logs containing private data, or Telegram session material.

## Stop/rollback thresholds

Immediately stop projection and set `RYZE_MEMPALACE_MODE=disabled` if:

- lease is expired or health reports `leaseActive=false` during an intended active window;
- `canonicalSqliteAvailable=false`;
- reconciliation is `degraded`;
- outbox failures increase unexpectedly or cannot be retried safely;
- provider revision, namespace, branch, manifest hash, or operation count differs from approval;
- any restricted/System Memory/unapproved operation is observed;
- resource limits or bounded replay limits are exceeded;
- dashboard, Memory Vault, or SQLite-backed reads become unavailable.

After rollback, remove the temporary approval file and run the read-only SQLite integrity/count/fingerprint checker. Counts and the memory-row SHA-256 must match the pre-activation baseline unless a separately approved canonical memory change occurred.

## Renewal

Renewal is not automatic. Before lease expiry, the owner must review a fresh sanitized health snapshot and explicitly approve the same exact manifest and policy. If approval is not renewed, the process must fail closed at expiry while SQLite-backed operation remains available.

## Current decision

The target-Windows Phase 4 procedure passed for the tested exact eight-operation scope. This policy is the operating design for a possible future bounded window, not authorization for permanent or unrestricted activation. A separate owner approval is required before any new activation.
