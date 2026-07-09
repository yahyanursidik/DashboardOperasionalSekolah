export const PAUD_FOUNDATION_LEVEL = -2;

export const PAUD_LEVELS = [
  {
    value: -1,
    label: "KB",
    name: "Kelompok Bermain",
    age: "3-4 tahun",
    tone: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    value: 0,
    label: "TK A",
    name: "Taman Kanak-kanak A",
    age: "4-5 tahun",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    value: 1,
    label: "TK B",
    name: "Taman Kanak-kanak B",
    age: "5-6 tahun",
    tone: "bg-violet-50 text-violet-800 border-violet-200",
  },
];

export const FOUNDATION_ELEMENTS = [
  "Nilai Agama dan Budi Pekerti",
  "Jati Diri",
  "Dasar-dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni",
];

export const getPaudLevelMeta = (gradeLevel: number) => {
  if (gradeLevel === PAUD_FOUNDATION_LEVEL) {
    return {
      value: PAUD_FOUNDATION_LEVEL,
      label: "Fase Fondasi",
      name: "Dokumen Induk PAUD",
      age: "KB, TK A, TK B",
      tone: "bg-sky-50 text-sky-800 border-sky-200",
    };
  }

  return PAUD_LEVELS.find((level) => level.value === gradeLevel) || {
    value: gradeLevel,
    label: `Level ${gradeLevel}`,
    name: `Level ${gradeLevel}`,
    age: "-",
    tone: "bg-muted text-muted-foreground border-border",
  };
};

export const foundationAtpTemplate = `# Alur Tujuan Pembelajaran PAUD - Fase Fondasi

## Rasional
Pembelajaran Fase Fondasi disusun sebagai pengalaman bermain yang bermakna, terintegrasi, dan berpihak pada perkembangan anak. ATP ini menjadi dokumen induk untuk KB, TK A, dan TK B, lalu diturunkan ke RPPM dan RPPH/Modul Ajar sesuai karakteristik usia.

## Elemen 1: Nilai Agama dan Budi Pekerti
1. Anak mengenal Tuhan melalui ciptaan-Nya, doa harian, dan kebiasaan ibadah sesuai agama masing-masing.
2. Anak menunjukkan perilaku baik: sayang teman, jujur, santun, bertanggung jawab, dan peduli lingkungan.
3. Anak membiasakan adab sehari-hari dalam makan, bermain, belajar, dan berinteraksi dengan orang lain.

## Elemen 2: Jati Diri
1. Anak mengenal identitas diri, keluarga, sekolah, dan lingkungan sekitar.
2. Anak menunjukkan kemandirian dalam merawat diri, memilih kegiatan, menyelesaikan tugas sederhana, dan mengelola emosi.
3. Anak mengembangkan koordinasi motorik kasar dan halus melalui gerak, eksplorasi, seni, dan kegiatan sensorimotor.
4. Anak menunjukkan rasa percaya diri, aman, dan bangga sebagai bagian dari komunitas kelas.

## Elemen 3: Dasar-dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni
1. Anak menyimak, bertanya, bercerita, mengenal simbol, dan mulai memahami fungsi bacaan serta tulisan.
2. Anak mengenal konsep bilangan, pola, ukuran, bentuk, posisi, waktu, dan klasifikasi melalui benda konkret.
3. Anak mengamati, memprediksi, mencoba, membandingkan, dan menceritakan temuan sederhana.
4. Anak menggunakan alat dan bahan secara aman untuk membangun, merancang, menggambar, menyusun, dan menghasilkan karya.
5. Anak mengekspresikan gagasan melalui musik, gerak, gambar, bermain peran, konstruksi, dan karya seni.

## Prinsip Diferensiasi
- KB: fokus pada rasa aman, eksplorasi sensori, bahasa sederhana, kemandirian dasar, dan rutinitas.
- TK A: fokus pada komunikasi, kerja sama, klasifikasi, koordinasi motorik, dan pilihan kegiatan yang lebih beragam.
- TK B: fokus pada kesiapan transisi SD, problem solving sederhana, literasi-numerasi awal, proyek kecil, dan refleksi.

## Asesmen
Asesmen dilakukan melalui observasi, catatan anekdot, hasil karya, dokumentasi foto, percakapan, dan ceklis perkembangan. Hasil asesmen digunakan untuk memperbaiki kegiatan berikutnya, bukan untuk memberi label pada anak.`;

export const foundationProtaTemplate = [
  {
    bulan: "Juli",
    tema_topik: "MPLS: Sekolahku Majelis Ilmu",
    subtema_topik:
      "Hari pertama sekolah, mengenal ustadzah, mengenal teman, mengenal kelas, adab masuk kelas, adab duduk di majelis ilmu, adab mendengar, adab meminta izin, mengenal aturan kelas",
    alokasi_waktu: "2 minggu",
    integrasi_khas:
      "Adab menuntut ilmu, salam, izin, doa sebelum belajar, mengenal sekolah sebagai tempat belajar kebaikan",
    semester: "Semester I (Gasal/Ganjil)",
  },
  {
    bulan: "Juli",
    tema_topik: "Aku Hamba Allah",
    subtema_topik: "Diriku, tubuhku nikmat dari Allah, namaku, keluargaku, laki-laki/perempuan, aku anak muslim/muslimah",
    alokasi_waktu: "1 minggu",
    integrasi_khas: "Allah menciptakan aku, syukur atas tubuh, identitas muslim/muslimah, tarbiyah jinsiah dasar",
    semester: "Semester I (Gasal/Ganjil)",
  },
  {
    bulan: "Agustus",
    tema_topik: "Keluargaku dan Teman-Temanku",
    subtema_topik: "Ayah, ibu, saudara, teman, guru, adab kepada orang tua, adab kepada guru, adab kepada teman",
    alokasi_waktu: "2 minggu",
    integrasi_khas: "Hadits pendek tentang kata baik, jangan marah, senyum, kasih sayang, latihan sosial-emosional",
    semester: "Semester I (Gasal/Ganjil)",
  },
  {
    bulan: "Agustus",
    tema_topik: "Lingkungan Sekolah dan Rumahku",
    subtema_topik: "Rumahku, kelasku, barang-barangku, toilet, tempat wudhu, halaman sekolah, aturan kelas, PHBS",
    alokasi_waktu: "2 minggu",
    integrasi_khas: "Adab kebersihan, menjaga barang, toilet training, mencuci tangan, merapikan sandal/tas",
    semester: "Semester I (Gasal/Ganjil)",
  },
  {
    bulan: "September",
    tema_topik: "Unsur Alam Ciptaan Allah",
    subtema_topik: "Air, tanah, udara, api",
    alokasi_waktu: "2 minggu",
    integrasi_khas: "Allah menciptakan dan menundukkan nikmat, adab menggunakan air, keselamatan dari api, eksplorasi sensorik",
    semester: "Semester I (Gasal/Ganjil)",
  },
  {
    bulan: "September",
    tema_topik: "Langit dan Hujan",
    subtema_topik: "Langit, awan, hujan, angin, pelangi sebagai fenomena alam",
    alokasi_waktu: "2 minggu",
    integrasi_khas:
      "Allah menurunkan hujan, doa saat hujan sesuai kemampuan, sains sederhana: basah-kering, ringan-berat, sebab-akibat",
    semester: "Semester I (Gasal/Ganjil)",
  },
  {
    bulan: "Oktober",
    tema_topik: "Binatang Ciptaan Allah",
    subtema_topik: "Binatang darat, binatang air, binatang udara/yang terbang, cara menyayangi hewan",
    alokasi_waktu: "4 minggu",
    integrasi_khas: "Allah menciptakan makhluk hidup, adab menyayangi hewan, tidak menyakiti makhluk, klasifikasi hewan sederhana",
    semester: "Semester I (Gasal/Ganjil)",
  },
  {
    bulan: "November",
    tema_topik: "Tanaman Ciptaan Allah",
    subtema_topik: "Tanaman bunga, tanaman sayur, tanaman buah, bagian tanaman, merawat tanaman",
    alokasi_waktu: "3 minggu",
    integrasi_khas: "Allah menumbuhkan tanaman, menyiram, menanam, merawat, numerasi melalui biji/daun/buah",
    semester: "Semester I (Gasal/Ganjil)",
  },
  {
    bulan: "Desember",
    tema_topik: "Review Semester dan Proyek Syukur",
    subtema_topik: "Muraja'ah tema, portofolio anak, pameran kecil karya, asesmen akhir semester, konsultasi perkembangan",
    alokasi_waktu: "1 minggu",
    integrasi_khas: "Refleksi nikmat Allah selama satu semester, adab presentasi sederhana, komunikasi dengan orang tua",
    semester: "Semester I (Gasal/Ganjil)",
  },
  {
    bulan: "Januari",
    tema_topik: "Alam Semesta Ciptaan Allah",
    subtema_topik: "Matahari, bulan, bintang, planet, siang-malam, arah mata angin",
    alokasi_waktu: "4 minggu",
    integrasi_khas: "Allah pengatur alam semesta, keteraturan ciptaan Allah, mengenal waktu pagi-siang-malam",
    semester: "Semester II (Genap)",
  },
  {
    bulan: "Februari",
    tema_topik: "Bentang Alam Ciptaan Allah",
    subtema_topik: "Laut, gunung, sungai, pantai, dataran, tanah, batuan",
    alokasi_waktu: "3 minggu",
    integrasi_khas: "Kebesaran Allah pada bumi, adab menjaga alam, eksplorasi tekstur tanah, batu, air",
    semester: "Semester II (Genap)",
  },
  {
    bulan: "Februari",
    tema_topik: "Cuaca dan Perubahan Alam",
    subtema_topik: "Hujan, panas, angin, awan, pakaian sesuai cuaca, menjaga kesehatan",
    alokasi_waktu: "1 minggu",
    integrasi_khas: "Syukur dan sabar saat cuaca berubah, adab saat hujan, menjaga kesehatan",
    semester: "Semester II (Genap)",
  },
  {
    bulan: "Maret",
    tema_topik: "Transportasi Nikmat dari Allah",
    subtema_topik: "Transportasi darat, transportasi laut, transportasi udara, adab safar, keselamatan berkendara",
    alokasi_waktu: "4 minggu",
    integrasi_khas: "Allah memudahkan manusia berpindah, adab naik kendaraan, doa safar, teknologi sederhana roda/kapal/pesawat mainan",
    semester: "Semester II (Genap)",
  },
  {
    bulan: "April",
    tema_topik: "Pekerjaan dan Amanah",
    subtema_topik: "Guru, dokter, petani, nelayan, pedagang, petugas kebersihan, pemadam kebakaran, perlengkapan kerja",
    alokasi_waktu: "4 minggu",
    integrasi_khas: "Bekerja sebagai amanah, jujur, rajin, menolong, tanggung jawab, tidak malas",
    semester: "Semester II (Genap)",
  },
  {
    bulan: "Mei",
    tema_topik: "Proyek Akhir Tahun: Aku Anak Muslim/Muslimah yang Beradab",
    subtema_topik: "Adab harian, Al-Qur'an, hadits pendek, ibadah sederhana, kemandirian, karya portofolio",
    alokasi_waktu: "3 minggu",
    integrasi_khas: "Integrasi IEK: adab, hafalan surat pendek, hadits pendek, doa harian, tahsin sesuai level",
    semester: "Semester II (Genap)",
  },
  {
    bulan: "Juni",
    tema_topik: "Puncak Pembelajaran dan Laporan Perkembangan",
    subtema_topik: "Pameran portofolio, konsultasi orang tua, laporan perkembangan, transisi ke jenjang berikutnya",
    alokasi_waktu: "2 minggu",
    integrasi_khas: "Refleksi perkembangan anak, syukur, kesiapan transisi PAUD-SD",
    semester: "Semester II (Genap)",
  },
];

export const foundationProsemTemplate = {
  semester: "Ganjil",
  rows: [
    { semester: "Semester I (Gasal/Ganjil)", minggu: 1, bulan: "Juli", topik_subtopik: "MPLS / Sekolahku Majelis Ilmu", modul_ajar: "Aku Datang ke Sekolah dengan Adab" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 2, bulan: "Juli", topik_subtopik: "MPLS / Adab di Majelis Ilmu", modul_ajar: "Mengenal Ustadzah, Teman, Kelas, dan Aturan dengan Bahagia" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 3, bulan: "Juli", topik_subtopik: "Aku Hamba Allah / Diriku", modul_ajar: "Allah Menciptakan Aku: Tubuhku Nikmat dari Allah" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 4, bulan: "Agustus", topik_subtopik: "Aku Hamba Allah / Keluargaku", modul_ajar: "Keluargaku Amanah dari Allah" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 5, bulan: "Agustus", topik_subtopik: "Keluargaku dan Temanku / Adab kepada Orang Lain", modul_ajar: "Aku Sayang Orang Tua, Guru, dan Temanku" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 6, bulan: "Agustus", topik_subtopik: "Lingkunganku / Rumahku", modul_ajar: "Rumahku Tempat Belajar Adab" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 7, bulan: "Agustus", topik_subtopik: "Lingkunganku / Sekolahku Bersih dan Tertib", modul_ajar: "Sekolahku Bersih, Aku Belajar Mandiri" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 8, bulan: "September", topik_subtopik: "Unsur Alam Ciptaan Allah / Air dan Tanah", modul_ajar: "Air Nikmat Allah, Tanah Tempat Tumbuh" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 9, bulan: "September", topik_subtopik: "Unsur Alam Ciptaan Allah / Udara dan Api", modul_ajar: "Udara yang Tak Terlihat dan Api yang Harus Dijaga" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 10, bulan: "September", topik_subtopik: "Langit dan Hujan / Langit, Awan, dan Angin", modul_ajar: "Menatap Langit, Mengenal Kebesaran Allah" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 11, bulan: "September", topik_subtopik: "Langit dan Hujan / Hujan dan Pelangi", modul_ajar: "Allah Menurunkan Hujan" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 12, bulan: "Oktober", topik_subtopik: "Binatang Ciptaan Allah / Binatang Darat", modul_ajar: "Mengenal Binatang Darat di Sekitar Kita" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 13, bulan: "Oktober", topik_subtopik: "Binatang Ciptaan Allah / Binatang Air", modul_ajar: "Mengenal Kehidupan di Air" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 14, bulan: "Oktober", topik_subtopik: "Binatang Ciptaan Allah / Binatang Udara", modul_ajar: "Mengenal Binatang yang Terbang" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 15, bulan: "Oktober", topik_subtopik: "Binatang Ciptaan Allah / Sayang Binatang", modul_ajar: "Tidak Menyakiti Makhluk Allah" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 16, bulan: "November", topik_subtopik: "Tanaman Ciptaan Allah / Bunga dan Sayuran", modul_ajar: "Allah Menumbuhkan Bunga dan Sayuran" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 17, bulan: "November", topik_subtopik: "Tanaman Ciptaan Allah / Buah-buahan dan Merawat Tanaman", modul_ajar: "Aku Belajar Menanam dan Merawat Tanaman" },
    { semester: "Semester I (Gasal/Ganjil)", minggu: 18, bulan: "Desember", topik_subtopik: "Review Semester / Proyek Syukur", modul_ajar: "Alhamdulillah, Aku Belajar Banyak Nikmat Allah" },
    { semester: "Semester II (Genap)", minggu: 1, bulan: "Januari", topik_subtopik: "Alam Semesta Ciptaan Allah / Matahari dan Siang-Malam", modul_ajar: "Matahari Bersinar dengan Ketetapan Allah" },
    { semester: "Semester II (Genap)", minggu: 2, bulan: "Januari", topik_subtopik: "Alam Semesta Ciptaan Allah / Bulan dan Bintang", modul_ajar: "Indahnya Bulan dan Bintang di Langit Malam" },
    { semester: "Semester II (Genap)", minggu: 3, bulan: "Januari", topik_subtopik: "Alam Semesta Ciptaan Allah / Planet", modul_ajar: "Mengenal Planet dan Luasnya Ciptaan Allah" },
    { semester: "Semester II (Genap)", minggu: 4, bulan: "Januari", topik_subtopik: "Alam Semesta Ciptaan Allah / Mata Angin dan Arah", modul_ajar: "Ke Mana Arahku? Mengenal Arah dengan Gembira" },
    { semester: "Semester II (Genap)", minggu: 5, bulan: "Februari", topik_subtopik: "Bentang Alam Ciptaan Allah / Laut dan Pantai", modul_ajar: "Laut yang Luas, Nikmat dari Allah" },
    { semester: "Semester II (Genap)", minggu: 6, bulan: "Februari", topik_subtopik: "Bentang Alam Ciptaan Allah / Gunung, Sungai, Tanah, dan Batuan", modul_ajar: "Gunung, Sungai, dan Bumi Tempat Kita Tinggal" },
    { semester: "Semester II (Genap)", minggu: 7, bulan: "Februari", topik_subtopik: "Cuaca dan Perubahan Alam / Hujan, Panas, Awan, dan Angin", modul_ajar: "Cuaca Berubah, Aku Tetap Bersyukur" },
    { semester: "Semester II (Genap)", minggu: 8, bulan: "Februari", topik_subtopik: "Cuaca dan Kesehatan / Pakaian Sesuai Cuaca", modul_ajar: "Menjaga Tubuh Saat Panas, Hujan, dan Berangin" },
    { semester: "Semester II (Genap)", minggu: 9, bulan: "Maret", topik_subtopik: "Transportasi Nikmat dari Allah / Transportasi Darat", modul_ajar: "Tertib di Jalan, Mengenal Transportasi Darat" },
    { semester: "Semester II (Genap)", minggu: 10, bulan: "Maret", topik_subtopik: "Transportasi Nikmat dari Allah / Transportasi Laut", modul_ajar: "Berlayar dengan Kapal, Mengenal Transportasi Laut" },
    { semester: "Semester II (Genap)", minggu: 11, bulan: "Maret", topik_subtopik: "Transportasi Nikmat dari Allah / Transportasi Udara", modul_ajar: "Terbang di Langit, Mengenal Transportasi Udara" },
    { semester: "Semester II (Genap)", minggu: 12, bulan: "Maret", topik_subtopik: "Transportasi Nikmat dari Allah / Adab Safar dan Keselamatan", modul_ajar: "Berjalan dan Bepergian dengan Adab" },
    { semester: "Semester II (Genap)", minggu: 13, bulan: "April", topik_subtopik: "Pekerjaan dan Amanah / Guru, Dokter, Petugas Kebersihan, Pemadam Kebakaran", modul_ajar: "Setiap Pekerjaan Ada Manfaat dan Amanah" },
    { semester: "Semester II (Genap)", minggu: 14, bulan: "April", topik_subtopik: "Pekerjaan dan Amanah / Petani, Nelayan, Pedagang", modul_ajar: "Bekerja dengan Jujur, Rajin, dan Bermanfaat" },
    { semester: "Semester II (Genap)", minggu: 15, bulan: "April", topik_subtopik: "Pekerjaan dan Amanah / Perlengkapan Kerja", modul_ajar: "Mengenal Alat Kerja dan Cara Menggunakannya dengan Aman" },
    { semester: "Semester II (Genap)", minggu: 16, bulan: "Mei", topik_subtopik: "Proyek Anak Muslim/Muslimah Beradab / Al-Qur'an dan Hadits Pendek", modul_ajar: "Aku Cinta Al-Qur'an dan Sabda Nabi SAW" },
    { semester: "Semester II (Genap)", minggu: 17, bulan: "Mei", topik_subtopik: "Proyek Anak Muslim/Muslimah Beradab / Doa, Ibadah, Adab, dan Kemandirian", modul_ajar: "Aku Belajar Beradab dan Mandiri" },
    { semester: "Semester II (Genap)", minggu: 18, bulan: "Juni", topik_subtopik: "Puncak Pembelajaran / Portofolio dan Transisi Jenjang Berikutnya", modul_ajar: "Alhamdulillah, Aku Siap Melanjutkan Belajar" },
  ],
};

export const tkaRppmWeek1Template = {
  minggu_ke: 1,
  grade_level: 0,
  satuan_pendidikan: "Tarbiyah Sunnah Lab School Preschool",
  jenjang_kelas: "TK A / Usia 4-5 Tahun",
  semester: "Semester I / Gasal",
  bulan: "Juli 2026",
  fase: "Fondasi",
  topik: "MPLS",
  subtopik: "Sekolahku Majelis Ilmu",
  modul_ajar: "Aku Datang ke Sekolah dengan Adab",
  alokasi_waktu: "5 x 3 JP",
  model_pembelajaran: "Play Based Learning, Inkuiri Sederhana, Pembiasaan, Talaqqi, dan Keteladanan",
  karakter_khas:
    "Tauhid, adab menuntut ilmu, doa sebelum belajar, salam, izin, kemandirian awal, dan adaptasi sekolah dengan bahagia",
  cp_agama:
    "Murid mulai mengenal dan mempraktikkan ajaran pokok agama Islam melalui doa, salam, adab kepada guru, adab kepada teman, serta kebiasaan baik di lingkungan sekolah.",
  cp_jati_diri:
    "Murid mengenali dirinya sebagai bagian dari keluarga dan satuan pendidikan, mulai menyesuaikan diri dengan lingkungan sekolah, aturan kelas, guru, dan teman.",
  cp_literasi:
    "Murid mengenali informasi sederhana tentang lingkungan sekolah, mengomunikasikan perasaan dan kebutuhan, serta mengekspresikan pengalaman awal sekolah melalui karya, cerita, dan bermain.",
  tujuan_mingguan:
    "1. Mengenal sekolah sebagai tempat belajar kebaikan dan majelis ilmu secara sederhana.\n2. Mengenal ustadzah, teman, kelas, toilet, tempat wudhu, halaman, dan aturan dasar sekolah.\n3. Membiasakan salam, meminta izin, duduk dengan tenang, mendengarkan guru, dan menunggu giliran.\n4. Mengikuti doa sebelum belajar, basmalah, hamdalah, dan dzikir pendek dengan bimbingan.\n5. Mengungkapkan perasaan saat datang ke sekolah, seperti senang, malu, takut, atau rindu orang tua.\n6. Mulai mandiri dalam kegiatan sederhana: menyimpan tas, melepas/merapikan sepatu atau sandal, mencuci tangan, dan merapikan alat main.\n7. Berinteraksi dengan teman secara aman, lembut, dan santun.\n8. Mengenal bahwa belajar adalah nikmat dari Allah dan dilakukan karena Allah.",
  penguatan_tsls:
    "Aqidah dan Manhaj: Anak dikenalkan bahwa Allah memberi nikmat ilmu, guru, teman, dan sekolah.\nAdab dan Akhlak: Adab masuk kelas, salam, izin, duduk di majelis ilmu, mendengarkan guru, tidak menyakiti teman.\nAl-Qur'an: Anak mengenal halaqah kecil, duduk saat talaqqi, menyimak bacaan guru, dan menjaga Iqro/mushaf.\nHadits Pendek: Pengenalan hadits sederhana: jangan marah. Digunakan saat belajar mengelola emosi dan bermain bersama.\nDoa dan Dzikir Harian: Basmalah sebelum kegiatan, hamdalah setelah kegiatan, doa sebelum belajar dengan bimbingan.\nTarbiyah Jinsiah: Anak mengenal identitas diri laki-laki/perempuan secara sederhana, menjaga tubuh, toilet dengan adab, dan meminta bantuan kepada ustadzah saat perlu.\nKemandirian: Menyimpan tas, melepas/merapikan alas kaki, mencuci tangan, antre, dan merapikan mainan.\nHidden Curriculum: Penyambutan pagi, rutinitas salam, doa, halaqah, makan dengan adab, toilet training, pulang dengan tertib.",
  kegiatan_inti_mingguan: [
    {
      hari: "Hari 1",
      fokus: "Aku Datang ke Sekolah",
      kegiatan:
        "Anak disambut dengan salam; mengenal ustadzah dan teman; school tour sederhana: kelas, toilet, tempat wudhu, rak tas, rak sepatu/sandal; praktik menyimpan tas dan alas kaki; mengenal kalimat 'Sekolah adalah tempat belajar kebaikan.'",
      alat_bahan: "Kartu nama anak, label rak, gambar sederhana area sekolah, stiker nama, alas duduk halaqah",
    },
    {
      hari: "Hari 2",
      fokus: "Adab Masuk Kelas dan Majelis Ilmu",
      kegiatan:
        "Praktik masuk kelas dengan salam; duduk melingkar; mendengarkan ustadzah; latihan mengangkat tangan saat ingin bicara; talaqqi basmalah dan doa sebelum belajar; permainan 'Aku bisa duduk baik.'",
      alat_bahan: "Kartu adab kelas, poster sederhana adab majelis ilmu, alas duduk, kartu ekspresi wajah",
    },
    {
      hari: "Hari 3",
      fokus: "Aku dan Teman Baruku",
      kegiatan:
        "Permainan perkenalan tanpa musik; anak menyebut nama diri dengan bantuan; bermain berpasangan memindahkan bola/alat main; praktik meminta izin meminjam barang; mengenal hadits pendek 'jangan marah' dengan konteks bermain bersama.",
      alat_bahan: "Bola kecil, kartu nama, keranjang, loose parts aman, kartu kata: salam, izin, maaf, terima kasih",
    },
    {
      hari: "Hari 4",
      fokus: "Sekolahku Bersih dan Tertib",
      kegiatan:
        "Mengenal area cuci tangan dan toilet; praktik mencuci tangan; membuang sampah pada tempatnya; merapikan mainan setelah digunakan; cerita pendek tentang anak yang menjaga kebersihan sebagai bentuk syukur kepada Allah.",
      alat_bahan: "Sabun, lap/tisu, tempat sampah, gambar urutan cuci tangan, mainan kelas, keranjang penyimpanan",
    },
    {
      hari: "Hari 5",
      fokus: "Alhamdulillah, Aku Mulai Berani Sekolah",
      kegiatan:
        "Review kegiatan pekan pertama; anak memilih gambar ekspresi perasaan; membuat karya sederhana 'Sekolahku Majelis Ilmu' berupa kolase kelas/masjid ilmu tanpa gambar makhluk bernyawa; muraja'ah salam, basmalah, hamdalah, doa belajar; apresiasi adab anak.",
      alat_bahan: "Kertas HVS/karton, potongan bentuk geometri, lem, krayon, stiker bintang/adab, kartu ekspresi",
    },
  ],
  pembiasaan_harian:
    "Kedatangan: Salam, menyapa guru, menyimpan alas kaki dan tas.\nPembukaan: Basmalah, doa sebelum belajar, dzikir pendek.\nHalaqah: Duduk melingkar, mendengar guru, menunggu giliran.\nTransisi Kegiatan: Berjalan tertib, tidak berlari di dalam kelas, meminta izin.\nMakan / Minum: Cuci tangan, basmalah, tangan kanan, duduk, hamdalah.\nToilet: Meminta izin, menjaga aurat, mencuci tangan.\nBermain: Tidak merebut, tidak memukul, meminta izin, bergiliran.\nPenutup: Merapikan alat, hamdalah, doa pulang, salam.",
  asesmen_mingguan:
    "Adaptasi Sekolah: Anak mulai mau masuk kelas, mengenal guru, dan mengikuti rutinitas dengan bimbingan.\nAdab: Anak mengucapkan salam, meminta izin, mendengarkan guru, dan menunggu giliran.\nSosial-Emosional: Anak mulai berinteraksi dengan teman, menyampaikan perasaan, dan tidak menyakiti teman.\nKemandirian: Anak mencoba menyimpan tas, merapikan alas kaki, mencuci tangan, dan merapikan mainan.\nBahasa: Anak menyebut nama diri, menjawab pertanyaan sederhana, dan menggunakan kata baik.\nNilai Agama: Anak mengikuti basmalah, hamdalah, doa belajar, dan memahami sekolah sebagai tempat belajar kebaikan.\nAl-Qur'an: Anak mulai duduk saat halaqah, menyimak guru, dan menirukan bacaan pendek.\nMotorik: Anak mengikuti permainan sederhana, memindahkan benda, menempel, dan merapikan alat.\nKategori catatan perkembangan: BB, MB, BSH, BSB.",
  catatan_guru:
    "1. Minggu pertama bukan waktu untuk mengejar materi, tetapi membangun rasa aman, kedekatan, kepercayaan, dan adab dasar.\n2. Anak yang menangis, takut, atau belum mau berpisah dari orang tua diberi waktu adaptasi dengan lembut.\n3. Guru menghindari bentakan, ancaman, atau perbandingan antar anak.\n4. Semua instruksi dibuat singkat, jelas, dan diulang dengan contoh.\n5. Pembelajaran Al-Qur'an dan doa dilakukan pendek, hangat, dan tidak menekan.\n6. Anak tidak dipaksa langsung mandiri, tetapi diberi contoh, bantuan, lalu kesempatan mencoba.\n7. Setiap keberhasilan kecil diberi apresiasi: MasyaAllah, antum sudah berusaha.\n8. Guru mencatat anak yang membutuhkan pendampingan khusus dalam adaptasi, toilet training, komunikasi, atau regulasi emosi.",
  umpan_balik_guru:
    "MasyaAllah, anak-anak sudah mulai belajar datang ke sekolah dengan adab. Pekan ini anak-anak belajar mengucapkan salam, mengenal ustadzah, mengenal teman, duduk di halaqah, mendengarkan guru, menyimpan tas, mencuci tangan, dan merapikan mainan.\n\nSebagian anak sudah mulai berani masuk kelas dan mengikuti kegiatan. Sebagian lainnya masih membutuhkan waktu untuk beradaptasi, dan itu adalah proses yang wajar. Guru akan terus mendampingi dengan lembut, memberi contoh, dan menguatkan anak agar merasa aman, nyaman, dan bahagia di sekolah.\n\nSemoga Allah menjadikan langkah pertama anak-anak di sekolah ini sebagai awal kebaikan, ilmu yang bermanfaat, adab yang indah, dan kecintaan kepada Al-Qur'an serta Sunnah.",
};

const moduleTemplates = {
  "-1": {
    rppm: [
      {
        minggu_ke: 1,
        tujuan_kegiatan: "Anak merasa aman di kelas, mengenal guru/teman, mengikuti rutinitas sederhana, dan mulai memilih kegiatan main.",
        materi: "Pengenalan kelas, adab menyapa, doa pendek, warna dasar, eksplorasi sensori.",
        rencana_kegiatan: "- Bermain bebas terarah di sudut balok dan sensori\n- Bernyanyi nama teman\n- Kolase sederhana dengan kertas warna\n- Latihan cuci tangan dan antre",
      },
      {
        minggu_ke: 2,
        tujuan_kegiatan: "Anak mengenal anggota tubuh dan kebutuhan diri melalui gerak, lagu, cerita, dan permainan konkret.",
        materi: "Anggota tubuh, kebersihan diri, emosi senang/sedih/marah, motorik kasar.",
        rencana_kegiatan: "- Menempel gambar anggota tubuh\n- Gerak lagu kepala pundak lutut kaki\n- Bermain ekspresi wajah\n- Mencuci tangan sebelum makan bersama",
      },
    ],
    rpph: [
      {
        minggu_ke: 1,
        hari_ke: 1,
        topik_harian: "Aku Senang Datang ke Sekolah",
        tujuan_pembelajaran: "Anak mau berpisah dengan pendamping secara bertahap, menyapa guru, dan memilih satu kegiatan main.",
        kegiatan_pembuka: "Penyambutan personal, doa pendek, lagu nama, dan pengenalan aturan aman.",
        kegiatan_inti: "Anak memilih bermain balok, meronce besar, atau meja sensori. Guru mengobservasi respons anak dan memberi bahasa sederhana.",
        kegiatan_penutup: "Recalling kegiatan yang dipilih anak, pujian spesifik, doa pulang.",
        asesmen: "Observasi adaptasi, catatan anekdot, dokumentasi foto.",
        alat_bahan: "Balok besar, manik besar, wadah sensori, kartu nama.",
      },
    ],
  },
  "0": {
    rppm: [
      tkaRppmWeek1Template,
      {
        minggu_ke: 2,
        tujuan_kegiatan: "Anak mengungkapkan perasaan, menjaga kebersihan diri, dan menyelesaikan karya sederhana.",
        materi: "Emosi, kebersihan diri, bentuk geometri, cerita bergambar.",
        rencana_kegiatan: "- Membuat roda emosi\n- Praktik sikat gigi/cuci tangan\n- Menyusun pola bentuk\n- Menceritakan gambar diri",
      },
    ],
    rpph: [
      {
        minggu_ke: 1,
        hari_ke: 1,
        topik_harian: "Namaku dan Teman Baruku",
        tujuan_pembelajaran: "Anak menyebutkan nama diri, menyimak nama teman, dan menghias kartu nama dengan pilihan bahan.",
        kegiatan_pembuka: "Salam, doa, apersepsi tentang nama, permainan bola sebut nama.",
        kegiatan_inti: "Anak menghias kartu nama, membandingkan huruf awal nama, lalu memilih area main balok/seni/baca.",
        kegiatan_penutup: "Anak menunjukkan kartu nama, menyebut satu teman baru, doa pulang.",
        asesmen: "Ceklis partisipasi, hasil karya, catatan bahasa lisan.",
        alat_bahan: "Kartu nama, spidol, stiker, lem, balok, buku cerita.",
      },
    ],
  },
  "1": {
    rppm: [
      {
        minggu_ke: 1,
        tujuan_kegiatan: "Anak menunjukkan kemandirian, memahami aturan bersama, serta menggunakan simbol huruf/angka dalam konteks bermain.",
        materi: "Identitas diri, aturan kelas, huruf nama, bilangan 1-10, kerja sama.",
        rencana_kegiatan: "- Membuat buku mini tentang diri\n- Survei nama teman dan menghitung jumlah huruf\n- Menyusun jadwal piket sederhana\n- Bermain konstruksi sekolah impian",
      },
      {
        minggu_ke: 2,
        tujuan_kegiatan: "Anak memecahkan masalah sederhana, menceritakan proses, dan menguatkan kesiapan transisi SD melalui proyek kecil.",
        materi: "Urutan kegiatan, simbol, pola, pengukuran nonstandar, presentasi karya.",
        rencana_kegiatan: "- Membuat peta sederhana kelas\n- Mengukur meja dengan balok\n- Menulis/meniru label area main\n- Presentasi karya kelompok",
      },
    ],
    rpph: [
      {
        minggu_ke: 1,
        hari_ke: 1,
        topik_harian: "Buku Mini Tentang Diriku",
        tujuan_pembelajaran: "Anak menggambar diri, mengenali huruf pada nama, menghitung jumlah anggota keluarga, dan menceritakan karyanya.",
        kegiatan_pembuka: "Salam, doa, diskusi identitas diri, membaca buku cerita tentang anak mandiri.",
        kegiatan_inti: "Anak membuat buku mini: halaman nama, gambar diri, keluarga, kesukaan. Guru memberi tantangan huruf dan jumlah sesuai kesiapan anak.",
        kegiatan_penutup: "Beberapa anak bercerita, teman memberi apresiasi, guru melakukan recalling strategi yang digunakan.",
        asesmen: "Portofolio karya, catatan anekdot presentasi, ceklis literasi-numerasi awal.",
        alat_bahan: "Kertas lipat, pensil warna, kartu huruf, angka, foto keluarga opsional.",
      },
    ],
  },
};

export const getFoundationTemplateValues = () => ({
  grade_level: PAUD_FOUNDATION_LEVEL,
  atp_text: foundationAtpTemplate,
  prota_data: foundationProtaTemplate,
  prosem_data: foundationProsemTemplate,
  rppm_data: [],
  rpph_data: [],
});

export const getModuleTemplateValues = (gradeLevel: number) => {
  const template = moduleTemplates[String(gradeLevel) as keyof typeof moduleTemplates] || moduleTemplates["0"];

  return {
    grade_level: gradeLevel,
    atp_text: "",
    prota_data: [],
    prosem_data: { semester: "Ganjil", rows: [] },
    rppm_data: template.rppm,
    rpph_data: template.rpph,
  };
};

export const getPaudCompletion = (record: any) => {
  const isFoundation = record?.grade_level === PAUD_FOUNDATION_LEVEL;

  if (isFoundation) {
    const hasAtp = typeof record?.atp_text === "string" && record.atp_text.trim().length > 20;
    const protaCount = Array.isArray(record?.prota_data) ? record.prota_data.length : 0;
    const prosemCount = Array.isArray(record?.prosem_data?.rows) ? record.prosem_data.rows.length : 0;
    const completed = [hasAtp, protaCount > 0, prosemCount > 0].filter(Boolean).length;

    return {
      total: 3,
      completed,
      percent: Math.round((completed / 3) * 100),
      chips: [
        { label: "ATP", value: hasAtp ? "Tersedia" : "Kosong", done: hasAtp },
        { label: "Prota", value: `${protaCount} baris`, done: protaCount > 0 },
        { label: "Prosem", value: `${prosemCount} baris`, done: prosemCount > 0 },
      ],
    };
  }

  const rppmCount = Array.isArray(record?.rppm_data) ? record.rppm_data.length : 0;
  const rpphCount = Array.isArray(record?.rpph_data) ? record.rpph_data.length : 0;
  const completed = [rppmCount > 0, rpphCount > 0].filter(Boolean).length;

  return {
    total: 2,
    completed,
    percent: Math.round((completed / 2) * 100),
    chips: [
      { label: "RPPM", value: `${rppmCount} minggu`, done: rppmCount > 0 },
      { label: "RPPH", value: `${rpphCount} hari`, done: rpphCount > 0 },
    ],
  };
};
