# Navigasi admin

Sidebar menjadi pemilih modul: hanya satu kelompok terbuka sekaligus. Beranda
menampilkan pintasan favorit, menu terbaru, dan direktori modul. Pencarian
lintas menu dibuka dengan tombol pencarian atau Ctrl+K / Cmd+K; panah memilih,
Enter membuka, Escape menutup. Klik bintang untuk menambah/melepas favorit.

## Pengembangan menu

Tambahkan tujuan baru di `src/config/navigation.ts` beserta resource/peran,
kata kunci, dan prioritas mobile bila diperlukan. Sidebar, pencarian, direktori,
dan pintasan memakai sumber dan filter hak akses yang sama. Nama singkat,
deskripsi, dan ikon modul ada di `src/config/navigation-module-meta.ts`;
modul baru tetap tampil dengan fallback tanpa metadata tambahan.

## Privasi dan ketahanan

- Favorit (maksimal 12) dan riwayat menu (maksimal 8) disimpan per ID akun,
  hanya di browser ini. Tidak menyimpan data siswa/pegawai atau kredensial.
- Data preferensi bukan otorisasi. Menu tetap difilter berdasarkan peran/unit;
  route guard dan RLS tidak diubah atau dilewati.
- JSON rusak, rute asing, dan penyimpanan yang ditolak tidak merusak halaman.
  Jika storage tidak tersedia, preferensi berlaku dalam sesi saja.
- Drawer mobile membatasi fokus keyboard, menonaktifkan interaksi latar,
  mengembalikan fokus saat ditutup, dan menutup setelah navigasi pencarian.
- Grid beranda mengikuti lebar konten, bukan hanya lebar viewport: tetap nyaman
  pada tablet dengan sidebar terbuka. Warna/font sekolah tetap diwarisi.
- Portal orang tua, SPMB, pengajar, staf, HRD, dan bendahara tidak memakai layout
  admin ini. Tidak ada perubahan autentikasi atau migrasi database.

## Verifikasi lokal

```sh
node --test scripts/admin-navigation.test.mjs scripts/employee-portal-access.test.mjs
npm run build
```

Pengujian mencakup seluruh peran admin, 100 tujuan menu, filter unit PAUD,
pencarian, rute bertingkat, batas preferensi, isolasi akun, dan storage gagal.
Fixture UI: `http://127.0.0.1:5173/dev/navigation-preview.html` setelah `npm run dev`.
Fixture menggunakan komponen asli dengan peran/data uji, MemoryRouter, dan key
preferensi `preview-only-*`. Bukan halaman login dan bukan route produksi;
tidak disertakan dalam output `vite build`. Pemeriksaan browser fixture tidak
menggantikan uji akun admin nyata pada aplikasi yang sudah di-deploy.
