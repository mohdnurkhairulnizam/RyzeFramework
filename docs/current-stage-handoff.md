# RyzeFramework Current Stage Handoff

**Status date:** 25 November 2026
**Working branch:** `feature/telegram-file-transfer`
**Base:** verified `stable-merge` baseline `e8e7660`
**Stage disposition:** Stage 1 is still **PARTIAL**, not operationally complete. No commit or push has been made.

## Read first

1. [`origin-blueprint.md`](./origin-blueprint.md) — authoritative source; preserve unchanged.
2. [`blueprint-implementation.md`](./blueprint-implementation.md) — current implementation/status map.
3. [`stage-1-readiness.md`](./stage-1-readiness.md) — criterion-by-criterion evidence and remaining gates.
4. [`stage-1-task-breakdown.md`](./stage-1-task-breakdown.md) — engineering checklist.
5. [`ryze-playbook.md`](./ryze-playbook.md) — operator instructions and feature limits.
6. [`telegram-user-account-integration.md`](./telegram-user-account-integration.md) — worker/file-transfer contract.

## Current implementation

- The local dashboard, Node/TypeScript server, SQLite persistence/migrations, local file storage, Windows install/update/backup/restore helpers, and chat-only OpenCode/FreeLLMAPI route remain in place.
- Telegram uses the owner-authorized Telethon user-account worker. The server accepts authorized private-chat instructions and restricts replies to the exact originating chat. Groups, broadcasts, proactive sends, shell execution, and general-purpose OpenCode tools remain disabled.
- Bounded Telegram file receipt and same-chat delivery are now implemented on this branch. Uploads use authenticated raw binary requests, at most 5 MiB, an explicit MIME allowlist, actual-byte validation, and server-generated storage keys. Source chat/sender/message IDs are persisted. File sends use an opaque owner-scoped file ID and an acknowledged worker command; they do not accept arbitrary paths or destinations.
- File analysis is chat-only and opt-in per request. TXT/Markdown/CSV/JSON files up to 64 KiB may be passed as untrusted document data to the configured model provider within a 24-hour lookup window. OpenCode tools remain deny-all; file content is not written into the Ryze task log. The user is told that analysis sends the content to the configured provider.
- The 24-hour window governs lookup/analysis eligibility; it does **not** delete the local file. Automatic file expiry and an operator deletion workflow are not implemented, so file retention remains a Stage 1 privacy/operations gap.
- Generated Markdown notes created by an eligible Telegram task are bound to that task's originating authorized private chat and can be queued for delivery there. A worker restart after a send command was acknowledged but before its outcome is known fails closed rather than automatically resending an uncertain send.

## Verification and evidence

### Workspace verification — independently run in this sandbox

- `pnpm run check` — PASS.
- `pnpm test` — PASS, 49 tests across 18 files (including file-transfer integration tests).
- `pnpm run worker:test` — PASS, 8 Python worker tests.
- `pnpm run build:local` — PASS; the existing large JavaScript chunk warning remains non-fatal.
- `git diff --check` — PASS.

These are sandbox checks. They do not establish behavior on the target Windows installation or a live Telegram account.

### Owner-reported target-Windows evidence

The owner reports PASS for the previously exercised same-chat Telegram reply, pause/resume, unauthorized sender rejection, temporary recovery-code authorization and expiry, worker stop/start replay and duplicate-event handling, controlled failure handling, physical backup/restore including Telegram session recovery, and provider-related checks. The owner specifically requested that Telegram acknowledgement-mismatch and provider-failure evidence be recorded as **PASS (owner-reported; not independently verified here)**. The deterministic dashboard provider-fault simulation is a separate local simulation PASS, not live-provider evidence.

The retained [`24 November 18:33 acceptance self-test`](./evidence/stage1-acceptance-self-test-2026-11-24-183302.txt) is unchanged and remains authoritative for what that report actually tested: it records Gate 1 and Gate 5 as `NOT_RUN`, Gate 7 as `WARN`, and Gate 8 as `NOT_RUN`. These statuses are not overwritten by later owner-reported results; preserve the difference between the report's timestamped outcomes, owner reports, and independent sandbox tests.

### Telegram file path

- Receipt, source binding, command-bound download, integrity checks, and acknowledgement validation pass automated workspace tests.
- **Target-Windows Telegram file receive, file-content analysis, same-chat file send, and generated-note delivery are NOT_RUN.** No live Telegram or target-Windows file test was performed in this workspace.

## Recommended bounded task-execution decision

The owner needs to decide whether one safe, end-to-end Markdown-summary task is sufficient evidence for Stage 1's *demonstrated bounded task execution* requirement. Recommended decision: **accept it as the one bounded task example**, provided the owner runs and records it on the target Windows/Telegram installation. The example is: an authorized sender sends a small Markdown file in a private chat and asks Ryze to summarize it; Ryze validates and stores the file, treats its content as untrusted data, sends it only to the configured model provider for the requested chat-only analysis, records a task result, and returns a same-chat text summary. This demonstrates one narrow task, not arbitrary planning, tool execution, or a general-purpose autonomous agent. File-send delivery must be verified separately; a text summary alone does not prove report/file delivery.

## Next actions

1. On target Windows, install this branch's reviewed package through the normal update procedure and confirm the additive SQLite migration applies without replacing live data.
2. In one authorized private chat, test receiving a small `.md` file and request its summary. Confirm the task status/result and same-chat response; note that the configured provider receives the content for this explicit request.
3. Separately request that Ryze send the latest received file back. Verify same-chat destination, delivered file, and worker acknowledgement. Also test generated Markdown-note delivery if that is part of the claimed path.
4. Retain non-secret, timestamped evidence. Label the outcomes owner-reported until independently reviewed; do not change the preserved self-test report.
5. Define file retention/deletion behavior and complete any remaining Stage 1 operational evidence before declaring Stage 1 complete or starting Stage 2.

Do not mark Stage 1 operational from the sandbox tests or architecture statements alone. Do not commit or push unless the owner asks. Keep credentials, API keys, worker tokens, recovery codes, Telegram session files, and backup contents out of Git and support messages.
