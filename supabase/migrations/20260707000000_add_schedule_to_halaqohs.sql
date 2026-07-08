-- Add schedule fields to tahfidz_halaqohs
ALTER TABLE public.tahfidz_halaqohs
ADD COLUMN schedule_day TEXT,
ADD COLUMN schedule_time TEXT;
