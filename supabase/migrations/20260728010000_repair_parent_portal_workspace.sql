-- Keep the parent portal independent from fragile nested PostgREST joins and
-- repair the unit field expected by all portal schedule/profile surfaces.

alter table public.units
  add column if not exists education_level text;

update public.units
set education_level = case
  when lower(name) ~ '(paud|preschool|tk|kelompok bermain|playgroup)' then 'preschool'
  when lower(name) ~ '(elementary|sd|sekolah dasar)' then 'elementary'
  else education_level
end
where education_level is null;

create or replace function public.ensure_parent_portal_account()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := nullif(lower(btrim(auth.jwt() ->> 'email')), '');
begin
  if current_user_id is null or current_email is null then
    return false;
  end if;

  update public.parents
  set user_id = current_user_id,
      updated_at = now()
  where lower(btrim(email)) = current_email
    and is_active is distinct from false
    and user_id is distinct from current_user_id;

  return exists (
    select 1
    from public.parents parent_record
    where parent_record.user_id = current_user_id
      and parent_record.is_active is distinct from false
  );
end;
$$;

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
        'email', parent_record.email,
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

revoke all on function public.ensure_parent_portal_account() from public;
revoke all on function public.get_parent_portal_workspace() from public;
grant execute on function public.ensure_parent_portal_account() to authenticated;
grant execute on function public.get_parent_portal_workspace() to authenticated;

notify pgrst, 'reload schema';
