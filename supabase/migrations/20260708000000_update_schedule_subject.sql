-- Add subject_id referencing subjects
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Try to migrate existing text data if any match exactly
UPDATE public.employee_schedules s
SET subject_id = (SELECT id FROM public.subjects sub WHERE sub.name = s.subject LIMIT 1)
WHERE s.subject IS NOT NULL AND s.subject_id IS NULL;
