-- TurnFlow Supabase migration v2
-- Adds the shared-state bridge used by TurnFlow v51 and a safe workspace join code.
-- Run once in Supabase SQL Editor AFTER turnflow-supabase-schema-v1.sql.

begin;

alter table public.organizations
  add column if not exists join_code text;

create unique index if not exists organizations_join_code_unique
  on public.organizations(join_code)
  where join_code is not null;

create or replace function public.make_join_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  loop
    code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (
      select 1 from public.organizations where join_code = code
    );
  end loop;
  return code;
end;
$$;

update public.organizations
set join_code = public.make_join_code()
where join_code is null;

alter table public.organizations
  alter column join_code set default public.make_join_code();

create table if not exists public.workspace_state (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.workspace_state enable row level security;
revoke all on table public.workspace_state from anon;
grant select, insert, update on table public.workspace_state to authenticated;

drop policy if exists workspace_state_read on public.workspace_state;
create policy workspace_state_read on public.workspace_state
for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists workspace_state_insert on public.workspace_state;
create policy workspace_state_insert on public.workspace_state
for insert to authenticated
with check (
  public.is_org_member(organization_id)
  and (updated_by is null or updated_by = auth.uid())
);

drop policy if exists workspace_state_update on public.workspace_state;
create policy workspace_state_update on public.workspace_state
for update to authenticated
using (public.is_org_member(organization_id))
with check (
  public.is_org_member(organization_id)
  and (updated_by is null or updated_by = auth.uid())
);

create or replace function public.join_organization(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select id into org_id
  from public.organizations
  where join_code = upper(trim(code));

  if org_id is null then
    raise exception 'Invalid workspace code';
  end if;

  insert into public.organization_members(organization_id, user_id, role)
  values (org_id, auth.uid(), 'member')
  on conflict (organization_id, user_id) do nothing;

  return org_id;
end;
$$;

grant execute on function public.join_organization(text) to authenticated;

-- Let organization members see their workspace code so an admin can share it.
drop policy if exists organizations_read on public.organizations;
create policy organizations_read on public.organizations
for select to authenticated
using (public.is_org_member(id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='workspace_state'
  ) then
    alter publication supabase_realtime add table public.workspace_state;
  end if;
end $$;

commit;
