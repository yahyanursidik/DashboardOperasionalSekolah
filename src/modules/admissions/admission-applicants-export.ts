import ExcelJS from "exceljs";
import { admissionStatusMeta, formatAdmissionDate, getAdmissionStatus } from "./admissions-config";
import { applicantTargetLabel, entryTypeLabel } from "./quota-utils";

type ApplicantExportOptions = {
  rows: any[];
  filterLabel: string;
};

const colors = {
  darkGreen: "075E4A",
  green: "0B8568",
  paleGreen: "E8F5EF",
  paleBlue: "EAF2FF",
  paleAmber: "FFF7E6",
  slate: "F4F7F6",
  border: "D7E2DE",
  muted: "61706B",
  white: "FFFFFF",
};

const border = {
  top: { style: "thin" as const, color: { argb: colors.border } },
  left: { style: "thin" as const, color: { argb: colors.border } },
  bottom: { style: "thin" as const, color: { argb: colors.border } },
  right: { style: "thin" as const, color: { argb: colors.border } },
};

const safeText = (value: unknown) => {
  const text = String(value ?? "").trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};

function downloadWorkbook(buffer: ExcelJS.Buffer, filename: string) {
  const blob = new Blob([buffer as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename.replace(/[\\/:*?"<>|]+/g, "_")}.xlsx`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function styleTitle(sheet: ExcelJS.Worksheet, lastColumn: number, title: string, subtitle: string) {
  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.mergeCells(2, 1, 2, lastColumn);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: colors.white } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.darkGreen } };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { italic: true, size: 10, color: { argb: colors.muted } };
  subtitleCell.alignment = { horizontal: "left", vertical: "middle" };
  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 20;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: colors.white }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.green } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = border;
  });
}

function styleDataRows(sheet: ExcelJS.Worksheet, startRow: number, columnCount: number) {
  for (let rowNumber = startRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      if (columnNumber > columnCount) return;
      cell.border = border;
      cell.alignment = { vertical: "middle", wrapText: columnNumber === 2 || columnNumber === 19 };
      if ((rowNumber - startRow) % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.slate } };
    });
  }
}

export async function exportAdmissionsApplicantsWorkbook({ rows, filterLabel }: ApplicantExportOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TSLS Admin OS";
  workbook.created = new Date();
  // ExcelJS menempatkan metadata dokumen pada Workbook, bukan WorkbookProperties.
  workbook.title = "Rekap Pendaftar SPMB";
  workbook.subject = "Ekspor data pendaftar SPMB";

  const statusCounts = rows.reduce<Record<string, number>>((counts, row) => {
    const status = getAdmissionStatus(row);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  const summarySheet = workbook.addWorksheet("Ringkasan", {
    views: [{ state: "frozen", ySplit: 6 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  summarySheet.properties.showGridLines = false;
  styleTitle(summarySheet, 6, "REKAP PENDAFTAR SPMB", filterLabel);
  summarySheet.mergeCells(4, 1, 4, 6);
  summarySheet.getCell(4, 1).value = `Dibuat: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date())} WIB`;
  summarySheet.getCell(4, 1).font = { size: 10, color: { argb: colors.muted } };
  summarySheet.getCell(4, 1).alignment = { vertical: "middle" };
  const summaryRows = [
    ["Total pendaftar", rows.length, colors.paleBlue],
    ["Draf", statusCounts.draft || 0, colors.slate],
    ["Dikirim / diperiksa", (statusCounts.submitted || 0) + (statusCounts.documents_review || 0) + (statusCounts.verified || 0), colors.paleAmber],
    ["Diterima", statusCounts.accepted || 0, colors.paleGreen],
    ["Menjadi siswa", statusCounts.enrolled || 0, colors.paleGreen],
  ] as const;
  summaryRows.forEach(([label, value, fill], index) => {
    const rowNumber = 6 + index;
    summarySheet.getCell(rowNumber, 1).value = label;
    summarySheet.getCell(rowNumber, 2).value = value;
    [summarySheet.getCell(rowNumber, 1), summarySheet.getCell(rowNumber, 2)].forEach((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      cell.border = border;
      cell.alignment = { vertical: "middle" };
    });
    summarySheet.getCell(rowNumber, 1).font = { bold: true, color: { argb: colors.muted } };
    summarySheet.getCell(rowNumber, 2).font = { bold: true, size: 12, color: { argb: colors.darkGreen } };
  });
  summarySheet.getCell(12, 1).value = "Status";
  summarySheet.getCell(12, 2).value = "Jumlah";
  styleHeader(summarySheet.getRow(12));
  Object.entries(statusCounts).sort(([left], [right]) => left.localeCompare(right)).forEach(([status, value]) => {
    summarySheet.addRow([admissionStatusMeta[status as keyof typeof admissionStatusMeta]?.label || status, value]);
  });
  styleDataRows(summarySheet, 13, 2);
  summarySheet.columns = [{ width: 28 }, { width: 14 }, { width: 4 }, { width: 24 }, { width: 24 }, { width: 24 }];

  const headers = [
    "No. Pendaftaran", "Nama Calon Murid", "NIK", "NISN", "Tanggal Daftar", "Status", "Unit", "Tahun Ajaran", "Gelombang", "Kelas Tujuan", "Jalur", "Jenis Kelamin", "Tempat Lahir", "Tanggal Lahir", "Orang Tua / Wali", "No. WhatsApp", "Email Orang Tua", "Pendidikan Orang Tua", "Alamat", "Kota / Kabupaten", "Provinsi", "Sekolah Asal", "Biaya Pendaftaran", "Status Tarif Staf", "Zona Waktu HBL",
  ];
  const applicantsSheet = workbook.addWorksheet("Pendaftar", {
    views: [{ state: "frozen", ySplit: 6, xSplit: 2 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  applicantsSheet.properties.showGridLines = false;
  styleTitle(applicantsSheet, headers.length, "DATA PENDAFTAR SPMB", filterLabel);
  applicantsSheet.mergeCells(4, 1, 4, headers.length);
  applicantsSheet.getCell(4, 1).value = "Gunakan filter pada judul kolom untuk menyaring data. Nomor identitas dan WhatsApp diekspor sebagai teks agar tidak berubah di Excel.";
  applicantsSheet.getCell(4, 1).font = { size: 10, color: { argb: colors.muted } };
  applicantsSheet.getCell(4, 1).alignment = { vertical: "middle" };
  const headerRow = applicantsSheet.getRow(6);
  headerRow.values = headers;
  styleHeader(headerRow);
  rows.forEach((row) => {
    const status = getAdmissionStatus(row);
    const added = applicantsSheet.addRow([
      safeText(row.registration_number), safeText(row.name), safeText(row.nik), safeText(row.nisn), row.registration_date ? new Date(row.registration_date) : null,
      admissionStatusMeta[status].label, safeText(row.units?.name || row.unit), safeText(row.academic_years?.name || row.academic_year), safeText(row.admission_batches?.name), safeText(applicantTargetLabel(row)), entryTypeLabel(row.entry_type), safeText(row.gender), safeText(row.birth_place), row.dob ? new Date(`${row.dob}T00:00:00`) : null,
      safeText(row.parent_name), safeText(row.parent_phone), safeText(row.parent_email), safeText(row.parent_education_level), safeText(row.address), safeText(row.domicile_regency), safeText(row.domicile_province), safeText(row.previous_school), Number(row.registration_fee_amount ?? 0), safeText(row.staff_fee_status), safeText(row.learning_timezone),
    ]);
    added.getCell(5).numFmt = "dd mmm yyyy hh:mm";
    added.getCell(14).numFmt = "dd mmm yyyy";
    added.getCell(23).numFmt = "#,##0";
    [1, 3, 4, 16].forEach((column) => { added.getCell(column).numFmt = "@"; });
  });
  styleDataRows(applicantsSheet, 7, headers.length);
  applicantsSheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: headers.length } };
  applicantsSheet.columns = [
    { width: 19 }, { width: 28 }, { width: 20 }, { width: 18 }, { width: 20 }, { width: 23 }, { width: 22 }, { width: 18 }, { width: 15 }, { width: 20 },
    { width: 15 }, { width: 14 }, { width: 20 }, { width: 17 }, { width: 28 }, { width: 18 }, { width: 28 }, { width: 22 }, { width: 42 }, { width: 24 },
    { width: 22 }, { width: 28 }, { width: 20 }, { width: 18 }, { width: 16 },
  ];

  await downloadWorkbook(await workbook.xlsx.writeBuffer(), `Rekap Pendaftar SPMB ${new Date().toISOString().slice(0, 10)}`);
}
