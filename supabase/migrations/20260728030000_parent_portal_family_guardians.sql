-- Expose the complete guardian set for each accessible student so the family
-- profile is not limited to the account currently used to sign in.

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
