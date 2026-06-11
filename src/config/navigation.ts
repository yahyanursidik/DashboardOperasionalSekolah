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
  Megaphone
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
        title: "Guru & Pegawai",
        href: "/teachers",
        icon: Users,
        resource: "teachers",
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
        title: "Absensi",
        href: "/attendance",
        icon: CalendarCheck,
        resource: "attendance_records",
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
