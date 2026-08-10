-- Let a Quran teacher resolve student and class details for members of their own halaqoh.
-- This complements the stricter Quran RLS without granting access to unrelated students.

drop policy if exists "Quran teachers read students in own halaqoh" on public.students;
create policy "Quran teachers read students in own halaqoh"
  on public.students for select to authenticated
  using (exists (
    select 1
    from public.tahfidz_halaqoh_members member
    join public.tahfidz_halaqohs halaqoh on halaqoh.id = member.halaqoh_id
    where member.student_id = students.id
      and halaqoh.employee_id = public.current_employee_id()
  ));

drop policy if exists "Quran teachers read classes for own halaqoh" on public.classes;
create policy "Quran teachers read classes for own halaqoh"
  on public.classes for select to authenticated
  using (exists (
    select 1
    from public.students student
    join public.tahfidz_halaqoh_members member on member.student_id = student.id
    join public.tahfidz_halaqohs halaqoh on halaqoh.id = member.halaqoh_id
    where student.class_id = classes.id
      and halaqoh.employee_id = public.current_employee_id()
  ));

notify pgrst, 'reload schema';
