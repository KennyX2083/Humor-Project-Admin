create table public.prompt_chain_mix (
 chain_id bigint primary key references public.prompt_chains(id) on delete restrict,
 weight integer not null default 0 check (weight between 0 and 10000),
 updated_at timestamptz not null default now()
);
alter table public.prompt_chain_mix enable row level security;
revoke all on public.prompt_chain_mix from anon, authenticated;
grant select on public.prompt_chain_mix to authenticated;
grant update(weight,updated_at) on public.prompt_chain_mix to authenticated;
create policy "Admins read chain mix" on public.prompt_chain_mix for select to authenticated using ((select private.is_superadmin()));
create policy "Admins update chain mix" on public.prompt_chain_mix for update to authenticated using ((select private.is_superadmin())) with check ((select private.is_superadmin()));
insert into public.prompt_chain_mix(chain_id,weight)
select id,case when slug='excuse-generation' then 100 else 0 end from public.prompt_chains;
