-- =========================================================================
-- FITUR PERSURATAN (SURAT MENYURAT)
-- Update schema dokumen untuk mendukung Kode Surat, Nomor Surat, dan Tanggal Surat
-- =========================================================================

-- 1. UPDATE TABEL document_types (Jenis Surat/Dokumen)
ALTER TABLE public.document_types 
ADD COLUMN IF NOT EXISTS classification_code text,
ADD COLUMN IF NOT EXISTS audience text check (audience in ('internal', 'eksternal', 'umum')) default 'umum';

-- 2. UPDATE TABEL documents (Dokumen / Surat)
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS document_number text,
ADD COLUMN IF NOT EXISTS document_date date;

-- 3. UPDATE CONSTRAINT owner_type PADA documents (Migrasi dari 'teacher' ke 'employee')
-- Hapus constraint lama
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_owner_type_check;

-- Tambahkan constraint baru yang mendukung 'employee' menggantikan 'teacher'
ALTER TABLE public.documents 
ADD CONSTRAINT documents_owner_type_check 
CHECK (owner_type in ('student', 'employee', 'school'));

-- Update data yang ada jika masih memakai 'teacher'
UPDATE public.documents SET owner_type = 'employee' WHERE owner_type = 'teacher';

-- 4. INSERT DUMMY DATA JENIS SURAT (TEMPLATE PENDIDIKAN)
-- Kita asumsikan category = 'surat'
INSERT INTO public.document_types (name, category, classification_code, audience, is_required)
VALUES
  ('Surat Keputusan (SK) Kepala Sekolah', 'surat', '421.2', 'internal', false),
  ('Surat Edaran Wali Murid', 'surat', '421.3', 'eksternal', false),
  ('Surat Tugas / SPPD', 'surat', '090', 'internal', false),
  ('Surat Undangan Rapat', 'surat', '005', 'internal', false),
  ('Surat Mutasi Siswa', 'surat', '422.2', 'eksternal', false),
  ('Surat Keterangan Lulus', 'surat', '422.3', 'eksternal', false),
  ('Surat Peringatan Siswa (SP)', 'surat', '422.4', 'internal', false),
  ('Surat Pemberitahuan Instansi', 'surat', '421.5', 'eksternal', false)
ON CONFLICT DO NOTHING;
