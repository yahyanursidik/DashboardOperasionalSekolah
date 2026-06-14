-- =========================================================================
-- DUMMY DATA UNTUK MODUL KEUANGAN
-- Eksekusi script ini SETELAH menjalankan script create_finance_module.sql
-- =========================================================================

-- Dapatkan kategori SPP dan Seragam untuk SDIT
DO $$
DECLARE
    spp_id uuid;
    uang_pangkal_id uuid;
    student_aisyah uuid := '99999999-9999-9999-9999-999999999101';
    student_abdullah uuid := '99999999-9999-9999-9999-999999999991';
    academic_year uuid := '44444444-4444-4444-4444-444444444444';
    unit_sdit uuid := '22222222-2222-2222-2222-222222222222';
    invoice1 uuid;
    invoice2 uuid;
BEGIN
    SELECT id INTO spp_id FROM public.finance_categories WHERE name = 'SPP (Sumbangan Pembinaan Pendidikan)' LIMIT 1;
    SELECT id INTO uang_pangkal_id FROM public.finance_categories WHERE name = 'Uang Pangkal / Gedung' LIMIT 1;

    -- 1. Buat Tagihan SPP Aisyah (Lunas)
    INSERT INTO public.student_invoices (student_id, category_id, academic_year_id, unit_id, title, month, amount, discount, paid_amount, status, due_date)
    VALUES (student_aisyah, spp_id, academic_year, unit_sdit, 'SPP Juli 2024', '2024-07', 500000, 0, 500000, 'paid', '2024-07-10')
    RETURNING id INTO invoice1;

    -- Transaksi SPP Aisyah
    INSERT INTO public.payment_transactions (invoice_id, student_id, amount_paid, payment_method, payment_date, status, notes)
    VALUES (invoice1, student_aisyah, 500000, 'transfer', '2024-07-05', 'verified', 'BSI 1234');

    -- 2. Buat Tagihan Uang Pangkal Abdullah (Dicicil)
    INSERT INTO public.student_invoices (student_id, category_id, academic_year_id, unit_id, title, amount, discount, paid_amount, status, due_date)
    VALUES (student_abdullah, uang_pangkal_id, academic_year, unit_sdit, 'Uang Pangkal Masuk SD', 5000000, 500000, 2000000, 'partial', '2024-12-31')
    RETURNING id INTO invoice2;

    -- Transaksi Uang Pangkal Abdullah (Cicilan 1)
    INSERT INTO public.payment_transactions (invoice_id, student_id, amount_paid, payment_method, payment_date, status, notes)
    VALUES (invoice2, student_abdullah, 2000000, 'cash', '2024-07-01', 'verified', 'Titip via TU');

    -- 3. Transaksi Menunggu Verifikasi (Pending)
    INSERT INTO public.payment_transactions (invoice_id, student_id, amount_paid, payment_method, payment_date, status, proof_image_url)
    VALUES (invoice2, student_abdullah, 1000000, 'transfer', '2024-08-01', 'pending_verification', 'https://example.com/receipt.jpg');

END $$;
