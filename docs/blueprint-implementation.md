# Blueprint implementation map

The repository now builds a single-owner, localhost-only Windows starter on top of the safe task foundation. The origin document is preserved in [`origin-blueprint.md`](./origin-blueprint.md). This map distinguishes implemented behavior from architectural intent that still requires technical decisions.

For a detailed Stage 1 requirement-by-requirement readiness assessment, see [`stage-1-readiness.md`](./stage-1-readiness.md).
For the sequenced implementation plan and acceptance checklist, see [`stage-1-task-breakdown.md`](./stage-1-task-breakdown.md).

## Current implementation

| Blueprint requirement | Repository implementation |
| --- | --- |
| Controlled task lifecycle, validation, logging and result reporting | `server/routers/ryze.ts`, `server/ryzeExecution.ts`, `server/ryzeDemo.ts` |
| Permission boundary outside model reasoning | The safe action classifier blocks shell, credential, email and Telegram requests; arbitrary shell execution is not exposed |
| Local owner authentication and ownership enforcement | Scrypt-hash password login, rate limiting, localhost origin checks, and scoped queries in `server/_core/localAuth.ts`, `server/ryzeOwnership.ts`, and `server/db.ts` |
| Persistent sessions, tasks, logs, memory, skills and file metadata | Local SQLite schema/migrations in `drizzle/schema.ts`, `drizzle/sqlite/`, and `server/db.ts` |
| Experience-memory search and learning | `searchMemory`, task summaries, memory writes and skill XP updates in `server/db.ts` |
| Original file bytes kept outside the database | `server/storage.ts` stores bytes under the current Windows user's app-data directory; authenticated downloads verify the owner in `server/_core/storageProxy.ts` |
| Portable export and credential-safe migration | `server/ryzeExport.ts`; provider and integration flags export disabled |
| Bounded recovery attempts and diagnostic audit trail | `server/ryzeExecution.ts` and persisted task logs |
| Telegram user-account transport | `worker/ryze_telegram_worker.py`; local Telethon login/session worker with heartbeat, inbound forwarding, approved command polling and session locking |
| Worker API | `server/workerApi.ts` plus generated local worker token; Windows setup scripts create a protected worker environment and provide a heartbeat preflight, but do not authorize or persistently start Telegram |
| Verification before claiming completion | Vitest coverage in `server/*.test.ts`, plus `docs/verification.md` |

## Stage status

### Stage 1 — Foundation and execution engine

The repository has a safe local task lifecycle, password-protected dashboard, SQLite persistence, local file storage, logging, bounded retries, and export. The owner installed the latest Windows package, repaired ACLs on existing SQLite database/WAL/SHM files without deleting data, signed in, and completed a real text-chat request through OpenCode and the local FreeLLMAPI gateway. Repeat start/stop and backup/restore remain unverified. The successful request proves the text-chat path only: OpenCode tools remain deny-all, general task execution is not enabled, and the routed provider/model was not recorded. The optional Telethon worker/API code is not provisioned by this ZIP, and no owner-approval workflow exists for externally visible actions.

**Progress checkpoint (15 November 2026):** The owner selected the target Windows computer and requested local data. The implementation now uses SQLite and a protected local files folder, with a first-run owner password setup, scrypt verification, localhost binding, Origin/Host checks, lockout, and Windows install/start/stop/backup helpers. A production local build and disposable health/login/database smoke test pass; the test suite now has 20 Vitest tests across 10 files and 4 worker tests. The ZIP installer is built here but not run on the physical computer. OpenCode/FreeLLMAPI connectivity, Windows-target verification, live Telegram setup, and per-action outbound approval/pause/stop/suppression checks remain incomplete; therefore Stage 1 is not complete and external actions stay unavailable.

**Progress checkpoint (22 November 2026):** The owner installed the ZIP on the target Windows computer. Startup first failed because existing SQLite database/WAL/SHM files had no effective ACL entries; resetting their ACLs restored inherited access without deleting contents, and the owner reported success. The owner then configured the local FreeLLMAPI gateway at `http://127.0.0.1:31415/v1` (model ID and unified key remain local and are not recorded here), observed OpenCode running and FreeLLMAPI connected, signed in, and received a completed model reply through Ryze. The task activity log showed the OpenCode/FreeLLMAPI route and deny-all tool boundary. Two formatting tests returned the requested points on one line rather than as separate bullet lines. This verifies local text chat, not upstream-provider identity, broad instruction-following, tool execution, Telegram, or Stage 1 acceptance as a whole. Repeat start/stop and backup/restore remain open.

**Confirmed recovery checkpoint (22 November 2026):** The owner later reproduced `EPERM` on both the existing OpenCode configuration and an existing Ryze log file. Those files had protected empty file-level DACLs even though their parent folders appeared writable; a newly created ACL probe received normal inherited access. This confirmed stale Windows security descriptors in the existing data tree as the root cause of the repeated startup failures. Removing the old `%LOCALAPPDATA%\\RyzeFramework` data tree and `%LOCALAPPDATA%\\Programs\\RyzeFramework` installation, then installing the stable-preserving merged package fresh, restored successful installation and launch. Future upgrades must preserve the stable startup scripts, avoid reintroducing protected empty ACLs, and keep this incident in the regression checklist.

**Operational baseline checkpoint (23 November 2026):** The owner ran the dashboard's one-button baseline on the target Windows installation. Private backup, restore rehearsal, persisted database/log test record, local test-file record, and ACL checks for the data root, database, WAL/SHM files, logs, files directory, and generated test file all returned `PASS`. The owner also reported successful stop/start restart behavior. This is deployment evidence for the local baseline and restart path; Stage 1 remains incomplete because deferred worker, approval, external-action, and full acceptance requirements are not yet complete.

**Telegram bridge checkpoint (23 November 2026):** Using the private RyzeTel repository as the implementation reference, Ryze now has a staged local Windows path: a separate generated worker token, protected `%LOCALAPPDATA%\\RyzeFramework\\telegram-worker\\worker.env`, Telethon virtual-environment installation, `check` heartbeat preflight, local `login`, and manual inbound-only `run`. This stage is not yet target-Windows verified. Outbound replies, scheduled-task supervision, owner approval at send time, pause/stop persistence, suppression checks, duplicate-send prevention, and result validation remain disabled or incomplete.

**Telegram control-plane checkpoint (23 November 2026):** The local dashboard now has owner-scoped Telegram account metadata controls for one active account, add/replace/remove state, a dashboard-editable permanent admin Telegram user ID, one-time code generation, one-hour temporary sender authorization, and local incoming/system audit logs. The worker API enforces the admin/temporary allowlist and records ignored senders. The dashboard control plane does not yet claim Telethon login, process start/stop, or live outbound delivery; those require the local process bridge and the tested outbound approval gate. Gmail/Google integration is sequenced separately behind OAuth consent and explicit scopes.

### Stage 2 — Identity and advanced memory

The current schema provides user-scoped core/evolving memory, tags, outcomes and retrieval. It is not yet the final three-category/provenance model described by the blueprint. Adding source-system IDs, branches, conflict states and retention policy requires a migration design and must not silently reinterpret existing records.

### Stage 3 — Autonomous skills and self-recovery

The repository has safe action routing, skill XP, bounded retries and portable exports. It does not claim to have autonomous skill mutation, production rollback, or an independent process watchdog. Those require a deployment target, backup policy, restart permissions and Windows-specific testing before implementation.

### Stage 4 — Master/slave duplication and memory branching

Portable JSON export and computer-localization guidance are present, but they are not a complete Master/Slave installer. Unique installation identity, memory snapshots, branch lineage, credential handling, conflict queues and Google Drive exchange remain design work as identified in the origin blueprint.

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
2. Implement and test an outbound approval gate, including pause/stop and suppression checks at send time; keep live Telegram delivery disabled until this passes.
3. Configure and deploy the local Telethon user-account worker following [`telegram-user-account-integration.md`](./telegram-user-account-integration.md), then verify live authorization and approved reply delivery.
4. A memory migration that adds provenance and branch fields without data loss.
5. An independently deployed watchdog with bounded restart and rollback tests.
6. A signed portable-package format with unique installation identity and explicit Master/Slave policy.
7. An append-first synchronisation queue with duplicate and conflict handling.

Until those gates are approved and tested, the current local build remains a safe local demo with a verified text-chat integration, not the origin blueprint's operational AI agent. The original MySQL migration files are retained as history, but the Windows ZIP uses the separate SQLite migration directory.
