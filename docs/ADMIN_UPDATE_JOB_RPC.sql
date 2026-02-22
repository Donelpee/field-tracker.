-- Admin-safe job update RPC (bypasses strict jobs RLS for authorized admins only)
-- Run in Supabase SQL Editor

begin;

create or replace function public.admin_update_job(
  target_job_id uuid,
  new_title text,
  new_description text,
  new_client_id uuid,
  new_assigned_to uuid,
  new_status text,
  new_scheduled_time timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select lower(coalesce(role, ''))
  into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role not in ('admin', 'super admin') then
    return false;
  end if;

  update public.jobs
  set
    title = new_title,
    description = new_description,
    client_id = new_client_id,
    assigned_to = new_assigned_to,
    status = new_status,
    scheduled_time = new_scheduled_time
  where id = target_job_id;

  return found;
end;
$$;

grant execute on function public.admin_update_job(
  uuid,
  text,
  text,
  uuid,
  uuid,
  text,
  timestamptz
) to authenticated;

commit;
