# Field Tracker (Trakby)

Field Tracker is a role-based field operations web app for managing staff, jobs, attendance, location tracking, photo evidence, notifications, and performance reporting.

## Core Modules

- Authentication + device-lock for staff users
- Admin dashboard (jobs, staff, attendance, photos, location history)
- Staff dashboard (assigned jobs, check-in/out, GPS status, photo upload)
- Notifications center + notification bell (realtime updates)
- Analytics and performance insights
- Settings for job types, clients, roles/permissions

## Tech Stack

- React 19 + Vite 7
- Supabase (Auth, Postgres, Realtime, Storage)
- TailwindCSS
- Recharts (analytics)
- Leaflet / React-Leaflet (map views)

## Environment Variables

Create a `.env` file in project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Local Development

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

## Build & Quality Checks

```bash
npm run lint
npm run build
npm run preview
```

## User Roles

- **Admin / Super Admin**
	- Full operational access (jobs, staff, reports, settings)
	- Notifications and analytics visibility
- **Staff**
	- Assigned jobs, attendance actions, location updates, photo uploads
	- Personal notifications and history views

## Operational Notes

- Location and attendance features depend on browser geolocation permission.
- Photo upload requires Supabase Storage bucket configured as expected by app code (`job-photos`).
- Realtime features require Supabase realtime enabled for relevant tables.

## Client UAT + Release Notes

- UAT checklist: [docs/UAT_CHECKLIST.md](docs/UAT_CHECKLIST.md)
- Current release summary: [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md)

## Current Status

- Lint passes
- Production build passes
- Dashboard modules are lazy-loaded for improved initial load performance
