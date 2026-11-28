@echo off
setlocal
pushd "%~dp0"
set "SCRIPT=%~dp0scripts\windows\Update-Ryze.ps1"
if not exist "%SCRIPT%" (
  echo.
  echo Ryze update script was not found: "%SCRIPT%"
  echo Extract the complete Windows Installer ZIP before running this updater.
  pause
  popd
  exit /b 2
)
echo Updating Ryze application files while preserving your installed configuration and data.
set "MEMPALACE_ARG="
if /I "%~1"=="/InstallMemPalaceRuntime" set "MEMPALACE_ARG=-InstallMemPalaceRuntime"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %MEMPALACE_ARG%
set "RYZE_EXIT=%ERRORLEVEL%"
echo.
if not "%RYZE_EXIT%"=="0" (
  echo Ryze update failed. Review the PowerShell error above; your local database and configuration are preserved.
  echo Press any key to close this diagnostic window.
  pause >nul
  popd
  exit /b %RYZE_EXIT%
)
echo Update completed. Use Start-Ryze.cmd in the installed folder to launch the dashboard.
echo Press any key to close this diagnostic window.
pause >nul
popd
exit /b 0
