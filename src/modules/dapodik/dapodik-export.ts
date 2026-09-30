/* eslint-disable @typescript-eslint/no-explicit-any */
import { employeeIssues, employeeNationalId, employmentLabel, ENTRY_TYPES, ptkTypeLabel, studentIssues } from "./dapodik-config";

const date = (value?: string | null) => (value ? new Date(value) : null);
const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));

/**
 * Builds an .xlsx with the Dapodik data sheets (Peserta Didik, PTK, Rombel) plus a validation
 * sheet listing what is still missing. Identity numbers are written as text so Excel keeps the
 * leading zeros and does not turn 16-digit NIKs into scientific notation.
 */
export async function buildDapodikWorkbook(input: { schoolName: string; students: any[]; employees: any[]; classes: any[] }) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = input.schoolName;
  workbook.created = new Date();

  const addSheet = (name: string, columns: Array<{ header: string; key: string; width?: number; text?: boolean; date?: boolean }>, rows: any[]) => {
    const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = columns.map((column) => ({ header: column.header, key: column.key, width: column.width || 18 }));
    rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    columns.forEach((column, index) => {
      if (column.text) sheet.getColumn(index + 1).numFmt = "@";
      if (column.date) sheet.getColumn(index + 1).numFmt = "dd/mm/yyyy";
    });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    return sheet;
  };

  addSheet("Peserta Didik", [
    { header: "No", key: "no", width: 6 }, { header: "Nama", key: "nama", width: 30 }, { header: "NIPD", key: "nipd", text: true },
    { header: "JK", key: "jk", width: 6 }, { header: "NISN", key: "nisn", text: true }, { header: "Tempat Lahir", key: "tempat" },
    { header: "Tanggal Lahir", key: "tgl", date: true, width: 14 }, { header: "NIK", key: "nik", text: true, width: 20 }, { header: "Agama", key: "agama" },
    { header: "Alamat", key: "alamat", width: 32 }, { header: "RT", key: "rt", text: true, width: 6 }, { header: "RW", key: "rw", text: true, width: 6 },
    { header: "Dusun", key: "dusun" }, { header: "Kelurahan", key: "kelurahan" }, { header: "Kecamatan", key: "kecamatan" },
    { header: "Kode Pos", key: "kodepos", text: true, width: 10 }, { header: "Jenis Tinggal", key: "tinggal" }, { header: "Alat Transportasi", key: "transport" },
    { header: "HP", key: "hp", text: true }, { header: "Nama Ayah", key: "ayah", width: 26 }, { header: "Tahun Lahir Ayah", key: "ayah_thn", width: 10 },
    { header: "Pendidikan Ayah", key: "ayah_pend" }, { header: "Pekerjaan Ayah", key: "ayah_kerja" }, { header: "Penghasilan Ayah", key: "ayah_hasil", width: 26 },
    { header: "NIK Ayah", key: "ayah_nik", text: true, width: 20 }, { header: "Nama Ibu", key: "ibu", width: 26 }, { header: "Tahun Lahir Ibu", key: "ibu_thn", width: 10 },
    { header: "Pendidikan Ibu", key: "ibu_pend" }, { header: "Pekerjaan Ibu", key: "ibu_kerja" }, { header: "Penghasilan Ibu", key: "ibu_hasil", width: 26 },
    { header: "NIK Ibu", key: "ibu_nik", text: true, width: 20 }, { header: "Rombel Saat Ini", key: "rombel" }, { header: "No Registrasi Akta Lahir", key: "akta", text: true },
    { header: "Nomor KIP", key: "kip", text: true }, { header: "Kebutuhan Khusus", key: "kk_khusus" }, { header: "Sekolah Asal", key: "asal", width: 24 },
    { header: "Anak ke-berapa", key: "anakke", width: 8 }, { header: "No KK", key: "nokk", text: true, width: 20 }, { header: "Berat Badan", key: "bb", width: 8 },
    { header: "Tinggi Badan", key: "tb", width: 8 }, { header: "Lingkar Kepala", key: "lk", width: 8 }, { header: "Jml. Saudara Kandung", key: "saudara", width: 8 },
    { header: "Jarak Rumah ke Sekolah (KM)", key: "jarak", width: 10 }, { header: "Jenis Pendaftaran", key: "daftar" }, { header: "Tanggal Masuk", key: "masuk", date: true, width: 14 },
  ], input.students.map((s, index) => ({
    no: index + 1, nama: s.full_name, nipd: text(s.nis), jk: s.gender, nisn: text(s.nisn), tempat: s.birth_place, tgl: date(s.date_of_birth), nik: text(s.nik),
    agama: s.religion, alamat: s.address, rt: text(s.rt), rw: text(s.rw), dusun: s.hamlet, kelurahan: s.village, kecamatan: s.district, kodepos: text(s.postal_code),
    tinggal: s.residence_type, transport: s.transportation, hp: text(s.mother?.phone || s.father?.phone || s.emergency_contact_phone),
    ayah: s.father?.full_name, ayah_thn: s.father?.birth_year, ayah_pend: s.father?.education, ayah_kerja: s.father?.occupation, ayah_hasil: s.father?.income_range, ayah_nik: text(s.father?.nik),
    ibu: s.mother?.full_name, ibu_thn: s.mother?.birth_year, ibu_pend: s.mother?.education, ibu_kerja: s.mother?.occupation, ibu_hasil: s.mother?.income_range, ibu_nik: text(s.mother?.nik),
    rombel: s.classes?.name, akta: text(s.birth_certificate_number), kip: text(s.kip_number), kk_khusus: s.special_needs || "Tidak ada", asal: s.previous_school,
    anakke: s.child_order, nokk: text(s.family_card_number), bb: s.weight_kg, tb: s.height_cm, lk: s.head_circumference_cm, saudara: s.siblings_count,
    jarak: s.distance_to_school_km, daftar: ENTRY_TYPES[s.entry_type] || "", masuk: date(s.entry_date),
  })));

  addSheet("PTK", [
    { header: "No", key: "no", width: 6 }, { header: "Nama", key: "nama", width: 30 }, { header: "NUPTK", key: "nuptk", text: true, width: 20 },
    { header: "JK", key: "jk", width: 6 }, { header: "Tempat Lahir", key: "tempat" }, { header: "Tanggal Lahir", key: "tgl", date: true, width: 14 },
    { header: "NIP", key: "nip", text: true, width: 20 }, { header: "Status Kepegawaian", key: "status" }, { header: "Jenis PTK", key: "jenis" },
    { header: "Agama", key: "agama" }, { header: "Alamat", key: "alamat", width: 32 }, { header: "HP", key: "hp", text: true }, { header: "Email", key: "email", width: 26 },
    { header: "NIK", key: "nik", text: true, width: 20 }, { header: "Pendidikan Terakhir", key: "pend" }, { header: "Sertifikasi", key: "sert" },
    { header: "Tanggal Mulai Bertugas", key: "mulai", date: true, width: 14 }, { header: "Unit", key: "unit" },
  ], input.employees.map((e, index) => ({
    no: index + 1, nama: e.full_name, nuptk: text(e.nuptk), jk: e.gender === "laki_laki" ? "L" : e.gender === "perempuan" ? "P" : "", tempat: e.birth_place, tgl: date(e.birth_date),
    nip: text(e.nip), status: employmentLabel(e.employment_type), jenis: ptkTypeLabel(e.position), agama: e.religion, alamat: e.address, hp: text(e.phone), email: e.email,
    nik: text(employeeNationalId(e)), pend: e.education, sert: e.certification, mulai: date(e.join_date), unit: e.units?.name,
  })));

  addSheet("Rombel", [
    { header: "No", key: "no", width: 6 }, { header: "Nama Rombel", key: "nama" }, { header: "Tingkat", key: "tingkat", width: 8 },
    { header: "Wali Kelas", key: "wali", width: 28 }, { header: "Unit", key: "unit" }, { header: "Tahun Ajaran", key: "tahun" }, { header: "Jumlah Siswa", key: "jumlah", width: 10 },
  ], input.classes.map((c, index) => ({
    no: index + 1, nama: c.name, tingkat: c.grade_level ?? c.level, wali: c.homeroom?.full_name, unit: c.units?.name, tahun: c.academic_years?.name,
    jumlah: input.students.filter((s) => s.class_id === c.id).length,
  })));

  const validation = [
    ...input.students.map((s) => ({ jenis: "Peserta Didik", nama: s.full_name, rombel: s.classes?.name, kurang: studentIssues(s).join(", ") })),
    ...input.employees.map((e) => ({ jenis: "PTK", nama: e.full_name, rombel: e.units?.name, kurang: employeeIssues(e).join(", ") })),
  ].filter((row) => row.kurang);
  addSheet("Validasi", [
    { header: "Jenis", key: "jenis", width: 14 }, { header: "Nama", key: "nama", width: 30 }, { header: "Rombel/Unit", key: "rombel", width: 16 },
    { header: "Data belum lengkap / tidak valid", key: "kurang", width: 90 },
  ], validation);

  return { workbook, issues: validation.length };
}

export async function exportDapodikWorkbook(input: { schoolName: string; students: any[]; employees: any[]; classes: any[] }) {
  const { workbook, issues } = await buildDapodikWorkbook(input);
  const validationCount = issues;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as unknown as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Data Dapodik ${input.schoolName.replace(/[\\/:*?"<>|]+/g, "_")} ${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { students: input.students.length, employees: input.employees.length, classes: input.classes.length, issues: validationCount };
}
