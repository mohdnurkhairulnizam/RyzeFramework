[CmdletBinding()]
param(
  [string]$InstallDirectory = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = 'Stop'
$dataRoot = Join-Path $env:LOCALAPPDATA 'RyzeFramework'
$requestPath = Join-Path $dataRoot 'data\ryze-restore-request.json'
if (-not (Test-Path -LiteralPath $requestPath)) { exit 0 }

$request = Get-Content -LiteralPath $requestPath -Raw | ConvertFrom-Json
$backupRoot = Join-Path $env:USERPROFILE 'Documents\RyzeFramework-backups'
$requestedPath = [IO.Path]::GetFullPath([string]$request.backupPath)
$allowedRoot = ([IO.Path]::GetFullPath($backupRoot)).TrimEnd('\') + '\'
if (-not $requestedPath.StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'The requested restore is outside the protected Ryze backup folder.'
}
if (-not (Test-Path -LiteralPath $requestedPath)) { throw 'The requested Ryze backup no longer exists.' }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$preRestore = Join-Path $backupRoot "Ryze-pre-restore-$stamp"
New-Item -ItemType Directory -Path $preRestore -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $preRestore 'data') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $preRestore 'config') -Force | Out-Null
$db = Join-Path $dataRoot 'data\ryze.sqlite'
$workerRoot = Join-Path $dataRoot 'telegram-worker'
foreach ($source in @($db, "$db-wal", "$db-shm")) {
  if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination (Join-Path (Join-Path $preRestore 'data') (Split-Path $source -Leaf)) -Force }
}
$files = Join-Path $dataRoot 'files'
if (Test-Path -LiteralPath $files) { Copy-Item -LiteralPath $files -Destination (Join-Path $preRestore 'data\files') -Recurse -Force }
$envFile = Join-Path $InstallDirectory '.env'
if (Test-Path -LiteralPath $envFile) { Copy-Item -LiteralPath $envFile -Destination (Join-Path $preRestore 'config\app.env') -Force }
$workerBackup = Join-Path $preRestore 'telegram'
New-Item -ItemType Directory -Path (Join-Path $workerBackup 'data') -Force | Out-Null
$workerEnv = Join-Path $workerRoot 'worker.env'
if (Test-Path -LiteralPath $workerEnv) { Copy-Item -LiteralPath $workerEnv -Destination (Join-Path $workerBackup 'worker.env') -Force }
foreach ($suffix in @('.session', '.session-wal', '.session-shm', '.session-journal')) {
  $source = Join-Path $workerRoot "data\ryze-user$suffix"
  if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination (Join-Path $workerBackup "data\ryze-user$suffix") -Force }
}

$expanded = $requestedPath
$temp = $null
if ((Get-Item -LiteralPath $requestedPath).PSIsContainer -eq $false -and [IO.Path]::GetExtension($requestedPath) -ieq '.zip') {
  $temp = Join-Path $env:TEMP "Ryze-restore-$stamp"
  Expand-Archive -LiteralPath $requestedPath -DestinationPath $temp -Force
  $expanded = $temp
}
$sourceData = Join-Path $expanded 'data'
$sourceConfig = Join-Path $expanded 'config\app.env'
if (-not (Test-Path -LiteralPath (Join-Path $sourceData 'ryze.sqlite'))) { throw 'The selected backup does not contain data\ryze.sqlite.' }
if (-not (Test-Path -LiteralPath $sourceConfig)) { throw 'The selected backup does not contain config\app.env.' }

New-Item -ItemType Directory -Path (Join-Path $dataRoot 'data') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceData 'ryze.sqlite') -Destination (Join-Path $dataRoot 'data\ryze.sqlite') -Force
foreach ($sidecar in @('ryze.sqlite-wal', 'ryze.sqlite-shm')) {
  $source = Join-Path $sourceData $sidecar
  $destination = Join-Path $dataRoot "data\$sidecar"
  if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $destination -Force }
  elseif (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Force }
}
$sourceFiles = Join-Path $sourceData 'files'
$destinationFiles = Join-Path $dataRoot 'files'
if (Test-Path -LiteralPath $sourceFiles) {
  if (Test-Path -LiteralPath $destinationFiles) { Remove-Item -LiteralPath $destinationFiles -Recurse -Force }
  Copy-Item -LiteralPath $sourceFiles -Destination $destinationFiles -Recurse -Force
}
Copy-Item -LiteralPath $sourceConfig -Destination $envFile -Force
$sourceTelegram = Join-Path $expanded 'telegram'
if (Test-Path -LiteralPath (Join-Path $sourceTelegram 'worker.env')) {
  New-Item -ItemType Directory -Path $workerRoot -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $sourceTelegram 'worker.env') -Destination $workerEnv -Force
}
foreach ($suffix in @('.session', '.session-wal', '.session-shm', '.session-journal')) {
  $source = Join-Path $sourceTelegram "data\ryze-user$suffix"
  if (Test-Path -LiteralPath $source) {
    New-Item -ItemType Directory -Path (Join-Path $workerRoot 'data') -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination (Join-Path $workerRoot "data\ryze-user$suffix") -Force
  }
}
& icacls.exe $dataRoot /reset /T /C | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'The restored Ryze data ACL repair failed.' }
Remove-Item -LiteralPath $requestPath -Force
if ($temp) { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue }
Write-Host "Ryze restore applied. Previous live data was preserved at: $preRestore" -ForegroundColor Green
