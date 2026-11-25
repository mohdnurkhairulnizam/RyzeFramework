# RyzeFramework Playbook

A simple user manual for installing, starting, using, verifying, and troubleshooting RyzeFramework. This is a living document and will be updated progressively as new features are completed.

**Current revision:** `Telegram file retention and summary skill-gap status`
**Current stage:** Stage 1 remains partial. Telegram file receipt/analysis and returning an existing file are available; the owner reports correct same-chat existing-file return on `d35b770`. The owner reports File Manifest early deletion **PASS on target Windows** (25 November; exact package/checksum not restated). The 30-day expiry policy is implemented, but automatic expiry still needs Windows verification. The latest request to create a new Markdown summary still resends the original and Ryze says it is text-only and cannot create/write files. Defer that benchmark until the Ryze skill/intent capability is solved; backend tests are not live skill acceptance. File deletion does not erase prior backups, task logs, or copies already sent to Telegram.

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
- Optional Telegram worker with protected local configuration, preflight check, sender authorization, and autonomous same-chat replies.
- Bounded private-chat file receipt (5 MiB maximum), requested analysis of small text files, and separate same-chat return of an existing file. New summary-file creation from a natural-language Telegram request is deferred pending Ryze skill/intent capability work.
- Automatic deletion of active uploaded/generated file storage after 30 days, plus an earlier-delete control in File Manifest.
- Telegram replies remain restricted to an authorized sender's original chat; broadcasts, proactive messaging, sales funnels, arbitrary shell execution, and email delivery remain disabled.

A successful chat response is evidence of the text-chat path only. It is not evidence that Ryze can safely plan and execute arbitrary real-world operations.

**Latest evidence:** The owner reports PASS for the target-Windows baseline, Telegram sender/worker controls, backup/restore, acknowledgement-mismatch and provider-failure checks; the latter two remain owner-reported and not independently verified. The owner also reports file receipt, text-only file feedback, and return/opening of the existing file on `d35b770` (**owner-reported PASS**), plus File Manifest early deletion **PASS on target Windows** on 25 November (package revision not restated). The latest request for a new summary still resends the source and produces a text-only refusal; defer that benchmark until Ryze's skill/intent capability is solved. The backend route has sandbox tests, but those do not establish user-facing skill behavior. Automatic 30-day expiry still needs Windows verification. The retained 24 November 18:33 self-test is unchanged and shows its own Gate 1/5/8 `NOT_RUN` and Gate 7 `WARN` results.

## 2. What is available now

The current system provides:

- Local owner sign-in and a localhost dashboard.
- Safe memory, recall, file-metadata, Markdown-note, and retry-demo actions.
- Local SQLite data and local file storage.
- A one-click operational baseline check with a copyable diagnostic console.
- Optional OpenCode + FreeLLMAPI text chat when configured.
- Authorized private-chat file upload up to 5 MiB; analysis is limited to UTF-8 TXT, Markdown, CSV, and JSON up to 64 KiB.
- Explicit same-chat return of a received file. Telegram creation/delivery of a new Markdown summary is not currently accepted as a user-facing capability; defer its benchmark until Ryze can recognize and perform file creation.
- 30-day automatic expiry and earlier deletion of active local files through File Manifest.

The following remain incomplete or disabled: arbitrary shell commands, broadcasts, proactive Telegram messaging, email delivery, unsupervised external actions, general-purpose tool execution, and Telegram creation of new summary attachments. The File Manifest early-delete action has owner-reported target-Windows PASS; automatic 30-day expiry still needs Windows verification. Telegram account control, Telethon login, the dashboard-controlled worker lifecycle, and bounded autonomous same-chat replies are available; persistent service supervision and broader tool execution remain future work.

As the system progresses, this manual will gain new sections for each user-facing feature. Technical status belongs in the updated blueprint, not in this manual.

---

## 3. Revision verification: test the current update

Use this procedure whenever a new ZIP or revision is received.

### 3.1 Prepare safely

1. If the Telegram worker is running, select **Stop worker** in the dashboard. If you started it manually in a terminal, press `Ctrl+C` in that worker terminal.
2. Use `Stop-Ryze.cmd` before updating or backing up. The updater also stops any orphaned Telethon worker process that belongs to this Ryze installation.
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

1. Stop the Telegram worker from the dashboard if it is running.
2. Run `Stop-Ryze.cmd` from the installed folder.
3. Create a backup with `Backup-Ryze.cmd`.
4. Extract the new ZIP to a temporary folder.
5. Run `Update-Ryze.cmd` from that extracted folder.
6. Confirm the updater preserves the existing `.env`, database, local files, and logs.
7. Run `Start-Ryze.cmd` from `%LOCALAPPDATA%\Programs\RyzeFramework` and sign in with the existing owner password.
8. Confirm previous sessions, tasks, and file metadata remain visible. Then explicitly start Telegram receiving from the dashboard.

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

For a backup without the test task, test file, restore rehearsal, or ACL diagnostic steps, use **Create private backup** in the same Windows computer baseline panel. It creates a protected backup under `Documents\RyzeFramework-backups` and displays the backup path. Treat the backup as sensitive because it may contain configuration secrets and personal data.

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

### 3.7 Stage 1 acceptance self-test

On the installed local build, open **Settings → Stage 1 acceptance self-test** and select **Run Stage 1 self-test**. Select **Copy** on the report and keep the complete text for review. The report does not include API keys, recovery codes, session files, or Telegram message contents.

The report performs safe local checks for the configured provider/runtime values, the server-side safe-action boundary, worker prerequisites, file types and the 5 MB size limit, and current OpenCode/FreeLLMAPI status. It does not send a Telegram message, enter a login code, change worker state, or call a model prompt.

Interpret the results as follows:

- `PASS`: the local check succeeded.
- `WARN`: the installation or evidence is incomplete; follow the detail in the report.
- `NOT_RUN`: this requires a real test on the target Windows computer, usually through the Telegram wizard or a controlled provider/file test.
- `FAIL`: stop the acceptance process and send the report without adding secrets.

The self-test is an evidence assistant, not a Stage 1 completion switch. Stage 1 is operational only after the target-Windows Telegram, worker restart/recovery, provider failure, file delivery, logging, redaction, retention, and rollback tests are separately completed and recorded.

### 3.8 Optional Telegram setup and same-chat reply test

This stage uses the private RyzeTel bridge pattern for local secret handling and worker lifecycle. It permits autonomous replies only in the exact originating chat of an authorized sender; it does not permit broadcasts or proactive messages.

1. Start Ryze with `Start-Ryze.cmd` and sign in.
2. Open **Settings → Telegram account bridge**.
3. Enter the Telegram API ID, API hash, and phone number in the **Connection wizard**, then select **Prepare Telegram**. These values are written only to the protected local worker folder.
4. Select **Start login**. Enter the Telegram phone code in the dashboard. If Telegram requests two-step verification, enter that password in the dashboard. The fields are cleared after submission.
5. After the phase changes to `authorized`, select **Start receiving**.
6. Send a harmless test message from the permanent admin Telegram identity, such as `what is the time now`. Confirm that Ryze records the task, routes it through OpenCode + FreeLLMAPI, and replies in the same Telegram chat.
7. From another Telegram account, send an ordinary message and confirm it is ignored. Then send only the exact permanent or one-time recovery code. Confirm that this sender is temporarily authorized for one hour and that a subsequent harmless message is recorded.
8. Use **Pause**, **Resume**, and **Stop worker** from the dashboard. Do not register a Windows scheduled task yet.

**Target-Windows verification record — 24 November 2026:** The owner reported success through Telegram login code, authorized worker startup, permanent-admin inbound handling, unauthorized-sender ignoring, recovery-code temporary authorization, dashboard pause/resume/stop controls, an authorized Telegram prompt routed through the OpenCode workspace with a reply returned to the same chat, and the real one-hour recovery-code expiry observation. Still test acknowledgement mismatch, controlled provider failure, physical restore/rollback, and report/file delivery.

If the dashboard wizard is unavailable in an older package, use the policy-safe `Configure-TelegramWorker.cmd` and `Start-TelegramWorker.cmd` launchers described above. The dashboard wizard is the intended setup path for this revision.

There is no approved-chat or group allowlist in this design. Authorization is based only on the sender: the permanent admin identity is accepted by default, and another sender is accepted for one hour after sending the exact recovery code. All other senders are ignored.

### 3.9.1 Remaining Stage 1 evidence

Run these checks in order on the installed Windows computer. Do not send or paste `.env`, API keys, worker tokens, login codes, recovery codes, session files, or backup archives.

**Provider and acknowledgement evidence:** The owner now reports Telegram acknowledgement-mismatch and provider-failure checks as PASS. Record these as **owner-reported PASS, not independently verified in this workspace**; do not change the retained self-test report to retroactively replace its `NOT_RUN` results. The separate dashboard provider-fault self-test simulates timeout, rate limit, refusal, and malformed response locally and does not contact a provider. Do not alter the live `.env` to force a failure. If further live testing is needed, use a separate test copy and a controlled mock gateway.

**Physical backup and restore:** Stop Ryze, select **Create private backup**, and note only the displayed backup name. Confirm the backup manifest reports the database/configuration and, when Telegram is configured, worker configuration/session entries. Select that backup and choose **Restore selected backup**. Start Ryze once so the managed launcher applies the restore. Confirm owner login, one previous task, one file entry, Telegram account status, and worker authorization. Do not delete the pre-restore folder until these checks pass. If anything fails, stop Ryze and restore the preserved `Ryze-pre-restore-*` copy through the same controlled process.

**Receipt/reply retest:** The owner reports file receipt with and without accompanying text, text-only file feedback, and correct opening of the returned existing file as PASS on package `d35b770` (owner-reported). The owner also reports File Manifest early deletion PASS on target Windows (25 November; exact package revision not restated). Automatic 30-day expiry still needs Windows testing. The new-summary attachment benchmark is deferred until the Ryze file-creation skill/intent gap is solved. If plain text or file receipt regresses, retain sanitized logs and report the exact package revision; do not treat the historical `99112b4` failure as current evidence.

**New-summary Telegram benchmark — DEFERRED:** In the owner's latest test, `make a short Markdown summary of README.md and send the summary as a file` returned `[README.md]` again; when asked whether it can create a new file, Ryze said it is text-only and cannot write/save files. The owner has directed that this benchmark wait until the system's skill/intent limitation is solved. Do not treat backend integration tests as evidence that Ryze understands the request or can create/send the artifact. After the prerequisite is implemented, ask for a new Markdown summary attachment, verify it differs from and summarizes the source, then separately ask `Send me the latest file back` to confirm the original-file path still works.

**Final self-test:** Open **Settings → Stage 1 acceptance self-test → Run Stage 1 self-test**, select **Copy**, and paste the complete non-secret report into the project review. The expected report should show runtime schema `v1`, an explicit model selector such as `auto`, a PASS for the structured safe-action boundary, and no secret values. A `NOT_RUN` or `WARN` for provider fault injection, physical restore, or file delivery must remain documented rather than being treated as a PASS.

The `.cmd` launchers use a process-only PowerShell execution-policy bypass. They do not change the computer's permanent PowerShell execution policy. The underlying `.ps1` files remain available for advanced users.

If an older installation reports `RYZE_WORKER_TOKEN is missing`, install this revision with `Update-Ryze.cmd`. The updater adds one new random local worker token to the existing `.env` while preserving the owner password, FreeLLMAPI settings, database, files, and logs. The configuration helper also repairs a missing token if needed; restart Ryze before running the worker check so the server loads it.

The worker session and `worker.env` are stored below `%LOCALAPPDATA%\RyzeFramework\telegram-worker` and protected for the current Windows user. Never include that folder, the session file, `worker.env`, API hash, phone code, or two-step password in a support message.

### 3.9 Telegram account controls in Settings

Open **Settings → Telegram account bridge** on the local dashboard. The panel supports one active account record at a time. **Add account** creates the record; **Replace / save account** updates it; and **Remove account** marks it removed from Ryze control. The account record is separate from the protected Telethon session and does not by itself claim that Telegram login has completed.

Set the permanent admin Telegram user ID in the same panel. Ryze accepts messages from that ID by default and ignores other sender IDs. Save a permanent recovery code for remote recovery, or use **Generate one-time code** when another specific sender needs temporary access. The sender must send only the exact code as the Telegram message; no `RYZE-AUTH` prefix is required. The one-time code is shown only on the local dashboard and expires after 15 minutes. When that sender sends it to the connected account, that sender is accepted for one hour, then the permanent admin-only rule returns. Incoming, ignored, authorization, queued, sent, and failed events appear in the local Telegram channel log. Authorized safe-analysis prompts can receive autonomous replies in the same originating chat; no manual approval is required.

The Connection wizard in this revision performs the local Telethon environment setup, login-code entry, optional two-step-password entry, worker start, pause, resume, stop, and protected session removal from the dashboard. Telegram API credentials and login values remain local and are not displayed in the audit log. The wizard enables inbound handling and bounded same-chat replies. If a reply fails, the Telegram channel log records a sanitized failure reason for diagnosis; do not paste credentials, session files, or backup contents into support chat.

### Telegram private-chat file workflow

Only send files to the connected Ryze account in an authorized **private chat**. Receipt is limited to 5 MiB and these types: TXT, Markdown, CSV, JSON, PDF, DOCX, PNG, and JPEG. If the message has a caption such as `Summarize this attached Markdown file`, Ryze can handle the request with that file. Otherwise, after Ryze confirms receipt, send a follow-up such as `Summarize the attached file` in the same chat within 24 hours. For content analysis, only UTF-8 TXT/Markdown/CSV/JSON files up to 64 KiB are supported. Other allowed files may be stored and returned but are not parsed for meaning.

When you request analysis, the file content is passed to the configured model provider for that request. Ryze treats it as untrusted data and does not enable OpenCode tools. File content itself is excluded from task logs, but the Telegram prompt and the model's answer may be retained in local activity/task records.

To return the latest eligible file from that same authorized private chat, ask `Send me the latest file back`. This existing-file resend is a separate behavior and has been reported successful by the owner on package `d35b770`. Do not currently rely on a natural-language Telegram request to create a new Markdown summary: the owner reports Ryze resends the source and says it cannot create files. The summary-as-file benchmark is deferred until Ryze's file-creation skill/intent capability is addressed. No group, different-chat, or arbitrary-path delivery is allowed.

**File retention and earlier deletion:** The selected policy is automatic expiry 30 days after each uploaded or generated file is created. Expired files are blocked from access at the cutoff and removed from active local storage during the startup/hourly cleanup sweep. The owner reports the earlier File Manifest delete action **PASS on target Windows** (25 November; exact package revision not restated). Automatic expiry still needs its own Windows test. This applies only to active local file bytes and metadata: it does not erase prior Ryze backups, task logs (which may retain prompts and model answers), or copies already delivered to Telegram. The 24-hour limit is an analysis lookup window, not the retention period. Private backups may include file bytes and must be protected; deleting a file does not update old backups.

Gmail is planned as a separate OAuth setup panel. The Gmail account will be authorized through Google consent rather than by storing a Gmail password. Drive and Photos access will be optional scopes and will not be enabled merely because Gmail is connected.

### 3.10 Stop/restart test

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

This is expected for shell execution, credential handling, email, broadcasts, proactive messaging, or other unsupported external actions. A Telegram reply is allowed only for an authorized sender's exact originating chat. Do not bypass a block by changing model instructions.

---

## 7. Features not available yet

The following are not available in this revision:

- Sending Telegram messages to a different chat, a group, or a broadcast list.
- Proactive Telegram messages, sales funnels, or auto-prospecting.
- Email sending or Gmail connection.
- Google Drive or Google Photos connection.
- Arbitrary shell commands or unrestricted computer control.
- New-summary Telegram attachment from a natural-language request (deferred pending Ryze skill/intent capability work) and target-Windows-verified automatic 30-day expiry (implementation exists; owner has separately verified earlier File Manifest deletion).
- Automatic Windows background supervision after a computer restart.

When these capabilities are added, their setup and test instructions will be added here. Do not enable an unfinished capability by editing configuration files or model instructions.

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

### Dashboard restore and Telegram recovery

In **Settings**, create a private backup or select an existing backup under `Documents\RyzeFramework-backups`, then choose **Restore selected backup**. Ryze asks for confirmation and queues the restore; it is not applied while the dashboard is running. Stop Ryze and start it again. Before replacement, Ryze preserves the current database, files, `.env`, and Telegram worker configuration/session in a protected `Ryze-pre-restore-*` folder.

New Ryze backups include the Telegram worker's `worker.env` and Telethon session files, but not the worker virtual environment. Restoring a backup therefore restores the Telegram configuration and logged-in session without replacing `.venv`. Keep these backups private: they can contain credentials, hashes, personal data, and a Telegram login session. Never send a backup archive, `worker.env`, or session file in chat. Older backups may not contain Telegram files; in that case the existing Telegram session is left unchanged and the worker may need **Prepare Telegram** and login again.

### Telegram receives a message but does not reply

Ryze replies only when all of these conditions are true: the sender is the permanent admin or has a current one-hour authorization; the message is text; the worker is running and not paused; OpenCode and FreeLLMAPI are available; and the reply is sent to the same originating chat. Check the Telegram channel log for `ignored`, `queued`, `sent`, or `send-failed` entries.

If the worker is paused, select **Resume** and send a new test message. If the worker was stopped, select **Start receiving**. If the sender was temporarily authorized, the authorization ends after one hour and the sender must use the recovery-code process again. If the log shows `send-failed`, copy only the non-secret diagnostic text; never copy `worker.env`, login codes, recovery codes, session files, or backup contents.

## Provider fault self-test

In **Settings**, select **Run provider fault self-test**. Ryze locally simulates timeout, HTTP 429/rate-limit, provider refusal, and malformed-response cases. Use **Copy** to copy the report for support. This check does not contact FreeLLMAPI, read API keys, change `.env`, send Telegram messages, or prove live-provider behavior.
