-- Migration to upgrade parents schema

ALTER TABLE public.parents 
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS is_active boolean default true;

ALTER TABLE public.student_parent_links
  ADD COLUMN IF NOT EXISTS can_receive_broadcast boolean default true,
  ADD COLUMN IF NOT EXISTS can_access_parent_portal boolean default false;
