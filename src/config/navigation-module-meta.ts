import { BookOpen, BriefcaseBusiness, CalendarCheck, Database, FileBadge, FolderOpen, GraduationCap, HeartHandshake, School, Wallet, Wrench } from "lucide-react";
import type { NavigationGroup } from "./navigation";

const moduleMeta = {
  "Operasional Harian": { title: "Operasional", description: "Kalender, pengumuman, dan tindak lanjut harian.", icon: CalendarCheck },
  "LMS & Pembelajaran Digital": { title: "LMS & E-learning", description: "Program, pertemuan, materi, dan laporan keluarga.", icon: GraduationCap },
  "Kesiswaan & Akademik": { title: "Siswa & Akademik", description: "Data siswa, kelas, kurikulum, absensi, dan nilai.", icon: School },
  "SPMB": { title: "Penerimaan Siswa", description: "Prospek, pendaftar, pengaturan, dan laporan SPMB.", icon: HeartHandshake },
  "Rapor Digital": { title: "Rapor Digital", description: "Siapkan, tinjau, setujui, dan terbitkan rapor.", icon: FileBadge },
  "Program Tahfidz": { title: "Tahfidz", description: "Halaqoh, hafalan, mutaba’ah, dan munaqosyah.", icon: BookOpen },
  "Program Tahsin": { title: "Tahsin", description: "Halaqoh, tilawah, jurnal, dan kenaikan jilid.", icon: BookOpen },
  "Modul PAUD (KB/TK)": { title: "PAUD · KB/TK", description: "Observasi, asesmen, dan kurikulum fase fondasi.", icon: School },
  "SDM & Kepegawaian": { title: "SDM & Pegawai", description: "Pegawai, jadwal, presensi, izin, kinerja, dan gaji.", icon: BriefcaseBusiness },
  "Keuangan & Bendahara": { title: "Keuangan", description: "Tagihan, pembayaran, kas, anggaran, dan akuntansi.", icon: Wallet },
  "Sarana & Prasarana": { title: "Sarana & Prasarana", description: "Inventaris, peminjaman, pemeliharaan, dan ruangan.", icon: Wrench },
  "Tata Usaha & Dokumen": { title: "Tata Usaha", description: "Persuratan, arsip, layanan, dan panduan sekolah.", icon: FolderOpen },
  "Sistem & Laporan": { title: "Sistem & Laporan", description: "Data induk, komunikasi, laporan, dan pengaturan.", icon: Database },
};

/** New groups work without requiring a redesign or a new route. */
export function getNavigationModuleMeta(group: NavigationGroup) {
  return moduleMeta[group.name as keyof typeof moduleMeta] || { title: group.name, description: "Fitur dan layanan dalam modul ini.", icon: group.items[0]?.icon || FolderOpen };
}
