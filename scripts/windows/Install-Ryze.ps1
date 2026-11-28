[CmdletBinding()]
param(
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'Programs\RyzeFramework'),
  [switch]$InstallMemPalaceRuntime
)

$ErrorActionPreference = 'Stop'
$SourceDirectory = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
function Assert-CriticalDeploymentFiles([string]$RootDirectory, [string]$Context) {
  $manifestPath = Join-Path $RootDirectory 'scripts\windows\restore-deployment-manifest.json'
  if (-not (Test-Path -LiteralPath $manifestPath)) { throw "$Context is missing the critical restore deployment manifest." }
  try { $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json } catch { throw "$Context has an unreadable critical restore deployment manifest." }
  if ($manifest.format -ne 'ryze-critical-deployment-v1' -or -not $manifest.criticalFiles) { throw "$Context has an invalid critical restore deployment manifest." }
  foreach ($entry in @($manifest.criticalFiles)) {
    if ([string]::IsNullOrWhiteSpace($entry.path) -or $entry.sha256 -notmatch '^[0-9A-Fa-f]{64}$') { throw "$Context has an invalid critical restore manifest entry." }
    $filePath = Join-Path $RootDirectory ($entry.path -replace '/', '\')
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) { throw "$Context is missing required file $($entry.path)." }
    $actualHash = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($actualHash -ne $entry.sha256.ToUpperInvariant()) { throw "$Context has an unexpected SHA-256 for $($entry.path)." }
  }
}
Assert-CriticalDeploymentFiles $SourceDirectory 'The extracted installer package'
if (-not [Environment]::Is64BitOperatingSystem) { throw 'Ryze requires 64-bit Windows 10 or newer.' }
if (-not $env:LOCALAPPDATA) { throw 'Windows LOCALAPPDATA is unavailable for this account.' }

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js 22 or 24 LTS is required. Install it from https://nodejs.org/ and run this installer again.' }
$nodeMajor = [int](& node -p "Number(process.versions.node.split('.')[0])")
if ($nodeMajor -lt 22 -or $nodeMajor -ge 25) { throw "Node.js 22 or 24 is required; found $(& node --version)." }

if (Test-Path (Join-Path $InstallDirectory '.env')) {
  throw "Local configuration already exists at $InstallDirectory. Install-Ryze.cmd is for first-time installation and will not overwrite it. For an existing installation, extract the ZIP to a temporary folder and run Update-Ryze.cmd. Your current installation and data were not changed."
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
Assert-CriticalDeploymentFiles $InstallDirectory 'The installed Ryze files'

function Invoke-Pnpm {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$PnpmArgs)
  & npx.cmd --yes pnpm@10.18.0 @PnpmArgs
  if ($LASTEXITCODE -ne 0) { throw "pnpm command failed with exit code $LASTEXITCODE." }
}

Push-Location $InstallDirectory
try {
  Write-Host 'Installing locked application dependencies. Internet access is required for this step.'
  # Hoisted links are intentional here: the production server uses native
  # better-sqlite3 and the OpenCode Windows sidecar from direct dependencies.
  # --force repairs a partially-created virtual store left by interrupted or
  # security-scanned installs without copying private source node_modules.
  Invoke-Pnpm install --frozen-lockfile --force --config.node-linker=hoisted
  Write-Host 'Rebuilding native/runtime packages and the OpenCode sidecar.'
  Invoke-Pnpm rebuild @opencode/cli better-sqlite3 --config.node-linker=hoisted
  Write-Host 'Checking the packaged SQLite runtime; no C++ build tools are required.'
  & node -e "const path=require.resolve('better-sqlite3'); const Database=require('better-sqlite3'); const db=new Database(':memory:'); db.close(); console.log(path);"
  if ($LASTEXITCODE -ne 0) { throw 'The installed dependency layout cannot load better-sqlite3. Retry the installer with security software allowing the install directory.' }
  $openCodeExe = Join-Path $InstallDirectory 'node_modules\@opencode\cli\bin\opencode.exe'
  if (-not (Test-Path -LiteralPath $openCodeExe -PathType Leaf)) {
    throw 'The OpenCode Windows sidecar is missing after dependency installation. The install was not accepted; retry with network access and security software allowing pnpm to finish.'
  }
  Invoke-Pnpm run build:local
  if (-not (Test-Path -LiteralPath (Join-Path $InstallDirectory 'dist\index.js') -PathType Leaf)) {
    throw 'The production server bundle dist\index.js was not created; the installation is incomplete.'
  }

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

if ($InstallMemPalaceRuntime) {
  Write-Host 'Preparing the optional isolated MemPalace runtime. SQLite remains the authoritative store.'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $InstallDirectory 'scripts\windows\Install-MemPalaceRuntime.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'Optional MemPalace runtime setup failed. Ryze remains SQLite-only; fix the dependency issue and rerun with /InstallMemPalaceRuntime.' }
} else {
  Write-Host 'Optional MemPalace/Python runtime was not requested; normal Ryze installation remains SQLite-only.'
}

Write-Host ''
Write-Host 'Ryze local installation is prepared.' -ForegroundColor Green
Write-Host "Start it with: $InstallDirectory\scripts\windows\Start-Ryze.cmd"
Write-Host 'Ryze uses local SQLite and files. Configure optional FreeLLMAPI text chat with Configure-FreeLLMAPI.cmd.'
Write-Host 'Optional Telegram private-chat replies and source-bound file transfer are supported; verify the new file workflow on target Windows before relying on it.' -ForegroundColor Yellow
