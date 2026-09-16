-- Separate Preschool HBL learning journeys for Kelompok Bermain, TK-A, and TK-B.
-- Existing programs remain available until an administrator classifies them.

alter table public.hbl_programs
  add column if not exists preschool_level text
    check (preschool_level is null or preschool_level in ('kb', 'tka', 'tkb'));

create index if not exists hbl_programs_preschool_level_idx
  on public.hbl_programs(unit_id, academic_year_id, semester_id, preschool_level, status);

create or replace function public.hbl_normalize_preschool_level(p_value text)
returns text language sql immutable set search_path = public as $$
  select case
    when lower(coalesce(p_value, '')) ~ '(^|[^a-z])kb([^a-z]|$)|kelompok[ _-]*bermain' then 'kb'
    when lower(coalesce(p_value, '')) ~ 'tk[ _-]*a|tka' then 'tka'
    when lower(coalesce(p_value, '')) ~ 'tk[ _-]*b|tkb' then 'tkb'
    else null
  end;
$$;

create or replace function public.hbl_student_matches_preschool_level(p_program_id uuid, p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when program.preschool_level is null then true
    else coalesce(
      public.hbl_normalize_preschool_level(coalesce(class_record.level, class_record.name)) = program.preschool_level,
      false
    )
  end
  from public.hbl_programs program
  join public.students student on student.id = p_student_id
  left join public.classes class_record on class_record.id = student.class_id
  where program.id = p_program_id;
$$;

create or replace function public.hbl_validate_program_student_level()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.hbl_student_matches_preschool_level(new.program_id, new.student_id) then
    raise exception 'Siswa tidak sesuai jenjang program HBL. Periksa kelas KB, TK-A, atau TK-B siswa.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists hbl_program_students_validate_preschool_level on public.hbl_program_students;
create trigger hbl_program_students_validate_preschool_level
before insert or update of program_id, student_id on public.hbl_program_students
for each row execute function public.hbl_validate_program_student_level();

grant execute on function public.hbl_normalize_preschool_level(text), public.hbl_student_matches_preschool_level(uuid, uuid) to authenticated;

comment on column public.hbl_programs.preschool_level is 'Preschool HBL journey level: kb, tka, or tkb. Null indicates a legacy program awaiting classification.';
