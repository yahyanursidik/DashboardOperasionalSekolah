-- Make teacher NIK sign-in resilient to whitespace and keep the pre-login
-- resolver aligned with the access check used after authentication.

create or replace function public.get_teacher_login_email_by_identifier(p_identifier text)
returns text
language sql
security definer
set search_path = public
as $$
  select employee.email
  from public.employees employee
  where lower(btrim(coalesce(employee.status, ''))) = 'active'
    and (
      lower(btrim(coalesce(employee.email, ''))) = lower(btrim(p_identifier))
      or regexp_replace(coalesce(employee.nik, ''), '\\s+', '', 'g')
        = regexp_replace(btrim(coalesce(p_identifier, '')), '\\s+', '', 'g')
    )
    and (
      lower(btrim(coalesce(employee.position, ''))) in (
        'guru', 'guru_quran', 'bk', 'kepala_sekolah', 'wakasek',
        'wakasek_umum', 'wakasek_kurikulum', 'wakasek_kesiswaan', 'kepala_unit'
      )
      or exists (
        select 1 from public.teacher_assignments assignment
        where assignment.employee_id = employee.id
          and coalesce(assignment.is_active, true)
          and assignment.role_type in (
            'homeroom', 'wali_kelas', 'subject', 'subject_teacher', 'guru_mapel',
            'guru_quran', 'guru_diniyah', 'coordinator'
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
              where semester.id = assignment.semester_id and semester.is_active
            )
          )
      )
      or exists (
        select 1 from public.employee_schedules schedule
        where schedule.employee_id = employee.id and schedule.schedule_type = 'mengajar'
      )
      or exists (select 1 from public.classes class where class.homeroom_teacher_id = employee.id)
      or exists (select 1 from public.tahfidz_halaqohs halaqoh where halaqoh.employee_id = employee.id)
    )
  limit 1;
$$;

grant execute on function public.get_teacher_login_email_by_identifier(text) to anon, authenticated;
