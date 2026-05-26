@echo off
echo ========================================
echo  MANAS - Kill Ports and Start Frontend
echo ========================================

echo.
echo [1/2] Killing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 2^>nul') do (
    echo     Killing PID %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo [2/2] Port 3000 cleared!
echo.
echo ========================================
echo  Starting MANAS Frontend on port 3000...
echo ========================================
echo.
echo  Open: http://localhost:3000
echo.

cd /d "%~dp0"
npm run dev
