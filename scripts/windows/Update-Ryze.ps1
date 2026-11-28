[CmdletBinding()]
param(
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'Programs\RyzeFramework'),
  [switch]$InstallMemPalaceRuntime
)

$ErrorActionPreference = 'Stop'
$SourceDirectory = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$EnvFile = Join-Path $InstallDirectory '.env'
function Assert-CriticalDeploymentFiles([string]$RootDirectory, [string]$Context) {
  $manifestPath = Join-Path $RootDirectory 'scripts\windows\restore-deployment-manifest.json'
  if (-not (Test-Path -LiteralPath $manifestPath)) { throw "$Context is missing the critical restore deployment manifest." }
  try { $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json } catch { throw "$Context has an unreadable critical restore deployment manifest." }
  if ($manifest.format -ne 'ryze-critical-deployment-v1' -or -not $manifest.criticalFiles) { throw "$Context has an invalid critical restore deployment manifest." }
  foreach ($entry in @($manifest.criticalFiles)) {
    if ([string]::IsNullOrWhiteSpace($entry.path) -or $entry.sha256 -notmatch '^[0-9A-Fa-f]{64}$') { throw "$Context has an invalid critical restore manifest entry." }
    $filePath = Join-Path $RootDirectory ($entry.path -replace '/', '\')
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) { throw "$Context is missing required file $($entry.path)." }
    $actualHash = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($actualHash -ne $entry.sha256.ToUpperInvariant()) { throw "$Context has an unexpected SHA-256 for $($entry.path)." }
  }
}
Assert-CriticalDeploymentFiles $SourceDirectory 'The extracted update package'
if (-not $env:LOCALAPPDATA) { throw 'Windows LOCALAPPDATA is unavailable for this account.' }
if (-not (Test-Path -LiteralPath $EnvFile)) { throw "No existing Ryze configuration was found at $InstallDirectory. Use Install-Ryze.cmd for a first-time installation." }
if ([IO.Path]::GetFullPath($SourceDirectory) -eq [IO.Path]::GetFullPath($InstallDirectory)) { throw 'Extract the updated ZIP to a temporary folder; do not run the updater from inside the installed folder.' }
if (-not (Test-Path (Join-Path $SourceDirectory 'scripts\windows\ensure-opencode-config.mjs'))) { throw 'The extracted update package is incomplete. Extract the full Windows Installer ZIP and try again.' }

$DataRoot = Join-Path $env:LOCALAPPDATA 'RyzeFramework'
foreach ($pidName in @('ryze.pid', 'opencode.pid')) {
  $pidFile = Join-Path $DataRoot $pidName
  if (Test-Path -LiteralPath $pidFile) {
    $runningPid = 0
    [void][int]::TryParse((Get-Content -LiteralPath $pidFile -Raw), [ref]$runningPid)
    if ($runningPid -gt 0 -and (Get-Process -Id $runningPid -ErrorAction SilentlyContinue)) {
      throw "Ryze or OpenCode is still running (PID $runningPid). Run Stop-Ryze.cmd from the installed folder, then run this updater again."
    }
  }
}

$WorkerEntry = [IO.Path]::GetFullPath((Join-Path $InstallDirectory 'worker\ryze_telegram_worker.py'))
$workerProcesses = @(Get-CimInstance Win32_Process | Where-Object {
  $_.Name -match '^pythonw?\.exe$' -and $_.CommandLine -and
  $_.CommandLine.IndexOf($WorkerEntry, [StringComparison]::OrdinalIgnoreCase) -ge 0
})
foreach ($workerProcess in $workerProcesses) {
  Write-Host "Stopping the existing Ryze Telegram worker (PID $($workerProcess.ProcessId)) before replacing worker code."
  Stop-Process -Id $workerProcess.ProcessId -Force -ErrorAction Stop
  try { Wait-Process -Id $workerProcess.ProcessId -Timeout 10 -ErrorAction SilentlyContinue } catch { }
  if (Get-Process -Id $workerProcess.ProcessId -ErrorAction SilentlyContinue) {
    throw "Telegram worker PID $($workerProcess.ProcessId) could not be stopped; no application files were updated."
  }
}

Write-Host 'This update replaces application code only. It preserves the installed .env, SQLite database, local files, and logs.'
Write-Host 'Back up Ryze first if you have not done so recently.' -ForegroundColor Yellow
$excludeDirs = @(
  (Join-Path $SourceDirectory '.git'),
  (Join-Path $SourceDirectory 'node_modules'),
  (Join-Path $SourceDirectory 'dist'),
  (Join-Path $SourceDirectory 'data'),
  (Join-Path $SourceDirectory 'local-storage'),
  (Join-Path $SourceDirectory 'worker\data'),
  (Join-Path $SourceDirectory 'worker\.venv')
)
& robocopy.exe $SourceDirectory $InstallDirectory /E /NFL /NDL /NJH /NJS /NC /NS /XD $excludeDirs /XF '.env' '.env.local' '.env.*.local'
if ($LASTEXITCODE -ge 8) { throw "Copying update files failed (robocopy exit $LASTEXITCODE). Existing local data and configuration were not changed." }
Assert-CriticalDeploymentFiles $InstallDirectory 'The installed Ryze files after update'

$workerTokenLine = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match '^RYZE_WORKER_TOKEN=' } | Select-Object -First 1
if (-not $workerTokenLine -or [string]::IsNullOrWhiteSpace(($workerTokenLine -replace '^RYZE_WORKER_TOKEN=', '').Trim().Trim('"'))) {
  $workerToken = (& node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))").Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($workerToken)) { throw 'Could not generate the local Telegram worker token.' }
  Add-Content -LiteralPath $EnvFile -Value "RYZE_WORKER_TOKEN=$workerToken" -Encoding UTF8
  Write-Host 'Added a new local Telegram worker token to the existing configuration. Other configuration and data were preserved.' -ForegroundColor Green
}

function Invoke-Pnpm {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$PnpmArgs)
  & npx.cmd --yes pnpm@10.18.0 @PnpmArgs
  if ($LASTEXITCODE -ne 0) { throw "pnpm update command failed with exit code $LASTEXITCODE." }
}

Push-Location $InstallDirectory
try {
  Write-Host 'Updating locked application dependencies. Internet access is required.'
  Invoke-Pnpm install --frozen-lockfile --force --config.node-linker=hoisted
  Write-Host 'Rebuilding native/runtime packages and the OpenCode sidecar.'
  Invoke-Pnpm rebuild @opencode/cli better-sqlite3 --config.node-linker=hoisted
  Write-Host 'Checking the packaged SQLite runtime; no C++ build tools are required.'
  & node -e "const path=require.resolve('better-sqlite3'); const Database=require('better-sqlite3'); const db=new Database(':memory:'); db.close(); console.log(path);"
  if ($LASTEXITCODE -ne 0) { throw 'The installed dependency layout cannot load better-sqlite3; the local database was not opened or deleted.' }
  $openCodeExe = Join-Path $InstallDirectory 'node_modules\@opencode\cli\bin\opencode.exe'
  if (-not (Test-Path -LiteralPath $openCodeExe -PathType Leaf)) { throw 'The OpenCode Windows sidecar is missing after dependency installation; the update is incomplete.' }
  Invoke-Pnpm run build:local
  if (-not (Test-Path -LiteralPath (Join-Path $InstallDirectory 'dist\index.js') -PathType Leaf)) { throw 'The production server bundle dist\index.js was not created; the update is incomplete.' }
  if (-not (Test-Path -LiteralPath $EnvFile)) { throw 'The installed .env is missing after updating; stop and preserve the data folder before taking any further action.' }
} finally { Pop-Location }

Write-Host 'Checking and preparing the Python/MemPalace dependency runtime. Existing SQLite data and configuration are not read or changed.'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $InstallDirectory 'scripts\windows\Install-MemPalaceRuntime.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Python/MemPalace dependency setup failed. Resolve the dependency issue and rerun the updater.' }

Write-Host ''
Write-Host 'Ryze has been updated. Your existing configuration and local data were preserved.' -ForegroundColor Green
Write-Host "Start it with: $InstallDirectory\Start-Ryze.cmd"
Write-Host 'If FreeLLMAPI is already configured, its key and settings remain local and unchanged.'
