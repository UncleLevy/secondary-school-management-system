# Run on Windows

One-time requirements: **Python 3** (tick "Add python.exe to PATH") and **Node.js LTS**.

| Script | What it does |
|---|---|
| `start-system.bat` | Starts the Django backend (port 8000) and React frontend (port 5173) in minimised windows and opens the app in your browser. First run also creates the Python environment, installs packages and applies migrations. |
| `install-autostart.bat` | Starts the system automatically each time you sign in to Windows (adds a shortcut to your Startup folder; no admin rights needed). |
| `uninstall-autostart.bat` | Turns auto-start off. |
| `stop-system.bat` | Stops both servers. |

Notes
- The backend settings live in `timetable-backend\.env` (created from `.env.example` on first run). Add your SMS keys (AT_USERNAME and AT_API_KEY for Africa's Talking) and, for real emails, your SMTP details (EMAIL_BACKEND, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD) there. Set OTP_LOGIN_REQUIRED=true to ask for an emailed code at sign-in. Then run `stop-system.bat` and `start-system.bat`.
- After pulling updates that change `requirements.txt` or `package.json`, delete `timetable-backend\venv` and/or `timetable-frontend\node_modules` and start again to reinstall.
- This runs the development servers, which is fine for a single school PC. For a shared/production setup, build the frontend (`npm run build`) and serve it with a proper web server.
- Without SMTP settings, emails and codes are only printed in the backend window (test mode). Anyone who forgets a password needs working email to reset it; an administrator can also reset a teacher's password on the Teachers page.
- All settings are explained in the main [README](../README.md).
