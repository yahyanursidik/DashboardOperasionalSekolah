-- Add schedule fields to tahfidz_halaqohs
ALTER TABLE public.tahfidz_halaqohs
ADD COLUMN IF NOT EXISTS schedule_day TEXT,
ADD COLUMN IF NOT EXISTS schedule_time TEXT;
