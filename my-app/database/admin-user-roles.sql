-- Already applied during the earlier Week 7 pass. Retained for reproducible setup.
-- The public wrapper uses invoker privileges; only the private implementation
-- can change the protected role column, after checking the caller's profile.
create or replace function private.admin_set_user_role(p_user_id uuid, p_is_superadmin boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_superadmin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() and not p_is_superadmin then
    raise exception 'You cannot remove your own administrator access' using errcode = '42501';
  end if;
  if p_is_superadmin is null then raise exception 'Role is required'; end if;
  update public.profiles set is_superadmin = p_is_superadmin where id = p_user_id;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function private.admin_set_user_role(uuid, boolean) from public, anon;
grant execute on function private.admin_set_user_role(uuid, boolean) to authenticated;

create or replace function public.admin_set_user_role(p_user_id uuid, p_is_superadmin boolean)
returns void language sql security invoker set search_path = '' as $$
  select private.admin_set_user_role(p_user_id, p_is_superadmin);
$$;
revoke all on function public.admin_set_user_role(uuid, boolean) from public, anon;
grant execute on function public.admin_set_user_role(uuid, boolean) to authenticated;
