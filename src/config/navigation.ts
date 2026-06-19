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
  ClipboardCheck
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
    name: "Overview",
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
    ],
  },
  {
    name: "Akademik",
    items: [
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
        title: "Mutaba'ah (Harian)",
        href: "/quran",
        icon: BookOpen,
        resource: "quran_records",
      },
      {
        title: "Target Qur'an",
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
    name: "Master Data",
    items: [
      {
        title: "Kurikulum & Pembelajaran",
        href: "/curriculum",
        icon: BookOpen,
        resource: "subjects", // Basic requirement to access curriculum module
      },
      {
        title: "Jurnal & Rekam Jejak",
        href: "/student-journals",
        icon: BookOpen,
        resource: "student_journals",
      },
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
        title: "Data Induk",
        href: "/master-data",
        icon: Database,
        resource: "settings",
      },
      {
        title: "Dokumen Kurikulum",
        href: "/curriculum/documents",
        icon: FileText,
        resource: "curriculum_documents",
      },
      {
        title: "Dokumen & Surat",
        href: "/documents",
        icon: FileText,
        resource: "documents",
      },
      {
        title: "Tata Usaha (Surat)",
        href: "/mail",
        icon: Inbox,
        resource: "mail_records",
      },
    ],
  },
  {
    name: "Operasional",
    items: [
      {
        title: "Administrasi Siswa",
        href: "/students",
        icon: Users,
        resource: "students",
      },
      {
        title: "Penerimaan Murid Baru (SPMB)",
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
        title: "Orang Tua / Wali",
        href: "/parents",
        icon: Users,
        resource: "students",
      },
      {
        title: "Data Kelas",
        href: "/classes",
        icon: Users, // We could use Library or LayoutGrid if imported, but Users is fine for now, or maybe Building. I will just reuse Users.
        resource: "classes",
      },
      {
        title: "Absensi Siswa",
        href: "/attendance",
        icon: CalendarCheck,
        resource: "attendance_records",
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
        title: "Task Admin",
        href: "/tasks",
        icon: ClipboardList,
        resource: "admin_tasks",
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
        title: "Ekstrakurikuler",
        href: "/extracurricular",
        icon: Target,
        resource: "extracurricular",
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
    name: "Sarpras & Inventaris",
    items: [
      {
        title: "Katalog Aset",
        href: "/sarpras/assets",
        icon: Package,
        resource: "assets",
      },
      {
        title: "Peminjaman",
        href: "/sarpras/asset-loans",
        icon: Truck,
        resource: "asset_loans",
      },
      {
        title: "Pengadaan Barang",
        href: "/sarpras/procurements",
        icon: ShoppingCart,
        resource: "procurements",
      },
    ]
  },
  {
    name: "Keuangan",
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
    ],
  },
  {
    name: "Sistem",
    items: [
      {
        title: "Pengumuman",
        href: "/announcements",
        icon: Megaphone,
        resource: "announcements",
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
        icon: Settings, // We can reuse Settings or add Shield. Let's use Settings for now.
        resource: "audit_logs",
      },
      {
        title: "Pengaturan",
        href: "/settings",
        icon: Settings,
        resource: "settings",
      },
    ],
  },
];
