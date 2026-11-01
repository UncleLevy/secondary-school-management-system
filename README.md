# Secondary School Timetable System

A web app for building and managing a secondary school timetable, spotting clashes, and notifying teachers by SMS or email.

- **Backend:** Django 6, Django REST Framework, JWT sign-in (`timetable-backend/`)
- **Frontend:** React, Vite, Tailwind, shadcn/ui (`timetable-frontend/`)
- **Windows one-click scripts:** `windows/` (see [windows/README.md](windows/README.md))

## Features

| Area | What it does |
|---|---|
| Timetable | Weekly grid by class, teacher or room; add, edit and delete lessons; print view |
| Clash warnings | Warns when a teacher, room or class is double-booked in the same day and period |
| Teachers | Teacher records with subjects and phone; teacher dropdown filtered by subject; login accounts for teachers |
| Dashboards | Separate Admin/Management and Teacher dashboards; teachers see only their own schedule |
| Notifications | In-app bell and banners |
| Messages (SMS) | Custom message, a day's timetable, or clash alerts. Africa's Talking by default, Twilio as automatic fallback |
| Messages (Email) | Same three actions by email, using each teacher's email address |
| One-time codes (OTP) | Emailed 6-digit codes for forgot-password, and optionally as a second step at sign-in |

Roles: `admin`, `management` (can send messages), `teacher` (own schedule only).

## Quick start

Backend:

```
cd timetable-backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # then edit it
python manage.py migrate
python manage.py createsuperuser                       # becomes an admin
python manage.py runserver                             # http://localhost:8000
```

Frontend:

```
cd timetable-frontend
npm install
npm run dev                                            # http://localhost:5173
```

Tests: `cd timetable-backend && python manage.py test`

## Configuration (`timetable-backend/.env`)

Never commit this file. All keys are optional; the app runs without SMS or SMTP.

| Setting | Default | Purpose |
|---|---|---|
| `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` | see `.env.example` | Standard Django settings |
| `SMS_PROVIDER` | `africastalking` | `africastalking` or `twilio` |
| `SMS_FALLBACK` | `true` | If the chosen provider fails, retry through the other one (when configured) |
| `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER_ID`, `AT_SANDBOX` | blank | Africa's Talking. Username `sandbox` uses the sandbox; use a sandbox key only with the sandbox username |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` / `TWILIO_MESSAGING_SERVICE_SID` | blank | Twilio |
| `SMS_DEFAULT_COUNTRY_CODE` | `260` | Local numbers like `097…` become `+260…` |
| `EMAIL_BACKEND` | console | Console prints emails in the server terminal (test mode). Use `django.core.mail.backends.smtp.EmailBackend` for real delivery |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | Gmail SMTP defaults, blank login | SMTP details (for Gmail use an App Password) |
| `SCHOOL_NAME` | `School Timetable` | Shown in email subjects and bodies |
| `OTP_LOGIN_REQUIRED` | `false` | `true` asks for an emailed code after the password at every sign-in. Users with no email address skip it |
| `OTP_TTL_MINUTES`, `OTP_RESEND_SECONDS` | `10`, `60` | Code lifetime and resend wait |

### SMS delivery order

1. Phone numbers are normalised to international format (E.164). An invalid number is rejected before any provider is called.
2. The chosen provider is tried first; if it fails and fallback is on, the other provider is tried. Both errors are shown if both fail.
3. If no provider is configured, sending returns HTTP 503 and nothing is logged.

### One-time codes

- 6 digits, stored hashed, expire after `OTP_TTL_MINUTES`, usable once, 5 wrong attempts then locked, a new code replaces the old one, resend wait of `OTP_RESEND_SECONDS`.
- Forgot-password gives the same reply whether or not the email exists.
- Codes need working email. With the default console backend they appear in the backend terminal.

## API summary

All endpoints are under `/api/`. Everything except the public auth routes needs `Authorization: Bearer <access token>`.

| Endpoint | Notes |
|---|---|
| `POST auth/login/` | Returns tokens, or `{otp_required, challenge, email_hint}` when OTP login is on |
| `POST auth/login/verify/` | `{challenge, code}` returns tokens |
| `POST auth/login/resend/` | `{challenge}` sends a new code |
| `POST auth/forgot-password/`, `POST auth/reset-password/` | Public. Reset takes `{email, code, new_password}` |
| `POST auth/refresh/`, `GET auth/me/`, `POST auth/change-password/` | Signed-in users |
| `teachers/`, `class-assignments/`, `timetable/` | CRUD (timetable also has `check-clash/`, `clashes/`, `my-schedule/`) |
| `sms/` and `email/` | Admin/management only. `status/`, `send/`, `send-timetable/`, `send-clash-alerts/`; `GET` lists history |

## Clash rules

Two lessons clash when they share the same day and period and the same teacher, room or class. Names are compared ignoring case and spaces. A blank section means the whole grade. A blank teacher or room never clashes.
