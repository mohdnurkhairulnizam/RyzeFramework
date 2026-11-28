# Stage 3 transition readiness — 29 November 2026

## Decision

**Prepared, not started.** Origin blueprint Stage 3 remains gated until Stage 2 is formally closed. The generated-summary benchmark is now **PASS, owner-reported**. The remaining Stage 2 closure gate is the disposable target-Windows file-retention test using `RYZE_FILE_RETENTION_DAYS=1`, followed by restart-sweep verification and the final read-only SQLite check.

This document prepares the transition; it does not authorize Stage 3 implementation, autonomous skill mutation, a watchdog, automatic rollback, unrestricted file creation, or any change to MemPalace authority.

## Stage 2 exit gate

| Gate | Current status | Required closure evidence |
|---|---|---|
| Origin §2.9 to nine-item contract reconciliation | PASS | [`evidence/stage-2-contract-reconciliation-2026-11-29.md`](./evidence/stage-2-contract-reconciliation-2026-11-29.md) |
| Bounded generated Markdown capability | PASS, owner-reported | Exact request completed; distinct Markdown artifact delivered to originating authorized private chat |
| MemPalace Phase 4 hardening | PASS, owner-reported | Exact eight-operation projection-only scope; SQLite authoritative; expiry and rollback verified |
| Derived search | Defined, not enabled | Separate acceptance gate remains closed |
| Ongoing projection policy | Defined, activation not authorized | Any future window requires fresh exact approval |
| Automatic file expiry | OPEN | One-day disposable Windows test, restart sweep, current-file retention check, final SQLite integrity/count/fingerprint |

Stage 3 must not begin until the final row is closed or explicitly owner-deferred and recorded in the signoff matrix.

## Origin blueprint Stage 3 scope

The transition target is the origin blueprint's **Autonomous Skills & Self-Recovery** stage, not the project-specific MemPalace Stage 3A label. The origin blueprint requires:

1. Protected Core Skills and separately governed Evolving Skills.
2. A structured skill registry with revision management.
3. Configuration separation and verified backups.
4. Controlled deployment and rollback.
5. An independent watchdog with heartbeat, crash detection, bounded restart policy, and loop protection.
6. Diagnostic preservation, owner notification, and recovery-incident recording.

The origin blueprint completion criteria additionally require service recovery and evidence that the watchdog is independent of the process it supervises.

## Proposed Stage 3 work packages

### 3.1 Skill registry and permission model

Define the skill record, tier, revision, owner approval, permissions, input/output contract, dependency set, rollback pointer, and audit events. Core skills must be protected from autonomous modification. Evolving skills must begin disabled until individually reviewed.

### 3.2 Configuration and backup boundary

Separate immutable application code, reviewed skill definitions, mutable local configuration, runtime state, logs, and backups. Verify backups before use and preserve the existing rule that private backups and credentials are never sent into project evidence.

### 3.3 Controlled deployment and rollback

Use a staged disposable profile first. Require a manifest and checksum for every skill revision. Support prepare, verify, activate, health-check, and rollback states. A failed activation must leave the prior known-good revision available.

### 3.4 Independent watchdog design

Compare Windows Task Scheduler, an independent Python supervisor, and another Windows-compatible service boundary. Select only after testing heartbeat intervals, bounded retries, restart-loop protection, restricted permissions, diagnostic preservation, owner notification, and recovery-incident recording.

### 3.5 Acceptance evidence

Every Stage 3 work package must distinguish repository tests, synthetic tests, disposable-Windows tests, and owner-reported operational evidence. No watchdog or autonomous skill claim may be inferred from the existing MemPalace projection tests.

## Non-goals and preserved boundaries

- SQLite remains the operational and authoritative memory store.
- MemPalace remains an optional rebuildable projection; it is not a watchdog, skill registry, rollback authority, or system authority.
- `RYZE_MEMPALACE_MODE=disabled` remains the safe default.
- Derived MemPalace search remains disabled.
- Automatic capture, broad provider writes, System Memory projection, restricted-memory projection, and cross-agent sharing remain disabled.
- Generated-file creation remains restricted to the reviewed bounded Markdown-summary capability.
- No unrestricted shell execution, arbitrary paths, broadcasts, group-chat delivery, or broad skill self-modification is authorized.

## Transition procedure after Stage 2 closure

1. Record the final retention evidence and update the Stage 2 signoff matrix.
2. Obtain an explicit owner decision to start origin blueprint Stage 3 planning.
3. Freeze the Stage 2 baseline commit, package identity, SQLite fingerprint, and active safety boundaries.
4. Create a separate Stage 3 design checkpoint before implementing any watchdog or skill lifecycle code.
5. Review the Stage 3 design against the origin blueprint completion criteria and approve work packages individually.
6. Start with a disposable synthetic profile; do not modify the normal Windows profile or production projection settings.

## Research checkpoint

The requested eight-repository Stage 3 research is recorded in [`stage-3-research-architectural-enhancement-2026-11-29.md`](./stage-3-research-architectural-enhancement-2026-11-29.md). Its recommendation is to preserve Ryze's existing execution and authority boundaries, adapt only selected evaluation, skill-proposal, process-supervision, and orchestration patterns, and implement WP-1 metadata/validation first. The report does not authorize dependency installation or Stage 3 runtime activation.

**Current transition status:** Stage 3 readiness prepared; Stage 2 closure pending retention evidence.
