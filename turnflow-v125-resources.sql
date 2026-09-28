-- TurnFlow v125: shared Resources page + Medford starter data
-- Run once in Supabase SQL Editor before using Resources.
begin;

create table if not exists public.resource_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  section_id uuid not null references public.resource_sections(id) on delete cascade,
  name text not null,
  phone text not null default '',
  details text not null default '',
  notes text not null default '',
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists resource_sections_org_location_idx on public.resource_sections(organization_id,location_id,sort_order);
create index if not exists resources_org_location_idx on public.resources(organization_id,location_id,section_id,sort_order);

alter table public.resource_sections enable row level security;
alter table public.resources enable row level security;
grant select,insert,update,delete on public.resource_sections to authenticated;
grant select,insert,update,delete on public.resources to authenticated;

drop policy if exists resource_sections_select on public.resource_sections;
create policy resource_sections_select on public.resource_sections for select to authenticated
using (public.is_org_member(organization_id) and (location_id is null or public.user_can_access_location(organization_id,location_id)));
drop policy if exists resource_sections_insert on public.resource_sections;
create policy resource_sections_insert on public.resource_sections for insert to authenticated
with check (public.is_org_member(organization_id) and (location_id is null or public.user_can_access_location(organization_id,location_id)));
drop policy if exists resource_sections_update on public.resource_sections;
create policy resource_sections_update on public.resource_sections for update to authenticated
using (public.is_org_member(organization_id) and (location_id is null or public.user_can_access_location(organization_id,location_id)))
with check (public.is_org_member(organization_id) and (location_id is null or public.user_can_access_location(organization_id,location_id)));
drop policy if exists resource_sections_delete on public.resource_sections;
create policy resource_sections_delete on public.resource_sections for delete to authenticated
using (public.is_org_member(organization_id) and (location_id is null or public.user_can_access_location(organization_id,location_id)));

drop policy if exists resources_select on public.resources;
create policy resources_select on public.resources for select to authenticated
using (public.is_org_member(organization_id) and (location_id is null or public.user_can_access_location(organization_id,location_id)));
drop policy if exists resources_insert on public.resources;
create policy resources_insert on public.resources for insert to authenticated
with check (public.is_org_member(organization_id) and (location_id is null or public.user_can_access_location(organization_id,location_id)));
drop policy if exists resources_update on public.resources;
create policy resources_update on public.resources for update to authenticated
using (public.is_org_member(organization_id) and (location_id is null or public.user_can_access_location(organization_id,location_id)))
with check (public.is_org_member(organization_id) and (location_id is null or public.user_can_access_location(organization_id,location_id)));
drop policy if exists resources_delete on public.resources;
create policy resources_delete on public.resources for delete to authenticated
using (public.is_org_member(organization_id) and (location_id is null or public.user_can_access_location(organization_id,location_id)));

-- Starter information transcribed from the supplied office Utilities sheet.
do $$
declare o uuid; l uuid; s_util uuid; s_city uuid; s_other uuid; s_court uuid;
begin
 select id into o from public.organizations where name='Northwoods Property Management' limit 1;
 if o is null then return; end if;
 select id into l from public.locations where organization_id=o and lower(name)='medford' limit 1;
 if l is null then return; end if;

 select id into s_util from public.resource_sections where organization_id=o and location_id=l and name='Utilities' limit 1;
 if s_util is null then insert into public.resource_sections(organization_id,location_id,name,sort_order) values(o,l,'Utilities',10) returning id into s_util; end if;
 select id into s_city from public.resource_sections where organization_id=o and location_id=l and name='City / Municipal' limit 1;
 if s_city is null then insert into public.resource_sections(organization_id,location_id,name,sort_order) values(o,l,'City / Municipal',20) returning id into s_city; end if;
 select id into s_other from public.resource_sections where organization_id=o and location_id=l and name='Other Important Contacts' limit 1;
 if s_other is null then insert into public.resource_sections(organization_id,location_id,name,sort_order) values(o,l,'Other Important Contacts',30) returning id into s_other; end if;
 select id into s_court from public.resource_sections where organization_id=o and location_id=l and name='Courts' limit 1;
 if s_court is null then insert into public.resource_sections(organization_id,location_id,name,sort_order) values(o,l,'Courts',40) returning id into s_court; end if;

 if not exists(select 1 from public.resources where organization_id=o and location_id=l) then
  insert into public.resources(organization_id,location_id,section_id,name,phone,details,notes,sort_order) values
  (o,l,s_util,'Pacific Power','(888) 221-7070','Master acct #00943341','2,2,0,2',10),
  (o,l,s_util,'Avista','(800) 659-4427','Master acct #46-0801145 (NW Tax ID#)','cssupport@avistacorp.com',20),
  (o,l,s_util,'Rogue Disposal','(541) 779-4161','Ext 3','',30),
  (o,l,s_util,'Southern Oregon Sanitation','','','',40),
  (o,l,s_util,'EP','(541) 826-5691','2026 rates: 35 Gal $27.02 · 65 Gal $45.31 · 95 Gal $63.60 · Yard Debris $10.32','',50),
  (o,l,s_util,'GP','(541) 479-5335','Difference: 65 Gal $18.29 · 95 Gal $36.58 · Yard Debris $10.32','',60),
  (o,l,s_util,'City of Medford Utilities','(541) 774-2140','Ext 0','utilities@cityofmedford.org',70),
  (o,l,s_util,'Medford Water','(541) 774-2430','','customerservice@medfordwater.org',80),
  (o,l,s_util,'Rogue Valley Sewer','(541) 664-6300','','billpay@rvss-or.gov',90),
  (o,l,s_util,'Republic Services - Trash GP','(541) 479-3371','','Shred Co. 541-479-1425 · Services Medford on Wednesdays',100),
  (o,l,s_city,'Central Point','(541) 664-3321','Ext 2','ub@centralpointoregon.gov',10),
  (o,l,s_city,'Jacksonville','(541) 899-1231','','',20),
  (o,l,s_city,'Ashland','(541) 488-5353','','',30),
  (o,l,s_city,'Phoenix','(541) 535-1955','Ext 305','',40),
  (o,l,s_city,'Talent','(541) 535-1566','','',50),
  (o,l,s_city,'Gold Hill','(541) 855-1525','','',60),
  (o,l,s_city,'Rogue River','(541) 582-4401','','',70),
  (o,l,s_city,'Grants Pass','(541) 450-6035','','',80),
  (o,l,s_city,'Eagle Point','(541) 826-4212','','2,0',90),
  (o,l,s_city,'Shady Cove','(541) 878-8206','','',100),
  (o,l,s_city,'Medford','(541) 774-2140','','',110),
  (o,l,s_other,'Shady Cove - Hiland Water','(503) 554-8333','','teresah@hilandwater.com',10),
  (o,l,s_other,'Umpqua Bank - Treasury Management','(866) 563-1010','','',20),
  (o,l,s_other,'CenturyLink','','Account #333401830','',30),
  (o,l,s_other,'Additional Trash Can','','','As of 10/1/22 tenant can set up an additional can in their name. We will not upgrade the existing can.',40),
  (o,l,s_other,'RVSS / Water Reference','','CP $26.78 · Medford $25.50 · County $26.50 · W/Medford $25.50','City of Medford: w/sewer $61.66 · no/sewer $33.09',50),
  (o,l,s_court,'Josephine County','541-476-2309','6,4 Betsy','',10),
  (o,l,s_court,'Jackson County','541-446-7171','35049','',20);
 end if;
end $$;

commit;
