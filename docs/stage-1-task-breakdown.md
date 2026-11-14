# Stage 1 — Detailed Task Breakdown and Completion Checklist

This checklist turns the origin blueprint and current repository status into an implementation sequence. A checked item means the capability exists in the current repository or the stated check has actually passed; it does not imply that a live deployment has been configured unless explicitly stated. Keep live credentials out of Git and do not enable external integrations until their safety gates pass.

## Current status at a glance

- [x] Authenticated hosted dashboard/task foundation exists.
- [x] Per-user data scoping, task logs, bounded retries, safe demo routing, file metadata, and portable export exist.
- [x] Local Telethon user-account worker and authenticated worker API code exist.
- [x] Current code passes TypeScript check, 14 Vitest tests, 3 worker tests, and production build.
- [ ] OpenCode execution is connected and verified.
- [ ] FreeLLMAPI model gateway is configured and verified.
- [ ] Telegram setup and live communication are verified.
- [ ] Owner approval is enforced for outbound Telegram actions; the current inbound path can queue a reply without per-message approval.
- [ ] All nine Stage 1 origin completion criteria pass in the intended deployment environment.

## Workstream 0 — Establish a safe implementation baseline

- [ ] Record the intended Stage 1 deployment target: owner computer/OS, hosted runtime URL, database, storage provider, and who administers each. Confirm whether the owner’s Windows laptop remains the target, since the sandbox build is not that deployment environment.
- [ ] Pin and document runtime versions for Node.js, pnpm, Python, and Telethon. Confirm the supported installation procedure for the target OS.
- [ ] Create a reviewed baseline commit/tag before changing execution, worker, or configuration behavior. Preserve a way to restore the current safe-demo behavior.
- [ ] Inventory all existing environment variables and configuration consumers. Separate non-secret settings from secrets; do not print secret values into logs or reports.
- [ ] Write a local deployment runbook that identifies where secrets and Telegram session files live, who can access them, how they are backed up, and how to revoke them.
- [ ] Confirm production database and object-storage requirements and verify that the intended environment is available. Do not run schema migrations against an unknown or production database as an exploratory step.

**Exit condition:** The target environment, safe rollback point, configuration owner, and secret-storage method are known.

## Workstream 1 — Define runtime configuration and feature gates

- [ ] Specify a versioned runtime configuration schema covering execution mode, model gateway URL/name, timeout/retry limits, worker identity, permitted actions, allowed Telegram chat IDs, and upload limits.
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
- [ ] Review the current `server/workerApi.ts` inbound route: it currently processes the inbound text and queues a `send_message` summary. Change the path so no reply is delivered until the approval policy is satisfied. Keep live outbound disabled until this change is deployed and tested.
- [ ] Add replay/idempotency protection so repeated inbound events or command polling cannot create duplicate tasks or duplicate external sends.

**Exit condition:** Unauthorized actions are denied server-side, all externally visible effects require the defined approval, and negative tests prove the controls cannot be bypassed.

## Workstream 3 — Connect OpenCode and FreeLLMAPI

- [ ] Decide and document the exact supported OpenCode version, execution interface, model gateway endpoint, model identifier, authentication method, and request/response limits. These are unresolved in the origin blueprint.
- [ ] Implement a provider adapter behind a narrow interface so the task workflow does not depend on provider-specific response shapes.
- [ ] Configure FreeLLMAPI as a replaceable gateway; keep its credentials server-side and redact authorization material from errors and traces.
- [ ] Add request timeouts, bounded retries only for appropriate transient failures, rate-limit behavior, cancellation, and clear terminal failure states. Avoid retrying unsafe side effects automatically.
- [ ] Keep planning separate from execution. Convert the plan into a structured action proposal that passes the permission/approval checks before tools run.
- [ ] Validate model responses against a strict schema. Reject malformed, overlong, unsupported, or unauthorized tool/action requests rather than interpreting them as executable commands.
- [ ] Preserve the current safe demo as an explicit local/test mode. Never imply that a demo answer came from OpenCode or FreeLLMAPI.
- [ ] Add tests with stubbed provider responses for success, timeout, rate limit, malformed output, refusals, unsupported tools, and provider failure. Ensure the tests do not require real credentials.
- [ ] Run one owner-approved integration test against the configured gateway using a harmless prompt; record model/gateway versions and observed behavior without recording secrets.

**Exit condition:** A harmless task demonstrably travels through OpenCode → FreeLLMAPI → selected model, returns a validated result, obeys permissions, and records success or failure accurately.

## Workstream 4 — Complete Telegram user-account setup safely

- [ ] Choose the owner-controlled local worker host and service manager. Keep the worker and Telethon session local to that host as prescribed by the origin.
- [ ] Install the worker dependencies in an isolated Python environment and document reproducible installation/upgrade steps.
- [ ] Configure the server-side worker token and owner identity through protected deployment secrets. Configure local API ID/hash, phone, session path, worker ID, and explicit allowed chat IDs through a protected local environment.
- [ ] Verify that the worker token is distinct from Telegram credentials, transmitted only over HTTPS, and rejected if absent or incorrect.
- [ ] Perform the explicit owner login flow. Confirm phone-code and optional two-step-password handling; verify the phone shown in any UI is masked and session files remain outside Git/exports.
- [ ] Verify the session lock rejects a second worker process, releases on normal exit, and has documented recovery for a stale lock after a crash.
- [ ] Test heartbeat, status updates, command polling, acknowledgements, and sanitized event handling against a non-production/test deployment first.
- [ ] Test inbound messages from an allowed chat and rejection/ignore behavior for a non-allowed chat. Define which message content is stored, how long it is retained, and how it is deleted; do not treat message bodies as sanitized telemetry.
- [ ] Test approved outbound delivery only after Workstream 2 is complete. Verify exact recipient/content approval, pause/stop, suppression, retries, duplicate prevention, and audit logs.
- [ ] Test network outage, API timeout, invalid token, unauthorized session, malformed command, command replay, and worker restart. Confirm bounded behavior and owner-visible diagnostics without exposing secrets.

**Exit condition:** Authorized account communication works end to end under the defined approval policy, and disallowed accounts/actions fail closed.

## Workstream 5 — File processing and report delivery

- [ ] Confirm accepted file types, maximum size, storage access controls, retention, and deletion behavior for the actual deployment.
- [ ] Verify content bytes are stored outside the relational database and database records remain user-scoped. Verify uploaded file names and MIME types are treated as untrusted input.
- [ ] Decide which document-processing operations Stage 1 actually supports. Implement only named, bounded operations; do not execute uploaded files or treat their contents as trusted instructions.
- [ ] Add tests for empty files, incorrect declared size, base64 edge cases, oversize files, unsupported MIME types, path-like names, storage failure, and cross-user file access.
- [ ] Verify report generation produces a retrievable file with correct metadata and that users can obtain it from the dashboard.
- [ ] If Telegram file delivery is in Stage 1 scope, make it an explicitly approved action and test delivery to an allowlisted chat. Otherwise document it as deferred and do not count it as complete.

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
- [ ] **OpenCode execution:** an actual request runs through the selected OpenCode runtime; safe demo mode is not counted.
- [ ] **FreeLLMAPI connectivity:** a harmless model request succeeds through the configured gateway; credentials remain secret.
- [ ] **File upload and processing:** a supported file is uploaded, processed according to a documented operation, and verified without executing its contents.
- [ ] **Report/file delivery:** the owner can retrieve the verified report/artifact through each delivery channel claimed as supported.
- [ ] **Permission enforcement:** allow/deny and explicit approval rules are tested, including prompt attempts to bypass them.
- [ ] **Execution logging:** authorized events, retries, errors, and terminal outcomes are recorded with secrets redacted.
- [ ] **Error reporting:** worker, provider, storage, and validation failures are surfaced accurately and safely.
- [ ] **Result validation:** the system independently checks that each claimed operation produced the intended result before marking it complete.

**Stage 1 exit decision:** Do not label Stage 1 complete until all nine boxes are checked with evidence from the intended deployment. Any criterion that is unavailable must be explicitly marked deferred; it must not be represented as completed.

## Progress checkpoint — 15 November 2026

Completed in the current sandbox: confirmed the repository baseline commit `45921c9` (`feat: connect telegram user worker to runtime`); recorded the current sandbox tool versions (Node.js `v22.23.4`, pnpm `10.4.1`, Python `3.12.3`, Git `2.43.0`); inventoried the variable names in `.env.example` without reading secret values; and confirmed `.env` files plus Telegram session files are covered by `.gitignore` rules. The previously run type check, application/worker tests, and production build also passed.

These checks describe the cloud sandbox only. Workstream 0 is still open: the actual deployment target and its runtime versions have not been confirmed; a reviewed recovery commit/tag for the current documentation changes has not been created; production database/object storage availability is unverified; and the secret-store/deployment runbook still needs an owner decision. No credentials were read or changed, and no external integration was enabled.

**Next action:** confirm whether the original HP Windows 10 laptop remains the local worker/deployment target and identify the intended hosted runtime/database/storage environment. After that, finish the Workstream 0 deployment baseline, then proceed to Workstream 1 configuration/feature gates and Workstream 2 outbound approval enforcement before enabling any live Telegram reply.

## Suggested execution order

Proceed in this order to avoid connecting live services to an incomplete safety boundary:

1. Workstream 0: deployment baseline and rollback.
2. Workstream 1: versioned config, secrets, and feature gates.
3. Workstream 2: authorization and outbound approval safeguards.
4. Workstream 6: task-state, logging, validation, and diagnostics contract.
5. Workstream 3: OpenCode/FreeLLMAPI adapter and isolated tests.
6. Workstream 5: supported file operations and verified report path.
7. Workstream 4: Telegram setup and staged end-to-end verification.
8. Workstream 7: full deployment rehearsal and acceptance evidence.
9. Workstream 8: owner sign-off against the origin criteria.
