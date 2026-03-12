# Ticketing + Customer Portal Implementation

## What Was Added

1. Ticketing database contract and RLS
- SQL file: `docs/TICKETING_SCHEMA_AND_API.sql`
- Includes `ticketing` schema, ticket lifecycle tables, magic-link tables, event log, and `public.jobs.source_ticket_id`.
- Includes trigger to map job status updates back into ticket lifecycle.

2. Supabase Edge Function API boundary
- `supabase/functions/ticketing-create-ticket`
- `supabase/functions/ticketing-send-magic-link`
- `supabase/functions/ticketing-get-ticket`
- `supabase/functions/ticketing-add-comment`
- `supabase/functions/ticketing-admin-list-tickets`
- `supabase/functions/ticketing-admin-update-status`
- `supabase/functions/ticketing-admin-convert-to-job`
- `supabase/functions/ticketing-admin-assign-job`
- Shared helpers in `supabase/functions/_shared`.

3. Ops portal integration
- Feature flags in `src/lib/featureFlags.js`
- Edge API client in `src/lib/ticketingApi.js`
- New admin tickets module in `src/components/TicketsBoard.jsx`
- Dashboard menu integration in `src/components/Dashboard.jsx`

4. Separate customer portal app (same repo)
- Path: `apps/customer-portal`
- Includes ticket submission, tracking, comment posting, and magic-link resend path.

## Environment Variables

### Ops portal (`.env` / `.env.local`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FEATURE_TICKETING_API_ENABLED=true`
- `VITE_FEATURE_OPS_TICKET_MODULE_ENABLED=true`
- Optional: `VITE_TICKETING_API_BASE_URL` (if not using Supabase Functions default URL)

### Customer portal (`apps/customer-portal/.env`)
- `VITE_SUPABASE_URL`
- Optional: `VITE_TICKETING_API_BASE_URL`

### Supabase Edge Functions secrets
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CUSTOMER_PORTAL_BASE_URL` (e.g. `https://portal.example.com`)

## Run Commands

1. Ops app
```bash
npm run dev:ops
```

2. Customer portal
```bash
npm run dev:customer
```

3. Build customer portal
```bash
npm run build:customer
```

4. Run ticketing E2E tests (against deployed Supabase functions)
```bash
npm run test:e2e:ticketing
```
Use env file template:
- `tests/e2e/.env.example`

## Deployment Order

1. Run SQL migration in Supabase.
2. Deploy all edge functions.
3. Enable feature flags in ops portal.
4. Deploy customer portal.

## Supabase CLI Deployment

Use:
- `docs/SUPABASE_DEPLOYMENT_COMMANDS.md`
