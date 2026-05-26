@echo off
echo ========================================
echo  MANAS - Kill Ports and Start Backend
echo ========================================

echo.
echo [1/3] Killing processes on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 2^>nul') do (
    echo     Killing PID %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo [2/3] Killing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 2^>nul') do (
    echo     Killing PID %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo [3/3] Ports cleared!
echo.
echo ========================================
echo  Starting MANAS Backend on port 8000...
echo ========================================
echo.
echo  OTP is hardcoded: 123456
echo  API Docs: http://localhost:8000/docs
echo  Frontend: http://localhost:3000
echo.

cd /d "%~dp0"
echo [4/4] Resetting database from scratch...
if exist manas.db (
    del /f /q manas.db
    echo     Database file 'manas.db' deleted successfully!
) else (
    echo     No existing database found. A fresh one will be created.
)
echo.
echo Starting server...
uvicorn main:app --reload --port 8000 --host 0.0.0.0
