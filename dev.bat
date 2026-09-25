@echo off
title offer2pr dev (localhost:3000)
cd /d "%~dp0cms"

rem Rule: only one dev instance per machine (a second one exhausts the prod DB pool)
netstat -ano | findstr /r /c:":3000 .*LISTENING" >nul
if %errorlevel%==0 (
    echo [dev] Port 3000 is already in use, not starting a second instance.
    start "" http://localhost:3000
    pause
    exit /b 0
)

if not exist node_modules (
    echo [dev] cms\node_modules missing, running npm install ...
    call npm install
    if errorlevel 1 (
        echo [dev] npm install failed.
        pause
        exit /b 1
    )
)

echo [dev] NOTE: local dev connects to the PRODUCTION database (cms\.env). Close this window when done.
echo [dev] Starting http://localhost:3000 ...
start "" /b cmd /c "timeout /t 8 /nobreak >nul && start "" http://localhost:3000"
call npm run dev
pause
