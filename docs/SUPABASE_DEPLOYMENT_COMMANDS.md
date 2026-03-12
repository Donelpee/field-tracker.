# Supabase Deployment Commands (Trackby)

Project ref detected from your current `.env.local`:
- `halobiukgyvlrhplahuy`

## 1) Install and login

```bash
npm install -g supabase
supabase login
```

## 2) Link this repo to your Supabase project

Run from repo root:

```bash
supabase link --project-ref halobiukgyvlrhplahuy
```

## 3) Apply SQL migration for ticketing schema

```bash
supabase db push
```

If you are not using local migration folders, run this manually in SQL editor:
- `docs/TICKETING_SCHEMA_AND_API.sql`

## 4) Set required Edge Function secrets

```bash
supabase secrets set SUPABASE_URL=https://halobiukgyvlrhplahuy.supabase.co
supabase secrets set SUPABASE_ANON_KEY=YOUR_ANON_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase secrets set CUSTOMER_PORTAL_BASE_URL=https://your-customer-portal-domain
```

## 5) Deploy shared ticketing functions

```bash
supabase functions deploy ticketing-create-ticket
supabase functions deploy ticketing-send-magic-link
supabase functions deploy ticketing-get-ticket
supabase functions deploy ticketing-add-comment
supabase functions deploy ticketing-admin-list-tickets
supabase functions deploy ticketing-admin-update-status
supabase functions deploy ticketing-admin-convert-to-job
supabase functions deploy ticketing-admin-assign-job
```

## 6) Smoke-test function endpoints

```bash
supabase functions list
```

Optionally invoke one:

```bash
supabase functions invoke ticketing-create-ticket --body '{"requesterName":"Test User","requesterEmail":"test@example.com","subject":"Smoke","description":"Smoke test ticket","serviceAddress":"Lagos","priority":"medium","source":"guest"}'
```

## 7) Enable app feature flags

In ops app env:

```env
VITE_FEATURE_TICKETING_API_ENABLED=true
VITE_FEATURE_OPS_TICKET_MODULE_ENABLED=true
```

If you use custom function domain:

```env
VITE_TICKETING_API_BASE_URL=https://halobiukgyvlrhplahuy.supabase.co/functions/v1
```

