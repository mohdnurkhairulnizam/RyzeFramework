# RyzeFramework Telegram user-account worker

This package connects an owner-authorised Telegram **user account** to the hosted RyzeFramework runtime. It uses Telethon, not a bot token or webhook.

## Local-only secrets

Create a protected local environment file or export these variables in the worker process. Never commit them, send them to the dashboard, or include them in a portable export.

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

The hosted server must be configured with the matching `RYZE_WORKER_TOKEN` and `RYZE_WORKER_OWNER_OPEN_ID`. The owner must already have a registered RyzeFramework account.

`TELEGRAM_ALLOWED_CHAT_IDS` is mandatory and comma-separated. The worker ignores inbound messages and rejects outbound commands for chats that are not explicitly listed.

## Install and authorize

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python ryze_telegram_worker.py login
python ryze_telegram_worker.py run
```

The login command requests the Telegram phone code and, when required, the Telegram two-step password. The session is stored only at `TELEGRAM_SESSION_PATH`. The run command refuses to start if `is_user_authorized()` is false.

## Hosted API behavior

The worker sends sanitized heartbeats, forwards incoming text messages, polls a small command queue, acknowledges commands, and executes only `pause`, `resume`, `reload_config`, `request_status`, and `send_message`. The server creates a user-scoped Ryze task for each inbound message and queues the verified safe-workflow summary as a Telegram reply.

No server command is interpreted as shell, Python, filesystem or arbitrary Telegram code. The worker uses a local session lock to prevent concurrent Telethon SQLite access.

## Deployment note

The worker is a persistent local process. Keep the owner computer online for live Telegram handling, supervise it with the platform’s service manager, and preserve the local session and diagnostic logs separately from Git. The hosted sandbox API is stateless at the HTTP layer; worker state and command history are stored in the Ryze database.
