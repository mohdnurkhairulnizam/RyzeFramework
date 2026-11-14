$ErrorActionPreference = 'Stop'
$InstallDirectory = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$EnvFile = Join-Path $InstallDirectory '.env'
if (-not (Test-Path $EnvFile)) { throw 'Ryze is not installed. Run Install-Ryze.ps1 first.' }
if (-not (Test-Path (Join-Path $InstallDirectory 'dist\index.js'))) { throw 'Production build is missing. Run Install-Ryze.ps1 again.' }

$DataRoot = Join-Path $env:LOCALAPPDATA 'RyzeFramework'
$Logs = Join-Path $DataRoot 'logs'
New-Item -ItemType Directory -Path $Logs -Force | Out-Null
$PidFile = Join-Path $DataRoot 'ryze.pid'
$Port = 3777

if (Test-Path $PidFile) {
  $oldPid = 0
  [void][int]::TryParse((Get-Content $PidFile -Raw), [ref]$oldPid)
  if ($oldPid -gt 0 -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
    throw "Ryze may already be running (PID $oldPid). Use Stop-Ryze.ps1 before starting another copy."
  }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

$env:NODE_ENV = 'production'
$env:DOTENV_CONFIG_PATH = $EnvFile
$stdout = Join-Path $Logs 'server.log'
$stderr = Join-Path $Logs 'server-error.log'
$process = Start-Process -FilePath (Get-Command node).Source -ArgumentList @('dist/index.js') -WorkingDirectory $InstallDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
Set-Content -Path $PidFile -Value $process.Id -NoNewline

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  $process.Refresh()
  if ($process.HasExited) { break }
  try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2
    if ($response.ok -and $response.localMode) { $ready = $true; break }
  } catch { }
}
if (-not $ready) {
  if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  $tail = if (Test-Path $stderr) { (Get-Content $stderr -Tail 30) -join "`n" } else { '' }
  throw "Ryze did not become ready. Review $stderr. $tail"
}
Start-Process 'http://127.0.0.1:3777/'
Write-Host "Ryze is running at http://127.0.0.1:$Port/ (PID $($process.Id))."
Write-Host "Logs: $Logs. Use Stop-Ryze.ps1 when you are finished."
