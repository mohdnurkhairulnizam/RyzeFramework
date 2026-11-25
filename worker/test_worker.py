import ast
import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "ryze_telegram_worker.py"


def load_function(name, extra=None):
    tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
    node = next(item for item in tree.body if isinstance(item, ast.FunctionDef) and item.name == name)
    namespace = {"hashlib": hashlib, "json": json, "Path": Path}
    namespace.update(extra or {})
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(SOURCE), "exec"), namespace)
    return namespace[name]


def load_method(class_name, method_name, extra=None):
    tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
    class_node = next(item for item in tree.body if isinstance(item, ast.ClassDef) and item.name == class_name)
    node = next(item for item in class_node.body if isinstance(item, ast.FunctionDef) and item.name == method_name)
    namespace = {"Any": Any}
    namespace.update(extra or {})
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(SOURCE), "exec"), namespace)
    return namespace[method_name]


class WorkerSafetyTests(unittest.TestCase):
    def test_command_allowlist_is_literal_and_excludes_arbitrary_execution(self):
        source = SOURCE.read_text(encoding="utf-8")
        self.assertIn('ALLOWED_COMMANDS = {"pause", "resume", "reload_config", "request_status", "send_message", "send_file"}', source)
        self.assertIn("client.send_message(", source)
        self.assertIn("client.send_file(", source)
        self.assertIn("download_file(", source)
        self.assertIn("validate_file_bytes(", source)
        self.assertIn("Previous delivery outcome is uncertain after restart", source)
        self.assertNotIn("subprocess", source)
        self.assertNotIn("eval(", source)
        self.assertNotIn("exec(", source)

    def test_server_inbound_path_queues_only_validated_same_chat_replies_and_files(self):
        worker_api = ROOT.parent / "server" / "workerApi.ts"
        source = worker_api.read_text(encoding="utf-8")
        self.assertIn('queueWorkerCommand(userId, input.workerId, "send_message"', source)
        self.assertIn('queueWorkerCommand(userId, input.workerId, "send_file"', source)
        self.assertIn('input.data.chatId', source)
        self.assertIn('replyKey', source)
        self.assertIn('SEND_VALIDATION_FAILED', source)
        self.assertIn('FILE_SEND_VALIDATION_FAILED', source)
        self.assertIn('PRIVATE_CHAT_REQUIRED', source)
        self.assertIn('FILE_ORIGIN_VALIDATION_FAILED', source)
        self.assertIn('automationPaused', source)

    def test_inbound_payload_omits_absent_file_id_but_preserves_caption_file_id(self):
        inbound = load_method("RuntimeApi", "inbound")

        class FakeApi:
            config = type("Config", (), {"worker_id": "primary"})()

            def request(self, method, path, payload):
                self.call = (method, path, payload)
                return {"accepted": True}

        api = FakeApi()
        common = {
            "chat_id": "12345", "sender_id": "12345", "sender_username": "owner",
            "sender_name": "Owner", "text": "Status update", "message_id": "9050",
            "is_private": True,
        }
        inbound(api, **common)
        method, path, text_payload = api.call
        self.assertEqual((method, path), ("POST", "/inbound"))
        self.assertNotIn("fileId", text_payload)
        self.assertTrue(text_payload["isPrivate"])

        inbound(api, **common, file_id="file_12345678901234")
        self.assertEqual(api.call[2]["fileId"], "file_12345678901234")

    def test_filename_sanitization_blocks_path_components(self):
        safe_name = load_function("safe_telegram_filename", {"Path": Path})
        self.assertEqual(safe_name("../../private notes.md"), "private_notes.md")
        self.assertEqual(safe_name("C:\\Users\\Owner\\file.md"), "file.md")
        self.assertEqual(safe_name(""), "telegram-file.bin")

    def test_file_validation_checks_allowlist_actual_size_magic_utf8_and_hash(self):
        validate = load_function("validate_file_bytes", {
            "MAX_FILE_BYTES": 5 * 1024 * 1024,
            "ALLOWED_FILE_MIME_TYPES": {"text/plain", "text/markdown", "application/pdf"},
            "safe_telegram_filename": lambda name: name,
        })
        payload = b"# hello\n"
        digest = hashlib.sha256(payload).hexdigest()
        self.assertTrue(validate(payload, "text/markdown", "hello.md", len(payload), digest))
        self.assertFalse(validate(payload, "text/markdown", "hello.md", len(payload) + 1, digest))
        self.assertFalse(validate(payload, "text/markdown", "hello.md", len(payload), "0" * 64))
        self.assertFalse(validate(b"not a pdf", "application/pdf", "hello.pdf", 9))
        self.assertFalse(validate(b"\xff\xfe", "text/plain", "bad.txt", 2))
        self.assertFalse(validate(b"x" * (5 * 1024 * 1024 + 1), "text/plain", "large.txt", 5 * 1024 * 1024 + 1))
        self.assertFalse(validate(b"ok", "application/octet-stream", "bad.bin", 2))

    def test_mime_inference_uses_only_allowlisted_types(self):
        infer = load_function("infer_file_mime", {
            "FILE_EXTENSIONS": {".md": "text/markdown", ".pdf": "application/pdf"},
            "ALLOWED_FILE_MIME_TYPES": {"text/markdown", "application/pdf"},
            "Path": Path,
        })
        self.assertEqual(infer("brief.md", "application/octet-stream"), "text/markdown")
        self.assertEqual(infer("scan.pdf", None), "application/pdf")
        self.assertIsNone(infer("malware.exe", "application/octet-stream"))

    def test_inbound_file_path_requires_private_sender_binding_and_ack_validation(self):
        worker_api = ROOT.parent / "server" / "workerApi.ts"
        source = worker_api.read_text(encoding="utf-8")
        self.assertIn('app.post("/api/worker/v1/inbound-file"', source)
        self.assertIn('req.header("x-ryze-private") === "true"', source)
        self.assertIn('chatId.data !== senderId.data', source)
        self.assertIn('isTelegramSenderAllowed(userId, senderId.data, senderUsername)', source)
        self.assertIn('telegramChatId !== payload.data.chatId', source)
        self.assertIn('input.data.fileId !== payload.fileId', source)
        self.assertIn('input.data.contentHash !== payload.contentHash', source)

    def test_phone_masking_does_not_expose_full_number(self):
        mask_phone = load_function("mask_phone")
        masked = mask_phone("+60123456789")
        self.assertEqual(masked, "+60••••89")
        self.assertNotIn("1234567", masked)

    def test_session_lock_rejects_second_owner_and_releases(self):
        namespace = {"os": os, "Path": Path, "FileExistsError": FileExistsError}
        tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
        node = next(item for item in tree.body if isinstance(item, ast.ClassDef) and item.name == "SessionLock")
        exec(compile(ast.Module(body=[node], type_ignores=[]), str(SOURCE), "exec"), namespace)
        lock_cls = namespace["SessionLock"]
        with tempfile.TemporaryDirectory() as directory:
            session = Path(directory) / "session"
            first = lock_cls(session)
            second = lock_cls(session)
            first.acquire()
            try:
                with self.assertRaises(RuntimeError):
                    second.acquire()
            finally:
                first.release()
            second.acquire()
            second.release()


if __name__ == "__main__":
    unittest.main()
