@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js 18 or newer is required. Get it from https://nodejs.org & pause & exit /b 1)
echo Starting the Custom Genie studio. Keep this window open while you use it.
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8765/"
node server.mjs
pause
