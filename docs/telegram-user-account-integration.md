# Telegram user-account integration

RyzeFramework’s planned Telegram interface uses the user-account pattern from the connected **ryzetel** repository. It does **not** use a Telegram bot token or bot webhook.

## Architecture

```text
Owner Android Telegram account
        ↕
Local Python worker using Telethon
        ↕  authenticated worker API
RyzeFramework dashboard / execution engine
```

The local worker is the only component that may access Telegram API credentials and Telethon `.session` files. The hosted dashboard receives sanitized health and activity data, not Telegram secrets or raw Telegram objects.

## Login flow

1. The owner starts account setup from an authenticated dashboard.
2. The dashboard-controlled Python subprocess opens a stable per-account `TelegramClient` session.
3. If the session is not already authorized, the subprocess requests a Telegram phone code.
4. The owner supplies the code through the setup flow.
5. If Telegram requests two-step verification, the subprocess requests the password and handles `SessionPasswordNeededError`.
6. The subprocess verifies `is_user_authorized()` before reporting success.
7. The subprocess disconnects; later worker starts connect to the existing local session and refuse to operate if authorization is absent.

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
- Require explicit owner approval before outbound actions.
- Check pause/stop state and suppression records immediately before every outbound message.
- Apply bounded retry and backoff only to transient worker/API failures.
- Log sanitized identifiers and event types; never log message bodies, authorization headers or credentials.
- Preserve diagnostic logs and a last-known-good worker revision before deployment changes.

## Current status

The pattern is documented and selected as the replacement for the earlier Telegram bot proposal. It is not yet connected to the current hosted RyzeFramework sandbox. Implementation requires a Python worker package, Telethon dependency management, a dashboard login subprocess/API, local secret/session storage, owner identity binding, and integration tests for authorization, locking, pause behavior and sanitized telemetry.
