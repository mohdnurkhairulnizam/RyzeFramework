# Stage 1 — Foundation and Execution Engine: Readiness Assessment

## Purpose and status boundary

The origin blueprint defines Stage 1 as the operational foundation for a personal, goal-driven agent. The target is not just a conversational interface: it must accept an instruction, understand the intended outcome, plan and execute an authorized operation, validate what actually happened, and return a result with a record of execution.

This document maps that Stage 1 design to the code currently in this repository. It distinguishes code that exists from code that has been configured and live-verified. A passing build or a test of the safe demo does not prove that the live Telegram, OpenCode, or model-provider path is operational. The origin blueprint itself says a stage is not complete until its acceptance criteria have passed.

**Assessment:** Stage 1 has a tested local dashboard/database/file-storage foundation and a Windows ZIP installation path. On the target Windows computer the owner repaired ACLs on existing SQLite files, started Ryze, signed in, received a real text response through OpenCode and the local FreeLLMAPI gateway, and verified the staged Telegram inbound path. The dashboard now also provides a dedicated protected private-backup button separate from the diagnostic baseline. Stage 1 is **partially implemented, not operationally complete**: outbound Telegram approval, tool execution, provider identity, and the remaining acceptance checks are still open.

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

### File intake and generated artifact path — locally implemented; further validation pending

The local upload route validates a fixed MIME-type allowlist, enforces a 5 MiB limit, checks decoded bytes against the declared size, sanitizes the file name, writes bytes atomically under the local storage root, and persists SQLite metadata (`server/routers/ryze.ts`, `server/storage.ts`, and `server/db.ts`). File downloads are authenticated, owner-scoped, and path-traversal checked (`server/_core/storageProxy.ts`). The safe workflow can inspect file metadata and generate a deterministic Markdown note without executing file contents.

This establishes a safe local upload/artifact path. The current safe action does not parse or analyze document contents, does not scan uploads for malware, and does not offer report delivery through Telegram. SQLite/files are ordinary local files protected by Windows account permissions, not application-encrypted data. The integration tests exercise local persistence, safe-path handling, and ownership filtering, but broad file types/sizes and physical-device behavior require target-computer testing.

### Telegram user-account bridge — inbound and autonomous same-chat path implemented

The local worker is a Telethon user-account client, not a bot. It includes explicit login and checks `is_user_authorized()`, a local session lock, sender-only inbound authorization, a small literal command allowlist, bearer-token API requests, heartbeat reporting, command acknowledgements, and sanitized event messages (`worker/ryze_telegram_worker.py`). The hosted API authenticates the worker token using constant-time comparison, resolves a configured owner, validates payload schemas, and stores user-scoped worker status/commands/events (`server/workerApi.ts`). The blueprint and worker docs prescribe keeping Telegram API credentials and `.session` files local.

The owner has now reported the local API ID/hash and phone configured, the session authorized, the worker running, permanent-admin messages accepted, ordinary unauthorized messages ignored, recovery-code authorization working for one hour, and dashboard pause/resume/stop working on the target Windows computer. The permanent admin sender and one-hour recovery-code sender rule applies in private chats and groups; no chat allowlist is required. None of those secrets should be put in Git, this document, exports, or chat.

**Safety status:** manual per-message owner approval is not used for the approved autonomous same-chat scope. The server queues replies only to the originating chat after sender authorization, checks worker pause/online state, uses durable reply keys, validates reply content, and records Telegram acknowledgement details before marking a send successful. The owner has now verified a real Telegram prompt routed through the same OpenCode + FreeLLMAPI path as the dashboard and returned to Telegram, plus pause/resume, worker stop/start replay behavior, duplicate/replayed inbound-event prevention, unauthorized-sender rejection, temporary authorization, and controlled failure handling. Target-Windows evidence is still needed for acknowledgement mismatch, provider timeout/failure, restore/rollback, and recovery-code expiry. Broadcasts, proactive messages, and unrelated automation remain disabled.

### Tests and build evidence — passed in this workspace

At the current checkout, `pnpm install --frozen-lockfile`, `pnpm check`, 32 Vitest tests across 12 files, 4 Python worker safety tests, and `pnpm build:local` passed. An isolated production-process smoke test exercised localhost health, password login, SQLite migrations, owner creation, and default settings. On the target Windows computer, the owner reports successful startup after correcting existing SQLite file ACLs, signed in, and completed one harmless model-backed chat through OpenCode and the configured local FreeLLMAPI gateway; the resulting task and assistant answer appeared in the activity log. Repeat start/stop, backup/restore, exact upstream model/provider identity, provider-failure handling, tool execution, Telegram credentials/session, owner approval, and report delivery remain unverified. The build has one non-fatal large JavaScript chunk warning.

## Origin-to-implementation readiness map

| Stage 1 requirement | Current implementation | Readiness |
| --- | --- | --- |
| Receive instructions and establish sessions | Password-protected localhost dashboard and worker inbound endpoint create scoped tasks/sessions | target Windows install, startup, sign-in, and one chat-task submission are user-verified; repeat lifecycle/backup and Telegram paths remain open |
| Interpret objectives and plan/decompose tasks | Fixed safe action classifier and one-step Ryze/Nerd demonstration logs; text-chat prompt routed to OpenCode | Demo classification and chat work; general OpenCode planning/decomposition and goal-oriented execution are not enabled |
| Select and call AI model through gateway | Local OpenCode adapter points to the configured FreeLLMAPI loopback base URL; one real chat returned text | Text request verified on target Windows; exact model ID/upstream provider and `X-Routed-Via` metadata were not captured |
| Check authorization/permissions | Safe action classifier blocks selected risky categories; user ownership enforced | Partial; no complete L0–L4 policy engine or explicit approval flow for consequential operations |
| Execute approved tools | Safe local demo operations: memory note/search, metadata inspection, deterministic Markdown generation | Partial; no general approved-tools runner; shell and integrations intentionally unavailable |
| Telegram user-account communication | Telethon worker, worker API, sender authorization/session-lock code, autonomous same-chat send path | Same-chat reply, pause/resume, stop/start replay, duplicate prevention, unauthorized-sender rejection, temporary authorization, and controlled failure handling reported PASS; acknowledgement mismatch, provider timeout, restore/rollback, and expiry remain open |
| File upload and processing | Validated 5 MiB allowlisted upload, local filesystem bytes, owner-scoped download, metadata inspection, generated Markdown note | Local storage code and ownership tests pass; semantic processing and physical Windows storage behavior remain unverified |
| Return reports/files | Dashboard task summaries, file manifest, portable export, generated note storage | Dashboard/export path implemented; end-to-end Telegram report/file delivery not verified |
| Monitor and recover errors | Status transitions, persisted logs, bounded retries | Implemented for hosted safe-demo workflow; not an independent production supervisor/watchdog |
| Validate actual result | Status/log persistence and deterministic demo outcome tests | Partial; no general tool result validation or live-provider result validation |
| Record execution history | User-scoped tasks/logs/memory/skill updates and worker telemetry records | Implemented for current hosted flows; ensure message-content/privacy retention policy is separately defined before live use |

## Stage 1 gates before calling it operational

1. **Complete autonomous Telegram acceptance evidence.** Test pause/stop immediately before send, worker restart, duplicate/replayed inbound events, Telegram acknowledgement mismatch, transient worker/API failure, OpenCode timeout/provider failure, unauthorized sender rejection, and recovery-code expiry. Keep broadcasts, proactive messaging, and unrelated automation disabled.
2. **Finalize Stage 1 runtime configuration.** Define versioned non-secret configuration for runtime/provider/model/worker values and a separate secret contract. The owner's local FreeLLMAPI base URL and key are configured and one harmless text request succeeded; the exact model ID and routed provider were not recorded. Do not silently substitute providers or default to external calls.
3. **Extend the verified chat path into safe task execution.** The OpenCode–FreeLLMAPI text-chat round trip now works. Keep permission checks outside model output; before any tools run, define structured action proposals, a narrowly scoped allowlist, approval requirements, and rejection behavior. Test controlled failures and refusals without granting shell access by default.
4. **Complete worker deployment prerequisites.** The staged local configuration, authorization, sender policy, inbound test, and one OpenCode-backed outbound reply are verified. Protected Ryze backups include `worker.env` and the Telethon session for restore, while ordinary exports still exclude them; verify failure/restart and restore cases.
5. **Run a staged end-to-end acceptance test.** Test a same-chat reply to the permanent admin sender and a recovery-code-authorized sender. Test unauthorized sender rejection, missing/invalid worker token, unauthorized session, pause/stop, transient API failure/backoff, duplicate/replayed command behavior, sanitized logs, OpenCode failure, and actual delivered content/task status. No manual approval step is required for this bounded scope.
6. **Verify file processing and delivery.** Exercise representative allowed formats and the size ceiling against the actual storage deployment; prove generated report retrieval/delivery and that uploaded content is treated as data, never executable instructions.
7. **Complete operational safety checks.** Verify execution/error logs, result validation, secret redaction, retention policy for message content, failure visibility, and recovery/rollback of the deployed worker and server configuration.
8. **Record evidence against every Stage 1 criterion.** Keep tests and deployment evidence separate from architectural statements. Mark Stage 1 complete only after all nine origin completion criteria pass in the intended deployment environment.

## Current disposition

Immediate next step: complete target-Windows acceptance evidence for the autonomous Telegram/OpenCode path, then formalize structured model output and the narrowly scoped permission/tool boundary. After those Stage 1 gates, add Gmail through Google OAuth, with Drive and Photos as separate optional scopes. Do not claim Stage 1 complete until all nine origin criteria and the remaining deployment checks pass. The current build provides real text chat, safe local demo actions, verified inbound Telegram handling, and one verified same-chat OpenCode-backed reply; it is not yet the origin blueprint's full authorized goal-oriented agent.

**Target-Windows acceptance update (23 November 2026):** The owner reported PASS for the permanent-admin same-chat reply, pause/resume enforcement, unauthorized-sender rejection, temporary recovery-code authorization, and controlled failure handling. The owner also tested a JPG conversion request; Ryze correctly refused because the current assistant is text-only and does not claim file conversion or Telegram file delivery. This is a successful safety-boundary result, not file-processing evidence. File upload/processing/report retrieval remains pending. Worker stop/start replay evidence and explicit one-hour authorization-expiry evidence remain open unless those intervals were separately observed.

**Follow-up acceptance update (23 November 2026):** The owner verified safe portable-file metadata handling: Ryze/Nerd inspected `ryze-baseline-test-20261123135610940.md` as `text/markdown` with `113` bytes and confirmed that file content was not executed. This satisfies the current metadata-only file-processing safety check; generated report/file delivery remains unverified. Worker stop/start replay behavior and duplicate/replayed inbound-event prevention were also reported PASS. Recovery-code expiry remains intentionally pending and is held for a later verification pass. The next Stage 1 focus is runtime configuration, structured action proposals, result validation, and operational recovery evidence.

## Source documents

- [`Origin Blueprint`](./origin-blueprint.md), especially Stage 1, sections 1.1–1.6, the implementation sequence, unresolved decisions, and governing principles.
- [`Blueprint implementation map`](./blueprint-implementation.md), which records the repository's Stage 1 status and implementation gates.
- [`Telegram user-account integration`](./telegram-user-account-integration.md) and [`worker README`](../worker/README.md), for the local Telethon setup and operational constraints.
- [`Verification notes`](./verification.md), for the safe hosted/demo test evidence.
