# RyzeFramework Current Stage Handoff

**Status date:** 25 November 2026
**Working branch:** `feature/telegram-file-transfer`
**Base:** verified `stable-merge` baseline `e8e7660`
**Branch state:** `feature/telegram-file-transfer` contains the validated release candidate with backward-compatible text ingress, regression tests, and scoped worker shutdown before update. The package is intended for target-laptop testing; use the delivery record/Git history for the exact commit and artifact identity.
**Stage disposition:** Stage 1 is still **PARTIAL**, not operationally complete. The owner first reported that the `99112b4` update failed to detect/log/receive a file (**FAIL**). The owner later reports file receipt works with or without accompanying text and that a receipt acknowledgment was returned (**owner-reported PASS for receipt; tested package version unknown**). The owner also reports the same-chat file-sending test was verified successful (**owner-reported PASS; exact package/build not captured**). Plain-text-only messages are still not detected (**FAIL, owner-reported**); dashboard log/task status is unknown. The corrected candidate has workspace regression coverage, but requires a controlled target-laptop retest.

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
- `pnpm test` — PASS, 51 tests across 18 files (including restored legacy text-ingress compatibility, captioned-file, and file-transfer integration tests).
- `pnpm run worker:test` — PASS, 8 Python worker tests.
- `pnpm run build:local` — PASS; the existing large JavaScript chunk warning remains non-fatal.
- `git diff --check` — PASS.

These are sandbox checks. They do not establish behavior on the target Windows installation or a live Telegram account.

### Owner-reported target-Windows evidence

The owner reports PASS for the previously exercised same-chat Telegram reply, pause/resume, unauthorized sender rejection, temporary recovery-code authorization and expiry, worker stop/start replay and duplicate-event handling, controlled failure handling, physical backup/restore including Telegram session recovery, and provider-related checks. The owner specifically requested that Telegram acknowledgement-mismatch and provider-failure evidence be recorded as **PASS (owner-reported; not independently verified here)**. The deterministic dashboard provider-fault simulation is a separate local simulation PASS, not live-provider evidence.

The retained [`24 November 18:33 acceptance self-test`](./evidence/stage1-acceptance-self-test-2026-11-24-183302.txt) is unchanged and remains authoritative for what that report actually tested: it records Gate 1 and Gate 5 as `NOT_RUN`, Gate 7 as `WARN`, and Gate 8 as `NOT_RUN`. These statuses are not overwritten by later owner-reported results; preserve the difference between the report's timestamped outcomes, owner reports, and independent sandbox tests.

### Telegram file path

- Receipt, source binding, command-bound download, integrity checks, and acknowledgement validation pass automated workspace tests.
- **Receipt/send chronology:** the owner first reported no detection, log, or receipt using the `99112b4` update ZIP (**FAIL**); the owner now reports file receipt works with or without accompanying text and a receipt acknowledgment was returned (**PASS for receipt, owner-reported; tested package/version unknown**). The owner also reports the same-chat file-sending test successful (**PASS, owner-reported; build/version unknown**). Caption text processing, dashboard logs, and stored metadata were not independently inspected. **Text-only inbound detection: FAIL (owner-reported);** dashboard event/task status is unknown. File analysis and generated-note delivery remain **NOT_RUN**.
- **Compatibility correction:** the previous stable text worker omitted `isPrivate`, which the newer API had made mandatory. The API now accepts a missing flag only for a matching one-to-one chat/sender ID; explicit non-private and mismatched-ID cases remain ignored. The regression tests pass. This is a plausible compatibility fix, not target-Windows proof. Scoped worker shutdown remains a separate update-lifecycle safeguard. The server-side same-chat file-send/download/ack integration test passes.

## Recommended bounded task-execution decision

The owner needs to decide whether one safe, end-to-end Markdown-summary task is sufficient evidence for Stage 1's *demonstrated bounded task execution* requirement. Recommended decision: **accept it as the one bounded task example**, provided the owner runs and records it on the target Windows/Telegram installation. The example is: an authorized sender sends a small Markdown file in a private chat and asks Ryze to summarize it; Ryze validates and stores the file, treats its content as untrusted data, sends it only to the configured model provider for the requested chat-only analysis, records a task result, and returns a same-chat text summary. This demonstrates one narrow task, not arbitrary planning, tool execution, or a general-purpose autonomous agent. File-send delivery must be verified separately; a text summary alone does not prove report/file delivery.

## Next actions

1. Use the separately named corrected Windows package delivered with this revision and confirm its version/checksum; update normally, confirm the updater stops the Ryze-owned worker, and confirm existing configuration/data remain intact.
2. Restart the Telegram worker and send one harmless text-only message first. Confirm an incoming event/log/task and reply; if it still fails, record worker status (running/paused/offline) and sanitized non-secret worker/API errors. Do not share credentials or message contents. Then test file-only and file-with-caption receipt separately, recording receipt and caption-task behavior independently.
3. Re-run the same-chat file-send test on the corrected package (the owner reports a successful send on an unspecified build); verify destination, actual delivered file, and worker acknowledgement. Also test generated Markdown-note delivery if that is part of the claimed path.
4. Retain non-secret, timestamped evidence. Label the outcomes owner-reported until independently reviewed; do not change the preserved self-test report.
5. Define file retention/deletion behavior and complete any remaining Stage 1 operational evidence before declaring Stage 1 complete or starting Stage 2.

Do not mark Stage 1 operational from the sandbox tests or architecture statements alone. The owner authorized committing and pushing the validated correction on this feature branch. Record the resulting branch commit and package SHA-256 in the delivery response, and keep credentials, API keys, worker tokens, recovery codes, Telegram session files, and backup contents out of Git and support messages.
