import {
  Home,
  Users,
  Database,
  FileText,
  MessageSquare,
  ClipboardList,
  BarChart,
  Settings,
  CalendarCheck,
  Megaphone,
  BookOpen,
  Wallet,
  Receipt,
  CreditCard,
  Tag,
  CheckCircle,
  Inbox,
  Briefcase,
  GraduationCap,
  FileBadge,
  Package,
  Target,
  Award,
  Camera,
  CheckSquare,
  TrendingUp,
  ClipboardCheck,
  Building,
  Truck,
  Wrench,
  ShoppingCart,
  ShieldCheck,
  Send,
  BarChart3,
  FileDown
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RoleName } from "../lib/permissions";

export interface NavigationItem {
  title: string;
  href: string;
  icon: LucideIcon;
  resource?: string;
  roles?: RoleName[];
  keywords?: string[];
  mobilePriority?: number;
}

export interface NavigationGroup {
  name: string;
  items: NavigationItem[];
}

export const navigationConfig: NavigationGroup[] = [
  {
    name: "Operasional Harian",
    items: [
      {
        title: "Beranda",
        href: "/",
        icon: Home,
        mobilePriority: 1,
      },
      {
        title: "Kalender Akademik",
        href: "/calendar",
        icon: CalendarCheck,
      },
      {
        title: "Pengumuman",
        href: "/announcements",
        icon: Megaphone,
        resource: "announcements",
        mobilePriority: 5,
      },
      {
        title: "Tugas & Tindak Lanjut",
        href: "/tasks",
        icon: ClipboardList,
        resource: "admin_tasks",
        keywords: ["task", "pekerjaan", "follow up"],
      },
    ],
  },
  {
    name: "Kesiswaan & Akademik",
    items: [
      {
        title: "Administrasi Siswa",
        href: "/students",
        icon: Users,
        resource: "students",
        mobilePriority: 2,
        keywords: ["murid", "peserta didik", "nis", "nisn"],
      },
      {
        title: "Orang Tua / Wali",
        href: "/parents",
        icon: Users,
        resource: "students",
        keywords: ["wali siswa", "keluarga", "portal orang tua"],
      },
      {
        title: "Layanan Orang Tua",
        href: "/parents/requests",
        icon: MessageSquare,
        resource: "students",
      },
      {
        title: "Data Kelas",
        href: "/classes",
        icon: Building,
        resource: "classes",
      },
      {
        title: "Kurikulum & Pembelajaran",
        href: "/curriculum",
        icon: BookOpen,
        resource: "subjects",
        mobilePriority: 3,
        keywords: ["mata pelajaran", "mapel", "cp", "atp", "prota", "promes"],
      },
      {
        title: "Absensi Siswa",
        href: "/attendance",
        icon: CalendarCheck,
        resource: "attendance_records",
        mobilePriority: 4,
        keywords: ["kehadiran", "presensi siswa"],
      },
      {
        title: "Nilai Akademik",
        href: "/academic/gradebook",
        icon: BookOpen,
        resource: "academic_grades",
        keywords: ["gradebook", "sas", "asat", "sts"],
      },
      {
        title: "Kelengkapan Rapor",
        href: "/academic/reports",
        icon: FileBadge,
        resource: "academic_report_cards",
      },
      {
        title: "Jurnal & Rekam Jejak",
        href: "/student-journals",
        icon: BookOpen,
        resource: "student_journals",
      },
      {
        title: "Ekstrakurikuler",
        href: "/extracurricular",
        icon: Target,
        resource: "extracurricular",
      },
    ],
  },
  {
    name: "SPMB",
    items: [
      {
        title: "Penerimaan Murid Baru",
        href: "/admissions",
        icon: GraduationCap,
        resource: "admissions",
      },
      {
        title: "Pengaturan SPMB",
        href: "/admissions/settings",
        icon: Settings,
        resource: "admissions",
      },
      {
        title: "Laporan SPMB",
        href: "/admissions/reports",
        icon: TrendingUp,
        resource: "admissions",
      },
    ],
  },
  {
    name: "Rapor Digital",
    items: [
      {
        title: "Monitoring Rapor",
        href: "/reports/monitoring",
        icon: BarChart3,
        resource: "student_reports", 
      },
      {
        title: "Periode Rapor",
        href: "/reports/periods",
        icon: CalendarCheck,
        resource: "report_periods",
      },
      {
        title: "Template Rapor",
        href: "/reports/templates",
        icon: FileBadge,
        resource: "report_templates",
      },
      {
        title: "Siapkan Rapor Siswa",
        href: "/reports/generate",
        icon: Target,
        resource: "report_periods",
      },
      {
        title: "Input Rapor oleh Guru",
        href: "/reports/teacher-input",
        icon: ClipboardCheck,
        resource: "academic_grades",
      },
      {
        title: "Review Wali Kelas",
        href: "/reports/homeroom-review",
        icon: Users,
        resource: "report_reviews", 
      },
      {
        title: "Review Wakasek",
        href: "/reports/wakasek-review",
        icon: ShieldCheck,
        resource: "report_publish_logs",
      },
      {
        title: "Approval Kepsek",
        href: "/reports/principal-approval",
        icon: Award,
        resource: "report_publish_logs",
      },
      {
        title: "Publish Rapor",
        href: "/reports/publish",
        icon: Send,
        resource: "report_publish_logs",
      },
      {
        title: "Pantau Tanda Terima",
        href: "/reports/read-receipts",
        icon: ClipboardCheck,
        resource: "student_reports",
      },
      {
        title: "Generate PDF",
        href: "/reports/pdf",
        icon: FileDown,
        resource: "report_pdf_exports", 
      },
    ],
  },
  {
    name: "Program Tahfidz",
    items: [
      {
        title: "Pembagian Halaqoh",
        href: "/tahfidz-halaqohs",
        icon: Users,
        resource: "tahfidz_halaqohs",
      },
      {
        title: "Target Hafalan",
        href: "/tahfidz-student-targets",
        icon: Target,
        resource: "tahfidz_student_targets",
      },
      {
        title: "Mutaba'ah (Harian)",
        href: "/quran",
        icon: BookOpen,
        resource: "quran_records",
      },
      {
        title: "Target Kelas (Klasikal)",
        href: "/quran-targets",
        icon: Target,
        resource: "quran_targets",
      },
      {
        title: "Munaqosyah Tahfidz",
        href: "/quran-assessments",
        icon: Award,
        resource: "quran_assessments",
      },
      {
        title: "Laporan Tahfidz",
        href: "/tahfidz-reports",
        icon: BarChart,
        resource: "tahfidz_reports",
      },
    ],
  },
  {
    name: "Program Tahsin",
    items: [
      {
        title: "Pembagian Halaqoh",
        href: "/tahsin-halaqohs",
        icon: Users,
        resource: "tahsin_halaqohs",
      },
      {
        title: "Target Tilawah/Jilid",
        href: "/tahsin-student-targets",
        icon: Target,
        resource: "tahsin_student_targets",
      },
      {
        title: "Jurnal Harian",
        href: "/tahsin-records",
        icon: BookOpen,
        resource: "tahsin_records",
      },
      {
        title: "Ujian Kenaikan Jilid",
        href: "/tahsin-assessments",
        icon: Award,
        resource: "tahsin_assessments",
      },
      {
        title: "Laporan Tahsin",
        href: "/tahsin-reports",
        icon: BarChart,
        resource: "tahsin_reports",
      },
    ],
  },
  {
    name: "Modul PAUD (KB/TK)",
    items: [
      {
        title: "Jurnal Kegiatan (Foto)",
        href: "/paud-activities",
        icon: Camera,
        resource: "paud_activities",
      },
      {
        title: "Penilaian STPPA",
        href: "/stppa-assessments",
        icon: CheckSquare,
        resource: "paud_stppa_assessments",
      },
    ],
  },
  {
    name: "SDM & Kepegawaian",
    items: [
      {
        title: "Data Pegawai",
        href: "/employees",
        icon: Users,
        resource: "employees",
      },
      {
        title: "Jadwal Pegawai",
        href: "/schedules",
        icon: CalendarCheck,
        resource: "employee_schedules",
      },
      {
        title: "Absensi Pegawai",
        href: "/attendance/employees",
        icon: CalendarCheck,
        resource: "employee_attendance",
      },
      {
        title: "Data Pendaftar",
        href: "/admissions/applicants",
        icon: Users,
        resource: "admissions",
      },
      {
        title: "Rapat & Kegiatan Pegawai",
        href: "/attendance/events",
        icon: ClipboardCheck,
        resource: "employee_attendance",
        keywords: ["rapat", "kegiatan", "pelatihan", "presensi acara"],
      },
      {
        title: "Lembur Pegawai",
        href: "/attendance/overtime",
        icon: TrendingUp,
        resource: "employee_attendance",
        keywords: ["lembur", "overtime", "kompensasi", "jam tambahan"],
      },
      {
        title: "Tinjauan Absensi",
        href: "/attendance/reviews",
        icon: ShieldCheck,
        resource: "employee_attendance",
      },
      {
        title: "Aturan & Lokasi Absensi",
        href: "/attendance/settings",
        icon: Settings,
        resource: "employee_attendance",
      },
      {
        title: "Pengajuan Izin",
        href: "/leaves",
        icon: ClipboardList,
        resource: "leave_requests",
      },
      {
        title: "Laporan Operasional Staf",
        href: "/operations/reports",
        icon: FileText,
        resource: "staff_operational_reports",
      },
      {
        title: "Guru Pengganti",
        href: "/substitutes",
        icon: Users,
        resource: "substitute_assignments",
        keywords: ["inval", "substitusi", "pengganti"],
      },
      {
        title: "Rekrutmen Pegawai",
        href: "/recruitment",
        icon: Briefcase,
        resource: "recruitment_vacancies",
      },
      {
        title: "CBT Rekrutmen",
        href: "/recruitment/cbt/exams",
        icon: BookOpen,
        resource: "recruitment_cbt",
      },
      {
        title: "PKG / Kinerja Guru",
        href: "/pkg",
        icon: ClipboardCheck,
        resource: "pkg_assessments",
      },
    ],
  },
  {
    name: "Keuangan & Bendahara",
    items: [
      {
        title: "Pusat Keuangan",
        href: "/finance",
        icon: Wallet,
        resource: "student_invoices",
      },
      {
        title: "Tagihan Siswa",
        href: "/finance/invoices",
        icon: Receipt,
        resource: "student_invoices",
      },
      {
        title: "Verifikasi Pembayaran",
        href: "/finance/verifications",
        icon: CheckCircle,
        resource: "payment_transactions",
      },
      {
        title: "Pengeluaran & Persetujuan",
        href: "/finance/expenses",
        icon: CreditCard,
        resource: "school_expenses",
      },
      {
        title: "Penerimaan Lain",
        href: "/finance/receipts",
        icon: Receipt,
        resource: "finance_receipts",
      },
      {
        title: "Kas & Bank",
        href: "/finance/cashbook",
        icon: Wallet,
        resource: "finance_cash_accounts",
      },
      {
        title: "RKAS & Anggaran",
        href: "/finance/budgets",
        icon: ClipboardList,
        resource: "finance_budgets",
      },
      {
        title: "Master Tarif & Program",
        href: "/finance/tariffs",
        icon: Settings,
        resource: "finance_fee_rates",
      },
      {
        title: "Akuntansi",
        href: "/finance/accounting",
        icon: BookOpen,
        resource: "finance_accounts",
      },
      {
        title: "Laporan Keuangan",
        href: "/finance/reports",
        icon: BarChart,
        resource: "financials",
      },
      {
        title: "Akun & Kategori Biaya",
        href: "/finance/categories",
        icon: Tag,
        resource: "finance_categories",
      },
      {
        title: "Biaya SPMB",
        href: "/finance/spmb-fees",
        icon: Settings,
        resource: "student_invoices",
      },
      {
        title: "Pengaturan Keuangan",
        href: "/finance/settings",
        icon: Settings,
        resource: "finance_settings",
      },
    ],
  },
  {
    name: "Sarana & Prasarana",
    items: [
      {
        title: "Pusat Sarpras",
        href: "/sarpras",
        icon: BarChart3,
        resource: "assets",
        keywords: ["ringkasan", "fasilitas", "inventaris"],
      },
      {
        title: "Aset & Inventaris",
        href: "/sarpras/assets",
        icon: Package,
        resource: "assets",
      },
      {
        title: "Peminjaman Aset",
        href: "/sarpras/asset-loans",
        icon: Truck,
        resource: "asset_loans",
      },
      {
        title: "Pemeliharaan",
        href: "/sarpras/maintenance",
        icon: Wrench,
        resource: "asset_maintenance_requests",
        keywords: ["kerusakan", "perbaikan", "tiket"],
      },
      {
        title: "Pengadaan Barang",
        href: "/sarpras/procurements",
        icon: ShoppingCart,
        resource: "procurements",
      },
      {
        title: "Stok Opname",
        href: "/sarpras/stocktakes",
        icon: ClipboardCheck,
        resource: "asset_stocktakes",
      },
      {
        title: "Data Ruangan",
        href: "/sarpras/rooms",
        icon: Building,
        resource: "rooms",
      },
      {
        title: "Jadwal Ruangan",
        href: "/sarpras/room-schedules",
        icon: CalendarCheck,
        resource: "room_schedules",
      },
    ]
  },
  {
    name: "Tata Usaha & Dokumen",
    items: [
      {
        title: "Pusat Administrasi",
        href: "/mail",
        icon: Inbox,
        resource: "mail_records",
        keywords: ["tata usaha", "agenda", "persuratan", "dokumen"],
      },
      {
        title: "Surat Masuk",
        href: "/mail/incoming",
        icon: Inbox,
        resource: "mail_records",
      },
      {
        title: "Surat Keluar",
        href: "/mail/outgoing",
        icon: Send,
        resource: "mail_records",
      },
      {
        title: "Disposisi Surat",
        href: "/mail/dispositions",
        icon: CheckSquare,
        resource: "mail_dispositions",
      },
      {
        title: "Arsip Dokumen Sekolah",
        href: "/documents",
        icon: FileText,
        resource: "documents",
      },
      {
        title: "Retensi & Kepatuhan",
        href: "/documents/governance",
        icon: ClipboardCheck,
        resource: "document_governance_actions",
      },
      {
        title: "Perpustakaan Digital",
        href: "/digital-library",
        icon: BookOpen,
        resource: "digital_library_books",
        keywords: ["buku", "ebook", "modul", "literasi", "koleksi", "kategori", "perpustakaan keluarga"],
      },
      {
        title: "Panduan & Onboarding",
        href: "/onboarding",
        icon: Target,
        resource: "onboarding_materials",
        keywords: ["sop", "orientasi", "panduan keluarga", "panduan guru", "panduan staf", "kebijakan wajib"],
      },
    ],
  },
  {
    name: "Sistem & Laporan",
    items: [
      {
        title: "Data Induk",
        href: "/master-data",
        icon: Database,
        resource: "master_data",
        keywords: ["unit", "tahun ajaran", "semester", "periode aktif", "kalender unit", "data referensi"],
      },
      {
        title: "Komunikasi",
        href: "/communications",
        icon: MessageSquare,
        resource: "students",
      },
      {
        title: "Laporan Manajemen",
        href: "/reports",
        icon: BarChart,
        resource: "reports",
      },
      {
        title: "Audit Trail",
        href: "/audit-logs",
        icon: ShieldCheck, 
        resource: "audit_logs",
      },
      {
        title: "Pengaturan Umum",
        href: "/settings",
        icon: Settings,
        resource: "settings",
      },
    ],
  },
];
