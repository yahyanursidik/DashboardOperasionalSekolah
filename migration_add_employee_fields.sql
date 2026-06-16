-- =====================================================================
-- MIGRATION: Tambah kolom-kolom yang dibutuhkan oleh fitur baru
-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard
-- =====================================================================

-- 1. Tambah kolom ke tabel employees (untuk form lengkap)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS gender         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS birth_date     DATE,
  ADD COLUMN IF NOT EXISTS join_date      DATE,
  ADD COLUMN IF NOT EXISTS education      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS certification  VARCHAR(200),
  ADD COLUMN IF NOT EXISTS email          VARCHAR(200);

-- 2. Tambah kolom subject ke tabel teacher_assignments
--    (jika belum ada — dipakai untuk mapping Mapel → Guru)
ALTER TABLE teacher_assignments
  ADD COLUMN IF NOT EXISTS subject VARCHAR(200);

-- 3. (Opsional) Index untuk pencarian cepat mapel
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject
  ON teacher_assignments(subject);

-- 4. (Opsional) Kolom jam mengajar per minggu
ALTER TABLE teacher_assignments
  ADD COLUMN IF NOT EXISTS hours_per_week INT DEFAULT NULL;

-- =====================================================================
-- VERIFIKASI: Cek kolom yang ada setelah migration
-- =====================================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'teacher_assignments'
ORDER BY ordinal_position;
