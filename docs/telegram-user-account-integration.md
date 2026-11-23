# Telegram user-account integration

RyzeFramework’s planned Telegram interface uses the user-account pattern from the connected **ryzetel** repository. It does **not** use a Telegram bot token or bot webhook.

**Current package boundary:** the local Windows dashboard includes a controlled Telegram setup wizard. It writes the protected local `worker.env`, installs the private worker environment, starts Telethon login, accepts the login code and optional two-step password through transient dashboard fields, and controls start/pause/resume/stop. The worker supports autonomous same-chat replies for authorized inbound messages; target-Windows end-to-end outbound verification remains pending. The older `.cmd` launchers remain as a recovery path.

## Architecture

```text
Owner Android Telegram account
        ↕
Local Python worker using Telethon
        ↕  authenticated worker API
RyzeFramework dashboard / execution engine
```

The local worker is the only component that may access Telegram API credentials and Telethon `.session` files. The hosted dashboard receives sanitized health and activity data, not Telegram secrets or raw Telegram objects.

The worker forwards inbound text for sender authorization by Ryze; it does not require a private-chat or group allowlist. If the connected Telegram account is in a group, the same sender-only rule applies: the permanent admin is allowed, a sender that supplies the exact recovery code is allowed for one hour, and every other sender is ignored. The recovery flow accepts the exact permanent or temporary code as the entire Telegram message; it does not require a command prefix. Raw recovery codes are never written to logs or forwarded into task prompts.

There is no approved-chat or group-member allowlist in this design. The conversation may be a private chat or a group; authorization is based on the sender identity, not the group itself.

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

The worker must reject unknown commands and must never interpret a command payload as shell, Python, filesystem or Telegram execution content. Requests use a separate worker bearer token, distinct from Telegram credentials.

## Operational safeguards

- Use a process-wide lock so two workers cannot open the same Telethon SQLite session concurrently.
- Keep session files on the owner-controlled computer, outside Git, exports and portable packages unless an explicit encrypted migration design is approved.
- No manual owner approval is required for the approved same-chat reply scope.
- Check pause/stop state, sender/chat/task/message eligibility, and durable reply records immediately before every outbound message.
- Apply bounded retry and backoff only to transient worker/API failures.
- Log sanitized identifiers and event types; never log message bodies, authorization headers or credentials.
- Preserve diagnostic logs and a last-known-good worker revision before deployment changes.

## Current status

The pattern is selected as the replacement for the earlier Telegram bot proposal, using the private RyzeTel bridge as an implementation reference for protected worker environment files, preflight heartbeat, session handling, and explicit worker lifecycle stages. The Python worker package and worker API are implemented, and the local Windows dashboard wizard now stages configuration, Telethon login, private code entry, and worker lifecycle control. The owner verified this inbound flow on the target Windows computer: login completed, the worker ran, the permanent admin was accepted, ordinary unauthorized senders were ignored, the exact recovery code temporarily authorized a sender for one hour, and pause/resume/stop controls worked. Autonomous same-chat reply queuing is now implemented without per-message owner approval. It still requires target-Windows verification of pause behavior, duplicate/replay handling, Telegram acknowledgement, and actual recipient/content validation.

## Protected backup boundary

The dashboard private backup and Windows ZIP backup now include the Telegram worker's protected `worker.env` and Telethon `data\ryze-user.session` files when present. They exclude the worker `.venv` and do not expose these files through ordinary exports or dashboard telemetry. A restore preserves the current worker configuration/session first, then restores the selected copies without replacing `.venv`. Treat the backup as equivalent to a Telegram login credential: keep it private and never paste or upload it.

## Autonomous same-chat replies

The current implementation removes manual owner approval for each reply. After an authorized inbound text creates a Ryze task, the server may queue a reply only for the exact originating chat. The worker sends the reply through the logged-in user account and reports the Telegram message identifier and content hash back to the server. The server checks that the worker is online and not paused, verifies the intended chat and content, records a durable reply key, and does not replay completed commands after restart. Unauthorized senders, different chats, broadcasts, proactive messages, and unrelated automation remain outside this capability.
