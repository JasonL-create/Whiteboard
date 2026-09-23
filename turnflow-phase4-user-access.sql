-- TurnFlow Phase 4: approval-based onboarding + admin user access
-- Run once as a NEW query in Supabase SQL Editor before deploying v95.
begin;

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','revoked')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (organization_id,user_id)
);
alter table public.access_requests enable row level security;
grant select on public.access_requests to authenticated;
drop policy if exists access_requests_self_read on public.access_requests;
create policy access_requests_self_read on public.access_requests for select to authenticated
using (user_id=auth.uid() or public.is_org_admin(organization_id));

-- Joining with the company code now REQUESTS access; it no longer grants membership.
create or replace function public.join_organization(code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare org_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select id into org_id from public.organizations where join_code=upper(trim(code));
 if org_id is null then raise exception 'Invalid workspace code'; end if;
 if exists(select 1 from public.organization_members where organization_id=org_id and user_id=auth.uid()) then return org_id; end if;
 insert into public.access_requests(organization_id,user_id,status,requested_at)
 values(org_id,auth.uid(),'pending',now())
 on conflict(organization_id,user_id) do update set status='pending',requested_at=now(),reviewed_at=null,reviewed_by=null;
 return org_id;
end;$$;
grant execute on function public.join_organization(text) to authenticated;

-- Admin directory includes active members AND pending access requests.
create or replace function public.list_turnflow_users(p_organization_id uuid)
returns table(user_id uuid,email text,display_name text,org_role text,location_id uuid,location_name text,access_level text,request_status text)
language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.is_org_admin(p_organization_id) then raise exception 'Administrator access required'; end if;
 return query
 with people as (
   select m.user_id,m.role,null::text as req from public.organization_members m where m.organization_id=p_organization_id
   union
   select ar.user_id,null::text,ar.status from public.access_requests ar where ar.organization_id=p_organization_id and ar.status='pending'
 )
 select pe.user_id,u.email::text,p.display_name,pe.role,l.id,l.name,ul.access_level,pe.req
 from people pe join auth.users u on u.id=pe.user_id
 left join public.profiles p on p.id=pe.user_id
 left join public.user_locations ul on ul.organization_id=p_organization_id and ul.user_id=pe.user_id
 left join public.locations l on l.id=ul.location_id
 order by lower(coalesce(p.display_name,u.email)),l.name;
end;$$;
grant execute on function public.list_turnflow_users(uuid) to authenticated;

create or replace function public.set_turnflow_user_access(p_organization_id uuid,p_user_id uuid,p_location_id uuid,p_access_level text)
returns void language plpgsql security definer set search_path=public as $$
declare v_role text;
begin
 if not public.is_org_admin(p_organization_id) then raise exception 'Administrator access required'; end if;
 if p_access_level not in ('staff','management','admin') then raise exception 'Invalid access level'; end if;
 if not exists(select 1 from public.locations where id=p_location_id and organization_id=p_organization_id and is_active=true) then raise exception 'Invalid location'; end if;
 if p_user_id=auth.uid() and p_access_level='staff' then raise exception 'An administrator cannot reduce their own access from this screen'; end if;
 v_role:=case when p_access_level='admin' then 'admin' else 'member' end;
 insert into public.organization_members(organization_id,user_id,role) values(p_organization_id,p_user_id,v_role)
 on conflict(organization_id,user_id) do update set role=case when organization_members.role='owner' then 'owner' else excluded.role end;
 delete from public.user_locations where organization_id=p_organization_id and user_id=p_user_id;
 insert into public.user_locations(organization_id,user_id,location_id,access_level) values(p_organization_id,p_user_id,p_location_id,p_access_level);
 update public.access_requests set status='approved',reviewed_at=now(),reviewed_by=auth.uid() where organization_id=p_organization_id and user_id=p_user_id;
end;$$;
grant execute on function public.set_turnflow_user_access(uuid,uuid,uuid,text) to authenticated;

create or replace function public.revoke_turnflow_user_access(p_organization_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_org_admin(p_organization_id) then raise exception 'Administrator access required'; end if;
 if p_user_id=auth.uid() then raise exception 'An administrator cannot revoke their own access'; end if;
 delete from public.user_locations where organization_id=p_organization_id and user_id=p_user_id;
 delete from public.organization_members where organization_id=p_organization_id and user_id=p_user_id and role<>'owner';
 insert into public.access_requests(organization_id,user_id,status,reviewed_at,reviewed_by)
 values(p_organization_id,p_user_id,'revoked',now(),auth.uid())
 on conflict(organization_id,user_id) do update set status='revoked',reviewed_at=now(),reviewed_by=auth.uid();
end;$$;
grant execute on function public.revoke_turnflow_user_access(uuid,uuid) to authenticated;

commit;

select u.email,l.name as location,ul.access_level,m.role as organization_role
from public.organization_members m join auth.users u on u.id=m.user_id
left join public.user_locations ul on ul.organization_id=m.organization_id and ul.user_id=m.user_id
left join public.locations l on l.id=ul.location_id join public.organizations o on o.id=m.organization_id
where o.name='Northwoods Property Management' order by u.email;
