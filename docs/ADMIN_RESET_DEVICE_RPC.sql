-- Admin device-lock reset RPC for staff accounts
-- Run in Supabase SQL Editor

begin;

create or replace function public.admin_reset_staff_device_lock(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  target_role text;
begin
  select lower(coalesce(role, ''))
  into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role not in ('admin', 'super admin') then
    return false;
  end if;

  select lower(coalesce(role, ''))
  into target_role
  from public.profiles
  where id = target_user_id;

  if target_role <> 'staff' then
    return false;
  end if;

  update public.profiles
  set device_id = null
  where id = target_user_id;

  return true;
end;
$$;

grant execute on function public.admin_reset_staff_device_lock(uuid) to authenticated;

commit;
