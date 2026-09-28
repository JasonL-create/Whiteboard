-- TurnFlow Phase 4.2: allow TurnFlow admins to edit user display names
-- Run once in Supabase SQL Editor before deploying v99.
begin;

create or replace function public.update_turnflow_user_display_name(
  p_organization_id uuid,
  p_user_id uuid,
  p_display_name text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_org_admin(p_organization_id) then
    raise exception 'Administrator access required';
  end if;
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id=p_organization_id and m.user_id=p_user_id
    union all
    select 1 from public.access_requests ar
    where ar.organization_id=p_organization_id and ar.user_id=p_user_id
  ) then
    raise exception 'User is not associated with this organization';
  end if;
  if nullif(trim(p_display_name),'') is null then
    raise exception 'Name is required';
  end if;

  insert into public.profiles(id,display_name)
  values(p_user_id,trim(p_display_name))
  on conflict(id) do update set display_name=excluded.display_name;
end;
$$;

grant execute on function public.update_turnflow_user_display_name(uuid,uuid,text) to authenticated;

commit;
