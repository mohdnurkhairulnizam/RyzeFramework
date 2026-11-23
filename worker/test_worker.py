import ast
import os
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "ryze_telegram_worker.py"


def load_function(name):
    tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
    node = next(item for item in tree.body if isinstance(item, ast.FunctionDef) and item.name == name)
    namespace = {}
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(SOURCE), "exec"), namespace)
    return namespace[name]


class WorkerSafetyTests(unittest.TestCase):
    def test_command_allowlist_is_literal_and_excludes_arbitrary_execution(self):
        source = SOURCE.read_text(encoding="utf-8")
        self.assertIn('ALLOWED_COMMANDS = {"pause", "resume", "reload_config", "request_status", "send_message"}', source)
        self.assertIn("client.send_message(", source)
        self.assertIn("content_hash", source)
        self.assertNotIn("subprocess", source)
        self.assertNotIn("eval(", source)
        self.assertNotIn("exec(", source)

    def test_server_inbound_path_queues_only_validated_same_chat_replies(self):
        worker_api = ROOT.parent / "server" / "workerApi.ts"
        source = worker_api.read_text(encoding="utf-8")
        self.assertIn('queueWorkerCommand(userId, input.data.workerId, "send_message"', source)
        self.assertIn('input.data.chatId', source)
        self.assertIn('replyKey', source)
        self.assertIn('SEND_VALIDATION_FAILED', source)
        self.assertIn('DUPLICATE_REPLY', source)

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
