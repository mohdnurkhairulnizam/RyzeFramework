# PROJECT RYZE — TODO

- [x] Define a portable database schema for sandbox configuration, chat sessions, task records, task logs, memory entries, skill XP, file metadata, and provider/integration settings.
- [x] Implement authenticated server procedures that scope every record to the signed-in user and never expose secret setting values to the browser.
- [x] Implement a safe Ryze → Nerd demo engine with a fixed allowlist of supported actions, structured logs, retries, memory learning, and skill XP updates.
- [x] Keep arbitrary shell execution unavailable and keep all external LLM, email, and Telegram operations disabled until explicitly configured.
- [x] Implement local filesystem upload/generated-file storage with SQLite metadata and authenticated owner-scoped download routes.
- [x] Build an elegant dark glassmorphic dashboard with a persistent sidebar, session navigation, task composer, active/completed/failed task views, and configuration/status panels.
- [x] Build portable JSON data export plus a local Windows installation/backup guide for SQLite, local files, and protected configuration.
- [x] Add Vitest coverage for the server-side safe workflow, export behavior, and user scoping.
- [x] Verify authenticated UI states, safe demo execution, file upload metadata, export download, responsive layout, and production build.
- [x] Implement a real bounded retry flow for recoverable hosted demo failures and verify its persisted status and logs.
- [x] Add Vitest tests that prove authenticated user scoping for sandbox records and portable export data.
- [x] Implement engine-level bounded retries for recoverable safe-demo execution errors across supported actions, not only the dedicated retry demonstration.
- [x] Add end-to-end server procedure and export tests that prove authenticated user scoping for sessions, tasks, logs, memory, files, settings, and export output.
- [x] Add procedure-level Vitest tests using authenticated router callers to prove dashboard and export data are scoped to the signed-in user.
- [x] Exercise a non-retry-demo supported action through the routed sandbox flow with a simulated recoverable failure, then verify persisted retry logs and count.
- [x] Add an integration-style routed test that reads back the non-retry recoverable workflow’s persisted retry count and retry logs through dashboard data.

## Stage 1 progress — 15 November 2026

- [x] Record current repository baseline: `45921c9` (`feat: connect telegram user worker to runtime`).
- [x] Inventory current sandbox runtimes: Node.js `v22.23.4`, pnpm `10.4.1`, Python `3.12.3`, Git `2.43.0`.
- [x] Inspect `.env.example` variable names without reading secret values; confirm `.env` and Telegram session files are ignored by Git.
- [x] Run Stage 1 readiness and task-breakdown documentation checks; `git diff --check` passes.
- [x] Disable automatic Telegram replies: server inbound processing no longer queues `send_message`, and the worker no longer allows or executes it; add regression coverage and update worker instructions.
- [x] Re-run `pnpm check`, `pnpm test` (20 tests across 10 files), `pnpm worker:test` (4 tests), and `pnpm build:local` after the local installer changes.
- [x] Confirm local worker target: owner confirmed HP Windows 10 laptop.
- [x] Add PowerShell setup commands to `worker/README.md`; document that the worker does not load `.env` automatically.
- [x] Build the standalone Windows package: local password sign-in, localhost-only binding, SQLite migrations, local file storage, install/start/stop/backup helpers.
- [x] Verify locked installation, TypeScript, 20 Vitest tests, 4 worker tests, and `pnpm build:local`; smoke-test production health/login/database bootstrap in an isolated sandbox directory.
- [ ] If cloud inference is still desired, confirm the OpenCode execution endpoint, FreeLLMAPI gateway/model, and owner-managed secret setup before enabling external model calls; the app DB and files are local.
- [ ] Verify Node.js runtime, installer scripts, Windows ACLs, start/stop, and backup/restore on the HP laptop. The package uses local database/files, so no hosted DB/object-store endpoints are required.
- [ ] Complete reviewed recovery point and deployment/secret-storage runbook before live configuration.
- [ ] Implement server-enforced outbound Telegram approval and pause/stop/suppression checks before any live reply is enabled.
- [ ] Specify runtime configuration/feature gates, then connect and test OpenCode–FreeLLMAPI; complete Telegram setup and Stage 1 acceptance evidence only after the safety gates pass.
- [ ] Complete the server-enforced owner approval, pause/stop, and suppression checks before considering any Telegram outbound flow.

Detailed Stage 1 progress and sequencing: [`docs/stage-1-task-breakdown.md`](docs/stage-1-task-breakdown.md). Current requirement-by-requirement readiness: [`docs/stage-1-readiness.md`](docs/stage-1-readiness.md).
