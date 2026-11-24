# Stage 1 Retention and Rollback Policy

This policy applies to the local Windows deployment. It keeps the dashboard useful for diagnosis without turning logs, exports, or Git into a copy of private Telegram or provider secrets.

## Retention

- Task summaries, structured task events, worker status, and Telegram delivery status are retained in the local SQLite database for operational diagnosis.
- Telegram message previews are bounded to 500 characters. Recovery codes, API keys, passwords, login codes, raw Telegram objects, session bytes, and worker environment contents are never written to application logs or ordinary exports.
- The owner should review and prune message content and task history at least monthly. A future maintenance command should retain the last 90 days of operational records and delete older message previews while preserving aggregate failure counters.
- Generated files and uploaded files remain under the owner-scoped local files directory until the owner deletes them. Telegram's 24-hour lookup window only limits which received file can be selected by a later request; it does not delete the stored file. Automatic file expiry and an in-dashboard file deletion control are not implemented; treat uploads as persistent until a deliberate owner-directed cleanup policy is defined. The current 5 MiB per-file limit and MIME allowlist remain enforced.
- Private backups are separate from ordinary exports and may contain `.env`, worker configuration, Telegram session files, and personal data. They must remain in the protected `Documents\RyzeFramework-backups` folder and should be pruned by the owner after confirming a newer backup.

## Rollback

- Before applying a restore, `Apply-RyzeRestore.ps1` creates a `Ryze-pre-restore-*` snapshot of the live database, files, `.env`, worker configuration, and Telegram session material when present.
- Restore requests are accepted only from the protected backup folder and only for a Ryze backup folder or ZIP archive. The request is staged in `data\ryze-restore-request.json` and applied on the next controlled startup.
- A restore never replaces live data in the dashboard action itself. The server must be stopped and restarted through the managed Windows launcher before replacement occurs.
- If startup validation fails after restore, preserve the pre-restore snapshot and return to the prior backup rather than repeatedly running the installer over existing data. Do not delete the local data directory to solve an ACL or startup error.
- Rollback evidence must include the backup manifest, startup result, database migration result, worker session/config presence (not their contents), and a clean start/stop cycle.

## Stage 1 boundary

This policy is documentation plus tested path validation at the current milestone. Physical target-Windows restore, retention pruning, and one-hour recovery-code expiry still require live acceptance evidence and must not be marked complete from a sandbox test alone.
