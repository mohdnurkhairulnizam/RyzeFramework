# Gate 3 Target-Windows Export/Restore Evidence Collection — 2026-11-25

**Status:** Collection opened; target-Windows round-trip not run. Gate 3 / Stage 2 acceptance remains open.

## Environment and safety

- Current execution target: Linux Manus Sandbox (`aarch64`); `pwsh` is not installed.
- Available-device discovery returned only the sandbox. No authorized target-Windows device was available to run the native scripts.
- No live Ryze database, `.env`, Telegram session, private backup archive, or Windows restore operation was accessed or changed.
- Consequently, this record is a static code review and collection plan, not target-Windows execution evidence.

## Code-level evidence collected

- `exportUserSandbox` gathers the authenticated owner's dashboard data plus Ryze identity, identity revisions, and System Memory, then passes them through the user-scoped export builder.
- `buildUserScopedExport` filters dashboard collections to the requested owner. The existing portable-export test checks disabled integration settings and excludes file bytes. These are code/test observations only; no real portable export was generated in this collection.
- The Windows private backup script requires Ryze to be stopped, stages the SQLite database and sidecars, files, `.env`, and optional Telegram worker/session material, then creates a ZIP and restricts its ACL. It warns that the archive may contain keys, session-signing material, and personal data; the archive must remain private.
- The Windows restore script restricts the selected path to the user's Ryze backup folder, preserves current database/config/files/Telegram material under a `Ryze-pre-restore-*` path, requires the backup database and config file, copies the selected content, and resets data-folder ACLs.
- The reviewed backup/restore scripts contain no archive hash/manifest verification or SQLite integrity-check step. A successful PowerShell run alone would therefore not establish the contract's integrity-checked round-trip criterion. This is an implementation/evidence gap to resolve before acceptance.

## Target-Windows evidence still required

Use a dedicated disposable Windows test profile/installation, not the owner's only live installation. Keep private archives and any output containing credentials on that machine; do not upload or commit them.

1. Record Windows build, Ryze app commit/version, Node/Python versions, and a fresh pre-test backup identifier. Stop Ryze before database backup.
2. Seed only synthetic owner-scoped fixtures for Personal, Experience, System Memory, identity/revision history, restricted memory, and a second owner. Record expected IDs and values without secrets.
3. Generate the ordinary portable JSON export. Check schema version, memory classifications/provenance/version/status, identity and revision history, System Memory, owner scope, and the absence of sentinel credentials, Telegram session data, and file bytes.
4. Create a separate private ZIP backup using the supported Windows workflow. Record its local path, size, and SHA-256 in the local test log; never attach the archive or its checksum log if it reveals sensitive paths or data.
5. On a disposable copy, verify archive/database integrity before restore. Restore into a clean test installation, start Ryze, and compare the synthetic fixture set, identity revisions, System Memory, owner isolation, and file metadata/content as applicable.
6. Exercise a failed/corrupt restore on the disposable copy. Verify that the original live copy and the `Ryze-pre-restore-*` snapshot remain recoverable, and document the actual rollback steps and result.
7. Capture redacted console outcomes, integrity-check output, before/after fixture counts, ACL results, and reviewer/date. Keep all secrets and user data out of GitHub evidence.

## Current disposition

No target-Windows acceptance result is claimed. Evidence collection is blocked on access to a disposable authorized Windows target and on resolving/approving an integrity-check method for the private backup format. The code-level observations above can guide that run but do not close Stage 2 acceptance criterion 9.
