export interface Applicant {
  id: string;
  name: string;
  nik: string;
  dob: string;
  academicYear: string;
  unit: 'PAUD/TK' | 'SD' | 'SMP' | 'SMA';
  admissionPath?: 'Siswa Baru' | 'Siswa Pindahan';
  targetClass?: string;
  transferReason?: string;
  paudChecklist?: Record<string, string>;
  sdChecklist?: Record<string, string>;
  school: string;
  parentName: string;
  parentPhone: string;
  status: 'Menunggu Verifikasi' | 'Berkas Lengkap' | 'Verifikasi Valid' | 'Lulus Tes' | 'Ditolak';
  score: number | '-';
  registrationDate: string;
}

export const mockApplicants: Applicant[] = [
  {
    id: 'REG-2026-001',
    name: 'Ahmad Faisal',
    nik: '3201123456789012',
    dob: '12 Januari 2012',
    academicYear: '2026/2027',
    unit: 'SMP',
    admissionPath: 'Siswa Baru',
    school: 'SDN 1 Jakarta',
    parentName: 'Budi Santoso',
    parentPhone: '081234567890',
    status: 'Lulus Tes',
    score: 85,
    registrationDate: '2026-05-01'
  },
  {
    id: 'REG-2026-002',
    name: 'Budi Santoso',
    nik: '3201123456789014',
    dob: '10 Agustus 2021',
    academicYear: '2026/2027',
    unit: 'PAUD/TK',
    targetClass: 'TK-A',
    paudChecklist: {
      "Kemandirian Toilet (Toilet Training)": 'Sudah Bisa',
      "Mengenal warna dasar (Merah, Biru, dll)": 'Mulai Bisa',
      "Bisa bermain/berinteraksi dengan teman": 'Sudah Bisa',
      "Bisa makan dan minum sendiri": 'Sudah Bisa',
      "Mampu mengikuti instruksi sederhana": 'Sudah Bisa'
    },
    school: '-',
    parentName: 'Siti Aminah',
    parentPhone: '081234567892',
    status: 'Berkas Lengkap',
    score: '-',
    registrationDate: '2026-05-05'
  },
  {
    id: 'REG-2026-003',
    name: 'Citra Kirana',
    nik: '3201123456789016',
    dob: '15 Februari 2019',
    academicYear: '2026/2027',
    unit: 'SD',
    admissionPath: 'Siswa Pindahan',
    targetClass: 'Kelas 3',
    transferReason: 'Mengikuti orang tua pindah tugas kerja dari luar kota.',
    sdChecklist: {
      "Mampu memegang pensil dengan benar": "Sudah Bisa",
      "Mengenal huruf alfabet dasar": "Sudah Bisa",
      "Bisa menghitung angka 1-10": "Sudah Bisa",
      "Dapat fokus duduk selama 15 menit": "Mulai Bisa"
    },
    school: 'TK Pertiwi',
    parentName: 'Andi Mallarangeng',
    parentPhone: '081234567894',
    status: 'Menunggu Verifikasi',
    score: '-',
    registrationDate: '2026-05-12'
  },
  {
    id: 'REG-2026-004',
    name: 'Dika Pratama',
    nik: '3201123456789017',
    dob: '05 Mei 2012',
    academicYear: '2026/2027',
    unit: 'SMP',
    school: 'SDN 5 Depok',
    parentName: 'Zulkifli Hasan',
    parentPhone: '081234567896',
    status: 'Lulus Tes',
    score: 88,
    registrationDate: '2026-05-18'
  },
  {
    id: 'REG-2026-008',
    name: 'Gita Savitri',
    nik: '3201123456789019',
    dob: '14 Desember 2018',
    academicYear: '2026/2027',
    unit: 'SD',
    school: 'TK Bintang Kecil',
    parentName: 'Paul Partohap',
    parentPhone: '081234567897',
    status: 'Verifikasi Valid',
    score: '-',
    registrationDate: '2026-05-20'
  },
  {
    id: 'REG-2026-009',
    name: 'Hafizah Khairunnisa',
    nik: '3201123456789020',
    dob: '01 Januari 2021',
    academicYear: '2026/2027',
    unit: 'PAUD/TK',
    school: '-',
    parentName: 'Fadil Jaidi',
    parentPhone: '081234567898',
    status: 'Berkas Lengkap',
    score: '-',
    registrationDate: '2026-05-22'
  },
  {
    id: 'REG-2026-010',
    name: 'Iqbaal Ramadhan',
    nik: '3201123456789021',
    dob: '28 Desember 2011',
    academicYear: '2026/2027',
    unit: 'SMP',
    school: 'SD Al-Azhar',
    parentName: 'Herry Hernawan',
    parentPhone: '081234567899',
    status: 'Menunggu Verifikasi',
    score: '-',
    registrationDate: '2026-05-25'
  },
  {
    id: 'REG-2025-001',
    name: 'Reza Rahardian',
    nik: '3201123456789022',
    dob: '05 Mei 2011',
    academicYear: '2025/2026',
    unit: 'SMP',
    school: 'SDN 1 Jakarta',
    parentName: 'Irfan Hakim',
    parentPhone: '081234567811',
    status: 'Lulus Tes',
    score: 88,
    registrationDate: '2025-05-01'
  },
  {
    id: 'REG-2025-002',
    name: 'Vidi Aldiano',
    nik: '3201123456789023',
    dob: '12 Juni 2011',
    academicYear: '2025/2026',
    unit: 'SMP',
    school: 'SD Muhammadiyah',
    parentName: 'Harry Kiss',
    parentPhone: '081234567812',
    status: 'Ditolak',
    score: 55,
    registrationDate: '2025-05-05'
  },
  {
    id: 'REG-2025-003',
    name: 'Raisa Andriana',
    nik: '3201123456789024',
    dob: '06 Juni 2016',
    academicYear: '2025/2026',
    unit: 'SD',
    school: 'TK Harapan',
    parentName: 'Allan Rachman',
    parentPhone: '081234567813',
    status: 'Lulus Tes',
    score: '-',
    registrationDate: '2025-05-10'
  }
];

// Helper functions for Dashboard Stats
export const getDashboardStats = () => {
  const total = mockApplicants.length;
  const verified = mockApplicants.filter(a => a.status === 'Verifikasi Valid' || a.status === 'Lulus Tes').length;
  const waiting = mockApplicants.filter(a => a.status === 'Menunggu Verifikasi' || a.status === 'Berkas Lengkap').length;
  const rejected = mockApplicants.filter(a => a.status === 'Ditolak').length;
  const passed = mockApplicants.filter(a => a.status === 'Lulus Tes').length;
  
  return {
    total,
    verified,
    waiting,
    rejected,
    passed
  };
};

export const getSpmbReports = () => {
  // Mock data for SPMB historical reports
  return [
    { academicYear: '2023/2024', totalApplicants: 120, accepted: 90, rejected: 30 },
    { academicYear: '2024/2025', totalApplicants: 145, accepted: 110, rejected: 35 },
    { academicYear: '2025/2026', totalApplicants: 180, accepted: 135, rejected: 45 },
    { academicYear: '2026/2027', totalApplicants: 210, accepted: 160, rejected: 50 },
  ];
};

// SPMB Settings API (Local Storage Mock)
export interface SpmbSettings {
  isOpen: boolean;
  academicYear: string;
  batch: string;
}

export const getSpmbSettings = (): SpmbSettings => {
  try {
    const settings = localStorage.getItem('spmbSettings');
    if (settings) {
      return JSON.parse(settings);
    }
  } catch (e) {}
  
  // Default Settings
  return {
    isOpen: true,
    academicYear: '2026/2027',
    batch: 'Gelombang 1'
  };
};

export const updateSpmbSettings = (newSettings: SpmbSettings) => {
  localStorage.setItem('spmbSettings', JSON.stringify(newSettings));
};

export const getSpmbBatches = (): string[] => {
  try {
    const batches = localStorage.getItem('spmbBatches');
    if (batches) return JSON.parse(batches);
  } catch (e) {}
  return ['Gelombang 1', 'Gelombang 2', 'Gelombang 3', 'Jalur Prestasi'];
};

export const updateSpmbBatches = (newBatches: string[]) => {
  localStorage.setItem('spmbBatches', JSON.stringify(newBatches));
};

export const getPaudIndicators = (): string[] => {
  try {
    const indicators = localStorage.getItem('paudIndicators');
    if (indicators) return JSON.parse(indicators);
  } catch (e) {}
  return [
    "Kemandirian Toilet (Toilet Training)",
    "Mengenal warna dasar (Merah, Biru, dll)",
    "Bisa bermain/berinteraksi dengan teman",
    "Bisa makan dan minum sendiri",
    "Mampu mengikuti instruksi sederhana"
  ];
};

export const updatePaudIndicators = (newIndicators: string[]) => {
  localStorage.setItem('paudIndicators', JSON.stringify(newIndicators));
};

export const getSdReadinessIndicators = (): string[] => {
  try {
    const indicators = localStorage.getItem('sdIndicators');
    if (indicators) return JSON.parse(indicators);
  } catch (e) {}
  return [
    "Mampu memegang pensil dengan benar",
    "Mengenal huruf alfabet dasar",
    "Bisa menghitung angka 1-10",
    "Dapat fokus duduk selama 15 menit"
  ];
};

export const updateSdReadinessIndicators = (newIndicators: string[]) => {
  localStorage.setItem('sdIndicators', JSON.stringify(newIndicators));
};
