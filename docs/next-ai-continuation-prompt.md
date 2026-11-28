# Prompt for the Next AI — Continue RyzeFramework to Completion

You are continuing the existing `RyzeFramework` project owned by `mohdnurkhairulnizam`. Do not create a replacement project.

## Repository and branch

Repository:

```text
https://github.com/mohdnurkhairulnizam/RyzeFramework.git
```

The active implementation branch is `feature/mempalace-production-gate`. Clone it directly:

```bash
git clone --branch feature/mempalace-production-gate --single-branch https://github.com/mohdnurkhairulnizam/RyzeFramework.git
cd RyzeFramework
git fetch origin --prune
git status --short --branch
git log --oneline --decorate -10
```

The current pushed head is the continuation checkpoint recorded in `docs/current-stage-handoff.md` and `docs/project-memory.md`. Verify the remote head before acting; do not assume `main` contains this work. If an authorized GitHub connector or authenticated `gh` CLI is available, use it. Do not ask the owner for a token, run `gh auth login`, force-push, reset, clean, or overwrite uncommitted changes.

## Read first

Read these documents before planning or editing:

1. `docs/current-stage-handoff.md`
2. `docs/project-memory.md`
3. `docs/stage-2-implementation-plan.md`
4. `docs/memory-identity-contract.md`
5. `docs/blueprint-implementation.md`
6. `docs/origin-blueprint.md`
7. `docs/ryze-playbook.md`
8. `docs/mempalace-production-integration-gate.md`
9. `docs/evidence/mempalace-production-dry-run-manifest-2026-11-28.json`
10. `docs/evidence/mempalace-adapter-assessment-2026-11-28.md`
11. `docs/stage-3-wp1-protected-skill-registry-spec-2026-11-29.md`
12. `docs/stage-3-wp1-implementation-plan-2026-11-29.md`
13. This file

Preserve the distinction between independently run sandbox evidence, owner-reported disposable Windows evidence, and unrun work.

## Non-negotiable architecture and safety boundaries

- SQLite remains the operational and authoritative memory store.
- MemPalace is optional and rebuildable, behind the provider-neutral `MemoryProvider` boundary.
- Live Ryze routers remain SQLite-backed; MemPalace is not enabled in normal production behavior.
- Automatic memory formation, broad MCP/skill writes, cross-agent memory sharing, System Memory projection, and SQLite replacement remain disabled.
- Do not use private production data, live databases, secrets, Telegram sessions, real backups, or `.env` files for MemPalace testing.
- Preserve owner scoping, provenance, versioning, restricted retrieval, conflict confirmation, rollback, export/restore, and fail-closed behavior.
- Do not bulk-install ECC or modify live Ryze skill/intent rules as a shortcut.
- Do not describe a branch push or merge as Stage 1 or Stage 2 completion.

## Current gate status at this checkpoint

- Stage 1: **PARTIAL — closed for sequencing, not complete**. Preserve its original criteria and historical self-test.
- Stage 2: **active and not complete**. Gate 2 implementation is complete; Gate 3 owner-facing synthetic acceptance is complete for its tested scope; Gate 4 is passed only for the approved synthetic evaluation; Gate 5 is passed only for the documented disposable synthetic Windows scope. Generated Markdown summary delivery is **PASS — owner-reported** for the exact bounded request; target-Windows automatic retention remains open.
- MemPalace Gate 0 architecture review: **PASS**.
- MemPalace Gate 1 provider-neutral contract harness: **PASS**.
- Linux pinned MemPalace MCP replay: **PASS**.
- Target-Windows synthetic MemPalace replay: **PASS for disposable synthetic scope only**, including provider-unavailable behavior, restart/replay, search rehydration, and deletion reconciliation. Do not generalize this to live or production data.
- Approved production-gate dry run: **PASS with no writes**. Manifest SHA-256: `7bbf637a41614f943ea8d1d9b1284b1429ccce3d335eaa5930e94d068f710893`.
- Approved disposable canary projection: **PASS** for exactly `fixture-1` and `fixture-2`, owner metadata `991122`, namespace `ryze-dry-run-sanitized`, branch `sanitized-test`.
- Disposable MCP restart/rehydration: **PASS**.
- Disposable provider-unavailable SQLite outbox retention and replay: **PASS**.
- Disposable deletion reconciliation: **PASS** after explicit approval; deleted `fixture-1`, retained `fixture-2`.
- Final repository validation on the pushed head: `pnpm run check` PASS, 26 test files/87 tests PASS, `pnpm run build:local` PASS, `git diff --check` PASS.
- Live or production projection: **NOT APPROVED and NOT PERFORMED**.
- Stage 3 WP-1 Protected Skill Registry: **design reviewed/prepared; implementation not started**. The bounded specification is `docs/stage-3-wp1-protected-skill-registry-spec-2026-11-29.md`. Do not activate autonomous mutation, dynamic code loading, automatic promotion, watchdogs, or unrestricted file creation.

## Immediate next work

1. Read `docs/mempalace-production-integration-gate.md` and design any remaining work as a separately reviewed, reversible gate.
2. Keep the live routers SQLite-only until a new explicit owner approval authorizes a specific production manifest, namespace, provider revision, batch size, and lease.
3. If proposing controlled production projection, first produce a new exact dry-run manifest and request owner approval. Do not reuse the disposable canary approval.
4. Before any live projection, add/verify health/status reporting, canonical SQLite fingerprint capture, export/restore evidence, resource limits, rollback/discard procedure, and fail-closed approval/hash checks required by the production gate.
5. Preserve the remaining Stage 1 residuals and Stage 2 open items, including target-Windows automatic 30-day expiry verification. The narrow generated-summary capability is owner-reported PASS, but it is not general file creation.
6. Treat Stage 3 runtime implementation and Stage 4 as future work unless separately authorized. WP-1 design preparation is not implementation authorization.

## Validation and Git rules

For code changes, run focused tests plus:

```bash
pnpm run check
pnpm test -- --run
pnpm run build:local
git diff --check
```

Inspect the complete staged diff and confirm that `.env*`, databases, backups, logs, Telegram sessions, `node_modules`, `dist`, ZIP artifacts, and private data are not staged. Work on `feature/mempalace-production-gate`; never force-push. Do not merge into `main` without explicit review and approval. Push through the authorized GitHub connector/authenticated Git route and report the full commit hash, validation results, skipped checks, and remaining risks.

## Copy-paste instruction for the next AI

> Clone `https://github.com/mohdnurkhairulnizam/RyzeFramework.git` on branch `feature/mempalace-production-gate` using the authorized GitHub connector available in this conversation. Fetch the latest remote state, inspect `git status` before editing, and read `docs/current-stage-handoff.md`, `docs/project-memory.md`, `docs/stage-2-implementation-plan.md`, `docs/memory-identity-contract.md`, `docs/mempalace-production-integration-gate.md`, and this continuation prompt. Continue the project rather than creating a replacement. Keep SQLite authoritative and live routers SQLite-only. Treat MemPalace as an optional rebuildable projection. The disposable Linux and Windows synthetic MemPalace gates now pass, but live/production projection is not approved. Do not use private data, live databases, secrets, backups, Telegram sessions, automatic capture, broad MCP/skill writes, or cross-agent sharing. Propose the next exact gate and request fresh owner approval before any live projection. Preserve Stage 1 as PARTIAL and Stage 2 as active/not complete. Run the repository validation suite for code changes, commit only intentional changes on `feature/mempalace-production-gate`, and push without force-pushing or merging `main`.
