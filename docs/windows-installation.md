# RyzeFramework — Windows installation guide

## What this package does

This is a local starter for the HP Windows 10 laptop. The dashboard and the SQLite database run on the laptop. Uploaded and generated files are saved in a private local folder. The web server listens only on `127.0.0.1` and does not open a Windows Firewall port. No Docker or cloud database is required.

This package does **not** include any passwords, Telegram session, or provider API key. It does not connect OpenCode or FreeLLMAPI and it does not send Telegram replies. AI-provider and live Telegram capabilities remain off until configured and tested separately; the safe demo is the only task executor currently included.

## Before installing

Use 64-bit Windows 10 or newer. Install Node.js 22 or 24 LTS if it is not already installed; the installer downloads the application's pinned dependencies from the internet. The optional Python/Telethon worker is not installed or authorized by this dashboard installer. Keep Windows updated and use a Windows account password; enable BitLocker if you want disk encryption for local data.

## Install

1. Extract the ZIP to a temporary folder such as Downloads. Do not extract it into the final install directory.
2. Double-click `Install-Ryze.cmd`. If Windows asks for permission, allow the script to run for your user account; it does not require administrator rights or change the machine-wide execution policy.
3. When asked, enter the same owner password twice. Use at least 16 characters. The password is not saved in plain text; the installer stores a salted hash and a random session-signing secret in the local configuration.
4. The installer copies the program to `%LOCALAPPDATA%\Programs\RyzeFramework`, installs the locked dependencies, rebuilds and verifies the native SQLite driver, builds the local version, and restricts access to its local config/data folders to your Windows account. It may take several minutes and requires internet access for package installation.

If the script reports that Node.js is missing or unsupported, install Node.js 22 or 24 LTS from the official Node.js website and run the installer again. Do not send your password or any future API keys in chat.

## Start and sign in

Double-click `Start-Ryze.cmd` in the installed folder. It starts the server in the background, waits for its localhost health check, and opens `http://127.0.0.1:3777/`. Enter the owner password you created during installation. Keep the address as `127.0.0.1`; do not replace it with the laptop's network IP or expose the port to other devices.

To stop the app, double-click `Stop-Ryze.cmd`. It checks that the saved process ID belongs to the Ryze Node server before stopping it. Logs are stored under `%LOCALAPPDATA%\RyzeFramework\logs`.

## Where your data lives

- App database: `%LOCALAPPDATA%\RyzeFramework\data\ryze.sqlite`
- Uploaded/generated file bytes: `%LOCALAPPDATA%\RyzeFramework\files`
- Local configuration: `<install folder>\.env` (contains a password hash and signing secret, not the password)

The data is ordinary local files protected by Windows account permissions; this package does not encrypt the database/files itself. Do not commit or email this data. Git is for code only, not a backup.

## Back up and restore

Stop Ryze first, then run `Backup-Ryze.cmd` from the installed folder. It writes a ZIP under `Documents\RyzeFramework-backups` containing the SQLite database, files, and local configuration needed for recovery. The archive contains personal data and the session-signing secret; keep it private and store an additional copy somewhere safe.

To restore, stop Ryze and preserve the current `%LOCALAPPDATA%\RyzeFramework` folder first. Extract the backup and restore its `data` folder to that location; restore `config\app.env` to the installed program's `.env` only if you intend to restore that account/configuration too. Never overwrite newer data without first making a separate backup.

## Troubleshooting

If Ryze does not start, check `%LOCALAPPDATA%\RyzeFramework\logs\server-error.log`. If port 3777 is already occupied, stop the other program or ask for help before changing the configuration. The database is initialized automatically on first startup; if startup reports a migration error, stop and keep the data folder intact rather than deleting it.

This package is built and smoke-tested in the Manus Sandbox, not installed on the physical HP laptop because that laptop is not connected to this task. After you install it, share any error text here (remove personal paths if you prefer); do not share `.env`, the database, Telegram session files, or passwords.
