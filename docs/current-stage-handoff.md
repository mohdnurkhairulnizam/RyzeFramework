# RyzeFramework Current Stage Handoff

**Status date:** 25 November 2026
**Working branch:** `feature/telegram-file-transfer`
**Base:** verified `stable-merge` baseline `e8e7660`
**Current baseline:** Commit `c58bdad` (`feat: add Telegram file retention and summary artifacts`) is the current committed version on `feature/telegram-file-transfer`. **Stage disposition:** At the owner's direction, Stage 1 is **PARTIAL — closed for sequencing, not complete**. Its nine origin criteria remain unwaived, and the retained self-test's historical results are unchanged. The owner reports File Manifest early deletion PASS on target Windows (exact tested package/checksum not restated); automatic 30-day expiry still needs Windows verification. Existing-file return is separately owner-reported PASS on `d35b770`. The latest summary-as-file request still resends `README.md`, and Ryze says it cannot create/write files. The owner has placed changes to the live agent skill/intent layer on hold and directed that this capability be handled in Stage 2 planning. Backend tests are not live skill acceptance. Stage 2 is now active; see [`stage-2-implementation-plan.md`](./stage-2-implementation-plan.md).

## Stage transition — preserve residual evidence and start Stage 2

Stage 1's open evidence stays visible but does not block beginning Stage 2. Do not declare Stage 1 operational or waive its original criteria. Keep the new-summary capability on hold for Stage 2 boundary design; do not modify Ryze's live skill/intent rules without review. The owner reports File Manifest early deletion PASS; verify automatic expiry separately on Windows. Cleanup covers active file bytes and metadata, not prior backups, task logs, or Telegram copies. Never include message bodies or secrets in diagnostics.

## Read first

1. [`origin-blueprint.md`](./origin-blueprint.md) — authoritative design baseline; original content is preserved, with dated status addenda appended.
2. [`blueprint-implementation.md`](./blueprint-implementation.md) — current implementation/status map.
3. [`stage-1-readiness.md`](./stage-1-readiness.md) — criterion-by-criterion evidence and remaining gates.
4. [`stage-1-task-breakdown.md`](./stage-1-task-breakdown.md) — engineering checklist.
5. [`ryze-playbook.md`](./ryze-playbook.md) — operator instructions and feature limits.
6. [`telegram-user-account-integration.md`](./telegram-user-account-integration.md) — worker/file-transfer contract.
7. [`stage-2-implementation-plan.md`](./stage-2-implementation-plan.md) — next-stage memory plan and ECC proposal assessment.

## Current implementation

- The local dashboard, Node/TypeScript server, SQLite persistence/migrations, local file storage, Windows install/update/backup/restore helpers, and chat-only OpenCode/FreeLLMAPI route remain in place.
- Telegram uses the owner-authorized Telethon user-account worker. The server accepts authorized private-chat instructions and restricts replies to the exact originating chat. Groups, broadcasts, proactive sends, shell execution, and general-purpose OpenCode tools remain disabled.
- Bounded Telegram file receipt and same-chat delivery are now implemented on this branch. Uploads use authenticated raw binary requests, at most 5 MiB, an explicit MIME allowlist, actual-byte validation, and server-generated storage keys. Source chat/sender/message IDs are persisted. File sends use an opaque owner-scoped file ID and an acknowledged worker command; they do not accept arbitrary paths or destinations.
- File analysis is chat-only and opt-in per request. TXT/Markdown/CSV/JSON files up to 64 KiB may be passed as untrusted document data to the configured model provider within a 24-hour lookup window. OpenCode tools remain deny-all; file content is not written into the Ryze task log. The user is told that analysis sends the content to the configured provider.
- The 24-hour window governs lookup/analysis eligibility; it does **not** delete the local file. The selected rule is now 30 days from file creation for uploaded and generated files, with immediate deletion from the active local store through the File Manifest. Expired files become inaccessible at the cutoff; a startup and hourly sweep removes bytes and metadata. Prior backups, task logs, and copies already sent to Telegram are not erased by this file policy.
- A narrowly matched explicit request can create and queue a distinct model-produced Markdown artifact in the backend; however, the owner's current user-visible Telegram request still resends the source and Ryze claims it cannot create files. The exact request uses `make`, which the current generated-summary matcher does not recognize as a create intent; the latest-file resend matcher therefore wins. The later “can you create a new file?” question also receives a text-only refusal. Treat this as a skill/intent capability gap. Defer the natural-language summary-attachment benchmark until Ryze can recognize file creation as an allowed capability. Keep the ordinary existing-file resend path separate; owner reports that path works. The backend integration test does not establish that live skill behavior works.

## Verification and evidence

### Workspace verification — independently run in this sandbox

- `pnpm run check` — PASS.
- `pnpm test` — PASS, 57 tests across 19 files, including new summary-file delivery, original-file return, stale-duplicate, and retention/deletion tests.
- `pnpm run worker:test` — PASS, 9 Python worker tests.
- `pnpm run build:local` — PASS; the existing large JavaScript chunk warning remains non-fatal.
- `git diff --check` — PASS.

These results verify the backend route and file-retention implementation only; they do not close the owner-reported Telegram skill/intent gap for natural-language creation of a new summary file.

These are sandbox checks. They do not establish behavior on the target Windows installation or a live Telegram account.

### Previously prepared Windows package — stale; do not distribute as the current version

- `/home/ubuntu/RyzeFramework-Windows-Source-2026-11-25.zip` was prepared from an earlier worktree based on `786f2c435a86a01c9e7af2416ce0e5543913bc66`; its checksum accompanies it.
- It predates commit `c58bdad` and the current documentation updates, so it is not the current source package. Regenerate and re-verify the ZIP and checksum before Windows distribution.
- The older ZIP excluded Git history, `node_modules`, build output, real environment files, SQLite/user data, Telegram sessions, logs, backups, and existing archives. It required internet access for Windows dependency installation.

### Owner-reported target-Windows evidence

The owner reports PASS for the previously exercised same-chat Telegram reply, pause/resume, unauthorized sender rejection, temporary recovery-code authorization and expiry, worker stop/start replay and duplicate-event handling, controlled failure handling, physical backup/restore including Telegram session recovery, and provider-related checks. The owner specifically requested that Telegram acknowledgement-mismatch and provider-failure evidence be recorded as **PASS (owner-reported; not independently verified here)**. The deterministic dashboard provider-fault simulation is a separate local simulation PASS, not live-provider evidence.

The owner reports text-only ingress and file-reading feedback as **PASS (owner-reported)** and has explicitly confirmed the successful test used commit `d35b770`. The attached excerpt records a request to explain `README.md` and a returned response. Package identity is owner-confirmed; the Windows behavior remains owner-reported rather than independently verified. See the linked Windows evidence addendum.

The retained [`24 November 18:33 acceptance self-test`](./evidence/stage1-acceptance-self-test-2026-11-24-183302.txt) is unchanged and remains authoritative for what that report actually tested: it records Gate 1 and Gate 5 as `NOT_RUN`, Gate 7 as `WARN`, and Gate 8 as `NOT_RUN`. These statuses are not overwritten by later owner-reported results; preserve the difference between the report's timestamped outcomes, owner reports, and independent sandbox tests.

### Telegram file path

- Receipt, source binding, command-bound download, integrity checks, and acknowledgement validation pass automated workspace tests.
- **New-summary benchmark:** **DEFERRED** pending a Ryze skill/intent capability update. In the owner's 25 November conversation, `make a short Markdown summary of README.md and send the summary as a file` returned `[README.md]` again, and Ryze said it is text-only and cannot create/write files. The current matcher lacks the `make` creation verb, so the same message satisfies the existing-file matcher; the follow-up shows a broader capability/skill gap as well. Do not count the narrow backend integration test as an acceptance pass.
- **Early deletion:** owner reports File Manifest deletion **PASS on target Windows** on 25 November; exact package revision/checksum was not restated. Automatic 30-day expiry/sweep remains separately pending target-Windows verification.
- **Receipt/send chronology:** the owner first reported no detection, log, or receipt using the `99112b4` update ZIP (**FAIL**); the owner later reported file receipt with and without accompanying text (**PASS, owner-reported; tested package/version then unknown**). The owner confirms text-only ingress and file-reading feedback **PASS**, and confirms the existing file returned as a same-chat attachment, opened, and was correct (**owner-reported PASS on `d35b770`**). The separate request to create a new Markdown summary failed: Ryze re-sent the original README and said it could not create/save files (**owner-reported FAIL for new-file creation/delivery**). Do not count that as a generated-note attachment.
- **Root cause and fix:** text-only worker payloads included `fileId: null`; Zod's optional-but-not-nullable file ID schema returned `400 INVALID_INBOUND` before application logging, task creation, or reply queueing. Commit `d35b770` omits the key only when there is no file; captioned-file requests keep their real ID. Regression tests exercise both payload forms, the API's `null` rejection, current text-only acceptance, and existing file paths. No separate bridge was added and the file-transfer implementation was not changed.

## Recommended bounded task-execution decision

The owner has reported bounded README file feedback on target Windows using `d35b770`, and a correct existing-file return/opening as an attachment. The latest conversation reconfirms that a natural-language request to create and send a new Markdown summary still resends the original and produces a text-only refusal. This is **not** just a Windows-package acceptance step: defer the benchmark until the Ryze skill/intent capability that recognizes and performs new-file creation is addressed. Then test that the generated attachment differs from the source and separately retest the existing-file resend. Owner reports File Manifest early deletion PASS; verify automatic 30-day expiry separately.

## Next actions

1. Begin with [`stage-2-implementation-plan.md`](./stage-2-implementation-plan.md): agree the identity/memory contract, then design and test a lossless additive SQLite migration. Keep the existing memory rows available and do not assume current `core` scope equals protected System Memory.
2. Keep ECC at audit/research level for now. It cannot substitute for memory design or any Stage 1/2 acceptance gate; any later experiment needs a pinned version, target-Windows compatibility check, isolated workspace, and Ryze deny-all permission boundary.
3. Preserve the Stage 1 residual register. The summary-file skill/intent issue is held for Stage 2 design; target-Windows automatic 30-day expiry remains a separate verification item. Early File Manifest deletion and existing-file return remain owner-reported PASS.
4. Preserve the 24 November self-test unchanged and distinguish its historical `NOT_RUN`/`WARN` statuses from later owner reports and sandbox checks. Stage 1 remains PARTIAL unless its nine criteria are later completed with evidence.

Do not mark Stage 1 operational from sandbox tests or architecture statements alone. Preserve the 24 November acceptance self-test unchanged and distinguish its results from later owner reports and workspace checks. Keep credentials, API keys, worker tokens, recovery codes, Telegram session files, and backup contents out of Git and support messages.
