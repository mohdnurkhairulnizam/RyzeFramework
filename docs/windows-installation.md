# RyzeFramework — Windows installation guide

## What this package does

This is a local-first starter for the HP Windows 10 laptop. The dashboard and SQLite database run on the laptop. Uploaded and generated file bytes are stored in a private local folder. The web server listens only on `127.0.0.1`; it does not open a Windows Firewall port. No Docker or hosted database/object storage is required.

The ZIP contains no owner password, FreeLLMAPI key, Telegram session, or other user credentials. Without gateway settings, the local safe demo is available. OpenCode + FreeLLMAPI text chat can be configured after installation using your actual gateway endpoint and key. Telegram account setup, live replies, and owner approval for outbound actions remain disabled/incomplete.

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

Do not run `Install-Ryze.cmd` over an existing installation; it intentionally refuses to replace the existing `.env`. Instead, run `Stop-Ryze.cmd` from the installed folder and create a fresh backup. Extract the new ZIP to a temporary folder, then double-click `Update-Ryze.cmd` inside that extracted folder. The updater copies application files, installs the locked dependencies, and rebuilds Ryze while preserving the installed `.env`, SQLite database, files, and logs. It refuses to update while a recorded Ryze/OpenCode process is still running. When it finishes, launch `Start-Ryze.cmd` from `%LOCALAPPDATA%\Programs\RyzeFramework`.

## Start, sign in, and stop

Double-click `Start-Ryze.cmd` in the **installed folder**. It starts OpenCode and the Ryze server in the background, waits for their local health checks, and opens `http://127.0.0.1:3777/`. The command window intentionally remains open with startup status or errors; press a key to close the diagnostic window. Closing that window does not stop the background services. Use `Stop-Ryze.cmd` to stop them.

Enter the owner password you set during installation. Keep the address as `127.0.0.1`; do not replace it with the laptop's network IP or expose the port to other devices. Logs are under `%LOCALAPPDATA%\RyzeFramework\logs`.

## Configure OpenCode + FreeLLMAPI text chat

This step requires your own OpenAI-compatible FreeLLMAPI API base URL, model ID, and unified API key. The correct endpoint depends on your FreeLLMAPI account/service; this package does not guess it. For hosted gateways, use the HTTPS API base URL supplied by that service, including its API path (often `/v1`). HTTP is accepted only for a gateway running on this laptop's loopback address.

1. Get the exact API base URL, model ID, and unified key from your FreeLLMAPI provider. Do not paste the key into this chat or a public document.
2. Stop Ryze with `Stop-Ryze.cmd` if it is running.
3. Double-click `Configure-FreeLLMAPI.cmd` in `%LOCALAPPDATA%\Programs\RyzeFramework`.
4. Enter the API base URL and model ID (press Enter to use `auto` if that is a valid model ID for your gateway). Paste the key at the hidden prompt. The helper rejects insecure non-loopback HTTP URLs, URL-embedded credentials, query strings, and fragments.
5. Start Ryze with `Start-Ryze.cmd`, sign in, and check the dashboard status. Both OpenCode and FreeLLMAPI must show connected before AI chat is ready. If the gateway reports connected but a model request fails, verify the exact model ID, provider key, quota, and gateway's OpenAI-compatible API support.

The helper stores the endpoint, model ID, and key in the protected local `.env`; the key is never returned to the dashboard or included in the installer ZIP. Windows account permissions restrict the file, but Ryze does not encrypt it. A gateway health check requests its `/models` endpoint. A chat prompt is sent to the configured gateway and may be handled by that gateway's upstream model provider; review their privacy and retention terms before using sensitive text.

OpenCode's `ryze-chat` agent has global and agent-level deny-all tool permissions. It cannot use shell, edit/read local files, or send Telegram messages. File uploads stay in local storage and are not automatically attached to chat prompts. The integration is text chat only. If a key is configured but either service is offline, chat calls fail clearly; they do not silently fall back to a demo answer. Safe local demo actions remain separate.

## Where data lives

- App database: `%LOCALAPPDATA%\RyzeFramework\data\ryze.sqlite`
- Uploaded/generated file bytes: `%LOCALAPPDATA%\RyzeFramework\files`
- OpenCode chat workspace/config: `%LOCALAPPDATA%\RyzeFramework\opencode-workspace`
- Local configuration and FreeLLMAPI key: `<install folder>\.env`
- Logs: `%LOCALAPPDATA%\RyzeFramework\logs`

These are ordinary local files protected by Windows account permissions; the database/files/config are not encrypted by Ryze itself. Do not commit or email them. Git is for code only, not a backup.

## Back up and restore

Stop Ryze first, then run `Backup-Ryze.cmd` from the installed folder. It writes a ZIP under `Documents\RyzeFramework-backups` containing the SQLite database, files, and protected configuration needed for recovery. The archive may include your FreeLLMAPI key, session-signing secret, and personal task/file data. Keep it private and store an additional copy somewhere safe.

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

The owner has now confirmed successful startup, sign-in, and one model-backed OpenCode/FreeLLMAPI text-chat request on the physical HP laptop. Repeat start/stop, backup/restore, and ACL behavior for newly created files remain to be verified from the laptop. After installation, share any error text here (remove personal paths if you prefer); do not share `.env`, the database, backups, Telegram session files, or passwords.
