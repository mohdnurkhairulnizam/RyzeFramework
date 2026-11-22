@echo off
setlocal
pushd "%~dp0"
set "SCRIPT=%~dp0scripts\windows\Start-TelegramWorker.ps1"
if not exist "%SCRIPT%" (
  echo Telegram worker script was not found: "%SCRIPT%"
  pause
  popd
  exit /b 2
)
set "COMMAND=%~1"
if "%COMMAND%"=="" set "COMMAND=check"
echo Starting the Telegram worker command: %COMMAND%
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
set "RYZE_EXIT=%ERRORLEVEL%"
if not "%RYZE_EXIT%"=="0" (
  echo.
  echo Telegram worker command failed. Review the error above.
  pause
)
popd
exit /b %RYZE_EXIT%
