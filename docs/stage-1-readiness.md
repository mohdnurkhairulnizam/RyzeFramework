# Stage 1 — Foundation and Execution Engine: Readiness Assessment

## Purpose and status boundary

The origin blueprint defines Stage 1 as the operational foundation for a personal, goal-driven agent. The target is not just a conversational interface: it must accept an instruction, understand the intended outcome, plan and execute an authorized operation, validate what actually happened, and return a result with a record of execution.

This document maps that Stage 1 design to the code currently in this repository. It distinguishes code that exists from code that has been configured and live-verified. A passing build or a test of the safe demo does not prove that the live Telegram, OpenCode, or model-provider path is operational. The origin blueprint itself says a stage is not complete until its acceptance criteria have passed.

**Assessment and disposition (25 November 2026):** At the owner's direction, Stage 1 is **PARTIAL — closed for sequencing** and Stage 2 may proceed. This is not operational completion, does not waive any of the nine origin criteria, and does not relabel pending checks as PASS. The owner reports successful target-Windows startup, configured text chat, bounded same-chat Telegram operation, sender controls, backup/restore, and related failure checks; acknowledgement-mismatch and provider-failure remain **owner-reported PASS, not independently verified here**. The owner reports file receipt, text-only ingress/file feedback, and return/opening of the existing same-chat attachment as PASS on `d35b770`. File Manifest early deletion is separately owner-reported PASS on target Windows (exact package/checksum not restated). Automatic 30-day expiry remains pending Windows verification. The request for a distinct Markdown summary attachment still returns the source and Ryze says it cannot create/write files (**owner-reported FAIL**); the owner has placed skill/intent changes on hold for Stage 2 planning. Backend tests do not prove live agent capability. Keep the 24 November self-test unchanged, including its Gate 1/5/8 `NOT_RUN` and Gate 7 `WARN` results. Deletion removes active local bytes/metadata, not prior backups, task logs, or Telegram copies.

## What Stage 1 means in the origin blueprint

### Objective and baseline architecture

The objective is an agent that can receive instructions, understand objectives, plan tasks, use AI models, execute approved operations, and return verified results. The initial target arrangement is:

```text
Owner-authorized Telegram user account
  ↕ Telethon local Python worker
Authenticated, sanitized worker bridge
  ↕
OpenCode execution/orchestration
  ↕
FreeLLMAPI model gateway → selected AI model
  ↕
Approved tools → result validation → worker → Telegram
```

The four principal components have distinct responsibilities:

- **OpenCode** is the planned primary execution and orchestration environment. It should interpret instructions, plan and break down work, choose tools, manage context and execution, collect results, validate them, and return completed work. It is an execution engine, not the permanent memory database.
- **FreeLLMAPI** is the planned model gateway. It should decouple model selection from the execution engine and allow the model to be changed without redesigning the agent.
- **Telegram user-account client / Python worker** is the initial interface. The origin specifically calls for the owner's authorized user account through Telethon, not a bot. The worker owns Telegram API credentials and local session files. It handles supported incoming files/messages, passes requests over a sanitized authenticated bridge, reports progress, and returns results/files.
- **Python** provides supporting file processing, conversion, API integration, automation, and system utilities where the execution engine's tools are insufficient. **Git** tracks source and configuration revisions, but is not a backup for live memory or operational data.

The origin blueprint's initial infrastructure was an owner target Windows computer running Windows 10, with cloud inference preferred due to hardware constraints. The owner confirmed that computer as the application target and asked for database/files to be arranged locally. This package therefore selects embedded SQLite plus a protected local files directory; no hosted database or object store is required by the ZIP. The installer output identified Windows PowerShell 5.1 and Node.js 24.19.0; repeatable runtime, ACL, backup, and restore verification is still pending. Docker was excluded from the initial plan. Telegram login remains an explicit owner action; the optional worker is not provisioned by this installer and must refuse to operate if its local session is unauthorized. Dashboard/bridge data must not expose Telegram credentials, raw phone numbers, session paths/bytes, message bodies, or raw Telegram objects as telemetry.

### Required task lifecycle

The origin prescribes a controlled lifecycle: receive and authenticate the instruction; establish context; interpret the outcome; decompose the objective; select model, tools, and resources; check permissions; execute only authorized operations; monitor; validate actual results; record relevant execution information; and return the result. A process exit or tool invocation alone is not proof of task success.

### Permission and safety model

The origin names permission levels L0–L4: read-only; low-risk modification; controlled execution; administrative; and critical/irreversible operations. Higher-risk actions require explicit owner approval unless a narrowly defined operation is already authorized. The AI model must not be able to override the permission system through its own instructions. Stage 1 also calls for permission enforcement, execution logging, error reporting, and result validation.

### Stage 1 completion criteria from the origin

Stage 1 is only complete when all of the following are demonstrated:

1. Telegram user-account communication through the authorized Telethon worker.
2. OpenCode execution.
3. FreeLLMAPI connectivity.
4. File upload and processing.
5. Report and file delivery.
6. Permission enforcement.
7. Execution logging.
8. Error reporting.
9. Result validation.

The target outcome is an agent that performs authorized tasks, rather than only answering questions.

## What is ready in this implementation

### Local task and account foundation — implemented and tested in the sandbox

The standalone build binds only to `127.0.0.1` and uses a local owner password whose salted scrypt hash is generated during install. The password is not stored as plain text; login checks loopback address, Host/Origin, and failed-attempt lockout. Authenticated tRPC procedures use the signed-in user's ID for dashboard, sessions, tasks, uploads, safe settings, and export. Data remains owner-scoped (`server/db.ts`, `server/ryzeOwnership.ts`). The SQLite schema persists sessions, tasks, logs, memory, skills, file metadata, worker records, and safe settings.

This provides the hosted product shell and per-user task history. It is not yet equivalent to OpenCode's general-purpose planning/orchestration capability.

### Safe execution boundary — implemented for the demo allowlist

`determineDemoAction` classifies supported demo intents (`remember`, `recall`, `inspect_upload`, `generate_note`, `retry_demo`, and `safe_analysis`) and blocks recognized shell, credential, and external-delivery requests (`server/ryzeDemo.ts`). The demo request path does not expose arbitrary shell execution or a general-purpose tool runner. Separately, a configured OpenCode adapter now handles text-only `safe_analysis` prompts through FreeLLMAPI; one real request returned a model answer on the target Windows computer. OpenCode tools remain deny-all, and the safe settings do not enable general external actions.

This is a deliberately constrained demo execution boundary, not a complete L0–L4 authorization framework for arbitrary tools. It does not yet provide a configurable per-tool permission registry or a general owner-approval workflow for high-impact actions.

### Task lifecycle, audit trail, bounded retry — implemented for safe workflow

The hosted procedure creates a task, records acceptance, sets it in progress, records the selected action, records execution and retry events, updates status, and stores a completion/failure summary (`server/routers/ryze.ts`). Recoverable errors receive bounded retries, with retry count and logs persisted. Non-recoverable errors end the run. Tests verify the bounded retry behavior and read persisted task/retry data through authenticated procedures.

The completion record is a safe-demo result. It does not currently mean an external model or real-world operation was independently checked. Validation is presently workflow-level (allowlisted action completed and records persisted), not a general validator for arbitrary tool outputs.

### File intake, bounded processing, and artifact path — implemented; target-Windows validation pending

The local dashboard upload path validates a fixed MIME-type allowlist, enforces a 5 MiB limit, writes bytes under the local storage root, and persists SQLite metadata. The Telegram worker now also accepts authorized private-chat files through an authenticated raw-binary route, uses actual-byte/MIME checks and numeric Telegram message IDs, and binds metadata to the originating owner, chat, sender, and message. The worker can download only an owner-scoped file referenced by an acknowledged `send_file` command. File metadata is checked again against byte size, MIME type, and SHA-256 before delivery, and the worker's completed acknowledgement must confirm the expected file and same chat. No arbitrary filesystem path or destination is accepted.

Authorized private-chat requests can pass UTF-8 TXT, Markdown, CSV, or JSON content up to 64 KiB to the existing chat-only OpenCode/FreeLLMAPI route, only when the user asks about the attachment. The file is untrusted data; tools remain deny-all and file content itself is excluded from Ryze task logs. The chosen policy is 30 days from file creation for uploaded and generated files. Expired files are inaccessible, and startup/hourly cleanup removes active local bytes and metadata; the File Manifest offers earlier deletion. The owner reports File Manifest early deletion **PASS on target Windows** (25 November; exact package not restated); automatic expiry remains to be verified there. This does not delete prior backups, task logs (which may retain prompts/model answers), or copies already sent to Telegram. This implementation does not scan uploads for malware. On `d35b770`, receipt, text-only file feedback, and return/opening of the existing file were owner-reported PASS. The latest natural-language request for a new Markdown summary still resends the source and Ryze says it cannot create files (**current owner-reported FAIL**). The current creation-intent matcher does not include `make`, so the exact prompt instead matches the existing-file resend path; the follow-up refusal also shows a broader skill/capability gap. Defer the summary-file benchmark until that prerequisite is solved; do not count backend unit/integration coverage as successful Ryze skill behavior.

### Telegram user-account bridge — inbound and autonomous same-chat path implemented

The local worker is a Telethon user-account client, not a bot. It includes explicit login and checks `is_user_authorized()`, a local session lock, sender-only inbound authorization, a small literal command allowlist, bearer-token API requests, heartbeat reporting, command acknowledgements, and sanitized event messages (`worker/ryze_telegram_worker.py`). The hosted API authenticates the worker token using constant-time comparison, resolves a configured owner, validates payload schemas, and stores user-scoped worker status/commands/events (`server/workerApi.ts`). The blueprint and worker docs prescribe keeping Telegram API credentials and `.session` files local.

The owner has now reported the local API ID/hash and phone configured, the session authorized, the worker running, permanent-admin messages accepted, ordinary unauthorized messages ignored, recovery-code authorization working for one hour and expiring as intended, and dashboard pause/resume/stop working on the target Windows computer. The permanent admin sender and one-hour recovery-code sender rule applies only to the authorized private-chat scope; group conversation access is not enabled. None of those secrets should be put in Git, this document, exports, or chat.

**Safety status:** manual per-message owner approval is not used for the already-authorized bounded same-chat scope. The server checks sender/chat binding, worker online/pause state, durable reply keys, content hashes, and Telegram acknowledgements. The owner reports PASS for the real OpenCode-backed same-chat reply, pause/resume, worker stop/start/replay, duplicate prevention, unauthorized sender rejection, temporary authorization/expiry, controlled failure handling, physical backup/restore including session recovery, and—per the owner's latest direction—acknowledgement-mismatch and provider-failure checks. The latter checks are **owner-reported PASS**, not independently verified. The dashboard provider-fault button is a separate deterministic local simulation. The owner confirms text-only ingress, file-reading feedback, and return/opening of the existing file attachment as **owner-reported PASS** on package `d35b770`. In the latest conversation, a request for a new Markdown summary again resent the original README and Ryze said it could not create/write files. The user directs that this benchmark be deferred until the Ryze file-creation skill/intent capability is solved; backend route tests do not establish that capability. The text-only null-`fileId` schema mismatch is fixed in `d35b770`; file-transfer implementation was left unchanged. The owner reports File Manifest early deletion **PASS on target Windows** (25 November; package revision not restated); automatic 30-day expiry still needs target-Windows evidence. Rollback and other Stage 1 evidence remain open. Broadcasts, proactive messages, and unrelated automation remain disabled.

### Tests and build evidence — passed in this workspace

On the current uncommitted workspace, `pnpm check`, 57 Vitest tests across 19 files, 9 Python worker tests, `pnpm build:local`, and `git diff --check` passed. New tests cover expiry/deletion, stale duplicate Telegram uploads, backend generated-summary artifact delivery, and ordinary existing-file return. The build has one non-fatal large JavaScript chunk warning. These sandbox results do not establish that Ryze recognizes a natural-language file-creation request; the owner reports that the current Telegram interaction still resends the original and refuses to create a file. Defer that benchmark until skill/intent capability is addressed. The owner reports early File Manifest deletion PASS on Windows; 30-day automatic expiry remains pending target-Windows verification. The retained 18:33 self-test's `NOT_RUN`/`WARN` statuses are unchanged.

## Origin-to-implementation readiness map

| Stage 1 requirement | Current implementation | Readiness |
| --- | --- | --- |
| Receive instructions and establish sessions | Password-protected localhost dashboard and worker inbound endpoint create scoped tasks/sessions | target Windows install, startup, sign-in, and one chat-task submission are user-verified; repeat lifecycle/backup and Telegram paths remain open |
| Interpret objectives and plan/decompose tasks | Fixed safe action classifier, bounded OpenCode chat, and opt-in small-text-file summary route | One narrow README file-feedback task is owner-reported PASS on `d35b770`. General OpenCode planning/decomposition and goal-oriented execution are not enabled |
| Select and call AI model through gateway | Local OpenCode adapter points to the configured FreeLLMAPI loopback base URL; one real chat returned text | Text request verified on target Windows; exact model ID/upstream provider and `X-Routed-Via` metadata were not captured |
| Check authorization/permissions | Safe action classifier blocks selected risky categories; user ownership enforced | Partial; no complete L0–L4 policy engine or explicit approval flow for consequential operations |
| Execute approved tools | Safe local demo operations: memory note/search, metadata inspection, deterministic Markdown generation | Partial; no general approved-tools runner; shell and integrations intentionally unavailable |
| Telegram user-account communication | Telethon worker, sender authorization, private-chat text/file receipt, existing-file return, and a narrow backend summary route | Existing-file attachment return is owner-reported PASS on `d35b770`. Latest natural-language summary request still resends the source and produces a text-only refusal (**owner-reported FAIL**); defer benchmark until the Ryze skill/intent capability gap is addressed |
| File upload and processing | Validated 5 MiB allowlisted Telegram intake, SQLite origin binding, dashboard/local storage, and 64 KiB UTF-8 TXT/Markdown/CSV/JSON chat-only analysis | Sandbox tests PASS; owner reports file-reading feedback and File Manifest early deletion PASS on Windows. Automatic 30-day expiry still needs Windows verification; broader file-type/size cases remain open; no malware scanning |
| Return reports/files | Dashboard task summaries/file manifest, generated-note storage, command-bound Telegram file send to source chat | Existing-file return is owner-reported PASS. Current summary-as-file request fails visibly: source resent and Ryze claims text-only limitation. Backend route tests do not establish skill behavior; defer this benchmark until file-creation capability is solved |
| Monitor and recover errors | Status transitions, persisted logs, bounded retries | Implemented for hosted safe-demo workflow; not an independent production supervisor/watchdog |
| Validate actual result | Status/log persistence and deterministic demo outcome tests | Partial; no general tool result validation or live-provider result validation |
| Record execution history | User-scoped tasks/logs/memory/skill updates and worker telemetry records | Implemented for current hosted flows; ensure message-content/privacy retention policy is separately defined before live use |

## Stage 1 criteria retained after the partial close

The following criteria remain the origin blueprint's completion requirements. This register is preserved for traceability; Stage 1 is closed for sequencing, not declared complete. Carry outstanding target-environment evidence forward and reopen an item if needed for safety, data integrity, privacy, or regression.

1. **Complete autonomous Telegram acceptance evidence.** The owner reports the requested acknowledgement-mismatch and provider-failure checks as PASS; retain that status as owner-reported until the detailed non-secret evidence is independently reviewed. The 18:33 self-test's `NOT_RUN` entries remain unchanged for that test. Any remaining target-Windows pause/restart/replay/failure scenarios should be recorded individually. Keep broadcasts, proactive messaging, and unrelated automation disabled.
2. **Finalize Stage 1 runtime configuration.** Define versioned non-secret configuration for runtime/provider/model/worker values and a separate secret contract. The v1 contract and fail-closed startup validation are implemented; the owner's local FreeLLMAPI base URL and key are configured and one harmless text request succeeded; an explicit model selector is configured, with `auto` intentionally delegated to FreeLLMAPI. The routed provider is not recorded. Do not silently substitute providers or make an external call when the selector is blank.
3. **Extend the verified chat path into safe task execution.** The OpenCode–FreeLLMAPI text-chat round trip now works. Structured v1 no-side-effect proposals and a narrow server-side allowlist are implemented for the current safe actions; strict output validators cover file metadata, generated artifacts, and Telegram acknowledgements. Future tools remain deny-all until each permission, rejection, and result-validation rule is separately approved and tested.
4. **Complete worker deployment prerequisites.** The staged local configuration, authorization, sender policy, inbound test, and one OpenCode-backed outbound reply are verified. Protected Ryze backups include `worker.env` and the Telethon session for restore, while ordinary exports still exclude them; verify failure/restart and restore cases.
5. **Run a staged end-to-end acceptance test.** Test a same-chat reply to the permanent admin sender and a recovery-code-authorized sender. Test unauthorized sender rejection, missing/invalid worker token, unauthorized session, pause/stop, transient API failure/backoff, duplicate/replayed command behavior, sanitized logs, OpenCode failure, and actual delivered content/task status. No manual approval step is required for this bounded scope.
6. **Verify file processing and delivery.** The branch implements 5 MiB private-chat receipt and opt-in chat-only analysis of UTF-8 TXT/Markdown/CSV/JSON up to 64 KiB. Existing-file same-chat return is owner-reported PASS. The user's latest summary-as-file request still returns the source and Ryze says it is text-only; first resolve the file-creation skill/intent capability, then resume the deferred new-summary benchmark and verify a distinct attachment. The owner reports File Manifest early deletion PASS on Windows. Verify automatic 30-day expiry separately and retain the caveat that backups/task logs/Telegram copies are not erased.
7. **Complete operational safety checks.** Verify execution/error logs, result validation, secret redaction, the documented retention policy for message content, failure visibility, and physical recovery/rollback of the deployed worker and server configuration. Automated path/expiry tests pass; File Manifest early deletion is owner-reported PASS on Windows, while automatic 30-day expiry still requires target-Windows evidence.
8. **Record evidence against every Stage 1 criterion.** Keep tests and deployment evidence separate from architectural statements. Mark Stage 1 complete only after all nine origin completion criteria pass in the intended deployment environment.

## Current disposition and Stage 2 transition

The text-only Telegram issue is fixed in `d35b770`: `RuntimeApi.inbound` omits absent `fileId`, avoiding `400 INVALID_INBOUND`; the owner reports file feedback and existing-file return/opening on that package. File Manifest early deletion is **PASS (owner-reported, target Windows, 25 November)**; package revision/checksum was not restated. Automatic 30-day expiry is implemented/tested in the sandbox but not yet verified on Windows. The latest request for a new Markdown summary still resends the source and Ryze says it cannot create files; this user-visible capability/skill issue is held for Stage 2 design at the owner's direction. Do not alter the live skill layer without a reviewed boundary, and do not use backend tests as acceptance. The owner-reported acknowledgement-mismatch and provider-failure checks remain not independently verified. Preserve the 24 November self-test's historical `NOT_RUN`/`WARN` statuses. **Stage 1 is PARTIAL and closed for sequencing only; its criteria are not waived. Stage 2 is now the next active stage.** See [`stage-2-implementation-plan.md`](./stage-2-implementation-plan.md). Gmail/Google remains out of scope for Stage 2.

**Target-Windows acceptance update (23 November 2026):** The owner reported PASS for the permanent-admin same-chat reply, pause/resume enforcement, unauthorized-sender rejection, temporary recovery-code authorization, and controlled failure handling. The owner also tested a JPG conversion request; Ryze correctly refused because the current assistant is text-only and does not claim file conversion or Telegram file delivery. This is a successful safety-boundary result, not file-processing evidence. File upload/processing/report retrieval remains pending. Worker stop/start replay evidence was also reported PASS.

**Historical follow-up acceptance update (24 November 2026; next-focus note superseded 25 November):** The owner verified safe portable-file metadata handling: Ryze/Nerd inspected `ryze-baseline-test-20261123135610940.md` as `text/markdown` with `113` bytes and confirmed that file content was not executed. This satisfies the current metadata-only file-processing safety check; generated report/file delivery remains unverified. Worker stop/start replay behavior and duplicate/replayed inbound-event prevention were also reported PASS. The owner subsequently reported the real one-hour recovery-code expiry observation as PASS. At that time, the next Stage 1 focus was provider failure evidence, physical restore/rollback, and report/file delivery; the owner later closed Stage 1 as PARTIAL for sequencing and moved to Stage 2.

## Source documents

- [`Origin Blueprint`](./origin-blueprint.md), especially Stage 1, sections 1.1–1.6, the implementation sequence, unresolved decisions, and governing principles.
- [`Blueprint implementation map`](./blueprint-implementation.md), which records the repository's Stage 1 status and implementation gates.
- [`Stage 2 implementation plan`](./stage-2-implementation-plan.md), the next active stage after the owner's partial-close decision.
- [`Telegram user-account integration`](./telegram-user-account-integration.md) and [`worker README`](../worker/README.md), for the local Telethon setup and operational constraints.
- [`Verification notes`](./verification.md), for the safe hosted/demo test evidence.

### Provider fault simulation evidence

The dashboard now provides a protected, deterministic provider-fault self-test. It reports PASS/FAIL for timeout, HTTP 429/rate-limit, refusal/error, and malformed response classification, with a copyable non-secret report. This is local simulation evidence only; live OpenCode/FreeLLMAPI fault behavior remains a separate target-Windows acceptance item.

### Newly reported target-Windows evidence

- Physical backup and restore, including Telegram session recovery: PASS.
- Real one-hour recovery-code expiry observation: PASS.
- Prior owner-reported generated Markdown note creation/local file-store save: PASS (a separate creation path; does not prove that a free-form Telegram request created a new attachment).
- Prior Telegram generated-note same-chat text response: PASS as a text response only; it does not verify a generated file attachment.
- Existing-file same-chat attachment return/opening on `d35b770`: PASS (owner-reported). A later request to create and send a new Markdown summary returned the original README and Ryze said it could not create/save a file: FAIL (owner-reported for new-note creation/delivery via that chat request).

### Target-Windows provider fault self-test result — PASS

On 24 November 2026, the installed dashboard provider fault self-test passed all four deterministic scenarios: timeout, rate limit, refusal, and malformed response. The copied report confirmed no network calls, no provider URL/key/model reads, no Telegram messages, and no runtime configuration changes. This verifies the local error-handling boundary only and does not replace live-provider fault evidence.

### Current file-transfer and acceptance update — 25 November 2026

- Workspace at `d35b770`: `pnpm run check` PASS; 51 Vitest tests across 18 files PASS; 9 Python worker tests PASS; `pnpm run build:local` PASS with a non-fatal large-chunk warning; `git diff --check` PASS.
- Root cause was text-only requests including `fileId: null`, rejected by the server before logging/task creation. Commit `d35b770` omits absent file IDs and preserves real IDs for caption requests; focused tests cover both. The owner confirms text-only ingress/file-reading feedback and existing-file attachment return/opening PASS on package `d35b770` (**owner-reported; ZIP checksum not separately reconfirmed**). A separate new-Markdown request returned the original README and Ryze said it could not create a file (**owner-reported FAIL for this creation/delivery flow**). File receipt with and without accompanying text remains owner-reported PASS. See the [Windows text-ingress/file-feedback addendum](./evidence/stage1-windows-text-ingress-file-feedback-2026-11-25.md).
- Owner-reported: Telegram acknowledgement mismatch PASS and provider failure PASS. These claims have not been independently verified here; the retained 18:33 self-test continues to show its original Gate 1/5/8 `NOT_RUN` and Gate 7 `WARN` statuses.
- The owner-reported README file-feedback and existing-file return are evidence for a narrow bounded task, not broad tool execution. New-note creation/delivery from Telegram remains failed/unverified until Ryze can create a distinct note and send it as an attachment.
- The 24-hour analysis lookup window does not delete stored files. File retention/deletion policy remains open.
