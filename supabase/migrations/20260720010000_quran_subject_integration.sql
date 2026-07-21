-- Connect Tahsin/Tahfidz operational learning to the academic subject master.
-- Runtime code must use these keys instead of matching subject names.

alter table public.subjects
  add column if not exists quran_program_type text;

alter table public.subjects drop constraint if exists subjects_quran_program_type_check;
alter table public.subjects add constraint subjects_quran_program_type_check
  check (quran_program_type is null or quran_program_type in ('tahsin', 'tahfidz', 'both'));

create index if not exists subjects_quran_program_idx
  on public.subjects(unit_id, quran_program_type)
  where quran_program_type is not null and is_active is not false;

create or replace function public.quran_can_manage_student_target(
  p_student_id uuid,
  p_halaqoh_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.students student
      join public.user_roles user_role on user_role.user_id = auth.uid()
      join public.roles role_record on role_record.id = user_role.role_id
      where student.id = p_student_id
        and role_record.name in (
          'super_admin', 'ketua_yayasan', 'kepsek', 'admin_sekolah',
          'wakasek', 'kepala_unit', 'admin_unit'
        )
        and (
          role_record.name in ('super_admin', 'ketua_yayasan', 'kepsek', 'admin_sekolah')
          or user_role.unit_id is null
          or user_role.unit_id = student.unit_id
        )
    )
    or exists (
      select 1
      from public.tahfidz_halaqohs halaqoh
      join public.employees employee on employee.id = halaqoh.employee_id
      where halaqoh.id = p_halaqoh_id
        and employee.user_id = auth.uid()
        and employee.status = 'active'
    );
$$;

revoke all on function public.quran_can_manage_student_target(uuid, uuid) from public;
grant execute on function public.quran_can_manage_student_target(uuid, uuid) to authenticated;

-- Tahfidz targets were originally provisioned through a standalone extension
-- script. Tahsin uses its own resource in the application, so make that table
-- part of the migration chain instead of assuming it already exists.
create table if not exists public.tahsin_student_targets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  semester_id uuid not null references public.semesters(id) on delete restrict,
  target_type text not null default 'tahsin'
    constraint tahsin_student_targets_type_check check (target_type = 'tahsin'),
  description text not null,
  target_amount integer not null default 1
    constraint tahsin_student_targets_amount_check check (target_amount > 0),
  amount_unit text not null default 'jilid'
    constraint tahsin_student_targets_unit_check check (amount_unit in ('jilid', 'halaman', 'ayat', 'juz', 'surah')),
  status text not null default 'in_progress'
    constraint tahsin_student_targets_status_check check (status in ('in_progress', 'completed', 'failed')),
  subject_id uuid references public.subjects(id) on delete restrict,
  halaqoh_id uuid references public.tahfidz_halaqohs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists handle_updated_at_tahsin_student_targets on public.tahsin_student_targets;
create trigger handle_updated_at_tahsin_student_targets
  before update on public.tahsin_student_targets
  for each row execute procedure public.handle_updated_at();

alter table public.tahsin_student_targets enable row level security;

drop policy if exists "Quran managers manage tahsin student targets" on public.tahsin_student_targets;
create policy "Quran managers manage tahsin student targets"
  on public.tahsin_student_targets for all to authenticated
  using (public.quran_can_manage_student_target(student_id, halaqoh_id))
  with check (public.quran_can_manage_student_target(student_id, halaqoh_id));

drop policy if exists "Parents read linked tahsin student targets" on public.tahsin_student_targets;
create policy "Parents read linked tahsin student targets"
  on public.tahsin_student_targets for select to authenticated
  using (
    exists (
      select 1
      from public.student_parent_links link
      join public.parents parent_record on parent_record.id = link.parent_id
      where link.student_id = tahsin_student_targets.student_id
        and parent_record.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.tahsin_student_targets to authenticated;

alter table if exists public.tahfidz_halaqohs
  add column if not exists subject_id uuid references public.subjects(id) on delete restrict;
alter table if exists public.quran_records
  add column if not exists subject_id uuid references public.subjects(id) on delete restrict;
alter table if exists public.quran_targets
  add column if not exists subject_id uuid references public.subjects(id) on delete restrict;
alter table if exists public.quran_assessments
  add column if not exists subject_id uuid references public.subjects(id) on delete restrict;
alter table if exists public.quran_assessments
  add column if not exists halaqoh_id uuid references public.tahfidz_halaqohs(id) on delete set null;
alter table if exists public.tahfidz_student_targets
  add column if not exists subject_id uuid references public.subjects(id) on delete restrict;
alter table if exists public.tahfidz_student_targets
  add column if not exists halaqoh_id uuid references public.tahfidz_halaqohs(id) on delete set null;
alter table if exists public.tahsin_student_targets
  add column if not exists subject_id uuid references public.subjects(id) on delete restrict;
alter table if exists public.tahsin_student_targets
  add column if not exists halaqoh_id uuid references public.tahfidz_halaqohs(id) on delete set null;

create index if not exists tahfidz_halaqohs_subject_idx on public.tahfidz_halaqohs(subject_id);
create index if not exists quran_records_subject_period_idx on public.quran_records(subject_id, academic_year_id, semester_id);
create index if not exists quran_assessments_subject_period_idx on public.quran_assessments(subject_id, academic_year_id, semester_id);
create index if not exists quran_assessments_halaqoh_idx on public.quran_assessments(halaqoh_id);
create index if not exists quran_targets_subject_period_idx on public.quran_targets(subject_id, academic_year_id, semester_id);
create index if not exists tahfidz_student_targets_subject_period_idx on public.tahfidz_student_targets(subject_id, academic_year_id, semester_id);
create index if not exists tahsin_student_targets_subject_period_idx on public.tahsin_student_targets(subject_id, academic_year_id, semester_id);
create index if not exists tahfidz_student_targets_halaqoh_idx on public.tahfidz_student_targets(halaqoh_id);
create index if not exists tahsin_student_targets_halaqoh_idx on public.tahsin_student_targets(halaqoh_id);

-- One-time classification for existing subject masters. New records are configured explicitly in the UI.
update public.subjects
set quran_program_type = case
  when lower(coalesce(name, '') || ' ' || coalesce(code, '')) ~ 'tahsin'
   and lower(coalesce(name, '') || ' ' || coalesce(code, '')) ~ 'tahfidz' then 'both'
  when lower(coalesce(name, '') || ' ' || coalesce(code, '')) ~ 'tahsin' then 'tahsin'
  when lower(coalesce(name, '') || ' ' || coalesce(code, '')) ~ 'tahfidz' then 'tahfidz'
  else quran_program_type
end
where quran_program_type is null;

-- Backfill only when an employee unit has exactly one compatible subject.
with candidates as (
  select h.id as halaqoh_id, min(s.id::text)::uuid as subject_id
  from public.tahfidz_halaqohs h
  join public.employees e on e.id = h.employee_id
  join public.subjects s on s.unit_id = e.unit_id and s.is_active is not false
    and (s.quran_program_type = h.program_type or s.quran_program_type = 'both')
  where h.subject_id is null
  group by h.id
  having count(*) = 1
)
update public.tahfidz_halaqohs h
set subject_id = candidates.subject_id
from candidates
where h.id = candidates.halaqoh_id;

update public.quran_records r
set subject_id = h.subject_id
from public.tahfidz_halaqohs h
where r.halaqoh_id = h.id and r.subject_id is null and h.subject_id is not null;

with assessment_halaqoh_candidates as (
  select a.id as assessment_id, min(h.id::text)::uuid as halaqoh_id, min(h.subject_id::text)::uuid as subject_id
  from public.quran_assessments a
  join public.tahfidz_halaqoh_members member on member.student_id = a.student_id
  join public.tahfidz_halaqohs h on h.id = member.halaqoh_id
    and h.academic_year_id = a.academic_year_id
    and h.semester_id = a.semester_id
    and h.program_type = case when a.assessment_type = 'tahsin_jilid' then 'tahsin' else 'tahfidz' end
  where a.halaqoh_id is null and h.subject_id is not null
  group by a.id
  having count(*) = 1
)
update public.quran_assessments a
set halaqoh_id = candidate.halaqoh_id, subject_id = coalesce(a.subject_id, candidate.subject_id)
from assessment_halaqoh_candidates candidate
where a.id = candidate.assessment_id;

update public.quran_assessments a
set subject_id = h.subject_id
from public.tahfidz_halaqohs h
where a.halaqoh_id = h.id and a.subject_id is null and h.subject_id is not null;

with target_candidates as (
  select target.id as target_id, min(h.id::text)::uuid as halaqoh_id, min(h.subject_id::text)::uuid as subject_id
  from public.tahfidz_student_targets target
  join public.tahfidz_halaqoh_members member on member.student_id = target.student_id
  join public.tahfidz_halaqohs h on h.id = member.halaqoh_id
    and h.academic_year_id = target.academic_year_id
    and h.semester_id = target.semester_id
    and h.program_type = target.target_type
  where target.subject_id is null and h.subject_id is not null
  group by target.id
  having count(*) = 1
)
update public.tahfidz_student_targets target
set halaqoh_id = candidate.halaqoh_id, subject_id = candidate.subject_id
from target_candidates candidate
where target.id = candidate.target_id;

with target_candidates as (
  select target.id as target_id, min(h.id::text)::uuid as halaqoh_id, min(h.subject_id::text)::uuid as subject_id
  from public.tahsin_student_targets target
  join public.tahfidz_halaqoh_members member on member.student_id = target.student_id
  join public.tahfidz_halaqohs h on h.id = member.halaqoh_id
    and h.academic_year_id = target.academic_year_id
    and h.semester_id = target.semester_id
    and h.program_type = target.target_type
  where target.subject_id is null and h.subject_id is not null
  group by target.id
  having count(*) = 1
)
update public.tahsin_student_targets target
set halaqoh_id = candidate.halaqoh_id, subject_id = candidate.subject_id
from target_candidates candidate
where target.id = candidate.target_id;

create or replace function public.quran_subject_supports_program(p_subject_id uuid, p_program_type text)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_subject_id is null or exists (
    select 1 from public.subjects s
    where s.id = p_subject_id
      and s.is_active is not false
      and (s.quran_program_type = p_program_type or s.quran_program_type = 'both')
  );
$$;

create or replace function public.validate_quran_halaqoh_subject()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subject_id is not null and not public.quran_subject_supports_program(new.subject_id, new.program_type) then
    raise exception 'Mata pelajaran tidak sesuai dengan program halaqoh %.', new.program_type;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_quran_halaqoh_subject on public.tahfidz_halaqohs;
create trigger validate_quran_halaqoh_subject
  before insert or update of subject_id, program_type on public.tahfidz_halaqohs
  for each row execute function public.validate_quran_halaqoh_subject();

create or replace function public.inherit_quran_record_subject()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_subject_id uuid;
  v_program_type text;
  v_academic_year_id uuid;
  v_semester_id uuid;
begin
  if new.halaqoh_id is not null then
    select h.subject_id, h.program_type, h.academic_year_id, h.semester_id
    into v_subject_id, v_program_type, v_academic_year_id, v_semester_id
    from public.tahfidz_halaqohs h where h.id = new.halaqoh_id;
    if v_program_type is distinct from new.record_type then
      raise exception 'Jenis jurnal tidak sesuai dengan program halaqoh.';
    end if;
    if new.subject_id is null then new.subject_id := v_subject_id; end if;
    if v_subject_id is not null and new.subject_id is distinct from v_subject_id then
      raise exception 'Mata pelajaran jurnal tidak sesuai dengan halaqoh.';
    end if;
    if new.academic_year_id is distinct from v_academic_year_id or new.semester_id is distinct from v_semester_id then
      raise exception 'Periode jurnal harus sama dengan periode halaqoh.';
    end if;
  end if;
  if new.subject_id is not null and not public.quran_subject_supports_program(new.subject_id, new.record_type) then
    raise exception 'Mata pelajaran tidak mendukung jurnal %.', new.record_type;
  end if;
  return new;
end;
$$;

drop trigger if exists inherit_quran_record_subject on public.quran_records;
create trigger inherit_quran_record_subject
  before insert or update of subject_id, halaqoh_id, record_type, academic_year_id, semester_id on public.quran_records
  for each row execute function public.inherit_quran_record_subject();

create or replace function public.inherit_quran_assessment_subject()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_subject_id uuid;
  v_program_type text;
  v_halaqoh_program text;
  v_academic_year_id uuid;
  v_semester_id uuid;
begin
  v_program_type := case when new.assessment_type = 'tahsin_jilid' then 'tahsin' else 'tahfidz' end;
  if new.halaqoh_id is not null then
    select h.subject_id, h.program_type, h.academic_year_id, h.semester_id
    into v_subject_id, v_halaqoh_program, v_academic_year_id, v_semester_id
    from public.tahfidz_halaqohs h where h.id = new.halaqoh_id;
    if v_halaqoh_program is distinct from v_program_type then
      raise exception 'Jenis asesmen tidak sesuai dengan program halaqoh.';
    end if;
    if new.subject_id is null then new.subject_id := v_subject_id; end if;
    if v_subject_id is not null and new.subject_id is distinct from v_subject_id then
      raise exception 'Mata pelajaran asesmen tidak sesuai dengan halaqoh.';
    end if;
    if new.academic_year_id is distinct from v_academic_year_id or new.semester_id is distinct from v_semester_id then
      raise exception 'Periode asesmen harus sama dengan periode halaqoh.';
    end if;
  end if;
  if new.subject_id is not null and not public.quran_subject_supports_program(new.subject_id, v_program_type) then
    raise exception 'Mata pelajaran tidak mendukung jenis asesmen ini.';
  end if;
  return new;
end;
$$;

drop trigger if exists inherit_quran_assessment_subject on public.quran_assessments;
create trigger inherit_quran_assessment_subject
  before insert or update of subject_id, halaqoh_id, assessment_type, academic_year_id, semester_id on public.quran_assessments
  for each row execute function public.inherit_quran_assessment_subject();

create or replace function public.validate_quran_target_subject()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subject_id is not null and not public.quran_subject_supports_program(new.subject_id, new.target_type) then
    raise exception 'Mata pelajaran tidak mendukung target %.', new.target_type;
  end if;
  return new;
end;
$$;

create or replace function public.inherit_quran_student_target_subject()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_subject_id uuid;
  v_program_type text;
  v_academic_year_id uuid;
  v_semester_id uuid;
begin
  if new.halaqoh_id is not null then
    select h.subject_id, h.program_type, h.academic_year_id, h.semester_id
    into v_subject_id, v_program_type, v_academic_year_id, v_semester_id
    from public.tahfidz_halaqohs h where h.id = new.halaqoh_id;
    if v_program_type is distinct from new.target_type then
      raise exception 'Jenis target tidak sesuai dengan program halaqoh.';
    end if;
    if new.subject_id is null then new.subject_id := v_subject_id; end if;
    if v_subject_id is not null and new.subject_id is distinct from v_subject_id then
      raise exception 'Mata pelajaran target tidak sesuai dengan halaqoh.';
    end if;
    if new.academic_year_id is distinct from v_academic_year_id or new.semester_id is distinct from v_semester_id then
      raise exception 'Periode target harus sama dengan periode halaqoh.';
    end if;
  end if;
  if new.subject_id is not null and not public.quran_subject_supports_program(new.subject_id, new.target_type) then
    raise exception 'Mata pelajaran tidak mendukung target %.', new.target_type;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_quran_target_subject on public.quran_targets;
create trigger validate_quran_target_subject
  before insert or update of subject_id, target_type on public.quran_targets
  for each row execute function public.validate_quran_target_subject();

drop trigger if exists validate_tahsin_student_target_subject on public.tahsin_student_targets;
create trigger validate_tahsin_student_target_subject
  before insert or update of subject_id, halaqoh_id, target_type, academic_year_id, semester_id on public.tahsin_student_targets
  for each row execute function public.inherit_quran_student_target_subject();

drop trigger if exists validate_tahfidz_student_target_subject on public.tahfidz_student_targets;
create trigger validate_tahfidz_student_target_subject
  before insert or update of subject_id, halaqoh_id, target_type, academic_year_id, semester_id on public.tahfidz_student_targets
  for each row execute function public.inherit_quran_student_target_subject();

create or replace function public.validate_quran_halaqoh_membership()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_subject_unit_id uuid;
  v_student_unit_id uuid;
  v_program_type text;
  v_academic_year_id uuid;
  v_semester_id uuid;
begin
  select s.unit_id, h.program_type, h.academic_year_id, h.semester_id
  into v_subject_unit_id, v_program_type, v_academic_year_id, v_semester_id
  from public.tahfidz_halaqohs h
  left join public.subjects s on s.id = h.subject_id
  where h.id = new.halaqoh_id;

  select coalesce(student.unit_id, class.unit_id) into v_student_unit_id
  from public.students student
  left join public.classes class on class.id = student.class_id
  where student.id = new.student_id;

  if v_subject_unit_id is not null and v_student_unit_id is distinct from v_subject_unit_id then
    raise exception 'Unit siswa tidak sesuai dengan unit mata pelajaran halaqoh.';
  end if;

  if exists (
    select 1
    from public.tahfidz_halaqoh_members member
    join public.tahfidz_halaqohs h on h.id = member.halaqoh_id
    where member.student_id = new.student_id
      and member.id is distinct from new.id
      and h.program_type = v_program_type
      and h.academic_year_id = v_academic_year_id
      and h.semester_id = v_semester_id
  ) then
    raise exception 'Siswa sudah terdaftar pada halaqoh program yang sama di semester ini.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_quran_halaqoh_membership on public.tahfidz_halaqoh_members;
create trigger validate_quran_halaqoh_membership
  before insert or update of halaqoh_id, student_id on public.tahfidz_halaqoh_members
  for each row execute function public.validate_quran_halaqoh_membership();

-- Keep the central employee schedule relational as well as human-readable.
create or replace function public.sync_halaqoh_employee_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit_id uuid;
  v_subject_name text;
begin
  if tg_op = 'DELETE' then
    delete from public.employee_schedules where halaqoh_id = old.id;
    return old;
  end if;

  if new.employee_id is null or new.schedule_day is null
    or new.schedule_start_time is null or new.schedule_end_time is null then
    delete from public.employee_schedules where halaqoh_id = new.id;
    return new;
  end if;

  select coalesce(s.unit_id, e.unit_id), s.name into v_unit_id, v_subject_name
  from public.employees e
  left join public.subjects s on s.id = new.subject_id
  where e.id = new.employee_id;

  insert into public.employee_schedules (
    employee_id, day_of_week, start_time, end_time, schedule_type,
    subject, subject_id, academic_year_id, semester_id, unit_id, halaqoh_id
  ) values (
    new.employee_id,
    case when new.schedule_day = 'Ahad' then 'Minggu' else new.schedule_day end,
    new.schedule_start_time, new.schedule_end_time, 'mengajar',
    coalesce(v_subject_name, concat('Halaqoh ', initcap(coalesce(new.program_type, 'quran')))),
    new.subject_id, new.academic_year_id, new.semester_id, v_unit_id, new.id
  )
  on conflict (halaqoh_id) where halaqoh_id is not null do update set
    employee_id = excluded.employee_id,
    day_of_week = excluded.day_of_week,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    schedule_type = excluded.schedule_type,
    subject = excluded.subject,
    subject_id = excluded.subject_id,
    academic_year_id = excluded.academic_year_id,
    semester_id = excluded.semester_id,
    unit_id = excluded.unit_id,
    updated_at = now();

  return new;
end;
$$;

-- Re-run the schedule trigger for mapped halaqohs.
update public.tahfidz_halaqohs set updated_at = now() where subject_id is not null;

notify pgrst, 'reload schema';
