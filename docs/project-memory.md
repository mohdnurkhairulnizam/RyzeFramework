# RyzeFramework Project Memory

**Record date:** 27 November 2026  
**Repository:** `mohdnurkhairulnizam/RyzeFramework`  
**Working branch:** `feature/telegram-file-transfer`  
**Current commit:** `6f612e05b133cdd573121ce8608c5857015a4ceb`  
**Remote status:** This commit has been pushed to `origin/feature/telegram-file-transfer`. PR #1 remains open and unmerged.

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
- OpenCode remains chat-only with deny-all tool permissions. The model cannot directly write System Memory or Ryze identity.
- Personal Memory is owner-scoped. Restricted memory is excluded from contextual retrieval by default and requires explicit owner-controlled inclusion.
- Exact duplicates must not be silently duplicated; conflicts require owner confirmation; updates are append-first/versioned and preserve prior records.
- Secrets, Telegram sessions, databases, backups, logs, runtime data, `node_modules`, and build output remain outside Git and distributable packages.
- The natural-language Telegram request to create and send a new Markdown summary remains deferred because the current live skill/intent behavior resends the source or refuses file creation. No broad file-writing permission is authorized.
- An unbounded “wait forever” provider loop was not implemented. The current provider timeout behavior remains bounded and cancellable by process/task control; provider-response acceptance is still open.

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
- The direct Windows gateway was independently observed to return `/models` HTTP 200 with 320 models and direct `/chat/completions` HTTP 200 in about 20 seconds. The earlier Ryze/OpenCode prompt nevertheless timed out at two minutes. Therefore gateway reachability is not equivalent to provider-response acceptance.

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

## Validation record for commit `6f612e0`

- `pnpm run check` — PASS.
- `pnpm test` — 74 tests across 23 files PASS.
- `pnpm run worker:test` — 9 tests PASS.
- `pnpm run build:local` — PASS with the existing non-fatal large-chunk warning.
- `git diff --check` — PASS.
- Pre-existing untracked `RyzeFramework-PR1-source-33ced158.zip` was preserved and not staged.

## Current next actions

1. Keep PR #1 open for review; do not describe merging as Stage 2 or system completion.
2. Keep provider-response acceptance open until a new bounded Windows test demonstrates an actual Ryze/OpenCode response or a separately reviewed provider-handling change is made.
3. Verify automatic 30-day file expiry on target Windows.
4. Resolve and review the bounded new-summary file-creation capability before changing live skill/intent behavior.
5. Preserve Stage 1's residual evidence and retained self-test unchanged.
6. Treat Stage 3 and Stage 4 as future design/implementation work.
