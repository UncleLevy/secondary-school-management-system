@echo off
rem Removes the start-up shortcut created by install-autostart.bat
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=[Environment]::GetFolderPath('Startup')+'\Secondary School Timetable.lnk'; if (Test-Path $p) { Remove-Item $p; Write-Host 'Removed auto-start.' } else { Write-Host 'Auto-start was not installed.' }"
pause
