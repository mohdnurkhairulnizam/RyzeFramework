[CmdletBinding()]
param(
  [ValidateSet('check','login','run')]
  [string]$Command = 'check',
  [string]$WorkerRoot = (Join-Path $env:LOCALAPPDATA 'RyzeFramework\telegram-worker')
)

$ErrorActionPreference = 'Stop'
$envFile = Join-Path $WorkerRoot 'worker.env'
$python = Join-Path $WorkerRoot '.venv\Scripts\python.exe'
$entry = Join-Path $PSScriptRoot '..\..\worker\ryze_telegram_worker.py'
if (-not (Test-Path -LiteralPath $envFile)) { throw "Telegram worker is not configured. Run Configure-TelegramWorker.ps1 first." }
if (-not (Test-Path -LiteralPath $python)) { throw "Telegram worker Python environment is missing: $python" }
if (-not (Test-Path -LiteralPath $entry)) { throw "Telegram worker entry point is missing: $entry" }

foreach ($line in Get-Content -LiteralPath $envFile) {
  $trimmed = $line.Trim()
  if (!$trimmed -or $trimmed.StartsWith('#') -or $trimmed -notmatch '=') { continue }
  $name, $value = $trimmed.Split('=', 2)
  $name = $name.Trim().TrimStart([char]0xFEFF)
  $value = $value.Trim().Trim('"').Trim("'")
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}
$env:PYTHONUNBUFFERED = '1'
$env:NO_PROXY = '127.0.0.1,localhost'

& $python -u $entry $Command
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) { throw "Telegram worker '$Command' exited with code $exitCode." }
