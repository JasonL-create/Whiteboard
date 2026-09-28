-- TurnFlow Phase 4.1: keep revoked users visible in Users & Access
-- Run once in Supabase SQL Editor before using the v97 Restore Access control.
begin;

create or replace function public.list_turnflow_users(p_organization_id uuid)
returns table(user_id uuid,email text,display_name text,org_role text,location_id uuid,location_name text,access_level text,request_status text)
language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.is_org_admin(p_organization_id) then raise exception 'Administrator access required'; end if;
 return query
 with people as (
   select m.user_id,m.role,ar.status as req
   from public.organization_members m
   left join public.access_requests ar on ar.organization_id=m.organization_id and ar.user_id=m.user_id
   where m.organization_id=p_organization_id
   union
   select ar.user_id,null::text,ar.status
   from public.access_requests ar
   where ar.organization_id=p_organization_id and ar.status in ('pending','revoked')
 )
 select pe.user_id,u.email::text,p.display_name,pe.role,l.id,l.name,ul.access_level,pe.req
 from people pe join auth.users u on u.id=pe.user_id
 left join public.profiles p on p.id=pe.user_id
 left join public.user_locations ul on ul.organization_id=p_organization_id and ul.user_id=pe.user_id
 left join public.locations l on l.id=ul.location_id
 order by lower(coalesce(p.display_name,u.email)),l.name;
end;$$;
grant execute on function public.list_turnflow_users(uuid) to authenticated;

commit;
