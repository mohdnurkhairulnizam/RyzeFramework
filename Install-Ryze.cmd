@echo off
setlocal

echo Installing Ryze. Keep this window open until setup finishes.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\Install-Ryze.ps1"
set "RYZE_EXIT=%ERRORLEVEL%"
echo.
if not "%RYZE_EXIT%"=="0" (
  echo Ryze installation failed. Read the PowerShell error above.
) else (
  echo Ryze installation completed.
)
echo.
echo Press any key to close this diagnostic window.
pause >nul
exit /b %RYZE_EXIT%
