# MemPalace production-integration gate

This gate defines the conditions for any future MemPalace projection from Ryze. It is a design and review gate, not authorization to run against the live database now.

## Non-negotiable architecture

SQLite remains the operational and authoritative memory store. MemPalace is a rebuildable projection behind the provider-neutral `MemoryProvider` boundary. Live routers must continue to operate when MemPalace is stopped, unavailable, corrupted, or removed. No provider identifier may replace a Ryze memory ID, and no provider result may bypass owner, category, type, sensitivity, version, lifecycle, or provenance checks performed by Ryze.

Automatic capture, broad MCP/skill writes, cross-agent sharing, System Memory writes, and model-directed projection remain disabled. Only an explicit owner-approved projection job may read approved records and enqueue sanitized projection operations.

## Gate phases

### Phase 0 — static and environment preflight

The exact MemPalace revision, Python/ChromaDB environment, MCP command, resource envelope, package hashes, and bridge protocol must be pinned. The environment must be isolated from the installed Ryze database, `.env`, Telegram sessions, backups, and normal runtime directories. The provider must expose a separate namespace/palace path for the Ryze installation and branch. A missing or mismatched executable, revision, namespace, or manifest is a hard failure.

### Phase 1 — dry-run only

A dry-run reads only the owner-approved candidate set through the SQLite provider and emits a redacted projection manifest. It must not start a write-capable provider operation, create/update/delete a drawer, alter the outbox, alter the live database, or send records to an external service. The manifest must contain record IDs, owner scope, category/type, version, content hash, sanitized-content hash, source reference class, and planned operation, but not raw private content or secrets.

The owner reviews the manifest and explicitly approves the exact record IDs, versions, branch, namespace, and operation count. Approval expires if any of those values change. A new dry-run is required after any source, code, provider, namespace, or package change.

### Phase 2 — isolated canary projection

The first write-enabled run uses a disposable namespace and a small synthetic or explicitly redacted set. Before writing, Ryze records the canonical SQLite fingerprint, outbox checkpoint, provider revision, namespace, and manifest hash. Projection is append-only and idempotent. Every drawer carries the Ryze memory ID, owner ID, category, type, version, branch, sensitivity, source system, and source reference metadata.

The canary must prove owner isolation, restricted-record exclusion by default, duplicate idempotency, version filtering, deletion reconciliation, provider restart/replay, provider-unavailable SQLite operation, and rollback by discarding the disposable namespace. Any provider error stops the batch; no automatic fallback may silently mark failed operations as applied.

### Phase 3 — controlled production projection

Production projection requires a second explicit owner approval after the dry-run manifest is reviewed. The job must run with a fixed record/version allowlist, fixed namespace, fixed provider revision, bounded batch size, rate/resource limits, and a time-limited lease. It must not broaden its own selection or capture new records. System Memory, restricted records, unresolved conflicts, archived/superseded records, and records without valid provenance are excluded unless separately approved by a reviewed policy.

The projection outbox remains durable in SQLite. Each operation has pending, in-flight, applied, or failed state, deterministic identity, retry count, bounded error text, and reconciliation status. Interrupted in-flight operations recover safely. Provider search results are never authoritative and must be rehydrated through SQLite before being returned to a user or model.

### Phase 4 — acceptance and ongoing operation

Acceptance requires the existing repository checks plus target-Windows evidence, provider restart/replay, deletion reconciliation, export/restore behavior, provider-unavailable behavior, resource measurements, package/hash verification, and a rollback drill using a disposable namespace. The owner records the exact source commit, provider commit, package hash, namespace, manifest hash, and sanitized results.

A production projection must have a health/status view showing provider revision, namespace, last successful replay, pending/in-flight/failed counts, last bounded error, and canonical SQLite availability. Health degradation must not block normal SQLite operation and must not trigger unapproved repair, deletion, or capture.

## Fail-closed conditions

Projection must stop without mutating canonical SQLite when the owner approval is absent or stale, the manifest hash changes, the provider command or revision differs, the namespace cannot be verified, a record loses owner/provenance/version metadata, a restricted record is selected without explicit approval, sanitization detects secret-like content, the MCP handshake/tools differ from the pinned contract, or the provider returns an ambiguous result.

Deletion and reconciliation must be conservative. If the provider cannot confirm deletion, Ryze records a failed reconciliation and keeps the canonical record unchanged. Provider search must return no result rather than an unverified result when rehydration cannot prove canonical existence and current owner/version/lifecycle eligibility.

## Current status

The Linux synthetic and real Windows synthetic replay checks pass for the tested provider-unavailable, restart/replay, search-rehydration, and deletion paths. This does not authorize Phase 2 or Phase 3 live projection. The current safe tools are the read-only live SQLite check (`scripts/windows/Check-Live-Sqlite.ps1`) and the sanitized disposable-copy harness (`scripts/sanitized-mempalace-copy.ts`).
