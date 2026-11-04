@echo off
setlocal
if not exist "%~dp0START_ACESTREAM.ps1" (
    echo START_ACESTREAM.ps1 is missing. Put this CMD beside it in the extracted Sport folder.
    pause
    exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_ACESTREAM.ps1" %*
set "Y7_SPORT_EXIT=%ERRORLEVEL%"
echo.
if not "%Y7_SPORT_EXIT%"=="0" echo AceStream startup check failed. Read the message above.
pause
exit /b %Y7_SPORT_EXIT%
