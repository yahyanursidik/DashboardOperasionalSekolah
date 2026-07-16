export type EmployeePositionCategory = "leadership" | "academic" | "operations";

export interface EmployeePositionDefinition {
  value: string;
  label: string;
  category: EmployeePositionCategory;
  portal: "teacher" | "staff";
  allowedScheduleTypes: string[];
  description: string;
}

const teachingSchedules = ["mengajar", "piket", "standby"];
const operationalSchedules = ["piket", "standby"];

export const employeePositions: EmployeePositionDefinition[] = [
  { value: "kepala_sekolah", label: "Kepala Sekolah", category: "leadership", portal: "teacher", allowedScheduleTypes: teachingSchedules, description: "Jabatan struktural pimpinan sekolah; tetap dapat menerima penugasan mengajar." },
  { value: "wakasek_umum", label: "Wakil Kepala Sekolah (Umum)", category: "leadership", portal: "teacher", allowedScheduleTypes: teachingSchedules, description: "Jabatan struktural wakil pimpinan bidang umum." },
  { value: "wakasek_kurikulum", label: "Wakasek Bidang Kurikulum", category: "leadership", portal: "teacher", allowedScheduleTypes: teachingSchedules, description: "Jabatan struktural pengelola mutu kurikulum dan pembelajaran." },
  { value: "wakasek_kesiswaan", label: "Wakasek Bidang Kesiswaan", category: "leadership", portal: "teacher", allowedScheduleTypes: teachingSchedules, description: "Jabatan struktural pengelola pembinaan dan layanan siswa." },
  { value: "kepala_unit", label: "Kepala Unit", category: "leadership", portal: "teacher", allowedScheduleTypes: teachingSchedules, description: "Pimpinan satu unit pendidikan; gunakan unit induk untuk ruang lingkup utama." },
  { value: "guru", label: "Guru / Pengajar", category: "academic", portal: "teacher", allowedScheduleTypes: teachingSchedules, description: "Tenaga pendidik umum; kelas dan mata pelajaran ditentukan melalui penugasan periode." },
  { value: "guru_quran", label: "Guru Al-Qur'an", category: "academic", portal: "teacher", allowedScheduleTypes: teachingSchedules, description: "Tenaga pendidik Al-Qur'an; halaqoh dan jadwal dikelola pada modul terkait." },
  { value: "bk", label: "Bimbingan dan Konseling", category: "academic", portal: "teacher", allowedScheduleTypes: teachingSchedules, description: "Tenaga pendidik layanan konseling dan pembinaan siswa." },
  { value: "school_center", label: "School Center", category: "operations", portal: "staff", allowedScheduleTypes: operationalSchedules, description: "Layanan pusat sekolah dan dukungan operasional lintas unit." },
  { value: "bendahara", label: "Bendahara / Keuangan", category: "operations", portal: "staff", allowedScheduleTypes: operationalSchedules, description: "Pengelola transaksi, kas, anggaran, dan pertanggungjawaban keuangan." },
  { value: "penanggung_jawab", label: "Penanggung Jawab", category: "operations", portal: "staff", allowedScheduleTypes: operationalSchedules, description: "Penanggung jawab layanan atau area operasional tertentu." },
  { value: "pustakawan", label: "Pustakawan", category: "operations", portal: "staff", allowedScheduleTypes: operationalSchedules, description: "Pengelola layanan dan koleksi perpustakaan." },
  { value: "laboran", label: "Laboran", category: "operations", portal: "staff", allowedScheduleTypes: operationalSchedules, description: "Pengelola laboratorium, alat, bahan, dan keselamatan kerja." },
  { value: "tu", label: "Tata Usaha", category: "operations", portal: "staff", allowedScheduleTypes: operationalSchedules, description: "Pelaksana administrasi, persuratan, dan layanan tata usaha." },
  { value: "sarpras", label: "Sarana Prasarana", category: "operations", portal: "staff", allowedScheduleTypes: operationalSchedules, description: "Pengelola aset, fasilitas, pemeliharaan, dan kebutuhan sarpras." },
  { value: "satpam", label: "Satpam / Keamanan", category: "operations", portal: "staff", allowedScheduleTypes: ["shift_keamanan", "standby"], description: "Petugas keamanan dengan jadwal shift dan aturan presensi khusus." },
  { value: "cleaning_service", label: "Cleaning Service", category: "operations", portal: "staff", allowedScheduleTypes: ["shift_kebersihan", "standby"], description: "Petugas kebersihan dengan area kerja dan jadwal shift operasional." },
  { value: "lainnya", label: "Staf Pendukung Lainnya", category: "operations", portal: "staff", allowedScheduleTypes: operationalSchedules, description: "Peran operasional lain yang belum memiliki klasifikasi khusus." },
];

export const employeePositionMap = Object.fromEntries(employeePositions.map((position) => [position.value, position]));

export const academicAssignmentTypes = [
  { value: "wali_kelas", label: "Wali Kelas", requiresClass: true, requiresSubject: false },
  { value: "guru_mapel", label: "Guru Mata Pelajaran", requiresClass: true, requiresSubject: true },
  { value: "guru_diniyah", label: "Guru Diniyah", requiresClass: true, requiresSubject: true },
];

export const employmentTypeOptions = [
  { value: "permanent", label: "Pegawai Tetap" },
  { value: "contract", label: "Pegawai Kontrak" },
  { value: "part_time", label: "Part-time / Honorer" },
  { value: "volunteer", label: "Relawan / Mitra" },
];

export const attendanceModeOptions = [
  {
    value: "unit_hours",
    label: "Mengikuti Jam Unit",
    description: "Acuan hadir mengikuti kebijakan unit induk atau shift khusus yang ditetapkan.",
  },
  {
    value: "teaching_schedule",
    label: "Sesuai Jadwal Mengajar",
    description: "Khusus pengajar part-time: hadir dari pelajaran pertama sampai tugas mengajar terakhir pada hari itu.",
  },
];

export function getEmploymentType(value?: string | null) {
  return employmentTypeOptions.find((option) => option.value === value) || employmentTypeOptions[0];
}

export function getAttendanceMode(value?: string | null) {
  return attendanceModeOptions.find((option) => option.value === value) || attendanceModeOptions[0];
}

export function getEmployeePosition(position?: string | null) {
  return employeePositionMap[position || ""] || {
    value: position || "lainnya",
    label: position ? position.replace(/_/g, " ") : "Belum ditentukan",
    category: "operations" as const,
    portal: "staff" as const,
    allowedScheduleTypes: operationalSchedules,
    description: "Klasifikasi jabatan belum dilengkapi.",
  };
}

export function canReceiveAcademicAssignment(position?: string | null) {
  const definition = getEmployeePosition(position);
  return definition.category === "academic" || definition.category === "leadership";
}
