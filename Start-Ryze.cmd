@echo off
setlocal
pushd "%~dp0"
set "SCRIPT=%~dp0scripts\windows\Start-Ryze.ps1"
if not exist "%SCRIPT%" (
  echo.
  echo Ryze start script was not found: "%SCRIPT%"
  pause
  popd
  exit /b 2
)
echo Starting Ryze. The dashboard will open in your browser when ready.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "RYZE_EXIT=%ERRORLEVEL%"
echo.
if not "%RYZE_EXIT%"=="0" (
  echo Ryze failed to start. Review the PowerShell error above.
  echo Server logs: "%LOCALAPPDATA%\RyzeFramework\logs"
  echo.
  echo Press any key to close this diagnostic window.
  pause >nul
  popd
  exit /b %RYZE_EXIT%
)
echo Startup completed. Dashboard: http://127.0.0.1:3777/
echo Ryze continues running in the background. Use Stop-Ryze.cmd to stop it.
echo Press any key to close this diagnostic window.
pause >nul
popd
exit /b 0
