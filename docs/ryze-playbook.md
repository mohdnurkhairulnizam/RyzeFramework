# RyzeFramework Playbook

A simple user manual for installing, starting, using, verifying, and troubleshooting RyzeFramework. This is a living document and will be updated progressively as new features are completed.

**Current revision:** `Telegram staged worker setup`
**Current stage:** Stage 1 foundation; Telegram inbound-only deployment is staged for target-Windows testing.

Use the three project documents this way:

- [`origin-blueprint.md`](./origin-blueprint.md): the original project direction and completion plan.
- [`blueprint-implementation.md`](./blueprint-implementation.md): the updated technical status and implementation details.
- **This playbook:** the practical manual for using the current RyzeFramework system.

The playbook describes only the capabilities that are available or explicitly marked as incomplete.

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
- Optional Telegram inbound-only worker setup with a protected local worker environment and preflight check.
- Telegram outbound replies, arbitrary shell execution, email delivery, and unsupervised external actions disabled.

A successful chat response is evidence of the text-chat path only. It is not evidence that Ryze can safely plan and execute arbitrary real-world operations.

**Latest verification:** On 23 November 2026, the target Windows installation passed the one-button operational baseline. Backup creation, restore rehearsal, database/log records, uploaded-file record, and Windows ACL checks all returned `PASS`. Stop/start restart behavior was also reported good. This verifies the local baseline and restart path; it does not complete the broader Stage 1 integration and safety requirements.

## 2. What is available now

The current system provides:

- Local owner sign-in and a localhost dashboard.
- Safe memory, recall, file-metadata, Markdown-note, and retry-demo actions.
- Local SQLite data and local file storage.
- A one-click operational baseline check with a copyable diagnostic console.
- Optional OpenCode + FreeLLMAPI text chat when configured.

The following remain incomplete or disabled: arbitrary shell commands, Telegram outbound replies, email delivery, unsupervised external actions, and general-purpose tool execution. Telegram account control is available in the local Settings panel, but Telethon login and persistent worker lifecycle remain staged until the dashboard process bridge is completed.

As the system progresses, this manual will gain new sections for each user-facing feature. Technical status belongs in the updated blueprint, not in this manual.

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

### 3.7 Optional Telegram setup and inbound-only test

This stage uses the private RyzeTel bridge pattern for local secret handling and worker lifecycle, but it does not enable outbound Telegram replies.

1. Start Ryze with `Start-Ryze.cmd` and sign in.
2. Open **Settings → Telegram account bridge**.
3. Enter the Telegram API ID, API hash, and phone number in the **Connection wizard**, then select **Prepare Telegram**. These values are written only to the protected local worker folder.
4. Select **Start login**. Enter the Telegram phone code in the dashboard. If Telegram requests two-step verification, enter that password in the dashboard. The fields are cleared after submission.
5. After the phase changes to `authorized`, select **Start receiving**.
6. Send a harmless test message from the permanent admin Telegram identity. Confirm that Ryze records an inbound task or activity event. Direct replies remain disabled in this staged release.
7. From another Telegram account, send only the exact permanent or one-time recovery code. Confirm that this sender is temporarily authorized for one hour. Other senders remain ignored.
8. Use **Pause**, **Resume**, and **Stop worker** from the dashboard. Do not register a Windows scheduled task yet.

If the dashboard wizard is unavailable in an older package, use the policy-safe `Configure-TelegramWorker.cmd` and `Start-TelegramWorker.cmd` launchers described above. The dashboard wizard is the intended setup path for this revision.

There is no approved-chat or group allowlist in this design. Authorization is based only on the sender: the permanent admin identity is accepted by default, and another sender is accepted for one hour after sending the exact recovery code. All other senders are ignored.

The `.cmd` launchers use a process-only PowerShell execution-policy bypass. They do not change the computer's permanent PowerShell execution policy. The underlying `.ps1` files remain available for advanced users.

If an older installation reports `RYZE_WORKER_TOKEN is missing`, install this revision with `Update-Ryze.cmd`. The updater adds one new random local worker token to the existing `.env` while preserving the owner password, FreeLLMAPI settings, database, files, and logs. The configuration helper also repairs a missing token if needed; restart Ryze before running the worker check so the server loads it.

The worker session and `worker.env` are stored below `%LOCALAPPDATA%\RyzeFramework\telegram-worker` and protected for the current Windows user. Never include that folder, the session file, `worker.env`, API hash, phone code, or two-step password in a support message.

### 3.8 Telegram account controls in Settings

Open **Settings → Telegram account bridge** on the local dashboard. The panel supports one active account record at a time. **Add account** creates the record; **Replace / save account** updates it; and **Remove account** marks it removed from Ryze control. The account record is separate from the protected Telethon session and does not by itself claim that Telegram login has completed.

Set the permanent admin Telegram user ID in the same panel. Ryze accepts messages from that ID by default and ignores other sender IDs. Save a permanent recovery code for remote recovery, or use **Generate one-time code** when another specific sender needs temporary access. The sender must send only the exact code as the Telegram message; no `RYZE-AUTH` prefix is required. The one-time code is shown only on the local dashboard and expires after 15 minutes. When that sender sends it to the connected account, that sender is accepted for one hour, then the permanent admin-only rule returns. Incoming, ignored, authorization, and system events appear in the local Telegram channel log. Outbound replies remain disabled.

The Connection wizard in this revision performs the local Telethon environment setup, login-code entry, optional two-step-password entry, worker start, pause, resume, stop, and protected session removal from the dashboard. Telegram API credentials and login values remain local and are not displayed in the audit log. The wizard currently enables inbound-only testing; direct same-chat replies remain disabled until the outbound safety gate and end-to-end acceptance tests pass.

Gmail is planned as a separate OAuth setup panel. The Gmail account will be authorized through Google consent rather than by storing a Gmail password. Drive and Photos access will be optional scopes and will not be enabled merely because Gmail is connected.

### 3.9 Stop/restart test

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

### Repeated `EPERM` or access denied across Ryze files

The confirmed Windows root cause for the November 2026 incident was not the operational baseline feature or the OpenCode JSON contents. Existing files under `%LOCALAPPDATA%\RyzeFramework` had protected, empty file-level ACLs, including `opencode.json` and the Ryze log files. The parent folders looked writable, but individual files could not be read, renamed, or updated. A newly created probe file received normal inherited access, confirming that the stale data tree—not the new installer code—was corrupted.

If ACL reset repairs one file but another existing Ryze file immediately fails, stop troubleshooting the old data tree. First make or preserve a private backup if possible. For a deliberate fresh test installation, remove only these two folders after stopping Ryze:

```text
%LOCALAPPDATA%\Programs\RyzeFramework
%LOCALAPPDATA%\RyzeFramework
```

Then run `Install-Ryze.cmd` from a newly extracted installer. Do not copy the old `data`, `logs`, or `opencode-workspace` folder into the fresh installation. Future upgrades must preserve the stable startup scripts and must not reintroduce a protected empty ACL on existing files.

### `EPERM` when selecting **Prepare Telegram**

If the dashboard reports an error opening `worker.env`, or Python reports a permission error for a path such as:

```text
%LOCALAPPDATA%\RyzeFramework\telegram-worker\worker.env
C:\Users\User\AppData\Local\RyzeFramework\telegram-worker\.venv\.gitignore
```

the existing worker folder or one of its files may have a stale file-level ACL. This is the same Windows failure pattern previously seen with `opencode.json` and Ryze log files. Select **Prepare Telegram** again in the dashboard. The current revision automatically resets ACLs recursively across the existing Telegram worker tree before writing the configuration or creating/updating the Python environment. It preserves the worker configuration, virtual-environment contents, and Telegram session; it does not delete or replace the account session.

If the retry still fails, stop Ryze, run the one-button operational baseline, and preserve the diagnostic console output. Do not paste `worker.env`, Telegram API credentials, login codes, recovery codes, session files, or other secrets into support messages.

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

## 7. Current limitations and future updates

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

## 8. Optional test notes

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

## 9. Updating this manual

When a feature is completed and verified, add or update its simple user instructions here. Keep the wording practical: what the user clicks or runs, what should happen, and what to do if it fails. Update the revision number at the top when the manual changes.
