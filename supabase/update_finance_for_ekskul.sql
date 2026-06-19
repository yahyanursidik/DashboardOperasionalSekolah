-- 1. Modify student_invoices to allow external_student_id
ALTER TABLE public.student_invoices ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.student_invoices ADD COLUMN IF NOT EXISTS external_student_id uuid references public.external_students(id) ON DELETE CASCADE;

-- Add a CHECK constraint to ensure either student_id or external_student_id is present
ALTER TABLE public.student_invoices ADD CONSTRAINT check_student_invoice_owner CHECK (
    (student_id IS NOT NULL AND external_student_id IS NULL) OR 
    (student_id IS NULL AND external_student_id IS NOT NULL)
);

-- 2. Modify payment_transactions to allow external_student_id
ALTER TABLE public.payment_transactions ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS external_student_id uuid references public.external_students(id) ON DELETE CASCADE;

ALTER TABLE public.payment_transactions ADD CONSTRAINT check_payment_owner CHECK (
    (student_id IS NOT NULL AND external_student_id IS NULL) OR 
    (student_id IS NULL AND external_student_id IS NOT NULL)
);

-- 3. Create Trigger Function to generate invoice when a member joins
CREATE OR REPLACE FUNCTION generate_extracurricular_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_fee numeric;
    v_program_name text;
    v_category_id uuid;
BEGIN
    -- Only generate invoice if status is ACTIVE or PENDING (assuming they should pay upon registration)
    -- In this case, we just generate the invoice on insert.
    
    -- Get program details
    SELECT name, CASE WHEN NEW.student_id IS NOT NULL THEN internal_fee ELSE external_fee END
    INTO v_program_name, v_fee
    FROM public.extracurriculars
    WHERE id = NEW.extracurricular_id;

    -- Only generate invoice if fee > 0
    IF COALESCE(v_fee, 0) > 0 THEN
        -- Find the finance category for 'Kegiatan & Ekskul'
        SELECT id INTO v_category_id FROM public.finance_categories WHERE name = 'Kegiatan & Ekskul' LIMIT 1;
        
        IF v_category_id IS NULL THEN
            -- Fallback
            SELECT id INTO v_category_id FROM public.finance_categories LIMIT 1;
        END IF;

        -- Create invoice
        INSERT INTO public.student_invoices (
            student_id, 
            external_student_id, 
            category_id, 
            title, 
            amount, 
            discount, 
            paid_amount, 
            status, 
            due_date, 
            description
        ) VALUES (
            NEW.student_id,
            NEW.external_student_id,
            v_category_id,
            'Tagihan Ekskul: ' || v_program_name,
            v_fee,
            0,
            0,
            'unpaid',
            CURRENT_DATE + interval '7 days', -- Due in 7 days
            'Tagihan otomatis untuk pendaftaran ekstrakurikuler ' || v_program_name
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach Trigger to extracurricular_members
DROP TRIGGER IF EXISTS trigger_generate_extracurricular_invoice ON public.extracurricular_members;
CREATE TRIGGER trigger_generate_extracurricular_invoice
AFTER INSERT ON public.extracurricular_members
FOR EACH ROW EXECUTE PROCEDURE generate_extracurricular_invoice();
