# PROJECT RYZE Sandbox — TODO

- [x] Define a portable database schema for sandbox configuration, chat sessions, task records, task logs, memory entries, skill XP, file metadata, and provider/integration settings.
- [x] Implement authenticated server procedures that scope every record to the signed-in user and never expose secret setting values to the browser.
- [x] Implement a safe Ryze → Nerd demo engine with a fixed allowlist of supported actions, structured logs, retries, memory learning, and skill XP updates.
- [x] Keep arbitrary shell execution unavailable and keep all external LLM, email, and Telegram operations disabled until explicitly configured.
- [x] Implement secure S3-backed file upload metadata and generated-file records without storing file bytes in the database.
- [x] Build an elegant dark glassmorphic dashboard with a persistent sidebar, session navigation, task composer, active/completed/failed task views, and configuration/status panels.
- [x] Build portable JSON data export and laptop-localization guidance that cover the hosted database model, file manifest, and safe configuration migration.
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
- [ ] Confirm actual deployment target and hosted database/object-storage environment. The versions above are sandbox versions, not a confirmed production/local target.
- [ ] Complete reviewed recovery point and deployment/secret-storage runbook before live configuration.
- [ ] Implement server-enforced outbound Telegram approval and pause/stop/suppression checks before any live reply is enabled.
- [ ] Specify runtime configuration/feature gates, then connect and test OpenCode–FreeLLMAPI; complete Telegram setup and Stage 1 acceptance evidence only after the safety gates pass.

Detailed Stage 1 progress and sequencing: [`docs/stage-1-task-breakdown.md`](docs/stage-1-task-breakdown.md). Current requirement-by-requirement readiness: [`docs/stage-1-readiness.md`](docs/stage-1-readiness.md).
