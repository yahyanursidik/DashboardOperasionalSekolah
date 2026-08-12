-- Store an IANA time zone for Preschool HBL/online applicants. IANA names are
-- used instead of fixed UTC offsets so overseas families remain correct when
-- daylight-saving rules change.
alter table public.admissions_applicants
  add column if not exists residence_country text,
  add column if not exists learning_timezone text;

alter table public.students
  add column if not exists residence_country text,
  add column if not exists learning_timezone text;

alter table public.admissions_applicants drop constraint if exists admissions_applicants_residence_country_length;
alter table public.admissions_applicants add constraint admissions_applicants_residence_country_length
  check (residence_country is null or char_length(trim(residence_country)) between 2 and 120);
alter table public.admissions_applicants drop constraint if exists admissions_applicants_learning_timezone_length;
alter table public.admissions_applicants add constraint admissions_applicants_learning_timezone_length
  check (learning_timezone is null or char_length(learning_timezone) between 3 and 100);

alter table public.students drop constraint if exists students_residence_country_length;
alter table public.students add constraint students_residence_country_length
  check (residence_country is null or char_length(trim(residence_country)) between 2 and 120);
alter table public.students drop constraint if exists students_learning_timezone_length;
alter table public.students add constraint students_learning_timezone_length
  check (learning_timezone is null or char_length(learning_timezone) between 3 and 100);

create or replace function public.validate_learning_timezone()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if new.learning_timezone is not null
    and not exists (select 1 from pg_catalog.pg_timezone_names where name = new.learning_timezone)
  then
    raise exception 'Zona waktu % tidak valid. Gunakan nama zona waktu IANA.', new.learning_timezone
      using errcode = '22023';
  end if;
  if new.residence_country is not null then
    new.residence_country := trim(new.residence_country);
  end if;
  return new;
end;
$$;

drop trigger if exists validate_admission_learning_timezone on public.admissions_applicants;
create trigger validate_admission_learning_timezone
before insert or update of learning_timezone, residence_country on public.admissions_applicants
for each row execute function public.validate_learning_timezone();

drop trigger if exists validate_student_learning_timezone on public.students;
create trigger validate_student_learning_timezone
before insert or update of learning_timezone, residence_country on public.students
for each row execute function public.validate_learning_timezone();

-- The existing enrollment RPC creates the student first and then links it to
-- the applicant. This trigger carries the learning location across without
-- duplicating or weakening the enrollment workflow.
create or replace function public.sync_admission_learning_timezone_to_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.student_id is not null then
    update public.students
    set residence_country = new.residence_country,
        learning_timezone = new.learning_timezone,
        updated_at = now()
    where id = new.student_id
      and (residence_country is distinct from new.residence_country
        or learning_timezone is distinct from new.learning_timezone);
  end if;
  return new;
end;
$$;

drop trigger if exists sync_admission_learning_timezone_to_student on public.admissions_applicants;
create trigger sync_admission_learning_timezone_to_student
after insert or update of student_id, residence_country, learning_timezone on public.admissions_applicants
for each row execute function public.sync_admission_learning_timezone_to_student();

update public.students student
set residence_country = applicant.residence_country,
    learning_timezone = applicant.learning_timezone,
    updated_at = now()
from public.admissions_applicants applicant
where applicant.student_id = student.id
  and (student.residence_country is distinct from applicant.residence_country
    or student.learning_timezone is distinct from applicant.learning_timezone);

comment on column public.admissions_applicants.learning_timezone is
  'IANA time-zone name used to localize online learning and admission schedules.';
comment on column public.students.learning_timezone is
  'IANA time-zone name inherited from SPMB for parent-portal schedule localization.';

-- Keep the parent workspace contract current so enrolled families receive the
-- time zone alongside the student record used by schedule pages.
create or replace function public.get_parent_portal_workspace()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with current_parent as (
    select parent_record.*
    from public.parents parent_record
    where parent_record.user_id = auth.uid()
      and parent_record.is_active is distinct from false
    order by parent_record.created_at
    limit 1
  ),
  accessible_students as (
    select
      student.id,
      student.full_name,
      student.nis,
      student.nisn,
      student.class_id,
      student.unit_id,
      student.status,
      student.gender,
      student.photo_url,
      student.residence_country,
      student.learning_timezone,
      link.relationship,
      coalesce(link.is_primary, false) as is_primary_guardian,
      case when class_record.id is null then null else jsonb_build_object(
        'id', class_record.id,
        'name', class_record.name,
        'unit_id', class_record.unit_id,
        'units', case when unit_record.id is null then null else jsonb_build_object(
          'name', unit_record.name,
          'education_level', unit_record.education_level
        ) end
      ) end as classes,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', family_parent.id,
            'full_name', family_parent.full_name,
            'phone', family_parent.phone,
            'email', case
              when lower(coalesce(family_parent.email, '')) like '%@parent.demo' then null
              else family_parent.email
            end,
            'address', family_parent.address,
            'nik', family_parent.nik,
            'occupation', family_parent.occupation,
            'relationship', family_link.relationship,
            'is_primary', coalesce(family_link.is_primary, false),
            'can_access_parent_portal', coalesce(family_link.can_access_parent_portal, true)
          )
          order by
            coalesce(family_link.is_primary, false) desc,
            case family_link.relationship when 'father' then 1 when 'mother' then 2 else 3 end,
            family_parent.full_name
        )
        from public.student_parent_links family_link
        join public.parents family_parent on family_parent.id = family_link.parent_id
        where family_link.student_id = student.id
          and family_parent.is_active is distinct from false
      ), '[]'::jsonb) as guardians,
      link.created_at
    from current_parent parent_record
    join public.student_parent_links link on link.parent_id = parent_record.id
    join public.students student on student.id = link.student_id
    left join public.classes class_record on class_record.id = student.class_id
    left join public.units unit_record on unit_record.id = coalesce(class_record.unit_id, student.unit_id)
    where coalesce(link.can_access_parent_portal, true)
  )
  select jsonb_build_object(
    'parent', (
      select jsonb_build_object(
        'id', parent_record.id,
        'full_name', parent_record.full_name,
        'phone', parent_record.phone,
        'email', case
          when lower(coalesce(parent_record.email, '')) like '%@parent.demo' then null
          else parent_record.email
        end,
        'address', parent_record.address,
        'nik', parent_record.nik,
        'occupation', parent_record.occupation
      )
      from current_parent parent_record
    ),
    'students', coalesce((
      select jsonb_agg(
        to_jsonb(student_record) - 'created_at'
        order by student_record.is_primary_guardian desc, student_record.created_at, student_record.full_name
      )
      from accessible_students student_record
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_parent_portal_workspace() from public;
grant execute on function public.get_parent_portal_workspace() to authenticated;

notify pgrst, 'reload schema';
