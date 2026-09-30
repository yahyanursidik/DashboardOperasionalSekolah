# Audit Sistem Informasi Sekolah — TSLS Admin OS

Tanggal audit: 30 September 2026 · Basis kode: `main` @ `24e9319` + perbaikan di working tree

## 1. Ringkasan Eksekutif

TSLS Admin OS sudah merupakan SIS yang **luas dan cukup matang**: 43 modul, ±284 route, 10 portal
(Admin, Orang Tua, Guru, Staf, Bendahara, HRD, Admin SPMB, SPMB publik, Ekskul, CBT), 93 migrasi database,
alur rapor digital berjenjang (guru → wali kelas → wakasek → kepsek → publish), keuangan dengan akuntansi,
absensi pegawai dengan geofence/shift, Tahfidz/Tahsin, PAUD/STPPA, Sarpras, persuratan, dan LMS HBL.

`tsc -b` dan `npm run build` **lulus tanpa error**. Namun audit menemukan:

| Prioritas | Jumlah | Keterangan singkat |
|---|---|---|
| **P0 – Kritis (keamanan/data)** | 5 | Endpoint buat-akun tanpa autentikasi, kunci jawaban CBT terbuka, kebijakan RLS terlalu longgar, guard SPMB fail-open, absensi siswa terpotong 10 siswa |
| **P1 – Tinggi (fungsi salah/palsu)** | 8 | Menu Komunikasi hanya simulasi, dua sistem nilai tidak terhubung, PDF rapor 1 halaman + placeholder, tidak ada otorisasi per-route, dll. |
| **P2 – Sedang (UX/konsistensi)** | 10 | Menu salah kelompok, halaman yatim, 404 → login, toast ganda, redirect salah Tahsin, dll. |
| **P3 – Rendah (kualitas kode/ops)** | 7 | 25 file duplikat "(1)", skrip lepas di root, bundle 7,3 MB tanpa code-splitting, 1.196 `any`, tanpa test |

**14 temuan sudah diperbaiki langsung** dalam sesi ini (ditandai ✅). Sisanya membutuhkan keputusan
produk, akses database produksi, atau pengembangan fitur baru (lihat Roadmap §6).

---

## 2. Metode

1. Pemetaan seluruh route (`src/app/App.tsx`), menu sidebar (`src/config/navigation.ts`), peta izin
   (`src/lib/permissions/index.ts`), dan 9 layout portal.
2. Pemeriksaan statis: `tsc -b`, `eslint`, pemindaian tautan internal vs route, pemindaian 366 panggilan
   `useList` untuk pagination, pemindaian penanda "simulasi/mock/MVP/TODO".
3. Tinjauan keamanan: endpoint serverless (`api/`, `netlify/functions/`, `server/`), kebijakan RLS di
   `supabase/`, guard login tiap portal.
4. Analisis kesenjangan fitur terhadap standar SIS sekolah (Indonesia) yang profesional.
5. Verifikasi di browser (dev server): halaman 404 baru, halaman login, dan penolakan endpoint tanpa token.

> Catatan: status RLS **aktual** di database produksi tidak diperiksa (butuh akses langsung). Temuan RLS
> berasal dari skrip SQL di repo dan perlu dikonfirmasi di Supabase (query disediakan di §4-P0.3).

---

## 3. Peta Fitur & Status per Menu

Legenda: 🟢 berfungsi · 🟡 berfungsi dengan catatan · 🔴 bermasalah/palsu · ⚪ belum ada

### Admin Panel (`/`)

| Grup Menu | Menu / Sub-fitur | Status | Catatan |
|---|---|---|---|
| Operasional Harian | Beranda, Kalender Akademik, Pengumuman, Tugas | 🟢 | Tugas & Pengumuman sebelumnya hanya tampil 10 data ✅ |
| LMS | LMS Homebased Learning | 🟡 | Hanya terlihat oleh peran yang punya akses `subjects` (guru tidak) |
| Kesiswaan & Akademik | Siswa, Orang Tua, Layanan Ortu, Kelas, Kurikulum, Pola Jadwal | 🟢 | Detail kelas sebelumnya hanya 10 siswa ✅ |
| | Absensi Siswa | 🔴→🟢 | **Input absensi hanya memuat 10 siswa pertama** + siswa lulus/pindah ikut muncul ✅ |
| | Nilai Akademik / Kelengkapan Rapor | 🟡 | Terpisah total dari Rapor Digital (entri ganda) — lihat P1.2 |
| | Jurnal, Ekstrakurikuler | 🟢 | Seluruh list ekskul sebelumnya terpotong 10 ✅ |
| SPMB | CRM, Penerimaan, Pengaturan, Laporan | 🟢 | Matang (kuota, gelombang, surat komitmen, audit) |
| Rapor Digital | Monitoring s/d Generate PDF (11 menu) | 🟡 | PDF 1 halaman + placeholder logo/kepsek (P1.3); filter kelas guru tidak jalan (P1.5) |
| Tahfidz / Tahsin | 11 menu | 🟢 | Simpan Tahsin sebelumnya kembali ke halaman Tahfidz ✅ |
| PAUD | 4 menu | 🟢 | Hanya tampil untuk unit PAUD/TK/KB |
| SDM & Kepegawaian | 15 menu | 🟡 | "Data Pendaftar" (SPMB) salah grup; CBT Rekrutmen tidak aman (P0.2) |
| Keuangan | 13 menu | 🟢 | Belum ada payment gateway/VA otomatis |
| Sarpras | 8 menu | 🟢 | Dropdown aset/pegawai sebelumnya terpotong 10 ✅ |
| Tata Usaha & Dokumen | 8 menu | 🟢 | Owner dokumen masih "mock list" (`documents/pages/create.tsx:37`) |
| Sistem & Laporan | Data Induk, Laporan, Audit Trail, Pengaturan | 🟢 | Audit Trail hanya 10 log ✅ (kini paginasi 50/hal) |
| | **Komunikasi** | 🔴 | **Simulasi**: tombol kirim hanya `setTimeout`, riwayat broadcast hardcode (P1.1) |
| | Pengaturan → Tambah Akun | 🔴→🟢 | Endpoint tanpa auth & tidak ter-deploy di Netlify ✅ |

### Portal

| Portal | Status | Catatan |
|---|---|---|
| Orang Tua `/portal` | 🟢 | Dashboard, absensi, keuangan, akademik, Qur'an, PAUD, jurnal, HBL, rapor, layanan |
| Guru `/teacher` | 🟢 | 15 halaman; input rapor terhubung ke Rapor Digital |
| Staf `/staff` | 🟢 | Absensi mandiri, izin, tugas, laporan operasional |
| Bendahara `/bendahara` | 🟢 | Guard peran + jabatan |
| HRD `/hrd` | 🟡 | Hanya rekrutmen + data pegawai; belum ada cuti/absensi/payroll di portal ini |
| Admin SPMB `/admin-spmb` | 🔴→🟢 | Guard fail-open saat RPC gagal ✅ |
| SPMB publik `/spmb` | 🟢 | Alur terpandu lengkap |
| Ekskul `/ekskul-portal` | 🟡 | Registrasi publik (`signUp`) → setiap pendaftar menjadi user *authenticated* (memperbesar dampak P0.3) |
| CBT `/cbt` | 🔴 | Kunci jawaban & skor dapat dimanipulasi dari browser (P0.2); timer auto-submit rusak ✅ |

---

## 4. Temuan Detail

### P0 — Kritis

**P0.1 ✅ Endpoint `/api/create-user` tanpa autentikasi**
`api/create-user.ts` memakai *service role key* dan membuat user + peran apa pun (termasuk `super_admin`)
untuk **siapa saja** yang mengirim POST. Di Netlify (hosting utama) endpoint ini bahkan tidak ter-deploy,
sehingga tombol "Tambah Akun" di Pengaturan selalu gagal.
*Perbaikan:* handler bersama `server/create-user.ts` — verifikasi token Bearer, hanya `super_admin`/`ketua_yayasan`,
hanya `super_admin` yang boleh membuat `super_admin`, rollback akun bila peran gagal disimpan. Dipakai oleh
Vercel (`api/`), Netlify (`netlify/functions/create-user.ts` + redirect di `netlify.toml`), dan dev server.
Terverifikasi: permintaan tanpa/token palsu → HTTP 401.

**P0.2 ⚠️ CBT Rekrutmen: kunci jawaban terbuka & skor dihitung di browser**
- `CbtPortalTestRoom.tsx` mengambil seluruh `cbt_questions` termasuk `correct_option_id` ke browser peserta.
- Skor dihitung di klien lalu ditulis langsung ke `cbt_participants` → peserta bisa mengirim skor 100.
- `supabase/create_cbt_system.sql`: policy anon `SELECT USING (true)` pada peserta/soal/jawaban dan
  `UPDATE USING (true)` pada `cbt_participants` → siapa pun bisa membaca semua token & mengubah skor siapa pun.
- Token 6 karakter dari `Math.random()` (`CbtAttemptsList.tsx:63`).
*Perlu:* RPC `security definer` — `cbt_start(token)`, `cbt_get_questions(token)` (tanpa kunci),
`cbt_save_answer(token, q, opt)`, `cbt_submit(token)` (penilaian di server); cabut policy anon langsung;
token dari `gen_random_bytes`. ✅ Sudah diperbaiki di klien: auto-submit saat waktu habis sebelumnya memakai
jawaban basi (skor salah) dan memunculkan dialog konfirmasi yang bisa dibatalkan; jawaban >10 kini dimuat penuh.

**P0.3 ⚠️ Kebijakan RLS terlalu longgar**
118 policy di skrip SQL memakai `USING (true)` / `auth.uid() IS NOT NULL`. Karena orang tua SPMB dan
pendaftar ekskul dapat **mendaftar sendiri**, "authenticated" ≈ publik. Banyak tabel dibuat oleh skrip di
root `supabase/*.sql` (bukan `migrations/`), sehingga kondisi produksi tidak dapat direproduksi dari repo.
*Perlu:* jalankan di SQL Editor Supabase lalu perketat per tabel:
```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public'
  and (qual in ('true') or qual ilike '%auth.uid() IS NOT NULL%' or with_check = 'true')
order by tablename;
-- dan tabel tanpa RLS:
select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
```
Setelah itu pindahkan semua skrip root ke `supabase/migrations/` (baseline).

**P0.4 ✅ Guard Portal Admin SPMB fail-open**
`admin-spmb-layout.tsx`: `setAllowed(access.data !== false)` → jika RPC error (`data = null`) akses diberikan.
Kini `!access.error && access.data === true`.

**P0.5 ✅ Absensi Siswa hanya 10 siswa per kelas**
`useList` Refine default `pageSize = 10`. Halaman input absensi, rekap harian, detail kelas, dan 40+ dropdown/list
lain terpotong diam-diam. 46 panggilan diperbaiki (`pagination: { mode: "off" }`), audit log diberi paginasi server.
Input absensi kini juga hanya memuat siswa berstatus `active`.

### P1 — Tinggi

| # | Temuan | Lokasi | Status |
|---|---|---|---|
| P1.1 | **Menu Komunikasi palsu** — kirim = `setTimeout`, riwayat hardcode ("Tagihan SPP Juli", dst.), klaim "WhatsApp Official" | `communications/pages/communications.tsx` | Perlu keputusan: bangun (gateway WA) atau sembunyikan |
| P1.2 | **Dua sistem nilai terpisah**: Gradebook (`academic_grades`) vs Rapor Digital (`student_report_scores`). Guru input dua kali; portal ortu "Akademik" dan "Rapor" bisa berbeda | `academic/*`, `digital-reports/*` | Perlu integrasi (rapor menarik dari gradebook) |
| P1.3 | **PDF rapor**: 1 gambar di 1 halaman A4 (konten panjang terpotong), logo "LOGO", "( Nama Kepala Sekolah )", "NIP. -" | `digital-reports/pdf/*` | Perlu: multi-halaman + identitas dari Pengaturan |
| P1.4 | **Tidak ada otorisasi per-route**: menu disembunyikan, tapi URL langsung (mis. `/finance`, `/settings`) tetap terbuka untuk peran apa pun, termasuk akun orang tua yang login di `/login`. Hanya RLS yang melindungi | `App.tsx`, `auth-provider.ts check()` | Perlu `RequireResource` wrapper + tolak user tanpa peran admin |
| P1.5 | Filter kelas guru di Input Rapor tidak berfungsi: `roles[].class_id` tidak pernah ada → guru melihat semua kelas unit | `teacher-input/pages/list.tsx:20` | Perlu query `teacher_assignments` |
| P1.6 | `accessControlProvider.can()` memanggil `auth.getUser()` + query `user_roles` **setiap** pengecekan (tanpa cache) | `app/providers/accessControlProvider.ts` | Perlu cache per sesi |
| P1.7 ✅ | Error 403 (penolakan RLS satu request) membuat user **logout paksa** | `auth-provider.ts onError` | Kini hanya 401/JWT invalid |
| P1.8 ✅ | Log debug berisi peran user tercetak di console produksi | `auth-provider.ts getPermissions` | Dihapus |

### P2 — Sedang

| # | Temuan | Status |
|---|---|---|
| P2.1 ✅ | URL tidak dikenal → redirect ke `/login` (membingungkan, user login dilempar ke list siswa). Kini halaman 404 dengan tombol kembali ke portal yang sesuai | Selesai |
| P2.2 ✅ | Toast muncul ganda (dua `<Toaster>`: App + AdminLayout) | Selesai |
| P2.3 ✅ | Simpan Jurnal Tahsin / Ujian Jilid kembali ke halaman **Tahfidz** | Selesai |
| P2.4 ✅ | Definisi resource salah: `tahsin_records/assessments` → route Tahfidz; `quran_records` & `student_journals` punya route `show` yang tidak ada; `substitutes` ≠ nama izin `substitute_assignments` | Selesai |
| P2.5 | "Data Pendaftar" (SPMB) berada di grup **SDM & Kepegawaian** | Pindahkan ke grup SPMB |
| P2.6 | Menu Orang Tua, Layanan Ortu, Komunikasi memakai izin `students` → `admin_keuangan` ikut melihatnya; LMS memakai izin `subjects` → guru tidak melihat | Buat resource izin khusus |
| P2.7 | Halaman yatim tanpa menu: `/academic` (dashboard akademik), `/attendance/reports`, `/teachers/*` (legacy, digantikan Pegawai) | Tautkan atau hapus |
| P2.8 | 23 resource Refine tidak ada di peta izin (`parents`, `units`, `semesters`, `extracurriculars`, dll.) → `useCan` menolak semua non-super-admin | Lengkapi peta izin |
| P2.9 | Pemilihan pemilik dokumen masih "mock list" | `documents/pages/create.tsx:37` |
| P2.10 | Topbar lonceng hanya tautan, belum ada pusat notifikasi (belum dibaca, per peran) | Fitur baru |

### P3 — Rendah (kualitas & operasional)

1. **25 file duplikat `* (1).tsx`** (untracked, versi Juni — lebih lama dari aslinya). Aman dihapus setelah Anda konfirmasi.
2. `src/App.tsx` + `App.css` = boilerplate Vite tidak terpakai.
3. 19 skrip lepas di root (`scratch-delete*.js`, `reset-pw2.cjs`, `fix-admin.cjs`, …). `test-login.cjs` berisi
   kata sandi uji `sekolah123` ter-commit — **ganti kata sandi akun tersebut bila masih aktif**, pindahkan skrip ke `scripts/`.
4. **Bundle tunggal 7,3 MB** tanpa `React.lazy` — orang tua di HP yang membuka `/spmb` mengunduh seluruh admin panel.
5. ESLint: 1.196 `no-explicit-any`, 143 unused vars, 65 `set-state-in-effect`, 15 memoization dilewati React Compiler.
6. Tidak ada automated test (unit/e2e) maupun error monitoring (Sentry dsb.).
7. Tidak ada PWA/offline untuk absensi pegawai (geofence) di lapangan.

---

## 5. Fitur yang Belum Ada (Gap terhadap SIS Profesional)

| Area | Fitur | Dampak | Keterangan |
|---|---|---|---|
| Komunikasi | **Broadcast WhatsApp/Email nyata + log terkirim** (gateway: Fonnte/Wablas/Qontak/WA Cloud API) | Tinggi | Tagihan, absensi alpa, pengumuman |
| Komunikasi | **Notifikasi in-app** (tabel `notifications`, lonceng dengan badge, realtime) | Tinggi | |
| Keuangan | **Payment gateway / Virtual Account** + rekonsiliasi otomatis (Midtrans/Xendit/BSI VA) | Tinggi | Saat ini transfer manual + verifikasi |
| Keuangan | Reminder tagihan otomatis & dispensasi/cicilan | Sedang | |
| SDM | **Payroll / penggajian & slip gaji** (tunjangan, potongan absensi/lembur) | Tinggi | Data absensi & lembur sudah ada |
| SDM | Saldo cuti per pegawai, portal HRD untuk cuti & absensi | Sedang | |
| Kesiswaan | **BK & Tata Tertib**: poin pelanggaran/prestasi, konseling, surat panggilan | Tinggi | Saat ini hanya jurnal |
| Kesiswaan | UKS / rekam kesehatan & kunjungan | Sedang | Field kesehatan siswa sudah ada |
| Kesiswaan | Alumni & tracer study; mutasi masuk/keluar dengan surat | Sedang | Status `graduated/transferred` sudah ada |
| Kesiswaan | Presensi siswa via QR/kartu + notifikasi ortu | Sedang | |
| Akademik | **Ujian siswa (PTS/PAS) berbasis CBT** — CBT saat ini hanya rekrutmen | Tinggi | Setelah P0.2 diperbaiki |
| Akademik | Tugas/PR online + pengumpulan & penilaian (LMS reguler, bukan hanya HBL) | Sedang | |
| Akademik | Jadwal ujian & ruang, kartu ujian, daftar hadir ujian | Sedang | |
| Administrasi | **Ekspor/impor Dapodik**, buku induk siswa | Tinggi | Wajib pelaporan sekolah di Indonesia |
| Administrasi | Generator surat (keterangan aktif, SKL, sertifikat) dengan nomor surat otomatis & QR verifikasi | Sedang | |
| Administrasi | Buku tamu / visitor log | Rendah | |
| Perpustakaan | Sirkulasi buku fisik (peminjaman, denda, barcode) | Sedang | Saat ini hanya digital |
| Platform | 2FA untuk admin, manajemen sesi, kebijakan kata sandi seragam | Tinggi | Admin: min 6 char; pegawai: min 10 + kompleks |
| Platform | Dashboard eksekutif yayasan lintas unit (KPI keuangan, kehadiran, akademik) | Sedang | |
| Platform | Backup terjadwal & prosedur restore terdokumentasi | Tinggi | |

---

## 6. Roadmap Pengembangan yang Disarankan

**Fase 0 — Keamanan (1–2 minggu, wajib sebelum fitur baru)**
1. Audit & perketat RLS di produksi (query §P0.3); baseline semua skrip SQL root ke `migrations/`.
2. CBT server-side (RPC penilaian, cabut policy anon, token kriptografis).
3. Guard per-route (`RequireResource`) + tolak akun tanpa peran admin di `/`; cache izin.
4. Ganti kata sandi akun uji yang ter-commit; bersihkan skrip root & file "(1)".

**Fase 1 — Integritas data inti (2–4 minggu)**
5. Satukan Gradebook ↔ Rapor Digital (rapor menarik nilai gradebook, guru input sekali).
6. PDF rapor profesional: multi-halaman, kop/logo/kepsek/NIP dari Pengaturan, tanda tangan & QR verifikasi.
7. Perbaiki filter kelas guru di Input Rapor; lengkapi peta izin & rapikan menu (P2.5–P2.8).

**Fase 2 — Komunikasi & Keuangan (3–5 minggu)**
8. Modul Komunikasi nyata: gateway WA + email, template, antrean, log status terkirim/gagal.
9. Pusat notifikasi in-app (realtime) untuk semua portal.
10. Payment gateway/VA + rekonsiliasi otomatis + reminder tagihan.

**Fase 3 — Kelengkapan SIS (bertahap)**
11. BK & Tata Tertib, UKS, Alumni.  12. Payroll & slip gaji.  13. CBT ujian siswa (PTS/PAS).
14. Dapodik & buku induk, generator surat.  15. Sirkulasi perpustakaan fisik.

**Fase 4 — Kualitas platform (paralel)**
16. Code-splitting per portal (`React.lazy`) — target bundle awal < 1 MB.
17. Test e2e alur kritis (login tiap portal, absensi, SPMB, pembayaran) + Sentry.
18. PWA untuk absensi pegawai & portal orang tua.

---

## 7. Perubahan yang Sudah Dilakukan pada Sesi Ini

| File | Perubahan |
|---|---|
| `server/create-user.ts` (baru), `api/create-user.ts`, `netlify/functions/create-user.ts` (baru), `netlify.toml`, `vite.config.ts` | Endpoint buat-akun terautentikasi & berbasis peran; tersedia di Netlify, Vercel, dan dev |
| `src/modules/settings/pages/settings.tsx` | Kirim token sesi; pesan error bila layanan tidak tersedia; petunjuk sandi min. 8 |
| `src/modules/admin-spmb-portal/admin-spmb-layout.tsx` | Guard fail-closed |
| `src/modules/cbt-portal/CbtPortalTestRoom.tsx` | Auto-submit waktu habis memakai jawaban terbaru, tanpa dialog, anti submit ganda; muat semua jawaban |
| `src/lib/supabase/auth-provider.ts` | Tidak logout pada 403; hapus log debug peran |
| 24 file modul (absensi, kelas, ekskul, sarpras, rekrutmen, siswa, ortu, guru, Qur'an, tugas, pengumuman, komunikasi) | 46 `useList` tidak lagi terpotong 10 data; absensi hanya siswa aktif |
| `src/modules/audit-logs/pages/list.tsx` | Paginasi server 50/halaman + navigasi |
| `src/modules/quran/tahsin/TahsinRecordForm.tsx`, `TahsinAssessmentForm.tsx` | Kembali ke halaman Tahsin setelah simpan |
| `src/app/App.tsx` | Definisi resource diperbaiki; route 404 baru |
| `src/components/common/NotFoundPage.tsx` (baru) | Halaman 404 kontekstual per portal |
| `src/components/layout/AdminLayout.tsx` | Hapus `<Toaster>` ganda |

Verifikasi: `npm run build` lulus; ESLint tidak menambah isu baru pada file yang diubah; uji browser 404 dan
uji `curl` endpoint (401 tanpa token / token tidak valid).

---

## 8. Pembaruan — Fase 0 & Fase 1 Dikerjakan

| Temuan | Status | Implementasi |
|---|---|---|
| P0.2 CBT kunci jawaban & skor | ✅ kode siap · ⏳ migrasi perlu diterapkan | `supabase/migrations/20260930090000_cbt_secure_exam_rpc.sql`: semua policy anon/`auth.uid() IS NOT NULL` dicabut, tabel CBT hanya untuk pengelola rekrutmen, RPC `cbt_session` / `cbt_save_answer` / `cbt_submit` (soal tanpa kunci, set soal dibekukan per peserta, batas waktu & penilaian di server), token acak 10 hex. Ruang ujian (`CbtPortalTestRoom.tsx`) ditulis ulang memakai RPC; token admin memakai `crypto.getRandomValues`. Bug tambahan diperbaiki: `question_count = 0` kini berarti "semua soal" (sebelumnya 0 soal). Diuji dengan 21 skenario di Postgres lokal (PGlite). |
| P1.1 Komunikasi palsu | ✅ | Broadcast kini benar-benar diterbitkan sebagai pengumuman (status `terkirim`) ke portal orang tua per kelas / semua orang tua / guru & staf; riwayat diambil dari data nyata; kartu "Saluran" jujur: WhatsApp "Belum terhubung". Izin menu → `announcements`. |
| P1.2 Gradebook ↔ Rapor terpisah | ✅ kode siap · ⏳ migrasi | `20260930100000_report_items_gradebook_link.sql` menambah `report_template_items.subject_id`. Editor template: pilihan "Sumber nilai: Gradebook: <mapel>". Input rapor guru: tombol **Tarik nilai Gradebook (n)** + saran per item, memakai bobot kurikulum yang sama dengan Gradebook. |
| (baru) Rubrik/checklist rapor tidak tersimpan | ✅ | Klik rubrik/checklist memakai `setTimeout` + state basi → nilai pertama tidak pernah tersimpan; error update diabaikan. Kini disimpan langsung dengan nilai baru, error ditampilkan. |
| P1.3 PDF rapor | ✅ | Multi-halaman A4 dengan pemotongan di batas baris tabel (uji: 150 baris → 6 halaman). Kop dari unit (nama, alamat, telepon, email) + logo Pengaturan; nama kepala sekolah (`units.principal_employee_id`) & wali kelas; semester & tahun pelajaran (sebelumnya UUID mentah / selalu "-"); tanggal dari tanggal publish periode. Data fiktif ("Kota Cerdas", "Jl. Pendidikan No. 123", NIP "-") dihapus. |
| P1.4 Tanpa otorisasi per-route | ✅ | `AdminPanelGate` menolak akun tanpa peran staf (orang tua, pendaftar SPMB/ekskul) dari panel admin; `AdminRouteGuard` menerapkan aturan izin menu ke setiap URL (halaman 403). Pemetaan path→izin di `src/config/route-access.ts`. |
| P1.5 Filter kelas guru | ✅ | Guru hanya melihat kelas dari penugasan mengajar + kelas perwalian; pimpinan tetap melihat semua. |
| P1.6 Izin tanpa cache | ✅ | Cache 60 detik per pengguna, di-reset saat status login berubah. |
| (baru) **Semua dropdown `useSelect` hanya 10 opsi** | ✅ | Default Refine 10 baris memotong 98 dropdown (kelas, siswa, pegawai, unit, halaqoh…). Diperbaiki terpusat di `src/lib/refine-compat.ts`. |
| P2.5 Menu "Data Pendaftar" | ✅ | Dipindah ke grup SPMB. |
| P2.8 Resource tanpa izin | ✅ | Ditambahkan: `parents`, `units`, `academic_years`, `semesters`, `student_academic_history`, `curriculum_documents`, `extracurricular*`, `recruitment`. |

### Langkah deploy (urutan penting)

1. **Terapkan migrasi dulu** ke Supabase (SQL Editor atau `supabase db push`):
   `20260930090000_cbt_secure_exam_rpc.sql`, lalu `20260930100000_report_items_gradebook_link.sql`.
   Ruang ujian CBT versi baru memanggil RPC dan editor template menulis kolom `subject_id` — keduanya gagal bila frontend dideploy sebelum migrasi.
2. Deploy frontend (Netlify). Pastikan env `SUPABASE_SERVICE_ROLE_KEY` & `VITE_SUPABASE_URL` tersedia untuk fungsi `create-user`.
3. Uji manual dengan akun sungguhan (belum dapat diuji otomatis karena butuh login):
   - Guru: buka `/finance` → harus 403; Input Rapor hanya menampilkan kelasnya.
   - Akun orang tua login di `/login` → layar "tidak memiliki akses panel admin".
   - CBT: daftarkan peserta, kerjakan ujian, biarkan waktu habis → skor tercatat di "Hasil Ujian".
   - Template rapor: tautkan item numerik ke mapel → di Input Rapor muncul "Tarik nilai Gradebook".
   - Generate PDF rapor untuk siswa dengan banyak item → beberapa halaman, kop & nama pejabat benar (isi `principal_employee_id` di Data Induk → Unit bila masih kosong).

### Masih terbuka
- **P0.3 audit RLS produksi** — butuh menjalankan query §P0.3 di Supabase; hasilnya menentukan migrasi pengetatan per tabel.
- 25 file `* (1).tsx` & skrip root — menunggu konfirmasi penghapusan.
- Fase 2–4 roadmap (gateway WhatsApp, notifikasi in-app, payment gateway, payroll, BK, CBT siswa, Dapodik, code-splitting, test e2e).

---

## 9. Fase 2 — Notifikasi Email (Mailketing, pengganti WhatsApp)

**Arsitektur**
- `supabase/functions/notify-email` — Edge Function baru. Klien hanya mengirim *jenis event* + *ID data*; **penerima selalu ditentukan di server** (orang tua via `student_parent_links` → `parents.email`, fallback email akun; pegawai via `employees.email`). Tidak bisa dipakai sebagai open relay.
- Izin per event: pengumuman (peran pengumuman), rapor terbit (pimpinan/admin akademik), pembayaran (keuangan + bendahara berdasarkan jabatan).
- `email_messages` (migrasi `20260930110000_email_outbox.sql`) — outbox + log per penerima; unik per (event, sumber, penerima) sehingga klik berulang tidak mengirim ganda; baris "diklaim" sebelum dikirim agar dua proses paralel tidak mengirim email yang sama; kirim ulang otomatis hanya untuk yang gagal/antre (maks. 5 percobaan).
- Kesalahan Mailketing diklasifikasi: 402 kredit habis / 403 domain pengirim belum terverifikasi / 422 validasi → tidak diulang otomatis; 429 / 5xx / jaringan → layak diulang.
- Template email responsif (tabel, aman untuk Gmail/Outlook), teks staf di-escape (anti-XSS), tombol menuju portal yang sesuai.

**Integrasi**
| Titik | Perilaku |
|---|---|
| Komunikasi | Opsi "Kirim juga via email" (default aktif); riwayat menampilkan jumlah terkirim/gagal/antre per pesan + tombol kirim ulang. |
| Publish Rapor | Setelah publish, orang tua otomatis menerima email "Rapor … telah terbit" dengan tautan langsung ke rapor di portal. |
| Verifikasi Pembayaran (admin & Portal Bendahara) | Setelah disetujui, orang tua menerima konfirmasi berisi rincian dan sisa tagihan. |
| Log Email (menu baru, Sistem & Laporan) | Status per penerima, filter jenis/status, cari alamat, kirim ulang. |

**Pengujian**: migrasi outbox (6 skenario RLS/keunikan) dan modul inti (15 skenario: kontrak API Mailketing, klasifikasi error, escape HTML, dedupe, konkurensi) lulus di lingkungan lokal; edge function lolos type-check strict. Tidak ada email sungguhan yang dikirim selama pengujian.

**Langkah aktivasi**
1. Terapkan migrasi `20260930110000_email_outbox.sql` (bersama dua migrasi sebelumnya).
2. Setel secret (jangan disimpan di repo/`.env` frontend):
   ```
   supabase secrets set MAILKETING_API_TOKEN=<token>
   supabase secrets set MAILKETING_FROM_EMAIL=no-reply@yts.web.id
   supabase secrets set MAILKETING_FROM_NAME="TS Lab School"
   supabase secrets set PUBLIC_APP_URL=https://<domain-aplikasi>
   ```
3. `supabase functions deploy notify-email`
4. Pastikan domain `yts.web.id` berstatus terverifikasi di Mailketing (jika tidak, API membalas 403 "Unknown sender domain").
5. Uji: kirim broadcast ke satu kelas kecil → periksa Log Email.

---

## 10. Status Produksi (Supabase `ebdkupeqmpqrdfketgab`) — 30 Sep 2026

### Sudah diterapkan ke produksi & terverifikasi
| Perubahan | Verifikasi |
|---|---|
| `20260930090000_cbt_secure_exam_rpc` | Anonim: baca soal/token → 0 baris; ubah skor → 0 baris; `cbt_finalize` → *permission denied*; `cbt_session` token salah → `null` |
| `20260930100000_report_items_gradebook_link` | Kolom `report_template_items.subject_id` ada |
| `20260930110000_email_outbox` | Tabel `email_messages` ber-RLS; anonim tidak dapat membaca |
| `20260930120000_close_anonymous_exposure` (darurat) | Data **41 pelamar kerja** sebelumnya terbaca publik → kini 0; tulis anonim ke `rooms` ditolak |
| Edge Function `notify-email` & `send-email` | Aktif; tanpa sesi → 401. (`send-email` sebelumnya **tidak pernah ter-deploy**, sehingga email konfirmasi SPMB/ekskul selalu gagal.) Perbaikan boot: impor `edge-runtime.d.ts` dihapus. |

Keempat migrasi dicatat di riwayat (`migration repair`), jadi tidak akan dijalankan ulang.

### Menunggu persetujuan Anda (penerapan diblokir pengaman izin sesi)
1. **`20260930130000_restrict_authenticated_access.sql`** — menutup 88 kebijakan longgar untuk pengguna login (orang tua/pendaftar dapat membuat akun sendiri). Termasuk: orang tua dapat **mengubah nilai rapor**, **mengubah rekening bank sekolah di Pengaturan**, membaca & mengubah **data pendaftar SPMB keluarga lain**, membaca **jurnal internal/kasus** siswa lain. Sudah diuji di produksi dalam transaksi yang dibatalkan dengan akun nyata orang tua, guru, super admin, admin keuangan — semua skenario lolos. Snapshot pemulihan: `supabase/rls-snapshot-before-20260930130000.sql`.
2. **`20260930140000_in_app_notifications.sql`** — pusat notifikasi (lonceng). Diuji 16 skenario di Postgres lokal. Frontend sudah aman dideploy lebih dulu (lonceng otomatis kembali ke tautan pengumuman bila tabel belum ada).

Cara menerapkan (per file, lalu catat riwayat):
```
npx supabase db query --linked -f supabase/migrations/20260930130000_restrict_authenticated_access.sql
npx supabase migration repair --linked --status applied 20260930130000
```

### ⚠️ Drift skema: jangan jalankan `supabase db push`
52 migrasi lama tidak tercatat di riwayat produksi. Probe objek per migrasi menunjukkan sebagian besar sudah ada (diterapkan manual), tetapi berikut **belum/partial** — dan fitur yang memakainya kemungkinan error di produksi saat ini:

| Migrasi | Objek ada | Dampak di aplikasi |
|---|---|---|
| 20260715010000 finance multi-unit programs | 0/26 | Master Tarif & Program, tagihan per program |
| 20260715040000 teacher portal quality | 12/34 | Kebijakan guru (tertutup sementara oleh kebijakan longgar) |
| 20260715060000 curriculum semester quality | 11/15 | **Gradebook "Simpan Nilai" gagal** (kolom `subject_curriculum_semester_id` tidak ada); halaman Akademik portal orang tua gagal memuat |
| 20260715090000 sarpras quality | 2/56 | Peminjaman aset, disposal, stok opname |
| 20260715110000 reports quality | 0/5 | Riwayat ekspor laporan |
| 20260716080000 onboarding quality | 0/21 | Panduan & onboarding portal |
| 20260716090000 digital library quality | 2/29 | Perpustakaan digital (audiens, jenjang) |
| 20260716100000 master data quality | 1/23 | Data Induk unit (alamat, kepala sekolah) → kop rapor memakai data minimum |
| 20260726000000 paud quality | 2/23 | Jurnal observasi PAUD |
| 20260716110000, 20260811090000, 20260821080000, 20260902090000, 20260715100000 | hampir lengkap | 1–5 kebijakan/fungsi tidak ada |

Rekomendasi: rekonsiliasi terkontrol per migrasi (uji di branch/dry-run seperti di atas → terapkan → `migration repair`), dimulai dari 20260715060000 (Gradebook) dan 20260715010000 (keuangan).

### Pembaruan (setelah persetujuan)
Diterapkan & tercatat tambahan:
| Migrasi | Hasil verifikasi |
|---|---|
| `20260930130000_restrict_authenticated_access` | Uji persona di kondisi produksi: orang tua tidak dapat mengubah nilai/rapor/pengaturan/mapel, tidak melihat pelamar & izin pegawai; guru tetap dapat input nilai & jurnal; admin keuangan hanya mengubah kunci `finance_*`. Tersisa 4 kebijakan tulis longgar yang disengaja (keanggotaan ekskul, log audit). |
| `20260930140000_in_app_notifications` | Dry-run: pengumuman staf → 20 pegawai, pengumuman orang tua → 5 akun orang tua, penugasan → 1; realtime aktif; anonim tidak dapat membaca/menyisipkan. |
| `20260715060000` (bagian yang hilang) | 15/15 objek. **Gradebook "Simpan Nilai"**, halaman Akademik portal orang tua, dan **pembuatan periode rapor** (kolom `assessment_basis`) pulih. |
| `20260715010000_finance_multi_unit_programs` | 26/26 objek. Visibilitas tagihan/pembayaran/kategori/siswa identik sebelum-sesudah untuk admin keuangan, super admin, bendahara, dan orang tua. |

### Sisa (ditolak pengaman izin — jalankan sendiri)
Enam migrasi berikut sudah lolos dry-run di produksi (tanpa error; tanpa DROP/DELETE; tanpa kebijakan longgar; satu backfill idempoten tiket pemeliharaan dari laporan kerusakan fasilitas):
`20260715110000` (riwayat ekspor laporan), `20260716080000` (onboarding), `20260715090000` (sarpras), `20260716090000` (perpustakaan), `20260716100000` (data induk unit — juga mengaktifkan kop rapor lengkap & nama kepala sekolah), `20260726000000` (PAUD).

Jalankan satu per satu (urutan di atas), masing-masing lalu dicatat:
```
npx supabase db query --linked -f supabase/migrations/<file>.sql
npx supabase migration repair --linked --status applied <versi>
```
Setelahnya, ~35 migrasi lama lain yang **sudah lengkap di skema** (hasil probe "APPLIED") cukup dicatat dengan `migration repair --status applied`, dan 5 migrasi "hampir lengkap" (20260716110000, 20260811090000, 20260821080000, 20260902090000, 20260715100000, 20260715040000) perlu diambil bagian yang hilangnya saja seperti 20260715060000.

### Pembaruan akhir
Enam migrasi di atas (`20260715110000`, `20260716080000`, `20260715090000`, `20260716090000`, `20260716100000`, `20260726000000`) **sudah diterapkan dan dicatat** setelah persetujuan. Probe objek: semuanya lengkap (onboarding 21/21 termasuk 3 kebijakan `storage.objects`). Tidak ada kebijakan tulis longgar baru (tetap 4 yang disengaja).

Sisa rekonsiliasi: ~35 migrasi lama yang sudah lengkap di skema cukup dicatat (`migration repair --status applied`), dan 6 migrasi "hampir lengkap" dilengkapi per bagian.

### Rekonsiliasi drift selesai
- 40 migrasi yang efeknya sudah ada di skema (37 terverifikasi objek-per-objek, 3 berupa constraint/RLS yang dicek langsung) dicatat dengan `migration repair` tanpa menjalankan SQL.
- 4 migrasi parsial dilengkapi dengan **hanya** pernyataan yang hilang (bukan menjalankan ulang file, agar fungsi helper yang sudah diperbarui migrasi berikutnya tidak tertimpa):
  - `20260715040000` — 22 kebijakan guru (nilai, absensi kelas, jurnal, rapor, PKG) → 34/34
  - `20260716110000` — trigger riwayat status awal pendaftar SPMB + 2 kebijakan keuangan SPMB (sebelumnya gagal karena fungsi `finance_can_access_unit` belum ada) → 51/51
  - `20260821080000`, `20260902090000` — kebijakan orang tua membaca materi & pertemuan HBL → lengkap
- Hasil: riwayat migrasi produksi **99/99 sinkron**, `supabase db push` kembali aman dipakai. Kebijakan tulis longgar: 4 (disengaja). Uji persona: 21/21 lolos.

---

## 11. Lanjutan (1 Okt 2026)

**Code-splitting** — 285 halaman dimuat per rute (`lazyPage`, dengan muat-ulang otomatis bila chunk lama hilang setelah deploy). Muatan awal turun dari ±7,3 MB ke ±0,9 MB; ExcelJS/grafik hanya diunduh saat halamannya dibuka. File duplikat `* (1).tsx` dihapus (cadangan: `artifacts/duplikat-(1)-arsip-2026-09-30.zip`).

**Bug akses orang tua (diperbaiki di produksi, `20261001080000`)** — `is_parent_of_student` membandingkan `parents.id` dengan `auth.uid()` sehingga selalu *false*; 9 kebijakan (rapor terbit, nilai rapor, catatan, PDF, tanda terima, nilai, jurnal) tidak pernah berlaku untuk orang tua dan sebelumnya tertutupi kebijakan longgar. Kini memeriksa `parents.user_id`, status aktif, dan izin portal pada tautan. Tanda terima rapor sekarang menyimpan `parents.id` (sebelumnya ID akun → melanggar FK). Halaman staf "Tanda Terima" memakai embed ambigu `parents(profiles(...))` yang ditolak PostgREST (`PGRST201`) — diperbaiki.

**Fitur baru: BK & Tata Tertib (`20261001090000`)**
- Katalog poin pelanggaran/prestasi (15 aturan awal, dapat diubah pengelola BK).
- Catatan kejadian: semua staf dapat melapor; kelas/unit/tahun ajaran & pelapor tersnapshot otomatis; pelapor atau pengelola BK dapat menindaklanjuti; pilihan dibagikan ke orang tua atau internal.
- Rekap poin bersih per siswa dengan tangga pembinaan (25/50/75/100).
- Sesi konseling rahasia — hanya pengelola BK & pimpinan.
- Portal guru: menu **Tata Tertib & Prestasi** (lapor untuk kelas yang diajar/diwalikan). Portal orang tua: menu **Sikap & Prestasi** + notifikasi saat catatan dibagikan.
- Diuji 16 skenario (PGlite) dan dry-run produksi dengan akun nyata guru & orang tua.

Riwayat migrasi produksi: 101/101 sinkron. Uji persona: 21/21.

**Fitur baru: CBT Ujian Siswa (`20261002090000`)** — memakai mesin CBT aman yang sama dengan rekrutmen.
- Bank soal & ujian dibedakan per audiens (`recruitment` khusus HRD, `student` dikelola staf/guru); bank rekrutmen tidak bisa dipasang ke ujian siswa.
- Ujian siswa: mapel, semester, jenis penilaian (formatif/STS/SAS/ASAT), durasi, KKM, jendela buka–tutup, acak soal, tampilkan nilai (opsional).
- Daftarkan satu kelas sekaligus (token acak per siswa), cetak kartu token, rekap hasil (tuntas & rata-rata).
- Nilai dihitung di server dan otomatis ditulis ke Gradebook (`academic_grades`, komponen sesuai jenis penilaian), plus tombol kirim ulang.
- Menu: panel admin **Ujian CBT Siswa** (`/academic/cbt`) dan portal guru **Ujian CBT** (kelas dibatasi ke kelas yang diajar/diwalikan). Ruang ujian menampilkan status belum dibuka/ditutup dan nilai bila diizinkan.
- Diuji 20 skenario (PGlite, termasuk regresi CBT rekrutmen) dan dry-run produksi end-to-end (guru → 17 siswa terdaftar → skor 100 → baris Gradebook). Riwayat migrasi 102/102 sinkron.

**Fitur baru: Data Dapodik (`20261003090000`)**
- Kolom data pokok peserta didik (NIK, No. KK, agama, rincian alamat, jenis tinggal, transportasi, data periodik, registrasi, KIP), orang tua (tahun lahir, penghasilan), dan PTK (NUPTK, NIP, tempat lahir, agama, NIK KTP). NIK KTP pegawai disimpan di `national_id` karena `employees.nik` dipakai sebagai ID login portal (seluruh 20 pegawai memakai format non-KTP).
- Menu **Data Dapodik**: skor kelengkapan per siswa & PTK, formulir melengkapi (termasuk membuat & menautkan data ayah/ibu), ekspor Excel (sheet Peserta Didik 45 kolom, PTK, Rombel, Validasi; nomor identitas sebagai teks).

**Fitur baru: Penggajian (`20261003100000`)**
- Komponen gaji dapat dikonfigurasi (tetap, per hari hadir, per menit terlambat, per hari tidak hadir, per jam lembur berkompensasi dibayar, persen gaji pokok; awal: gaji pokok, tunjangan jabatan/transport/makan, lembur, potongan telat/alpa, BPJS Kesehatan 1% & JHT 2%) dan gaji per pegawai.
- Periode gaji bulanan per unit: Hitung (server, dari absensi/izin/lembur) → Setujui (slip dirilis ke portal) → Dibayar; buka kembali; ekspor Excel rekap.
- Slip gaji di portal guru & staf (cetak); menu Penggajian di panel admin & portal HRD. Data gaji hanya untuk super admin, ketua yayasan, HRD, admin keuangan, kepala TU.
- Diuji 20 skenario (PGlite, termasuk perhitungan angka) — menemukan & memperbaiki rekursi kebijakan RLS sebelum produksi — dan dry-run produksi dengan data absensi nyata (20 slip).

Riwayat migrasi: 104/104 sinkron. Uji persona: 21/21.

## 12. Modul PAUD/TK — Kurikulum Merdeka & Preschool HBL (4 Okt 2026)

**Masalah yang ditemukan**
- Halaman PAUD (Pusat PAUD, Jurnal Observasi, Asesmen) menyaring kelas/siswa hanya dengan unit aktif; saat unit aktif kosong/lintas unit, kelas dan siswa **SD/Elementary** ikut tampil.
- Unit **TSLS Preschool HBL** tidak memiliki jenjang (`education_level` kosong) sehingga tidak dikenali sebagai PAUD di beberapa layar.
- Asesmen hanya satu jenis (STPPA enam aspek) tanpa siklus **asesmen awal–tengah–akhir** per semester; belum memakai tiga elemen Capaian Pembelajaran Fase Fondasi.
- Profil siswa menampilkan kolom STPPA yang tidak ada (`agama_moral`, `narrative_report`) dan hanya muncul bila nama unit memuat "paud" (unit "TSLS Preschool" tidak pernah cocok).
- Guru hanya bisa melihat asesmen yang ia tulis sendiri (tidak mendukung team teaching); orang tua hanya melihat laporan terbaru semester aktif.

**Migrasi `20261004090000_paud_kurmer_assessment`**
- `units.delivery_mode` (`reguler`/`online`); unit Preschool HBL → jenjang `preschool`, layanan `online`. Fungsi `is_paud_unit()`.
- `paud_stppa_assessments`: `phase` (awal/tengah/akhir, unik per anak-semester-fase), `learning_mode`, elemen CP `nab_*`, `jati_diri_*`, `steam_*` (skala BB/MB/BSH/BSB + deskripsi), P5 (tema & deskripsi), rekap kehadiran, catatan guru, tanggapan orang tua, `published_at`.
- `paud_activities`: `learning_mode`, `evidence_source` (observasi kelas, live meet, tugas rumah, laporan orang tua, karya, projek), `cp_elements`.
- Kebijakan guru: semua guru yang mengakses kelas (wali, jadwal, penugasan) mengelola catatan PAUD kelas tersebut.
- Notifikasi in-app ke orang tua saat asesmen terbit; RPC `paud_submit_parent_reflection` (hanya orang tua anak tsb., hanya laporan terbit) + notifikasi ke guru. Tanggapan orang tua tidak dapat ditimpa staf.

**Aplikasi**
- Lingkup PAUD bersama (`usePaudScope`): hanya unit Preschool (reguler & HBL), filter **Semua / Reguler / Online (HBL)**; data SD tidak lagi tampil.
- **Asesmen Awal, Tengah & Akhir**: matriks anak × fase dengan status dan capaian per elemen; editor per anak dengan panel bukti (jurnal observasi, observasi & portofolio HBL), perbandingan fase sebelumnya, rincian 6 aspek STPPA (opsional), P5, isi kehadiran otomatis dari presensi, pertumbuhan, terbit/tarik ke draf, cetak **Laporan Perkembangan Anak**.
- Jurnal observasi: sumber bukti sesuai mode belajar dan elemen CP; foto memakai penyimpanan aman.
- Portal guru: asesmen per fase untuk kelas yang diampu (reguler & HBL) dengan editor yang sama.
- Portal orang tua (menu KB/TK, kini juga untuk anak HBL): pilih semester, tab fase, grafik perjalanan capaian awal→akhir, deskripsi elemen, P5, kehadiran, pertumbuhan, linimasa bukti belajar (termasuk HBL), kirim tanggapan, cetak laporan.
- Master Data unit: pilihan **Layanan belajar** (Reguler / Online HBL). Profil siswa: ringkasan asesmen PAUD yang benar.

**Verifikasi**: dry-run produksi (trigger learning mode HBL, `published_at`, notifikasi, blokir duplikat fase, akses orang tua hanya laporan terbit, tanggapan tidak dapat diubah langsung, akses wali kelas), validasi seluruh query PostgREST ke skema produksi, uji render portal orang tua & editor asesmen dengan data contoh, `tsc`, `eslint`, `npm run build`.
