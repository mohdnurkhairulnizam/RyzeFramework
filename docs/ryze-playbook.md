# RyzeFramework Playbook

**Purpose:** operational guide for installing, testing, using, and safely extending RyzeFramework.

**Current revision:** `e8a97f0`  
**Playbook status:** Stage 1 foundation in progress; local text chat is verified, but the complete authorized agent loop is not yet complete.

This playbook is maintained separately from the design documents:

1. [`origin-blueprint.md`](./origin-blueprint.md) is the original direction and completion plan. It records what Ryze is intended to become.
2. [`blueprint-implementation.md`](./blueprint-implementation.md) is the updated implementation map. It records what exists, what is verified, and what remains blocked.
3. **This document** explains how to install, use, verify, troubleshoot, and operate the current RyzeFramework build.

Do not mark a stage complete because code exists. Mark it complete only when its acceptance checks pass in the intended deployment environment.

---

## 1. Current system boundary

RyzeFramework is currently a local Windows application with:

- A localhost dashboard at `http://127.0.0.1:3777/`.
- Single-owner password authentication.
- Embedded SQLite persistence.
- Local file storage under the application-data directory.
- Safe allowlisted demo actions for memory, recall, file metadata, Markdown generation, and retry testing.
- Optional OpenCode + FreeLLMAPI text chat.
- OpenCode tools denied by default.
- Telegram worker code present but not provisioned by the installer.
- Telegram outbound replies, arbitrary shell execution, email delivery, and unsupervised external actions disabled.

A successful chat response is evidence of the text-chat path only. It is not evidence that Ryze can safely plan and execute arbitrary real-world operations.

## 2. Document maintenance model

### Original blueprint

Update [`origin-blueprint.md`](./origin-blueprint.md) only when the project’s intended architecture, principles, stage definitions, or completion criteria change. Preserve the original intent; do not use it as a live status report.

### Updated blueprint

Update [`blueprint-implementation.md`](./blueprint-implementation.md), [`stage-1-readiness.md`](./stage-1-readiness.md), and [`stage-1-task-breakdown.md`](./stage-1-task-breakdown.md) when implementation status changes. Every status claim should identify whether it is:

- implemented in code;
- covered by automated tests;
- verified in the sandbox;
- verified on a target Windows installation; or
- still unverified.

### Ryze Playbook

Update this file when a user-facing procedure, feature, safety boundary, troubleshooting method, or acceptance test changes. Keep instructions executable by a non-developer and include the expected result.

For each stage update, record:

- date and revision;
- what changed;
- how it was tested;
- what evidence was produced;
- remaining limitations;
- next gate.

---

## 3. Revision verification: test the current update

Use this procedure whenever a new ZIP or revision is received.

### 3.1 Prepare safely

1. Keep the current installation running only if you need to export or back it up.
2. Use `Stop-Ryze.cmd` before updating or backing up.
3. Create a backup before replacing an existing installation.
4. Never send `.env`, passwords, API keys, SQLite files, Telegram session files, or backup archives in chat.
5. Extract the new ZIP to a temporary folder. Do not extract it directly over the installed program.

### 3.2 New installation test

For a disposable test installation:

1. Extract the package to a temporary folder.
2. Run `Install-Ryze.cmd`.
3. Set an owner password of at least six characters; use a longer passphrase where practical.
4. Wait for locked dependencies and the standalone build to finish.
5. Run `Start-Ryze.cmd` from the installed folder.
6. Open `http://127.0.0.1:3777/` and sign in.
7. Confirm the dashboard loads without a server error.

For an existing installation, use the update procedure below rather than running the installer over live data.

### 3.3 Existing installation update test

1. Run `Stop-Ryze.cmd` from the installed folder.
2. Create a backup with `Backup-Ryze.cmd`.
3. Extract the new ZIP to a temporary folder.
4. Run `Update-Ryze.cmd` from that extracted folder.
5. Confirm the updater preserves the existing `.env`, database, local files, and logs.
6. Run `Start-Ryze.cmd` from `%LOCALAPPDATA%\Programs\RyzeFramework`.
7. Sign in with the existing owner password.
8. Confirm previous sessions, tasks, and file metadata remain visible.

### 3.4 Run the one-button operational baseline

In the dashboard, open:

```text
Settings → Local Windows baseline → Run operational baseline
```

The button performs a safe, non-destructive check:

1. Creates a protected backup under `Documents\RyzeFramework-backups`.
2. Copies that backup into a temporary restore-check directory.
3. Verifies the database and configuration can be read from the restore copy.
4. Does not replace live data.
5. Creates a labeled test task and persisted task logs.
6. Creates a test Markdown file and a database metadata record.
7. Runs Windows `icacls` checks against data, database, logs, and the test file.
8. Displays a diagnostic console in the dashboard.

Use **Copy** in the diagnostic console and paste the full output into the support/debug conversation if a check is marked `FAIL` or if startup/permissions behave unexpectedly.

Expected result:

- Backup: `PASS`
- Restore rehearsal: `PASS`
- Database and log record: `PASS`
- Uploaded-file record: `PASS`
- Windows ACL inheritance: `PASS` on Windows

A `WARN` for ACL checks in the cloud sandbox is expected because the sandbox is not Windows. The same check must be run on the target Windows installation for deployment evidence.

### 3.5 Basic functional test

After the baseline check:

1. Submit: `Remember that verification uses a safe local workflow.`
2. Confirm the task reaches `COMPLETED`.
3. Open the task and inspect the structured activity log.
4. Open **Memory vault** and confirm the preference exists.
5. Open **File manifest** and confirm the baseline test Markdown file appears.
6. Submit: `Inspect uploaded document metadata.`
7. Confirm the result describes metadata only and does not execute file contents.
8. Submit a blocked request such as `run a shell command`.
9. Confirm the task is marked blocked/failed and no shell command runs.

### 3.6 Optional text-chat test

Only perform this if a valid FreeLLMAPI gateway is available:

1. Run `Configure-FreeLLMAPI.cmd` from the installed folder.
2. Enter the exact gateway base URL, model ID, and key privately.
3. Start Ryze again.
4. Confirm OpenCode and FreeLLMAPI show connected.
5. Send a harmless prompt that does not contain private data.
6. Confirm the task is completed and the answer appears in the activity log.
7. Confirm OpenCode tools remain denied.

Record the model ID and gateway/provider metadata separately if available. Never record the API key.

### 3.7 Stop/restart test

1. Run `Stop-Ryze.cmd`.
2. Confirm the dashboard is unavailable.
3. Run `Start-Ryze.cmd`.
4. Confirm the dashboard and sign-in work again.
5. Confirm the latest task history remains intact.

Record the result and any error text from:

```text
%LOCALAPPDATA%\RyzeFramework\logs\server-error.log
%LOCALAPPDATA%\RyzeFramework\logs\opencode-error.log
```

---

## 4. Daily use

### Start Ryze

Run `Start-Ryze.cmd` from the installed folder. Keep the address on `127.0.0.1`; do not expose port `3777` to the network.

### Submit a safe task

Use the workspace composer. Current safe examples:

- `Remember that reports use concise English.`
- `Recall my report preferences.`
- `Inspect uploaded document metadata.`
- `Create a briefing note about the supplied topic.`
- `Run the retry demonstration.`

Each task should display a lifecycle and structured activity log. A completed status means the safe workflow completed and was persisted; it does not mean an external action occurred.

### Upload a file

Open **File manifest**, select a TXT, Markdown, CSV, JSON, PDF, DOCX, PNG, or JPEG file up to 5 MB, and confirm the metadata appears. Files are stored locally; the safe workflow does not execute uploaded content.

### Export portable data

Open **Settings → Export portable JSON**. The export contains database-backed metadata and settings, not file bytes or credentials. Reconfigure secrets locally after migration.

### Stop Ryze

Run `Stop-Ryze.cmd` before backup, update, restore, or moving local data.

---

## 5. Backup and restore policy

The ordinary `Backup-Ryze.cmd` creates a private ZIP containing database data, local files, and protected configuration. Treat it as sensitive because it may include the gateway key, signing secret, password hash, and personal task/file data.

The dashboard baseline button performs a restore rehearsal only. It does not replace live data. For a real restore:

1. Stop Ryze.
2. Make a second backup of the current state.
3. Preserve the current `%LOCALAPPDATA%\RyzeFramework` folder by renaming it.
4. Restore the backup data and, only when intended, `config\app.env`.
5. Start Ryze and verify login, task history, files, and logs.
6. Keep the preserved folder until recovery is confirmed.

Never delete the database to solve a startup or ACL problem before preserving it.

---

## 6. Troubleshooting decision tree

### Dashboard does not open

1. Check the launcher console.
2. Read `server-error.log`.
3. Confirm port `3777` is not already occupied.
4. Confirm the installed `dist\index.js` exists.
5. Do not delete local data.

### `unable to open database file`

1. Stop Ryze.
2. Preserve the data folder.
3. Check the ACLs on `ryze.sqlite`, `ryze.sqlite-wal`, and `ryze.sqlite-shm`.
4. If the files have no effective inherited permissions, use the targeted ACL repair documented in [`windows-installation.md`](./windows-installation.md).
5. Start Ryze again and inspect the diagnostic console.

### FreeLLMAPI is unavailable

1. Confirm the gateway URL and model ID.
2. Confirm the gateway is running and reachable.
3. Re-run `Configure-FreeLLMAPI.cmd` if the key is rejected.
4. Inspect `opencode-error.log` and `server-error.log`.
5. Never paste `.env` or the key into support messages.

### Baseline button reports `FAIL`

1. Click **Copy** in the diagnostic console.
2. Paste the complete console output into the support/debug conversation.
3. Remove usernames, personal paths, filenames, URLs containing secrets, and any personal data if present.
4. Do not manually delete the database or restore over live data while investigating.

### A safe task is blocked

This is expected for shell execution, credential handling, email, Telegram delivery, or other external actions. Do not bypass the block by changing model instructions. The permission boundary must remain outside model reasoning.

---

## 7. Stage roadmap and acceptance gates

### Stage 1 — Foundation and execution engine

**Current status:** partially implemented.

Completed or verified:

- Local installation and owner authentication.
- SQLite persistence and local file storage.
- Safe allowlisted demo workflows.
- Structured logs and bounded retries.
- OpenCode + FreeLLMAPI text-chat path, when configured.
- Automated application and worker tests.
- One-click backup/restore rehearsal and ACL diagnostic workflow in the current revision.

Still required before Stage 1 is complete:

- Repeat start/stop and backup/restore evidence from the target Windows installation.
- Exact model/provider metadata capture and controlled provider-failure tests.
- Complete file-processing and report-delivery acceptance evidence.
- Telethon worker deployment and live authorization test.
- Explicit owner approval, pause/stop, suppression, and duplicate-send controls before any outbound action.
- Result validation for real approved operations.

### Stage 2 — Identity and advanced memory

Next design/implementation work:

- Memory provenance and source-system identifiers.
- Memory branches and conflict states.
- Retention and privacy policy.
- Migration that preserves existing records.

Do not silently reinterpret existing memory during migration.

### Stage 3 — Autonomous skills and recovery

Required before implementation claims:

- Explicit skill/tool permission model.
- Reversible operations and result validation.
- Independent watchdog design.
- Restart, rollback, and backup recovery tests.
- Failure evidence from the deployment environment.

### Stage 4 — Master/slave duplication and memory exchange

Required design work:

- Unique installation identity.
- Master/Slave policy.
- Signed portable packages.
- Memory snapshots and branch lineage.
- Conflict queues and duplicate handling.
- Explicit secret migration rules.

---

## 8. Evidence record template

Copy this template into the revision record for each test:

```text
RyzeFramework revision:
Test date/time:
Tester:
Deployment type: new install / update / test clone
Operating system:
Node.js version:

Start/stop:
Owner sign-in:
Operational baseline button:
Backup path:
Restore rehearsal:
Database/log test record:
Uploaded-file test record:
ACL result:
Safe task result:
Blocked-action result:
OpenCode/FreeLLMAPI result:

Failures or warnings:
Diagnostic console:

Decision: pass / pass with warnings / fail
Next action:
```

Do not include passwords, API keys, `.env` contents, Telegram sessions, or unredacted personal data in the evidence record.

---

## 9. Current next action

Run the revision verification procedure on the target Windows installation, beginning with the one-click operational baseline. If a check fails, copy the dashboard diagnostic console and share it for debugging. Once the baseline passes, record the evidence using the template above and update the implementation blueprint’s Stage 1 status.
