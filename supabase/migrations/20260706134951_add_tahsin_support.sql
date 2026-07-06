-- Add program_type to tahfidz_halaqohs
ALTER TABLE public.tahfidz_halaqohs 
ADD COLUMN IF NOT EXISTS program_type TEXT NOT NULL DEFAULT 'tahfidz' CHECK (program_type IN ('tahfidz', 'tahsin'));

-- We also want to drop the unique constraint that only checked name, academic_year, semester 
-- and include program_type in it, so we can have "Halaqoh A" for Tahfidz and "Halaqoh A" for Tahsin if needed.
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- Find existing unique constraint
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.tahfidz_halaqohs'::regclass
      AND contype = 'u';
      
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.tahfidz_halaqohs DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE public.tahfidz_halaqohs ADD CONSTRAINT tahfidz_halaqohs_unique_name_year_sem_type UNIQUE (name, academic_year_id, semester_id, program_type);
