-- Structural leaders may also teach, but their daily attendance follows their
-- leadership duty at the unit. Teaching timetables remain academic assignments.

update public.employees
set attendance_mode = 'unit_hours', updated_at = now()
where position in (
  'kepala_sekolah',
  'wakasek_umum',
  'wakasek_kurikulum',
  'wakasek_kesiswaan',
  'kepala_unit'
)
and attendance_mode is distinct from 'unit_hours';

alter table public.employees
  drop constraint if exists employees_teaching_attendance_role_check;

alter table public.employees
  add constraint employees_teaching_attendance_role_check
  check (
    attendance_mode <> 'teaching_schedule'
    or position in ('guru', 'guru_quran', 'bk')
  );

alter table public.employees
  drop constraint if exists employees_leadership_attendance_mode_check;

alter table public.employees
  add constraint employees_leadership_attendance_mode_check
  check (
    position not in (
      'kepala_sekolah',
      'wakasek_umum',
      'wakasek_kurikulum',
      'wakasek_kesiswaan',
      'kepala_unit'
    )
    or attendance_mode = 'unit_hours'
  );

comment on constraint employees_leadership_attendance_mode_check on public.employees is
  'Structural leaders follow unit hours even when they also hold teaching assignments; explicit attendance shifts still take precedence.';

notify pgrst, 'reload schema';
