-- Teacher portal quality: assignment-scoped access, persistent reads, and secure login lookup.

alter table public.employees add column if not exists teacher_roles text[] not null default '{}';

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id from public.employees e
  where e.user_id = auth.uid() and e.status = 'active'
  limit 1;
$$;

create or replace function public.teacher_can_access_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.user_id = auth.uid() and e.status = 'active'
      and (
        exists (
          select 1 from public.classes c
          where c.id = target_class_id and c.homeroom_teacher_id = e.id
        )
        or exists (
          select 1 from public.employee_schedules es
          where es.employee_id = e.id and es.class_id = target_class_id
            and (
              es.academic_year_id is null
              or exists (select 1 from public.academic_years ay where ay.id = es.academic_year_id and ay.is_active)
            )
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
    from public.employees e
    join public.employee_schedules es on es.employee_id = e.id
    where e.user_id = auth.uid() and e.status = 'active'
      and es.class_id = target_class_id and es.subject_id = target_subject_id
      and (
        es.academic_year_id is null
        or exists (select 1 from public.academic_years ay where ay.id = es.academic_year_id and ay.is_active)
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
    select 1 from public.classes c
    join public.employees e on e.id = c.homeroom_teacher_id
    where c.id = target_class_id and e.user_id = auth.uid() and e.status = 'active'
  );
$$;

create or replace function public.teacher_has_portal_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employees e
    where e.user_id = auth.uid() and e.status = 'active'
      and (
        e.position in ('guru', 'guru_quran', 'bk', 'kepala_sekolah', 'wakasek', 'wakasek_umum', 'wakasek_kurikulum', 'wakasek_kesiswaan', 'kepala_unit')
        or coalesce(array_length(e.teacher_roles, 1), 0) > 0
        or exists (select 1 from public.employee_schedules es where es.employee_id = e.id)
        or exists (select 1 from public.classes c where c.homeroom_teacher_id = e.id)
        or exists (select 1 from public.tahfidz_halaqohs h where h.employee_id = e.id)
      )
  );
$$;

create or replace function public.teacher_portal_is_manager(target_unit_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.auth_user_roles() scope
    where scope.role_name in ('super_admin', 'ketua_yayasan', 'kepsek', 'wakasek', 'admin_sekolah', 'admin_unit')
      and (
        scope.role_name in ('super_admin', 'ketua_yayasan', 'kepsek')
        or scope.unit_id is null or target_unit_id is null or scope.unit_id = target_unit_id
      )
  );
$$;

create or replace function public.get_teacher_login_email_by_identifier(p_identifier text)
returns text
language sql
security definer
set search_path = public
as $$
  select e.email
  from public.employees e
  where e.status = 'active'
    and (lower(e.email) = lower(trim(p_identifier)) or e.nik = trim(p_identifier))
    and (
      e.position in ('guru', 'guru_quran', 'bk', 'kepala_sekolah', 'wakasek', 'wakasek_umum', 'wakasek_kurikulum', 'wakasek_kesiswaan', 'kepala_unit')
      or coalesce(array_length(e.teacher_roles, 1), 0) > 0
      or exists (select 1 from public.employee_schedules es where es.employee_id = e.id)
      or exists (select 1 from public.classes c where c.homeroom_teacher_id = e.id)
      or exists (select 1 from public.tahfidz_halaqohs h where h.employee_id = e.id)
    )
  limit 1;
$$;

create table if not exists public.employee_announcement_reads (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(employee_id, announcement_id)
);

create index if not exists employee_announcement_reads_employee_idx
  on public.employee_announcement_reads(employee_id, read_at desc);

alter table public.employee_announcement_reads enable row level security;
drop policy if exists "Employees manage own announcement reads" on public.employee_announcement_reads;
create policy "Employees manage own announcement reads"
  on public.employee_announcement_reads for all to authenticated
  using (employee_id = public.current_employee_id())
  with check (employee_id = public.current_employee_id());
drop policy if exists "Managers read employee announcement receipts" on public.employee_announcement_reads;
create policy "Managers read employee announcement receipts"
  on public.employee_announcement_reads for select to authenticated
  using (exists (
    select 1 from public.employees e
    where e.id = employee_id and public.teacher_portal_is_manager(e.unit_id)
  ));

-- Employee profile and assignment access needed by the portal itself.
drop policy if exists "Employees read own profile" on public.employees;
create policy "Employees read own profile" on public.employees for select to authenticated
  using (user_id = auth.uid());

-- Class attendance: portal users may only manage classes in their current assignment.
drop policy if exists "Teachers read assigned class attendance" on public.attendance_records;
create policy "Teachers read assigned class attendance" on public.attendance_records for select to authenticated
  using (public.teacher_can_access_class(class_id));
drop policy if exists "Teachers create assigned class attendance" on public.attendance_records;
create policy "Teachers create assigned class attendance" on public.attendance_records for insert to authenticated
  with check (public.teacher_can_access_class(class_id));
drop policy if exists "Teachers update assigned class attendance" on public.attendance_records;
create policy "Teachers update assigned class attendance" on public.attendance_records for update to authenticated
  using (public.teacher_can_access_class(class_id))
  with check (public.teacher_can_access_class(class_id));

-- Academic grades: read an assigned class, write only the subject explicitly assigned.
drop policy if exists "Allow authenticated read access on academic_grades" on public.academic_grades;
drop policy if exists "Allow authenticated insert access on academic_grades" on public.academic_grades;
drop policy if exists "Allow authenticated update access on academic_grades" on public.academic_grades;
drop policy if exists "Allow authenticated delete access on academic_grades" on public.academic_grades;
drop policy if exists "Teachers read assigned academic grades" on public.academic_grades;
create policy "Teachers read assigned academic grades" on public.academic_grades for select to authenticated
  using (public.teacher_can_access_class(class_id) or public.teacher_portal_is_manager((select c.unit_id from public.classes c where c.id = class_id)));
drop policy if exists "Teachers create assigned academic grades" on public.academic_grades;
create policy "Teachers create assigned academic grades" on public.academic_grades for insert to authenticated
  with check (public.teacher_can_teach_subject(class_id, subject_id) or public.teacher_portal_is_manager((select c.unit_id from public.classes c where c.id = class_id)));
drop policy if exists "Teachers update assigned academic grades" on public.academic_grades;
create policy "Teachers update assigned academic grades" on public.academic_grades for update to authenticated
  using (public.teacher_can_teach_subject(class_id, subject_id) or public.teacher_portal_is_manager((select c.unit_id from public.classes c where c.id = class_id)))
  with check (public.teacher_can_teach_subject(class_id, subject_id) or public.teacher_portal_is_manager((select c.unit_id from public.classes c where c.id = class_id)));

-- Student journals: remove global write access and scope records to assignment/BK unit.
drop policy if exists "Users can read all journals" on public.student_journals;
drop policy if exists "Users can insert journals" on public.student_journals;
drop policy if exists "Users can update journals" on public.student_journals;
drop policy if exists "Users can delete journals" on public.student_journals;
drop policy if exists "Teachers read scoped student journals" on public.student_journals;
create policy "Teachers read scoped student journals" on public.student_journals for select to authenticated
  using (
    public.teacher_portal_is_manager(unit_id)
    or exists (
      select 1 from public.students s
      join public.employees e on e.user_id = auth.uid() and e.status = 'active'
      where s.id = student_id
        and (public.teacher_can_access_class(s.class_id) or (e.position = 'bk' and (e.unit_id = s.unit_id or e.unit_id is null)))
    )
  );
drop policy if exists "Teachers create scoped student journals" on public.student_journals;
create policy "Teachers create scoped student journals" on public.student_journals for insert to authenticated
  with check (
    employee_id = public.current_employee_id()
    and exists (
      select 1 from public.students s
      join public.employees e on e.id = public.current_employee_id()
      where s.id = student_id
        and (public.teacher_can_access_class(s.class_id) or (e.position = 'bk' and (e.unit_id = s.unit_id or e.unit_id is null)))
    )
  );
drop policy if exists "Teachers update own student journals" on public.student_journals;
create policy "Teachers update own student journals" on public.student_journals for update to authenticated
  using (employee_id = public.current_employee_id() or public.teacher_portal_is_manager(unit_id))
  with check (employee_id = public.current_employee_id() or public.teacher_portal_is_manager(unit_id));
drop policy if exists "Managers delete student journals" on public.student_journals;
create policy "Managers delete student journals" on public.student_journals for delete to authenticated
  using (public.teacher_portal_is_manager(unit_id));

-- Digital reports and scores: use actual employee schedules/homeroom assignments.
drop policy if exists "Teachers can read reports" on public.student_reports;
drop policy if exists "Staff can update report status" on public.student_reports;
drop policy if exists "Portal teachers read report periods" on public.report_periods;
create policy "Portal teachers read report periods" on public.report_periods for select to authenticated
  using (public.teacher_has_portal_access() and exists (
    select 1 from public.classes c
    where c.unit_id = report_periods.unit_id and public.teacher_can_access_class(c.id)
  ));
drop policy if exists "Portal teachers read report templates" on public.report_templates;
create policy "Portal teachers read report templates" on public.report_templates for select to authenticated
  using (public.teacher_has_portal_access());
drop policy if exists "Portal teachers read report template sections" on public.report_template_sections;
create policy "Portal teachers read report template sections" on public.report_template_sections for select to authenticated
  using (public.teacher_has_portal_access());
drop policy if exists "Portal teachers read report template items" on public.report_template_items;
create policy "Portal teachers read report template items" on public.report_template_items for select to authenticated
  using (public.teacher_has_portal_access());

drop policy if exists "Portal teachers read assigned reports" on public.student_reports;
create policy "Portal teachers read assigned reports" on public.student_reports for select to authenticated
  using (public.teacher_can_access_class(class_id));
drop policy if exists "Portal teachers update assigned reports" on public.student_reports;
create policy "Portal teachers update assigned reports" on public.student_reports for update to authenticated
  using (public.teacher_can_access_class(class_id))
  with check (public.teacher_can_access_class(class_id));

drop policy if exists "Portal teachers read assigned report scores" on public.student_report_scores;
drop policy if exists "Staff can manage scores" on public.student_report_scores;
create policy "Portal teachers read assigned report scores" on public.student_report_scores for select to authenticated
  using (exists (select 1 from public.student_reports sr where sr.id = report_id and public.teacher_can_access_class(sr.class_id)));
drop policy if exists "Portal teachers create assigned report scores" on public.student_report_scores;
create policy "Portal teachers create assigned report scores" on public.student_report_scores for insert to authenticated
  with check (exists (select 1 from public.student_reports sr where sr.id = report_id and public.teacher_can_access_class(sr.class_id)));
drop policy if exists "Portal teachers update assigned report scores" on public.student_report_scores;
create policy "Portal teachers update assigned report scores" on public.student_report_scores for update to authenticated
  using (exists (select 1 from public.student_reports sr where sr.id = report_id and public.teacher_can_access_class(sr.class_id)))
  with check (exists (select 1 from public.student_reports sr where sr.id = report_id and public.teacher_can_access_class(sr.class_id)));
drop policy if exists "Report managers manage scores" on public.student_report_scores;
create policy "Report managers manage scores" on public.student_report_scores for all to authenticated
  using (exists (
    select 1 from public.student_reports sr join public.classes c on c.id = sr.class_id
    where sr.id = report_id and public.teacher_portal_is_manager(c.unit_id)
  ))
  with check (exists (
    select 1 from public.student_reports sr join public.classes c on c.id = sr.class_id
    where sr.id = report_id and public.teacher_portal_is_manager(c.unit_id)
  ));

-- PKG is private to the assessed employee; managers keep operational access.
drop policy if exists "pkg_authenticated_all" on public.pkg_assessments;
drop policy if exists "Employees read own PKG" on public.pkg_assessments;
create policy "Employees read own PKG" on public.pkg_assessments for select to authenticated
  using (employee_id = public.current_employee_id());
drop policy if exists "Managers manage PKG" on public.pkg_assessments;
create policy "Managers manage PKG" on public.pkg_assessments for all to authenticated
  using (public.teacher_portal_is_manager(unit_id))
  with check (public.teacher_portal_is_manager(unit_id));

grant select, insert, update on public.employee_announcement_reads to authenticated;
revoke all on function public.get_teacher_login_email_by_identifier(text) from public;
grant execute on function public.get_teacher_login_email_by_identifier(text) to anon, authenticated;
grant execute on function public.teacher_has_portal_access() to authenticated;
grant execute on function public.teacher_can_access_class(uuid) to authenticated;
grant execute on function public.teacher_can_teach_subject(uuid, uuid) to authenticated;
grant execute on function public.teacher_is_homeroom(uuid) to authenticated;
revoke all on function public.current_employee_id() from public;
revoke all on function public.teacher_can_access_class(uuid) from public;
revoke all on function public.teacher_can_teach_subject(uuid, uuid) from public;
revoke all on function public.teacher_is_homeroom(uuid) from public;
revoke all on function public.teacher_has_portal_access() from public;
revoke all on function public.teacher_portal_is_manager(uuid) from public;
grant execute on function public.current_employee_id() to authenticated;
grant execute on function public.teacher_can_access_class(uuid) to authenticated;
grant execute on function public.teacher_can_teach_subject(uuid, uuid) to authenticated;
grant execute on function public.teacher_is_homeroom(uuid) to authenticated;
grant execute on function public.teacher_has_portal_access() to authenticated;
grant execute on function public.teacher_portal_is_manager(uuid) to authenticated;
