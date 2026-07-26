-- Restore shared authorization helpers on projects where portal migrations
-- were applied manually or only partially.

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select employee.id
  from public.employees employee
  where employee.user_id = auth.uid()
    and employee.status = 'active'
  limit 1;
$$;

create or replace function public.teacher_portal_is_manager(target_unit_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.auth_user_roles() role_scope
    where role_scope.role_name in (
      'super_admin',
      'ketua_yayasan',
      'kepsek',
      'kepala_sekolah',
      'wakasek',
      'wakasek_umum',
      'wakasek_kurikulum',
      'wakasek_kesiswaan',
      'admin_sekolah',
      'admin_unit'
    )
      and (
        role_scope.role_name in (
          'super_admin',
          'ketua_yayasan',
          'kepsek',
          'kepala_sekolah'
        )
        or role_scope.unit_id is null
        or target_unit_id is null
        or role_scope.unit_id = target_unit_id
      )
  );
$$;

revoke all on function public.current_employee_id() from public;
revoke all on function public.teacher_portal_is_manager(uuid) from public;

grant execute on function public.current_employee_id() to authenticated;
grant execute on function public.current_employee_id() to service_role;
grant execute on function public.teacher_portal_is_manager(uuid) to authenticated;
grant execute on function public.teacher_portal_is_manager(uuid) to service_role;

notify pgrst, 'reload schema';
