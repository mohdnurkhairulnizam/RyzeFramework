# RyzeFramework — Windows installation guide

## What this package does

This is a local-first starter for the target Windows computer. The dashboard and SQLite database run on the computer. Uploaded and generated file bytes are stored in a private local folder. The web server listens only on `127.0.0.1`; it does not open a Windows Firewall port. No Docker or hosted database/object storage is required.

The ZIP contains no owner password, FreeLLMAPI key, Telegram session, or other user credentials. Without gateway settings, the local safe demo is available. OpenCode + FreeLLMAPI text chat can be configured after installation using your actual gateway endpoint and key. Telegram is optional and uses the owner-authorized Telethon user account. This branch supports authorized private-chat text/file receipt, requested analysis of small UTF-8 TXT/Markdown/CSV/JSON attachments, same-chat text replies, and explicitly requested source-bound file return. The owner first reports that the `99112b4` package did not detect, log, or receive a file (**FAIL**), then reports file receipt works with or without accompanying text and a receipt reply was returned (**owner-reported PASS; tested package version unknown**). The owner also reports the same-chat file-sending test successful (**owner-reported PASS; tested build unknown**). Plain-text-only messages remain undetected (**FAIL, owner-reported**). Code review found the previous stable worker omitted the `isPrivate` field newly required by the server; the updated API accepts that legacy payload only when chat ID equals sender ID, and workspace regression tests pass. The server-side file-send/download/ack integration test also passes. Recheck text ingress and file sending on the corrected package; groups, broadcasts, and cross-chat delivery are unsupported.

## Before installing

Use 64-bit Windows 10 or newer. Install Node.js 22 or 24 LTS if needed; the installer downloads locked application dependencies from the internet. The optional Python/Telethon worker is not installed or authorized by this dashboard installer. Keep Windows updated and use a Windows account password; enable BitLocker if you want disk encryption for local data.

## Install

1. Extract the ZIP to a temporary folder such as Downloads. Do not extract it into the final installation directory.
2. Double-click `Install-Ryze.cmd`. If Windows asks for permission, allow the script to run for your user account; it does not require administrator rights or change the machine-wide execution policy.
3. Enter the same owner password twice. Use at least 6 characters. The password is not saved in plain text; the installer stores a salted hash and random session-signing secret in local configuration. A six-digit numeric PIN is much easier to guess; use a longer mixed passphrase if practical.
4. The installer copies the program to `%LOCALAPPDATA%\Programs\RyzeFramework`, installs locked dependencies, loads and verifies the SQLite prebuilt bundled with its dependency, builds the local version, and restricts access to the local config/data folders to your Windows account. It may take several minutes and requires internet access. Visual Studio or C++ Build Tools should not be required.

If Node.js is missing or unsupported, install Node.js 22 or 24 LTS from the official Node.js website and run the installer again. Do not send your owner password or any future API keys in chat.

## Fresh test reinstall (destructive)

Use this only when you intentionally want to erase all Ryze test settings and local data. Stop Ryze first. In File Explorer, delete only these two Ryze folders: `%LOCALAPPDATA%\Programs\RyzeFramework` (installed application and `.env` configuration) and `%LOCALAPPDATA%\RyzeFramework` (SQLite database, files, OpenCode workspace, and logs). This permanently removes the local owner-password hash, any configured gateway key, and all Ryze data. Do not delete the extracted installer folder or unrelated files. Then run `Install-Ryze.cmd` from the extracted installer folder and create a new owner password.

## Update an existing installation

Do not run `Install-Ryze.cmd` over an existing installation; it intentionally refuses to replace the existing `.env`. If the Telegram worker is running, use **Stop worker** in the dashboard first. Then run `Stop-Ryze.cmd` from the installed folder and create a fresh backup. Extract the new ZIP to a temporary folder, then double-click `Update-Ryze.cmd` inside that extracted folder. The updater stops any orphaned Telegram worker whose command line points to this Ryze installation, copies application files, installs the locked dependencies, and rebuilds Ryze while preserving the installed `.env`, SQLite database, files, and logs. It refuses to update while a recorded Ryze/OpenCode process is still running. When it finishes, launch `Start-Ryze.cmd` from `%LOCALAPPDATA%\Programs\RyzeFramework`, sign in, then explicitly start the Telegram worker again from the dashboard.

## Start, sign in, and stop

Double-click `Start-Ryze.cmd` in the **installed folder**. It starts OpenCode and the Ryze server in the background, waits for their local health checks, and opens `http://127.0.0.1:3777/`. The command window intentionally remains open with startup status or errors; press a key to close the diagnostic window. Closing that window does not stop the background services. Use `Stop-Ryze.cmd` to stop them.

Enter the owner password you set during installation. Keep the address as `127.0.0.1`; do not replace it with the computer's network IP or expose the port to other devices. Logs are under `%LOCALAPPDATA%\RyzeFramework\logs`.

For the synthetic Stage 2 preflight and its separate target-Windows acceptance work, follow the [Stage 2 One-Click Preflight guide](./stage2-one-click-test.md). Restore validation, corruption rejection, and rollback drills must use the [Disposable Windows Restore-Safety Test](./stage2-restore-safety-test.md) in a separate disposable profile; never use your only working Ryze installation for those exercises.

## Configure OpenCode + FreeLLMAPI text chat

This step requires your own OpenAI-compatible FreeLLMAPI API base URL, model ID, and unified API key. The correct endpoint depends on your FreeLLMAPI account/service; this package does not guess it. For hosted gateways, use the HTTPS API base URL supplied by that service, including its API path (often `/v1`). HTTP is accepted only for a gateway running on this computer's loopback address.

1. Get the exact API base URL, model ID, and unified key from your FreeLLMAPI provider. Do not paste the key into this chat or a public document.
2. Stop Ryze with `Stop-Ryze.cmd` if it is running.
3. Double-click `Configure-FreeLLMAPI.cmd` in `%LOCALAPPDATA%\Programs\RyzeFramework`.
4. Enter the API base URL and model ID (press Enter to use `auto` if that is a valid model ID for your gateway). Paste the key at the hidden prompt. The helper rejects insecure non-loopback HTTP URLs, URL-embedded credentials, query strings, and fragments.
5. Start Ryze with `Start-Ryze.cmd`, sign in, and check the dashboard status. Both OpenCode and FreeLLMAPI must show connected before AI chat is ready. If the gateway reports connected but a model request fails, verify the exact model ID, provider key, quota, and gateway's OpenAI-compatible API support.

The helper stores the endpoint, model ID, and key in the protected local `.env`; the key is never returned to the dashboard or included in the installer ZIP. Windows account permissions restrict the file, but Ryze does not encrypt it. A gateway health check requests its `/models` endpoint. A chat prompt is sent to the configured gateway and may be handled by that gateway's upstream model provider; review their privacy and retention terms before using sensitive text.

## Configure the staged Telegram worker

The optional staged Telegram worker is started from the installed Ryze folder. Use `Configure-TelegramWorker.cmd` to enter Telegram API details privately, then use `Start-TelegramWorker.cmd check`, `Start-TelegramWorker.cmd login`, and `Start-TelegramWorker.cmd run`. These command files invoke the PowerShell helpers with a process-only execution-policy bypass; they do not change the computer's permanent PowerShell policy. The worker processes private chats only. For this file-transfer test, send a small allowed file from the authorized account, then separately request `Send me the latest file back`; confirm receipt, contents, and return to the same chat. Keep the worker window open during the test. Telegram session files and `worker.env` remain under `%LOCALAPPDATA%\RyzeFramework\telegram-worker` and must never be sent in chat or included in an export. See the [playbook's Stage 1 evidence steps](./ryze-playbook.md#391-remaining-stage-1-evidence) for safe test boundaries.

OpenCode's `ryze-chat` agent has global and agent-level deny-all tool permissions. It cannot use shell, edit/read arbitrary local files, or send Telegram messages. A received Markdown/text file is analyzed only when the authorized user asks, within the 64 KiB UTF-8 TXT/Markdown/CSV/JSON limit; its content is sent to the configured model provider for that requested analysis. A 24-hour file lookup window is not deletion: stored uploads persist, and automatic expiry or an in-dashboard delete control is not implemented. Same-chat file return is restricted to the originating authorized private chat. If a key is configured but either service is offline, chat calls fail clearly; they do not silently fall back to a demo answer. Safe local demo actions remain separate.

## Where data lives

- App database: `%LOCALAPPDATA%\RyzeFramework\data\ryze.sqlite`
- Uploaded/generated file bytes: `%LOCALAPPDATA%\RyzeFramework\files`
- OpenCode chat workspace/config: `%LOCALAPPDATA%\RyzeFramework\opencode-workspace`
- Local configuration and FreeLLMAPI key: `<install folder>\.env`
- Logs: `%LOCALAPPDATA%\RyzeFramework\logs`

These are ordinary local files protected by Windows account permissions; the database/files/config are not encrypted by Ryze itself. Do not commit or email them. Git is for code only, not a backup.

## Back up and restore

Stop Ryze first, then run `Backup-Ryze.cmd` from the installed folder, or use **Settings → Local Windows baseline → Create private backup** in the dashboard. The dashboard button writes a protected backup folder under `Documents\RyzeFramework-backups` containing the SQLite database, files, and protected configuration needed for recovery. The archive may include your FreeLLMAPI key, session-signing secret, and personal task/file data. Keep it private and store an additional copy somewhere safe.

To restore, stop Ryze and preserve the current `%LOCALAPPDATA%\RyzeFramework` folder first. Extract the backup and restore its `data` folder to that location; restore `config\app.env` to the installed program's `.env` only if you intend to restore that account/configuration and gateway key too. Never overwrite newer data without first making a separate backup.

## Troubleshooting

- If Ryze does not start, the double-click window remains open and shows the PowerShell error. Also check `%LOCALAPPDATA%\RyzeFramework\logs\server-error.log` and `opencode-error.log`.
- If startup reports `unable to open database file`, first stop Ryze. If the database folder is writable but `icacls` shows no permissions on the existing SQLite files, reset only their ACLs (this does not change file contents):

  ```powershell
  $dbPath = Join-Path $env:LOCALAPPDATA 'RyzeFramework\data\ryze.sqlite'
  foreach ($file in @($dbPath, "$dbPath-wal", "$dbPath-shm")) {
    if (Test-Path -LiteralPath $file) { icacls $file /reset }
  }
  ```

  Then start Ryze again. Do not delete the database, WAL, or SHM files to address an access-control error.
- If the dashboard opens but FreeLLMAPI is “Not reachable,” check the URL, internet connection, and whether the gateway is running. If it is “Key rejected,” stop Ryze and run `Configure-FreeLLMAPI.cmd` again.
- If both services show connected but a chat fails, verify the exact model ID, key permissions/quota, and that the endpoint implements the compatible chat API. Check `opencode-error.log` and `server-error.log`; do not share the `.env` or key.
- If port 3777 is occupied, stop the other program or ask for help before changing configuration. Do not delete the database to fix an integration issue.
- If startup reports a migration error, stop and keep the data folder intact rather than deleting it.
- If PowerShell says that `Configure-TelegramWorker.ps1` or `Start-TelegramWorker.ps1` cannot be loaded because script execution is disabled, do not change the permanent execution policy. Use `Configure-TelegramWorker.cmd` and `Start-TelegramWorker.cmd` from the installed Ryze folder instead. They apply the bypass only to that individual Ryze process.

### Confirmed ACL incident and fresh installation recovery

On 22 November 2026, repeated `EPERM` errors first affected `opencode-workspace\opencode.json` and then `logs\server-error.log`. Inspection showed the affected existing files had an owner but an empty protected DACL (`AccessToString` was blank and `AreAccessRulesProtected` was `True`). The parent directory ACL looked correct, and a newly created probe file received inherited access. This confirmed stale file-level Windows security descriptors in the existing `%LOCALAPPDATA%\RyzeFramework` tree, not a problem with the JSON contents, the operational baseline feature, or the stable startup scripts.

For a deliberate fresh installation after preserving any needed backup, stop Ryze and remove only these folders:

```text
%LOCALAPPDATA%\Programs\RyzeFramework
%LOCALAPPDATA%\RyzeFramework
```

Extract a fresh installer and run `Install-Ryze.cmd`. Do not restore the old `logs` or `opencode-workspace` directories into the new installation. Future update packages must retain the stable startup path and must not apply a file-level ACL that is protected with no allow entry.

The owner has now confirmed successful startup, sign-in, and one model-backed OpenCode/FreeLLMAPI text-chat request on the physical target Windows computer. Repeat start/stop, backup/restore, and ACL behavior for newly created files remain to be verified from the computer. After installation, share any error text here (remove personal paths if you prefer); do not share `.env`, the database, backups, Telegram session files, or passwords.

## Dashboard restore

The installed dashboard Settings page lists protected backups found under `%USERPROFILE%\Documents\RyzeFramework-backups`. Select a backup and press **Restore selected backup**, then confirm. Ryze queues the request and applies it on the next normal start, after preserving the current database, files, `.env`, and Telegram worker configuration/session in a protected `Ryze-pre-restore-*` backup. The worker `.venv` is not replaced. Do not delete the preserved copy until the restored dashboard and Telegram inbound checks are verified.

The private backup format includes `telegram\worker.env` and the Telethon `telegram\data\ryze-user.session` files when present. These are sensitive login material and must not be uploaded or pasted into support chat. Backups made before this capability was added may not include them.
