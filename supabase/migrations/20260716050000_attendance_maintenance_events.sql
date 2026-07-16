-- Classify operational work outside a weekly schedule without turning it into
-- a permanent shift. These events keep their own attendance and audit trail.

alter table if exists public.attendance_events
  drop constraint if exists attendance_events_event_type_check;

alter table if exists public.attendance_events
  add constraint attendance_events_event_type_check
  check (event_type in (
    'meeting',
    'training',
    'school_activity',
    'religious_activity',
    'committee',
    'maintenance',
    'emergency_duty',
    'other'
  ));

comment on column public.attendance_events.event_type is
  'Classifies meetings, school activities, maintenance work, and emergency duties recorded outside routine schedules.';

notify pgrst, 'reload schema';
