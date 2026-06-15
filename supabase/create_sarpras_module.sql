-- =========================================================================
-- CREATE SARPRAS (ASET & INVENTARIS) MODULE
-- =========================================================================

-- 1. ASSETS (Katalog Aset)
CREATE TABLE IF NOT EXISTS public.assets (
    id uuid primary key default gen_random_uuid(),
    unit_id uuid references public.units(id), -- Null means shared/global asset
    code text unique not null,
    name text not null,
    category text not null check (category in ('Elektronik', 'Furnitur', 'Kendaraan', 'Ruangan', 'Lainnya')),
    condition text not null default 'Baik' check (condition in ('Baik', 'Rusak Ringan', 'Rusak Berat')),
    location text,
    purchase_date date,
    purchase_price numeric default 0,
    status text not null default 'Tersedia' check (status in ('Tersedia', 'Dipinjam', 'Diperbaiki', 'Dihapus')),
    notes text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 2. ASSET LOANS (Peminjaman Ruangan/Barang)
CREATE TABLE IF NOT EXISTS public.asset_loans (
    id uuid primary key default gen_random_uuid(),
    asset_id uuid references public.assets(id) on delete cascade not null,
    borrower_id uuid references public.employees(id) on delete cascade not null,
    start_date timestamptz not null,
    end_date timestamptz not null,
    purpose text not null,
    status text not null default 'Menunggu' check (status in ('Menunggu', 'Disetujui', 'Ditolak', 'Dikembalikan')),
    approved_by uuid references public.employees(id),
    notes text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 3. PROCUREMENTS (Pengajuan Pengadaan Barang)
CREATE TABLE IF NOT EXISTS public.procurements (
    id uuid primary key default gen_random_uuid(),
    unit_id uuid references public.units(id),
    requester_id uuid references public.employees(id) on delete cascade not null,
    item_name text not null,
    quantity integer not null default 1 check (quantity > 0),
    estimated_price numeric not null default 0,
    purpose text not null,
    status text not null default 'Menunggu' check (status in ('Menunggu', 'Disetujui', 'Ditolak', 'Selesai')),
    approved_by uuid references public.employees(id),
    expense_id uuid references public.school_expenses(id), -- Nullable, filled when budget is disbursed
    notes text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- =========================================================================
-- INDEXES & TRIGGERS
-- =========================================================================

CREATE INDEX idx_assets_category ON public.assets(category);
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE INDEX idx_asset_loans_status ON public.asset_loans(status);
CREATE INDEX idx_procurements_status ON public.procurements(status);

-- Ensure the trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

create trigger handle_updated_at_assets before update on public.assets for each row execute procedure update_updated_at();
create trigger handle_updated_at_asset_loans before update on public.asset_loans for each row execute procedure update_updated_at();
create trigger handle_updated_at_procurements before update on public.procurements for each row execute procedure update_updated_at();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================================

alter table public.assets enable row level security;
alter table public.asset_loans enable row level security;
alter table public.procurements enable row level security;

create policy "Allow authenticated access to assets" on public.assets for all to authenticated using (true) with check (true);
create policy "Allow authenticated access to asset_loans" on public.asset_loans for all to authenticated using (true) with check (true);
create policy "Allow authenticated access to procurements" on public.procurements for all to authenticated using (true) with check (true);
