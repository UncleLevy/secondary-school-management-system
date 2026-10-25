@echo off
rem Stops the backend (port 8000) and frontend (port 5173) started by start-system.bat
echo Stopping School Timetable System...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
taskkill /fi "WINDOWTITLE eq School Timetable - Backend*" /t /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq School Timetable - Frontend*" /t /f >nul 2>&1
echo Done.
timeout /t 3 >nul
