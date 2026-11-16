@echo off
setlocal
set "SCRIPT=%~dp0scripts\windows\Configure-FreeLLMAPI.ps1"
if not exist "%SCRIPT%" (
  echo.
  echo FreeLLMAPI setup script was not found: "%SCRIPT%"
  pause
  exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
if errorlevel 1 (
  echo.
  echo FreeLLMAPI configuration failed. The PowerShell error is shown above.
  pause
  exit /b 1
)
echo.
pause
