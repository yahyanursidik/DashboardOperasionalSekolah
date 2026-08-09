-- Make the guardian directory usable for authorized school administrators and
-- keep primary-contact changes atomic when a guardian is linked to a student.

drop policy if exists "School administrators read parent directory" on public.parents;
create policy "School administrators read parent directory"
on public.parents for select to authenticated
using (
  public.has_role('admin_sekolah')
  or public.has_role('admin_unit')
  or public.has_role('wakasek')
  or public.has_role('operator_tu')
  or public.has_role('operator_psb')
);

drop policy if exists "School administrators create parents" on public.parents;
create policy "School administrators create parents"
on public.parents for insert to authenticated
with check (
  public.has_role('admin_sekolah')
  or public.has_role('admin_unit')
  or public.has_role('wakasek')
  or public.has_role('operator_tu')
  or public.has_role('operator_psb')
);

drop policy if exists "School administrators update parents" on public.parents;
create policy "School administrators update parents"
on public.parents for update to authenticated
using (
  public.has_role('admin_sekolah')
  or public.has_role('admin_unit')
  or public.has_role('wakasek')
  or public.has_role('operator_tu')
  or public.has_role('operator_psb')
)
with check (
  public.has_role('admin_sekolah')
  or public.has_role('admin_unit')
  or public.has_role('wakasek')
  or public.has_role('operator_tu')
  or public.has_role('operator_psb')
);

drop policy if exists "School administrators manage student parent links" on public.student_parent_links;
create policy "School administrators manage student parent links"
on public.student_parent_links for all to authenticated
using (
  exists (
    select 1 from public.students student
    where student.id = student_parent_links.student_id
      and public.can_access_unit(student.unit_id)
  )
  and (
    public.has_role('admin_sekolah')
    or public.has_role('admin_unit')
    or public.has_role('wakasek')
    or public.has_role('operator_tu')
    or public.has_role('operator_psb')
  )
)
with check (
  exists (
    select 1 from public.students student
    where student.id = student_parent_links.student_id
      and public.can_access_unit(student.unit_id)
  )
  and (
    public.has_role('admin_sekolah')
    or public.has_role('admin_unit')
    or public.has_role('wakasek')
    or public.has_role('operator_tu')
    or public.has_role('operator_psb')
  )
);

create or replace function public.link_student_parent(
  p_student_id uuid,
  p_parent_id uuid,
  p_relationship text,
  p_is_primary boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  linked_id uuid;
begin
  if p_relationship not in ('father', 'mother', 'guardian') then
    raise exception 'Hubungan wali tidak valid' using errcode = '22023';
  end if;

  if p_is_primary then
    update public.student_parent_links
    set is_primary = false
    where student_id = p_student_id
      and is_primary = true;
  end if;

  insert into public.student_parent_links (
    student_id,
    parent_id,
    relationship,
    is_primary,
    can_access_parent_portal
  ) values (
    p_student_id,
    p_parent_id,
    p_relationship,
    coalesce(p_is_primary, false),
    true
  )
  returning id into linked_id;

  return linked_id;
end;
$$;

grant execute on function public.link_student_parent(uuid, uuid, text, boolean) to authenticated;

comment on function public.link_student_parent(uuid, uuid, text, boolean) is
  'Links a guardian to a student and atomically replaces the primary contact when requested.';
