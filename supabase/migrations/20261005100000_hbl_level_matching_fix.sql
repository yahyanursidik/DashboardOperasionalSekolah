-- HBL class levels are stored as "kbhbl", "tkahbl", "tkbhbl". The previous normalizer required
-- "kb" to be followed by a non-letter, so KB-HBL children (level "kbhbl") never matched a KB
-- program and could not be enrolled. Separators are now ignored and both the class level and the
-- class name are checked (same rule as normalizePreschoolLevel in src/modules/hbl/hbl-config.ts).

create or replace function public.hbl_normalize_preschool_level(p_value text)
returns text language sql immutable set search_path = public as $$
  with v as (select regexp_replace(lower(coalesce(p_value, '')), '[\s_-]+', '', 'g') as t)
  select case
    when t = '' then null
    when t like 'kb%' or t like '%kelompokbermain%' or t like '%playgroup%' then 'kb'
    when t like '%tka%' then 'tka'
    when t like '%tkb%' then 'tkb'
    else null
  end from v;
$$;

create or replace function public.hbl_student_matches_preschool_level(p_program_id uuid, p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when program.preschool_level is null then true
    else coalesce(
      public.hbl_normalize_preschool_level(class_record.level) = program.preschool_level
        or public.hbl_normalize_preschool_level(class_record.name) = program.preschool_level,
      false
    )
  end
  from public.hbl_programs program
  join public.students student on student.id = p_student_id
  left join public.classes class_record on class_record.id = student.class_id
  where program.id = p_program_id;
$$;
