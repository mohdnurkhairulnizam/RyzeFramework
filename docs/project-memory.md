# RyzeFramework Project Memory

**Record date:** 28 November 2026
**Repository:** `mohdnurkhairulnizam/RyzeFramework`
**Working branch:** `feature/telegram-file-transfer`
**Current implementation commit:** `3d3b63a2971b83fe39d5c77076e7175989d8e58e`
**Pushed checkpoint:** `3d3b63a` on `origin/feature/telegram-file-transfer`; it contains the reversible MemPalace adapter/outbox/bridge, Windows runner, evidence, and next-AI continuation prompt. PR #1 remains open and unmerged.

This file is the durable project-memory index for the work completed in this repository. It records decisions and evidence boundaries; it does not contain passwords, API keys, Telegram sessions, databases, backups, logs, or personal data.

## Project understanding

RyzeFramework is a single-owner, localhost-only Windows application built around a Node/TypeScript server, React dashboard, SQLite persistence, optional OpenCode plus FreeLLMAPI text chat, and an optional owner-authorized Telethon user-account worker. The current product is a controlled local foundation and memory-governance system, not yet the complete general-purpose autonomous agent described by the origin blueprint.

The project maintains four staged goals:

1. **Stage 1 — Foundation and execution engine:** safe local task lifecycle, OpenCode/FreeLLMAPI path, Telegram worker, bounded file handling, permission boundary, logging, validation, and Windows operations.
2. **Stage 2 — Identity and advanced memory:** separate Ryze identity, System/Experience/Personal memory, five secondary types, owner approval, provenance, bounded retrieval, conflict handling, migration preservation, export, and restore.
3. **Stage 3 — Autonomous skills and self-recovery:** future controlled skill lifecycle and independent recovery/watchdog work.
4. **Stage 4 — Master/slave duplication and memory branching:** future independent copies, branches, and approved synchronization.

## Durable decisions

- Stage 1 is **PARTIAL — closed for sequencing, not complete**. Its origin criteria remain open and are not waived.
- Stage 2 is active. Gate 2 is complete, Gate 3 synthetic owner acceptance is passed, Gate 4 is passed only for the approved synthetic evaluation, and Gate 5 is passed only for the tested disposable synthetic Windows restore scope.
- SQLite remains the authoritative Stage 2 store. No external memory provider, Hindsight, MemPalace, ECC, vector database, automatic capture, cross-agent memory sharing, or live skill/intent mutation was enabled.
- On 28 November 2026, the owner selected MemPalace as the only next external-memory implementation target and directed that comparative evaluation of the other candidates be skipped. Gate 0 passed by architecture review and Gate 1 passed through the disposable provider-neutral synthetic contract harness; MemPalace is not installed or enabled yet and SQLite remains authoritative.
- OpenCode remains chat-only with deny-all tool permissions. The model cannot directly write System Memory or Ryze identity.
- Personal Memory is owner-scoped. Restricted memory is excluded from contextual retrieval by default and requires explicit owner-controlled inclusion.
- Exact duplicates must not be silently duplicated; conflicts require owner confirmation; updates are append-first/versioned and preserve prior records.
- Secrets, Telegram sessions, databases, backups, logs, runtime data, `node_modules`, and build output remain outside Git and distributable packages.
- The natural-language Telegram request to create and send a new Markdown summary remains deferred because the current live skill/intent behavior resends the source or refuses file creation. No broad file-writing permission is authorized.
- An unbounded “wait forever” provider loop was not implemented. Provider-response acceptance is now PASS for the tested Telegram → OpenCode → FreeLLMAPI path: the owner sent `Reply with exactly: Ryze gateway path test passed` and received the exact reply almost immediately. The earlier two-minute timeout remains historical diagnostic evidence.
- The first reversible MemPalace adapter checkpoint is implemented in `server/memPalaceMemoryProvider.ts`. It is an injected bridge/projection boundary only: SQLite remains canonical, the live router remains SQLite-backed, derived search is disabled by default, and no MemPalace package or private data was installed or used.
- Migration `0006_mempalace_projection_outbox` and `server/mempalaceProjectionOutbox.ts` now provide durable enqueue, deduplication, retry, restart recovery, deletion reconciliation, and fail-closed replay. The pinned upstream assessment target is MemPalace `v3.12.0` at commit `4df7b830ff1398332d4118884520a24f1aab9cc1`; it was not cloned or installed. The exact evidence and resource boundary are in `docs/evidence/mempalace-adapter-assessment-2026-11-28.md`.

## Implementation completed

### Local foundation and safety

- Local owner authentication uses a salted scrypt password hash, localhost-only binding, Host/Origin checks, signed sessions, and lockout handling.
- SQLite migrations preserve legacy rows and add nullable classification, provenance, version, status, sensitivity, and synchronization fields without guessing legacy category/type.
- Safe task execution has bounded retries, persisted task/activity records, result checks, and a deny-all boundary for arbitrary shell, credentials, email, broadcasts, proactive messaging, and unrelated external actions.
- Local file storage is separate from SQLite metadata. Uploads use an allowlist and a 5 MiB limit; active file retention is 30 days with an earlier File Manifest delete action.
- Portable JSON export contains memory/identity metadata while excluding credentials, Telegram sessions, and file bytes. Private backups are sensitive and may include configuration, database, files, and Telegram worker/session material.

### OpenCode and FreeLLMAPI

- The local gateway is expected to be loopback, such as `http://127.0.0.1:31415/v1`; the API key and provider details remain local.
- A blank `RYZE_FREELLMAPI_MODEL` is valid and means automatic model selection. The generated OpenCode workspace uses provider model ID `auto` and name `FreeLLMAPI (automatic model selection)` when URL and key are configured.
- Ryze now sends the managed `freellmapi/selected` model reference whenever the gateway is configured, including the blank-model case. This restores the prior OpenCode routing behavior.
- The direct Windows gateway was independently observed to return `/models` HTTP 200 with 320 models and direct `/chat/completions` HTTP 200 in about 20 seconds. A later owner Telegram test returned the exact requested response almost immediately through the full Ryze route, closing provider-response acceptance for that tested path. The earlier two-minute timeout remains retained as historical evidence.

### Telegram and file transfer

- The worker is a Telethon user-account client, not a bot. Credentials and session files remain in the protected local worker directory.
- Sender authorization, private-chat binding, worker token authentication, pause/resume/stop, bounded same-chat replies, file receipt, source binding, command-bound file download, MIME/size/hash validation, acknowledgement checks, and replay protections are implemented and covered by automated tests or owner-reported Windows evidence as explicitly marked in the handoff.
- Existing-file same-chat return is owner-reported PASS on `d35b770`.
- New-summary attachment creation from a natural-language Telegram request is an owner-reported FAIL/deferred capability, not an acceptance pass.

## Gate 3 owner-facing evidence

The isolated synthetic Cloud dashboard was exercised through the owner-facing Memory Vault and restarted with re-authentication:

- Personal/Preference, Experience/Project, Experience/Episodic, Experience/Semantic, and Experience/Procedural records were created and visible.
- Exact duplicate review returned the existing record without silently increasing the count.
- Protected System Memory was created through `Review / add` and remained separately displayed.
- Identity was changed through owner confirmation; revision history retained prior versions.
- Lifecycle memory was updated to version 2 while the prior revision remained archived/inspectable.
- Restricted retrieval default returned zero entries with `excludedRestricted: 1`; explicit inclusion returned exactly the owner-scoped restricted record with provenance.
- A same-scope/category/type candidate produced `Review result: conflict` and `Possible conflict`; without owner confirmation it was not saved or merged.
- After the dashboard service was stopped and restarted, the original synthetic owner re-authenticated and saw the six classified records, lifecycle version/history, identity revision 2/history, and protected System Memory.

These are synthetic Cloud checks only. They do not establish production-corpus retrieval quality or target-Windows dashboard behavior.

## Target-Windows Stage 2 memory verification

The owner reports PASS on the disposable synthetic Windows profile for Memory Vault reopening after restart; Personal, Experience, and protected System Memory display; identity revisions; duplicate review without silent duplication; restricted default exclusion; conflict confirmation; and export/restore preservation of category, type, version, provenance, and owner scope. This closes the focused target-Windows memory-behavior check for the tested synthetic scope only. It does not establish production-data acceptance or complete the remaining parked hardening work.

## Contract evidence disposition

The nine `memory-identity-contract.md` acceptance items are mapped in `docs/current-stage-handoff.md`:

1. Identity — synthetic dashboard and automated evidence PASS for the tested path.
2. Three categories — synthetic dashboard/schema evidence PASS.
3. Five secondary types — synthetic dashboard evidence PASS.
4. Owner-approved create/update/archive/retrieval across restart — PASS for the tested synthetic path.
5. Relevant owner-scoped/restricted retrieval — PASS for approved synthetic evidence; no production quality claim.
6. Duplicate/conflict preservation — PASS for tested duplicate and blocked-conflict paths.
7. Protected identity/System Memory — PASS for reviewed dashboard and automated governance paths; no live model mutation test claimed.
8. Legacy migration/search preservation — PASS for automated migration fixtures; no production database migration claimed.
9. Windows export/restore/secrets exclusion — PASS for the disposable synthetic Windows scope only.

## Windows package and restore evidence

The corrected package was tested by the owner on a disposable synthetic profile. Package checksum, updater, installed hardened handler/validator hashes, dashboard reopen, data persistence, valid restore, corrupted-copy rejection, rollback drill, SQLite integrity, Stage 2 schema validation, export metadata, and secrets/session exclusion were reported PASS. The tested restore selection queues work for the next startup; automatic application restart was not claimed.

The current hardened validator hash in `scripts/windows/restore-deployment-manifest.json` is `9970E340C722E8A097C4B991F3578E73DBE15A2BACD4964727266FCDA90D0155`. The corrected earlier package checksum was `78E73C5F21987010F541A4B510B2FAEDB2DD0870FC49DB79D7C839B2E2AB6120`. These values describe evidence, not a distributable package in this record.

The owner later installed the corrected MemPalace checkpoint package and reported **PASS** for the complete Windows package/update acceptance matrix: Operational Baseline, Stage 2 schema validator, export and restore, restart/provider-unavailable SQLite operation, and installed hardened-file hashes. The provider-unavailable result is bounded to continued SQLite-backed operation: MemPalace is not wired into the live Windows routers, so it is not evidence of a live Windows MemPalace bridge or projection replay. The earlier `SQLite format 3` error came from Node being given the database path after `$validator` was empty, not from the validator or evidence of database corruption. Real Windows MemPalace projection restart/replay remains the only pending item in this checkpoint.

## Real MemPalace MCP replay checkpoint — 28 November 2026

- Linux synthetic replay against pinned MemPalace `v3.12.0` / commit `4df7b830ff1398332d4118884520a24f1aab9cc1` passed provider-unavailable handling, projection replay after MCP restart, search rehydration, and deletion reconciliation.
- The current source-only Windows package includes `server/mempalaceMcpBridge.ts`, `scripts/mempalace-replay-smoke.ts`, and `scripts/windows/Run-MemPalace-Replay-Test.ps1`. Package SHA-256: `147263CBD1D449FD2C215B7FBA5F9A41B282FAB5D89CBDC40C7A7EBEB57B62DC`.
- Windows execution is **BLOCKED / NOT ACCEPTED** because the selected disposable profile has no installed Python 3.12 runtime. `py.exe -3.12` reported `No installed Python found!`; no MemPalace MCP process was started. This is not evidence of provider failure. Install Python 3.12.x, verify `py -3.12 --version`, and rerun the packaged runner before recording Windows replay results.
- SQLite remains authoritative and live Ryze routers remain SQLite-backed. No private data, secrets, live database, or automatic capture was used.

## Validation record for commit `6f612e0`

- `pnpm run check` — PASS.
- `pnpm test` — 74 tests across 23 files PASS.
- `pnpm run worker:test` — 9 tests PASS.
- `pnpm run build:local` — PASS with the existing non-fatal large-chunk warning.
- `git diff --check` — PASS.
- Pre-existing untracked `RyzeFramework-PR1-source-33ced158.zip` was preserved and not staged.

## MemPalace adapter checkpoint validation — 28 November 2026

- `server/memPalaceMemoryProvider.ts` and `server/memPalaceMemoryProvider.test.ts` add the reversible SQLite-first adapter boundary and synthetic bridge tests.
- `pnpm run check` — PASS.
- `pnpm test` — 83 tests across 25 files PASS.
- `git diff --check` — PASS.
- MemPalace was not installed, enabled, or connected to private/production data. The live routers remain SQLite-backed.
- Final checkpoint validation: `pnpm run check` PASS; `pnpm test` PASS, 87 tests across 26 files; `pnpm run build:local` PASS with the existing non-fatal large-chunk warning; SQLite migration journal audit PASS with 7 entries including migration `0006`; `git diff --check` PASS. Linux pinned MemPalace CLI/MCP and replay evidence passed; Windows MemPalace replay remains blocked before provider startup by the missing Python 3.12 prerequisite.

## Current next actions

1. Keep PR #1 open for review; do not describe merging as Stage 2 or system completion.
2. Keep the passed provider-response record bounded to the tested Telegram → OpenCode → FreeLLMAPI path; retain the earlier timeout as historical evidence.
3. Hold additional Stage 2 contract-hardening variants and automatic 30-day file expiry for a later implementation cycle.
4. Resolve and review the bounded new-summary file-creation capability before changing live skill/intent behavior.
5. Preserve Stage 1's residual evidence and retained self-test unchanged.
6. Treat Stage 3 and Stage 4 as future design/implementation work.
7. The durable projection/outbox, pinned bridge, and Linux synthetic replay assessment are complete. Finish the Windows replay prerequisite by installing Python 3.12.x on the disposable profile, then rerun restart/rebuild, search rehydration, deletion, provider-failure, resource, export/restore, and target-Windows checks. Keep automatic capture/hooks, broad MCP/skill writes, production data, and replacement of SQLite disabled until all required evidence is accepted.
8. Use `docs/next-ai-continuation-prompt.md` as the handoff for the next AI; it contains the clone command, branch rules, first-read documents, exact Windows command, and evidence boundaries.

## Automatic Windows dependency setup checkpoint — 28 November 2026

The Windows installer and updater now automatically invoke `scripts/windows/Install-MemPalaceRuntime.ps1`. It checks `py.exe -3.12`, uses user-scoped `winget` to install `Python.Python.3.12` when available, fails clearly with manual-install instructions when no supported package manager is present, creates `%LOCALAPPDATA%\\RyzeFramework\\mempalace-runtime\\venv`, and installs the exact MemPalace source commit `4df7b830ff1398332d4118884520a24f1aab9cc1`. The replay runner uses this same helper. `/InstallMemPalaceRuntime` remains accepted for compatibility but is no longer required.

This dependency preparation is automatic, but it does not start MemPalace, alter the SQLite-only production behavior, or enable live MemPalace routers. The isolated runtime is disposable/rebuildable and does not read or modify the live database, configuration, secrets, Telegram sessions, or private files. The helper implementation does not itself establish Windows MemPalace replay acceptance; the real runner must still pass on the disposable Windows profile.

The refreshed source-only dependency-checkpoint package is `RyzeFramework-Windows-MemPalace-Dependency-20261128.zip`, SHA-256 `9db83d36b5e48ecd0bbef1c140264257b22c092066c389979d00d96b79dfb114`. Package verification found 293 entries, required installer/runtime/replay files present, and no `.env*`, databases, logs, private runtime data, `node_modules`, `dist`, `.git`, or prior ZIP artifacts. The package identity is delivery evidence only; Windows MemPalace replay remains unaccepted until actually run.

The corrected automatic-dependency source-only package is `RyzeFramework-Windows-MemPalace-AutoDependency-20261128.zip`, SHA-256 `ee28d29b4a1bf3695cb77acef768fb6f9f5e02915080ee37cabe6760565c6420`. It contains 293 entries and passed required-file and forbidden-content checks. This package identity does not establish Windows MemPalace replay acceptance.

## Live SQLite check and production integration gate — 28 November 2026

The safe operational tools are now defined. `scripts/windows/check-live-sqlite.mjs` and `scripts/windows/Check-Live-Sqlite.ps1` open the selected SQLite database read-only, validate integrity and Stage 2 schema, report counts, and emit a stable memory-row fingerprint for before/after restart comparison. The sandbox smoke test passed against a synthetic database; no claim is made about the target Windows live database because it was not opened from this sandbox.

`scripts/sanitized-mempalace-copy.ts` accepts only explicitly redacted JSON records, rejects secret-like input, creates a separate disposable SQLite database, and optionally projects through the pinned MCP bridge into a disposable palace. Its synthetic smoke test passed. The production integration requirements are recorded in `docs/mempalace-production-integration-gate.md`; owner approval, dry-run, namespace isolation, rollback, durable outbox reconciliation, and fail-closed behavior are required before any live projection. SQLite remains authoritative and live MemPalace projection remains disabled.

Owner-reported target-Windows live SQLite check passed: the `counts=` and `memory_sha256=` values remained unchanged across a normal stop/start cycle. This is read-only persistence evidence only and does not authorize live MemPalace projection.

The sanitized-copy harness now accepts the UTF-8 BOM emitted by Windows PowerShell 5.1 while retaining strict secret/content validation. A BOM-prefixed synthetic input passed the disposable SQLite integrity check.

Owner-reported target-Windows sanitized disposable-copy test passed after the UTF-8 BOM compatibility fix. The result is limited to explicitly sanitized synthetic records in a disposable SQLite database; live MemPalace projection remains unauthorized.

The first production-gate dry run completed against two synthetic sanitized records. It performed no writes, did not open the live database, and did not contact MemPalace. The exact manifest is `docs/evidence/mempalace-production-dry-run-manifest-2026-11-28.json`; generated manifest SHA-256 is `7bbf637a41614f943ea8d1d9b1284b1429ccce3d335eaa5930e94d068f710893`. It covers fixture-1 and fixture-2, owner 991122, version 1, namespace `ryze-dry-run-sanitized`, branch `sanitized-test`, and two upsert operations. Explicit owner approval is required before any disposable canary write.
