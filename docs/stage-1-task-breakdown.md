# Stage 1 — Detailed Task Breakdown and Completion Checklist

This checklist turns the origin blueprint and current repository status into an implementation sequence. A checked item means the capability exists in the current repository or the stated check has actually passed; it does not imply that a live deployment has been configured unless explicitly stated. Keep live credentials out of Git and do not enable external integrations until their safety gates pass.

## Current status at a glance

- [x] Password-protected localhost dashboard, local SQLite database, and safe demo task foundation exist.
- [x] Per-user data scoping, task logs, bounded retries, safe demo routing, file metadata, and portable export exist.
- [x] Local Telethon user-account worker and authenticated worker API code exist.
- [x] Autonomous Telegram same-chat replies are implemented without per-message approval; server checks, durable reply keys, content hashing, and Telegram acknowledgement validation remain enforced.
- [x] Build a Windows installer/launcher/stop/backup package using local SQLite and a protected local file directory.
- [x] Add a first-run scrypt owner password, localhost/Origin checks, rate limiting, and Windows install/backup guidance.
- [x] Current code passes TypeScript check, 32 Vitest tests across 12 files, 4 worker tests, and the local production build; a sandbox smoke test verified health, login, migration, and owner bootstrap.
- [x] Install the latest ZIP on the target Windows computer, repair ACLs on existing SQLite database/WAL/SHM files without deleting contents, sign in, and reach the Ryze dashboard.
- [x] Complete one harmless model-backed text chat from the target Windows dashboard through OpenCode and the local FreeLLMAPI gateway; general OpenCode tool execution remains disabled.
- [x] Configure the local gateway at `http://127.0.0.1:31415/v1` and receive a completed model reply. The exact model ID and upstream provider route were not recorded; no API key is stored in Git.
- [x] Telegram inbound setup and sender-only communication are verified on the target Windows computer; autonomous outbound code is implemented but target-Windows delivery verification remains open.
- [x] Manual owner approval was intentionally removed for the approved same-chat scope; pause/stop, eligibility, duplicate, and result-validation controls remain required.
- [ ] All nine Stage 1 origin completion criteria pass in the intended deployment environment.

## Workstream 0 — Establish a safe implementation baseline

- [x] Confirm the execution target and local data architecture: the owner selected the target Windows computer; this package uses local SQLite and a local files directory, so it does not require hosted database/object storage endpoints.
- [x] Document supported installer runtimes: 64-bit Windows 10+, Node.js 22 or 24 LTS, pnpm 10.18.0. The optional Python/Telethon worker is not installed by this ZIP.
- [ ] Complete remaining target-computer validation: confirm runtime versions, repeat start/stop, backup, restore, and ACL inheritance for newly created files. Owner sign-in and one OpenCode/FreeLLMAPI chat request are now verified.
- [ ] Create a reviewed baseline commit/tag before changing execution, worker, or configuration behavior. Preserve a way to restore the current safe-demo behavior.
- [x] Inventory local installer settings without reading secret values; keep the generated `.env`, database, file bytes, and Telegram session data out of Git.
- [x] Document local config/data paths, Windows account ACLs, stop-before-backup steps, and a database/files/config backup helper in `docs/windows-installation.md`.
- [x] Add a dashboard **Create private backup** action that creates a protected recovery copy without running diagnostic test records.
- [x] Choose local SQLite plus a local files directory instead of a hosted database/object store for this computer install; no hosted endpoints are configured by the package.
- [ ] Verify remaining Windows ACL behavior and the restore procedure on the target Windows computer; create and verify the first user-controlled backup. Existing DB/WAL/SHM files with missing effective ACL entries were repaired in place with `icacls /reset`.

**Exit condition:** The target architecture and secret location are documented; Workstream 0 remains open until computer runtime/ACL/backup verification and a reviewed code rollback point are complete.

## Workstream 1 — Define runtime configuration and feature gates

- [ ] Specify a versioned runtime configuration schema covering execution mode, model gateway URL/name, timeout/retry limits, worker identity, sender authorization policy, permitted actions, and upload limits.
- [ ] Keep credentials in a separate secret provider or protected local environment. Never serialize secrets into client responses, exported JSON, logs, or portable packages.
- [ ] Validate required settings at startup. Fail closed with actionable, non-secret error messages when required settings are absent or invalid.
- [ ] Add explicit feature gates for model calls, Telegram inbound handling, Telegram outbound delivery, file processing, and each tool. Defaults must remain disabled for external operations.
- [ ] Ensure UI settings cannot turn on an integration whose server-side credentials or approval controls are missing.
- [ ] Test missing, malformed, and partially configured settings. Verify that no service silently falls back to an unintended provider or demo/live mode.

**Exit condition:** Startup validation and server-side feature gates enforce the approved configuration; secret values cannot be read back through the UI/export/log paths.

## Workstream 2 — Implement the permission and approval boundary

- [ ] Define the Stage 1 action catalog. For each action, record its required permission, risk level, input schema, allowed destinations, and whether explicit owner approval is required.
- [ ] Implement authorization in server-side code, independent of model output. Treat model-produced instructions as untrusted data, not permission grants.
- [ ] Add a durable approval state for actions requiring approval: pending, approved, rejected, expired, and completed. Record approver, time, action summary, and the exact bounded payload being approved.
- [ ] Require approval immediately before any Telegram outbound message or other externally visible action. Approval must bind to the actual recipient and message/action content; changes after approval invalidate it.
- [ ] Implement pause/stop and suppression checks immediately before every outbound send, not only when the command is first queued.
- [ ] Keep the current safe action allowlist and arbitrary shell prohibition. Add tests proving model prompts cannot bypass blocked actions, approval state, allowlists, or pause/stop controls.
- [x] Disable automatic sending in the current `server/workerApi.ts` inbound route and remove `send_message` from the worker allowlist. Regression tests prove the route does not queue replies and the worker cannot send them.
- [ ] Implement the real approval flow and re-enable outbound delivery only after approval, pause/stop, suppression, and duplicate-send protections are tested. Keep live outbound disabled until then.
- [ ] Add replay/idempotency protection so repeated inbound events or command polling cannot create duplicate tasks or duplicate external sends.

**Exit condition:** Unauthorized actions are denied server-side, all externally visible effects require the defined approval, and negative tests prove the controls cannot be bypassed.

## Workstream 3 — Connect OpenCode and FreeLLMAPI

- [x] Define the supported integration contract: OpenCode CLI 2.3.0; authenticated loopback OpenCode HTTP API; an owner-supplied OpenAI-compatible FreeLLMAPI base URL/model ID; a server-side bearer key; 5-second gateway probe, 15-second prompt-acceptance timeout, 8-second poll timeout, and 120-second completion window. The actual URL/model/key remain owner-supplied and are not in Git or the ZIP.
- [x] Implement `server/openCode.ts` as a narrow provider adapter so the task workflow does not depend on provider-specific response shapes; unit tests cover the current session/model request and assistant-message response.
- [x] Generate FreeLLMAPI as a replaceable OpenCode provider; keep its key server-side, return only status labels, and use generic errors that do not echo authorization material.
- [ ] Add request timeouts, bounded retries only for appropriate transient failures, rate-limit behavior, cancellation, and clear terminal failure states. Avoid retrying unsafe side effects automatically.
- [ ] Keep planning separate from execution. Convert the plan into a structured action proposal that passes the permission/approval checks before tools run.
- [ ] Validate model responses against a strict schema. Reject malformed, overlong, unsupported, or unauthorized tool/action requests rather than interpreting them as executable commands.
- [x] Preserve the current safe demo as an explicit local mode. Dashboard labels distinguish a safe demo, ready OpenCode chat, and configured-but-offline chat; a demo answer is not labeled as a model response.
- [ ] Add tests with stubbed provider responses for success, timeout, rate limit, malformed output, refusals, unsupported tools, and provider failure. Ensure the tests do not require real credentials.
- [x] Run an owner-approved harmless prompt through the configured gateway on the target Windows computer; the task completed and the OpenCode/FreeLLMAPI response was recorded in Ryze's activity log without recording secrets.
- [ ] Capture the exact configured model ID, FreeLLMAPI version, and routed-provider metadata if available; test provider failure/timeout behavior and response-format reliability without exposing the key.

**Exit condition:** A harmless task demonstrably travels through OpenCode → FreeLLMAPI → selected model, returns a validated result, obeys permissions, and records success or failure accurately.

The implementation now provides text-only chat and denies all OpenCode tool permissions. The endpoint and key are configured locally, and one real-computer model request succeeded. Workstream 3 remains open: broad task planning/execution, structured action proposals, schema validation, transient-failure behavior, routing metadata, and the full permissions-aware acceptance path have not been demonstrated.

## Workstream 4 — Complete Telegram user-account setup safely

- [ ] Choose the owner-controlled local worker host and service manager. Keep the worker and Telethon session local to that host as prescribed by the origin.
- [x] Install the worker dependencies in an isolated Python environment and document reproducible installation/upgrade steps.
- [ ] Configure the server-side worker token and owner identity through protected deployment secrets. Configure local API ID/hash, phone, session path, worker ID, permanent admin identity, and recovery-code policy through a protected local environment.
- [ ] Verify that the worker token is distinct from Telegram credentials, transmitted only over HTTPS, and rejected if absent or incorrect.
- [x] Perform the explicit owner login flow. Confirm phone-code and optional two-step-password handling; verify the phone shown in any UI is masked and session files remain outside Git/exports.
- [ ] Verify the session lock rejects a second worker process, releases on normal exit, and has documented recovery for a stale lock after a crash.
- [x] Test heartbeat, status updates, command polling, acknowledgements, and sanitized event handling against a non-production/test deployment first.
- [x] Test inbound messages from the permanent admin sender and a recovery-code-authorized sender, plus rejection/ignore behavior for other senders in private chats and groups. Define which message content is stored, how long it is retained, and how it is deleted; do not treat message bodies as sanitized telemetry.
- [ ] Test approved outbound delivery only after Workstream 2 is complete. Verify exact recipient/content approval, pause/stop, suppression, retries, duplicate prevention, and audit logs.
- [ ] Test network outage, API timeout, invalid token, unauthorized session, malformed command, command replay, and worker restart. Confirm bounded behavior and owner-visible diagnostics without exposing secrets.

**Exit condition:** Authorized account communication works end to end under the defined approval policy, and disallowed accounts/actions fail closed.

## Workstream 5 — File processing and report delivery

- [ ] Confirm accepted file types, maximum size, storage access controls, retention, and deletion behavior for the actual deployment.
- [ ] Verify content bytes are stored outside the relational database and database records remain user-scoped. Verify uploaded file names and MIME types are treated as untrusted input.
- [ ] Decide which document-processing operations Stage 1 actually supports. Implement only named, bounded operations; do not execute uploaded files or treat their contents as trusted instructions.
- [ ] Add tests for empty files, incorrect declared size, base64 edge cases, oversize files, unsupported MIME types, path-like names, storage failure, and cross-user file access.
- [ ] Verify report generation produces a retrievable file with correct metadata and that users can obtain it from the dashboard.
- [ ] If Telegram file delivery is in Stage 1 scope, make it an explicitly approved action and test delivery to the same authorized sender chat. Otherwise document it as deferred and do not count it as complete.

**Exit condition:** The supported upload/process/report path is validated against the real storage setup, safely handles failure, and returns artifacts only to their authorized owner/destination.

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
- [ ] Test the Telegram path in stages: heartbeat only; inbound with outbound disabled; approved test reply; then approved file/report delivery if included.
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

**Stage 1 exit decision:** Do not label Stage 1 complete until all nine boxes are checked with evidence from the intended deployment. Any criterion that is unavailable must be explicitly marked deferred; it must not be represented as completed.

## Progress checkpoint — 15 November 2026

Completed in the current sandbox: preserved the origin blueprint and checklist; confirmed the target Windows computer target and local storage choice; converted the runtime schema/driver to SQLite with a separate first-run migration; replaced hosted file storage with atomic writes in a local directory plus authenticated owner-scoped downloads; added localhost-only server binding, scrypt owner-password bootstrap, Host/Origin checks, lockout, and Windows install/start/stop/backup helpers; removed analytics from the local build; disabled automatic Telegram replies; and wrote the installation/backup guide. `pnpm install --frozen-lockfile`, `pnpm check`, 20 Vitest tests across 10 files, 4 worker tests, and `pnpm build:local` pass. A disposable production smoke test verified localhost health, login, SQLite migration, local owner creation, and default safe settings.

The package has **not** been run on the physical target Windows computer; Windows PowerShell scripts and ACL behavior are therefore unverified on target. The generated ZIP will contain source/scripts only (no credentials or user data); installation builds dependencies on the computer and needs internet access. OpenCode/FreeLLMAPI endpoints and model, optional Telegram API/session setup, explicit outbound approval, and live end-to-end checks remain incomplete. No credentials were read or changed, and no external integrations were enabled.

**Historical next action (15 November):** install the initial ZIP and verify start/sign-in/backup on the target Windows computer.

## Progress checkpoint — 17 November 2026

Implemented the OpenCode sidecar lifecycle alongside the Ryze Node server; local authenticated health checks, safe stop handling, and separate logs; a managed chat-only OpenCode config with global and agent-level deny-all permissions; a local SQLite mapping between Ryze and OpenCode sessions; and a FreeLLMAPI adapter that reads the current OpenCode session API model-reference and assistant-content shapes. Added a hidden-key Windows setup flow that asks for the actual gateway URL and model ID instead of assuming a localhost gateway. Hosted URLs must use HTTPS; only loopback endpoints may use HTTP. Dashboard status now distinguishes “safe demo,” “OpenCode chat ready,” and “chat offline.” Both Start-Ryze wrappers keep their diagnostic window open after double-click, including on success, so the user can see startup status and failure output. Added a separate double-click in-place updater for existing installs that preserves `.env` and all user data.

Verification in the sandbox: `pnpm check`, 32 Vitest tests, 4 worker tests, and `pnpm build:local` pass. OpenCode CLI 2.3.0 `debug config` accepts the managed config and recognizes the dedicated system instruction plus deny-all tool permissions. A separate OpenCode-to-mock-FreeLLMAPI smoke test authenticated on the loopback API, created a session, sent a streamed OpenAI-compatible request, and received the mock assistant reply. A live request against the user's real FreeLLMAPI endpoint has **not** been tested; no real endpoint/model/key has been supplied, and the physical target Windows computer is not connected to this session. No real gateway credentials were used.

**Next action:** when you have the FreeLLMAPI API base URL and exact model ID, enter them and the key privately on the target Windows computer with `Configure-FreeLLMAPI.cmd`, then use a harmless test prompt and share only the status/error text. Install the revised ZIP and test double-click startup on that computer; do not send the key or `.env`. Telegram outbound remains disabled until the owner-approval workflow is implemented.

## Suggested execution order

Proceed in this order to avoid connecting live services to an incomplete safety boundary:

1. Workstream 0: deployment baseline and rollback.
2. Workstream 1: versioned config, secrets, and feature gates.
3. Workstream 2: authorization and outbound approval safeguards.
4. Workstream 6: task-state, logging, validation, and diagnostics contract.
5. Workstream 3: OpenCode/FreeLLMAPI adapter and isolated tests.
6. Workstream 5: supported file operations and verified report path.
7. Workstream 4: Telegram outbound safety gate and approved same-chat reply, followed by Gmail OAuth with optional Drive/Photos scopes.
8. Workstream 7: full deployment rehearsal and acceptance evidence.
9. Workstream 8: owner sign-off against the origin criteria.


## Progress checkpoint — 22 November 2026

The owner reports that the latest Windows ZIP installed and Ryze startup succeeded on the target Windows computer after resetting ACLs on the existing SQLite database, WAL, and SHM files. The repair preserved the database contents; the previous `unable to open database file` error was consistent with the files having no effective ACL entries even though the containing directory was writable. This first checkpoint recorded startup only; the later 22 November checkpoint below records successful sign-in and a real OpenCode–FreeLLMAPI text-chat response. Repeat start/stop, backup/restore, and ACL inheritance for newly created files remain open. Telegram outbound remains disabled, and Stage 1 is incomplete.


## Progress checkpoint — 22 November 2026: OpenCode–FreeLLMAPI chat verified

The owner configured the target Windows installation to use the local FreeLLMAPI API base URL `http://127.0.0.1:31415/v1`; the model ID and unified key were saved only in the computer's protected `.env`. The exact selected model ID was not shared, and no key value is recorded here. The owner reported OpenCode `Running` and FreeLLMAPI `Connected`, signed in, and submitted a harmless SQLite explanation request. Ryze marked the task `COMPLETED`; the activity log records routing through OpenCode and FreeLLMAPI, the chat-only deny-all tool policy, and the returned model text. This is evidence that a real model-backed text response traversed the configured path.

Two follow-up requests asked for two separate Markdown bullet lines; both replies placed the points on one line. The chat round-trip worked, but those tests did not pass the requested formatting. The exact upstream provider/model route was not identified; Ryze does not display the FreeLLMAPI `X-Routed-Via` response header, and no direct SDK test has yet been run.

**Stage 1 remains incomplete.** This verifies text chat only, not OpenCode's goal-oriented planning/tool execution, safe file-content processing, Telegram, the outbound approval gate, or all nine origin acceptance criteria. The immediate next step is to finish Workstream 0 on the computer: test repeat start/stop, create and verify a private backup, and confirm a restore procedure using a preserved copy. Then proceed through the checklist's runtime configuration and server-enforced permission/approval work before considering narrowly scoped tools. Keep Telegram outbound and arbitrary OpenCode tools disabled until those controls pass.

## Progress checkpoint — 23 November 2026: Telegram inbound operation verified

The owner completed the dashboard Telegram login-code flow on the target Windows computer and reported the inbound-only acceptance test successful. The connected user account reached authorized/running status; the permanent admin sender was accepted; ordinary messages from another sender were ignored; the exact recovery code temporarily authorized that sender for one hour; and dashboard pause, resume, and stop controls worked. No outbound Telegram reply was sent. This closes the staged inbound deployment verification, but not the outbound approval, suppression, duplicate-prevention, or result-validation gate.

**Next approved direction:** implement direct same-chat Telegram replies only after the server-enforced outbound safety gate is designed and tested. Then add Gmail through Google OAuth, with Drive and Photos as separate optional scopes. Never request or store a Gmail password, and do not enable either workstream merely by documenting it.

## Restore and Telegram backup checkpoint

- [x] Add a dashboard selector and explicit confirmation for protected backup restore.
- [x] Apply restore only during the next Windows startup, preserving current live data first.
- [x] Include Telegram `worker.env` and Telethon session files in protected backups while excluding `.venv`.
- [ ] Verify restore on the target Windows computer, including Telegram session recovery and preserved-copy review.
- [ ] Keep outbound Telegram replies disabled until owner approval, pause/stop, suppression, duplicate, and result-validation controls pass.
