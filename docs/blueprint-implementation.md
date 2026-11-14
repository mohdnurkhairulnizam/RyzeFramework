# Blueprint implementation map

The repository currently implements a secure hosted foundation for the supplied four-stage design. The origin document is preserved in [`origin-blueprint.md`](./origin-blueprint.md). This map distinguishes implemented behavior from architectural intent that still requires technical decisions.

## Current implementation

| Blueprint requirement | Repository implementation |
| --- | --- |
| Controlled task lifecycle, validation, logging and result reporting | `server/routers/ryze.ts`, `server/ryzeExecution.ts`, `server/ryzeDemo.ts` |
| Permission boundary outside model reasoning | The safe action classifier blocks shell, credential, email and Telegram requests; arbitrary shell execution is not exposed |
| User authentication and ownership enforcement | `server/_core`, `server/ryzeOwnership.ts`, scoped queries in `server/db.ts` |
| Persistent sessions, tasks, logs, memory, skills and file metadata | `drizzle/schema.ts` and `server/db.ts` |
| Experience-memory search and learning | `searchMemory`, task summaries, memory writes and skill XP updates in `server/db.ts` |
| Original file bytes kept outside the database | `server/storage.ts`; database stores validated file metadata only |
| Portable export and credential-safe migration | `server/ryzeExport.ts`; provider and integration flags export disabled |
| Bounded recovery attempts and diagnostic audit trail | `server/ryzeExecution.ts` and persisted task logs |
| Verification before claiming completion | Vitest coverage in `server/*.test.ts`, plus `docs/verification.md` |

## Stage status

### Stage 1 — Foundation and execution engine

The repository has a safe hosted implementation of the task lifecycle, authenticated communication through the web dashboard, file intake, persistence, logging, retries and export. OpenCode, FreeLLMAPI and Telegram are not enabled: the blueprint marks their exact configuration as unresolved and the current product deliberately keeps external LLM, email and Telegram operations disabled.

### Stage 2 — Identity and advanced memory

The current schema provides user-scoped core/evolving memory, tags, outcomes and retrieval. It is not yet the final three-category/provenance model described by the blueprint. Adding source-system IDs, branches, conflict states and retention policy requires a migration design and must not silently reinterpret existing records.

### Stage 3 — Autonomous skills and self-recovery

The repository has safe action routing, skill XP, bounded retries and portable exports. It does not claim to have autonomous skill mutation, production rollback, or an independent process watchdog. Those require a deployment target, backup policy, restart permissions and Windows-specific testing before implementation.

### Stage 4 — Master/slave duplication and memory branching

Portable JSON export and laptop-localization guidance are present, but they are not a complete Master/Slave installer. Unique installation identity, memory snapshots, branch lineage, credential handling, conflict queues and Google Drive exchange remain design work as identified in the origin blueprint.

## Non-negotiable safety rules carried into implementation

1. Do not enable shell, credential, email, Telegram or external-provider actions merely because a prompt requests them.
2. Do not copy secrets into exports or portable packages.
3. Do not use Git as a substitute for live-memory backup.
4. Do not silently overwrite another installation’s memory.
5. Preserve the last-known-good revision before changing a production component.
6. Do not mark a stage complete until its acceptance tests pass.

## Next implementation gates

Before enabling the deferred integrations, create separate reviewed changes for:

1. A versioned runtime configuration schema and secret-provider contract.
2. A memory migration that adds provenance and branch fields without data loss.
3. An independently deployed watchdog with bounded restart and rollback tests.
4. A signed portable-package format with unique installation identity and explicit Master/Slave policy.
5. An append-first synchronisation queue with duplicate and conflict handling.

Until those gates are approved and tested, the current safe hosted sandbox is the authoritative runtime behavior.
