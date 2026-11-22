[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$InstallDirectory = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$EnvFile = Join-Path $InstallDirectory '.env'
if (-not (Test-Path $EnvFile)) { throw 'Ryze is not installed. Run Install-Ryze.cmd first.' }
$DataRoot = Join-Path $env:LOCALAPPDATA 'RyzeFramework'
foreach ($pidName in @('ryze.pid', 'opencode.pid')) {
  $pidFile = Join-Path $DataRoot $pidName
  if (Test-Path $pidFile) {
    $runningPid = 0
    [void][int]::TryParse((Get-Content -LiteralPath $pidFile -Raw), [ref]$runningPid)
    if ($runningPid -gt 0 -and (Get-Process -Id $runningPid -ErrorAction SilentlyContinue)) {
      throw 'Stop Ryze with Stop-Ryze.cmd before changing gateway settings, then run this helper again.'
    }
  }
}

Write-Host 'Enter the OpenAI-compatible FreeLLMAPI API base URL shown by your gateway.'
Write-Host 'For hosted services use HTTPS and include the API base path (often /v1). Do not include a key.'
$baseUrl = Read-Host 'FreeLLMAPI API base URL'
if ([string]::IsNullOrWhiteSpace($baseUrl)) { throw 'A FreeLLMAPI API base URL is required.' }
$model = Read-Host 'Model ID (press Enter to use auto)'
if ([string]::IsNullOrWhiteSpace($model)) { $model = 'auto' }
$key = Read-Host 'Paste the FreeLLMAPI unified API key (input is hidden)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($key)
$inputBytes = $null
$encoded = $null
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $payload = @{ baseUrl = $baseUrl.Trim(); model = $model.Trim(); apiKey = $plain } | ConvertTo-Json -Compress
  $inputBytes = [Text.Encoding]::UTF8.GetBytes($payload)
  $encoded = [Convert]::ToBase64String($inputBytes)
  Push-Location $InstallDirectory
  try {
    $encoded | & node (Join-Path $InstallDirectory 'scripts\windows\configure-freellmapi.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'The FreeLLMAPI settings were not saved. Review the validation message above.' }
  } finally { Pop-Location }
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  if ($key) { $key.Dispose() }
  if ($inputBytes) { [Array]::Clear($inputBytes, 0, $inputBytes.Length) }
  $plain = $null
  $payload = $null
  $encoded = $null
  $inputBytes = $null
}
Write-Host 'Settings saved. Run Start-Ryze.cmd, sign in, and check the OpenCode + FreeLLMAPI status.' -ForegroundColor Green
Write-Host 'Prompts sent to the gateway leave this computer. OpenCode tools remain denied.' -ForegroundColor Yellow
