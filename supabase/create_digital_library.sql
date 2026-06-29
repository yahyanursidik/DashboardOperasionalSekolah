-- Buat tabel Kategori Perpustakaan Digital
CREATE TABLE IF NOT EXISTS public.digital_library_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Buat tabel Buku Perpustakaan Digital
CREATE TABLE IF NOT EXISTS public.digital_library_books (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    author text NOT NULL,
    publisher text,
    publication_year text,
    category_id uuid REFERENCES public.digital_library_categories(id) ON DELETE SET NULL,
    description text,
    cover_url text,
    file_url text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan RLS
ALTER TABLE public.digital_library_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_library_books ENABLE ROW LEVEL SECURITY;

-- Policy untuk Kategori
-- Semua user (termasuk anon) bisa melihat kategori
CREATE POLICY "Enable read access for all users on digital_library_categories"
    ON public.digital_library_categories FOR SELECT
    USING (true);

-- Hanya admin/pegawai yang bisa insert/update/delete
CREATE POLICY "Enable ALL for authenticated users on digital_library_categories"
    ON public.digital_library_categories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy untuk Buku
-- Semua user (termasuk anon) bisa melihat buku yang aktif
CREATE POLICY "Enable read access for all users on digital_library_books"
    ON public.digital_library_books FOR SELECT
    USING (is_active = true OR auth.role() = 'authenticated');

-- Hanya admin/pegawai yang bisa insert/update/delete
CREATE POLICY "Enable ALL for authenticated users on digital_library_books"
    ON public.digital_library_books FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger updated_at (Opsional jika ada fungsi otomatis, tapi umum digunakan)
-- Asumsikan fungsi handle_updated_at() sudah ada di skema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE TRIGGER handle_updated_at_digital_library_categories
            BEFORE UPDATE ON public.digital_library_categories
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();

        CREATE TRIGGER handle_updated_at_digital_library_books
            BEFORE UPDATE ON public.digital_library_books
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;
