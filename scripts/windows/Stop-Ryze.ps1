$ErrorActionPreference = 'Stop'
$DataRoot = Join-Path $env:LOCALAPPDATA 'RyzeFramework'
$PidFile = Join-Path $DataRoot 'ryze.pid'
if (-not (Test-Path $PidFile)) { Write-Host 'Ryze is not marked as running.'; exit 0 }

$targetPid = 0
if (-not [int]::TryParse((Get-Content $PidFile -Raw), [ref]$targetPid) -or $targetPid -le 0) {
  Remove-Item $PidFile -Force
  throw 'The saved Ryze process ID is invalid; no process was stopped.'
}
$proc = Get-CimInstance Win32_Process -Filter "ProcessId = $targetPid" -ErrorAction SilentlyContinue
if (-not $proc) {
  Remove-Item $PidFile -Force
  Write-Host 'The recorded Ryze process has already stopped.'
  exit 0
}
if ($proc.Name -notmatch '^node(\.exe)?$' -or $proc.CommandLine -notmatch 'dist[\\/]index\.js') {
  throw 'The recorded process does not look like Ryze. No process was stopped; inspect the PID file manually.'
}
Stop-Process -Id $targetPid -ErrorAction Stop
Remove-Item $PidFile -Force
Write-Host 'Ryze has stopped.'
