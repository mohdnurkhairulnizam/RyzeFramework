# Stage 2 — Disposable Windows Restore-Safety Test

## Scope and safety boundary

Run this procedure only in the **separate disposable Windows account/profile** used for Stage 2 acceptance. Do not run restore, corruption, or rollback exercises in the owner's normal Ryze profile. A Ryze private backup can contain personal memory/task data, owner-password hash, signing secret, API credentials, and Telegram session material. Keep every original and test backup local to the disposable account; never upload or paste archives, databases, `.env` files, or Telegram files.

The `Run operational baseline` button is a non-destructive backup/copy rehearsal. Its “Restore rehearsal” means the backup folder was copied to a temporary directory. It does not, by itself, verify SQLite integrity, replace data, reject corruption, or test rollback.

This runbook assumes a future package with the hardened `Apply-RyzeRestore.ps1` and `validate-restore-db.mjs` has been installed into the disposable profile. The user-visible restore code must be run on Windows before Stage 2 can claim platform acceptance.

## Preflight the disposable profile

1. Sign in to the disposable Windows account and start Ryze. Confirm the dashboard opens at `http://127.0.0.1:3777/`.
2. In **Memory vault**, create one synthetic record with Category `Personal`, Memory type `Preference`, and content `Stage 2 restore checkpoint A — synthetic only.` Save it after the duplicate/conflict review completes.
3. In Settings, select **Run operational baseline**. Wait for it to finish. Record only PASS/FAIL statuses locally. The backup is created under `Documents\RyzeFramework-backups` and includes private configuration/database data.
4. Confirm the baseline directory exists. Keep its exact path local; never send the path if it contains personal information.
5. Add a second synthetic memory: `Stage 2 post-backup marker B — synthetic only.` This entry should be present before restore and absent after a successful restore to checkpoint A.

## Corrupted-backup rejection

This intentionally damages only a duplicate of the baseline backup, never the original backup or live database.

1. In the disposable account, open PowerShell and run the following after replacing the sample source path with the exact `Ryze-baseline-*` directory created above:

   ```powershell
   $source = Join-Path $env:USERPROFILE 'Documents\RyzeFramework-backups\Ryze-baseline-REPLACE_WITH_YOUR_TIMESTAMP'
   $backupRoot = Join-Path $env:USERPROFILE 'Documents\RyzeFramework-backups'
   $corrupt = Join-Path $backupRoot 'Ryze-backup-corrupt-test'
   if (-not (Test-Path -LiteralPath (Join-Path $source 'data\ryze.sqlite'))) { throw 'Source backup database missing; stop.' }
   if (Test-Path -LiteralPath $corrupt) { throw 'Corrupt test copy already exists; choose a new unique name.' }
   Copy-Item -LiteralPath $source -Destination $corrupt -Recurse
   Set-Content -LiteralPath (Join-Path $corrupt 'data\ryze.sqlite') -Value 'deliberately corrupted disposable test copy; not a database' -NoNewline -Encoding Ascii
   ```

2. In Ryze Settings, select **Restore selected backup**, choose `Ryze-backup-corrupt-test`, and confirm the request. Then stop Ryze with `Stop-Ryze.cmd`.
3. Start Ryze using `Start-Ryze.cmd`. The restore handler should warn that the selected backup was rejected **before current data was changed**, clear the queued restore request, and continue startup. If the first start does not open the dashboard, do not repeat the restore request; stop and report only the redacted error text.
4. Confirm both checkpoint A and post-backup marker B are still visible. This is the corruption-rejection PASS: live disposable data remained unchanged. The original baseline backup must remain unmodified.
5. After confirming the app is healthy, stop Ryze and remove only the `Ryze-backup-corrupt-test` duplicate from the disposable profile. Do not remove the original baseline backup.

## Valid restore from the known-good checkpoint

1. In the disposable profile, open **Memory vault** and add `Stage 2 post-backup marker C — synthetic only.` Confirm checkpoint A, B, and C are visible before restore.
2. In Settings, select **Restore selected backup**, choose the original `Ryze-baseline-*` checkpoint, and confirm.
3. Stop Ryze, then start it normally with `Start-Ryze.cmd`.
4. Confirm Ryze opens and checkpoint A is visible. Confirm B and C are absent because they were added after the checkpoint. Do not use real memories for this test.
5. Confirm a new protected `Ryze-pre-restore-*` folder exists. Keep it local. Do not delete it during the rollback test.

## Automatic rollback drill

This uses an explicit opt-in fault-injection switch to trigger a failure **after** a valid staged restore has replaced the target disposable data. The restore handler should reapply its verified pre-restore snapshot before Ryze starts. Only use this in the disposable profile.

1. With checkpoint A still visible, add `Stage 2 rollback marker D — synthetic only.` Confirm it appears. It is deliberately newer than the selected original baseline.
2. In Settings, queue restore of the original known-good `Ryze-baseline-*` checkpoint, confirm, and stop Ryze.
3. Open PowerShell in the disposable profile and run:

   ```powershell
   $install = Join-Path $env:LOCALAPPDATA 'Programs\RyzeFramework'
   $script = Join-Path $install 'scripts\windows\Apply-RyzeRestore.ps1'
   if (-not (Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA 'RyzeFramework\data\ryze-restore-request.json'))) { throw 'No queued restore request; stop.' }
   & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -InstallDirectory $install -SimulatePostReplaceFailure
   ```

4. Expected output contains a PASS line stating that a synthetic post-replacement failure was triggered and automatic rollback restored and integrity-validated the previous Ryze state. It may also show a warning explaining that failure was intentional. If output says `CRITICAL`, rollback failed: do not start Ryze or delete anything; preserve the protected `Ryze-pre-restore-*` snapshot and get help.
5. Start Ryze normally with `Start-Ryze.cmd`. Confirm the dashboard opens and checkpoint A **and** rollback marker D are present. Marker D proves the pre-restore state was recovered instead of leaving the older baseline restore in place.
6. Keep the original baseline and `Ryze-pre-restore-*` snapshot until all checks are reviewed. Only remove synthetic records or test backups later, from the disposable profile, after confirming you have no remaining need for the evidence.

## Evidence to report

Paste only these facts (no full paths or file contents):

- Corrupted-copy test: rejected before mutation? PASS/FAIL; did the app reopen and did A+B remain?
- Valid restore: app reopened? Did A remain while B+C disappeared?
- Rollback drill: did the explicit PASS line appear? Did A+D remain after reopening?
- Any error text after removing usernames, personal paths, and secrets.

Do not paste backup manifests, archive listings, SQLite output containing rows, `.env`, session files, credentials, or private backup paths. Stage 2 is not fully accepted until the Windows results are reviewed and recorded.
