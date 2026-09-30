-- Darurat: tutup akses anonim (tanpa login) yang ditemukan pada audit RLS produksi 2026-09-30.
--
--   recruitment_applicants   SELECT true  -> data pribadi pelamar terbaca publik
--   rooms, room_schedules    ALL true     -> publik dapat membaca & mengubah
--   student_academic_history SELECT true  -> riwayat mutasi/kelulusan siswa terbaca publik
--   curriculum_documents     SELECT true  -> dokumen kurikulum internal terbaca publik
--
-- Pengguna yang login tidak terdampak (semua halaman terkait ada di panel admin/HRD).
-- Pengetatan per peran untuk pengguna login dilakukan pada migrasi terpisah.

drop policy if exists "Enable read access for all users on recruitment_applicants" on public.recruitment_applicants;

drop policy if exists "Enable read/write for all users" on public.rooms;
drop policy if exists "Authenticated users manage rooms" on public.rooms;
create policy "Authenticated users manage rooms" on public.rooms
  for all to authenticated using (true) with check (true);

drop policy if exists "Enable read/write for all users" on public.room_schedules;
drop policy if exists "Authenticated users manage room schedules" on public.room_schedules;
create policy "Authenticated users manage room schedules" on public.room_schedules
  for all to authenticated using (true) with check (true);

drop policy if exists "Enable read access for all users on student_academic_history" on public.student_academic_history;
drop policy if exists "Authenticated users read student academic history" on public.student_academic_history;
create policy "Authenticated users read student academic history" on public.student_academic_history
  for select to authenticated using (true);

drop policy if exists "Enable read access for all users on curriculum_documents" on public.curriculum_documents;
drop policy if exists "Authenticated users read curriculum documents" on public.curriculum_documents;
create policy "Authenticated users read curriculum documents" on public.curriculum_documents
  for select to authenticated using (true);

notify pgrst, 'reload schema';
