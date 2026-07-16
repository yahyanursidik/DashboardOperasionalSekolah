-- Repair deployments where teacher assignments exist but the schedule link was
-- skipped or PostgREST still exposes an older schema snapshot.

alter table if exists public.employee_schedules
  add column if not exists assignment_id uuid
  references public.teacher_assignments(id) on delete set null;

create index if not exists employee_schedules_assignment_idx
  on public.employee_schedules(assignment_id);

notify pgrst, 'reload schema';
