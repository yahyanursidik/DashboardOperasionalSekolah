-- ============================================================
-- Modul: Penilaian Kinerja Guru (PKG / SKP)
-- Format: Kemendikbud / Permenneg PAN & RB No. 16/2009
-- ============================================================

-- Tabel utama penilaian PKG
CREATE TABLE IF NOT EXISTS pkg_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id),
  tahun_pelajaran TEXT NOT NULL,                    -- e.g. "2024/2025"
  periode TEXT NOT NULL DEFAULT 'tahunan',          -- tahunan | semester_1 | semester_2
  tanggal_penilaian DATE NOT NULL,
  penilai TEXT NOT NULL,                            -- Nama penilai (Kepala Sekolah)
  jabatan_penilai TEXT,
  nip_penilai TEXT,

  -- ── Kompetensi 1: Pedagogik (14 indikator, bobot 70%) ──────────────────────
  -- Indikator 1: Menguasai karakteristik peserta didik
  -- Indikator 2: Menguasai teori belajar dan prinsip-prinsip pembelajaran
  -- Indikator 3: Pengembangan kurikulum
  -- Indikator 4: Kegiatan pembelajaran yang mendidik
  -- Indikator 5: Pengembangan potensi peserta didik
  -- Indikator 6: Komunikasi dengan peserta didik
  -- Indikator 7: Penilaian dan evaluasi
  pedagogik_scores JSONB NOT NULL DEFAULT '{}',
  -- Format: {"1": 3, "2": 4, "3": 2, ...} nilai 1-4 per indikator
  skor_pedagogik NUMERIC(5,2),

  -- ── Kompetensi 2: Kepribadian (3 indikator, bobot 10%) ─────────────────────
  -- Indikator 8: Bertindak sesuai norma agama, hukum, sosial
  -- Indikator 9: Menunjukkan pribadi dewasa dan teladan
  -- Indikator 10: Etos kerja, tanggung jawab, dan rasa bangga menjadi guru
  kepribadian_scores JSONB NOT NULL DEFAULT '{}',
  skor_kepribadian NUMERIC(5,2),

  -- ── Kompetensi 3: Sosial (2 indikator, bobot 10%) ──────────────────────────
  -- Indikator 11: Bersikap inklusif, bertindak objektif, serta tidak diskriminatif
  -- Indikator 12: Komunikasi dengan sesama guru, tenaga kependidikan, orang tua
  sosial_scores JSONB NOT NULL DEFAULT '{}',
  skor_sosial NUMERIC(5,2),

  -- ── Kompetensi 4: Profesional (2 indikator, bobot 10%) ─────────────────────
  -- Indikator 13: Penguasaan materi, struktur, konsep, dan pola pikir
  -- Indikator 14: Mengembangkan keprofesionalan melalui tindakan reflektif
  profesional_scores JSONB NOT NULL DEFAULT '{}',
  skor_profesional NUMERIC(5,2),

  -- ── Hasil Akhir ─────────────────────────────────────────────────────────────
  nilai_akhir NUMERIC(5,2),                         -- Nilai PKG 0–100
  nilai_npkg NUMERIC(5,2),                          -- Nilai NPKG (normalized)
  predikat TEXT,                                    -- Amat Baik | Baik | Cukup | Sedang | Kurang
  persentase_angka_kredit NUMERIC(5,2),             -- 125 | 100 | 75 | 50 | 25

  -- ── Metadata ────────────────────────────────────────────────────────────────
  catatan TEXT,
  rekomendasi TEXT,
  status TEXT NOT NULL DEFAULT 'draft',             -- draft | final
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_pkg_assessments_employee_id ON pkg_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_pkg_assessments_tahun ON pkg_assessments(tahun_pelajaran);
CREATE INDEX IF NOT EXISTS idx_pkg_assessments_status ON pkg_assessments(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_pkg_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pkg_updated_at ON pkg_assessments;
CREATE TRIGGER trg_pkg_updated_at
  BEFORE UPDATE ON pkg_assessments
  FOR EACH ROW EXECUTE FUNCTION update_pkg_updated_at();

-- ── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE pkg_assessments ENABLE ROW LEVEL SECURITY;

-- Allow full access for authenticated users
DROP POLICY IF EXISTS "pkg_authenticated_all" ON pkg_assessments;
CREATE POLICY "pkg_authenticated_all"
  ON pkg_assessments
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── Grant ─────────────────────────────────────────────────────────────────────
GRANT ALL ON pkg_assessments TO authenticated;
GRANT ALL ON pkg_assessments TO service_role;
