# Stage 3A — Controlled production projection-only pilot

**Status:** Prepared; target-Windows activation remains pending operator execution.

Stage 3A keeps SQLite as the sole authoritative memory store while allowing the reviewed MemPalace projection path to remain enabled for a short, approval-bounded pilot. It does not enable provider-derived search, automatic capture, broad synchronization, System Memory projection, restricted projection, or provider authority.

## Fixed pilot scope

- Provider: MemPalace
- Provider revision: `4df7b830ff1398332d4118884520a24f1aab9cc1`
- Namespace: `ryze-production-main`
- Branch: `main`
- Manifest: `docs/evidence/mempalace-production-dry-run-manifest-2026-11-28-production-r1.json`
- Manifest SHA-256: `fd758180453aa0d8eef073d44cbc5ec8e28e81a6e0be18e51e8f22fe49527272`
- Allowlist: exactly 8 approved memory ID/version pairs
- Search: `RYZE_MEMPALACE_SEARCH_DERIVED=false`
- Rollback: `RYZE_MEMPALACE_MODE=disabled`
- Approval: short-lived and exact-hash-bound

## Target-Windows activation

Use a fresh PowerShell window in the installed Ryze directory. Recreate the variables and create a short-lived approval file without a UTF-8 BOM, as described below.

```powershell
Set-Location "C:\Users\User\AppData\Local\Programs\RyzeFramework"
$install = (Get-Location).Path
$manifest = Join-Path $install "docs\evidence\mempalace-production-dry-run-manifest-2026-11-28-production-r1.json"
$approvalPath = Join-Path $env:LOCALAPPDATA "RyzeFramework\mempalace-production-approval.json"
$mcp = Join-Path $env:LOCALAPPDATA "RyzeFramework\mempalace-runtime\venv\Scripts\mempalace-mcp.exe"
$palace = Join-Path $env:LOCALAPPDATA "RyzeFramework\mempalace-production"
$manifestHash = (Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash.ToLower()
if ($manifestHash -ne "fd758180453aa0d8eef073d44cbc5ec8e28e81a6e0be18e51e8f22fe49527272") { throw "Approved manifest hash mismatch." }

$approval = [ordered]@{
  manifestSha256 = $manifestHash
  providerCommit = "4df7b830ff1398332d4118884520a24f1aab9cc1"
  namespace = "ryze-production-main"
  branch = "main"
  operationCount = 8
  expiresAt = (Get-Date).ToUniversalTime().AddHours(2).ToString("o")
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($approvalPath, ($approval | ConvertTo-Json), $utf8NoBom)

$env:RYZE_MEMPALACE_MODE = "projection-only"
$env:RYZE_MEMPALACE_PROVIDER_REVISION = "4df7b830ff1398332d4118884520a24f1aab9cc1"
$env:RYZE_MEMPALACE_NAMESPACE = "ryze-production-main"
$env:RYZE_MEMPALACE_BRANCH = "main"
$env:RYZE_MEMPALACE_MANIFEST_PATH = $manifest
$env:RYZE_MEMPALACE_APPROVAL_PATH = $approvalPath
$env:RYZE_MEMPALACE_SEARCH_DERIVED = "false"
$env:RYZE_MEMPALACE_COMMAND = $mcp
$env:RYZE_MEMPALACE_ARGS = ConvertTo-Json @("--palace", $palace) -Compress
```

Before starting Ryze, verify all five paths exist and the approval values match. Capture a read-only SQLite check and preserve the output.

Start Ryze normally from the same environment or persist only the reviewed settings in the installed `.env`:

```text
RYZE_MEMPALACE_MODE=projection-only
RYZE_MEMPALACE_SEARCH_DERIVED=false
```

The provider revision, namespace, branch, manifest, approval, command, and arguments must also be present when the application process starts. Do not enable this mode through an installer default.

## Pilot acceptance checks

After startup, verify the protected `memoryProviderHealth` procedure. The expected bounded state is:

- `mode=projection-only`
- `enabled=true`
- `searchable=false`
- `providerRevision=4df7b830ff1398332d4118884520a24f1aab9cc1`
- `namespace=ryze-production-main`
- `canonicalSqliteAvailable=true`
- outbox `pending=0`, `inFlight=0`, `failed=0`
- no configuration error

Verify that the dashboard and Memory Vault open. Verify that ordinary reads still return canonical SQLite records. Do not enable derived search during Stage 3A.

During the short pilot, only owner-approved operations matching the exact manifest allowlist may be projected. Do not create a new memory, alter the manifest, add an ID/version, or enable automatic capture during this pilot.

Restart Ryze once while the pilot configuration remains active. After restart, verify provider health, dashboard/Memory Vault availability, and outbox state. A provider restart or provider-unavailable event must leave SQLite-backed operation available and must not mark failed work as applied.

## Rollback

Rollback immediately on provider ambiguity, nonzero failed outbox state, configuration drift, unexpected projection count, health degradation, or any SQLite issue:

```text
RYZE_MEMPALACE_MODE=disabled
RYZE_MEMPALACE_SEARCH_DERIVED=false
```

Restart Ryze, rerun the read-only SQLite checker, and confirm the known fingerprint remains unchanged unless an explicitly approved canonical memory change occurred. Remove the temporary approval file after evidence capture.

## Stage 3A exit criteria

Stage 3A is **PASS** only when target-Windows evidence records:

1. exact provider revision, namespace, branch, manifest hash, and approval expiry;
2. projection-only health with derived search disabled;
3. dashboard and Memory Vault availability;
4. one restart with health and outbox recovery verified;
5. provider-unavailable fallback, if exercised, with SQLite still available;
6. unchanged SQLite integrity, counts, and fingerprint after rollback;
7. approval payload removal and safe disabled runtime state.

Stage 3A does not authorize full Option C. Continuous broad synchronization, provider-derived search, automatic capture, or any expansion beyond the exact allowlist requires a separate Stage 3B review and approval.
