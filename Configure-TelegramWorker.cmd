@echo off
setlocal
pushd "%~dp0"
set "SCRIPT=%~dp0scripts\windows\Configure-TelegramWorker.ps1"
if not exist "%SCRIPT%" (
  echo Telegram configuration script was not found: "%SCRIPT%"
  pause
  popd
  exit /b 2
)
echo Configuring the local Telegram worker. Secrets stay on this computer.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
set "RYZE_EXIT=%ERRORLEVEL%"
if not "%RYZE_EXIT%"=="0" (
  echo.
  echo Telegram worker configuration failed. Review the error above.
  pause
)
popd
exit /b %RYZE_EXIT%
