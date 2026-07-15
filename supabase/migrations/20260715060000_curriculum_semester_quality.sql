-- Separate annual curriculum foundations from semester execution plans.

create table if not exists public.subject_curriculum_semesters (
  id uuid primary key default gen_random_uuid(),
  subject_curriculum_id uuid not null references public.subject_curriculums(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  semester_name text not null check (semester_name in ('Ganjil', 'Genap')),
  weekly_hours smallint check (weekly_hours is null or weekly_hours between 1 and 48),
  include_in_report boolean not null default true,
  final_assessment_type text not null default 'sas'
    constraint subject_curriculum_semesters_final_assessment_type_check
    check (final_assessment_type in ('sas', 'asat', 'none')),
  assessment_weights jsonb not null default '{"formatif":30,"sumatif_lingkup":30,"sts":20,"semester_final":20}'::jsonb,
  prosem_data jsonb not null default '{"rows": [], "rppm": []}'::jsonb,
  learning_plan_data jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'ready', 'reviewed')),
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(subject_curriculum_id, semester_id),
  unique(subject_curriculum_id, semester_name)
);

create index if not exists subject_curriculum_semesters_parent_idx
  on public.subject_curriculum_semesters(subject_curriculum_id);
create index if not exists subject_curriculum_semesters_semester_status_idx
  on public.subject_curriculum_semesters(semester_id, status);

alter table public.subject_curriculum_semesters
  add column if not exists include_in_report boolean not null default true,
  add column if not exists final_assessment_type text,
  add column if not exists assessment_weights jsonb not null default '{"formatif":30,"sumatif_lingkup":30,"sts":20,"semester_final":20}'::jsonb;

update public.subject_curriculum_semesters
set final_assessment_type = case when semester_name = 'Genap' then 'asat' else 'sas' end
where final_assessment_type is null
;

alter table public.subject_curriculum_semesters
  alter column final_assessment_type set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subject_curriculum_semesters_final_assessment_type_check'
  ) then
    alter table public.subject_curriculum_semesters
      add constraint subject_curriculum_semesters_final_assessment_type_check
      check (final_assessment_type in ('sas', 'asat', 'none'));
  end if;
end $$;

-- Schedules must be scoped to the active semester as well as academic year.
alter table public.employee_schedules
  add column if not exists semester_id uuid references public.semesters(id) on delete set null;

drop trigger if exists handle_subject_curriculum_semesters_updated_at on public.subject_curriculum_semesters;
create trigger handle_subject_curriculum_semesters_updated_at
  before update on public.subject_curriculum_semesters
  for each row execute procedure public.handle_updated_at();

-- Preserve the existing semester plan. Empty legacy plans are not copied.
insert into public.subject_curriculum_semesters (
  subject_curriculum_id,
  semester_id,
  semester_name,
  include_in_report,
  final_assessment_type,
  assessment_weights,
  prosem_data,
  learning_plan_data,
  status
)
select
  sc.id,
  semester_row.id,
  semester_row.name,
  true,
  case when semester_row.name = 'Genap' then 'asat' else 'sas' end,
  '{"formatif":30,"sumatif_lingkup":30,"sts":20,"semester_final":20}'::jsonb,
  jsonb_build_object(
    'rows', coalesce(sc.prosem_data->'rows', '[]'::jsonb),
    'rppm', coalesce(sc.prosem_data->'rppm', '[]'::jsonb)
  ),
  coalesce(sc.learning_plan_data, '[]'::jsonb),
  case
    when jsonb_array_length(coalesce(sc.prosem_data->'rows', '[]'::jsonb)) > 0
      and jsonb_array_length(coalesce(sc.prosem_data->'rppm', '[]'::jsonb)) > 0
      and jsonb_array_length(coalesce(sc.learning_plan_data, '[]'::jsonb)) > 0 then 'ready'
    when jsonb_array_length(coalesce(sc.prosem_data->'rows', '[]'::jsonb)) > 0
      or jsonb_array_length(coalesce(sc.prosem_data->'rppm', '[]'::jsonb)) > 0
      or jsonb_array_length(coalesce(sc.learning_plan_data, '[]'::jsonb)) > 0 then 'in_progress'
    else 'draft'
  end
from public.subject_curriculums sc
join lateral (
  select sem.id, sem.name
  from public.semesters sem
  where sem.academic_year_id = sc.academic_year_id
    and sem.name = case
      when sc.prosem_data->>'semester' in ('Ganjil', 'Genap') then sc.prosem_data->>'semester'
      else 'Ganjil'
    end
  order by sem.is_active desc, sem.start_date nulls last, sem.created_at
  limit 1
) semester_row on true
where sc.prosem_data is not null or sc.learning_plan_data is not null
on conflict (subject_curriculum_id, semester_id) do nothing;

-- Harden the annual curriculum parent. The legacy setup allowed every
-- authenticated user to manage it and anonymous users to read it.
alter table public.subject_curriculums enable row level security;

drop policy if exists "Allow authenticated full access to subject_curriculums" on public.subject_curriculums;
drop policy if exists "Allow anon select access to subject_curriculums" on public.subject_curriculums;
drop policy if exists "Curriculum managers read annual curriculum in accessible units" on public.subject_curriculums;
create policy "Curriculum managers read annual curriculum in accessible units"
  on public.subject_curriculums for select to authenticated
  using (exists (
    select 1
    from public.subjects subject
    where subject.id = subject_curriculums.subject_id
      and public.can_access_unit(subject.unit_id)
  ));

drop policy if exists "Curriculum managers manage annual curriculum in accessible units" on public.subject_curriculums;
create policy "Curriculum managers manage annual curriculum in accessible units"
  on public.subject_curriculums for all to authenticated
  using (exists (
    select 1
    from public.subjects subject
    where subject.id = subject_curriculums.subject_id
      and public.can_access_unit(subject.unit_id)
      and (
        public.has_role('super_admin')
        or public.has_role('ketua_yayasan')
        or public.has_role('kepsek')
        or public.has_role('wakasek')
        or public.has_role('admin_sekolah')
        or public.has_role('admin_unit')
      )
  ))
  with check (exists (
    select 1
    from public.subjects subject
    where subject.id = subject_curriculums.subject_id
      and public.can_access_unit(subject.unit_id)
      and (
        public.has_role('super_admin')
        or public.has_role('ketua_yayasan')
        or public.has_role('kepsek')
        or public.has_role('wakasek')
        or public.has_role('admin_sekolah')
        or public.has_role('admin_unit')
      )
  ));

drop policy if exists "Assigned teachers read their annual curriculum" on public.subject_curriculums;
create policy "Assigned teachers read their annual curriculum"
  on public.subject_curriculums for select to authenticated
  using (exists (
    select 1
    from public.employee_schedules schedule
    join public.classes class_record
      on class_record.id = schedule.class_id
      and class_record.grade_level = subject_curriculums.grade_level
    join public.employees employee on employee.id = schedule.employee_id
    where schedule.subject_id = subject_curriculums.subject_id
      and schedule.academic_year_id = subject_curriculums.academic_year_id
      and employee.user_id = auth.uid()
      and employee.status = 'active'
      and schedule.schedule_type = 'mengajar'
  ));

revoke all on public.subject_curriculums from anon;
grant select, insert, update, delete on public.subject_curriculums to authenticated;

alter table public.subject_curriculum_semesters enable row level security;

drop policy if exists "Users read curriculum semester plans in accessible units" on public.subject_curriculum_semesters;
create policy "Users read curriculum semester plans in accessible units"
  on public.subject_curriculum_semesters for select to authenticated
  using (exists (
    select 1
    from public.subject_curriculums sc
    join public.subjects subject on subject.id = sc.subject_id
    where sc.id = subject_curriculum_id
      and public.can_access_unit(subject.unit_id)
  ));

drop policy if exists "Users manage curriculum semester plans in accessible units" on public.subject_curriculum_semesters;
create policy "Users manage curriculum semester plans in accessible units"
  on public.subject_curriculum_semesters for all to authenticated
  using (exists (
    select 1
    from public.subject_curriculums sc
    join public.subjects subject on subject.id = sc.subject_id
    where sc.id = subject_curriculum_id
      and public.can_access_unit(subject.unit_id)
      and (
        public.has_role('super_admin')
        or public.has_role('ketua_yayasan')
        or public.has_role('kepsek')
        or public.has_role('wakasek')
        or public.has_role('admin_sekolah')
        or public.has_role('admin_unit')
      )
  ))
  with check (exists (
    select 1
    from public.subject_curriculums sc
    join public.subjects subject on subject.id = sc.subject_id
    where sc.id = subject_curriculum_id
      and public.can_access_unit(subject.unit_id)
      and (
        public.has_role('super_admin')
        or public.has_role('ketua_yayasan')
        or public.has_role('kepsek')
        or public.has_role('wakasek')
        or public.has_role('admin_sekolah')
        or public.has_role('admin_unit')
      )
  ));

drop policy if exists "Assigned teachers read their curriculum semester plans" on public.subject_curriculum_semesters;
create policy "Assigned teachers read their curriculum semester plans"
  on public.subject_curriculum_semesters for select to authenticated
  using (exists (
    select 1
    from public.subject_curriculums sc
    join public.employee_schedules schedule
      on schedule.subject_id = sc.subject_id
      and schedule.academic_year_id = sc.academic_year_id
      and schedule.semester_id = subject_curriculum_semesters.semester_id
    join public.classes class_record
      on class_record.id = schedule.class_id
      and class_record.grade_level = sc.grade_level
    join public.employees employee on employee.id = schedule.employee_id
    where sc.id = subject_curriculum_id
      and employee.user_id = auth.uid()
      and employee.status = 'active'
      and schedule.schedule_type = 'mengajar'
  ));

grant select, insert, update, delete on public.subject_curriculum_semesters to authenticated;

-- Every grade entry may point back to the exact curriculum offering that
-- authorizes the subject for a class, academic year, and semester.
alter table public.academic_grades
  add column if not exists subject_curriculum_semester_id uuid
    references public.subject_curriculum_semesters(id) on delete restrict;

update public.academic_grades grade
set subject_curriculum_semester_id = semester_plan.id
from public.classes class_record
join public.subject_curriculums curriculum
  on curriculum.grade_level = class_record.grade_level
  and curriculum.academic_year_id = class_record.academic_year_id
join public.subject_curriculum_semesters semester_plan
  on semester_plan.subject_curriculum_id = curriculum.id
where grade.class_id = class_record.id
  and grade.subject_id = curriculum.subject_id
  and grade.semester_id = semester_plan.semester_id
  and grade.subject_curriculum_semester_id is null;

create index if not exists academic_grades_curriculum_semester_idx
  on public.academic_grades(subject_curriculum_semester_id, class_id, student_id);

drop policy if exists "Parents read linked academic grades" on public.academic_grades;
create policy "Parents read linked academic grades"
  on public.academic_grades for select to authenticated
  using (exists (
    select 1
    from public.student_parent_links link
    join public.parents parent_record on parent_record.id = link.parent_id
    where link.student_id = academic_grades.student_id
      and parent_record.user_id = auth.uid()
      and parent_record.is_active is distinct from false
      and coalesce(link.can_access_parent_portal, true)
  ));

drop policy if exists "Parents read linked curriculum assessment policy" on public.subject_curriculum_semesters;
create policy "Parents read linked curriculum assessment policy"
  on public.subject_curriculum_semesters for select to authenticated
  using (exists (
    select 1
    from public.academic_grades grade
    join public.student_parent_links link on link.student_id = grade.student_id
    join public.parents parent_record on parent_record.id = link.parent_id
    where grade.subject_curriculum_semester_id = subject_curriculum_semesters.id
      and parent_record.user_id = auth.uid()
      and parent_record.is_active is distinct from false
      and coalesce(link.can_access_parent_portal, true)
  ));

-- Report periods explicitly state the assessment basis used by the report.
alter table public.report_periods
  add column if not exists assessment_basis text;

update public.report_periods period
set assessment_basis = case
  when period.report_type = 'rapor_semester' and semester.name = 'Ganjil' then 'sas'
  when period.report_type = 'rapor_semester' and semester.name = 'Genap' then 'asat'
  when period.report_type in ('progress_awal', 'progress_tengah') then 'progress'
  else 'program'
end
from public.semesters semester
where semester.id = period.semester_id
  and period.assessment_basis is null;

update public.report_periods
set assessment_basis = 'program'
where assessment_basis is null;

alter table public.report_periods
  alter column assessment_basis set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'report_periods_assessment_basis_check'
  ) then
    alter table public.report_periods
      add constraint report_periods_assessment_basis_check
      check (assessment_basis in ('progress', 'sts', 'sas', 'asat', 'program'));
  end if;
end $$;

update public.employee_schedules schedule
set semester_id = (
  select sem.id
  from public.semesters sem
  where sem.academic_year_id = schedule.academic_year_id
  order by sem.is_active desc, sem.start_date nulls last, sem.created_at
  limit 1
)
where schedule.semester_id is null
  and schedule.academic_year_id is not null;

create index if not exists employee_schedules_semester_idx
  on public.employee_schedules(semester_id, unit_id, day_of_week);
