$ErrorActionPreference = 'Stop'
$InstallDirectory = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$EnvFile = Join-Path $InstallDirectory '.env'
$DataRoot = Join-Path $env:LOCALAPPDATA 'RyzeFramework'
$PidFile = Join-Path $DataRoot 'ryze.pid'
$DatabaseFile = Join-Path $DataRoot 'data\ryze.sqlite'
$FilesDirectory = Join-Path $DataRoot 'files'

if (-not (Test-Path $EnvFile)) { throw 'Ryze local configuration is missing.' }
if (-not (Test-Path $DatabaseFile)) { throw 'Ryze database does not exist yet; start the app once before creating a backup.' }
$listener = Get-NetTCPConnection -LocalPort 3777 -State Listen -ErrorAction SilentlyContinue
if ($listener) { throw 'A process is listening on Ryze port 3777. Stop Ryze before backing up.' }
if (Test-Path $PidFile) {
  $runningPid = 0
  [void][int]::TryParse((Get-Content $PidFile -Raw), [ref]$runningPid)
  if ($runningPid -gt 0 -and (Get-Process -Id $runningPid -ErrorAction SilentlyContinue)) {
    throw 'Stop Ryze with Stop-Ryze.cmd before backing up. This keeps the SQLite database consistent.'
  }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

$backupRoot = Join-Path $env:USERPROFILE 'Documents\RyzeFramework-backups'
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$identity = (& whoami).Trim()
& icacls.exe $backupRoot /inheritance:r /grant:r "${identity}:(OI)(CI)F" /T /C | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not restrict access to the backup folder.' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$archive = Join-Path $backupRoot "Ryze-backup-$stamp.zip"
$stage = Join-Path $env:TEMP "Ryze-backup-$stamp"
New-Item -ItemType Directory -Path $stage -Force | Out-Null
& icacls.exe $stage /inheritance:r /grant:r "${identity}:(OI)(CI)F" /T /C | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not protect the temporary backup staging directory.' }
New-Item -ItemType Directory -Path (Join-Path $stage 'data') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage 'config') -Force | Out-Null
try {
  Copy-Item $DatabaseFile (Join-Path $stage 'data\ryze.sqlite')
  foreach ($sidecar in @("$DatabaseFile-wal", "$DatabaseFile-shm")) {
    if (Test-Path $sidecar) { Copy-Item $sidecar (Join-Path $stage "data\$(Split-Path $sidecar -Leaf)") }
  }
  if (Test-Path $FilesDirectory) { Copy-Item $FilesDirectory (Join-Path $stage 'data\files') -Recurse }
  Copy-Item $EnvFile (Join-Path $stage 'config\app.env')
  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $archive -CompressionLevel Optimal
  & icacls.exe $archive /inheritance:r /grant:r "${identity}:F" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not restrict access to the backup archive.' }
} finally {
  Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "Backup created: $archive" -ForegroundColor Green
Write-Warning 'This backup includes your database, files, password hash, and session-signing secret. Keep it private and store an additional copy in a safe location.'
