# Insiden login guru dan staf — 1 Oktober 2026

## Penyebab terkonfirmasi

Diagnosis baca-saja pada Supabase produksi mereproduksi `PGRST201` untuk
`employees.select("id,units(name)")`. Ada dua relasi yang sah:

- `employees_unit_id_fkey`: unit kerja pegawai (`employees.unit_id → units.id`).
- `units_principal_employee_id_fkey`: unit yang dipimpin pegawai (`units.principal_employee_id → employees.id`).

Relasi kedua ditambahkan oleh migrasi master-data. Karena nama tabel saja tidak
lagi menentukan relasi tunggal, pembacaan profil lama gagal. Layout guru/staf
kemudian memanggil `signOut()`, setelah form login sempat menampilkan sukses.
Ini bukan bukti bahwa kata sandi salah.

## Perbaikan

- Login dan layout staf, guru, HRD, dan bendahara menggunakan pemeriksaan yang sama.
- Profil untuk otorisasi dibaca tanpa embedded join unit. Nama unit bersifat opsional.
- Query profil, direktori pegawai/guru, HRD, PKG, Dapodik, payroll, cuti, shift,
  lembur, koreksi absensi, kegiatan, dan rekap absensi menyebut
  `units!employees_unit_id_fkey(name)` secara eksplisit bila mengambil unit pegawai.
- Gangguan profil/peran tidak menghapus sesi. Halaman tidak menampilkan data
  terlindungi sebelum pemeriksaan akses berhasil; tersedia pesan dan retry.
- Pemeriksaan penugasan tetap berlaku. Pegawai nonaktif tidak memperoleh akses.
- Kegagalan badge/ringkasan tambahan tidak membatalkan akses portal yang sudah sah.
- Alur orang tua, panitia SPMB, SPMB, dan ekskul juga membedakan gangguan pembacaan
  sesi/peran dari akun yang tidak memiliki kewenangan.

Tidak memerlukan migrasi baru, perubahan kata sandi, penghapusan constraint, atau
pelonggaran RLS. Perubahan frontend harus di-deploy sebelum berlaku di website live.

## Verifikasi dan batasnya

- 35 uji regresi: `node --test scripts/employee-portal-access.test.mjs`.
- TypeScript dan build produksi berhasil.
- Diagnosis produksi: 20 pegawai aktif, semua memiliki `user_id`, tidak ada tautan
  akun aktif ganda. Data pribadi dan kredensial tidak ditampilkan.
- Tujuh kueri relasi yang diperbaiki berhasil pada schema produksi: employees,
  employee_attendance, leave_requests, attendance_correction_requests,
  employee_overtime, attendance_shift_assignments, attendance_events.
- Diagnosis server menggunakan akun administratif; ini **bukan** uji RLS atau
  login browser sebagai setiap guru/staf. Uji pengguna setelah deploy masih perlu.
- Endpoint administratif daftar akun Auth mengembalikan HTTP 500, sehingga
  kecocokan email pegawai dengan email akun Auth belum dapat diverifikasi. Ini
  temuan terpisah, belum diperbaiki; perlu log Supabase Auth sebelum tindakan DB.
- Lint seluruh repo masih gagal pada banyak masalah di luar perbaikan login.
  File alur login/layout yang diperbaiki lolos pemeriksaan lint terarah.

Diagnosis ulang (baca-saja, gunakan lingkungan server yang aman):

```powershell
node --env-file=.env scripts/check-employee-portal.mjs
```

Jangan menyalin service-role key ke browser, frontend, atau dokumen ini.
