[CmdletBinding()]
param(
  [string]$InstallDirectory
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($InstallDirectory)) { $InstallDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path }
$workerRoot = Join-Path $env:LOCALAPPDATA 'RyzeFramework\telegram-worker'
$workerData = Join-Path $workerRoot 'data'
$workerEnv = Join-Path $workerRoot 'worker.env'
$workerSource = Join-Path $InstallDirectory 'worker'
$python = Get-Command py -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command python -ErrorAction SilentlyContinue }
if (-not $python) { throw 'Python 3.10 or newer is required. Install Python from https://www.python.org/ and run this setup again.' }

$appEnv = Join-Path $InstallDirectory '.env'
if (-not (Test-Path -LiteralPath $appEnv)) { throw "Ryze local configuration was not found: $appEnv" }
$tokenLine = Get-Content -LiteralPath $appEnv | Where-Object { $_ -match '^RYZE_WORKER_TOKEN=' } | Select-Object -First 1
$tokenWasAdded = $false
if (-not $tokenLine) {
  $workerToken = (& node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))").Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($workerToken)) { throw 'Could not generate the local Telegram worker token.' }
  Add-Content -LiteralPath $appEnv -Value "RYZE_WORKER_TOKEN=$workerToken" -Encoding UTF8
  $tokenWasAdded = $true
  Write-Host 'Added a local Telegram worker token to the existing Ryze configuration.' -ForegroundColor Green
} else {
  $workerToken = $tokenLine.Substring('RYZE_WORKER_TOKEN='.Length).Trim().Trim('"')
  if (-not $workerToken) { throw 'The existing RYZE_WORKER_TOKEN is empty. Run the Ryze updater to repair the local configuration.' }
}

$apiId = Read-Host 'Telegram API ID (numeric; entered only on this computer)'
if ($apiId -notmatch '^\d+$') { throw 'Telegram API ID must be numeric.' }
$apiHashSecure = Read-Host 'Telegram API hash (hidden)' -AsSecureString
$phone = Read-Host 'Telegram phone number, including country code (for example +60123456789)'
$allowed = Read-Host 'Approved Telegram chat ID(s), comma-separated (required)'
if ([string]::IsNullOrWhiteSpace($allowed)) { throw 'At least one approved Telegram chat ID is required.' }
$workerId = Read-Host 'Worker ID (press Enter for primary)'
if ([string]::IsNullOrWhiteSpace($workerId)) { $workerId = 'primary' }

$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiHashSecure)
try { $apiHash = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr); $apiHashSecure.Dispose() }

New-Item -ItemType Directory -Force -Path $workerRoot, $workerData | Out-Null
$venv = Join-Path $workerRoot '.venv'
if (-not (Test-Path (Join-Path $venv 'Scripts\python.exe'))) {
  & $python.Source -m venv $venv
  if ($LASTEXITCODE -ne 0) { throw 'Could not create the Telegram worker Python environment.' }
}
$venvPython = Join-Path $venv 'Scripts\python.exe'
& $venvPython -m pip install --disable-pip-version-check -r (Join-Path $workerSource 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Could not install the Telegram worker dependency.' }

$session = Join-Path $workerData 'ryze-user'
$lines = @(
  'RYZE_API_BASE_URL=http://127.0.0.1:3777',
  "RYZE_WORKER_TOKEN=$workerToken",
  "RYZE_WORKER_ID=$workerId",
  "TELEGRAM_API_ID=$apiId",
  "TELEGRAM_API_HASH=$apiHash",
  "TELEGRAM_PHONE=$phone",
  "TELEGRAM_SESSION_PATH=$session",
  "TELEGRAM_ALLOWED_CHAT_IDS=$allowed",
  'RYZE_WORKER_VERSION=0.1.0-inbound-only'
)
Set-Content -LiteralPath $workerEnv -Value $lines -Encoding UTF8
$identity = (& whoami).Trim()
& icacls.exe $workerRoot /inheritance:r /grant:r "${identity}:(OI)(CI)F" /T /C | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not protect the Telegram worker directory.' }

Write-Host ''
Write-Host 'Telegram worker configuration saved locally.' -ForegroundColor Green
Write-Host 'Outbound Telegram replies remain disabled.' -ForegroundColor Yellow
if ($tokenWasAdded) { Write-Host 'Restart Ryze before running the worker check so the server loads the new token.' -ForegroundColor Yellow }
Write-Host "Next: use Start-TelegramWorker.cmd check, then login, then run."
