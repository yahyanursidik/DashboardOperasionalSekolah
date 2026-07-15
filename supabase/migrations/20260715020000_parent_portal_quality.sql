-- Parent portal quality workflow: attendance access, scoped announcements,
-- read receipts, and service requests that can be followed up by school staff.

-- The column originally defaulted to false, while no admin workflow existed to
-- enable it. Backfill active linked guardians, then make future links usable by
-- default. A link can still be disabled explicitly after this migration.
alter table public.student_parent_links
  alter column can_access_parent_portal set default true;

update public.student_parent_links spl
set can_access_parent_portal = true
from public.parents p
where p.id = spl.parent_id
  and p.is_active is distinct from false
  and spl.can_access_parent_portal is distinct from true;

create or replace function public.get_parent_login_email_by_student(p_nisn text, p_nis text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  found_parent_id uuid;
  found_email text;
begin
  with input_values as (
    select nullif(regexp_replace(coalesce(p_nisn, ''), '\s+', '', 'g'), '') as value
    union
    select nullif(regexp_replace(coalesce(p_nis, ''), '\s+', '', 'g'), '') as value
  )
  select p.id, nullif(btrim(p.email), '') into found_parent_id, found_email
  from public.students s
  join public.student_parent_links spl on spl.student_id = s.id
  join public.parents p on spl.parent_id = p.id
  where p.is_active is distinct from false
    and coalesce(spl.can_access_parent_portal, true)
    and exists (
      select 1 from input_values input
      where input.value is not null
        and (
          regexp_replace(coalesce(s.nis, ''), '\s+', '', 'g') = input.value
          or regexp_replace(coalesce(s.nisn, ''), '\s+', '', 'g') = input.value
        )
    )
  order by coalesce(spl.is_primary, false) desc, p.created_at asc
  limit 1;

  if found_parent_id is null then return null; end if;

  if found_email is null then
    found_email := 'parent-' || replace(found_parent_id::text, '-', '') || '@parent.demo';
    update public.parents set email = found_email
    where id = found_parent_id and nullif(btrim(email), '') is null;
  end if;

  return found_email;
end;
$$;

grant execute on function public.get_parent_login_email_by_student(text, text) to anon, authenticated;

create table if not exists public.parent_announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete cascade,
  read_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  unique (announcement_id, parent_id)
);

create table if not exists public.parent_portal_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text unique,
  parent_id uuid not null references public.parents(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  unit_id uuid references public.units(id),
  request_type text not null check (request_type in (
    'student_leave', 'data_correction', 'academic', 'finance',
    'quran', 'wellbeing', 'general'
  )),
  subject text not null,
  description text not null,
  start_date date,
  end_date date,
  status text not null default 'submitted' check (status in (
    'submitted', 'in_review', 'approved', 'rejected', 'resolved', 'cancelled'
  )),
  response text,
  responded_by uuid references public.profiles(id),
  responded_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_request_date_range check (
    end_date is null or start_date is null or end_date >= start_date
  )
);

create or replace function public.set_parent_request_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.request_number is null then
    new.request_number := 'ORT-' || to_char(current_date, 'YYYYMM') || '-' ||
      upper(substr(replace(new.id::text, '-', ''), 1, 6));
  end if;
  return new;
end;
$$;

drop trigger if exists set_parent_request_number on public.parent_portal_requests;
create trigger set_parent_request_number
  before insert on public.parent_portal_requests
  for each row execute function public.set_parent_request_number();

drop trigger if exists handle_parent_portal_request_updated_at on public.parent_portal_requests;
create trigger handle_parent_portal_request_updated_at
  before update on public.parent_portal_requests
  for each row execute procedure public.handle_updated_at();

create index if not exists idx_parent_announcement_reads_parent
  on public.parent_announcement_reads(parent_id, read_at desc);
create index if not exists idx_parent_portal_requests_parent
  on public.parent_portal_requests(parent_id, submitted_at desc);
create index if not exists idx_parent_portal_requests_student
  on public.parent_portal_requests(student_id, submitted_at desc);
create index if not exists idx_parent_portal_requests_unit_status
  on public.parent_portal_requests(unit_id, status, submitted_at desc);

alter table public.parent_announcement_reads enable row level security;
alter table public.parent_portal_requests enable row level security;

drop policy if exists "Parents read linked student attendance" on public.attendance_records;
create policy "Parents read linked student attendance"
  on public.attendance_records for select to authenticated
  using (
    exists (
      select 1
      from public.student_parent_links spl
      join public.parents p on p.id = spl.parent_id
      where spl.student_id = attendance_records.student_id
        and p.user_id = auth.uid()
        and coalesce(spl.can_access_parent_portal, true)
    )
  );

drop policy if exists "Parents read scoped announcements" on public.announcements;
drop policy if exists "Users read announcements" on public.announcements;
drop policy if exists "School users read announcements" on public.announcements;
create policy "School users read announcements"
  on public.announcements for select to authenticated
  using (
    not exists (select 1 from public.parents p where p.user_id = auth.uid())
    and (
      target_type in ('all', 'staff', 'parents')
      or (target_type = 'unit' and public.can_access_unit(unit_id))
      or (target_type = 'class' and class_id = any(public.auth_user_class_ids()))
    )
  );

create policy "Parents read scoped announcements"
  on public.announcements for select to authenticated
  using (
    status = 'terkirim'
    and coalesce(publish_at, created_at) <= now()
    and exists (
      select 1
      from public.parents p
      join public.student_parent_links spl on spl.parent_id = p.id
      join public.students s on s.id = spl.student_id
      where p.user_id = auth.uid()
        and coalesce(spl.can_access_parent_portal, true)
        and (
          announcements.target_type = 'all'
          or (
            announcements.target_type = 'parents'
            and (announcements.unit_id is null or announcements.unit_id = s.unit_id)
            and (announcements.class_id is null or announcements.class_id = s.class_id)
          )
          or (announcements.target_type = 'unit' and announcements.unit_id = s.unit_id)
          or (announcements.target_type = 'class' and announcements.class_id = s.class_id)
        )
    )
  );

drop policy if exists "Parents manage own announcement reads" on public.parent_announcement_reads;
create policy "Parents manage own announcement reads"
  on public.parent_announcement_reads for all to authenticated
  using (parent_id in (select id from public.parents where user_id = auth.uid()))
  with check (parent_id in (select id from public.parents where user_id = auth.uid()));

drop policy if exists "Staff read announcement receipts" on public.parent_announcement_reads;
create policy "Staff read announcement receipts"
  on public.parent_announcement_reads for select to authenticated
  using (
    public.is_super_admin()
    or public.has_role('admin_sekolah')
    or public.has_role('admin_unit')
  );

drop policy if exists "Parents create own service requests" on public.parent_portal_requests;
create policy "Parents create own service requests"
  on public.parent_portal_requests for insert to authenticated
  with check (
    parent_id in (select id from public.parents where user_id = auth.uid())
    and exists (
      select 1 from public.student_parent_links spl
      where spl.parent_id = parent_portal_requests.parent_id
        and spl.student_id = parent_portal_requests.student_id
        and coalesce(spl.can_access_parent_portal, true)
    )
  );

drop policy if exists "Parents read own service requests" on public.parent_portal_requests;
create policy "Parents read own service requests"
  on public.parent_portal_requests for select to authenticated
  using (parent_id in (select id from public.parents where user_id = auth.uid()));

drop policy if exists "Parents cancel submitted service requests" on public.parent_portal_requests;
create policy "Parents cancel submitted service requests"
  on public.parent_portal_requests for update to authenticated
  using (
    status = 'submitted'
    and parent_id in (select id from public.parents where user_id = auth.uid())
  )
  with check (
    status = 'cancelled'
    and parent_id in (select id from public.parents where user_id = auth.uid())
  );

drop policy if exists "School staff manage parent service requests" on public.parent_portal_requests;
create policy "School staff manage parent service requests"
  on public.parent_portal_requests for all to authenticated
  using (
    public.is_super_admin()
    or (unit_id is not null and public.can_access_unit(unit_id))
  )
  with check (
    public.is_super_admin()
    or (unit_id is not null and public.can_access_unit(unit_id))
  );

grant select, insert, update on public.parent_announcement_reads to authenticated;
grant select, insert, update on public.parent_portal_requests to authenticated;
