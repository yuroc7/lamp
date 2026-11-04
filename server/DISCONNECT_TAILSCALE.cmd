@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0DISCONNECT_TAILSCALE.ps1" %*
set "Y7_SPORT_EXIT=%ERRORLEVEL%"
pause
exit /b %Y7_SPORT_EXIT%
