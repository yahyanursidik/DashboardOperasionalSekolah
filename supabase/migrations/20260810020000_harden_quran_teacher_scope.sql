-- Restrict Tahsin/Tahfidz data to the teacher's explicit halaqoh or class assignment.

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

create or replace function public.quran_is_manager(target_unit_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles user_role
    join public.roles role_record on role_record.id = user_role.role_id
    where user_role.user_id = auth.uid()
      and (
        role_record.name in ('super_admin', 'ketua_yayasan', 'kepsek', 'admin_sekolah')
        or (
          role_record.name in ('wakasek', 'kepala_unit', 'admin_unit')
          and target_unit_id is not null
          and (user_role.unit_id is null or user_role.unit_id = target_unit_id)
        )
      )
  );
$$;

create or replace function public.quran_teacher_has_scope(
  target_student_id uuid,
  target_class_id uuid,
  target_subject_id uuid,
  target_halaqoh_id uuid,
  target_academic_year_id uuid,
  target_semester_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees employee
    where employee.id = public.current_employee_id()
      and employee.status = 'active'
      and (
        (
          target_halaqoh_id is not null
          and exists (
            select 1
            from public.tahfidz_halaqohs halaqoh
            join public.tahfidz_halaqoh_members member
              on member.halaqoh_id = halaqoh.id
             and member.student_id = target_student_id
            where halaqoh.id = target_halaqoh_id
              and halaqoh.employee_id = employee.id
              and (target_subject_id is null or halaqoh.subject_id = target_subject_id)
              and (target_academic_year_id is null or halaqoh.academic_year_id = target_academic_year_id)
              and (target_semester_id is null or halaqoh.semester_id = target_semester_id)
          )
        )
        or (
          target_class_id is not null
          and target_subject_id is not null
          and exists (
            select 1
            from public.students student
            where student.id = target_student_id
              and student.class_id = target_class_id
          )
          and (
            exists (
              select 1
              from public.employee_schedules schedule
              where schedule.employee_id = employee.id
                and schedule.class_id = target_class_id
                and schedule.subject_id = target_subject_id
                and schedule.schedule_type = 'mengajar'
                and (target_academic_year_id is null or schedule.academic_year_id is null or schedule.academic_year_id = target_academic_year_id)
                and (target_semester_id is null or schedule.semester_id is null or schedule.semester_id = target_semester_id)
            )
            or exists (
              select 1
              from public.teacher_assignments assignment
              where assignment.employee_id = employee.id
                and assignment.class_id = target_class_id
                and assignment.subject_id = target_subject_id
                and assignment.role_type in ('subject', 'subject_teacher', 'guru_mapel', 'guru_quran', 'guru_diniyah', 'substitute')
                and coalesce(assignment.is_active, true)
                and (target_academic_year_id is null or assignment.academic_year_id = target_academic_year_id)
                and (target_semester_id is null or assignment.semester_id is null or assignment.semester_id = target_semester_id)
            )
          )
        )
      )
  );
$$;

create or replace function public.quran_halaqoh_unit(target_halaqoh_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(subject.unit_id, employee.unit_id)
  from public.tahfidz_halaqohs halaqoh
  left join public.subjects subject on subject.id = halaqoh.subject_id
  left join public.employees employee on employee.id = halaqoh.employee_id
  where halaqoh.id = target_halaqoh_id;
$$;

create or replace function public.quran_student_unit(target_student_id uuid)
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

create or replace function public.quran_subject_or_employee_unit(target_subject_id uuid, target_employee_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select subject.unit_id from public.subjects subject where subject.id = target_subject_id),
    (select employee.unit_id from public.employees employee where employee.id = target_employee_id)
  );
$$;

create or replace function public.quran_teacher_can_teach_class_subject(
  target_class_id uuid,
  target_subject_id uuid,
  target_academic_year_id uuid,
  target_semester_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees employee
    where employee.id = public.current_employee_id()
      and employee.status = 'active'
      and (
        exists (
          select 1 from public.employee_schedules schedule
          where schedule.employee_id = employee.id
            and schedule.class_id = target_class_id
            and schedule.subject_id = target_subject_id
            and schedule.schedule_type = 'mengajar'
            and (target_academic_year_id is null or schedule.academic_year_id is null or schedule.academic_year_id = target_academic_year_id)
            and (target_semester_id is null or schedule.semester_id is null or schedule.semester_id = target_semester_id)
        )
        or exists (
          select 1 from public.teacher_assignments assignment
          where assignment.employee_id = employee.id
            and assignment.class_id = target_class_id
            and assignment.subject_id = target_subject_id
            and assignment.role_type in ('subject', 'subject_teacher', 'guru_mapel', 'guru_quran', 'guru_diniyah', 'substitute')
            and coalesce(assignment.is_active, true)
            and (target_academic_year_id is null or assignment.academic_year_id = target_academic_year_id)
            and (target_semester_id is null or assignment.semester_id is null or assignment.semester_id = target_semester_id)
        )
      )
  );
$$;

revoke all on function public.current_employee_id() from public;
revoke all on function public.quran_is_manager(uuid) from public;
revoke all on function public.quran_teacher_has_scope(uuid, uuid, uuid, uuid, uuid, uuid) from public;
revoke all on function public.quran_halaqoh_unit(uuid) from public;
revoke all on function public.quran_student_unit(uuid) from public;
revoke all on function public.quran_subject_or_employee_unit(uuid, uuid) from public;
revoke all on function public.quran_teacher_can_teach_class_subject(uuid, uuid, uuid, uuid) from public;
grant execute on function public.current_employee_id() to authenticated;
grant execute on function public.quran_is_manager(uuid) to authenticated;
grant execute on function public.quran_teacher_has_scope(uuid, uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.quran_halaqoh_unit(uuid) to authenticated;
grant execute on function public.quran_student_unit(uuid) to authenticated;
grant execute on function public.quran_subject_or_employee_unit(uuid, uuid) to authenticated;
grant execute on function public.quran_teacher_can_teach_class_subject(uuid, uuid, uuid, uuid) to authenticated;

-- Halaqoh and membership are administered centrally; teachers only read their own groups.
drop policy if exists "Admin full access for tahfidz_halaqohs" on public.tahfidz_halaqohs;
drop policy if exists "Teachers access for tahfidz_halaqohs" on public.tahfidz_halaqohs;
drop policy if exists "Quran managers manage halaqohs" on public.tahfidz_halaqohs;
drop policy if exists "Quran teachers read own halaqohs" on public.tahfidz_halaqohs;
create policy "Quran managers manage halaqohs"
  on public.tahfidz_halaqohs for all to authenticated
  using (public.quran_is_manager(public.quran_halaqoh_unit(id)))
  with check (public.quran_is_manager(public.quran_subject_or_employee_unit(subject_id, employee_id)));
create policy "Quran teachers read own halaqohs"
  on public.tahfidz_halaqohs for select to authenticated
  using (employee_id = public.current_employee_id());

drop policy if exists "Admin full access for tahfidz_halaqoh_members" on public.tahfidz_halaqoh_members;
drop policy if exists "Teachers access for tahfidz_halaqoh_members" on public.tahfidz_halaqoh_members;
drop policy if exists "Quran managers manage halaqoh members" on public.tahfidz_halaqoh_members;
drop policy if exists "Quran teachers read own halaqoh members" on public.tahfidz_halaqoh_members;
create policy "Quran managers manage halaqoh members"
  on public.tahfidz_halaqoh_members for all to authenticated
  using (public.quran_is_manager(public.quran_halaqoh_unit(halaqoh_id)))
  with check (public.quran_is_manager(public.quran_halaqoh_unit(halaqoh_id)));
create policy "Quran teachers read own halaqoh members"
  on public.tahfidz_halaqoh_members for select to authenticated
  using (exists (
    select 1 from public.tahfidz_halaqohs halaqoh
    where halaqoh.id = halaqoh_id
      and halaqoh.employee_id = public.current_employee_id()
  ));

-- Journals and assessments can be created only inside the teacher's explicit scope.
drop policy if exists "Admin full access for quran_records" on public.quran_records;
drop policy if exists "Teachers access for quran_records" on public.quran_records;
drop policy if exists "Quran managers manage records" on public.quran_records;
drop policy if exists "Quran teachers read assigned records" on public.quran_records;
drop policy if exists "Quran teachers create assigned records" on public.quran_records;
drop policy if exists "Quran teachers update own records" on public.quran_records;
drop policy if exists "Quran teachers delete own records" on public.quran_records;
create policy "Quran managers manage records"
  on public.quran_records for all to authenticated
  using (public.quran_is_manager(public.quran_student_unit(student_id)))
  with check (public.quran_is_manager(public.quran_student_unit(student_id)));
create policy "Quran teachers read assigned records"
  on public.quran_records for select to authenticated
  using (public.quran_teacher_has_scope(student_id, class_id, subject_id, halaqoh_id, academic_year_id, semester_id));
create policy "Quran teachers create assigned records"
  on public.quran_records for insert to authenticated
  with check (
    employee_id = public.current_employee_id()
    and public.quran_teacher_has_scope(student_id, class_id, subject_id, halaqoh_id, academic_year_id, semester_id)
  );
create policy "Quran teachers update own records"
  on public.quran_records for update to authenticated
  using (employee_id = public.current_employee_id())
  with check (
    employee_id = public.current_employee_id()
    and public.quran_teacher_has_scope(student_id, class_id, subject_id, halaqoh_id, academic_year_id, semester_id)
  );
create policy "Quran teachers delete own records"
  on public.quran_records for delete to authenticated
  using (employee_id = public.current_employee_id());

drop policy if exists "Admin full access for quran_assessments" on public.quran_assessments;
drop policy if exists "Teachers access for quran_assessments" on public.quran_assessments;
drop policy if exists "Quran managers manage assessments" on public.quran_assessments;
drop policy if exists "Quran teachers read assigned assessments" on public.quran_assessments;
drop policy if exists "Quran teachers create assigned assessments" on public.quran_assessments;
drop policy if exists "Quran teachers update own assessments" on public.quran_assessments;
drop policy if exists "Quran teachers delete own assessments" on public.quran_assessments;
create policy "Quran managers manage assessments"
  on public.quran_assessments for all to authenticated
  using (public.quran_is_manager(public.quran_student_unit(student_id)))
  with check (public.quran_is_manager(public.quran_student_unit(student_id)));
create policy "Quran teachers read assigned assessments"
  on public.quran_assessments for select to authenticated
  using (public.quran_teacher_has_scope(student_id, class_id, subject_id, halaqoh_id, academic_year_id, semester_id));
create policy "Quran teachers create assigned assessments"
  on public.quran_assessments for insert to authenticated
  with check (
    employee_id = public.current_employee_id()
    and public.quran_teacher_has_scope(student_id, class_id, subject_id, halaqoh_id, academic_year_id, semester_id)
  );
create policy "Quran teachers update own assessments"
  on public.quran_assessments for update to authenticated
  using (employee_id = public.current_employee_id())
  with check (
    employee_id = public.current_employee_id()
    and public.quran_teacher_has_scope(student_id, class_id, subject_id, halaqoh_id, academic_year_id, semester_id)
  );
create policy "Quran teachers delete own assessments"
  on public.quran_assessments for delete to authenticated
  using (employee_id = public.current_employee_id());

-- Replace broad target policies with scoped policies for assigned teachers.
drop policy if exists "Admin full access for tahfidz_student_targets" on public.tahfidz_student_targets;
drop policy if exists "Teachers access for tahfidz_student_targets" on public.tahfidz_student_targets;
drop policy if exists "Quran teachers manage assigned tahfidz targets" on public.tahfidz_student_targets;
drop policy if exists "Quran managers manage tahfidz targets" on public.tahfidz_student_targets;
create policy "Quran managers manage tahfidz targets"
  on public.tahfidz_student_targets for all to authenticated
  using (public.quran_is_manager(public.quran_student_unit(student_id)))
  with check (public.quran_is_manager(public.quran_student_unit(student_id)));
create policy "Quran teachers manage assigned tahfidz targets"
  on public.tahfidz_student_targets for all to authenticated
  using (public.quran_teacher_has_scope(
    student_id,
    (select student.class_id from public.students student where student.id = tahfidz_student_targets.student_id),
    subject_id,
    halaqoh_id,
    academic_year_id,
    semester_id
  ))
  with check (public.quran_teacher_has_scope(
    student_id,
    (select student.class_id from public.students student where student.id = tahfidz_student_targets.student_id),
    subject_id,
    halaqoh_id,
    academic_year_id,
    semester_id
  ));

drop policy if exists "Quran managers manage tahsin student targets" on public.tahsin_student_targets;
drop policy if exists "Quran teachers manage assigned tahsin targets" on public.tahsin_student_targets;
drop policy if exists "Quran managers manage tahsin targets" on public.tahsin_student_targets;
create policy "Quran managers manage tahsin targets"
  on public.tahsin_student_targets for all to authenticated
  using (public.quran_is_manager(public.quran_student_unit(student_id)))
  with check (public.quran_is_manager(public.quran_student_unit(student_id)));
create policy "Quran teachers manage assigned tahsin targets"
  on public.tahsin_student_targets for all to authenticated
  using (public.quran_teacher_has_scope(
    student_id,
    (select student.class_id from public.students student where student.id = tahsin_student_targets.student_id),
    subject_id,
    halaqoh_id,
    academic_year_id,
    semester_id
  ))
  with check (public.quran_teacher_has_scope(
    student_id,
    (select student.class_id from public.students student where student.id = tahsin_student_targets.student_id),
    subject_id,
    halaqoh_id,
    academic_year_id,
    semester_id
  ));

drop policy if exists "Admin full access for quran_targets" on public.quran_targets;
drop policy if exists "Teachers access for quran_targets" on public.quran_targets;
drop policy if exists "Parents can view quran_targets" on public.quran_targets;
drop policy if exists "Quran managers manage class targets" on public.quran_targets;
drop policy if exists "Quran teachers read assigned class targets" on public.quran_targets;
drop policy if exists "Parents read linked class Quran targets" on public.quran_targets;
create policy "Quran managers manage class targets"
  on public.quran_targets for all to authenticated
  using (public.quran_is_manager((select class.unit_id from public.classes class where class.id = quran_targets.class_id)))
  with check (public.quran_is_manager((select class.unit_id from public.classes class where class.id = quran_targets.class_id)));
create policy "Quran teachers read assigned class targets"
  on public.quran_targets for select to authenticated
  using (public.quran_teacher_can_teach_class_subject(class_id, subject_id, academic_year_id, semester_id));
create policy "Parents read linked class Quran targets"
  on public.quran_targets for select to authenticated
  using (exists (
    select 1
    from public.student_parent_links link
    join public.parents parent_record on parent_record.id = link.parent_id
    join public.students student on student.id = link.student_id
    where parent_record.user_id = auth.uid()
      and student.class_id = quran_targets.class_id
  ));

create or replace function public.validate_quran_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  program_type text;
begin
  if coalesce(new.is_active, true) and new.role_type = 'guru_quran' then
    if new.class_id is null or new.subject_id is null then
      raise exception 'QURAN_ASSIGNMENT_CLASS_SUBJECT_REQUIRED';
    end if;
    select subject.quran_program_type into program_type
    from public.subjects subject
    where subject.id = new.subject_id and subject.is_active is not false;
    if program_type is null then
      raise exception 'QURAN_ASSIGNMENT_SUBJECT_INVALID';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_quran_assignment_trigger on public.teacher_assignments;
create trigger validate_quran_assignment_trigger
  before insert or update on public.teacher_assignments
  for each row execute function public.validate_quran_assignment();

create or replace function public.validate_quran_halaqoh_teacher()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  teacher_record public.employees%rowtype;
begin
  if new.employee_id is null then
    return new;
  end if;
  select * into teacher_record from public.employees where id = new.employee_id;
  if teacher_record.id is null or teacher_record.status is distinct from 'active' then
    raise exception 'QURAN_TEACHER_MUST_BE_ACTIVE';
  end if;
  if coalesce(teacher_record.position, '') not in (
    'guru', 'guru_quran', 'wali_kelas', 'kepala_sekolah', 'wakil_kepala_sekolah',
    'wakasek', 'wakasek_umum', 'wakasek_kurikulum', 'wakasek_kesiswaan', 'kepala_unit'
  ) and coalesce(array_length(teacher_record.teacher_roles, 1), 0) = 0 then
    raise exception 'QURAN_TEACHER_ROLE_REQUIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_quran_halaqoh_teacher_trigger on public.tahfidz_halaqohs;
create trigger validate_quran_halaqoh_teacher_trigger
  before insert or update of employee_id on public.tahfidz_halaqohs
  for each row execute function public.validate_quran_halaqoh_teacher();

notify pgrst, 'reload schema';
