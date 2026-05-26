@echo off
title MANAS Platform Launcher
echo ====================================================
echo  MANAS Platform - Starting Backend and Frontend
echo ====================================================
echo.
echo  [1/2] Launching Backend Server (resets database)...
start "MANAS Backend" cmd /c "cd /d %~dp0backend && start.bat"

echo  [2/2] Launching Frontend Webpack Dev Server...
start "MANAS Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo  ====================================================
echo  Both servers have been launched in separate windows!
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:8000
echo  ====================================================
echo.
pause
