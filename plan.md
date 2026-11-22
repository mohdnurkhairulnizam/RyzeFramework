# RyzeFramework Local Windows Installer Plan

## Deliverable

Prepare a manual-install ZIP for the owner's target Windows computer. It contains the Ryze source tree, locked dependencies, and double-click Windows install/start/stop/backup helpers. The install script builds the production app on the laptop; the ZIP deliberately excludes sandbox `node_modules`, Linux `dist`, `.git`, credentials, and user data. It does not bundle Node.js or install system software. Internet access is required during dependency installation.

## Local-first architecture

- Run the Node app only on `127.0.0.1:3777`; use the local-mode guard and fail on configuration/port errors.
- Store app state in embedded SQLite under `%LOCALAPPDATA%\RyzeFramework\data` and files under `%LOCALAPPDATA%\RyzeFramework\files`.
- Serve downloads through an authenticated file-ID route that checks database ownership and rejects path traversal.
- Use a single-owner local sign-in. The installer accepts the password through a secure prompt, stores only a salted scrypt hash and random signing secret in a user-ACL-protected `.env`, and the server applies loopback/Host/Origin checks and rate limiting.
- The original MySQL migrations are retained for history; only the SQLite migration directory is used by the standalone build.
- Keep OpenCode/FreeLLMAPI and Telegram integrations unavailable in this installer. Do not include credentials or a Telegram session. Do not re-enable `send_message` until an explicit owner-approval workflow with pause/stop and suppression checks exists.
- Retain the current dashboard visual design and safe demo workflow. State clearly that this is a local foundation, not a complete Stage 1 agent.

## Windows installation behavior

- Require 64-bit Windows 10+, Node.js 22 or 24 LTS, and internet access during install. Use pnpm 10.18.0 and the committed lockfile; explicitly rebuild and verify the native SQLite binding.
- Run `Install-Ryze.cmd` to copy the package to `%LOCALAPPDATA%\Programs\RyzeFramework`, install dependencies, build the local production app, create the owner config, and restrict config/data folder ACLs.
- Run `Start-Ryze.cmd` to launch in the background and open the browser on localhost; use `Stop-Ryze.cmd` before `Backup-Ryze.cmd`.
- Back up the SQLite database, WAL sidecars, local files, and protected config to a user-only ZIP under Documents. The guide explains manual restore and warns that a backup includes the signing secret.
- The optional Telethon worker is not installed or configured by this ZIP; no Python prerequisite or Windows service manager is set up.

## Verification boundary

The lockfile install, TypeScript check, 20 Vitest tests across 10 files, 4 worker safety tests, standalone build, local auth/config tests, and a disposable production health/login/SQLite smoke test passed in the cloud sandbox. The PowerShell scripts, Node native SQLite installation, ACLs, browser UI, backup/restore, and application behavior have not been exercised on the physical target Windows computer. The package guide must retain this limitation until the owner runs it.
