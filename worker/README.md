# RyzeFramework Telegram user-account worker

This optional package can connect an owner-authorised Telegram **user account** to a configured RyzeFramework worker API. It uses Telethon, not a bot token or webhook. The Windows dashboard ZIP does not provision the worker token or authorize a Telegram session; the worker is not enabled by that installer.

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
TELEGRAM_ALLOWED_CHAT_IDS=123456789
```

The server must be configured with the matching `RYZE_WORKER_TOKEN` and `RYZE_WORKER_OWNER_OPEN_ID`. The owner must already have a registered RyzeFramework account. The standalone local installer does not create these worker credentials.

`TELEGRAM_ALLOWED_CHAT_IDS` is mandatory and comma-separated. The worker ignores inbound messages and rejects outbound commands for chats that are not explicitly listed.

## Install and authorize

Run these commands from the `worker` directory. On Windows 10, use PowerShell:

```bash
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe .\ryze_telegram_worker.py login
.\.venv\Scripts\python.exe .\ryze_telegram_worker.py run
```

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

The worker sends sanitized heartbeats, forwards incoming text messages, polls a small command queue, and acknowledges only `pause`, `resume`, `reload_config`, and `request_status`. The server creates a user-scoped Ryze task for each inbound message. **Outbound Telegram replies are disabled** until a server-enforced owner-approval flow is implemented and tested; the worker rejects `send_message` as an unknown command.

No server command is interpreted as shell, Python, filesystem or arbitrary Telegram code. The worker uses a local session lock to prevent concurrent Telethon SQLite access.

## Deployment note

The worker is a persistent local process. Keep the owner computer online for live Telegram handling and supervise it with an approved platform service manager. The Windows service/scheduled-task configuration and secure secret-injection method are not yet selected or tested. Preserve the local session and diagnostic logs separately from Git. The hosted sandbox API is stateless at the HTTP layer; worker state and command history are stored in the Ryze database. Outbound Telegram replies remain disabled pending the owner-approval workflow.
