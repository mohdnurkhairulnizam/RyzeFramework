# RyzeFramework Current Stage Handoff

**Status date:** 25 November 2026
**Working branch:** `feature/telegram-file-transfer`
**Base:** verified `stable-merge` baseline `e8e7660`
**Branch state:** `feature/telegram-file-transfer` is pushed through `d35b770b357c3d81660951be2ff533976d591e06` (`fix(telegram): omit absent file id on text ingress`). The root cause was that text-only worker requests serialized `fileId: null`, which the API schema rejects as `400 INVALID_INBOUND`; the worker now omits `fileId` only when there is no attachment. A real file ID is still included for captioned-file processing. Focused regression tests and workspace checks pass.
**Stage disposition:** Stage 1 remains **PARTIAL**. The owner now reports text-only ingress and file-reading feedback **PASS (owner-reported)** after the corrected Windows package was provided; the attached conversation excerpt shows a request to read/explain `README.md` and a returned summary. The installed commit/checksum was not explicitly echoed, so association with `d35b770` is by chronology and is not independently verified. File receipt with and without accompanying text remains **PASS (owner-reported)**. Same-chat file-send success was reported previously on a build not identified; the latest excerpt shows a file-return request/confirmation but does not independently verify attachment bytes. Keep these outcomes distinct.

## Immediate continuation task — close the remaining Stage 1 evidence

The text-only ingress regression is fixed in `d35b770` and the owner reports successful text-only file feedback on Windows. The fix omits `fileId` when absent; it does not alter file upload, receipt, delivery, download, or acknowledgement handling. The updated source package and evidence are recorded in [`Stage 1 Windows text-ingress/file-feedback evidence`](./evidence/stage1-windows-text-ingress-file-feedback-2026-11-25.md). Capture the installed package identity if available. Next, verify the actual same-chat file return and any remaining Stage 1 acceptance scenarios on the target system; separately complete generated-note delivery, retention/deletion, operational/failure/rollback evidence, and the other completion gates. Never include message bodies or secrets in diagnostics.

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
- `pnpm test` — PASS, 51 tests across 18 files (including the text-only `fileId` null regression, captioned-file, and file-transfer integration tests).
- `pnpm run worker:test` — PASS, 9 Python worker tests.
- `pnpm run build:local` — PASS; the existing large JavaScript chunk warning remains non-fatal.
- `git diff --check` — PASS.

These are sandbox checks. They do not establish behavior on the target Windows installation or a live Telegram account.

### Owner-reported target-Windows evidence

The owner reports PASS for the previously exercised same-chat Telegram reply, pause/resume, unauthorized sender rejection, temporary recovery-code authorization and expiry, worker stop/start replay and duplicate-event handling, controlled failure handling, physical backup/restore including Telegram session recovery, and provider-related checks. The owner specifically requested that Telegram acknowledgement-mismatch and provider-failure evidence be recorded as **PASS (owner-reported; not independently verified here)**. The deterministic dashboard provider-fault simulation is a separate local simulation PASS, not live-provider evidence.

The owner now reports text-only ingress and file-reading feedback as **PASS (owner-reported)** after the `d35b770` update package was provided. The attached excerpt records a request to explain `README.md` and a returned response. The exact installed commit/checksum was not echoed; see the linked Windows evidence addendum and preserve this qualification.

The retained [`24 November 18:33 acceptance self-test`](./evidence/stage1-acceptance-self-test-2026-11-24-183302.txt) is unchanged and remains authoritative for what that report actually tested: it records Gate 1 and Gate 5 as `NOT_RUN`, Gate 7 as `WARN`, and Gate 8 as `NOT_RUN`. These statuses are not overwritten by later owner-reported results; preserve the difference between the report's timestamped outcomes, owner reports, and independent sandbox tests.

### Telegram file path

- Receipt, source binding, command-bound download, integrity checks, and acknowledgement validation pass automated workspace tests.
- **Receipt/send chronology:** the owner first reported no detection, log, or receipt using the `99112b4` update ZIP (**FAIL**); the owner later reported file receipt with and without accompanying text (**PASS, owner-reported; tested package/version then unknown**). Same-chat file sending was also previously reported **PASS** on a build not identified. The latest owner report confirms text-only ingress and file-reading feedback **PASS (owner-reported)** after the `d35b770` package was supplied; exact installed package identity is not independently confirmed. The pasted excerpt contains file-return confirmation text, but does not independently verify attachment bytes/destination. Generated-note delivery remains **NOT_RUN**.
- **Root cause and fix:** text-only worker payloads included `fileId: null`; Zod's optional-but-not-nullable file ID schema returned `400 INVALID_INBOUND` before application logging, task creation, or reply queueing. Commit `d35b770` omits the key only when there is no file; captioned-file requests keep their real ID. Regression tests exercise both payload forms, the API's `null` rejection, current text-only acceptance, and existing file paths. No separate bridge was added and the file-transfer implementation was not changed.

## Recommended bounded task-execution decision

The owner needs to decide whether one safe, end-to-end Markdown-summary task is sufficient evidence for Stage 1's *demonstrated bounded task execution* requirement. Recommended decision: **accept it as the one bounded task example**, provided the owner runs and records it on the target Windows/Telegram installation. The example is: an authorized sender sends a small Markdown file in a private chat and asks Ryze to summarize it; Ryze validates and stores the file, treats its content as untrusted data, sends it only to the configured model provider for the requested chat-only analysis, records a task result, and returns a same-chat text summary. This demonstrates one narrow task, not arbitrary planning, tool execution, or a general-purpose autonomous agent. File-send delivery must be verified separately; a text summary alone does not prove report/file delivery.

## Next actions

1. Record the owner's text-only/file-feedback result as **owner-reported PASS**; obtain the installed package identity if available and retain only sanitized evidence.
2. Verify actual file-only and captioned-file receipt, and confirm same-chat file return on the corrected Windows package without changing the preserved file-transfer implementation.
3. Complete and record generated-note delivery, remaining Telegram/reliability/error/rollback checks, and other Stage 1 acceptance gates separately.
4. Define and implement file retention/deletion behavior; the 24-hour lookup window currently does not delete stored files.
5. Preserve the 24 November self-test unchanged, distinguish its historical `NOT_RUN`/`WARN` statuses from later owner reports, and do not declare Stage 1 complete until all nine criteria are demonstrated in the intended deployment environment.

Do not mark Stage 1 operational from sandbox tests or architecture statements alone. Preserve the 24 November acceptance self-test unchanged and distinguish its results from later owner reports and workspace checks. Keep credentials, API keys, worker tokens, recovery codes, Telegram session files, and backup contents out of Git and support messages.
