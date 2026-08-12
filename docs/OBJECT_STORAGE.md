# Contabo Object Storage

Aplikasi menyimpan upload baru di bucket privat Contabo melalui presigned URL. Secret key hanya digunakan oleh fungsi server dan tidak pernah dikirim ke bundle browser.

## Environment server

Tambahkan variabel berikut pada environment development, preview, dan production di Vercel atau Netlify:

```env
S3_ENDPOINT=https://sin1.contabostorage.com
S3_REGION=default
S3_BUCKET=tsls
S3_ACCESS_KEY_ID=<access-key-yang-aktif>
S3_SECRET_ACCESS_KEY=<secret-key-yang-aktif>
S3_MAX_FILE_SIZE_BYTES=52428800
```

Variabel autentikasi server berikut juga wajib tersedia:

```env
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Jangan memakai awalan `VITE_` pada credential S3. Vite memasukkan setiap variabel `VITE_*` ke JavaScript browser.

## Endpoint aplikasi

- Vercel: `api/storage.ts`
- Netlify: `netlify/functions/storage.ts`, diteruskan dari `/api/storage`
- Development lokal: middleware `/api/storage` di `vite.config.ts`

Endpoint memverifikasi token Supabase dan hak akses pengguna sebelum menerbitkan URL upload atau download selama lima menit.

## Struktur object key

Upload ditempatkan menurut domain aplikasi, misalnya:

- `admissions/<applicant-id>/documents/...`
- `students/photos/...`
- `employees/photos/...`
- `finance/<student-id>/payment-proofs/...`
- `digital-library/books/...`
- `onboarding/<unit-id>/...`
- `paud/activities/<student-id>/...`
- `reports/pdfs/...`

Database menyimpan referensi privat dalam format `s3://tsls/<object-key>`. File lama yang tersimpan di Supabase Storage tetap dapat dibuka melalui fallback kompatibilitas.

## Verifikasi

Setelah environment lokal tersedia, jalankan:

```bash
npm run storage:check
```

Perintah ini memeriksa bucket, menerapkan CORS dari `S3_ALLOWED_ORIGINS`, menguji presigned upload dan download, lalu menghapus file uji.

Untuk production TSLS, CORS yang digunakan saat integrasi dibuat adalah:

```env
S3_ALLOWED_ORIGINS=https://dashboard-operasional-sekolah.vercel.app,http://localhost:5173,http://127.0.0.1:5173
```

Jangan gunakan wildcard `*` untuk bucket yang memuat data sekolah.

## Rotasi credential

Credential yang pernah dibagikan lewat chat atau kanal lain harus dianggap terekspos. Buat credential S3 baru di Contabo, ganti nilai di `.env.local` dan environment deployment, verifikasi dengan `npm run storage:check`, kemudian cabut credential lama.
