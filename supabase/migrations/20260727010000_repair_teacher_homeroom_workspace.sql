-- Repair partially applied teacher-assignment quality changes and keep class
-- ownership synchronized for every portal that still reads classes directly.

alter table public.teacher_assignments
  add column if not exists subject_id uuid references public.subjects(id) on delete restrict,
  add column if not exists semester_id uuid references public.semesters(id) on delete restrict,
  add column if not exists notes text;

create index if not exists teacher_assignments_employee_period_idx
  on public.teacher_assignments(employee_id, academic_year_id, semester_id, is_active);
create index if not exists teacher_assignments_subject_idx
  on public.teacher_assignments(subject_id, class_id);

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
    and (
      tg_op = 'DELETE'
      or new.class_id is distinct from old.class_id
      or new.employee_id is distinct from old.employee_id
      or not coalesce(new.is_active, false)
    ) then
    update public.classes
    set homeroom_teacher_id = null
    where id = old.class_id and homeroom_teacher_id = old.employee_id;
  end if;

  if tg_op <> 'DELETE'
    and new.role_type in ('wali_kelas', 'homeroom')
    and new.class_id is not null
    and coalesce(new.is_active, true) then
    update public.classes
    set homeroom_teacher_id = new.employee_id
    where id = new.class_id;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sync_homeroom_from_assignment_trigger on public.teacher_assignments;
create trigger sync_homeroom_from_assignment_trigger
  after insert or update or delete on public.teacher_assignments
  for each row execute function public.sync_homeroom_from_assignment();

with active_homerooms as (
  select distinct on (assignment.class_id)
    assignment.class_id,
    assignment.employee_id
  from public.teacher_assignments assignment
  join public.academic_years academic_year on academic_year.id = assignment.academic_year_id
  where assignment.class_id is not null
    and assignment.role_type in ('wali_kelas', 'homeroom')
    and coalesce(assignment.is_active, true)
  order by assignment.class_id, academic_year.is_active desc, assignment.updated_at desc nulls last, assignment.created_at desc
)
update public.classes class
set homeroom_teacher_id = homeroom.employee_id
from active_homerooms homeroom
where class.id = homeroom.class_id
  and class.homeroom_teacher_id is distinct from homeroom.employee_id;

grant execute on function public.sync_homeroom_from_assignment() to authenticated;
