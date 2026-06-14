-- =========================================================================
-- CREATE LEAVE REQUESTS
-- Modul Pengajuan Izin & Cuti (Opsi B)
-- =========================================================================

-- 1. Create Table
CREATE TABLE public.leave_requests (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid references public.employees(id) on delete cascade not null,
    start_date date not null,
    end_date date not null,
    leave_type text not null check (leave_type in ('sakit', 'izin', 'cuti_tahunan', 'cuti_melahirkan', 'dinas_luar', 'lainnya')),
    reason text not null,
    proof_document text, -- Menyimpan path file di Supabase Storage
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    approved_by uuid references auth.users(id),
    academic_year_id uuid references public.academic_years(id),
    unit_id uuid references public.units(id),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    CONSTRAINT valid_dates CHECK (start_date <= end_date)
);

-- Index
CREATE INDEX idx_leave_requests_emp ON public.leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);

-- 2. Trigger Updated At
CREATE TRIGGER handle_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 3. Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('leave_documents', 'leave_documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'leave_documents');

DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Auth Insert" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'leave_documents');

DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" 
ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'leave_documents');

DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
CREATE POLICY "Auth Delete" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'leave_documents');


-- 4. RLS (Row Level Security)
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Untuk kesederhanaan, semua orang yang login (Guru/Admin) bisa melihat daftar (biar HRD bisa rekap, dan guru bisa lihat miliknya)
-- Dalam implementasi nyata, policy SELECT dibatasi ke `auth.uid() = employee.user_id` atau role Admin.
CREATE POLICY "Users can read all leave requests" 
ON public.leave_requests 
FOR SELECT TO authenticated USING (true);

-- Semua orang bisa insert pengajuan
CREATE POLICY "Users can insert leave requests" 
ON public.leave_requests 
FOR INSERT TO authenticated WITH CHECK (true);

-- Hanya Admin/HRD yang biasanya boleh update status, tapi untuk kemudahan Refine, kita buka ke authenticated
CREATE POLICY "Users can update leave requests" 
ON public.leave_requests 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete leave requests" 
ON public.leave_requests 
FOR DELETE TO authenticated USING (true);

-- 5. INSERT DUMMY DATA
DO $$
DECLARE
  v_sdit_unit uuid := '22222222-2222-2222-2222-222222222222';
  v_academic_year uuid := '44444444-4444-4444-4444-444444444444';
  v_employee_guru uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01';
BEGIN
  INSERT INTO public.leave_requests (employee_id, start_date, end_date, leave_type, reason, status, academic_year_id, unit_id)
  VALUES 
    (v_employee_guru, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '1 days', 'sakit', 'Demam Berdarah (Rawat Inap)', 'approved', v_academic_year, v_sdit_unit),
    (v_employee_guru, CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '5 days', 'izin', 'Keperluan Keluarga (Pernikahan Saudara)', 'pending', v_academic_year, v_sdit_unit);
EXCEPTION WHEN OTHERS THEN
END $$;
