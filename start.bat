@echo off
setlocal EnableDelayedExpansion
title Pocketbook Launcher
echo ===================================================
echo           Starting Pocketbook Application
echo ===================================================

cd /d "%~dp0"

echo 1. Loading environment variables from .env...
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "k=%%A"
        set "v=%%B"
        if not "!k:~0,1!"=="#" if not "!k!"=="" (
            set "!k!=!v!"
        )
    )
)

echo 2. Launching Backend on http://localhost:8080...
start "Pocketbook Backend (Port 8080)" cmd /k "cd /d "%~dp0backend" && mvn spring-boot:run"

echo 3. Launching Frontend on http://localhost:5500...
start "Pocketbook Frontend (Port 5500)" cmd /k "cd /d "%~dp0frontend" && py -m http.server 5500"

echo 4. Opening Pocketbook in your browser...
timeout /t 6 >nul
start http://localhost:5500

echo ===================================================
echo Pocketbook is starting!
echo - Frontend: http://localhost:5500
echo - Backend:  http://localhost:8080
echo - Swagger:  http://localhost:8080/swagger-ui.html
echo ===================================================
pause
