-- =========================================================================
-- BERSIHKAN IDENTITAS LAMA YANG BENTROK (ROOT CAUSE LOGIN ERROR)
-- =========================================================================

-- Masalah terakhir: Meskipun email di auth.users sudah diubah, 
-- tabel auth.identities masih menyimpan email lama yang memblokir pendaftaran akun baru!

-- Hapus identitas lama yang menahan email tersebut:
DELETE FROM auth.identities 
WHERE provider_id IN (
  'guru1@sekolah.demo', 'guru_baru@tsls.demo', 'ortu_baru@tsls.demo',
  'ali.akbar@ortu.demo', 'bapak.budi@alfatih.demo', 'ustadz.ahmad@alfatih.demo', 'ustadzah.siti@alfatih.demo'
) OR provider_id LIKE '%@parent.demo' OR provider_id LIKE '%@tsls.demo';

-- Kita juga pastikan email di auth.identities yang nyangkut ikut diubah jika belum terhapus:
UPDATE auth.identities 
SET provider_id = provider_id || '_broken_' || gen_random_uuid()::text,
    identity_data = jsonb_set(identity_data, '{email}', to_jsonb(provider_id || '_broken_' || gen_random_uuid()::text))
WHERE provider_id IN (
  'guru1@sekolah.demo', 'guru_baru@tsls.demo', 'ortu_baru@tsls.demo',
  'ali.akbar@ortu.demo', 'bapak.budi@alfatih.demo', 'ustadz.ahmad@alfatih.demo', 'ustadzah.siti@alfatih.demo'
) OR provider_id LIKE '%@parent.demo' OR provider_id LIKE '%@tsls.demo';
