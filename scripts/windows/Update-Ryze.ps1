[CmdletBinding()]
param(
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'Programs\RyzeFramework')
)

$ErrorActionPreference = 'Stop'
$SourceDirectory = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$EnvFile = Join-Path $InstallDirectory '.env'
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
  Invoke-Pnpm install --frozen-lockfile
  Write-Host 'Checking the packaged SQLite runtime; no C++ build tools are required.'
  & node -e "const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.close();"
  if ($LASTEXITCODE -ne 0) { throw 'The bundled SQLite runtime could not be loaded; the local database was not opened or deleted.' }
  Invoke-Pnpm run build:local
  if (-not (Test-Path -LiteralPath $EnvFile)) { throw 'The installed .env is missing after updating; stop and preserve the data folder before taking any further action.' }
} finally { Pop-Location }

Write-Host ''
Write-Host 'Ryze has been updated. Your existing configuration and local data were preserved.' -ForegroundColor Green
Write-Host "Start it with: $InstallDirectory\Start-Ryze.cmd"
Write-Host 'If FreeLLMAPI is already configured, its key and settings remain local and unchanged.'
