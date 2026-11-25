# Telegram user-account integration

RyzeFramework’s planned Telegram interface uses the user-account pattern from the connected **ryzetel** repository. It does **not** use a Telegram bot token or bot webhook.

**Current package boundary:** the local Windows dashboard includes a controlled Telegram setup wizard. It writes the protected local `worker.env`, installs the private worker environment, starts Telethon login, accepts the login code and optional two-step password through transient dashboard fields, and controls start/pause/resume/stop. This branch implements authorized private-chat text/file receipt, opt-in analysis of bounded text documents, and same-chat text/file delivery. The owner first reports that the `99112b4` ZIP produced no detection, log, or receipt (**FAIL**), then reports file receipt works with or without accompanying text and a receipt acknowledgment was returned (**PASS for receipt, owner-reported; tested package version unknown**). The owner also reports successful same-chat file sending (**owner-reported PASS; tested build unknown**). Plain-text-only messages remain undetected (**FAIL, owner-reported**); dashboard event/task status is unknown. The previous stable worker omitted `isPrivate`, newly required by the server; the server now safely accepts the legacy text payload only when sender ID equals chat ID. The latest owner report says text-only receipt still fails on the latest version tested, despite the `f3f15fb` compatibility change; the exact installed commit was not echoed. File receipt with and without accompanying text is reported successful. The root cause remains unknown, and the immediate task is to trace/fix text-only ingress while preserving file handling. The server-side same-chat file-send/download/ack test passes. File analysis and generated-note delivery remain **NOT_RUN**. The stop/update scripts also target only a Python worker whose command line references this Ryze installation's worker script. The older `.cmd` launchers remain as a recovery path.

## Architecture

```text
Owner Android Telegram account
        ↕
Local Python worker using Telethon
        ↕  authenticated worker API
RyzeFramework dashboard / execution engine
```

The local worker is the only component that may access Telegram API credentials and Telethon `.session` files. The hosted dashboard receives sanitized health and activity data, not Telegram secrets or raw Telegram objects.

The worker forwards private-chat text and file metadata for sender authorization by Ryze. Groups are not supported: the worker ignores non-private chats and the server independently requires `chatId === senderId`. In a private chat, the permanent admin is allowed, a sender that supplies the exact recovery code is allowed for one hour, and every other sender is ignored. The recovery flow accepts the exact permanent or temporary code as the entire Telegram message; it does not require a command prefix. Raw recovery codes are never written to logs or forwarded into task prompts.

There is no group support or group-member allowlist. Only authorized private chats are processed, with chat identity bound to the sender identity.

## Login flow

1. The owner starts account setup from an authenticated dashboard.
2. The dashboard-controlled Python subprocess opens a stable per-account `TelegramClient` session.
3. If the session is not already authorized, the subprocess requests a Telegram phone code.
4. The owner supplies the code through the setup flow.
5. If Telegram requests two-step verification, the subprocess requests the password and handles `SessionPasswordNeededError`; the dashboard supplies the value through a transient input field.
6. The subprocess verifies `is_user_authorized()` before reporting success.
7. The subprocess disconnects; later worker starts connect to the existing local session and refuse to operate if authorization is absent. Dashboard disconnect removes the protected local session before an account replacement.

Phone values shown to the dashboard must be masked. API hashes, codes, passwords, session paths, session bytes and raw credentials must never be returned through the dashboard API, logs, exports or worker telemetry.

## Worker contract

The worker-to-dashboard API should be limited to:

- Sanitized heartbeat and online/offline status.
- Approved commands such as `pause`, `resume`, `reload_config` and `request_status`.
- Command acknowledgements.
- Sanitized activity and error events.
- Validated configuration retrieval.
- Authenticated raw-binary file intake with bounded size/type and private-chat source metadata.
- Command-bound binary file download for a validated `send_file` command; no arbitrary path or destination field.

The worker must reject unknown commands and must never interpret a command payload as shell, Python, filesystem or Telegram execution content. Requests use a separate worker bearer token, distinct from Telegram credentials.

## Operational safeguards

- Use a process-wide lock so two workers cannot open the same Telethon SQLite session concurrently.
- Keep session files on the owner-controlled computer, outside Git, exports and portable packages unless an explicit encrypted migration design is approved.
- No manual owner approval is required for the approved same-chat reply scope.
- Check pause/stop state, sender/chat/task/message eligibility, and durable reply records immediately before every outbound message.
- For file transfer, validate actual bytes, MIME type, size, SHA-256, originating chat/sender, and exact Telegram acknowledgement; do not replay an uncertain send after restart.
- Apply bounded retry and backoff only to transient worker/API failures.
- Keep file bytes, authorization headers, credentials, recovery codes, and session material out of operational logs. Inbound prompt text and model answers may be retained in Telegram/task logs; treat them as personal data and follow the documented retention policy.
- Preserve diagnostic logs and a last-known-good worker revision before deployment changes.

## Current status

The pattern is selected as the replacement for the earlier Telegram bot proposal, using the private RyzeTel bridge as an implementation reference for protected worker environment files, preflight heartbeat, session handling, and explicit worker lifecycle stages. The Python worker package and worker API are implemented, and the local Windows dashboard wizard stages configuration, Telethon login, private code entry, and worker lifecycle control. The owner reports target-Windows login, authorized sender handling, unauthorized-sender rejection, recovery authorization/expiry, pause/resume/stop, same-chat replies, backup/restore, replay/failure checks, acknowledgement mismatch, and provider failure as PASS. The acknowledgement-mismatch and provider-failure claims are owner-reported and not independently verified here. The latest owner report says text-only messages still are not received (**FAIL, owner-reported**) while file messages are received with or without accompanying text (**PASS for receipt, owner-reported**). The `isPrivate` compatibility patch was insufficient in the tested environment; root cause and detection/log status remain unknown. Compare the stable `e8e7660` text path with the feature branch and trace worker dispatch, API acceptance, authorization, task/log creation, and reply queueing. Protect file receipt and same-chat file delivery. File analysis and generated-note delivery remain **NOT_RUN**.

## Bounded Telegram file receipt, analysis, and delivery

- Intake is limited to an authorized private chat (`chatId` must equal `senderId`) and a 5 MiB maximum. The allowlist is TXT, Markdown, CSV, JSON, PDF, DOCX, PNG, and JPEG. The worker and server check size/type and actual bytes; the filename is sanitized and the Telegram message ID is numeric. SQLite metadata binds each file to its owner, source chat, sender, and message.
- Semantic analysis is narrower: UTF-8 TXT, Markdown, CSV, or JSON, up to 64 KiB. It runs only when the authorized user explicitly asks about the file. Content is wrapped as untrusted data for the existing chat-only OpenCode/FreeLLMAPI route; OpenCode tools remain deny-all. The content is not copied into Ryze task logs, but the user's prompt and the model answer may be retained. The configured provider receives the file content for that requested analysis.
- A received file can be returned only to its originating authorized private chat, using an opaque owner-scoped file ID and a `send_file` command. The worker downloads only after command acknowledgement, validates file ID/name/MIME/size/SHA-256, checks pause state again, and validates the returned Telegram chat/file/message details before reporting success. Generated Markdown artifacts from eligible Telegram tasks are likewise source-bound for same-chat delivery.
- Repeated or uncertain sends fail closed. If a worker restarts after acknowledging a send command but before its final result is known, the worker reports uncertainty/failure rather than automatically resending a possible duplicate.
- The 24-hour window is an analysis/lookup limit, not file retention or deletion. Files remain in local storage; automatic expiry and an in-dashboard delete control are not implemented. Do not treat received files as temporary, and avoid sensitive uploads until the owner establishes retention/deletion handling.
- Workspace verification previously passed: TypeScript check; 49 Vitest tests across 18 files; 8 worker tests; local build (non-fatal chunk-size warning); and `git diff --check`. Those checks do not establish target-Windows behavior. The owner first reported receipt failure on package `99112b4`; the latest report says file receipt now succeeds with or without accompanying text, but text-only receipt still fails. Same-chat file sending is a prior owner-reported PASS on an unspecified build. File analysis and generated-note delivery remain **NOT_RUN**.

## Protected backup boundary

The dashboard private backup and Windows ZIP backup now include the Telegram worker's protected `worker.env` and Telethon `data\ryze-user.session` files when present. They exclude the worker `.venv` and do not expose these files through ordinary exports or dashboard telemetry. A restore preserves the current worker configuration/session first, then restores the selected copies without replacing `.venv`. Treat the backup as equivalent to a Telegram login credential: keep it private and never paste or upload it.

## Autonomous same-chat replies

The current implementation removes manual per-message approval for the already-authorized bounded scope. After an authorized private-chat message creates a Ryze task, the server may queue text only to its exact originating chat. An explicitly requested file send must be bound to the file's originating authorized private chat. The worker and server validate identifiers, content hashes and Telegram acknowledgement fields, check pause/online state, and avoid replaying completed or uncertain sends. Unauthorized senders, groups, different chats, broadcasts, proactive messages, and unrelated automation remain outside this capability.
