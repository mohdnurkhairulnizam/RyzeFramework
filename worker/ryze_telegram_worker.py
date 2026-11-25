"""RyzeFramework local Telegram user-account worker.

The worker is the only component that touches Telegram API credentials and
Telethon session files. It communicates with the hosted runtime using a
small authenticated JSON API and never evaluates server payloads as code.
"""
from __future__ import annotations

import argparse
import asyncio
from io import BytesIO
import json
import logging
import hashlib
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urlencode
from urllib.request import Request, urlopen

from telethon import TelegramClient, events
from telethon.errors import SessionPasswordNeededError

LOGGER = logging.getLogger("ryze.telegram")
ALLOWED_COMMANDS = {"pause", "resume", "reload_config", "request_status", "send_message", "send_file"}
MAX_FILE_BYTES = 5 * 1024 * 1024
ALLOWED_FILE_MIME_TYPES = {
    "text/plain", "text/markdown", "text/csv", "application/json", "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg",
}
FILE_EXTENSIONS = {
    ".txt": "text/plain", ".md": "text/markdown", ".markdown": "text/markdown",
    ".csv": "text/csv", ".json": "application/json", ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
}


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


def safe_telegram_filename(name: str) -> str:
    leaf = name.replace("\\", "/").split("/")[-1]
    safe = "".join(char if char.isalnum() or char in "._-" else "_" for char in leaf).lstrip("_")[:120]
    return safe or "telegram-file.bin"


def infer_file_mime(filename: str, declared_mime: str | None) -> str | None:
    suffix_mime = FILE_EXTENSIONS.get(Path(filename).suffix.lower())
    declared = (declared_mime or "").split(";", 1)[0].strip().lower()
    if suffix_mime:
        return suffix_mime
    return declared if declared in ALLOWED_FILE_MIME_TYPES else None


def validate_file_bytes(data: bytes, mime_type: str, filename: str, expected_size: int, expected_hash: str | None = None) -> bool:
    if not isinstance(data, bytes) or not 0 < len(data) <= MAX_FILE_BYTES or len(data) != expected_size:
        return False
    if mime_type not in ALLOWED_FILE_MIME_TYPES or safe_telegram_filename(filename) != filename:
        return False
    if expected_hash and hashlib.sha256(data).hexdigest() != expected_hash:
        return False
    if mime_type == "application/pdf":
        return data.startswith(b"%PDF-")
    if mime_type == "image/png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/jpeg":
        return data.startswith(b"\xff\xd8\xff")
    if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return data.startswith(b"PK\x03\x04")
    try:
        text = data.decode("utf-8")
        if "\x00" in text:
            return False
        if mime_type == "application/json":
            json.loads(text)
        return True
    except (UnicodeDecodeError, json.JSONDecodeError):
        return False


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

    def upload_file(self, *, chat_id: str, sender_id: str, sender_username: str, message_id: str, filename: str, mime_type: str, data: bytes, has_caption: bool) -> dict[str, Any]:
        if not validate_file_bytes(data, mime_type, filename, len(data)):
            raise RuntimeError("Telegram file failed local type, size, or byte validation")
        url = f"{self.config.base_url}/api/worker/v1/inbound-file"
        request = Request(url, data=data, method="POST", headers={
            "Authorization": f"Bearer {self.config.token}",
            "Content-Type": "application/octet-stream",
            "Content-Length": str(len(data)),
            "X-Ryze-Worker-Id": self.config.worker_id,
            "X-Ryze-Chat-Id": chat_id,
            "X-Ryze-Sender-Id": sender_id,
            "X-Ryze-Sender-Username": sender_username,
            "X-Ryze-Message-Id": message_id,
            "X-Ryze-File-Name": quote(filename, safe=""),
            "X-Ryze-Mime-Type": mime_type,
            "X-Ryze-Private": "true",
            "X-Ryze-Has-Caption": "true" if has_caption else "false",
        })
        try:
            with urlopen(request, timeout=30) as response:
                raw = response.read(64 * 1024)
                return json.loads(raw.decode("utf-8")) if raw else {}
        except HTTPError as exc:
            raise RuntimeError(f"Runtime API rejected Telegram file: HTTP {exc.code}") from exc
        except URLError as exc:
            raise RuntimeError(f"Runtime API unavailable for Telegram file: {exc.reason}") from exc

    def download_file(self, *, file_id: str, command_id: int) -> tuple[bytes, dict[str, str]]:
        query = urlencode({"workerId": self.config.worker_id, "commandId": command_id})
        url = f"{self.config.base_url}/api/worker/v1/files/{quote(file_id, safe='')}/download?{query}"
        request = Request(url, method="GET", headers={
            "Authorization": f"Bearer {self.config.token}",
            "Accept": "application/octet-stream",
        })
        try:
            with urlopen(request, timeout=30) as response:
                headers = {name.lower(): value for name, value in response.headers.items()}
                data = response.read(MAX_FILE_BYTES + 1)
                if len(data) > MAX_FILE_BYTES or int(headers.get("content-length", "-1")) != len(data):
                    raise RuntimeError("Downloaded Telegram file exceeded or mismatched the byte limit")
                return data, headers
        except HTTPError as exc:
            raise RuntimeError(f"Runtime API rejected Telegram file download: HTTP {exc.code}") from exc
        except URLError as exc:
            raise RuntimeError(f"Runtime API unavailable for Telegram file download: {exc.reason}") from exc

    def heartbeat(self, *, hostname: str, version: str, status: str, paused: bool) -> dict[str, Any]:
        return self.request("POST", "/heartbeat", {
            "workerId": self.config.worker_id,
            "hostname": hostname[:120],
            "version": version[:64],
            "status": status,
            "automationPaused": paused,
        })

    def inbound(self, *, chat_id: str, sender_id: str, sender_username: str, sender_name: str, text: str, message_id: str, is_private: bool, file_id: str | None = None) -> dict[str, Any]:
        payload = {
            "workerId": self.config.worker_id,
            "chatId": chat_id[:120],
            "senderId": sender_id[:120],
            "senderUsername": sender_username[:64],
            "senderName": sender_name[:160],
            "text": text[:5000],
            "messageId": message_id[:120],
            "isPrivate": is_private,
        }
        if file_id is not None:
            payload["fileId"] = file_id
        return self.request("POST", "/inbound", payload)

    def commands(self, after: int) -> list[dict[str, Any]]:
        return self.request("GET", "/commands", query={"workerId": self.config.worker_id, "after": after}).get("commands", [])

    def acknowledge(self, command_id: int, status: str, message: str = "", **details: Any) -> dict[str, Any]:
        payload = {"workerId": self.config.worker_id, "status": status, "message": message[:300], **details}
        return self.request("POST", f"/commands/{command_id}/ack", payload)

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
                    previous_status = str(command.get("status", "queued"))
                    if name in {"send_message", "send_file"} and previous_status == "acknowledged":
                        await asyncio.to_thread(self.api.acknowledge, command_id, "failed", "Previous delivery outcome is uncertain after restart; not resent to avoid a duplicate.")
                        continue
                    await asyncio.to_thread(self.api.acknowledge, command_id, "acknowledged", "Worker accepted command")
                    try:
                        if name == "pause":
                            self.paused = True
                        elif name == "resume":
                            self.paused = False
                        elif name == "send_message":
                            if self.paused:
                                raise RuntimeError("Telegram worker is paused")
                            payload = command.get("payload") or {}
                            chat_id = str(payload.get("chatId", ""))
                            text = str(payload.get("text", "")).strip()
                            content_hash = str(payload.get("contentHash", ""))
                            if not chat_id or not text or len(text) > 4000 or len(content_hash) != 64:
                                raise RuntimeError("Reply command payload is invalid")
                            if hashlib.sha256(text.encode()).hexdigest() != content_hash:
                                raise RuntimeError("Reply content hash does not match")
                            entity: Any = int(chat_id) if chat_id.lstrip("-").isdigit() else chat_id
                            sent = await client.send_message(entity=entity, message=text)
                            actual_chat = str(getattr(sent, "chat_id", ""))
                            message_id = str(getattr(sent, "id", ""))
                            if actual_chat != chat_id or not message_id:
                                raise RuntimeError("Telegram did not confirm the intended chat")
                            await asyncio.to_thread(self.api.acknowledge, command_id, "completed", "Autonomous same-chat reply sent", chatId=actual_chat, messageId=message_id, contentHash=content_hash)
                            continue
                        elif name == "send_file":
                            if self.paused:
                                raise RuntimeError("Telegram worker is paused")
                            payload = command.get("payload") or {}
                            file_id = str(payload.get("fileId", ""))
                            chat_id = str(payload.get("chatId", ""))
                            sender_id = str(payload.get("senderId", ""))
                            filename = str(payload.get("originalName", ""))
                            mime_type = str(payload.get("mimeType", ""))
                            expected_size = int(payload.get("byteSize", 0))
                            expected_hash = str(payload.get("contentHash", ""))
                            if not file_id.startswith("file_") or not chat_id.isdigit() or chat_id != sender_id:
                                raise RuntimeError("Same-chat file command is invalid")
                            data, headers = await asyncio.to_thread(self.api.download_file, file_id=file_id, command_id=command_id)
                            header_file_id = headers.get("x-ryze-file-id", "")
                            header_name = safe_telegram_filename(unquote(headers.get("x-ryze-file-name", "")))
                            header_mime = headers.get("x-ryze-mime-type", "")
                            header_size = int(headers.get("x-ryze-byte-size", "0"))
                            header_hash = headers.get("x-ryze-sha256", "")
                            if (header_file_id != file_id or header_name != filename or header_mime != mime_type
                                    or header_size != expected_size or header_hash != expected_hash
                                    or not validate_file_bytes(data, mime_type, filename, expected_size, expected_hash)):
                                raise RuntimeError("File download failed strict identity or integrity validation")
                            if self.paused:
                                raise RuntimeError("Telegram worker is paused")
                            entity: Any = int(chat_id)
                            file_buffer = BytesIO(data)
                            file_buffer.name = filename
                            sent = await client.send_file(entity=entity, file=file_buffer, caption=str(payload.get("caption", ""))[:800], force_document=True)
                            if isinstance(sent, list):
                                if len(sent) != 1:
                                    raise RuntimeError("Telegram returned an unexpected multi-message file result")
                                sent = sent[0]
                            actual_chat = str(getattr(sent, "chat_id", ""))
                            message_id = str(getattr(sent, "id", ""))
                            if actual_chat != chat_id or not message_id or not getattr(sent, "file", None):
                                raise RuntimeError("Telegram did not confirm the expected file in the originating chat")
                            await asyncio.to_thread(self.api.acknowledge, command_id, "completed", "Authorized same-chat file sent", chatId=actual_chat, messageId=message_id, contentHash=expected_hash, fileId=file_id, byteSize=expected_size, mimeType=mime_type)
                            continue
                        await asyncio.to_thread(self.api.acknowledge, command_id, "completed", "Command completed")
                    except Exception as exc:
                        failure = "File delivery failed; check worker status and the Telegram log." if name == "send_file" else str(exc).replace("\r", " ").replace("\n", " ")[:260]
                        await asyncio.to_thread(self.api.acknowledge, command_id, "failed", failure)
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
                if self.paused or not bool(getattr(event, "is_private", False)):
                    return
                sender = await event.get_sender()
                sender_id = str(getattr(sender, "id", "unknown"))
                sender_username = str(getattr(sender, "username", "") or "")[:64]
                sender_name = str(getattr(sender, "first_name", "") or "")[:160]
                message_id = str(event.id)
                text = str(getattr(event, "raw_text", "") or "").strip()
                try:
                    telegram_file = getattr(event.message, "file", None)
                    if telegram_file:
                        original_name = str(getattr(telegram_file, "name", "") or "")
                        mime_type = infer_file_mime(original_name, getattr(telegram_file, "mime_type", None))
                        size = int(getattr(telegram_file, "size", 0) or 0)
                        if not original_name:
                            extension = next((suffix for suffix, value in FILE_EXTENSIONS.items() if value == mime_type), ".bin")
                            original_name = f"telegram-{message_id}{extension}"
                        filename = safe_telegram_filename(original_name)
                        if not mime_type or size <= 0 or size > MAX_FILE_BYTES:
                            LOGGER.warning("private Telegram file rejected by local type or declared-size check")
                            return
                        downloaded = await event.message.download_media(file=bytes)
                        if not isinstance(downloaded, bytes) or not validate_file_bytes(downloaded, mime_type, filename, size):
                            LOGGER.warning("private Telegram file failed local actual-byte validation")
                            return
                        receipt = await asyncio.to_thread(
                            self.api.upload_file,
                            chat_id=chat_id,
                            sender_id=sender_id,
                            sender_username=sender_username,
                            message_id=message_id,
                            filename=filename,
                            mime_type=mime_type,
                            data=downloaded,
                            has_caption=bool(text),
                        )
                        file_id = str(receipt.get("fileId", ""))
                        if receipt.get("accepted") and text and file_id:
                            await asyncio.to_thread(
                                self.api.inbound,
                                chat_id=chat_id,
                                sender_id=sender_id,
                                sender_username=sender_username,
                                sender_name=sender_name,
                                text=text,
                                message_id=message_id,
                                is_private=True,
                                file_id=file_id,
                            )
                        return
                    if not text:
                        return
                    await asyncio.to_thread(
                        self.api.inbound,
                        chat_id=chat_id,
                        sender_id=sender_id,
                        sender_username=sender_username,
                        sender_name=sender_name,
                        text=text,
                        message_id=message_id,
                        is_private=True,
                    )
                except Exception as exc:
                    LOGGER.warning("private Telegram inbound forwarding failed: %s", str(exc).replace("\r", " ").replace("\n", " ")[:200])

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
