-- Migrasi untuk menambahkan kolom yang hilang di tabel Parents (Orang Tua)
-- Kolom-kolom ini diperlukan oleh form UI agar data bisa disimpan

ALTER TABLE public.parents
ADD COLUMN IF NOT EXISTS nik text,
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS religion text;
