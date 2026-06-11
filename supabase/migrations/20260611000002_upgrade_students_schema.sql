-- Migration to upgrade students schema

ALTER TABLE public.students 
  ADD COLUMN class_id uuid references public.classes(id) on delete set null,
  ADD COLUMN nickname text,
  ADD COLUMN birth_place text,
  ADD COLUMN address text,
  ADD COLUMN notes_admin text;

-- Add index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);

-- Update the check constraint for status to include 'inactive'
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE public.students ADD CONSTRAINT students_status_check CHECK (status IN ('active', 'inactive', 'graduated', 'transferred', 'dropped_out'));
