-- ============================================================
-- Manajemen Instrumen PKG (Kompetensi & Indikator)
-- Admin bisa tambah/edit/hapus via UI tanpa sentuh kode
-- ============================================================

-- Tabel Kompetensi PKG
CREATE TABLE IF NOT EXISTS pkg_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,           -- e.g. "pedagogik", "kepribadian"
  label TEXT NOT NULL,                -- e.g. "Kompetensi Pedagogik"
  weight NUMERIC(5,2) NOT NULL DEFAULT 10, -- Bobot dalam % (total harus 100)
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel Indikator PKG (pertanyaan per kompetensi)
CREATE TABLE IF NOT EXISTS pkg_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id UUID NOT NULL REFERENCES pkg_competencies(id) ON DELETE CASCADE,
  indicator_number TEXT NOT NULL,     -- e.g. "1", "2", "1a", "1b"
  label TEXT NOT NULL,                -- Judul indikator/pertanyaan
  description TEXT,                   -- Deskripsi/penjelasan
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_pkg_indicators_competency ON pkg_indicators(competency_id);
CREATE INDEX IF NOT EXISTS idx_pkg_competencies_sort ON pkg_competencies(sort_order);
CREATE INDEX IF NOT EXISTS idx_pkg_indicators_sort ON pkg_indicators(sort_order);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_pkg_instrument_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pkg_competencies_updated_at
  BEFORE UPDATE ON pkg_competencies FOR EACH ROW EXECUTE FUNCTION update_pkg_instrument_updated_at();
CREATE TRIGGER trg_pkg_indicators_updated_at
  BEFORE UPDATE ON pkg_indicators FOR EACH ROW EXECUTE FUNCTION update_pkg_instrument_updated_at();

-- RLS
ALTER TABLE pkg_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pkg_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pkg_comp_auth" ON pkg_competencies FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pkg_ind_auth"  ON pkg_indicators  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
GRANT ALL ON pkg_competencies TO authenticated, service_role;
GRANT ALL ON pkg_indicators   TO authenticated, service_role;

-- ============================================================
-- SEED DATA: Instrumen default Kemendikbud
-- ============================================================

-- Kompetensi
INSERT INTO pkg_competencies (key, label, weight, sort_order) VALUES
  ('pedagogik',   'Kompetensi Pedagogik',   70, 1),
  ('kepribadian', 'Kompetensi Kepribadian', 10, 2),
  ('sosial',      'Kompetensi Sosial',      10, 3),
  ('profesional', 'Kompetensi Profesional', 10, 4)
ON CONFLICT (key) DO NOTHING;

-- Indikator Pedagogik
INSERT INTO pkg_indicators (competency_id, indicator_number, label, description, sort_order)
SELECT c.id, ind.num, ind.label, ind.deskripsi, ind.ord
FROM pkg_competencies c
CROSS JOIN (VALUES
  ('1', 'Menguasai karakteristik peserta didik',
   'Guru mencatat dan menggunakan informasi tentang karakteristik peserta didik untuk membantu proses pembelajaran.', 1),
  ('2', 'Menguasai teori belajar dan prinsip pembelajaran',
   'Guru menetapkan berbagai pendekatan, strategi, metode, dan teknik pembelajaran yang mendidik secara kreatif.', 2),
  ('3', 'Pengembangan kurikulum',
   'Guru menyusun silabus sesuai dengan tujuan terpenting kurikulum dan menggunakan RPP sesuai tujuan dan lingkungan pembelajaran.', 3),
  ('4', 'Kegiatan pembelajaran yang mendidik',
   'Guru melaksanakan aktivitas pembelajaran sesuai rancangan yang telah disusun secara lengkap.', 4),
  ('5', 'Pengembangan potensi peserta didik',
   'Guru menganalisis hasil belajar berdasarkan segala bentuk penilaian terhadap setiap peserta didik.', 5),
  ('6', 'Komunikasi dengan peserta didik',
   'Guru menggunakan pertanyaan untuk mengetahui pemahaman dan menjaga partisipasi peserta didik.', 6),
  ('7', 'Penilaian dan evaluasi',
   'Guru menyusun alat penilaian yang sesuai dengan tujuan pembelajaran untuk mencapai kompetensi tertentu.', 7)
) AS ind(num, label, deskripsi, ord)
WHERE c.key = 'pedagogik'
ON CONFLICT DO NOTHING;

-- Indikator Kepribadian
INSERT INTO pkg_indicators (competency_id, indicator_number, label, description, sort_order)
SELECT c.id, ind.num, ind.label, ind.deskripsi, ind.ord
FROM pkg_competencies c
CROSS JOIN (VALUES
  ('8',  'Bertindak sesuai norma agama, hukum, sosial, dan kebudayaan',
   'Guru menghargai dan mempromosikan prinsip-prinsip Pancasila sebagai dasar ideologi dan etika bagi semua warga Indonesia.', 1),
  ('9',  'Menunjukkan pribadi dewasa dan teladan',
   'Guru berperilaku jujur, tegas, dan manusiawi, berperilaku yang mencerminkan ketaqwaan dan akhlak mulia.', 2),
  ('10', 'Etos kerja, tanggung jawab, dan rasa bangga menjadi guru',
   'Guru memahami dan melaksanakan berbagai program dalam lingkungan sosial dan memiliki visi jangka panjang.', 3)
) AS ind(num, label, deskripsi, ord)
WHERE c.key = 'kepribadian'
ON CONFLICT DO NOTHING;

-- Indikator Sosial
INSERT INTO pkg_indicators (competency_id, indicator_number, label, description, sort_order)
SELECT c.id, ind.num, ind.label, ind.deskripsi, ind.ord
FROM pkg_competencies c
CROSS JOIN (VALUES
  ('11', 'Bersikap inklusif, bertindak objektif, serta tidak diskriminatif',
   'Guru tidak memihak kepada salah satu kelompok agama, suku, jenis kelamin, atau status sosial ekonomi.', 1),
  ('12', 'Komunikasi dengan sesama guru, tenaga kependidikan, dan orang tua',
   'Guru menyampaikan informasi tentang kemajuan, kesulitan, dan potensi peserta didik kepada orang tuanya.', 2)
) AS ind(num, label, deskripsi, ord)
WHERE c.key = 'sosial'
ON CONFLICT DO NOTHING;

-- Indikator Profesional
INSERT INTO pkg_indicators (competency_id, indicator_number, label, description, sort_order)
SELECT c.id, ind.num, ind.label, ind.deskripsi, ind.ord
FROM pkg_competencies c
CROSS JOIN (VALUES
  ('13', 'Penguasaan materi, struktur, konsep, dan pola pikir keilmuan',
   'Guru melakukan pemetaan standar kompetensi dan kompetensi dasar untuk mata pelajaran yang diampunya.', 1),
  ('14', 'Mengembangkan keprofesionalan melalui tindakan reflektif',
   'Guru melakukan evaluasi diri secara spesifik, lengkap, dan didukung dengan contoh pengalaman diri sendiri.', 2)
) AS ind(num, label, deskripsi, ord)
WHERE c.key = 'profesional'
ON CONFLICT DO NOTHING;
