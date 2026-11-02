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
| Publish | The **Publish** button (Timetable and Messages pages) releases the timetable and automatically sends every active teacher their week by SMS and email. If clashes remain you are warned and must choose "Publish anyway". The last publish time is shown. Sending a single day or a custom message by hand is still available on the Messages page |
| Messages (SMS) | Custom message, a day's timetable, or clash alerts. Africa's Talking by default, Twilio as automatic fallback |
| Messages (Email) | Same three actions by email, using each teacher's email address. Emails are branded HTML (school name and logo in the header) with a plain-text version |
| One-time codes (OTP) | Teachers must enter a 6-digit code after their password at every sign-in. It is sent by email and also by SMS when the teacher has a phone number. Also used for forgot-password |

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
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | blank | Gmail address and Gmail **App Password**. When both are set, real email is sent through Gmail SMTP automatically. When blank, emails are only printed in the backend terminal (test mode) |
| `DEFAULT_FROM_EMAIL` | the Gmail address | Sender shown to recipients |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_BACKEND` | `smtp.gmail.com`, `587`, `true`, auto | Only change these to use a provider other than Gmail |
| `SCHOOL_NAME` | `School Timetable` | Shown in email subjects and bodies |
| `EMAIL_LOGO_PATH` | built-in icon | Full path to your own school logo (PNG, about 96x96) shown in the email header |
| `OTP_LOGIN_ROLES` | `teacher` | Roles that always need a code at sign-in (comma separated: `teacher`, `management`, `admin`) |
| `OTP_LOGIN_REQUIRED` | `false` | `true` asks every role for a code. Users with no email address and no phone skip it |
| `OTP_TTL_MINUTES`, `OTP_RESEND_SECONDS` | `10`, `60` | Code lifetime and resend wait |

### SMS delivery order

1. Phone numbers are normalised to international format (E.164). An invalid number is rejected before any provider is called.
2. The chosen provider is tried first; if it fails and fallback is on, the other provider is tried. Both errors are shown if both fail.
3. If no provider is configured, sending returns HTTP 503 and nothing is logged.

### Setting up Gmail (App Password)

1. Sign in to the Gmail account that will send the emails and turn on **2-Step Verification** (Google Account, Security).
2. Open <https://myaccount.google.com/apppasswords>, create an App Password named e.g. "School Timetable", and copy the 16 characters.
3. In `timetable-backend/.env` set `EMAIL_HOST_USER=you@gmail.com` and `EMAIL_HOST_PASSWORD=` the App Password (spaces are ignored). Never use your normal Gmail password, and never commit `.env`.
4. Restart the backend, open **Messages > Email**: the "Test mode" banner disappears. Send yourself a test message.
5. Gmail limits normal accounts to about 500 emails a day, which is plenty for a school. If a password is ever shared by mistake, delete it on the same Google page and make a new one.

### One-time codes

- 6 digits, stored hashed, expire after `OTP_TTL_MINUTES`, usable once, 5 wrong attempts then locked, a new code replaces the old one, resend wait of `OTP_RESEND_SECONDS`.
- Forgot-password gives the same reply whether or not the email exists.
- A code is sent by every channel available: email, and SMS for a teacher whose record (matched by email) has a phone number while SMS is set up. The same code is sent on both; either works. If one channel fails the other still delivers; if both fail the sign-in is refused with a message.
- Codes are never written to the SMS or email history.
- Without working email or SMS, teachers cannot sign in. With the default console backend the code only appears in the backend terminal, so set up Gmail (and SMS) before teachers start using the system.

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
| `timetable/publish/`, `timetable/publication/` | Admin/management: publish and notify all teachers (`{allow_clashes}` to publish despite clashes; 409 otherwise). Any signed-in user can read the last publication |
| `sms/` and `email/` | Admin/management only. `status/`, `send/`, `send-timetable/`, `send-clash-alerts/`; `GET` lists history |

## Clash rules

Two lessons clash when they share the same day and period and the same teacher, room or class. Names are compared ignoring case and spaces. A blank section means the whole grade. A blank teacher or room never clashes.
