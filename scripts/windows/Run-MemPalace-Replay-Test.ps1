param(
  [string]$RuntimeRoot = (Join-Path $env:TEMP 'ryze-mempalace-windows-replay')
)

$ErrorActionPreference = 'Stop'

$install = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$pythonLauncher = Get-Command py.exe -ErrorAction SilentlyContinue
if (-not $pythonLauncher) { throw 'Python Launcher (py.exe) was not found. Install Python 3.12 for the disposable MemPalace test.' }

$venv = Join-Path $RuntimeRoot 'venv'
$python = Join-Path $venv 'Scripts\python.exe'
$mempalace = Join-Path $venv 'Scripts\mempalace.exe'
$mcp = Join-Path $venv 'Scripts\mempalace-mcp.exe'
$source = Join-Path $RuntimeRoot 'source'
$palace = Join-Path $RuntimeRoot 'palace'
New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
New-Item -ItemType Directory -Path $source -Force | Out-Null

if (-not (Test-Path -LiteralPath $python)) {
  Write-Host 'Creating disposable Python 3.12 environment.'
  & py.exe -3.12 -m venv $venv
  if ($LASTEXITCODE -ne 0) { throw 'Could not create the disposable Python 3.12 environment.' }
  & $python -m pip install --upgrade pip
  & $python -m pip install 'git+https://github.com/MemPalace/mempalace.git@v3.12.0'
  if ($LASTEXITCODE -ne 0) { throw 'Pinned MemPalace v3.12.0 installation failed.' }
}

if (-not (Test-Path -LiteralPath $mempalace) -or -not (Test-Path -LiteralPath $mcp)) {
  throw "Pinned MemPalace executables were not found under $venv."
}

@'
# Synthetic Windows replay fixture A
Owner-approved synthetic preference for the Ryze MemPalace projection restart test.
'@ | Set-Content -LiteralPath (Join-Path $source 'fixture-a.md') -Encoding UTF8
@'
# Synthetic Windows replay fixture B
Synthetic provider-unavailable and replay fixture; contains no private data.
'@ | Set-Content -LiteralPath (Join-Path $source 'fixture-b.md') -Encoding UTF8

if (-not (Test-Path -LiteralPath (Join-Path $palace 'config.json'))) {
  Write-Host 'Creating disposable synthetic MemPalace palace.'
  & $mempalace init $source --palace $palace --yes --auto-mine --no-llm --embedding-model minilm --direct
  if ($LASTEXITCODE -ne 0) { throw 'Synthetic MemPalace palace initialization failed.' }
}

Write-Host 'Running provider-unavailable, MCP restart, search rehydration, and deletion checks.'
& npx.cmd --yes tsx@4.19.1 (Join-Path $install 'scripts\mempalace-replay-smoke.ts') --palace $palace --command $mcp
if ($LASTEXITCODE -ne 0) { throw 'Real Windows MemPalace projection replay smoke test failed.' }

Write-Host "PASS: real pinned MemPalace Windows MCP replay test completed. Synthetic palace: $palace" -ForegroundColor Green
Write-Host 'The test did not use the live Ryze database, live routers, or private data.'
