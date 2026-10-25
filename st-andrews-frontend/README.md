# School Timetable System (Frontend)

A React + Vite + Tailwind CSS + shadcn/ui frontend for the school timetable system, talking to the Django REST backend in `st-andrews-backend`.

## Prerequisites

- Node.js 18+
- The Django backend running locally (see `st-andrews-backend/README` / `manage.py runserver`), by default at `http://localhost:8000`

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. (Optional) Create a `.env.local` file if the backend isn't running on the default URL:
   ```
   VITE_API_URL=http://localhost:8000/api
   ```
3. Run the app:
   ```
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

## Build

```
npm run build
```

Output is written to `dist/`.
