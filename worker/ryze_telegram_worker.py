"""RyzeFramework local Telegram user-account worker.

The worker is the only component that touches Telegram API credentials and
Telethon session files. It communicates with the hosted runtime using a
small authenticated JSON API and never evaluates server payloads as code.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from telethon import TelegramClient, events
from telethon.errors import SessionPasswordNeededError

LOGGER = logging.getLogger("ryze.telegram")
ALLOWED_COMMANDS = {"pause", "resume", "reload_config", "request_status"}


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def telegram_config() -> tuple[int, str, str, Path]:
    api_id = int(required_env("TELEGRAM_API_ID"))
    api_hash = required_env("TELEGRAM_API_HASH")
    phone = required_env("TELEGRAM_PHONE")
    session_path = Path(os.environ.get("TELEGRAM_SESSION_PATH", "./data/ryze-user"))
    session_path.parent.mkdir(parents=True, exist_ok=True)
    return api_id, api_hash, phone, session_path


def allowed_chat_ids() -> set[str]:
    values = {item.strip() for item in os.environ.get("TELEGRAM_ALLOWED_CHAT_IDS", "").split(",") if item.strip()}
    if not values:
        raise RuntimeError("TELEGRAM_ALLOWED_CHAT_IDS must contain at least one approved chat ID")
    return values


class SessionLock:
    """Small single-instance guard for a Telethon SQLite session."""

    def __init__(self, session_path: Path):
        self.path = Path(f"{session_path}.lock")
        self.fd: int | None = None

    def acquire(self) -> None:
        try:
            self.fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(self.fd, f"pid={os.getpid()}\n".encode())
        except FileExistsError as exc:
            raise RuntimeError("Another Ryze Telegram worker owns this session") from exc

    def release(self) -> None:
        if self.fd is not None:
            os.close(self.fd)
            self.fd = None
        try:
            self.path.unlink()
        except FileNotFoundError:
            pass

    def __enter__(self) -> "SessionLock":
        self.acquire()
        return self

    def __exit__(self, *_: object) -> None:
        self.release()


@dataclass(frozen=True)
class RuntimeConfig:
    base_url: str
    token: str
    worker_id: str

    @classmethod
    def from_env(cls) -> "RuntimeConfig":
        base_url = required_env("RYZE_API_BASE_URL").rstrip("/")
        token = required_env("RYZE_WORKER_TOKEN")
        worker_id = os.environ.get("RYZE_WORKER_ID", "primary").strip() or "primary"
        return cls(base_url, token, worker_id)


class RuntimeApi:
    def __init__(self, config: RuntimeConfig):
        self.config = config

    def request(self, method: str, path: str, payload: dict[str, Any] | None = None, query: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self.config.base_url}/api/worker/v1{path}"
        if query:
            url = f"{url}?{urlencode(query)}"
        body = json.dumps(payload).encode() if payload is not None else None
        request = Request(url, data=body, method=method, headers={
            "Authorization": f"Bearer {self.config.token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        })
        try:
            with urlopen(request, timeout=15) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:300]
            raise RuntimeError(f"Runtime API rejected {path}: HTTP {exc.code} ({detail})") from exc
        except URLError as exc:
            raise RuntimeError(f"Runtime API unavailable for {path}: {exc.reason}") from exc

    def heartbeat(self, *, hostname: str, version: str, status: str, paused: bool) -> dict[str, Any]:
        return self.request("POST", "/heartbeat", {
            "workerId": self.config.worker_id,
            "hostname": hostname[:120],
            "version": version[:64],
            "status": status,
            "automationPaused": paused,
        })

    def inbound(self, *, chat_id: str, sender_id: str, sender_name: str, text: str, message_id: str) -> dict[str, Any]:
        return self.request("POST", "/inbound", {
            "workerId": self.config.worker_id,
            "chatId": chat_id[:120],
            "senderId": sender_id[:120],
            "senderName": sender_name[:160],
            "text": text[:5000],
            "messageId": message_id[:120],
        })

    def commands(self, after: int) -> list[dict[str, Any]]:
        return self.request("GET", "/commands", query={"workerId": self.config.worker_id, "after": after}).get("commands", [])

    def acknowledge(self, command_id: int, status: str, message: str = "") -> dict[str, Any]:
        return self.request("POST", f"/commands/{command_id}/ack", {"workerId": self.config.worker_id, "status": status, "message": message[:300]})

    def event(self, event_type: str, message: str, level: str = "info") -> dict[str, Any]:
        return self.request("POST", "/events", {
            "workerId": self.config.worker_id,
            "level": level,
            "eventType": event_type[:100],
            "message": message[:2000],
        })


async def authenticate() -> None:
    api_id, api_hash, phone, session_path = telegram_config()
    lock = SessionLock(session_path)
    with lock:
        client = TelegramClient(str(session_path), api_id, api_hash)
        await client.connect()
        try:
            if await client.is_user_authorized():
                print(json.dumps({"event": "connected", "phoneMasked": mask_phone(phone)}), flush=True)
                return
            print(json.dumps({"event": "code_required", "phoneMasked": mask_phone(phone)}), flush=True)
            await client.send_code_request(phone)
            code = await asyncio.to_thread(input, "Telegram login code: ")
            try:
                await client.sign_in(phone=phone, code=code.strip())
            except SessionPasswordNeededError:
                password = await asyncio.to_thread(input, "Telegram two-step password: ")
                await client.sign_in(password=password)
            if not await client.is_user_authorized():
                raise RuntimeError("Telegram authorization did not complete")
            print(json.dumps({"event": "connected", "phoneMasked": mask_phone(phone)}), flush=True)
        finally:
            await client.disconnect()


def mask_phone(phone: str) -> str:
    return f"{phone[:3]}••••{phone[-2:]}" if len(phone) >= 5 else "••••"


class Worker:
    def __init__(self, api: RuntimeApi):
        self.api = api
        self.allowed_chats = allowed_chat_ids()
        self.paused = False
        self.last_command_id = 0
        self.hostname = os.environ.get("HOSTNAME", "local-worker")
        self.version = os.environ.get("RYZE_WORKER_VERSION", "0.1.0")

    async def heartbeat_loop(self) -> None:
        while True:
            try:
                await asyncio.to_thread(self.api.heartbeat, hostname=self.hostname, version=self.version, status="paused" if self.paused else "online", paused=self.paused)
            except Exception as exc:
                LOGGER.warning("heartbeat unavailable: %s", exc)
            await asyncio.sleep(max(10, int(os.environ.get("RYZE_HEARTBEAT_SECONDS", "30"))))

    async def command_loop(self, client: TelegramClient) -> None:
        while True:
            try:
                commands = await asyncio.to_thread(self.api.commands, self.last_command_id)
                for command in commands:
                    command_id = int(command.get("id", 0))
                    self.last_command_id = max(self.last_command_id, command_id)
                    name = str(command.get("command", ""))
                    if name not in ALLOWED_COMMANDS:
                        await asyncio.to_thread(self.api.acknowledge, command_id, "failed", "Command is not allowed")
                        continue
                    await asyncio.to_thread(self.api.acknowledge, command_id, "acknowledged", "Worker accepted command")
                    try:
                        if name == "pause":
                            self.paused = True
                        elif name == "resume":
                            self.paused = False
                        await asyncio.to_thread(self.api.acknowledge, command_id, "completed", "Command completed")
                    except Exception as exc:
                        await asyncio.to_thread(self.api.acknowledge, command_id, "failed", str(exc))
                        await asyncio.to_thread(self.api.event, "command_failed", "Approved worker command failed", "error")
            except Exception as exc:
                LOGGER.warning("command polling unavailable: %s", exc)
            await asyncio.sleep(max(2, int(os.environ.get("RYZE_COMMAND_POLL_SECONDS", "5"))))

    async def run(self) -> None:
        api_id, api_hash, _phone, session_path = telegram_config()
        with SessionLock(session_path):
            client = TelegramClient(str(session_path), api_id, api_hash)
            await client.connect()
            if not await client.is_user_authorized():
                raise RuntimeError("Telegram session is not authorized; run worker.py login")

            @client.on(events.NewMessage(incoming=True))
            async def incoming(event: Any) -> None:
                chat_id = str(event.chat_id)
                if self.paused or chat_id not in self.allowed_chats or not event.raw_text.strip():
                    return
                sender = await event.get_sender()
                sender_id = str(getattr(sender, "id", "unknown"))
                sender_name = str(getattr(sender, "first_name", "") or "")[:160]
                try:
                    await asyncio.to_thread(self.api.inbound, chat_id=chat_id, sender_id=sender_id, sender_name=sender_name, text=event.raw_text, message_id=str(event.id))
                except Exception as exc:
                    LOGGER.warning("inbound forwarding failed: %s", exc)

            await asyncio.gather(self.heartbeat_loop(), self.command_loop(client), client.run_until_disconnected())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="RyzeFramework Telegram user-account worker")
    parser.add_argument("command", choices=("check", "login", "run"))
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    if args.command == "check":
        api = RuntimeApi(RuntimeConfig.from_env())
        result = await asyncio.to_thread(
            api.heartbeat,
            hostname=os.environ.get("HOSTNAME", "local-worker"),
            version=os.environ.get("RYZE_WORKER_VERSION", "0.1.0"),
            status="preflight",
            paused=True,
        )
        print(json.dumps({"event": "worker_api_ok", "result": result}), flush=True)
    elif args.command == "login":
        await authenticate()
    else:
        worker = Worker(RuntimeApi(RuntimeConfig.from_env()))
        await worker.run()


if __name__ == "__main__":
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(message)s")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as exc:
        LOGGER.error("worker stopped: %s", exc)
        sys.exit(1)
