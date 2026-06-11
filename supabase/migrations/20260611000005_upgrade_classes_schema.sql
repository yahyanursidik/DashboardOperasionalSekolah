-- Upgrade Classes Schema

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS capacity integer default 30,
  ADD COLUMN IF NOT EXISTS is_active boolean default true;
