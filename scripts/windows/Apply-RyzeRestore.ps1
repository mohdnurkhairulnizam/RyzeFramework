[CmdletBinding()]
param(
  [string]$InstallDirectory = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
  [switch]$SimulatePostReplaceFailure
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
$tempRoot = Join-Path $env:TEMP "Ryze-restore-$stamp"
$expanded = $requestedPath
$replaceStarted = $false
$rollbackSucceeded = $false
$validator = Join-Path $InstallDirectory 'scripts\windows\validate-restore-db.mjs'
$node = (Get-Command node -ErrorAction Stop).Source
$db = Join-Path $dataRoot 'data\ryze.sqlite'
$envFile = Join-Path $InstallDirectory '.env'
$workerRoot = Join-Path $dataRoot 'telegram-worker'

function Invoke-DatabaseValidation([string]$DatabasePath) {
  $result = & $node $validator $DatabasePath 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "SQLite validation failed: $($result -join ' ')"
  }
  Write-Host ($result -join ' ')
}

function Copy-OptionalFile([string]$Source, [string]$Destination) {
  if (Test-Path -LiteralPath $Source) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $Destination) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
    return $true
  }
  return $false
}

function Copy-TreeIfPresent([string]$Source, [string]$Destination) {
  if (Test-Path -LiteralPath $Source) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $Destination) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
    return $true
  }
  return $false
}

function Save-CurrentState([string]$DestinationRoot) {
  New-Item -ItemType Directory -Path (Join-Path $DestinationRoot 'data') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $DestinationRoot 'config') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $DestinationRoot 'telegram\data') -Force | Out-Null
  $dbSaved = Copy-OptionalFile $db (Join-Path $DestinationRoot 'data\ryze.sqlite')
  if (-not $dbSaved) { throw 'The current Ryze database is missing; refusing to restore without a rollback point.' }
  if (-not (Test-Path -LiteralPath $envFile)) { throw 'The current Ryze configuration is missing; refusing to restore without a rollback point.' }
  foreach ($sidecar in @('ryze.sqlite-wal', 'ryze.sqlite-shm')) {
    Copy-OptionalFile (Join-Path (Split-Path -Parent $db) $sidecar) (Join-Path $DestinationRoot "data\$sidecar") | Out-Null
  }
  Copy-TreeIfPresent (Join-Path $dataRoot 'files') (Join-Path $DestinationRoot 'data\files') | Out-Null
  Copy-OptionalFile $envFile (Join-Path $DestinationRoot 'config\app.env') | Out-Null
  Copy-OptionalFile (Join-Path $workerRoot 'worker.env') (Join-Path $DestinationRoot 'telegram\worker.env') | Out-Null
  foreach ($suffix in @('.session', '.session-wal', '.session-shm', '.session-journal')) {
    Copy-OptionalFile (Join-Path $workerRoot "data\ryze-user$suffix") (Join-Path $DestinationRoot "telegram\data\ryze-user$suffix") | Out-Null
  }
  $sessionFiles = @()
  foreach ($suffix in @('.session', '.session-wal', '.session-shm', '.session-journal')) {
    if (Test-Path -LiteralPath (Join-Path $workerRoot "data\ryze-user$suffix")) { $sessionFiles += $suffix }
  }
  $manifest = @{
    format = 'ryze-pre-restore-v1'
    filesPresent = Test-Path -LiteralPath (Join-Path $dataRoot 'files')
    workerEnvPresent = Test-Path -LiteralPath (Join-Path $workerRoot 'worker.env')
    sessionFiles = $sessionFiles
  }
  $manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $DestinationRoot 'pre-restore-manifest.json') -Encoding UTF8
  Invoke-DatabaseValidation (Join-Path $DestinationRoot 'data\ryze.sqlite')
}

function Apply-State([string]$SourceRoot) {
  $sourceData = Join-Path $SourceRoot 'data'
  $sourceDb = Join-Path $sourceData 'ryze.sqlite'
  $stateManifestPath = Join-Path $SourceRoot 'restore-state.json'
  if (-not (Test-Path -LiteralPath $stateManifestPath)) { $stateManifestPath = Join-Path $SourceRoot 'pre-restore-manifest.json' }
  if (-not (Test-Path -LiteralPath $stateManifestPath)) { throw 'The staged restore state manifest is missing.' }
  $stateManifest = Get-Content -LiteralPath $stateManifestPath -Raw | ConvertFrom-Json
  New-Item -ItemType Directory -Path (Split-Path -Parent $db) -Force | Out-Null
  Copy-Item -LiteralPath $sourceDb -Destination $db -Force
  foreach ($sidecar in @('ryze.sqlite-wal', 'ryze.sqlite-shm')) {
    $source = Join-Path $sourceData $sidecar
    $destination = Join-Path (Split-Path -Parent $db) $sidecar
    if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $destination -Force }
    elseif (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Force }
  }

  $sourceFiles = Join-Path $sourceData 'files'
  $destinationFiles = Join-Path $dataRoot 'files'
  if (Test-Path -LiteralPath $sourceFiles) {
    if (Test-Path -LiteralPath $destinationFiles) { Remove-Item -LiteralPath $destinationFiles -Recurse -Force }
    Copy-Item -LiteralPath $sourceFiles -Destination $destinationFiles -Recurse -Force
  } elseif (-not $stateManifest.filesPresent -and (Test-Path -LiteralPath $destinationFiles)) {
    Remove-Item -LiteralPath $destinationFiles -Recurse -Force
  }
  $sourceConfig = Join-Path $SourceRoot 'config\app.env'
  if (-not (Test-Path -LiteralPath $sourceConfig)) { throw 'The selected backup does not contain config\app.env.' }
  Copy-Item -LiteralPath $sourceConfig -Destination $envFile -Force

  $sourceTelegram = Join-Path $SourceRoot 'telegram'
  if ($stateManifest.workerEnvPresent -and (Test-Path -LiteralPath (Join-Path $sourceTelegram 'worker.env'))) {
    New-Item -ItemType Directory -Path $workerRoot -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $sourceTelegram 'worker.env') -Destination (Join-Path $workerRoot 'worker.env') -Force
  } elseif (-not $stateManifest.workerEnvPresent -and (Test-Path -LiteralPath (Join-Path $workerRoot 'worker.env'))) {
    Remove-Item -LiteralPath (Join-Path $workerRoot 'worker.env') -Force
  }
  foreach ($suffix in @('.session', '.session-wal', '.session-shm', '.session-journal')) {
    $source = Join-Path $sourceTelegram "data\ryze-user$suffix"
    if ($stateManifest.sessionFiles -contains $suffix -and (Test-Path -LiteralPath $source)) {
      New-Item -ItemType Directory -Path (Join-Path $workerRoot 'data') -Force | Out-Null
      Copy-Item -LiteralPath $source -Destination (Join-Path $workerRoot "data\ryze-user$suffix") -Force
    } elseif ($stateManifest.sessionFiles -notcontains $suffix -and (Test-Path -LiteralPath (Join-Path $workerRoot "data\ryze-user$suffix"))) {
      Remove-Item -LiteralPath (Join-Path $workerRoot "data\ryze-user$suffix") -Force
    }
  }
}

try {
  if (-not (Test-Path -LiteralPath $validator)) { throw 'The restore database validator is missing. No live data was changed.' }
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
  $identity = (& whoami).Trim()
  & icacls.exe $tempRoot /inheritance:r /grant:r "${identity}:(OI)(CI)F" /T /C | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not restrict access to the temporary restore staging directory.' }
  if ((Get-Item -LiteralPath $requestedPath).PSIsContainer -eq $false) {
    if ([IO.Path]::GetExtension($requestedPath) -ine '.zip') { throw 'The selected restore file is not a ZIP archive.' }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($requestedPath)
    try {
      foreach ($entry in $archive.Entries) {
        $entryName = $entry.FullName.Replace('/', '\')
        $allowedEntry = $entryName -match '^(data(\\|$)|config(\\|$)|config\\app\.env$|telegram(\\|$)|manifest\.json$)'
        if (-not $allowedEntry -or [IO.Path]::IsPathRooted($entryName) -or $entryName -match '(^|\\)\.\.(\\|$)' -or $entryName.Contains(':')) {
          throw 'The backup archive contains an unsafe path and was rejected before extraction.'
        }
      }
    } finally { $archive.Dispose() }
    $extractRoot = Join-Path $tempRoot 'expanded'
    Expand-Archive -LiteralPath $requestedPath -DestinationPath $extractRoot -Force
    $expanded = $extractRoot
  }

  $sourceDb = Join-Path $expanded 'data\ryze.sqlite'
  $sourceConfig = Join-Path $expanded 'config\app.env'
  if (-not (Test-Path -LiteralPath $sourceDb)) { throw 'The selected backup does not contain data\ryze.sqlite.' }
  if (-not (Test-Path -LiteralPath $sourceConfig)) { throw 'The selected backup does not contain config\app.env.' }

  $candidateRoot = Join-Path $tempRoot 'candidate'
  New-Item -ItemType Directory -Path (Join-Path $candidateRoot 'data') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $candidateRoot 'config') -Force | Out-Null
  Copy-Item -LiteralPath $sourceDb -Destination (Join-Path $candidateRoot 'data\ryze.sqlite')
  foreach ($sidecar in @('ryze.sqlite-wal', 'ryze.sqlite-shm')) {
    $source = Join-Path (Split-Path -Parent $sourceDb) $sidecar
    if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination (Join-Path $candidateRoot "data\$sidecar") }
  }
  Copy-Item -LiteralPath $sourceConfig -Destination (Join-Path $candidateRoot 'config\app.env')
  if (Test-Path -LiteralPath (Join-Path $expanded 'data\files')) {
    Copy-Item -LiteralPath (Join-Path $expanded 'data\files') -Destination (Join-Path $candidateRoot 'data\files') -Recurse
  }
  if (Test-Path -LiteralPath (Join-Path $expanded 'telegram')) {
    Copy-Item -LiteralPath (Join-Path $expanded 'telegram') -Destination (Join-Path $candidateRoot 'telegram') -Recurse
  }
  $candidateSessionFiles = @()
  foreach ($suffix in @('.session', '.session-wal', '.session-shm', '.session-journal')) {
    if (Test-Path -LiteralPath (Join-Path $candidateRoot "telegram\data\ryze-user$suffix")) { $candidateSessionFiles += $suffix }
  }
  @{
    filesPresent = Test-Path -LiteralPath (Join-Path $candidateRoot 'data\files')
    workerEnvPresent = Test-Path -LiteralPath (Join-Path $candidateRoot 'telegram\worker.env')
    sessionFiles = $candidateSessionFiles
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $candidateRoot 'restore-state.json') -Encoding UTF8
  Write-Host 'Validating selected backup database before touching the installed data.'
  Invoke-DatabaseValidation (Join-Path $candidateRoot 'data\ryze.sqlite')

  if (Test-Path -LiteralPath $preRestore) { throw 'A rollback snapshot with this name already exists; refusing to overwrite it.' }
  New-Item -ItemType Directory -Path $preRestore | Out-Null
  & icacls.exe $preRestore /inheritance:r /grant:r "${identity}:(OI)(CI)F" /T /C | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not restrict access to the pre-restore snapshot.' }
  Write-Host 'Creating and validating a private rollback snapshot of the current Ryze state.'
  Save-CurrentState $preRestore

  $replaceStarted = $true
  try {
    Apply-State $candidateRoot
    if ($SimulatePostReplaceFailure) { throw 'Synthetic rollback drill: requested failure after replacing staged Ryze state.' }
    Invoke-DatabaseValidation $db
    $identity = (& whoami).Trim()
    & icacls.exe $dataRoot /reset /T /C | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'The restored Ryze data ACL repair failed.' }
    if (Test-Path -LiteralPath $envFile) {
      & icacls.exe $envFile /inheritance:r /grant:r "${identity}:F" | Out-Null
      if ($LASTEXITCODE -ne 0) { throw 'Could not restrict access to the restored local configuration.' }
    }
    Invoke-DatabaseValidation $db
    Remove-Item -LiteralPath $requestPath -Force
    Write-Host "Ryze restore applied and validated. Previous state is preserved at: $preRestore" -ForegroundColor Green
  } catch {
    $applyError = $_.Exception.Message
    Write-Error "Restore application failed; attempting automatic rollback from the verified snapshot. Cause: $applyError" -ErrorAction Continue
    try {
      Apply-State $preRestore
      Invoke-DatabaseValidation $db
      & icacls.exe $dataRoot /reset /T /C | Out-Null
      if ($LASTEXITCODE -ne 0) { throw 'Rollback ACL repair failed.' }
      if (Test-Path -LiteralPath $envFile) {
        $identity = (& whoami).Trim()
        & icacls.exe $envFile /inheritance:r /grant:r "${identity}:F" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Rollback configuration ACL repair failed.' }
      }
      Remove-Item -LiteralPath $requestPath -Force
      $rollbackSucceeded = $true
      Write-Warning "Restore was rejected after replacement began; the verified pre-restore snapshot was automatically reapplied and validated. The snapshot remains in the protected backup folder. Cause: $applyError"
    } catch {
      if ($_.Exception.Message -like 'Restore failed and the verified pre-restore snapshot*') { throw }
      throw "CRITICAL: Restore failed and automatic rollback also failed. Do not restart Ryze or delete anything. The verified pre-restore snapshot remains at: $preRestore. Restore error: $applyError. Rollback error: $($_.Exception.Message)"
    }
  }
} catch {
  if (-not $replaceStarted -and (Test-Path -LiteralPath $requestPath)) {
    Remove-Item -LiteralPath $requestPath -Force -ErrorAction SilentlyContinue
    Write-Warning "Selected restore was rejected before current data was changed. The restore request was cleared; start Ryze again normally. Cause: $($_.Exception.Message)"
  } else {
    throw
  }
} finally {
  if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue }
}
if ($rollbackSucceeded) {
  Write-Host '[PASS] Synthetic post-replacement failure triggered; automatic rollback restored and integrity-validated the previous Ryze state.' -ForegroundColor Yellow
}
exit 0
