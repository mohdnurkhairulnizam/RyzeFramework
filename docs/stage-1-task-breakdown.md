# Stage 1 — Detailed Task Breakdown and Completion Checklist

This checklist turns the origin blueprint and current repository status into an implementation sequence. A checked item means the capability exists in the current repository or the stated check has actually passed; it does not imply that a live deployment has been configured unless explicitly stated. Keep live credentials out of Git and do not enable external integrations until their safety gates pass. **Owner decision (25 November 2026): Stage 1 is PARTIAL and closed for sequencing, not complete; the unchecked criteria below remain open and are not waived. Stage 2 may proceed.** The latest transition record at the end supersedes older checkpoint text.

## Current status at a glance

- [x] Password-protected localhost dashboard, local SQLite database, and safe demo task foundation exist.
- [x] Per-user data scoping, task logs, bounded retries, safe demo routing, file metadata, and portable export exist.
- [x] Local Telethon user-account worker and authenticated worker API code exist.
- [x] Autonomous Telegram same-chat replies are implemented without per-message approval; server checks, durable reply keys, content hashing, and Telegram acknowledgement validation remain enforced.
- [x] Build a Windows installer/launcher/stop/backup package using local SQLite and a protected local file directory.
- [x] Add a first-run scrypt owner password, localhost/Origin checks, rate limiting, and Windows install/backup guidance.
- [x] Current local branch passes TypeScript check, 57 Vitest tests across 19 files, 9 Python worker tests, local production build, and `git diff --check`; target-Windows/live-Telegram verification remains separate.
- [x] Install the latest ZIP on the target Windows computer, repair ACLs on existing SQLite database/WAL/SHM files without deleting contents, sign in, and reach the Ryze dashboard.
- [x] Complete one harmless model-backed text chat from the target Windows dashboard through OpenCode and the local FreeLLMAPI gateway; general OpenCode tool execution remains disabled.
- [x] Configure the local gateway at `http://127.0.0.1:31415/v1` and receive a completed model reply. The exact model ID and upstream provider route were not recorded; no API key is stored in Git.
- [x] Telegram inbound and bounded same-chat paths are implemented. The owner reports earlier same-chat, pause/restart/replay, recovery, backup/restore, and failure checks PASS; acknowledgement mismatch and provider failure remain owner-reported, not independently verified. The owner reports file receipt, text-only file feedback, and existing-file return on `d35b770`; File Manifest early deletion is now **PASS (owner-reported, target Windows; package revision not restated)**. The latest request for a new Markdown summary still resends the existing README and Ryze says it cannot create files. Defer that benchmark until the skill/intent capability gap is addressed. A narrow backend route/test does not establish user-facing skill behavior. Automatic 30-day expiry remains to be tested on Windows.
- [x] Manual owner approval was intentionally removed for the approved same-chat scope; pause/stop, eligibility, duplicate, and result-validation controls remain required.
- [ ] All nine Stage 1 origin completion criteria pass in the intended deployment environment. This remains unchecked; the owner has closed Stage 1 as PARTIAL for sequencing only.

## Workstream 0 — Establish a safe implementation baseline

- [x] Confirm the execution target and local data architecture: the owner selected the target Windows computer; this package uses local SQLite and a local files directory, so it does not require hosted database/object storage endpoints.
- [x] Document supported installer runtimes: 64-bit Windows 10+, Node.js 22 or 24 LTS, pnpm 10.18.0. The optional Python/Telethon worker is not installed by this ZIP.
- [x] Owner reports target-Windows operational baseline, repeat start/stop, backup/restore, and ACL checks as PASS. Confirm any remaining runtime-version or newly-created-file ACL checks from retained evidence before closing deployment validation.
- [x] A reviewed rollback baseline exists at `stable-merge` commit `e8e7660`; `feature/telegram-file-transfer` is the authorized delivery branch. Track the final corrective commit and tested-package revision in the delivery record.
- [x] Inventory local installer settings without reading secret values; keep the generated `.env`, database, file bytes, and Telegram session data out of Git.
- [x] Document local config/data paths, Windows account ACLs, stop-before-backup steps, and a database/files/config backup helper in `docs/windows-installation.md`.
- [x] Add a dashboard **Create private backup** action that creates a protected recovery copy without running diagnostic test records.
- [x] Choose local SQLite plus a local files directory instead of a hosted database/object store for this computer install; no hosted endpoints are configured by the package.
- [x] Owner reports physical backup/restore, including Telegram session recovery, as PASS. Preserve rollback of deployed code/configuration and any checks of the new SQLite migration as separate items.

**Exit condition:** The target architecture and secret location are documented; Workstream 0 remains open until computer runtime/ACL/backup verification and a reviewed code rollback point are complete.

## Workstream 1 — Define runtime configuration and feature gates

- [x] Specify the versioned runtime configuration schema and separate secret contract; schema `v1` and explicit model selection, including deliberate `auto`, are implemented.
- [x] Keep credentials in protected local environment values; ordinary exports and task logs exclude secret values.
- [x] Validate required settings at startup and fail closed with non-secret errors.
- [x] Enforce server-side feature/action boundaries; OpenCode tools remain deny-all and Telegram file receipt/send are limited to authorized private same-chat scope.
- [x] Test missing, malformed, and partial runtime/provider settings and prevent silent model-selector fallback.

**Exit condition:** Startup validation and server-side feature gates enforce the approved configuration; secret values cannot be read back through the UI/export/log paths.

## Workstream 2 — Implement the permission and approval boundary

- [ ] Define the Stage 1 action catalog. For each action, record its required permission, risk level, input schema, allowed destinations, and whether explicit owner approval is required.
- [ ] Implement authorization in server-side code, independent of model output. Treat model-produced instructions as untrusted data, not permission grants.
- [ ] Add a durable approval state for actions requiring approval: pending, approved, rejected, expired, and completed. Record approver, time, action summary, and the exact bounded payload being approved.
- [x] Require approval before externally visible actions outside narrowly authorized scopes. The Telegram exception covers authorized private-chat text replies and explicitly requested file delivery only to that file's originating authorized chat; no broadcast, proactive, group, or cross-chat delivery is permitted.
- [ ] Implement pause/stop and suppression checks immediately before every outbound send, not only when the command is first queued.
- [ ] Keep the current safe action allowlist and arbitrary shell prohibition. Add tests proving model prompts cannot bypass blocked actions, approval state, allowlists, or pause/stop controls.
- [x] Replace the former disabled/approval-gated Telegram route with the approved bounded autonomous same-chat route in `server/workerApi.ts`; the worker allowlist contains only the narrowly scoped `send_message` and source-bound `send_file` commands, with server validation remaining authoritative.
- [ ] Retain/review target-Windows evidence for pause/stop, sender/chat/task/message eligibility, content/result validation, acknowledgement, and failure handling. The owner reports multiple checks, including acknowledgement mismatch and provider failure, as PASS; they were not independently verified here. No per-message owner approval is required for this narrow scope.
- [x] Add replay/idempotency protection so repeated inbound events or command polling do not create duplicate tasks or duplicate external sends; completed commands are filtered after restart.

**Exit condition:** Unauthorized actions are denied server-side, all externally visible effects require the defined approval, and negative tests prove the controls cannot be bypassed.

## Workstream 3 — Connect OpenCode and FreeLLMAPI

- [x] Define the supported integration contract: OpenCode CLI 2.3.0; authenticated loopback OpenCode HTTP API; an owner-supplied OpenAI-compatible FreeLLMAPI base URL/model ID; a server-side bearer key; 5-second gateway probe, 15-second prompt-acceptance timeout, 8-second poll timeout, and 120-second completion window. The actual URL/model/key remain owner-supplied and are not in Git or the ZIP.
- [x] Implement `server/openCode.ts` as a narrow provider adapter so the task workflow does not depend on provider-specific response shapes; unit tests cover the current session/model request and assistant-message response.
- [x] Generate FreeLLMAPI as a replaceable OpenCode provider; keep its key server-side, return only status labels, and use generic errors that do not echo authorization material.
- [x] Implement bounded chat/provider timeouts and clear failure states; deterministic tests cover timeout, rate limit, refusal, and malformed-response cases. Do not automatically retry uncertain external sends.
- [x] Keep the structured v1 no-side-effect proposal separate from execution and validate supported proposals against the narrow server-side allowlist.
- [x] Validate supported proposals, generated artifacts, file metadata, and Telegram acknowledgement fields; OpenCode tools remain deny-all.
- [x] Preserve the current safe demo as an explicit local mode. Dashboard labels distinguish a safe demo, ready OpenCode chat, and configured-but-offline chat; a demo answer is not labeled as a model response.
- [x] Add credential-free tests for chat success, timeout, rate limit, refusal, malformed output, unsupported actions, and provider failures.
- [x] Run an owner-approved harmless prompt through the configured gateway on the target Windows computer; the task completed and the OpenCode/FreeLLMAPI response was recorded in Ryze's activity log without recording secrets.
- [ ] Capture exact configured model/version and routed-provider metadata only if actually available; do not guess. Provider-failure checks are owner-reported PASS and were not independently verified in this workspace.

**Exit condition:** A harmless task demonstrably travels through OpenCode → FreeLLMAPI → selected model, returns a validated result, obeys permissions, and records success or failure accurately.

The implementation provides chat-only OpenCode/FreeLLMAPI analysis and denies all OpenCode tool permissions. Structured no-side-effect proposals, bounded error behavior, and credential-free tests are implemented. One real-computer model request is owner-reported PASS; exact routed model/provider metadata and general task planning/tool execution remain unverified.

## Workstream 4 — Complete Telegram user-account setup safely

- [ ] Choose the owner-controlled local worker host and service manager. Keep the worker and Telethon session local to that host as prescribed by the origin.
- [x] Install the worker dependencies in an isolated Python environment and document reproducible installation/upgrade steps.
- [ ] Configure the server-side worker token and owner identity through protected deployment secrets. Configure local API ID/hash, phone, session path, worker ID, permanent admin identity, and recovery-code policy through a protected local environment.
- [ ] Verify that the worker token is distinct from Telegram credentials, transmitted only over HTTPS, and rejected if absent or incorrect.
- [x] Perform the explicit owner login flow. Confirm phone-code and optional two-step-password handling; verify the phone shown in any UI is masked and session files remain outside Git/exports.
- [ ] Verify the session lock rejects a second worker process, releases on normal exit, and has documented recovery for a stale lock after a crash.
- [x] Test heartbeat, status updates, command polling, acknowledgements, and sanitized event handling against a non-production/test deployment first.
- [x] Test inbound messages from the permanent admin sender and a recovery-code-authorized sender, plus rejection/ignore behavior for other senders in private chats and groups. Define which message content is stored, how long it is retained, and how it is deleted; do not treat message bodies as sanitized telemetry.
- [ ] Verify on target Windows the bounded same-chat text and file delivery paths, including exact recipient/content, pause/stop, authorization, duplicate handling, acknowledgement, and audit logs. Earlier text controls are owner-reported PASS; the new file path remains NOT_RUN.
- [ ] Test network outage, OpenCode/API timeout, invalid token, unauthorized session, malformed command, command replay, and worker restart. Confirm bounded behavior and owner-visible diagnostics without exposing secrets.

**Exit condition:** Authorized account communication works end to end under the defined approval policy, and disallowed accounts/actions fail closed.

## Workstream 5 — File processing and report delivery

- [x] Implement bounded Telegram receipt: authorized private chats only, 5 MiB maximum, explicit MIME allowlist, actual-byte/type validation, sanitized filename, numeric Telegram message ID, local storage, and owner/chat/sender/message binding.
- [x] Implement bounded file send: opaque owner-scoped file ID, same-origin private chat only, command-bound binary download, size/MIME/SHA-256 checks, pause/online checks, and strict Telegram acknowledgement validation.
- [x] Implement opt-in chat-only analysis for UTF-8 TXT/Markdown/CSV/JSON up to 64 KiB. Content is untrusted, OpenCode tools remain disabled, and content is sent to the configured model only when requested.
- [x] Workspace tests cover authorized/private intake, source binding, cross-owner access, unsupported MIME, path-safe names, byte-size/hash checks, command-bound download, acknowledgement mismatch/replay, generated-summary artifact delivery, ordinary existing-file return, expiry, and early deletion.
- [ ] Test empty/oversize/mismatched files, representative formats and the 5 MiB boundary against target Windows; verify dashboard retrieval and Telegram receipt/analysis/existing-file return.
- [ ] **Deferred:** after the Ryze file-creation skill/intent limitation is resolved, test a natural-language request for a new Markdown summary attachment, verify it differs from its source, and separately confirm existing-file resend still returns the source. Current user-visible behavior resends the original and says Ryze cannot create/write files; do not count the backend route test as acceptance.
- [x] Choose and implement 30-day expiry for uploaded/generated files with earlier deletion through File Manifest. Expired files become inaccessible; startup/hourly sweeps remove active bytes and metadata. This does not remove prior backups, task logs, or Telegram-delivered copies.
- [x] Owner reports File Manifest early deletion **PASS on target Windows** on 25 November; tested package revision/checksum was not restated.
- [ ] Verify automatic 30-day expiry and cleanup on target Windows.

**Exit condition:** Validate the supported upload/process/report path on target Windows, handle failures safely, document retention/deletion, and return artifacts only to their authorized owner/destination. Workspace tests do not close the target-Windows gate.

## Workstream 6 — Execution records, result validation, and diagnostics

- [ ] Define task states and permitted transitions, including accepted, planned, approval-pending, running, completed, failed, blocked, and cancelled as needed.
- [ ] Record a task plan/action summary, permission decision, approval reference, execution attempts, sanitized tool/provider events, final result, and validation outcome.
- [ ] Ensure logs do not contain secrets, authorization headers, Telegram session material, or unnecessary personal message content. Define retention and access rules.
- [ ] Add result validators for each supported operation. For file creation, verify existence, size, MIME type, metadata, and retrievability. For external sends, verify the provider acknowledgement and preserve its message identifier safely.
- [ ] Ensure an operation is not marked complete merely because it was requested or attempted. Failed validation must result in a non-success status and clear explanation.
- [ ] Test database/storage partial failures so task and log state remain understandable; do not report completion if persistence or result verification failed.
- [ ] Ensure the owner receives a useful error/blocked status without sensitive internals or credentials.

**Exit condition:** Every supported task has a traceable permission decision, execution record, validated result, and accurate terminal status.

## Workstream 7 — Acceptance testing and deployment rehearsal

- [ ] Run formatting/type checks and the full application test suite.
- [ ] Run worker unit/safety tests on the target operating system, not only the cloud Linux environment.
- [ ] Test authentication and cross-user access for sessions, tasks, logs, memory, settings, files, exports, workers, commands, and events.
- [ ] Test safe behavior for shell requests, credential requests, external actions without approval, unauthorized chats, paused worker, malformed model output, missing secrets, and provider failures.
- [ ] Test the complete safe path: dashboard instruction → plan/action authorization → execution → validation → task/log persistence → result display.
- [ ] Test the Telegram path in stages: heartbeat/status; permanent-admin OpenCode-backed same-chat reply; unauthorized sender ignored; exact recovery-code sender accepted for one hour; pause/stop blocks sends; resume restores sends; restart does not replay completed replies; failure/acknowledgement diagnostics remain sanitized; and now-added file receipt, requested analysis, same-chat file return, and generated-note delivery.
- [ ] Verify deployment migration and rollback steps against a non-production database. Confirm backups and restore validation before any production schema/configuration change.
- [ ] Record test environment, software versions, test cases, evidence, known failures, and explicit sign-off. Do not include secret values.

**Exit condition:** The intended deployment passes the complete acceptance suite, including failure/negative cases, and has a tested rollback path.

## Workstream 8 — Stage 1 sign-off checklist

The origin blueprint's nine completion criteria must each have evidence:

- [ ] **Telegram communication:** owner-authorized Telethon user account receives a permitted test instruction and returns an approved result through the worker.
- [ ] **OpenCode execution:** an actual goal-oriented authorized task runs through the selected OpenCode runtime; the one verified text-chat response proves model connectivity only, not operational task execution.
- [x] **FreeLLMAPI connectivity:** one harmless model request succeeded through the configured local gateway; credentials remain secret. Exact upstream model/provider identity was not captured.
- [ ] **File upload and processing:** a supported file is uploaded, processed according to a documented operation, and verified without executing its contents.
- [ ] **Report/file delivery:** the owner can retrieve the verified report/artifact through each delivery channel claimed as supported.
- [ ] **Permission enforcement:** allow/deny and explicit approval rules are tested, including prompt attempts to bypass them.
- [ ] **Execution logging:** authorized events, retries, errors, and terminal outcomes are recorded with secrets redacted.
- [ ] **Error reporting:** worker, provider, storage, and validation failures are surfaced accurately and safely.
- [ ] **Result validation:** the system independently checks that each claimed operation produced the intended result before marking it complete.

**Stage 1 exit decision:** Do not label Stage 1 complete until all nine boxes are checked with evidence from the intended deployment. Any criterion that is unavailable must be explicitly marked deferred; it must not be represented as completed. Recommended bounded task example: an authorized user sends a small Markdown attachment in private chat, asks for a summary, and receives a same-chat text result. Owner acceptance of this example as the one Stage 1 task-execution demonstration and target-Windows evidence are still pending; this example does not establish general-purpose autonomous execution or file delivery by itself.

## Progress checkpoint — 15 November 2026

Completed in the current sandbox: preserved the origin blueprint and checklist; confirmed the target Windows computer target and local storage choice; converted the runtime schema/driver to SQLite with a separate first-run migration; replaced hosted file storage with atomic writes in a local directory plus authenticated owner-scoped downloads; added localhost-only server binding, scrypt owner-password bootstrap, Host/Origin checks, lockout, and Windows install/start/stop/backup helpers; removed analytics from the local build; disabled automatic Telegram replies; and wrote the installation/backup guide. `pnpm install --frozen-lockfile`, `pnpm check`, 20 Vitest tests across 10 files, 4 worker tests, and `pnpm build:local` pass. A disposable production smoke test verified localhost health, login, SQLite migration, local owner creation, and default safe settings.

The package has **not** been run on the physical target Windows computer; Windows PowerShell scripts and ACL behavior are therefore unverified on target. The generated ZIP will contain source/scripts only (no credentials or user data); installation builds dependencies on the computer and needs internet access. OpenCode/FreeLLMAPI endpoints and model, optional Telegram API/session setup, explicit outbound approval, and live end-to-end checks remain incomplete. No credentials were read or changed, and no external integrations were enabled.

**Historical next action (15 November):** install the initial ZIP and verify start/sign-in/backup on the target Windows computer.

## Progress checkpoint — 17 November 2026

Implemented the OpenCode sidecar lifecycle alongside the Ryze Node server; local authenticated health checks, safe stop handling, and separate logs; a managed chat-only OpenCode config with global and agent-level deny-all permissions; a local SQLite mapping between Ryze and OpenCode sessions; and a FreeLLMAPI adapter that reads the current OpenCode session API model-reference and assistant-content shapes. Added a hidden-key Windows setup flow that asks for the actual gateway URL and model ID instead of assuming a localhost gateway. Hosted URLs must use HTTPS; only loopback endpoints may use HTTP. Dashboard status now distinguishes “safe demo,” “OpenCode chat ready,” and “chat offline.” Both Start-Ryze wrappers keep their diagnostic window open after double-click, including on success, so the user can see startup status and failure output. Added a separate double-click in-place updater for existing installs that preserves `.env` and all user data.

Verification in the sandbox: `pnpm check`, 32 Vitest tests, 4 worker tests, and `pnpm build:local` pass. OpenCode CLI 2.3.0 `debug config` accepts the managed config and recognizes the dedicated system instruction plus deny-all tool permissions. A separate OpenCode-to-mock-FreeLLMAPI smoke test authenticated on the loopback API, created a session, sent a streamed OpenAI-compatible request, and received the mock assistant reply. A live request against the user's real FreeLLMAPI endpoint has **not** been tested; no real endpoint/model/key has been supplied, and the physical target Windows computer is not connected to this session. No real gateway credentials were used.

**Next action:** when the FreeLLMAPI API base URL, model selector (an exact ID or deliberate `auto`), and key are available, enter them privately on the target Windows computer with `Configure-FreeLLMAPI.cmd`, then use a harmless test prompt and share only status/error text. Install the revised ZIP and test double-click startup on that computer; do not send the key or `.env`. Telegram outbound now follows the bounded autonomous same-chat scope documented in the current checkpoints.

## Suggested execution order

Proceed in this order to avoid connecting live services to an incomplete safety boundary:

1. Workstream 0: deployment baseline and rollback.
2. Workstream 1: versioned config, secrets, and feature gates.
3. Workstream 2: authorization and outbound approval safeguards.
4. Workstream 6: task-state, logging, validation, and diagnostics contract.
5. Workstream 3: OpenCode/FreeLLMAPI adapter and isolated tests.
6. Workstream 5: supported file operations and verified report path.
7. Workstream 4: Telegram autonomous same-chat acceptance evidence and worker supervision, followed by Gmail OAuth with optional Drive/Photos scopes.
8. Workstream 7: full deployment rehearsal and acceptance evidence.
9. Workstream 8: owner sign-off against the origin criteria.


## Progress checkpoint — 22 November 2026

The owner reports that the latest Windows ZIP installed and Ryze startup succeeded on the target Windows computer after resetting ACLs on the existing SQLite database, WAL, and SHM files. The repair preserved the database contents; the previous `unable to open database file` error was consistent with the files having no effective ACL entries even though the containing directory was writable. This first checkpoint recorded startup only; the later 22 November checkpoint below records successful sign-in and a real OpenCode–FreeLLMAPI text-chat response. Repeat start/stop, backup/restore, and ACL inheritance for newly created files remain open. Telegram outbound remains disabled, and Stage 1 is incomplete.


## Progress checkpoint — 22 November 2026: OpenCode–FreeLLMAPI chat verified

The owner configured the target Windows installation to use the local FreeLLMAPI API base URL `http://127.0.0.1:31415/v1`; the model ID and unified key were saved only in the computer's protected `.env`. The exact selected model ID was not shared, and no key value is recorded here. The owner reported OpenCode `Running` and FreeLLMAPI `Connected`, signed in, and submitted a harmless SQLite explanation request. Ryze marked the task `COMPLETED`; the activity log records routing through OpenCode and FreeLLMAPI, the chat-only deny-all tool policy, and the returned model text. This is evidence that a real model-backed text response traversed the configured path.

Two follow-up requests asked for two separate Markdown bullet lines; both replies placed the points on one line. The chat round-trip worked, but those tests did not pass the requested formatting. The exact upstream provider/model route was not identified; Ryze does not display the FreeLLMAPI `X-Routed-Via` response header, and no direct SDK test has yet been run.

**Stage 1 remains incomplete.** This verifies text chat only, not OpenCode's goal-oriented planning/tool execution, safe file-content processing, or all nine origin acceptance criteria. Telegram same-chat delivery is now implemented separately and has one successful OpenCode-backed target-Windows report; its pause, restart, duplicate, timeout, and failure-recovery evidence remains open. The immediate next steps are to finish the remaining Workstream 0 evidence and the runtime configuration, result-validation, and bounded action-boundary work before considering broader tools.

## Progress checkpoint — 23 November 2026: Telegram inbound operation verified

The owner completed the dashboard Telegram login-code flow on the target Windows computer and reported the sender-policy acceptance test successful. The connected user account reached authorized/running status; the permanent admin sender was accepted; ordinary messages from another sender were ignored; the exact recovery code temporarily authorized that sender for one hour; and dashboard pause, resume, and stop controls worked. A later test also confirmed that an authorized Telegram prompt was routed through the OpenCode workspace and returned to the same chat. This closes the inbound deployment verification and establishes the autonomous same-chat path, but not the remaining pause/restart/duplicate/failure acceptance evidence.

**Next approved direction:** complete target-Windows acceptance evidence for autonomous same-chat replies, then finish Stage 1 configuration, structured-output, result-validation, and worker-supervision gaps. Add Gmail later through Google OAuth, with Drive and Photos as separate optional scopes. Never request or store a Gmail password, and do not enable either workstream merely by documenting it.

**Target-Windows acceptance update — 23 November 2026:** The owner reported PASS for permanent-admin same-chat reply, pause/resume, unauthorized-sender rejection, temporary recovery-code authorization, and controlled failure handling. A JPG-to-PDF-and-send request was correctly refused because the current assistant is text-only; this confirms the safety boundary but does not satisfy file-processing or Telegram file-delivery evidence. File upload/processing, report retrieval, worker stop/start replay, and explicit recovery-code expiry evidence remain open.

**Follow-up acceptance update — 23 November 2026:** The owner verified metadata-only file handling for `ryze-baseline-test-20261123135610940.md` (`text/markdown`, `113` bytes); the system explicitly confirmed that file content was not executed. This closes the current metadata-inspection safety check, but generated report/file delivery remains open. Worker stop/start replay behavior and duplicate/replayed inbound-event prevention were reported PASS. Recovery-code expiry remains intentionally pending for a later verification pass.

## Restore and Telegram backup checkpoint

- [x] Add a dashboard selector and explicit confirmation for protected backup restore.
- [x] Apply restore only during the next Windows startup, preserving current live data first.
- [x] Include Telegram `worker.env` and Telethon session files in protected backups while excluding `.venv`.
- [ ] Verify restore on the target Windows computer, including Telegram session recovery and preserved-copy review.
- [ ] Verify autonomous Telegram same-chat pause/stop, sender/chat/task/message eligibility, duplicate prevention, content/result validation, acknowledgement, and failure logging on target Windows; no per-message owner approval is required for this bounded scope.

## Current reconciliation and partial-close decision — 25 November 2026

- Implemented in the current workspace: a narrowly matched generated-summary backend route and a separate existing-file resend path. However, the owner's latest natural-language request still returned the source file, and Ryze said it cannot create files. Treat this as a capability/skill gap; defer the summary benchmark until Ryze can recognize and invoke file creation. The user selected 30-day automatic deletion with earlier deletion available; active-store expiry, cleanup, and File Manifest delete action are implemented.
- Full verification passed: `pnpm test` (57 tests across 19 files), `pnpm run worker:test` (9 Python tests), `pnpm check`, `pnpm run build:local`, and `git diff --check`. The standalone build retains a non-fatal large-chunk warning.
- Owner reports File Manifest early deletion PASS on target Windows (25 November; exact package revision/checksum not restated). The new-summary benchmark is deferred pending the skill fix; existing-file return is separately owner-reported PASS on `d35b770`. Automatic 30-day expiry still needs target-Windows verification. Do not infer user-facing file-creation capability from sandbox backend tests.
- Retention applies to active file bytes and metadata. It does not erase prior backups, task logs (which may retain prompts/model answers), or copies already sent to Telegram. Keep backup archives private.
- The owner-reported Telegram acknowledgement-mismatch and provider-failure checks are **PASS (owner-reported; not independently verified here)**. Preserve the 24 November self-test exactly as recorded: Gate 1/5/8 `NOT_RUN`, Gate 7 `WARN`.
- The owner directs: Stage 1 is **PARTIAL — closed for sequencing, not complete**; proceed to Stage 2 without waiving or relabeling outstanding Stage 1 criteria. The new-file natural-language skill/intent issue is on hold for Stage 2 design. Do not change the live agent skill or enable broad file writes before its permission, source, output, review, and rollback boundaries are agreed. Verify automatic 30-day expiry on Windows separately; early File Manifest deletion is already owner-reported PASS. Retain sanitized evidence. This does not establish general-purpose execution.
- Stage 2 is the next active stage. Follow [`stage-2-implementation-plan.md`](./stage-2-implementation-plan.md), starting with the memory taxonomy/identity contract and a lossless additive SQLite migration. The ECC proposal is for audit/evaluation only; it cannot replace Ryze memory or any Stage 1/2 acceptance gate.
