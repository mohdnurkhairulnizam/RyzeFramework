# Stage 1 — Foundation and Execution Engine: Readiness Assessment

## Purpose and status boundary

The origin blueprint defines Stage 1 as the operational foundation for a personal, goal-driven agent. The target is not just a conversational interface: it must accept an instruction, understand the intended outcome, plan and execute an authorized operation, validate what actually happened, and return a result with a record of execution.

This document maps that Stage 1 design to the code currently in this repository. It distinguishes code that exists from code that has been configured and live-verified. A passing build or a test of the safe demo does not prove that the live Telegram, OpenCode, or model-provider path is operational. The origin blueprint itself says a stage is not complete until its acceptance criteria have passed.

**Assessment:** Stage 1 has a substantial, tested hosted foundation and a local Telegram user-account worker/API implementation. It is **partially implemented, not operationally complete**. The live external model path is not implemented/enabled here, and live Telegram delivery still depends on owner-controlled setup and safety verification.

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

The origin blueprint's initial infrastructure was an owner HP laptop running Windows 10, with cloud inference preferred due to hardware constraints. Docker was excluded from that initial plan. Telegram login is an explicit owner action, and the worker must refuse to operate if its local session is not authorized. Dashboard/bridge data must not expose Telegram credentials, raw phone numbers, session paths/bytes, message bodies, or raw Telegram objects as telemetry.

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

### Hosted task and account foundation — implemented and tested

Authenticated tRPC procedures use the signed-in user's ID when listing the dashboard, creating sessions, submitting tasks, uploading files, updating safe settings, and exporting data (`server/routers/ryze.ts`). Database reads and writes are scoped to the owner/user; tests exercise the ownership boundary (`server/db.ts`, `server/ryzeOwnership.ts`, and server tests). Sessions, tasks, task logs, memory, skill XP, file metadata, worker heartbeats, commands, and events have persistence support in the Drizzle schema/database layer.

This provides the hosted product shell and per-user task history. It is not yet equivalent to OpenCode's general-purpose planning/orchestration capability.

### Safe execution boundary — implemented for the demo allowlist

`determineDemoAction` classifies supported demo intents (`remember`, `recall`, `inspect_upload`, `generate_note`, `retry_demo`, and `safe_analysis`) and blocks recognized shell, credential, and external-delivery requests (`server/ryzeDemo.ts`). The request path does not expose arbitrary shell execution or a general-purpose tool runner. External LLM, email, and Telegram capabilities are kept disabled in user-facing safe settings (`server/db.ts`); the classifier and tests confirm risky requests are blocked.

This is a deliberately constrained demo execution boundary, not a complete L0–L4 authorization framework for arbitrary tools. It does not yet provide a configurable per-tool permission registry or a general owner-approval workflow for high-impact actions.

### Task lifecycle, audit trail, bounded retry — implemented for safe workflow

The hosted procedure creates a task, records acceptance, sets it in progress, records the selected action, records execution and retry events, updates status, and stores a completion/failure summary (`server/routers/ryze.ts`). Recoverable errors receive bounded retries, with retry count and logs persisted. Non-recoverable errors end the run. Tests verify the bounded retry behavior and read persisted task/retry data through authenticated procedures.

The completion record is a safe-demo result. It does not currently mean an external model or real-world operation was independently checked. Validation is presently workflow-level (allowlisted action completed and records persisted), not a general validator for arbitrary tool outputs.

### File intake and generated artifact path — partially implemented

The hosted upload route validates a fixed MIME-type allowlist, enforces a 5 MiB limit, checks decoded bytes against the declared size, sanitizes the file name, stores bytes through the storage service, and persists user-scoped file metadata (`server/routers/ryze.ts`, `server/storage.ts`, and `server/db.ts`). The safe workflow can inspect the latest file's metadata without executing file contents. It can generate a deterministic Markdown note and save it through the same storage/metadata path.

This establishes safe upload and artifact storage. The current safe action does not parse or analyze document contents, nor does it offer a complete report-delivery/attachment flow through Telegram. The tested upload was a small Markdown fixture; broader format, size, malware/content, and deployed storage behavior require explicit environment testing.

### Telegram user-account bridge — code implemented, live gate not passed

The local worker is a Telethon user-account client, not a bot. It includes explicit login and checks `is_user_authorized()`, a local session lock, mandatory allowed-chat configuration, inbound filtering, a small literal command allowlist, bearer-token API requests, heartbeat reporting, command acknowledgements, and sanitized event messages (`worker/ryze_telegram_worker.py`). The hosted API authenticates the worker token using constant-time comparison, resolves a configured owner, validates payload schemas, and stores user-scoped worker status/commands/events (`server/workerApi.ts`). The blueprint and worker docs prescribe keeping Telegram API credentials and `.session` files local.

The code is not proof of a live connection. It still needs the owner's server-side worker token and owner ID, local Telegram API ID/hash and phone, authorized session, explicit approved chat ID, reachable deployment URL, and a real end-to-end authorization/inbound/reply test. None of those secrets should be put in Git, this document, exports, or chat.

**Safety issue to resolve before live delivery:** the current inbound endpoint creates and runs a safe-demo task, then automatically queues a `send_message` reply (`server/workerApi.ts`, inbound route). The worker checks pause state and approved chat ID before sending, but the code shown does not implement a per-message owner approval gate or suppression check immediately before sending. The integration guidance requires explicit approval for outbound actions and checks pause/stop/suppression before every outbound message. Until that mismatch is fixed and tested, do not configure live inbound forwarding to produce real outbound replies.

### Tests and build evidence — passed in this workspace

At the current checkout, the documented checks passed: `pnpm check`; seven Vitest files with 14 tests; three Python worker safety tests; and `pnpm build`. The worker tests cover the literal command allowlist, phone masking, and rejecting a second process lock owner. Existing verification notes also describe authenticated UI and safe demo/file/export checks. These results establish a functioning build and covered safe paths, but they do not verify live OpenCode, FreeLLMAPI, Telegram credentials/session, production database/storage, approval gates, or report delivery to a real account.

## Origin-to-implementation readiness map

| Stage 1 requirement | Current implementation | Readiness |
| --- | --- | --- |
| Receive instructions and establish sessions | Authenticated dashboard procedures and the worker inbound endpoint create user-scoped tasks/sessions | Hosted/dashboard path implemented; live Telegram path awaits configuration and end-to-end verification |
| Interpret objectives and plan/decompose tasks | Fixed safe action classifier and one-step Ryze/Nerd demonstration logs | Demo-only; OpenCode orchestration and general task planning are not implemented/enabled |
| Select and call AI model through gateway | Settings UI/schema has safe display/provider fields, but external LLM is forced disabled | Not ready; no verified OpenCode–FreeLLMAPI–model path in this implementation |
| Check authorization/permissions | Safe action classifier blocks selected risky categories; user ownership enforced | Partial; no complete L0–L4 policy engine or explicit approval flow for consequential operations |
| Execute approved tools | Safe local demo operations: memory note/search, metadata inspection, deterministic Markdown generation | Partial; no general approved-tools runner; shell and integrations intentionally unavailable |
| Telegram user-account communication | Telethon worker, worker API, authentication/allowlist/session-lock code | Code ready for configured testing; live operation not yet proven. Resolve outbound approval/suppression gap first |
| File upload and processing | Validated 5 MiB allowlisted upload, storage-backed bytes, metadata inspection, generated Markdown note | Upload/storage and metadata path implemented; semantic content processing is limited/not implemented |
| Return reports/files | Dashboard task summaries, file manifest, portable export, generated note storage | Dashboard/export path implemented; end-to-end Telegram report/file delivery not verified |
| Monitor and recover errors | Status transitions, persisted logs, bounded retries | Implemented for hosted safe-demo workflow; not an independent production supervisor/watchdog |
| Validate actual result | Status/log persistence and deterministic demo outcome tests | Partial; no general tool result validation or live-provider result validation |
| Record execution history | User-scoped tasks/logs/memory/skill updates and worker telemetry records | Implemented for current hosted flows; ensure message-content/privacy retention policy is separately defined before live use |

## Stage 1 gates before calling it operational

1. **Resolve outbound approval.** Implement and test explicit authorization for every Telegram outbound operation, including pause/stop and suppression checks immediately before sending. Until then, leave live Telegram reply delivery disabled.
2. **Finalize Stage 1 runtime configuration.** Define versioned non-secret configuration for runtime/provider/model/worker values and a separate secret contract. The origin lists OpenCode configuration and FreeLLMAPI endpoint/model as unresolved. Do not silently substitute providers or default to external calls.
3. **Implement and verify the chosen execution chain.** Connect OpenCode to the selected FreeLLMAPI model through a replaceable gateway, with explicit permission checks outside model output. Test controlled failures and refusal paths without granting shell access by default.
4. **Complete worker deployment prerequisites.** Install Telethon in the owner's chosen local environment; configure the server owner/token values and local worker environment; authorize the owner account; configure approved chat IDs; verify session files stay local and are excluded from backups/exports unless encrypted migration is later approved.
5. **Run a staged end-to-end acceptance test.** First exercise heartbeat/status and inbound test messages with outbound disabled. Then test a narrowly approved reply to an allowlisted chat. Test unauthorized chat rejection, missing/invalid worker token, unauthorized session, pause/stop, transient API failure/backoff, duplicate/replayed command behavior, sanitized logs, and outbound approval. Confirm actual delivered content and task status.
6. **Verify file processing and delivery.** Exercise representative allowed formats and the size ceiling against the actual storage deployment; prove generated report retrieval/delivery and that uploaded content is treated as data, never executable instructions.
7. **Complete operational safety checks.** Verify execution/error logs, result validation, secret redaction, retention policy for message content, failure visibility, and recovery/rollback of the deployed worker and server configuration.
8. **Record evidence against every Stage 1 criterion.** Keep tests and deployment evidence separate from architectural statements. Mark Stage 1 complete only after all nine origin completion criteria pass in the intended deployment environment.

## Current disposition

Continue Stage 1 work from the hosted safe foundation, but do not claim Stage 1 complete and do not enable live external integrations yet. The most immediate implementation gate is the Telegram outbound approval/suppression mismatch. The next major functional gap is the absence of the origin's OpenCode–FreeLLMAPI execution chain. The remaining hosted task, identity scoping, safe demo, persistence, retry, upload metadata, export, and build/test foundations are useful and already present, with the limitations stated above.

## Source documents

- [`Origin Blueprint`](./origin-blueprint.md), especially Stage 1, sections 1.1–1.6, the implementation sequence, unresolved decisions, and governing principles.
- [`Blueprint implementation map`](./blueprint-implementation.md), which records the repository's Stage 1 status and implementation gates.
- [`Telegram user-account integration`](./telegram-user-account-integration.md) and [`worker README`](../worker/README.md), for the local Telethon setup and operational constraints.
- [`Verification notes`](./verification.md), for the safe hosted/demo test evidence.
