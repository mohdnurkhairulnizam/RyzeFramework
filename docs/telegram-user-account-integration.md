# Telegram user-account integration

RyzeFramework’s planned Telegram interface uses the user-account pattern from the connected **ryzetel** repository. It does **not** use a Telegram bot token or bot webhook.

**Current package boundary:** the local Windows dashboard now includes a controlled Telegram setup wizard. It writes the protected local `worker.env`, installs the private worker environment, starts Telethon login, accepts the login code and optional two-step password through transient dashboard fields, and controls start/pause/resume/stop. The worker still does not send replies in this staged release. It only forwards allowlisted inbound messages after the owner completes local Telethon authorization. The older `.cmd` launchers remain as a recovery path.

## Architecture

```text
Owner Android Telegram account
        ↕
Local Python worker using Telethon
        ↕  authenticated worker API
RyzeFramework dashboard / execution engine
```

The local worker is the only component that may access Telegram API credentials and Telethon `.session` files. The hosted dashboard receives sanitized health and activity data, not Telegram secrets or raw Telegram objects.

The worker requires an explicit `TELEGRAM_ALLOWED_CHAT_IDS` allowlist. It ignores inbound messages from unapproved chats and rejects outbound commands targeting them. The Ryze recovery flow accepts the exact permanent or temporary code as the entire Telegram message; it does not require a command prefix. Raw recovery codes are never written to logs or forwarded into task prompts.

An approved chat ID is the numeric Telegram conversation ID in that allowlist. A private one-to-one conversation normally uses the sender's numeric Telegram user ID; a group or supergroup normally has a negative numeric ID. Usernames beginning with `@`, phone numbers, Telegram API IDs, and recovery codes are not chat IDs. Requiring this allowlist is intentional: a connected user account must not monitor every conversation it can access.

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
- Require explicit owner approval before outbound actions.
- Check pause/stop state and suppression records immediately before every outbound message.
- Apply bounded retry and backoff only to transient worker/API failures.
- Log sanitized identifiers and event types; never log message bodies, authorization headers or credentials.
- Preserve diagnostic logs and a last-known-good worker revision before deployment changes.

## Current status

The pattern is selected as the replacement for the earlier Telegram bot proposal, using the private RyzeTel bridge as an implementation reference for protected worker environment files, preflight heartbeat, session handling, and explicit worker lifecycle stages. The Python worker package and worker API are implemented, and the local Windows dashboard wizard now stages configuration, Telethon login, private code entry, and worker lifecycle control. Automatic outbound replies are disabled: the server does not queue `send_message`, and the worker rejects that command. Live inbound operation requires an approved chat ID and completed local authorization. Do not register a persistent Windows task or enable live replies before the approval, pause/stop, suppression, duplicate-send, and result-validation controls are implemented and tested.
