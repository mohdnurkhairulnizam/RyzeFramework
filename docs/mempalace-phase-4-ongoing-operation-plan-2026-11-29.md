# MemPalace Phase 4 — Ongoing-operation hardening under Stage 2

**Status:** Implemented in the repository; target-Windows operational evidence remains owner-reported and must be retained separately.

This is a Stage 2 external-memory-provider workstream. It is not the origin blueprint's Stage 3. SQLite remains the operational and authoritative memory store; MemPalace remains an optional, rebuildable projection.

## Objective

Convert the bounded Stage 3A projection-only pilot into a safe ongoing-operation model without enabling broad automatic capture, provider authority, System Memory projection, restricted-memory projection, cross-agent sharing, or provider-derived search.

## Fixed operating policy

- Runtime mode is explicit `projection-only`; default remains `disabled`.
- Only a reviewed manifest's exact memory ID/version pairs may project.
- Every activation is bound to provider revision, namespace, branch, manifest hash, operation count, and an expiring approval lease.
- Lease expiry is enforced while the process is running, not only at startup.
- SQLite writes complete first; projection is queued durably in SQLite.
- Provider errors never mutate or delete canonical SQLite records.
- Derived search remains disabled until a separate approved retrieval gate.
- System, restricted, archived, superseded, unresolved-conflict, and unapproved records remain excluded.
- Replay is bounded by a configurable per-call limit with a hard safety ceiling.

## Work packages and acceptance gates

### P4.1 Approval and lease lifecycle — implemented

Implement and test:

- strict manifest/approval hash and parameter matching;
- unexpired lease validation at startup;
- runtime lease expiry enforcement for projection, replay, and derived-search paths;
- bounded health fields for lease expiry, manifest hash, and approved operation count;
- fail-closed behavior that falls back to SQLite when approval is missing, invalid, or expired.

### P4.2 Durable outbox and reconciliation — implemented

Implement and test:

- bounded replay work per invocation;
- durable pending/in-flight/applied/failed accounting;
- conservative failure handling;
- recovery of interrupted in-flight work;
- explicit health reconciliation status (`healthy`, `pending`, or `degraded`);
- no silent conversion of failed work to applied.

### P4.3 Health and operator evidence — implemented

The protected health snapshot must expose only bounded operational metadata:

- mode and enabled/searchable state;
- provider revision and namespace;
- lease active/expiry;
- manifest hash and approved operation count;
- canonical SQLite availability;
- replay ceiling and outbox counts;
- reconciliation status and last successful replay;
- bounded configuration/error text.

No content, secrets, raw source references, or private memory bodies belong in the health snapshot.

### P4.4 Target-Windows operating procedure — owner verification

For each activation or renewal, retain redacted evidence of:

1. package/source checksum;
2. manifest and approval hash/parameters/expiry;
3. pre-activation SQLite integrity/count/fingerprint;
4. health snapshot;
5. dashboard and Memory Vault availability;
6. restart and outbox recovery;
7. any provider-unavailable fallback;
8. post-rollback SQLite integrity/count/fingerprint;
9. approval-file removal or renewal result.

### P4.5 Separate future gate — not enabled here

A new reviewed manifest and explicit approval are required for any new record/version. Derived search, automatic capture, broad synchronization, System Memory/restricted projection, and cross-agent sharing require separate design and acceptance gates.

## Execution result

Repository implementation adds runtime lease enforcement, bounded replay configuration, and reconciliation/approval metadata to health reporting. Focused tests cover lease expiry and replay ceilings; the existing full suite and type/build checks must pass before this workstream is treated as repository-complete.

Phase 4 hardening does not make MemPalace authoritative and does not change the origin blueprint Stage 1/2/3 status.
