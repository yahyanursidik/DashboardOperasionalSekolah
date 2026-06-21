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
  parentsInfo?: {
    address: string;
    mapUrl: string;
    father: {
      name: string;
      occupation: string;
      phone: string;
      email: string;
      status: string;
    };
    mother: {
      name: string;
      occupation: string;
      phone: string;
      email: string;
      status: string;
    };
    siblingsInSchool: Array<{
      name: string;
      unit: string;
      grade: string;
    }>;
  };
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
    registrationDate: '2026-05-01',
    parentsInfo: {
      address: 'Jl. Merdeka No. 45, Kebayoran Baru, Jakarta Selatan',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126920.2400969567!2d106.75886616056525!3d-6.229746499999994!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f3e945e34b9d%3A0x100c5e82dd4b820!2sJakarta%20Selatan%2C%20Kota%20Jakarta%20Selatan%2C%20Daerah%20Khusus%20Ibukota%20Jakarta!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid',
      father: {
        name: 'Budi Santoso',
        occupation: 'Pegawai Bank',
        phone: '081234567890',
        email: 'budi.santoso@email.com',
        status: 'Masih Hidup / Serumah'
      },
      mother: {
        name: 'Ani Yudhoyono',
        occupation: 'Ibu Rumah Tangga',
        phone: '081234567891',
        email: 'ani.yudhoyono@email.com',
        status: 'Masih Hidup / Serumah'
      },
      siblingsInSchool: [
        { name: 'Rina Santoso', unit: 'SMA', grade: 'Kelas 11' },
        { name: 'Doni Santoso', unit: 'SD', grade: 'Kelas 3' }
      ]
    }
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
  // Calculate historical reports from the real SPMB system data (mockApplicants)
  const grouped = mockApplicants.reduce((acc, app) => {
    if (!acc[app.academicYear]) {
      acc[app.academicYear] = { 
        academicYear: app.academicYear, 
        totalApplicants: 0, 
        accepted: 0, 
        rejected: 0 
      };
    }
    
    acc[app.academicYear].totalApplicants += 1;
    
    if (app.status === 'Lulus Tes') {
      acc[app.academicYear].accepted += 1;
    } else if (app.status === 'Ditolak') {
      acc[app.academicYear].rejected += 1;
    }
    
    return acc;
  }, {} as Record<string, any>);

  // Return array sorted by academic year ascending
  return Object.values(grouped).sort((a: any, b: any) => a.academicYear.localeCompare(b.academicYear));
};

// SPMB Settings API (Local Storage Mock)
export interface SpmbSchedule {
  academicTestDate: string;
  interviewDate: string;
  announcementDate: string;
  location: string;
  notes: string;
}

export interface SpmbSettings {
  isOpen: boolean;
  academicYear: string;
  batch: string;
  foundationName: string;
  schoolName: string;
  openUnits: string[];
  logoUrl?: string;
  schedule?: SpmbSchedule;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface PostAdmissionFee {
  id: string;
  name: string;
  amount: number;
  type: 'umum' | 'ikhwan' | 'akhwat';
}

export interface SpmbUnitFee {
  unit: string;
  amount: number;
  details: string[];
  postAdmissionFees: PostAdmissionFee[];
}

export interface SpmbFinanceSettings {
  unitFees: SpmbUnitFee[];
  banks: BankAccount[];
  qrisUrl?: string;
}

export const getSpmbFinanceSettings = (): SpmbFinanceSettings => {
  const defaultSettings: SpmbFinanceSettings = {
    unitFees: [
      { 
        unit: 'PAUD/TK', 
        amount: 250000, 
        details: ['Biaya Formulir & Administrasi', 'Biaya Observasi Anak', 'Snack'],
        postAdmissionFees: [
          { id: '1', name: 'Pengembangan Sekolah', amount: 5000000, type: 'umum' },
          { id: '2', name: 'Uang Kegiatan Tahunan', amount: 1500000, type: 'umum' },
          { id: '3', name: 'SPP Bulan Juli', amount: 450000, type: 'umum' },
          { id: '4', name: 'Buku Paket Tahunan', amount: 500000, type: 'umum' },
          { id: '5', name: 'Seragam Ikhwan (4 Stel)', amount: 800000, type: 'ikhwan' },
          { id: '6', name: 'Seragam Akhwat (4 Stel)', amount: 950000, type: 'akhwat' }
        ]
      },
      { 
        unit: 'SDIT', 
        amount: 350000, 
        details: ['Biaya Formulir & Administrasi', 'Biaya Tes Psikologi / Observasi', 'Snack saat pelaksanaan tes'],
        postAdmissionFees: [
          { id: '1', name: 'Pengembangan Sekolah', amount: 12000000, type: 'umum' },
          { id: '2', name: 'Uang Kegiatan Tahunan', amount: 2000000, type: 'umum' },
          { id: '3', name: 'SPP Bulan Juli', amount: 850000, type: 'umum' },
          { id: '4', name: 'Buku Paket Tahunan', amount: 1200000, type: 'umum' },
          { id: '5', name: 'Seragam Ikhwan (5 Stel)', amount: 1200000, type: 'ikhwan' },
          { id: '6', name: 'Seragam Akhwat (5 Stel + Jilbab)', amount: 1500000, type: 'akhwat' }
        ]
      },
      { 
        unit: 'SMPIT', 
        amount: 350000, 
        details: ['Biaya Formulir & Administrasi', 'Biaya Tes Akademik & Psikologi', 'Snack saat pelaksanaan tes'],
        postAdmissionFees: [
          { id: '1', name: 'Pengembangan Sekolah', amount: 15000000, type: 'umum' },
          { id: '2', name: 'Uang Kegiatan Tahunan', amount: 2500000, type: 'umum' },
          { id: '3', name: 'SPP Bulan Juli', amount: 1100000, type: 'umum' },
          { id: '4', name: 'Buku Paket Tahunan', amount: 1500000, type: 'umum' },
          { id: '5', name: 'Seragam Ikhwan (5 Stel)', amount: 1400000, type: 'ikhwan' },
          { id: '6', name: 'Seragam Akhwat (5 Stel + Jilbab)', amount: 1800000, type: 'akhwat' }
        ]
      },
      { 
        unit: 'SMAIT', 
        amount: 400000, 
        details: ['Biaya Formulir & Administrasi', 'Biaya Tes Akademik, Psikologi & Peminatan', 'Snack saat pelaksanaan tes'],
        postAdmissionFees: [
          { id: '1', name: 'Pengembangan Sekolah', amount: 18000000, type: 'umum' },
          { id: '2', name: 'Uang Kegiatan Tahunan', amount: 3000000, type: 'umum' },
          { id: '3', name: 'SPP Bulan Juli', amount: 1300000, type: 'umum' },
          { id: '4', name: 'Buku Paket Tahunan', amount: 1800000, type: 'umum' },
          { id: '5', name: 'Seragam Ikhwan (5 Stel)', amount: 1600000, type: 'ikhwan' },
          { id: '6', name: 'Seragam Akhwat (5 Stel + Jilbab)', amount: 2000000, type: 'akhwat' }
        ]
      }
    ],
    banks: [
      { id: '1', bankName: 'BSI (Bank Syariah Indonesia)', accountNumber: '712 345 6789', accountName: 'TS Lab School' },
      { id: '2', bankName: 'Bank Muamalat', accountNumber: '123 456 7890', accountName: 'TS Lab School' }
    ],
    qrisUrl: ''
  };

  try {
    const raw = localStorage.getItem('spmbFinanceSettings');
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch (e) {}
  
  return defaultSettings;
};

export const updateSpmbFinanceSettings = (newSettings: SpmbFinanceSettings) => {
  try {
    localStorage.setItem('spmbFinanceSettings', JSON.stringify(newSettings));
    window.dispatchEvent(new Event('spmbFinanceSettingsUpdated'));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
      alert("Gagal menyimpan: Ukuran file gambar QRIS terlalu besar!");
    } else {
      console.error(e);
    }
    throw e;
  }
};

export const getSpmbSettings = (): SpmbSettings => {
  const defaultSettings: SpmbSettings = {
    isOpen: true,
    academicYear: '2026/2027',
    batch: 'Gelombang 1',
    foundationName: 'Yayasan Pendidikan Islam TSLS',
    schoolName: 'Sekolah Islam Terpadu TSLS',
    openUnits: ['PAUD/TK', 'SDIT', 'SMPIT', 'SMAIT'],
    logoUrl: '',
    schedule: {
      academicTestDate: '24 Juli 2026',
      interviewDate: '25 Juli 2026',
      announcementDate: '30 Juli 2026',
      location: 'Gedung Utama SIT TSLS',
      notes: 'Calon siswa SMPIT/SMAIT wajib membawa alat tulis. Orang tua wajib hadir saat sesi wawancara.'
    }
  };

  try {
    const settings = localStorage.getItem('spmbSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {}
  
  return defaultSettings;
};

export const updateSpmbSettings = (newSettings: SpmbSettings) => {
  try {
    localStorage.setItem('spmbSettings', JSON.stringify(newSettings));
    window.dispatchEvent(new Event('spmbSettingsUpdated'));
  } catch (e: any) {
    console.error("Failed to save settings:", e);
    if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
      alert("Gagal menyimpan pengaturan: Ukuran file gambar Logo terlalu besar! Silakan gunakan gambar yang lebih kecil (maksimal 500KB) atau hapus logo saat ini.");
    } else {
      alert("Terjadi kesalahan saat menyimpan pengaturan.");
    }
    throw e;
  }
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
