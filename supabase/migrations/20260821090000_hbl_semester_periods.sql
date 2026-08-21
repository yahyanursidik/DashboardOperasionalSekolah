-- Make the academic semester an explicit, validated dimension of every HBL program.

alter table public.hbl_programs
  add column if not exists semester_id uuid references public.semesters(id) on delete restrict;

update public.hbl_programs program
set semester_id = (
  select semester.id
  from public.semesters semester
  where semester.academic_year_id = program.academic_year_id
  order by semester.is_active desc, semester.start_date desc nulls last, semester.created_at desc
  limit 1
)
where program.semester_id is null;

do $$
begin
  if exists (select 1 from public.hbl_programs where semester_id is null) then
    raise exception 'Cannot require HBL semester: one or more existing programs have no matching semester';
  end if;
end;
$$;

alter table public.hbl_programs alter column semester_id set not null;

create or replace function public.hbl_validate_program_period()
returns trigger language plpgsql set search_path = public as $$
declare
  semester_year_id uuid;
begin
  select semester.academic_year_id into semester_year_id
  from public.semesters semester
  where semester.id = new.semester_id;

  if semester_year_id is null then
    raise exception 'Semester HBL tidak ditemukan';
  end if;

  if new.academic_year_id is null then
    new.academic_year_id := semester_year_id;
  elsif new.academic_year_id <> semester_year_id then
    raise exception 'Tahun ajaran program HBL harus sama dengan tahun ajaran semester';
  end if;

  return new;
end;
$$;

drop trigger if exists hbl_programs_validate_period on public.hbl_programs;
create trigger hbl_programs_validate_period
before insert or update of academic_year_id, semester_id on public.hbl_programs
for each row execute function public.hbl_validate_program_period();

drop index if exists public.hbl_programs_unit_status_idx;
create index if not exists hbl_programs_period_status_idx
  on public.hbl_programs(unit_id, academic_year_id, semester_id, status);
