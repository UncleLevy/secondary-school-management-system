@echo off
rem ============================================================
rem  School Timetable System - start Django (backend) + React (frontend)
rem  Usage:  start-system.bat            (opens the browser when ready)
rem          start-system.bat autostart  (no browser; used at Windows start-up)
rem ============================================================
setlocal
title School Timetable System - launcher

set "ROOT=%~dp0.."
set "BACKEND=%ROOT%\st-andrews-backend"
set "FRONTEND=%ROOT%\st-andrews-frontend"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"

if not exist "%BACKEND%\manage.py" (
  echo Could not find the backend folder: %BACKEND%
  pause
  exit /b 1
)
if not exist "%FRONTEND%\package.json" (
  echo Could not find the frontend folder: %FRONTEND%
  pause
  exit /b 1
)

rem ---------- Backend: first-run setup ----------
if not exist "%BACKEND%\venv\Scripts\python.exe" (
  echo [backend] Creating Python environment ^(first run only^)...
  where py >nul 2>&1 && (py -3 -m venv "%BACKEND%\venv") || (python -m venv "%BACKEND%\venv")
  if not exist "%BACKEND%\venv\Scripts\python.exe" (
    echo [backend] Python 3 was not found. Install it from python.org ^(tick "Add python.exe to PATH"^) and run this again.
    pause
    exit /b 1
  )
  echo [backend] Installing packages...
  "%BACKEND%\venv\Scripts\python.exe" -m pip install -r "%BACKEND%\requirements.txt"
  if errorlevel 1 (
    echo [backend] Package install failed. Check your internet connection and run this again.
    rmdir /s /q "%BACKEND%\venv"
    pause
    exit /b 1
  )
)

if not exist "%BACKEND%\.env" (
  if exist "%BACKEND%\.env.example" (
    copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
    echo [backend] Created st-andrews-backend\.env from .env.example - edit it to add your settings ^(e.g. Twilio keys^).
  )
)

echo [backend] Applying database migrations...
"%BACKEND%\venv\Scripts\python.exe" "%BACKEND%\manage.py" migrate --noinput
if errorlevel 1 (
  echo [backend] Migrations failed - see the message above.
  pause
  exit /b 1
)

rem ---------- Frontend: first-run setup ----------
where npm >nul 2>&1
if errorlevel 1 (
  echo [frontend] Node.js was not found. Install the LTS version from nodejs.org and run this again.
  pause
  exit /b 1
)
if not exist "%FRONTEND%\node_modules" (
  echo [frontend] Installing packages ^(first run only^)...
  pushd "%FRONTEND%"
  call npm install
  popd
)

rem ---------- Launch both servers (minimised windows; close them to stop) ----------
echo Starting backend on port %BACKEND_PORT% and frontend on port %FRONTEND_PORT%...
start "School Timetable - Backend" /min /d "%BACKEND%" cmd /k venv\Scripts\python.exe manage.py runserver %BACKEND_PORT% --noreload
start "School Timetable - Frontend" /min /d "%FRONTEND%" cmd /k npm run dev -- --port %FRONTEND_PORT% --strictPort

if /i not "%~1"=="autostart" (
  timeout /t 8 /nobreak >nul
  start "" "http://localhost:%FRONTEND_PORT%"
)

echo Running. You can close this window; use stop-system.bat to shut everything down.
timeout /t 5 /nobreak >nul
exit /b 0
