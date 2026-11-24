# RyzeFramework Telegram user-account worker

This optional package can connect an owner-authorised Telegram **user account** to a configured RyzeFramework worker API. It uses Telethon, not a bot token or webhook. The staged Windows flow is adapted from the private RyzeTel bridge pattern: a separate protected `worker.env`, an owner-controlled session directory, a preflight heartbeat, and explicit `check → login → run` stages.

## Local-only secrets

Provide these values to the worker process through an owner-controlled secret store or secure launcher. The Python worker reads process environment variables; it does not load `.env` files itself. Never commit credentials, paste them into source code, or include them in dashboard responses or portable exports.

```text
RYZE_API_BASE_URL=https://your-ryze-host.example
RYZE_WORKER_TOKEN=<server-issued worker token>
RYZE_WORKER_ID=primary
TELEGRAM_API_ID=<Telegram application ID>
TELEGRAM_API_HASH=<Telegram application hash>
TELEGRAM_PHONE=+60123456789
TELEGRAM_SESSION_PATH=./data/ryze-user
```

For a fresh local Ryze install, the installer creates a separate random `RYZE_WORKER_TOKEN` in the protected application `.env`. `scripts/windows/Configure-TelegramWorker.ps1` copies only that token into a separately protected local worker environment and prompts for Telegram values on the Windows computer. The token is not the owner password and must not be pasted into chat.

Only private chats are supported. The worker ignores groups and non-private chats; the server independently requires the chat ID to match the sender ID. Within a private chat, the permanent admin sender is allowed; a sender that supplies the exact recovery code is allowed for one hour; every other sender is ignored. Files from unauthorized senders are not stored by the server.

## Install and authorize

For the staged Windows flow, run these commands from the installed Ryze `scripts/windows` directory:

```bash
.\Configure-TelegramWorker.ps1
.\Start-TelegramWorker.ps1 check
.\Start-TelegramWorker.ps1 login
.\Start-TelegramWorker.ps1 run
```

`check` sends one paused heartbeat to the local Ryze server and must pass before Telegram login. `login` creates or reuses the protected Telethon session and requests the phone code and optional two-step password locally. `run` starts the worker. It receives authorized private-chat text and files and may send text/files only to the originating authorized chat. Do not register a scheduled task yet; that supervision mechanism remains a later tested stage.

On Linux or macOS:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python ryze_telegram_worker.py login
python ryze_telegram_worker.py run
```

Before either command, a secure launcher must provide the required environment variables from the Local-only secrets section. Do not place actual values in a committed script or shell-history command. The login command requests the Telegram phone code and, when required, the Telegram two-step password. The session is stored only at `TELEGRAM_SESSION_PATH`; keep it in the ignored `worker/data/` directory or another owner-protected path. The run command refuses to start if `is_user_authorized()` is false.

## Hosted API behavior

The worker sends heartbeats, forwards authorized private-chat text and bounded raw-binary files, polls a small command queue, and acknowledges `pause`, `resume`, `reload_config`, `request_status`, `send_message`, and the narrowly scoped `send_file` command. The server creates user-scoped tasks and binds received files to their originating owner/chat/sender/message. File intake is limited to 5 MiB and the allowlist in the Ryze integration contract. Before a file send is recorded as successful, the worker validates its size/type/hash and confirms Telegram's returned chat/file/message details. There is no per-message approval within this explicit same-chat scope; groups, broadcasts, proactive messaging, arbitrary paths, and unrelated automation remain unsupported.

No server command is interpreted as shell, Python, filesystem or arbitrary Telegram code. The worker uses a local session lock to prevent concurrent Telethon SQLite access.

## Deployment note

The worker is a persistent local process. Keep the owner computer online for live Telegram handling and supervise it with an approved platform service manager. The owner reports the dashboard login/inbound lifecycle, sender authorization, recovery-code expiry, pause/resume/stop, same-chat replies, backup/restore, replay/failure checks, acknowledgement mismatch, and provider failure as PASS. The acknowledgement-mismatch and provider-failure results are owner-reported, not independently verified here. The current file-transfer code passes sandbox tests, but target-Windows/live Telegram file receipt, requested analysis, file return, and generated-note delivery are NOT_RUN. The Windows service/scheduled-task configuration and secure secret-injection method are not yet selected or tested. Preserve the local session and diagnostic logs separately from Git. The hosted sandbox API is stateless at the HTTP layer; worker state and command history are stored in the Ryze database.

## Backup boundary

The Ryze dashboard and Windows ZIP backup can include the protected `worker.env` and Telethon `data\ryze-user.session` files so a restore can recover Telegram configuration and authorization. The Python virtual environment is intentionally excluded and is recreated or retained locally. Treat the backup as secret material: never send the archive, worker environment, session, API hash, phone code, or two-step password in chat.

Autonomous same-chat text replies and explicitly requested source-bound file delivery do not require manual per-message approval within this authorized scope. The server enforces pause/stop checks, sender/chat/message eligibility, duplicate prevention, content hashing, and Telegram result validation before recording a send as successful.

## Bounded file transfer and analysis

The worker accepts authorized private-chat files up to 5 MiB from this allowlist: TXT, Markdown, CSV, JSON, PDF, DOCX, PNG, and JPEG. The worker and server validate the actual byte count/type, and the server binds the file record to the originating owner, chat, sender, and Telegram message. Filenames are sanitized; file storage keys are generated by the server.

Only UTF-8 TXT/Markdown/CSV/JSON files up to 64 KiB can be analyzed, and only after the user asks about the file. The content is treated as untrusted data and sent to the configured model provider only for the requested chat-only analysis. OpenCode tools remain denied. The 24-hour lookup window is not a deletion period: uploaded files remain in local storage, and this version has no automatic file expiry or in-dashboard delete control. Message prompts and model answers may also remain in Ryze task/activity logs.

To return the latest received file, the authorized user can ask `Send me the latest file back`; generated Markdown notes from supported Telegram tasks can also be queued to the same originating private chat. The worker downloads file bytes only for an acknowledged command and verifies the returned file identity, MIME type, size, SHA-256, and destination. If a send outcome is uncertain after restart, it is not automatically resent. These paths are workspace-tested but still require target-Windows/live Telegram acceptance testing.
