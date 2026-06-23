-- Tambahan Kolom Profil Lengkap Siswa Eksternal (Ekskul)
ALTER TABLE public.external_students
ADD COLUMN IF NOT EXISTS birth_place text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS parent_phone_number text,
ADD COLUMN IF NOT EXISTS medical_notes text;
