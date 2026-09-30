/* eslint-disable @typescript-eslint/no-explicit-any */
// Reference values follow the options commonly used in Dapodik data entry. Double-check against
// the Dapodik version in use before importing, since the ministry updates references over time.

export const RELIGIONS = ["Islam", "Kristen", "Katholik", "Hindu", "Budha", "Khonghucu", "Kepercayaan kpd Tuhan YME"];
export const RESIDENCE_TYPES = ["Bersama orang tua", "Wali", "Kos", "Asrama", "Panti asuhan", "Pesantren", "Lainnya"];
export const TRANSPORTATION = ["Jalan kaki", "Kendaraan pribadi", "Kendaraan umum/angkot", "Jemputan sekolah", "Kereta api", "Ojek", "Sepeda", "Lainnya"];
export const EDUCATION_LEVELS = ["Tidak sekolah", "SD / sederajat", "SMP / sederajat", "SMA / sederajat", "D1", "D2", "D3", "D4", "S1", "Profesi", "S2", "S3", "Lainnya"];
export const OCCUPATIONS = ["Tidak bekerja", "Nelayan", "Petani", "Peternak", "PNS/TNI/Polri", "Karyawan Swasta", "Karyawan BUMN", "Pedagang Kecil", "Pedagang Besar", "Wiraswasta", "Wirausaha", "Buruh", "Pensiunan", "Guru/Dosen", "Tenaga Kesehatan", "Sudah Meninggal", "Lainnya"];
export const INCOME_RANGES = ["Tidak Berpenghasilan", "Kurang dari Rp. 500,000", "Rp. 500,000 - Rp. 999,999", "Rp. 1,000,000 - Rp. 1,999,999", "Rp. 2,000,000 - Rp. 4,999,999", "Rp. 5,000,000 - Rp. 20,000,000", "Lebih dari Rp. 20,000,000"];
export const ENTRY_TYPES: Record<string, string> = { siswa_baru: "Siswa Baru", pindahan: "Pindahan", kembali_bersekolah: "Kembali Bersekolah" };

export const onlyDigits = (value: unknown, length: number) => new RegExp(`^[0-9]{${length}}$`).test(String(value ?? ""));

export type StudentWithFamily = any & { father?: any; mother?: any };

/** Mandatory Dapodik data for a student; returns the list of missing/invalid items. */
export function studentIssues(student: StudentWithFamily): string[] {
  const issues: string[] = [];
  if (!student.full_name) issues.push("Nama");
  if (!["L", "P"].includes(student.gender)) issues.push("Jenis kelamin");
  if (!onlyDigits(student.nisn, 10)) issues.push("NISN (10 digit)");
  if (!onlyDigits(student.nik, 16)) issues.push("NIK (16 digit)");
  if (!onlyDigits(student.family_card_number, 16)) issues.push("No. KK");
  if (!student.birth_place) issues.push("Tempat lahir");
  if (!student.date_of_birth) issues.push("Tanggal lahir");
  if (!student.religion) issues.push("Agama");
  if (!student.address) issues.push("Alamat");
  if (!student.village) issues.push("Desa/Kelurahan");
  if (!student.district) issues.push("Kecamatan");
  if (!student.residence_type) issues.push("Jenis tinggal");
  if (!student.transportation) issues.push("Alat transportasi");
  if (!student.mother?.full_name) issues.push("Nama ibu kandung");
  return issues;
}

const STUDENT_REQUIRED_COUNT = 14;
export const completeness = (issues: string[], total = STUDENT_REQUIRED_COUNT) => Math.round(((total - issues.length) / total) * 100);

const TEACHING_POSITIONS = new Set(["guru", "guru_quran", "bk", "kepala_sekolah", "wakasek_umum", "wakasek_kurikulum", "wakasek_kesiswaan", "kepala_unit"]);
export const isTeachingStaff = (employee: any) => TEACHING_POSITIONS.has(String(employee?.position || ""));

export function employeeIssues(employee: any): string[] {
  const issues: string[] = [];
  if (!employee.full_name) issues.push("Nama");
  if (!["laki_laki", "perempuan"].includes(employee.gender)) issues.push("Jenis kelamin");
  if (!onlyDigits(employeeNationalId(employee), 16)) issues.push("NIK KTP (16 digit)");
  if (!employee.birth_place) issues.push("Tempat lahir");
  if (!employee.birth_date) issues.push("Tanggal lahir");
  if (!employee.religion) issues.push("Agama");
  if (!employee.employment_type) issues.push("Status kepegawaian");
  if (isTeachingStaff(employee) && employee.nuptk && !onlyDigits(employee.nuptk, 16)) issues.push("NUPTK (16 digit)");
  return issues;
}
export const EMPLOYEE_REQUIRED_COUNT = 7;

/** KTP NIK for Dapodik: national_id, or the login NIK only when it happens to be a 16-digit KTP number. */
export const employeeNationalId = (employee: any) => employee?.national_id || (onlyDigits(employee?.nik, 16) ? employee.nik : "");

export const ptkTypeLabel = (position?: string | null) => {
  if (!position) return "Tenaga Kependidikan";
  if (position === "kepala_sekolah" || position === "kepala_unit") return "Kepala Sekolah";
  if (position === "bk") return "Guru BK";
  if (TEACHING_POSITIONS.has(position)) return "Guru Mapel";
  return "Tenaga Kependidikan";
};

export const employmentLabel = (value?: string | null) =>
  ({ permanent: "GTY/PTY", part_time: "Guru Honor Sekolah", contract: "Honor Kontrak" } as Record<string, string>)[value || ""] || value || "";
