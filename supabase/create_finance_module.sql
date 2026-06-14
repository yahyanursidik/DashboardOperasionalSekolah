-- =========================================================================
-- CREATE FINANCE MODULE
-- =========================================================================

-- 1. FINANCE CATEGORIES (Kategori Pemasukan & Pengeluaran)
CREATE TABLE IF NOT EXISTS public.finance_categories (
    id uuid primary key default gen_random_uuid(),
    unit_id uuid references public.units(id), -- Null means global
    type text not null check (type in ('income', 'expense')),
    name text not null,
    description text,
    is_recurring boolean default false, -- e.g., SPP is recurring
    default_amount numeric default 0,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 2. STUDENT INVOICES (Tagihan Siswa)
CREATE TABLE IF NOT EXISTS public.student_invoices (
    id uuid primary key default gen_random_uuid(),
    student_id uuid references public.students(id) on delete cascade not null,
    category_id uuid references public.finance_categories(id) not null,
    academic_year_id uuid references public.academic_years(id),
    unit_id uuid references public.units(id),
    title text not null, -- e.g., "SPP Agustus 2024"
    month text, -- format: "2024-08" (for recurring)
    amount numeric not null default 0,
    discount numeric not null default 0,
    paid_amount numeric not null default 0,
    status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid', 'cancelled')),
    due_date date,
    description text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 3. PAYMENT TRANSACTIONS (Transaksi Pembayaran/Verifikasi)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid references public.student_invoices(id) on delete cascade not null,
    student_id uuid references public.students(id) on delete cascade not null,
    amount_paid numeric not null,
    payment_method text not null check (payment_method in ('cash', 'transfer', 'qris', 'virtual_account')),
    payment_date date not null default current_date,
    reference_number text,
    proof_image_url text,
    status text not null default 'pending_verification' check (status in ('pending_verification', 'verified', 'rejected')),
    verified_by uuid references public.employees(id),
    verified_at timestamptz,
    notes text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 4. SCHOOL EXPENSES (Buku Kas Keluar / Pengeluaran)
CREATE TABLE IF NOT EXISTS public.school_expenses (
    id uuid primary key default gen_random_uuid(),
    unit_id uuid references public.units(id),
    category_id uuid references public.finance_categories(id) not null,
    academic_year_id uuid references public.academic_years(id),
    amount numeric not null,
    expense_date date not null default current_date,
    title text not null,
    description text,
    recorded_by uuid references public.employees(id),
    proof_image_url text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- =========================================================================
-- INDEXES & TRIGGERS
-- =========================================================================

CREATE INDEX idx_finance_categories_unit ON public.finance_categories(unit_id);
CREATE INDEX idx_student_invoices_student ON public.student_invoices(student_id);
CREATE INDEX idx_student_invoices_status ON public.student_invoices(status);
CREATE INDEX idx_student_invoices_month ON public.student_invoices(month);
CREATE INDEX idx_payment_transactions_invoice ON public.payment_transactions(invoice_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_school_expenses_unit ON public.school_expenses(unit_id);

-- Trigger to handle updated_at
create trigger handle_updated_at_finance_categories before update on public.finance_categories for each row execute procedure handle_updated_at();
create trigger handle_updated_at_student_invoices before update on public.student_invoices for each row execute procedure handle_updated_at();
create trigger handle_updated_at_payment_transactions before update on public.payment_transactions for each row execute procedure handle_updated_at();
create trigger handle_updated_at_school_expenses before update on public.school_expenses for each row execute procedure handle_updated_at();

-- Trigger Function to auto-calculate invoice paid_amount and status
CREATE OR REPLACE FUNCTION update_invoice_status_on_payment()
RETURNS trigger AS $$
DECLARE
    total_paid numeric;
    inv_amount numeric;
    inv_discount numeric;
    net_amount numeric;
BEGIN
    -- Only calculate verified payments
    SELECT COALESCE(SUM(amount_paid), 0) INTO total_paid
    FROM public.payment_transactions
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
      AND status = 'verified';

    -- Get invoice details
    SELECT amount, discount INTO inv_amount, inv_discount
    FROM public.student_invoices
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    net_amount := inv_amount - inv_discount;

    -- Update invoice
    UPDATE public.student_invoices
    SET 
        paid_amount = total_paid,
        status = CASE 
            WHEN total_paid >= net_amount THEN 'paid'
            WHEN total_paid > 0 THEN 'partial'
            ELSE 'unpaid'
        END
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to payment_transactions
CREATE TRIGGER trigger_update_invoice_status
AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
FOR EACH ROW EXECUTE PROCEDURE update_invoice_status_on_payment();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================================

alter table public.finance_categories enable row level security;
alter table public.student_invoices enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.school_expenses enable row level security;

-- Simple policies for admin (temporarily using true for all authenticated users like existing schema)
create policy "Allow authenticated full access to finance_categories" on public.finance_categories for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to student_invoices" on public.student_invoices for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to payment_transactions" on public.payment_transactions for all to authenticated using (true) with check (true);
create policy "Allow authenticated full access to school_expenses" on public.school_expenses for all to authenticated using (true) with check (true);

-- =========================================================================
-- SEED DATA DEFAULT KATEGORI
-- =========================================================================

INSERT INTO public.finance_categories (type, name, is_recurring, default_amount) VALUES 
('income', 'SPP (Sumbangan Pembinaan Pendidikan)', true, 500000),
('income', 'Uang Pangkal / Gedung', false, 5000000),
('income', 'Seragam Sekolah', false, 850000),
('income', 'Buku Pelajaran', false, 600000),
('income', 'Kegiatan & Ekskul', false, 300000),
('expense', 'Gaji Pegawai & Guru', true, 0),
('expense', 'Listrik & Internet', true, 0),
('expense', 'ATK & Operasional', true, 0),
('expense', 'Konsumsi & Rapat', false, 0),
('expense', 'Pemeliharaan Gedung', false, 0)
ON CONFLICT DO NOTHING;
