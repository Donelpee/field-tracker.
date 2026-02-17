-- Super Admin role migration for profiles.role constraint
-- Run in Supabase SQL Editor

begin;

-- 1) Expand allowed roles in profiles.role check constraint
alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('staff', 'admin', 'super admin'));

-- 2) Update target account role and clear device lock
update public.profiles p
set
  role = 'super admin',
  device_id = null
from auth.users au
where p.id = au.id
  and lower(au.email) = lower('donelpee@yahoo.com');

-- 3) Keep auth metadata role aligned (recommended)
update auth.users
set raw_user_meta_data =
  coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'super admin')
where lower(email) = lower('donelpee@yahoo.com');

commit;

-- Verification query
select
  au.email,
  p.role,
  p.device_id,
  au.raw_user_meta_data->>'role' as metadata_role
from auth.users au
join public.profiles p on p.id = au.id
where lower(au.email) = lower('donelpee@yahoo.com');
