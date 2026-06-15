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
  Briefcase
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
    ],
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
