-- Ticketing bounded context for Trackby
-- Run in Supabase SQL Editor

begin;

create extension if not exists pgcrypto;

create schema if not exists ticketing;

create type ticketing.customer_type as enum ('organization', 'individual');
create type ticketing.ticket_source as enum ('guest', 'account');
create type ticketing.ticket_priority as enum ('low', 'medium', 'high', 'urgent');
create type ticketing.ticket_status as enum ('new', 'triaged', 'converted', 'in_progress', 'resolved', 'closed');
create type ticketing.ticket_author_type as enum ('customer', 'admin', 'system');
create type ticketing.attachment_uploader as enum ('customer', 'admin');

create table if not exists ticketing.customers (
  id uuid primary key default gen_random_uuid(),
  type ticketing.customer_type not null,
  name text not null,
  primary_email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists ticketing.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references ticketing.customers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists ticketing.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  customer_id uuid references ticketing.customers(id) on delete set null,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  subject text not null,
  description text not null,
  service_address text not null,
  preferred_datetime timestamptz,
  priority ticketing.ticket_priority not null default 'medium',
  status ticketing.ticket_status not null default 'new',
  source ticketing.ticket_source not null default 'guest',
  created_by uuid references auth.users(id) on delete set null,
  converted_at timestamptz,
  converted_job_id uuid references public.jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ticketing.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references ticketing.tickets(id) on delete cascade,
  author_type ticketing.ticket_author_type not null,
  author_ref text,
  comment text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists ticketing.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references ticketing.tickets(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by_type ticketing.attachment_uploader not null,
  created_at timestamptz not null default now()
);

create table if not exists ticketing.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references ticketing.tickets(id) on delete cascade,
  event_type text not null,
  actor_type ticketing.ticket_author_type not null default 'system',
  actor_ref text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ticketing.ticket_magic_links (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references ticketing.tickets(id) on delete cascade,
  requester_email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists ticketing.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

alter table public.jobs
  add column if not exists source_ticket_id uuid references ticketing.tickets(id) on delete set null;

create index if not exists idx_ticketing_tickets_status_created_at
  on ticketing.tickets(status, created_at desc);
create index if not exists idx_ticketing_tickets_requester_email
  on ticketing.tickets(lower(requester_email));
create index if not exists idx_ticketing_comments_ticket_id
  on ticketing.ticket_comments(ticket_id, created_at desc);
create index if not exists idx_ticketing_events_ticket_id
  on ticketing.ticket_events(ticket_id, created_at desc);

create or replace function ticketing.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ticketing_tickets_updated_at on ticketing.tickets;
create trigger trg_ticketing_tickets_updated_at
before update on ticketing.tickets
for each row
execute function ticketing.set_updated_at();

create or replace function ticketing.gen_ticket_number()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'TKT-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random() * 100000))::int::text, 5, '0');
    exit when not exists (select 1 from ticketing.tickets where ticket_number = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function ticketing.log_event(
  target_ticket_id uuid,
  event_name text,
  actor ticketing.ticket_author_type,
  actor_identity text,
  event_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, ticketing
as $$
begin
  insert into ticketing.ticket_events (ticket_id, event_type, actor_type, actor_ref, payload)
  values (target_ticket_id, event_name, actor, actor_identity, coalesce(event_payload, '{}'::jsonb));
end;
$$;

create or replace function ticketing.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(role, ''))
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function ticketing.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public, ticketing
as $$
  select ticketing.current_user_role() in ('admin', 'super admin');
$$;

create or replace function ticketing.sync_ticket_status_from_job()
returns trigger
language plpgsql
security definer
set search_path = public, ticketing
as $$
declare
  mapped_status ticketing.ticket_status;
begin
  if new.source_ticket_id is null then
    return new;
  end if;

  mapped_status := case new.status
    when 'in_progress' then 'in_progress'::ticketing.ticket_status
    when 'completed' then 'resolved'::ticketing.ticket_status
    when 'cancelled' then 'closed'::ticketing.ticket_status
    else null
  end;

  if mapped_status is not null then
    update ticketing.tickets
    set status = mapped_status
    where id = new.source_ticket_id;

    perform ticketing.log_event(
      new.source_ticket_id,
      'ticket_status_changed',
      'system',
      'job_status_sync',
      jsonb_build_object('job_id', new.id, 'job_status', new.status, 'ticket_status', mapped_status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_jobs_ticket_sync on public.jobs;
create trigger trg_jobs_ticket_sync
after update of status on public.jobs
for each row
when (new.status is distinct from old.status)
execute function ticketing.sync_ticket_status_from_job();

create or replace function ticketing.convert_ticket_to_job(
  target_ticket_id uuid,
  new_title text,
  new_description text default null,
  new_client_id uuid default null,
  new_assigned_to uuid default null,
  new_scheduled_time timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, ticketing
as $$
declare
  created_job_id uuid;
  ticket_row ticketing.tickets%rowtype;
begin
  if not ticketing.is_admin_user() then
    raise exception 'Not authorized';
  end if;

  select * into ticket_row from ticketing.tickets where id = target_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;

  insert into public.jobs (
    title,
    description,
    client_id,
    assigned_to,
    scheduled_time,
    status,
    source_ticket_id
  )
  values (
    coalesce(new_title, ticket_row.subject),
    coalesce(new_description, ticket_row.description),
    new_client_id,
    new_assigned_to,
    new_scheduled_time,
    'pending',
    target_ticket_id
  )
  returning id into created_job_id;

  update ticketing.tickets
  set status = 'converted',
      converted_at = now(),
      converted_job_id = created_job_id
  where id = target_ticket_id;

  perform ticketing.log_event(
    target_ticket_id,
    'ticket_converted',
    'admin',
    auth.uid()::text,
    jsonb_build_object('job_id', created_job_id)
  );

  return created_job_id;
end;
$$;

alter table ticketing.customers enable row level security;
alter table ticketing.customer_contacts enable row level security;
alter table ticketing.tickets enable row level security;
alter table ticketing.ticket_comments enable row level security;
alter table ticketing.ticket_attachments enable row level security;
alter table ticketing.ticket_events enable row level security;
alter table ticketing.ticket_magic_links enable row level security;
alter table ticketing.email_outbox enable row level security;

drop policy if exists "ticketing_admin_all_customers" on ticketing.customers;
create policy "ticketing_admin_all_customers"
on ticketing.customers for all
to authenticated
using (ticketing.is_admin_user())
with check (ticketing.is_admin_user());

drop policy if exists "ticketing_admin_all_contacts" on ticketing.customer_contacts;
create policy "ticketing_admin_all_contacts"
on ticketing.customer_contacts for all
to authenticated
using (ticketing.is_admin_user())
with check (ticketing.is_admin_user());

drop policy if exists "ticketing_admin_all_tickets" on ticketing.tickets;
create policy "ticketing_admin_all_tickets"
on ticketing.tickets for all
to authenticated
using (ticketing.is_admin_user())
with check (ticketing.is_admin_user());

drop policy if exists "ticketing_admin_all_comments" on ticketing.ticket_comments;
create policy "ticketing_admin_all_comments"
on ticketing.ticket_comments for all
to authenticated
using (ticketing.is_admin_user())
with check (ticketing.is_admin_user());

drop policy if exists "ticketing_admin_all_attachments" on ticketing.ticket_attachments;
create policy "ticketing_admin_all_attachments"
on ticketing.ticket_attachments for all
to authenticated
using (ticketing.is_admin_user())
with check (ticketing.is_admin_user());

drop policy if exists "ticketing_admin_all_events" on ticketing.ticket_events;
create policy "ticketing_admin_all_events"
on ticketing.ticket_events for all
to authenticated
using (ticketing.is_admin_user())
with check (ticketing.is_admin_user());

drop policy if exists "ticketing_admin_all_magic_links" on ticketing.ticket_magic_links;
create policy "ticketing_admin_all_magic_links"
on ticketing.ticket_magic_links for all
to authenticated
using (ticketing.is_admin_user())
with check (ticketing.is_admin_user());

drop policy if exists "ticketing_admin_all_email_outbox" on ticketing.email_outbox;
create policy "ticketing_admin_all_email_outbox"
on ticketing.email_outbox for all
to authenticated
using (ticketing.is_admin_user())
with check (ticketing.is_admin_user());

grant usage on schema ticketing to authenticated, anon, service_role;
grant select, insert, update, delete on all tables in schema ticketing to service_role;
grant execute on all functions in schema ticketing to authenticated, service_role;

commit;

