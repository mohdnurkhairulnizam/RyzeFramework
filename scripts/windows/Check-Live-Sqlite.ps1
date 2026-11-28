[CmdletBinding()]
param(
  [string]$DatabasePath = (Join-Path $env:LOCALAPPDATA 'RyzeFramework\data\ryze.sqlite'),
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$install = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$checker = Join-Path $install 'scripts\windows\check-live-sqlite.mjs'
if (-not (Test-Path -LiteralPath $checker -PathType Leaf)) { throw "Live SQLite checker was not found: $checker" }
if (-not (Test-Path -LiteralPath $DatabasePath -PathType Leaf)) { throw "SQLite database was not found: $DatabasePath" }

$result = & node $checker $DatabasePath 2>&1
$exitCode = $LASTEXITCODE
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $result | Write-Output
} else {
  $result | Tee-Object -FilePath $OutputPath
}
if ($exitCode -ne 0) { throw 'Read-only live SQLite check failed. No database changes were made.' }
Write-Host ''
Write-Host 'Persistence procedure: save the memory_sha256 line, stop/start Ryze, then rerun this same command. The memory_sha256 and counts should remain unchanged unless a deliberate owner-approved memory change occurred.' -ForegroundColor Cyan
