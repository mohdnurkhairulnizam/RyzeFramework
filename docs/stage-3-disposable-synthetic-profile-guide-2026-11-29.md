# Stage 3 disposable synthetic-profile guide — 29 November 2026

## Purpose

Use this procedure only to prepare and later test Stage 3 work packages in an isolated Windows profile. It does **not** start origin blueprint Stage 3, install a watchdog, modify skill lifecycle code, enable autonomous recovery, or activate MemPalace.

Do not use the normal Ryze Windows profile, real Telegram credentials, FreeLLMAPI credentials, private files, production SQLite, backups, or the production MemPalace namespace.

## 1. Create the disposable boundary

Preferred options, in order:

1. A disposable Windows VM with a snapshot.
2. A separate Windows user profile on a non-production test computer.
3. A dedicated Windows installation that contains no normal Ryze data.

Sign in only to that disposable profile. Keep the dashboard loopback-only at `127.0.0.1`; do not expose it to the LAN or internet.

Before installing, confirm the normal profile is not running Ryze or the Telegram worker. Do not copy `.env`, `data`, `local-storage`, `worker\data`, `worker\.venv`, backups, or logs from the normal profile.

## 2. Install the reviewed package

Use the reviewed source package only after verifying its checksum. For the current bounded Stage 2 baseline:

```text
Package: RyzeFramework-Windows-Stage2-BoundedFile-DeliveryFix-20261129.zip
SHA-256: edd28472204250b405761ee253290a7fea714630b2ee00d584e5668d79b1e1ca
```

Extract it to a new temporary folder in the disposable profile and run:

```powershell
.\Install-Ryze.cmd
```

Use a temporary test passphrase. Do not configure Telegram, FreeLLMAPI, Gmail, Drive, Photos, or any other real external account.

Start the installed application:

```powershell
Set-Location "$env:LOCALAPPDATA\Programs\RyzeFramework"
$env:RYZE_MEMPALACE_MODE = "disabled"
$env:RYZE_MEMPALACE_SEARCH_DERIVED = "false"
.\Start-Ryze.cmd
```

The `RYZE_MEMPALACE_MODE=disabled` setting is intentional. Stage 3 synthetic preparation does not need MemPalace.

## 3. Capture a sanitized synthetic baseline

From the installed folder, run the read-only checker:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\windows\Check-Live-Sqlite.ps1 `
  -OutputPath "$env:TEMP\ryze-stage3-synthetic-baseline.txt"
```

Record only:

- package name and checksum;
- Windows/Node version;
- `integrity=PASS` or failure;
- row counts;
- memory-row SHA-256;
- MemPalace mode (`disabled`).

Do not provide the database, `.env`, logs, backup archives, session files, credentials, or private file contents.

## 4. Synthetic data boundary

If a Stage 3 work package later requires data, create only clearly synthetic records such as:

- `Synthetic Skill Alpha`;
- `Synthetic Skill Beta`;
- `Synthetic failure incident 001`;
- `Synthetic rollback marker A`.

Use no real names, memories, Telegram IDs, API keys, documents, or production identifiers. Keep generated files under the disposable profile and delete them when the test is complete.

## 5. Work-package preparation order

Do not implement all work packages at once. Use this order after separate implementation approval:

1. **WP-1:** registry schema and read-only listing only.
2. **WP-2:** configuration/backup separation and exclusion checks.
3. **WP-3:** manifest validation and simulated activation/rollback.
4. **WP-4:** watchdog design comparison, then a synthetic heartbeat/crash harness.
5. **WP-5:** sanitized incident record and notification contract.

Each package must pass repository tests before any disposable-Windows run. A failed test stops the sequence; do not bypass it by changing the normal profile.

## 6. Explicit prohibitions

Do not:

- run against the normal Ryze installation;
- set `RYZE_MEMPALACE_MODE=projection-only`;
- use the production namespace, manifest, approval, or provider runtime;
- enable derived search or automatic capture;
- install a watchdog as a Windows service or scheduled task;
- allow a skill to edit its own code or permissions;
- use real credentials or private documents;
- run shell commands through Telegram or generated-file workflows;
- replace a failed test with a manual PASS claim.

## 7. Stop and restore

When the synthetic preparation ends:

```powershell
.\Stop-Ryze.cmd
```

Delete only the disposable profile or revert the VM snapshot. Do not copy its database, logs, `.env`, or worker state into the normal profile.

## Current status

The Stage 3 design checkpoint and work-package review are approved at the **planning/design level**. Origin Stage 3 implementation remains **not started**. Stage 2 remains open pending the final target-Windows retention evidence.
