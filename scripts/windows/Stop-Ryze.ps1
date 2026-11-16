$ErrorActionPreference = 'Stop'
$DataRoot = Join-Path $env:LOCALAPPDATA 'RyzeFramework'
$RyzePidFile = Join-Path $DataRoot 'ryze.pid'
$OpenCodePidFile = Join-Path $DataRoot 'opencode.pid'
$stopped = @()

if (Test-Path $RyzePidFile) {
  $targetPid = 0
  if (-not [int]::TryParse((Get-Content $RyzePidFile -Raw), [ref]$targetPid) -or $targetPid -le 0) {
    throw 'The saved Ryze process ID is invalid; no process was stopped.'
  }
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $targetPid" -ErrorAction SilentlyContinue
  if (-not $proc) {
    Remove-Item $RyzePidFile -Force
    Write-Host 'The recorded Ryze process has already stopped.'
  } else {
    if ($proc.Name -notmatch '^node(\.exe)?$' -or $proc.CommandLine -notmatch 'dist[\\/]index\.js') {
      throw 'The recorded process does not look like Ryze. No process was stopped; inspect the PID file manually.'
    }
    Stop-Process -Id $targetPid -ErrorAction Stop
    Remove-Item $RyzePidFile -Force
    $stopped += 'Ryze'
  }
}

if (Test-Path $OpenCodePidFile) {
  $openCodePid = 0
  if (-not [int]::TryParse((Get-Content $OpenCodePidFile -Raw), [ref]$openCodePid) -or $openCodePid -le 0) {
    throw 'The saved OpenCode process ID is invalid; no OpenCode process was stopped.'
  }
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $openCodePid" -ErrorAction SilentlyContinue
  if (-not $proc) {
    Remove-Item $OpenCodePidFile -Force
    Write-Host 'The recorded OpenCode process has already stopped.'
  } else {
    if ($proc.Name -notmatch '^opencode(\.exe)?$' -or $proc.CommandLine -notmatch '\bserve\b') {
      throw 'The recorded OpenCode process does not match the Ryze server. No OpenCode process was stopped.'
    }
    Stop-Process -Id $openCodePid -ErrorAction Stop
    Remove-Item $OpenCodePidFile -Force
    $stopped += 'OpenCode'
  }
}

if ($stopped.Count -gt 0) { Write-Host ("Stopped: " + ($stopped -join ' and ') + '.') }
elseif (-not (Test-Path $RyzePidFile) -and -not (Test-Path $OpenCodePidFile)) { Write-Host 'Ryze and its OpenCode service are not marked as running.' }
