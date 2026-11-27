# Blueprint implementation map

The repository now builds a single-owner, localhost-only Windows starter on top of the safe task foundation. The origin document is preserved in [`origin-blueprint.md`](./origin-blueprint.md). This map distinguishes implemented behavior from architectural intent that still requires technical decisions.

For a detailed Stage 1 requirement-by-requirement readiness assessment, see [`stage-1-readiness.md`](./stage-1-readiness.md).
For the sequenced implementation plan and acceptance checklist, see [`stage-1-task-breakdown.md`](./stage-1-task-breakdown.md).

**Current reconciliation (25 November 2026):** The owner has closed Stage 1 as **PARTIAL for sequencing** and directed the project to begin Stage 2. This is not Stage 1 completion: its nine origin criteria remain unchanged, residual verification is retained, and nothing is marked passed or waived by the partial close. The owner reports bounded Telegram file receipt, text-only file feedback, and same-chat return/opening of the existing file as PASS on `d35b770`; the owner separately reports File Manifest early deletion PASS on Windows (exact tested package not restated). Automatic 30-day expiry remains unverified on Windows. The current request to create a new Markdown summary still returns the original file and Ryze says it cannot create/write files. The owner has assigned this skill/intent capability gap to Stage 2 planning and explicitly does not want an unreviewed skill change. Backend route tests do not prove live agent capability. Preserve the 24 November self-test's historical `NOT_RUN`/`WARN` results. See [`stage-2-implementation-plan.md`](./stage-2-implementation-plan.md).

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

Stage 1 is **PARTIAL — closed for sequencing**. The repository has a safe local task lifecycle, password-protected dashboard, SQLite persistence, local file storage, logging, bounded retries, export, and bounded Telegram paths. Owner-reported evidence and its limits are recorded above and in [`stage-1-readiness.md`](./stage-1-readiness.md). The current natural-language new-summary request remains failed and is deferred to Stage 2 capability design; automatic 30-day expiry remains a Windows verification item. These residuals do not stop Stage 2 planning, but they remain open and are not treated as successful evidence. OpenCode tools remain deny-all; there is no general-purpose autonomous execution.

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

Stage 2 is active. Gate 2's additive migration/provider-neutral SQLite layer is complete. Gate 3 synthetic owner-facing acceptance and the nine-item memory/identity contract mapping are complete for the tested scope. The owner-approved Gate 4 8-fixture/14-query synthetic retrieval evaluation passed after remediation: TP=13, FP=0, FN=0, precision/recall/F1=1.0, with Q14 chronological order PASS. The fixed query wording and expected labels were unchanged. This does not establish production-corpus representativeness or broad semantic quality; the separate eight-query exploratory baseline retains one semantic-paraphrase miss (F1=0.9091). Gate 5 is passed only for the corrected disposable synthetic Windows scope; the earlier legacy-handler failure remains historical. Provider-response acceptance remains open because the actual Ryze/OpenCode prompt timed out after two minutes. See [`current-stage-handoff.md`](./current-stage-handoff.md), [`stage-2-implementation-plan.md`](./stage-2-implementation-plan.md), and [`gate4-retrieval-evaluation-2026-11-26.md`](./evidence/gate4-retrieval-evaluation-2026-11-26.md). SQLite remains authoritative unless a reviewed decision changes that.

The owner also places the new-file skill/intent capability on hold for Stage 2 planning. Do not change Ryze skill instructions or import ECC as a shortcut. Evaluate the submitted ECC proposal only as a separate compatibility/security review: it does not provide Ryze's authoritative memory and cannot replace any Stage 1 or Stage 2 gates. The repository pins `@opencode/cli` `2.3.0`; confirm the actual target-Windows runtime before any ECC experiment.

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

Continue Stage 2 using the active sequencing in [`stage-2-implementation-plan.md`](./stage-2-implementation-plan.md): retain Gate 4's fixed synthetic scope and exploratory paraphrase limitation; do not infer production-corpus quality or normal-profile Windows acceptance. Gate 5 is limited to the tested disposable synthetic scope; provider-response acceptance is passed for the tested Telegram → OpenCode → FreeLLMAPI route. Additional contract-hardening variants and automatic expiry are intentionally parked. The nine-item contract mapping is complete, while origin blueprint §2.9 retains ten bullet statements; preserve that distinction during final signoff. The file-creation skill issue is a separate Stage 2 design item and is not permission for broad write access or automatic skill mutation. ECC remains a research candidate only until compatibility, permissions, and component side effects are reviewed. Keep Stage 1 residual checks in the partial-close register; do not count ECC, Stage 2 work, or sandbox tests toward them. Stage 3 watchdog/skill lifecycle and Stage 4 copy/synchronization work remain future stages.

Until those gates are approved and tested, the current local build remains a safe local demo with a verified text-chat integration, not the origin blueprint's operational AI agent. The original MySQL migration files are retained as history, but the Windows ZIP uses the separate SQLite migration directory.

**Restore checkpoint (23 November 2026):** The local dashboard now lists protected Ryze backup folders and ZIP files, requires explicit confirmation, and queues a validated restore for the next Windows startup. Startup preserves the current live database, files, `.env`, and Telegram worker configuration/session before replacement, repairs local ACL inheritance, and leaves the worker `.venv` untouched. New private and command-line backups include `telegram\worker.env` and the Telethon session when present; ordinary exports do not. The autonomous same-chat route is separate from restore and still requires target-Windows restart/recovery evidence.

**Telegram/OpenCode checkpoint (23 November 2026):** The owner verified that an authorized Telegram prompt now travels through the same local OpenCode + FreeLLMAPI workspace path as a dashboard chat and returns a model response in the originating Telegram chat. The earlier generic safe-demo response was caused by the inbound route calling `runSafeDemo` directly; the route now uses the shared OpenCode chat function for `safe_analysis` prompts and retains safe-demo handling for allowlisted local actions. Autonomous same-chat delivery, numeric chat-ID conversion, content/result validation, durable reply keys, and failure logging are implemented; target-Windows pause/restart/duplicate and failure-recovery acceptance evidence remains to be recorded.

**Historical next-direction note (23 November; superseded by the owner's 25 November partial-close decision):** At that checkpoint, the recommendation was to finish Stage 1 operational evidence before adding Gmail, then formalize structured model output and the narrow tool/action boundary. The owner has since closed Stage 1 as PARTIAL for sequencing and moved the project to Stage 2. Gmail, Drive, and Photos remain out of scope for Stage 2.

**Target-Windows acceptance update (23 November 2026):** The owner reported PASS for permanent-admin same-chat reply, pause/resume, unauthorized-sender rejection, temporary recovery-code authorization, and controlled failure handling. A JPG conversion-and-send request was correctly refused by the current text-only assistant; this is safety-boundary evidence, not file-processing or Telegram file-delivery evidence. File processing/report delivery, worker stop/start replay, restore, and explicit recovery-code expiry remain open.

**Follow-up acceptance update (23 November 2026):** The owner verified metadata-only handling for `ryze-baseline-test-20261123135610940.md` (`text/markdown`, `113` bytes); file content was not executed. Worker stop/start replay behavior and duplicate/replayed inbound-event prevention were reported PASS. This advances the safe file-processing and Telegram reliability evidence, while generated report/file delivery and recovery-code expiry remain open. Recovery-code expiry is intentionally deferred to a later verification pass.

**Stage 2 status update (26 November 2026):** Target-Windows corruption rejection **FAILED against the legacy installed handler** after the corrupt duplicate was applied and Ryze startup failed with “file is not a database.” The pre-restore snapshot passed SQLite integrity and required Stage 2 schema checks; owner-reported recovery restored the dashboard and synthetic memory markers A/B. The installed handler hash did not match the hardened source, and the validator was absent. Candidate package source was not located at the path used for the follow-up check, so the update cause remains unknown. Gate 5 is PARTIAL / BLOCKED; do not repeat restore/rollback trials until deployment is verified. **At the initial Gate 4 run**, the owner-approved synthetic set failed its expected-relevance labels (0 recall); the subsequent fixed-set remediation retest passed with 13/13 relevant fixture instances retrieved. See [`gate4-retrieval-evaluation-2026-11-26.md`](./evidence/gate4-retrieval-evaluation-2026-11-26.md) for both separately retained runs. Formal Stage 2 signoff must reconcile the nine-item memory contract with the ten bullet statements in origin blueprint §2.9.

---

# Current implementation map — 27 November 2026

This section is the current-status authority for this document. Earlier checkpoint paragraphs are retained as historical evidence, including the legacy Gate 5 failure and the initial Gate 4 failed run; they must not be read as the current status after the later corrected package and remediation evidence.

## Source control and review state

The reviewed source of truth is GitHub repository `mohdnurkhairulnizam/RyzeFramework`, branch `feature/telegram-file-transfer`. The pushed implementation commit is `6f612e05b133cdd573121ce8608c5857015a4ceb`; the current documentation checkpoint is local commit `d029435602b57625d9fb29763a7cb1521310d602` and is ready to push. The branch is 67 commits ahead of `main` at `5fb29f9df1f90041b8a85fe09052798a5a030f0d`; it has no divergence behind main. PR #1 (`https://github.com/mohdnurkhairulnizam/RyzeFramework/pull/1`) remains open and unmerged. The existing untracked `RyzeFramework-PR1-source-33ced158.zip` is intentionally preserved and is not part of the source or package.

## Implemented architecture and boundaries

The application is TypeScript/React/Node with Vite, Express, tRPC, SQLite through better-sqlite3, Drizzle migrations, Vitest, and an optional Python Telethon worker. The Windows deployment is localhost-only and uses PowerShell 5.1, `.cmd` launchers, robocopy, local SQLite, an OpenCode CLI sidecar, and a separately installed FreeLLMAPI desktop gateway.

The dashboard owns local authentication, task lifecycle, memory/identity governance, file metadata, export and restore queues, worker control, and diagnostic evidence. The model provider does not receive permission to mutate System Memory, identity, credentials, or arbitrary files. OpenCode is configured chat-only with deny-all tools. Safe allowlisted actions, worker commands, and owner-confirmed memory operations are separate server-side routes.

## OpenCode, FreeLLMAPI, and Telegram

FreeLLMAPI is OpenAI-compatible at a loopback URL such as `http://127.0.0.1:31415/v1`. Its gateway is not bundled as a service by the Ryze installer; a fresh machine needs FreeLLMAPI installed/configured separately. OpenCode CLI is installed by the Ryze package and managed by the Windows startup path.

The model selector is optional. A blank dashboard model field is valid and delegates selection to FreeLLMAPI. `ensure-opencode-config.mjs` writes the provider model ID `auto`; `server/openCode.ts` preserves the `freellmapi/selected` route whenever URL and key are configured, even when the configured model is blank. This fixed the startup regression that incorrectly required an explicit model.

The direct gateway test returned `/models` HTTP 200 with 320 models and a direct chat HTTP 200 in approximately 20 seconds. The owner then sent `Reply with exactly: Ryze gateway path test passed` through Telegram and received `Ryze gateway path test passed` almost immediately. Provider-response acceptance is therefore PASS for the tested Telegram → OpenCode → FreeLLMAPI path. The earlier two-minute timeout remains historical diagnostic evidence; the current bounded timeout and task controls remain, and an infinite uninterruptible wait is not implemented.

The Telegram boundary is a local Telethon user-account worker, not a bot. It handles owner login/session protection, sender authorization, pause/resume/stop, sanitized heartbeats, same-chat text/file paths, 5 MiB binary intake, type/hash/size validation, source binding, acknowledgement checks, and replay protection. Existing-file same-chat return was owner-reported PASS. Natural-language generation of a new Markdown summary remains a known deferred failure.

## Stage 1 readiness

Stage 1 remains **PARTIAL — closed for sequencing, not complete**. Its historical readiness register and nine origin criteria are retained. Residuals include target-Windows automatic 30-day expiry evidence, the new-summary file-creation capability, full report/file-delivery scope, and the remaining external-action/worker evidence boundaries. Diagnostic self-tests are evidence tools and do not close a stage. No Stage 2 result, sandbox result, or merge substitutes for Stage 1 acceptance.

## Stage 2 implementation and gate disposition

Stage 2 remains active. Gate 2 is passed for the additive provider-neutral SQLite schema/migration and the initial governance API/UI. Gate 3 is passed for the tested synthetic owner-facing Cloud scope: categories/types, duplicate review, conflict confirmation, restricted retrieval, owner isolation, identity revisions, lifecycle history, protected System Memory, restart persistence, and the nine-item contract mapping are recorded in `current-stage-handoff.md`.

Gate 4 is **PASSED only for the approved synthetic 8-fixture/14-query evaluation**: TP=13, FP=0, FN=0, precision/recall/F1=1.0 and Q14 chronological ordering PASS. Query wording and expected labels were unchanged. This is bounded lexical retrieval evidence and makes no production-corpus quality claim; the separate exploratory paraphrase limitation remains recorded.

Gate 5 is **PASSED only for the disposable synthetic Windows scope**. The corrected package and installed hardened files were verified; export metadata and secrets exclusion, valid restore, corruption rejection before mutation, rollback drill, SQLite integrity, required schema validation, dashboard reopening, and synthetic marker persistence were owner-reported PASS. The earlier legacy-handler corruption failure remains historical. Provider-response acceptance remains OPEN because the actual prompt timed out after two minutes.

The nine-item Stage 2 contract mapping is complete, and the focused target-Windows Memory Vault verification also passed for the disposable synthetic scope: restart reopening, category display, identity revisions, duplicate review, restricted default exclusion, conflict confirmation, and export/restore metadata preservation. These results are bounded evidence, not a declaration that Stage 2 is complete. Additional contract-hardening variants and automatic 30-day expiry are intentionally parked for a later cycle. Stage 3 and Stage 4 remain unimplemented architectural design.

## Windows hardening evidence

The reviewed restore manifest pins `validate-restore-db.mjs` to SHA-256 `9970E340C722E8A097C4B991F3578E73DBE15A2BACD4964727266FCDA90D0155`; the hardened `Apply-RyzeRestore.ps1` installed hash was `099FD1C22CD3C79EED080091D0E9CD3C59B2AE3EEF0B0993400066A5D94949AF`. The corrected disposable package checksum was `78e73c5f21987010f541a4b510b2faedb2dd0870fc49db79d7c839b2e2ab6120`. These hashes are review evidence, not permission to include live user data in a package.

## Validation matrix

| Check | Current result | Scope |
|---|---|---|
| `pnpm run check` | PASS | Repository |
| `pnpm test` | PASS, 74 tests / 23 files | Repository |
| `pnpm run worker:test` | PASS, 9 tests | Telethon worker unit/integration tests |
| `pnpm run build:local` | PASS | Local production build |
| `git diff --check` | PASS | Reviewed source |
| Gate 3 dashboard checks | PASS | Synthetic Cloud owner scope |
| Gate 4 retrieval | PASS | Fixed synthetic 8-fixture/14-query set only |
| Gate 5 Windows restore | PASS | Disposable synthetic profile only |
| Provider response | OPEN | Actual Ryze/OpenCode prompt timed out |

## Evidence taxonomy

All claims must identify whether they are automated sandbox checks, handler-level Windows checks, owner-reported disposable Windows evidence, synthetic Cloud dashboard evidence, or full target-Windows dashboard acceptance. Production-corpus retrieval quality, normal-profile restore safety, and Stage 3/4 completion must not be inferred from the current evidence.

## Current next actions

Keep PR #1 open for review. Resolve provider-response evidence with a bounded, cancellable test; verify automatic 30-day expiry on target Windows; resolve the narrow new-summary capability without changing live skill/intent rules broadly; and retain Stage 1 residuals. Do not merge or describe a merge as system or Stage 2 completion.
