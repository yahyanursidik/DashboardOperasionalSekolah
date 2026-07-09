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
  Truck,
  ShoppingCart,
  Target,
  Award,
  Camera,
  CheckSquare,
  TrendingUp,
  ClipboardCheck,
  Building,
  ShieldCheck,
  Send,
  BarChart3,
  FileDown
} from "lucide-react";
import type { RoleName } from "../lib/permissions";

export interface NavigationItem {
  title: string;
  href: string;
  icon: any;
  resource?: string; // Resource required to access
  roles?: RoleName[]; // Alternative explicit roles
}

export interface NavigationGroup {
  name: string;
  items: NavigationItem[];
}

export const navigationConfig: NavigationGroup[] = [
  {
    name: "Dashboard & Beranda",
    items: [
      {
        title: "Beranda",
        href: "/",
        icon: Home,
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
      },
      {
        title: "Task Admin",
        href: "/tasks",
        icon: ClipboardList,
        resource: "admin_tasks",
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
      },
      {
        title: "Orang Tua / Wali",
        href: "/parents",
        icon: Users,
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
      },
      {
        title: "Dokumen Kurikulum",
        href: "/curriculum/documents",
        icon: FileText,
        resource: "curriculum_documents",
      },
      {
        title: "Absensi Siswa",
        href: "/attendance",
        icon: CalendarCheck,
        resource: "attendance_records",
      },
      {
        title: "Gradebook (Nilai)",
        href: "/academic/gradebook",
        icon: BookOpen,
        resource: "academic_grades",
      },
      {
        title: "Master Rapor Siswa",
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
    name: "Penerimaan Siswa Baru",
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
      {
        title: "Ujian Online (CBT)",
        href: "/recruitment/cbt/exams",
        icon: BookOpen,
        resource: "cbt_exams",
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
        title: "Generate Rapor",
        href: "/reports/generate",
        icon: Target,
        resource: "report_periods",
      },
      {
        title: "Input Guru",
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
        title: "Munaqosyah/Ujian",
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
    name: "SDM & Kepegawaian (HRD)",
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
        title: "Pengajuan Izin",
        href: "/leaves",
        icon: ClipboardList,
        resource: "leave_requests",
      },
      {
        title: "Guru Inval",
        href: "/substitutes",
        icon: Users,
        resource: "substitute_assignments",
      },
      {
        title: "Rekrutmen Pegawai",
        href: "/recruitment",
        icon: Briefcase,
        resource: "recruitment_vacancies",
      },
      {
        title: "PKG / Kinerja Guru",
        href: "/pkg",
        icon: ClipboardCheck,
        resource: "pkg_assessments",
      },
      {
        title: "Pengaturan Instrumen PKG",
        href: "/pkg/settings",
        icon: Settings,
        resource: "pkg_assessments",
      },
    ],
  },
  {
    name: "Keuangan & Bendahara",
    items: [
      {
        title: "Dashboard Keuangan",
        href: "/finance",
        icon: Wallet,
        resource: "student_invoices",
      },
      {
        title: "Tagihan & Pembayaran",
        href: "/finance/invoices",
        icon: Receipt,
        resource: "student_invoices",
      },
      {
        title: "Verifikasi Transfer",
        href: "/finance/verifications",
        icon: CheckCircle,
        resource: "payment_transactions",
      },
      {
        title: "Buku Kas (Pengeluaran)",
        href: "/finance/expenses",
        icon: CreditCard,
        resource: "school_expenses",
      },
      {
        title: "Kategori Biaya",
        href: "/finance/categories",
        icon: Tag,
        resource: "finance_categories",
      },
      {
        title: "Pengaturan Biaya SPMB",
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
        title: "Manajemen Aset",
        href: "/sarpras/assets",
        icon: Package,
        resource: "assets",
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
        title: "Tata Usaha (Surat)",
        href: "/mail",
        icon: Inbox,
        resource: "mail_records",
      },
      {
        title: "Dokumen & Surat",
        href: "/documents",
        icon: FileText,
        resource: "documents",
      },
      {
        title: "Perpustakaan Digital",
        href: "/digital-library",
        icon: BookOpen,
        resource: "digital_library_books",
      },
      {
        title: "Materi Onboarding",
        href: "/onboarding",
        icon: Target,
        resource: "onboarding_materials",
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
        resource: "settings",
      },
      {
        title: "Komunikasi",
        href: "/communications",
        icon: MessageSquare,
        resource: "students",
      },
      {
        title: "Laporan",
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
