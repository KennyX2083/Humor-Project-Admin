-- Run once in the existing project's Supabase SQL Editor.
-- Email addresses stay in Supabase Auth; no public profile column is added.
create or replace function private.admin_get_user_emails(p_user_ids uuid[])
returns table(id uuid, email text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_superadmin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query select u.id, u.email::text from auth.users as u where u.id = any(p_user_ids);
end;
$$;
revoke all on function private.admin_get_user_emails(uuid[]) from public, anon;
grant execute on function private.admin_get_user_emails(uuid[]) to authenticated;

create or replace function public.admin_get_user_emails(p_user_ids uuid[])
returns table(id uuid, email text)
language sql security invoker set search_path = '' as $$
  select * from private.admin_get_user_emails(p_user_ids);
$$;
revoke all on function public.admin_get_user_emails(uuid[]) from public, anon;
grant execute on function public.admin_get_user_emails(uuid[]) to authenticated;
