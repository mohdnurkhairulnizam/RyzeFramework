# Blueprint implementation map

The repository now builds a single-owner, localhost-only Windows starter on top of the safe task foundation. The origin document is preserved in [`origin-blueprint.md`](./origin-blueprint.md). This map distinguishes implemented behavior from architectural intent that still requires technical decisions.

For a detailed Stage 1 requirement-by-requirement readiness assessment, see [`stage-1-readiness.md`](./stage-1-readiness.md).
For the sequenced implementation plan and acceptance checklist, see [`stage-1-task-breakdown.md`](./stage-1-task-breakdown.md).

**Current reconciliation (25 November 2026):** Bounded Telegram file receipt and same-chat file sending, plus opt-in analysis of small UTF-8 TXT/Markdown/CSV/JSON attachments, are implemented and pass sandbox tests on `feature/telegram-file-transfer`. Target-Windows/live Telegram file receipt, analysis, file sending, and generated-note delivery remain **NOT_RUN**. The 18:33 self-test retained in `docs/evidence/` is unchanged; later owner-reported PASS evidence for acknowledgement mismatch and provider failure is recorded as owner-reported, not independently verified. Stage 1 remains **PARTIAL**.

## Current implementation

| Blueprint requirement | Repository implementation |
| --- | --- |
| Controlled task lifecycle, validation, logging and result reporting | `server/routers/ryze.ts`, `server/ryzeExecution.ts`, `server/ryzeDemo.ts` |
| Permission boundary outside model reasoning | The safe action classifier blocks shell, credential, email and Telegram requests; arbitrary shell execution is not exposed |
| Local owner authentication and ownership enforcement | Scrypt-hash password login, rate limiting, localhost origin checks, and scoped queries in `server/_core/localAuth.ts`, `server/ryzeOwnership.ts`, and `server/db.ts` |
| Persistent sessions, tasks, logs, memory, skills and file metadata | Local SQLite schema/migrations in `drizzle/schema.ts`, `drizzle/sqlite/`, and `server/db.ts` |
| Experience-memory search and learning | `searchMemory`, task summaries, memory writes and skill XP updates in `server/db.ts` |
| Original file bytes kept outside the database | `server/storage.ts` stores bytes under the current Windows user's app-data directory; authenticated owner downloads and private Telegram receipt use server-generated storage keys and validated file metadata |
| Portable export and credential-safe migration | `server/ryzeExport.ts`; provider and integration flags export disabled |
| Bounded recovery attempts and diagnostic audit trail | `server/ryzeExecution.ts` and persisted task logs |
| Protected private backup | Dashboard **Create private backup** action copies the local database, WAL/SHM files, local files, and `.env` into a protected `Documents\\RyzeFramework-backups` folder without test records |
| Telegram user-account transport | `worker/ryze_telegram_worker.py`; local Telethon login/session worker with heartbeat, private authorized text/file receipt, same-chat text/file delivery, integrity checks, acknowledgements, and session locking |
| Worker API | `server/workerApi.ts` plus generated local worker token; authenticated raw binary intake is capped at 5 MiB and file download is tied to an acknowledged owner-scoped send command |
| Verification before claiming completion | Vitest coverage in `server/*.test.ts`, plus `docs/verification.md` |

## Stage status

### Stage 1 — Foundation and execution engine

The repository has a safe local task lifecycle, password-protected dashboard, SQLite persistence, local file storage, logging, bounded retries, and export. The owner reports target-Windows startup, model-backed chat, Telegram sender authorization, bounded same-chat replies, pause/resume, replay and recovery checks, backup/restore, and provider-related tests as PASS; acknowledgement-mismatch and provider-failure are specifically **owner-reported PASS, not independently verified here**. A later branch implements bounded Telegram file receipt, opt-in document analysis, same-chat file sending, and generated-note delivery. Sandbox checks pass, but the new file path has **not** been exercised on target Windows/live Telegram. OpenCode tools remain deny-all, and this narrow file-summary workflow is not general-purpose task execution.

**Progress checkpoint (15 November 2026):** The owner selected the target Windows computer and requested local data. The implementation now uses SQLite and a protected local files folder, with a first-run owner password setup, scrypt verification, localhost binding, Origin/Host checks, lockout, and Windows install/start/stop/backup helpers. A production local build and disposable health/login/database smoke test pass; the test suite now has 20 Vitest tests across 10 files and 4 worker tests. The ZIP installer is built here but not run on the physical computer. OpenCode/FreeLLMAPI connectivity, Windows-target verification, live Telegram setup, and per-action outbound approval/pause/stop/suppression checks remain incomplete; therefore Stage 1 is not complete and external actions stay unavailable.

**Progress checkpoint (22 November 2026):** The owner installed the ZIP on the target Windows computer. Startup first failed because existing SQLite database/WAL/SHM files had no effective ACL entries; resetting their ACLs restored inherited access without deleting contents, and the owner reported success. The owner then configured the local FreeLLMAPI gateway at `http://127.0.0.1:31415/v1` (model ID and unified key remain local and are not recorded here), observed OpenCode running and FreeLLMAPI connected, signed in, and received a completed model reply through Ryze. The task activity log showed the OpenCode/FreeLLMAPI route and deny-all tool boundary. Two formatting tests returned the requested points on one line rather than as separate bullet lines. This verifies local text chat, not upstream-provider identity, broad instruction-following, tool execution, Telegram, or Stage 1 acceptance as a whole. Repeat start/stop and backup/restore remain open.

**Confirmed recovery checkpoint (22 November 2026):** The owner later reproduced `EPERM` on both the existing OpenCode configuration and an existing Ryze log file. Those files had protected empty file-level DACLs even though their parent folders appeared writable; a newly created ACL probe received normal inherited access. This confirmed stale Windows security descriptors in the existing data tree as the root cause of the repeated startup failures. Removing the old `%LOCALAPPDATA%\\RyzeFramework` data tree and `%LOCALAPPDATA%\\Programs\\RyzeFramework` installation, then installing the stable-preserving merged package fresh, restored successful installation and launch. Future upgrades must preserve the stable startup scripts, avoid reintroducing protected empty ACLs, and keep this incident in the regression checklist.

**Operational baseline checkpoint (23 November 2026):** The owner ran the dashboard's one-button baseline on the target Windows installation. Private backup, restore rehearsal, persisted database/log test record, local test-file record, and ACL checks for the data root, database, WAL/SHM files, logs, files directory, and generated test file all returned `PASS`. The owner also reported successful stop/start restart behavior. This is deployment evidence for the local baseline and restart path; Stage 1 remains incomplete because deferred worker, approval, external-action, and full acceptance requirements are not yet complete.

**Telegram bridge checkpoint (23 November 2026):** Using the private RyzeTel repository as the implementation reference, Ryze now has a staged local Windows path: a separate generated worker token, protected `%LOCALAPPDATA%\\RyzeFramework\\telegram-worker\\worker.env`, Telethon virtual-environment installation, `check` heartbeat preflight, local `login`, and dashboard-controlled worker lifecycle. The owner reported successful target-Windows login-code authorization, worker startup, permanent-admin inbound handling, unauthorized-sender ignoring, recovery-code temporary authorization, and pause/resume/stop controls. The bounded autonomous same-chat reply path is implemented; target-Windows pause/restart/duplicate/failure evidence remains incomplete.

**Telegram control-plane checkpoint (23 November 2026):** The local dashboard now has owner-scoped Telegram account metadata controls for one active account, add/replace/remove state, a dashboard-editable permanent admin Telegram user ID, one-time code generation, one-hour temporary sender authorization, and local incoming/system audit logs. A sender supplies only the exact permanent or one-time code as the message body; no `RYZE-AUTH` prefix is required. The worker API redacts accepted recovery-code messages and never forwards them as tasks. The dashboard control plane does not yet claim Telethon login, process start/stop, or live outbound delivery; those require the local process bridge and the tested outbound approval gate. Gmail/Google integration is sequenced separately behind OAuth consent and explicit scopes.

**Telegram dashboard wizard checkpoint (23 November 2026):** The local dashboard now owns the staged process bridge: protected worker-environment creation, private Telethon dependency setup, login-code and optional two-step-password entry, worker start/pause/resume/stop, heartbeat state display, and protected session removal on disconnect. The approved bounded same-chat reply path is now implemented; no sales funnel, broadcast, proactive messaging, or unrelated RyzeTel automation is included.

**Telegram inbound verification checkpoint (23 November 2026):** The target Windows test passed the dashboard login-code flow and, where requested, the optional two-step-password flow, then reached authorized/running status. The owner verified the permanent admin sender, ignored ordinary messages from an unauthorized sender, one-hour sender authorization after the exact recovery code, and dashboard pause/resume/stop behavior. This confirms the sender authorization path in the intended deployment environment. The later Telegram/OpenCode checkpoint records the first same-chat reply; neither checkpoint marks Stage 1 complete.

**Backup control checkpoint (23 November 2026):** The dashboard now provides a separate **Create private backup** action for the local Windows build. It uses the protected backup location and preserves the existing backup contents contract without adding baseline test records or replacing live data. The backup remains sensitive and is not suitable for sharing in chat.

**Telegram file-transfer checkpoint (24 November 2026):** The feature branch adds authenticated binary file intake (5 MiB maximum, allowlisted MIME types, actual-byte/type checks, safe filenames and numeric Telegram message IDs), SQLite source binding to owner/chat/sender/message, and a command-bound binary download used only for delivery to the same authorized private chat. Acknowledgements are validated against chat, file ID, hash, byte size and MIME type; completed sends are not replayed, and uncertain acknowledged sends fail closed after restart. Text analysis is limited to UTF-8 TXT/Markdown/CSV/JSON files up to 64 KiB, treats content as untrusted, and sends it to the configured model provider only when requested. File analysis lookup is limited to 24 hours, but files are not automatically deleted. Workspace verification: TypeScript check PASS; 49 Vitest tests PASS across 18 files; 8 worker tests PASS; local build PASS (non-fatal chunk-size warning); `git diff --check` PASS. Target-Windows file receipt/analysis/send remains NOT_RUN. Recommended bounded task decision: accept one authorized Markdown-summary task as evidence of a narrow end-to-end task only after target-Windows evidence is retained; it does not prove general autonomous execution or file delivery by itself.

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
2. Complete and evidence the autonomous Telegram same-chat gate, including pause/stop, sender/chat/task/message eligibility, duplicate prevention, content/result validation, and Telegram acknowledgement checks; keep broadcast, proactive, and cross-chat delivery disabled.
3. Configure and deploy the local Telethon user-account worker following [`telegram-user-account-integration.md`](./telegram-user-account-integration.md), then verify live authorization and approved reply delivery.
4. A memory migration that adds provenance and branch fields without data loss.
5. An independently deployed watchdog with bounded restart and rollback tests.
6. A signed portable-package format with unique installation identity and explicit Master/Slave policy.
7. An append-first synchronisation queue with duplicate and conflict handling.

Until those gates are approved and tested, the current local build remains a safe local demo with a verified text-chat integration, not the origin blueprint's operational AI agent. The original MySQL migration files are retained as history, but the Windows ZIP uses the separate SQLite migration directory.

**Restore checkpoint (23 November 2026):** The local dashboard now lists protected Ryze backup folders and ZIP files, requires explicit confirmation, and queues a validated restore for the next Windows startup. Startup preserves the current live database, files, `.env`, and Telegram worker configuration/session before replacement, repairs local ACL inheritance, and leaves the worker `.venv` untouched. New private and command-line backups include `telegram\worker.env` and the Telethon session when present; ordinary exports do not. The autonomous same-chat route is separate from restore and still requires target-Windows restart/recovery evidence.

**Telegram/OpenCode checkpoint (23 November 2026):** The owner verified that an authorized Telegram prompt now travels through the same local OpenCode + FreeLLMAPI workspace path as a dashboard chat and returns a model response in the originating Telegram chat. The earlier generic safe-demo response was caused by the inbound route calling `runSafeDemo` directly; the route now uses the shared OpenCode chat function for `safe_analysis` prompts and retains safe-demo handling for allowlisted local actions. Autonomous same-chat delivery, numeric chat-ID conversion, content/result validation, durable reply keys, and failure logging are implemented; target-Windows pause/restart/duplicate and failure-recovery acceptance evidence remains to be recorded.

**Next implementation direction:** finish Stage 1 operational evidence before adding Gmail. This means verify the autonomous Telegram path under pause/stop, worker restart, duplicate inbound delivery, OpenCode timeout/provider failure, unauthorized sender, and recovery-code expiry; then formalize structured model output and the narrow tool/action boundary. Gmail should follow through Google OAuth only, with Drive and Photos as separate optional scopes.

**Target-Windows acceptance update (23 November 2026):** The owner reported PASS for permanent-admin same-chat reply, pause/resume, unauthorized-sender rejection, temporary recovery-code authorization, and controlled failure handling. A JPG conversion-and-send request was correctly refused by the current text-only assistant; this is safety-boundary evidence, not file-processing or Telegram file-delivery evidence. File processing/report delivery, worker stop/start replay, restore, and explicit recovery-code expiry remain open.

**Follow-up acceptance update (23 November 2026):** The owner verified metadata-only handling for `ryze-baseline-test-20261123135610940.md` (`text/markdown`, `113` bytes); file content was not executed. Worker stop/start replay behavior and duplicate/replayed inbound-event prevention were reported PASS. This advances the safe file-processing and Telegram reliability evidence, while generated report/file delivery and recovery-code expiry remain open. Recovery-code expiry is intentionally deferred to a later verification pass.
