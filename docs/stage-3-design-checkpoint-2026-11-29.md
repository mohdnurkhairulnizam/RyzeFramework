# Origin blueprint Stage 3 design checkpoint — 29 November 2026

## Decision recorded

The owner directed proceeding with the Stage 3 transition procedure and approved this separate design checkpoint and work-package review. This records approval to **prepare and review the origin blueprint Stage 3 design**. It does not authorize implementation, autonomous skill mutation, watchdog installation, automatic rollback, unrestricted file creation, or any MemPalace authority change.

Stage 2 remains **active/not complete** until the target-Windows one-day retention evidence is supplied and reviewed.

## Design review against origin blueprint completion criteria

| Origin blueprint criterion | Stage 3 work package | Design status | Implementation gate |
|---|---|---|---|
| Core and Evolving Skills registered | WP-1 protected skill registry | Design prepared | Individual owner approval after Stage 2 closure |
| Skill revision management | WP-1 revision and provenance model | Design prepared | Manifest/checksum and rollback tests |
| Configuration separation | WP-2 configuration/state boundary | Design prepared | Disposable synthetic profile only |
| Backup verification | WP-2 backup integrity and exclusion checks | Design prepared | Synthetic backup/restore acceptance |
| Controlled deployment | WP-3 staged activation pipeline | Design prepared | Verified package and disposable Windows run |
| Rollback capability | WP-3 known-good revision rollback | Design prepared | Failure injection and recovery evidence |
| Independent watchdog | WP-4 supervisor boundary | Design prepared | Technology comparison and owner approval |
| Crash detection | WP-4 heartbeat and crash detector | Design prepared | Synthetic crash test |
| Service recovery | WP-4 bounded restart policy | Design prepared | Restart-loop protection and recovery test |
| Diagnostic preservation | WP-5 incident evidence | Design prepared | Sanitized diagnostic retention test |
| Owner notification | WP-5 notification contract | Design prepared | Non-sensitive notification acceptance |
| Recovery incident recording | WP-5 auditable incident record | Design prepared | Schema and replay/idempotence tests |

## Work packages for individual approval

### WP-1 — Protected skill registry

Define immutable skill identity, tier (`core` or `evolving`), revision, permission set, input/output contract, dependency list, owner approval, checksum, activation state, and rollback pointer. Core skills cannot be autonomously modified. Evolving skills start disabled.

### WP-2 — Configuration and backup separation

Separate application code, skill definitions, mutable configuration, runtime state, logs, and backups. Preserve credential exclusion and private-backup handling. Verify backups before use; never test against the normal Windows profile.

### WP-3 — Controlled deployment and rollback

Use prepare → validate → activate → health-check → retain/rollback states. Require a manifest and checksum for every skill revision. A failed activation must preserve the prior known-good revision.

### WP-4 — Independent watchdog

Compare Windows Task Scheduler, an independent Python supervisor, and another Windows-compatible service boundary. Select only after testing heartbeat interval, bounded retries, restart-loop protection, restricted permissions, crash detection, and service recovery.

### WP-5 — Diagnostics and owner notification

Define sanitized incident fields, diagnostic preservation limits, owner notification channels, incident IDs, recovery outcome, and idempotent retry behavior. Do not store secrets, Telegram sessions, database contents, or private document content in incident evidence.

## Preserved boundaries

- SQLite remains authoritative.
- MemPalace remains an optional rebuildable projection and is not the Stage 3 watchdog, skill registry, rollback authority, or system authority.
- `RYZE_MEMPALACE_MODE=disabled` remains the safe default.
- Derived search, automatic capture, broad provider writes, System Memory projection, restricted-memory projection, and cross-agent sharing remain disabled.
- Generated-file creation remains limited to the reviewed bounded Markdown-summary capability.
- No shell execution, arbitrary paths, broadcasts, group-chat delivery, or unrestricted self-modification is enabled.

## Approval state

- Planning approval: **OWNER-DIRECTED — approved for preparation and design review**.
- WP-1 through WP-5 design review: **COMPLETE — individually reviewed at design level**.
- WP-1 through WP-5 implementation approval: **PENDING Stage 2 closure and separate implementation authorization**.
- Stage 3 start: **NOT STARTED**.
- Stage 2 closure prerequisite: **target-Windows retention evidence OPEN**.

The disposable synthetic-profile procedure is [`stage-3-disposable-synthetic-profile-guide-2026-11-29.md`](./stage-3-disposable-synthetic-profile-guide-2026-11-29.md). It requires a disposable VM or separate Windows profile, uses `RYZE_MEMPALACE_MODE=disabled`, forbids real credentials and production data, and starts with a read-only SQLite baseline.


## WP-1 detailed design checkpoint — 29 November 2026

The owner-directed WP-1 review is complete at the design level. The protected registry specification is [`stage-3-wp1-protected-skill-registry-spec-2026-11-29.md`](./stage-3-wp1-protected-skill-registry-spec-2026-11-29.md).

**Disposition:** bounded design prepared; implementation not started. The design maps the origin blueprint registry fields and Stable Revision → Backup → New Revision → Isolated Testing → Validation → Approval → Promotion → Monitoring → Rollback lifecycle into a SQLite-authoritative, owner-scoped registry concept. It preserves the existing `ryze_skills` XP/domain table and does not repurpose it.

The safe future implementation slice is read-only registry inspection, schema/migration, fail-closed transition validation, and fixture-only tests. Autonomous mutation, dynamic code loading, automatic promotion, watchdog installation, unrestricted file creation, production deployment, and MemPalace authority remain disabled. Separate implementation authorization is required after Stage 2 closure.

The initial sequencing and task breakdown is [`stage-3-wp1-implementation-plan-2026-11-29.md`](./stage-3-wp1-implementation-plan-2026-11-29.md). It is a planning artifact only and does not authorize implementation.

Stage 2 remains active/not complete because target-Windows automatic retention evidence is still open. The generated Markdown summary capability is recorded as owner-reported PASS for the exact bounded request and does not change that stage disposition.
