-- Stop recursive RLS between students, parents, and student_parent_links.
-- The previous policies queried each other directly:
-- students -> student_parent_links -> students, and parents -> links -> students.
-- These SECURITY DEFINER helpers centralize the checks so policies do not
-- recursively evaluate one another.

create or replace function public.current_parent_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(parent.id), '{}'::uuid[])
  from public.parents parent
  where parent.user_id = auth.uid();
$$;

create or replace function public.student_effective_unit_id(target_student_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(student.unit_id, class.unit_id)
  from public.students student
  left join public.classes class on class.id = student.class_id
  where student.id = target_student_id;
$$;

create or replace function public.parent_can_access_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.student_parent_links link
    join public.parents parent on parent.id = link.parent_id
    where parent.user_id = auth.uid()
      and link.student_id = target_student_id
      and coalesce(link.can_access_parent_portal, true)
  );
$$;

create or replace function public.school_can_access_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_access_unit(public.student_effective_unit_id(target_student_id));
$$;

create or replace function public.school_can_manage_student_parent_link(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.school_can_access_student(target_student_id)
    and (
      public.has_role('admin_sekolah')
      or public.has_role('admin_unit')
      or public.has_role('wakasek')
      or public.has_role('operator_tu')
      or public.has_role('operator_psb')
    );
$$;

create or replace function public.school_can_read_parent_record(target_parent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    exists (
      select 1
      from public.parents parent
      where parent.id = target_parent_id
        and parent.user_id = auth.uid()
    )
    or public.has_role('admin_sekolah')
    or public.has_role('admin_unit')
    or public.has_role('wakasek')
    or public.has_role('operator_tu')
    or public.has_role('operator_psb')
    or exists (
      select 1
      from public.student_parent_links link
      where link.parent_id = target_parent_id
        and public.school_can_access_student(link.student_id)
    )
  );
$$;

drop policy if exists "Users can read students in their unit" on public.students;
create policy "Users can read students in their unit"
  on public.students for select to authenticated
  using (
    public.can_access_unit(unit_id)
    or public.parent_can_access_student(id)
  );

drop policy if exists "Users can read parents if they can access the student" on public.parents;
create policy "Users can read parents if they can access the student"
  on public.parents for select to authenticated
  using (public.school_can_read_parent_record(id));

drop policy if exists "Parents read their own links" on public.student_parent_links;
create policy "Parents read their own links"
  on public.student_parent_links for select to authenticated
  using (parent_id = any(public.current_parent_ids()));

drop policy if exists "Read SPL by unit" on public.student_parent_links;
create policy "Read SPL by unit"
  on public.student_parent_links for select to authenticated
  using (public.school_can_access_student(student_id));

drop policy if exists "School administrators manage student parent links" on public.student_parent_links;
create policy "School administrators manage student parent links"
  on public.student_parent_links for all to authenticated
  using (public.school_can_manage_student_parent_link(student_id))
  with check (public.school_can_manage_student_parent_link(student_id));

revoke all on function public.current_parent_ids() from public;
revoke all on function public.student_effective_unit_id(uuid) from public;
revoke all on function public.parent_can_access_student(uuid) from public;
revoke all on function public.school_can_access_student(uuid) from public;
revoke all on function public.school_can_manage_student_parent_link(uuid) from public;
revoke all on function public.school_can_read_parent_record(uuid) from public;

grant execute on function public.current_parent_ids() to authenticated;
grant execute on function public.student_effective_unit_id(uuid) to authenticated;
grant execute on function public.parent_can_access_student(uuid) to authenticated;
grant execute on function public.school_can_access_student(uuid) to authenticated;
grant execute on function public.school_can_manage_student_parent_link(uuid) to authenticated;
grant execute on function public.school_can_read_parent_record(uuid) to authenticated;

notify pgrst, 'reload schema';
