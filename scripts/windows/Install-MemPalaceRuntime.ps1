[CmdletBinding()]
param(
  [string]$RuntimeRoot = (Join-Path $env:LOCALAPPDATA 'RyzeFramework\mempalace-runtime')
)

$ErrorActionPreference = 'Stop'
$MemPalaceCommit = '4df7b830ff1398332d4118884520a24f1aab9cc1'
$MemPalaceSource = "https://github.com/MemPalace/mempalace/archive/$MemPalaceCommit.zip"

function Get-Python312 {
  $launcher = Get-Command py.exe -ErrorAction SilentlyContinue
  if (-not $launcher) { return $null }
  try {
    $version = (& py.exe -3.12 --version 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -eq 0 -and $version -match 'Python 3\.12\.') { return 'py.exe' }
  } catch { }
  return $null
}

$pythonCommand = Get-Python312
if (-not $pythonCommand) {
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw 'MemPalace runtime requires Python 3.12.x. Python 3.12 and winget were not found; install Python 3.12 (64-bit) with the Python Launcher, then rerun with /InstallMemPalaceRuntime.'
  }
  Write-Host 'Python 3.12 was not found. Installing the user-scoped Python 3.12 package through winget.'
  & winget.exe install --id Python.Python.3.12 --exact --scope user --accept-package-agreements --accept-source-agreements --disable-interactivity
  if ($LASTEXITCODE -ne 0) { throw "winget could not install Python 3.12 (exit $LASTEXITCODE). Install Python 3.12 manually and rerun." }
  $pythonCommand = Get-Python312
  if (-not $pythonCommand) { throw 'Python 3.12 installation completed but py.exe could not resolve it yet. Open a new PowerShell window, verify py -3.12 --version, and rerun.' }
}

$venv = Join-Path $RuntimeRoot 'venv'
$python = Join-Path $venv 'Scripts\python.exe'
$mempalace = Join-Path $venv 'Scripts\mempalace.exe'
$mcp = Join-Path $venv 'Scripts\mempalace-mcp.exe'
New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null

if (-not (Test-Path -LiteralPath $python)) {
  Write-Host 'Creating the isolated MemPalace Python environment.'
  & py.exe -3.12 -m venv $venv
  if ($LASTEXITCODE -ne 0) { throw 'Could not create the MemPalace Python 3.12 virtual environment.' }
}

Write-Host 'Installing pinned MemPalace v3.12.0 from commit 4df7b830ff1398332d4118884520a24f1aab9cc1.'
& $python -m pip install --disable-pip-version-check --no-input --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'Could not upgrade pip in the isolated MemPalace environment.' }
& $python -m pip install --disable-pip-version-check --no-input $MemPalaceSource
if ($LASTEXITCODE -ne 0) { throw 'Could not install the pinned MemPalace source revision.' }

if (-not (Test-Path -LiteralPath $mempalace) -or -not (Test-Path -LiteralPath $mcp)) {
  throw "Pinned MemPalace installation did not create the expected CLI/MCP entry points under $venv."
}

Write-Host 'MemPalace runtime dependency check: PASS' -ForegroundColor Green
Write-Host "Python environment: $venv"
Write-Host "MCP executable: $mcp"
Write-Host 'MemPalace remains disabled in normal Ryze routers; this runtime is only prepared for the opt-in projection/replay checks.'
