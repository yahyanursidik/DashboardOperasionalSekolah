-- Employee assignment quality: one source of truth for position, academic assignment, and schedule.

alter table public.teacher_assignments
  add column if not exists subject_id uuid references public.subjects(id) on delete restrict,
  add column if not exists semester_id uuid references public.semesters(id) on delete restrict,
  add column if not exists notes text;

alter table public.employee_schedules
  add column if not exists assignment_id uuid references public.teacher_assignments(id) on delete set null;

alter table public.teacher_assignments drop constraint if exists teacher_assignments_role_type_check;
alter table public.teacher_assignments add constraint teacher_assignments_role_type_check
  check (role_type in (
    'homeroom', 'subject', 'subject_teacher', 'coordinator', 'substitute',
    'wali_kelas', 'guru_mapel', 'guru_quran', 'guru_diniyah', 'staff'
  ));

update public.teacher_assignments assignment
set subject_id = subject.id
from public.subjects subject
where assignment.subject_id is null
  and assignment.subject is not null
  and lower(trim(subject.name)) = lower(trim(assignment.subject))
  and (subject.unit_id = assignment.unit_id or subject.unit_id is null)
  and not exists (
    select 1 from public.subjects duplicate
    where lower(trim(duplicate.name)) = lower(trim(assignment.subject))
      and (duplicate.unit_id = assignment.unit_id or duplicate.unit_id is null)
      and duplicate.id <> subject.id
  );

create index if not exists teacher_assignments_employee_period_idx
  on public.teacher_assignments(employee_id, academic_year_id, semester_id, is_active);
create index if not exists teacher_assignments_subject_idx
  on public.teacher_assignments(subject_id, class_id);
create index if not exists employee_schedules_assignment_idx
  on public.employee_schedules(assignment_id);

with ranked_assignments as (
  select id,
    row_number() over (
      partition by employee_id, role_type, unit_id,
        coalesce(class_id, '00000000-0000-0000-0000-000000000000'::uuid),
        coalesce(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
        academic_year_id,
        coalesce(semester_id, '00000000-0000-0000-0000-000000000000'::uuid)
      order by created_at desc nulls last, id desc
    ) as duplicate_rank
  from public.teacher_assignments
  where is_active
)
update public.teacher_assignments assignment
set is_active = false
from ranked_assignments ranked
where assignment.id = ranked.id and ranked.duplicate_rank > 1;

create unique index if not exists teacher_assignments_active_unique
  on public.teacher_assignments (
    employee_id,
    role_type,
    unit_id,
    coalesce(class_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    academic_year_id,
    coalesce(semester_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) where is_active;

create or replace function public.validate_employee_academic_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  class_unit_id uuid;
  semester_year_id uuid;
begin
  if new.semester_id is not null then
    select academic_year_id into semester_year_id from public.semesters where id = new.semester_id;
    if semester_year_id is distinct from new.academic_year_id then
      raise exception 'ASSIGNMENT_SEMESTER_YEAR_MISMATCH';
    end if;
  end if;

  if new.class_id is not null then
    select unit_id into class_unit_id from public.classes where id = new.class_id;
    if class_unit_id is distinct from new.unit_id then
      raise exception 'ASSIGNMENT_CLASS_UNIT_MISMATCH';
    end if;
  end if;

  if coalesce(new.is_active, true) and new.role_type in ('wali_kelas', 'homeroom') and new.class_id is null then
    raise exception 'HOMEROOM_CLASS_REQUIRED';
  end if;
  if coalesce(new.is_active, true)
    and new.role_type in ('guru_mapel', 'subject', 'subject_teacher', 'guru_diniyah')
    and (new.class_id is null or (new.subject_id is null and nullif(trim(new.subject), '') is null)) then
    raise exception 'SUBJECT_ASSIGNMENT_CLASS_SUBJECT_REQUIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_employee_academic_assignment_trigger on public.teacher_assignments;
create trigger validate_employee_academic_assignment_trigger
  before insert or update on public.teacher_assignments
  for each row execute function public.validate_employee_academic_assignment();

create or replace function public.sync_homeroom_from_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE')
    and old.role_type in ('wali_kelas', 'homeroom')
    and old.class_id is not null
    and (tg_op = 'DELETE' or new.class_id is distinct from old.class_id or not coalesce(new.is_active, false)) then
    update public.classes set homeroom_teacher_id = null
    where id = old.class_id and homeroom_teacher_id = old.employee_id;
  end if;

  if tg_op <> 'DELETE'
    and new.role_type in ('wali_kelas', 'homeroom')
    and new.class_id is not null
    and coalesce(new.is_active, true) then
    update public.classes set homeroom_teacher_id = new.employee_id where id = new.class_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sync_homeroom_from_assignment_trigger on public.teacher_assignments;
create trigger sync_homeroom_from_assignment_trigger
  after insert or update or delete on public.teacher_assignments
  for each row execute function public.sync_homeroom_from_assignment();

create or replace function public.teacher_has_portal_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employees employee
    where employee.user_id = auth.uid() and employee.status = 'active'
      and (
        employee.position in ('guru', 'guru_quran', 'bk', 'kepala_sekolah', 'wakasek', 'wakasek_umum', 'wakasek_kurikulum', 'wakasek_kesiswaan', 'kepala_unit')
        or exists (
          select 1 from public.teacher_assignments assignment
          where assignment.employee_id = employee.id and coalesce(assignment.is_active, true)
            and assignment.role_type in ('homeroom', 'wali_kelas', 'subject', 'subject_teacher', 'guru_mapel', 'guru_quran', 'guru_diniyah', 'coordinator')
            and exists (select 1 from public.academic_years year where year.id = assignment.academic_year_id and year.is_active)
            and (assignment.semester_id is null or exists (select 1 from public.semesters semester where semester.id = assignment.semester_id and semester.is_active))
        )
        or exists (select 1 from public.employee_schedules schedule where schedule.employee_id = employee.id and schedule.schedule_type = 'mengajar')
        or exists (select 1 from public.classes class where class.homeroom_teacher_id = employee.id)
        or exists (select 1 from public.tahfidz_halaqohs halaqoh where halaqoh.employee_id = employee.id)
      )
  );
$$;

create or replace function public.get_teacher_login_email_by_identifier(p_identifier text)
returns text
language sql
security definer
set search_path = public
as $$
  select employee.email
  from public.employees employee
  where employee.status = 'active'
    and (lower(employee.email) = lower(trim(p_identifier)) or employee.nik = trim(p_identifier))
    and (
      employee.position in ('guru', 'guru_quran', 'bk', 'kepala_sekolah', 'wakasek', 'wakasek_umum', 'wakasek_kurikulum', 'wakasek_kesiswaan', 'kepala_unit')
      or exists (
        select 1 from public.teacher_assignments assignment
        where assignment.employee_id = employee.id and coalesce(assignment.is_active, true)
          and assignment.role_type in ('homeroom', 'wali_kelas', 'subject', 'subject_teacher', 'guru_mapel', 'guru_quran', 'guru_diniyah', 'coordinator')
      )
      or exists (select 1 from public.employee_schedules schedule where schedule.employee_id = employee.id and schedule.schedule_type = 'mengajar')
      or exists (select 1 from public.classes class where class.homeroom_teacher_id = employee.id)
      or exists (select 1 from public.tahfidz_halaqohs halaqoh where halaqoh.employee_id = employee.id)
    )
  limit 1;
$$;

drop policy if exists "Employees read own academic assignments" on public.teacher_assignments;
create policy "Employees read own academic assignments"
  on public.teacher_assignments for select to authenticated
  using (employee_id = public.current_employee_id());

drop policy if exists "Managers manage academic assignments" on public.teacher_assignments;
create policy "Managers manage academic assignments"
  on public.teacher_assignments for all to authenticated
  using (public.teacher_portal_is_manager(unit_id))
  with check (public.teacher_portal_is_manager(unit_id));

grant execute on function public.validate_employee_academic_assignment() to authenticated;
grant execute on function public.teacher_has_portal_access() to authenticated;
grant execute on function public.get_teacher_login_email_by_identifier(text) to anon, authenticated;
