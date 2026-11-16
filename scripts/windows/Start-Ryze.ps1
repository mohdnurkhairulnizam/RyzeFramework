[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$InstallDirectory = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$EnvFile = Join-Path $InstallDirectory '.env'
if (-not (Test-Path $EnvFile)) { throw 'Ryze is not installed. Run Install-Ryze.cmd first.' }
if (-not (Test-Path (Join-Path $InstallDirectory 'dist\index.js'))) { throw 'The Ryze production build is missing. Preserve the local data folder and .env before repairing the installation; do not rerun the installer over existing data.' }

$DataRoot = Join-Path $env:LOCALAPPDATA 'RyzeFramework'
$Logs = Join-Path $DataRoot 'logs'
$Workspace = Join-Path $DataRoot 'opencode-workspace'
New-Item -ItemType Directory -Path $Logs -Force | Out-Null
$RyzePidFile = Join-Path $DataRoot 'ryze.pid'
$OpenCodePidFile = Join-Path $DataRoot 'opencode.pid'
$Port = 3777
$OpenCodePort = 4096

function Read-DotEnvValue([string]$Name) {
  $line = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match ('^' + [regex]::Escape($Name) + '=') } | Select-Object -Last 1
  if (-not $line) { return '' }
  $value = $line.Substring($Name.Length + 1)
  if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
    try { return ($value | ConvertFrom-Json) } catch { return $value.Trim('"') }
  }
  return $value
}

function Get-OpenCodeHealth([string]$Password) {
  try {
    $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("opencode:$Password"))
    $null = Invoke-RestMethod -Uri "http://127.0.0.1:$OpenCodePort/api/info" -Headers @{ Authorization = "Basic $auth" } -TimeoutSec 2
    return $true
  } catch { return $false }
}

if (Test-Path $RyzePidFile) {
  $oldPid = 0
  [void][int]::TryParse((Get-Content $RyzePidFile -Raw), [ref]$oldPid)
  if ($oldPid -gt 0 -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
    throw "Ryze may already be running (PID $oldPid). Use Stop-Ryze.cmd before starting another copy."
  }
  Remove-Item $RyzePidFile -Force -ErrorAction SilentlyContinue
}

Push-Location $InstallDirectory
try {
  & node (Join-Path $InstallDirectory 'scripts\windows\ensure-opencode-config.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the managed OpenCode configuration.' }
} finally { Pop-Location }

$openCodePassword = Read-DotEnvValue 'RYZE_OPENCODE_SERVER_PASSWORD'
if ($openCodePassword -notmatch '^[a-f0-9]{64}$') { throw 'The protected OpenCode server password is missing or invalid. Preserve the local data and .env before repairing the installation.' }
$freeLlmApiKey = Read-DotEnvValue 'RYZE_FREELLMAPI_API_KEY'
$env:OPENCODE_SERVER_PASSWORD = $openCodePassword
$env:RYZE_FREELLMAPI_API_KEY = $freeLlmApiKey

$openCodeProcess = $null
$openCodeExe = Join-Path $InstallDirectory 'node_modules\@opencode\cli\bin\opencode.exe'
if (-not (Test-Path $openCodeExe)) { throw 'The OpenCode sidecar is missing. Preserve the local data folder and .env before repairing the installation.' }

if (Test-Path $OpenCodePidFile) {
  $oldOpenCodePid = 0
  [void][int]::TryParse((Get-Content $OpenCodePidFile -Raw), [ref]$oldOpenCodePid)
  $oldOpenCode = if ($oldOpenCodePid -gt 0) { Get-CimInstance Win32_Process -Filter "ProcessId = $oldOpenCodePid" -ErrorAction SilentlyContinue } else { $null }
  if ($oldOpenCode) {
    if ($oldOpenCode.Name -notmatch '^opencode(\.exe)?$' -or $oldOpenCode.CommandLine -notmatch '\bserve\b') { throw 'The recorded OpenCode process does not match Ryze. No process was stopped.' }
    if (Get-OpenCodeHealth $openCodePassword) { $openCodeProcess = Get-Process -Id $oldOpenCodePid }
    else { throw 'An OpenCode process is recorded but its authenticated API is not responding. Run Stop-Ryze.cmd and retry.' }
  } else { Remove-Item $OpenCodePidFile -Force -ErrorAction SilentlyContinue }
}

if (-not $openCodeProcess) {
  $opencodeOut = Join-Path $Logs 'opencode.log'
  $opencodeErr = Join-Path $Logs 'opencode-error.log'
  $openCodeProcess = Start-Process -FilePath $openCodeExe -ArgumentList @('serve', '--hostname', '127.0.0.1', '--port', "$OpenCodePort") -WorkingDirectory $Workspace -WindowStyle Hidden -PassThru -RedirectStandardOutput $opencodeOut -RedirectStandardError $opencodeErr
  Set-Content -Path $OpenCodePidFile -Value $openCodeProcess.Id -NoNewline
  $openCodeReady = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    $openCodeProcess.Refresh()
    if ($openCodeProcess.HasExited) { break }
    if (Get-OpenCodeHealth $openCodePassword) { $openCodeReady = $true; break }
  }
  if (-not $openCodeReady) {
    if (-not $openCodeProcess.HasExited) { Stop-Process -Id $openCodeProcess.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item $OpenCodePidFile -Force -ErrorAction SilentlyContinue
    $tail = if (Test-Path $opencodeErr) { (Get-Content $opencodeErr -Tail 20) -join "`n" } else { '' }
    throw "OpenCode did not become ready. Review $opencodeErr. $tail"
  }
}

$stdout = Join-Path $Logs 'server.log'
$stderr = Join-Path $Logs 'server-error.log'
$process = Start-Process -FilePath (Get-Command node).Source -ArgumentList @('dist/index.js') -WorkingDirectory $InstallDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
Set-Content -Path $RyzePidFile -Value $process.Id -NoNewline

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
  Remove-Item $RyzePidFile -Force -ErrorAction SilentlyContinue
  $tail = if (Test-Path $stderr) { (Get-Content $stderr -Tail 30) -join "`n" } else { '' }
  throw "Ryze did not become ready. Review $stderr. $tail"
}
Start-Process 'http://127.0.0.1:3777/'
Write-Host "Ryze dashboard: http://127.0.0.1:$Port/"
Write-Host "OpenCode API: http://127.0.0.1:$OpenCodePort/ (loopback only; authenticated)."
if ([string]::IsNullOrWhiteSpace($freeLlmApiKey)) {
  Write-Host 'AI chat is not configured yet. Run Configure-FreeLLMAPI.cmd from the installed folder.' -ForegroundColor Yellow
} else {
  Write-Host 'FreeLLMAPI key is configured; verify the gateway status in the dashboard.' -ForegroundColor Green
}
Write-Host "Logs: $Logs. Use Stop-Ryze.cmd when finished."
