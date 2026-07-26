-- Repair semester assessment metadata on projects where the original
-- curriculum-semester migration was only partially applied.

alter table public.subject_curriculum_semesters
  add column if not exists include_in_report boolean not null default true,
  add column if not exists final_assessment_type text,
  add column if not exists assessment_weights jsonb not null
    default '{"formatif":30,"sumatif_lingkup":30,"sts":20,"semester_final":20}'::jsonb;

update public.subject_curriculum_semesters
set final_assessment_type = case
  when semester_name = 'Genap' then 'asat'
  else 'sas'
end
where final_assessment_type is null;

-- Quran progress is assessed through the dedicated Tahsin/Tahfidz workflow.
update public.subject_curriculum_semesters semester_plan
set final_assessment_type = 'none'
from public.subject_curriculums curriculum
join public.subjects subject on subject.id = curriculum.subject_id
where semester_plan.subject_curriculum_id = curriculum.id
  and subject.quran_program_type in ('tahsin', 'tahfidz', 'both');

alter table public.subject_curriculum_semesters
  alter column final_assessment_type set default 'sas',
  alter column final_assessment_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.subject_curriculum_semesters'::regclass
      and conname = 'subject_curriculum_semesters_final_assessment_type_check'
  ) then
    alter table public.subject_curriculum_semesters
      add constraint subject_curriculum_semesters_final_assessment_type_check
      check (final_assessment_type in ('sas', 'asat', 'none'));
  end if;
end
$$;

create index if not exists subject_curriculum_semesters_assessment_idx
  on public.subject_curriculum_semesters(semester_id, final_assessment_type, include_in_report);

notify pgrst, 'reload schema';
