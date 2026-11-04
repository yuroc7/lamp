@echo off
if not exist "C:\Y7SportBridge\bridge-config.json" (
    echo No Bridge configuration found in C:\Y7SportBridge. Run INSTALL_SERVER.cmd first.
    pause
    exit /b 1
)
start "" notepad.exe "C:\Y7SportBridge\bridge-config.json"
