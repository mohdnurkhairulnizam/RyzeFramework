[CmdletBinding()]
param(
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'Programs\RyzeFramework')
)

$ErrorActionPreference = 'Stop'
$SourceDirectory = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not [Environment]::Is64BitOperatingSystem) { throw 'Ryze requires 64-bit Windows 10 or newer.' }
if (-not $env:LOCALAPPDATA) { throw 'Windows LOCALAPPDATA is unavailable for this account.' }

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js 22 or 24 LTS is required. Install it from https://nodejs.org/ and run this installer again.' }
$nodeMajor = [int](& node -p "Number(process.versions.node.split('.')[0])")
if ($nodeMajor -lt 22 -or $nodeMajor -ge 25) { throw "Node.js 22 or 24 is required; found $(& node --version)." }

if (Test-Path (Join-Path $InstallDirectory '.env')) {
  throw "Local configuration already exists at $InstallDirectory. This script will not overwrite it; use the existing installation's upgrade procedure."
}
if ((Resolve-Path -LiteralPath $SourceDirectory).Path -eq [IO.Path]::GetFullPath($InstallDirectory)) {
  throw 'Extract the ZIP to a temporary folder; do not install over the extracted package.'
}

New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null
$excludeDirs = @(
  (Join-Path $SourceDirectory '.git'),
  (Join-Path $SourceDirectory 'node_modules'),
  (Join-Path $SourceDirectory 'dist'),
  (Join-Path $SourceDirectory 'data'),
  (Join-Path $SourceDirectory 'local-storage'),
  (Join-Path $SourceDirectory 'worker\data'),
  (Join-Path $SourceDirectory 'worker\.venv')
)
& robocopy.exe $SourceDirectory $InstallDirectory /E /NFL /NDL /NJH /NJS /NC /NS /XD $excludeDirs /XF '.env' '.env.local'
if ($LASTEXITCODE -ge 8) { throw "Copying the installer files failed (robocopy exit $LASTEXITCODE)." }

function Invoke-Pnpm {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$PnpmArgs)
  & npx.cmd --yes pnpm@10.18.0 @PnpmArgs
  if ($LASTEXITCODE -ne 0) { throw "pnpm command failed with exit code $LASTEXITCODE." }
}

Push-Location $InstallDirectory
try {
  Write-Host 'Installing locked application dependencies. Internet access is required for this step.'
  Invoke-Pnpm install --frozen-lockfile
  Write-Host 'Checking the packaged SQLite runtime; no C++ build tools are required.'
  & node -e "const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.close();"
  if ($LASTEXITCODE -ne 0) { throw 'The bundled SQLite runtime could not be loaded.' }
  Invoke-Pnpm run build:local

  if (Test-Path '.env') { throw 'Refusing to replace an existing local .env file.' }
  $password = Read-Host 'Create an owner password (6+ characters; a 6-digit PIN is less secure)' -AsSecureString
  $confirmation = Read-Host 'Enter the owner password again' -AsSecureString
  $p1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
  $p2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmation)
  try {
    $plain1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($p1)
    $plain2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($p2)
    if ($plain1.Length -lt 6) { throw 'Use at least 6 characters for the owner password.' }
    if ($plain1 -ne $plain2) { throw 'The two password entries did not match.' }
    $passwordBytes = [Text.Encoding]::UTF8.GetBytes($plain1)
    $encodedPassword = [Convert]::ToBase64String($passwordBytes)
    $encodedPassword | & node (Join-Path $InstallDirectory 'scripts\windows\create-local-config.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Could not create local configuration.' }
    [Array]::Clear($passwordBytes, 0, $passwordBytes.Length)
    $encodedPassword = $null
  } finally {
    if ($p1 -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p1) }
    if ($p2 -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p2) }
    if ($passwordBytes) { [Array]::Clear($passwordBytes, 0, $passwordBytes.Length) }
    if ($password) { $password.Dispose() }
    if ($confirmation) { $confirmation.Dispose() }
    $plain1 = $null
    $plain2 = $null
    $passwordBytes = $null
    $encodedPassword = $null
  }

  $identity = (& whoami).Trim()
  $envFile = Join-Path $InstallDirectory '.env'
  & icacls.exe $envFile /inheritance:r /grant:r "${identity}:F" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not restrict access to the local configuration file.' }
  $localData = Join-Path $env:LOCALAPPDATA 'RyzeFramework'
  New-Item -ItemType Directory -Path $localData -Force | Out-Null
  & icacls.exe $localData /inheritance:r /grant:r "${identity}:(OI)(CI)F" /T /C | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not restrict access to the local database and files directory.' }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'Ryze local installation is prepared.' -ForegroundColor Green
Write-Host "Start it with: $InstallDirectory\scripts\windows\Start-Ryze.cmd"
Write-Host 'Ryze uses local SQLite and files. Configure optional FreeLLMAPI text chat with Configure-FreeLLMAPI.cmd.'
Write-Host 'Optional Telegram inbound-only setup is available from scripts\windows\Configure-TelegramWorker.ps1; outbound replies remain disabled.' -ForegroundColor Yellow
