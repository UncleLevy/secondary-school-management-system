@echo off
rem Makes the system start automatically when you sign in to Windows.
rem Adds a shortcut to your Startup folder (no administrator rights needed).
setlocal
set "TARGET=%~dp0start-system.bat"
set "WD=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=[Environment]::GetFolderPath('Startup')+'\Secondary School Timetable.lnk'; $s=(New-Object -ComObject WScript.Shell).CreateShortcut($p); $s.TargetPath=$env:TARGET; $s.Arguments='autostart'; $s.WorkingDirectory=$env:WD; $s.WindowStyle=7; $s.Save(); Write-Host ('Created: ' + $p)"
if errorlevel 1 (
  echo Could not create the start-up shortcut.
) else (
  echo.
  echo Done. The system will now start by itself each time you sign in to Windows.
  echo Run uninstall-autostart.bat to turn this off.
)
pause
