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
