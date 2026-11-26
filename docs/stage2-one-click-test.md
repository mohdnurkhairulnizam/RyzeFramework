# Stage 2 One-Click Preflight — Install and Test Guide

## What this button does

The Settings button **Run Stage 2 preflight** runs a focused Vitest suite for memory persistence, owner scope, identity/System Memory, governance, retrieval boundaries, portable export, and SQLite restore validation. Its fixtures are synthetic. The runner creates a temporary directory, passes a reduced environment to the test process, captures a bounded log, and deletes the temporary directory afterward.

The report deliberately separates automated results from acceptance work that the button does not perform. A `PASS` means only that the focused synthetic tests passed. The report still marks target-Windows installation, ACL, actual backup/restore, rollback, and representative owner-approved retrieval relevance as `NOT_RUN`. It is not a Stage 2 acceptance sign-off.

The button does not open Ryze's live SQLite database or file store, make a private backup, change settings, start or stop Telegram, contact a model provider, or upload test results.

## Install safely on Windows

Use a disposable Windows VM or a separate Windows user profile for this first test. Do not install this test build over your only working Ryze installation. The Windows installer intentionally refuses to overwrite an existing `.env`, but a separate profile also isolates the local database and files.

1. Download the Stage 2 verification ZIP supplied with this change and extract it to a new folder, for example `Downloads\RyzeFramework-Stage2-Verification`.
2. Sign in to the disposable Windows profile. Do not configure Telegram, FreeLLMAPI, or any other real account credentials for this preflight.
3. Confirm Node.js 22 or 24 LTS is available. From the extracted folder, run `Install-Ryze.cmd`. The installer installs locked dependencies and builds the local application. Give the test profile a temporary owner passphrase.
4. Start Ryze using `Start-Ryze.cmd` from the installed application folder and sign in at the local dashboard. Keep the address on `127.0.0.1`; do not expose it to your network.

If the installer or app fails, stop and preserve the folder. Do not delete or replace any existing Ryze data. Share only the error text, after removing personal paths if desired; never share `.env`, passwords, API keys, database files, or backup archives.

## Run the one-click preflight and send the log

1. In the dashboard, open **Settings**.
2. Find **Stage 2 acceptance preflight** and select **Run Stage 2 preflight**. Wait for the run to finish; the focused tests may take up to about two minutes.
3. Read the report. Send it even if it contains `FAIL`, `WARN`, or `NOT_RUN`; those labels are useful evidence, not a reason to rerun against live data.
4. Select **Copy** beside **Stage 2 test log**, then paste the complete report into the review conversation.

The report includes the platform, Node version, test summary, and captured test output. It is designed not to contain secrets or personal user data. Please do not append `.env` contents, raw application logs, Telegram session files, database files, or private backups.

## What remains outside this button

The preflight is not the target-Windows round-trip test. In particular, do not use your only live installation or a real backup to test restore. The current Windows restore handler validates the selected SQLite file and required Stage 2 schema before changing the installation, takes and validates a rollback snapshot, and attempts automatic rollback on an apply/post-check failure. Its SQLite validator has synthetic regression coverage, but this PowerShell workflow has not yet been executed on Windows after the hardening change.

Use the separate [Stage 2 Disposable Windows Restore-Safety Test](./stage2-restore-safety-test.md) only in a dedicated disposable Windows profile. It verifies the installed restore script with a valid restore, a deliberately corrupted duplicate backup, and an explicit post-replacement failure injection that exercises automatic rollback. Keep archives and any credential-bearing output local to the disposable machine; never upload or paste them into chat.

Even if all automated checks pass, Stage 2 remains open until the owner-reviewed retrieval set and the required Windows acceptance evidence are separately recorded.
