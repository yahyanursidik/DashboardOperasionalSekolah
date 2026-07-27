-- Make assignment-scoped teacher access independent from schedule creation and
-- the employee's home unit. This supports homeroom and multi-unit teaching.

create or replace function public.teacher_can_access_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees employee
    where employee.user_id = auth.uid()
      and employee.status = 'active'
      and (
        exists (
          select 1
          from public.teacher_assignments assignment
          where assignment.employee_id = employee.id
            and assignment.class_id = target_class_id
            and coalesce(assignment.is_active, true)
            and exists (
              select 1 from public.academic_years academic_year
              where academic_year.id = assignment.academic_year_id
                and academic_year.is_active
            )
            and (
              assignment.semester_id is null
              or exists (
                select 1 from public.semesters semester
                where semester.id = assignment.semester_id
                  and semester.is_active
              )
            )
        )
        or exists (
          select 1
          from public.employee_schedules schedule
          where schedule.employee_id = employee.id
            and schedule.class_id = target_class_id
            and (
              schedule.academic_year_id is null
              or exists (
                select 1 from public.academic_years academic_year
                where academic_year.id = schedule.academic_year_id
                  and academic_year.is_active
              )
            )
            and (
              schedule.semester_id is null
              or exists (
                select 1 from public.semesters semester
                where semester.id = schedule.semester_id
                  and semester.is_active
              )
            )
        )
        or exists (
          select 1 from public.classes class
          where class.id = target_class_id
            and class.homeroom_teacher_id = employee.id
        )
      )
  );
$$;

create or replace function public.teacher_can_teach_subject(target_class_id uuid, target_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees employee
    where employee.user_id = auth.uid()
      and employee.status = 'active'
      and (
        exists (
          select 1
          from public.teacher_assignments assignment
          left join public.subjects subject on subject.id = target_subject_id
          where assignment.employee_id = employee.id
            and assignment.class_id = target_class_id
            and coalesce(assignment.is_active, true)
            and assignment.role_type not in ('homeroom', 'wali_kelas', 'staff')
            and (
              assignment.subject_id = target_subject_id
              or (
                assignment.subject_id is null
                and lower(trim(regexp_replace(coalesce(assignment.subject, ''), '\s*\(kelompok\s+\d+\)\s*$', '', 'i')))
                  = lower(trim(coalesce(subject.name, '')))
              )
            )
            and exists (
              select 1 from public.academic_years academic_year
              where academic_year.id = assignment.academic_year_id
                and academic_year.is_active
            )
            and (
              assignment.semester_id is null
              or exists (
                select 1 from public.semesters semester
                where semester.id = assignment.semester_id
                  and semester.is_active
              )
            )
        )
        or exists (
          select 1
          from public.employee_schedules schedule
          where schedule.employee_id = employee.id
            and schedule.class_id = target_class_id
            and schedule.subject_id = target_subject_id
            and schedule.schedule_type = 'mengajar'
            and (
              schedule.academic_year_id is null
              or exists (
                select 1 from public.academic_years academic_year
                where academic_year.id = schedule.academic_year_id
                  and academic_year.is_active
              )
            )
            and (
              schedule.semester_id is null
              or exists (
                select 1 from public.semesters semester
                where semester.id = schedule.semester_id
                  and semester.is_active
              )
            )
        )
      )
  );
$$;

create or replace function public.teacher_is_homeroom(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees employee
    where employee.user_id = auth.uid()
      and employee.status = 'active'
      and (
        exists (
          select 1 from public.teacher_assignments assignment
          where assignment.employee_id = employee.id
            and assignment.class_id = target_class_id
            and assignment.role_type in ('homeroom', 'wali_kelas')
            and coalesce(assignment.is_active, true)
            and exists (
              select 1 from public.academic_years academic_year
              where academic_year.id = assignment.academic_year_id
                and academic_year.is_active
            )
        )
        or exists (
          select 1 from public.classes class
          where class.id = target_class_id
            and class.homeroom_teacher_id = employee.id
        )
      )
  );
$$;

drop policy if exists "Employees read own academic assignments" on public.teacher_assignments;
create policy "Employees read own academic assignments"
  on public.teacher_assignments for select to authenticated
  using (employee_id = public.current_employee_id());

drop policy if exists "Teachers read assigned classes" on public.classes;
create policy "Teachers read assigned classes"
  on public.classes for select to authenticated
  using (public.teacher_can_access_class(id));

drop policy if exists "Teachers read students in assigned classes" on public.students;
create policy "Teachers read students in assigned classes"
  on public.students for select to authenticated
  using (class_id is not null and public.teacher_can_access_class(class_id));

revoke all on function public.teacher_can_access_class(uuid) from public;
revoke all on function public.teacher_can_teach_subject(uuid, uuid) from public;
revoke all on function public.teacher_is_homeroom(uuid) from public;

grant execute on function public.teacher_can_access_class(uuid) to authenticated;
grant execute on function public.teacher_can_teach_subject(uuid, uuid) to authenticated;
grant execute on function public.teacher_is_homeroom(uuid) to authenticated;

notify pgrst, 'reload schema';
