import ExcelJS from "exceljs";

export type EmployeeAttendanceSummaryExportRow = {
  NIK: string;
  Nama: string;
  Jabatan: string;
  Unit: string;
  "Hari Input": number;
  Hadir: number;
  Terlambat: number;
  "Total Menit Terlambat": number;
  "Pulang Awal": number;
  "Belum Absen Pulang": number;
  Sakit: number;
  Izin: number;
  Alpa: number;
  Terverifikasi: number;
  "Total Durasi": string;
};

export type EmployeeAttendanceDetailExportRow = {
  Tanggal: string;
  Nama: string;
  NIK: string;
  Unit: string;
  Jabatan: string;
  Status: string;
  "Jam Acuan Masuk": string;
  "Jam Absen Masuk": string;
  "Jam Acuan Pulang": string;
  "Jam Absen Pulang": string;
  "Durasi Kerja": string;
  "Menit Terlambat": number;
  "Menit Pulang Awal": number;
  "Acuan Kehadiran": string;
  Lokasi: string;
  Verifikasi: string;
  "Metode Masuk": string;
  "Metode Pulang": string;
  Catatan: string;
};

type AttendanceWorkbookOptions = {
  filename: string;
  periodLabel: string;
  unitLabel: string;
  generatedLabel: string;
  summaryRows: EmployeeAttendanceSummaryExportRow[];
  detailRows: EmployeeAttendanceDetailExportRow[];
  metrics: {
    employeeCount: number;
    employeesWithRecords: number;
    employeesWithoutRecords: number;
    verifiedRecords: number;
    lateRecords: number;
    reviewRecords: number;
  };
};

const colors = {
  darkGreen: "075E4A",
  green: "0B8568",
  paleGreen: "E8F5EF",
  paleBlue: "EAF2FF",
  paleAmber: "FFF7E6",
  paleRed: "FFF0F0",
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
  row.height = 26;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: colors.white }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.green } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = border;
  });
}

function styleDataRows(sheet: ExcelJS.Worksheet, startRow: number, columnCount: number) {
  for (let index = startRow; index <= sheet.rowCount; index += 1) {
    const row = sheet.getRow(index);
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      if (columnNumber > columnCount) return;
      cell.border = border;
      cell.alignment = { vertical: "middle", wrapText: columnNumber === 2 || columnNumber === columnCount };
      if ((index - startRow) % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.slate } };
      }
    });
  }
}

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

export async function exportEmployeeAttendanceWorkbook({
  filename,
  periodLabel,
  unitLabel,
  generatedLabel,
  summaryRows,
  detailRows,
  metrics,
}: AttendanceWorkbookOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TSLS Admin OS";
  workbook.created = new Date();

  const summaryHeaders = Object.keys(summaryRows[0] || {
    NIK: "", Nama: "", Jabatan: "", Unit: "", "Hari Input": 0, Hadir: 0, Terlambat: 0,
    "Total Menit Terlambat": 0, "Pulang Awal": 0, "Belum Absen Pulang": 0, Sakit: 0,
    Izin: 0, Alpa: 0, Terverifikasi: 0, "Total Durasi": "",
  }) as (keyof EmployeeAttendanceSummaryExportRow)[];
  const summarySheet = workbook.addWorksheet("Rekap Pegawai", {
    views: [{ state: "frozen", ySplit: 7 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  styleTitle(summarySheet, summaryHeaders.length, "REKAP ABSENSI PEGAWAI", `Periode ${periodLabel} · ${unitLabel}`);
  summarySheet.mergeCells(4, 1, 4, 2);
  summarySheet.getCell(4, 1).value = `Dibuat: ${generatedLabel}`;
  summarySheet.getCell(4, 1).font = { size: 10, color: { argb: colors.muted } };
  const metricCells = [
    ["Pegawai", metrics.employeeCount, colors.paleBlue],
    ["Ada Catatan", metrics.employeesWithRecords, colors.paleGreen],
    ["Belum Ada Catatan", metrics.employeesWithoutRecords, colors.slate],
    ["Terverifikasi", metrics.verifiedRecords, colors.paleGreen],
    ["Terlambat", metrics.lateRecords, colors.paleAmber],
    ["Perlu Ditinjau", metrics.reviewRecords, colors.paleRed],
  ] as const;
  metricCells.forEach(([label, value, fill], index) => {
    const column = (index * 2) + 1;
    const labelCell = summarySheet.getCell(5, column);
    const valueCell = summarySheet.getCell(5, column + 1);
    labelCell.value = label;
    valueCell.value = value;
    [labelCell, valueCell].forEach((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      cell.border = border;
      cell.alignment = { vertical: "middle" };
    });
    labelCell.font = { bold: true, size: 9, color: { argb: colors.muted } };
    valueCell.font = { bold: true, size: 12, color: { argb: colors.darkGreen } };
  });
  summarySheet.getRow(5).height = 27;
  const summaryHeader = summarySheet.addRow(summaryHeaders);
  styleHeader(summaryHeader);
  summaryRows.forEach((item) => summarySheet.addRow(summaryHeaders.map((header) => item[header])));
  styleDataRows(summarySheet, 8, summaryHeaders.length);
  summarySheet.columns = [
    { width: 18 }, { width: 28 }, { width: 24 }, { width: 20 }, { width: 12 },
    { width: 10 }, { width: 12 }, { width: 16 }, { width: 13 }, { width: 18 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 16 },
  ];
  summarySheet.autoFilter = { from: { row: 7, column: 1 }, to: { row: 7, column: summaryHeaders.length } };

  const detailHeaders = Object.keys(detailRows[0] || {
    Tanggal: "", Nama: "", NIK: "", Unit: "", Jabatan: "", Status: "", "Jam Acuan Masuk": "",
    "Jam Absen Masuk": "", "Jam Acuan Pulang": "", "Jam Absen Pulang": "", "Durasi Kerja": "",
    "Menit Terlambat": 0, "Menit Pulang Awal": 0, "Acuan Kehadiran": "", Lokasi: "", Verifikasi: "",
    "Metode Masuk": "", "Metode Pulang": "", Catatan: "",
  }) as (keyof EmployeeAttendanceDetailExportRow)[];
  const detailSheet = workbook.addWorksheet("Rincian Harian", {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  styleTitle(detailSheet, detailHeaders.length, "RINCIAN HARIAN ABSENSI", `Periode ${periodLabel} · ${unitLabel}`);
  detailSheet.mergeCells(4, 1, 4, detailHeaders.length);
  detailSheet.getCell(4, 1).value = "Rincian mengikuti filter pegawai, pencarian, dan fokus status yang dipilih pada laporan.";
  detailSheet.getCell(4, 1).font = { size: 10, color: { argb: colors.muted } };
  const detailHeader = detailSheet.addRow(detailHeaders);
  styleHeader(detailHeader);
  detailRows.forEach((item) => detailSheet.addRow(detailHeaders.map((header) => item[header])));
  styleDataRows(detailSheet, 6, detailHeaders.length);
  detailSheet.columns = [
    { width: 19 }, { width: 28 }, { width: 18 }, { width: 18 }, { width: 23 }, { width: 14 },
    { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 15 }, { width: 15 },
    { width: 17 }, { width: 20 }, { width: 22 }, { width: 18 }, { width: 17 }, { width: 17 }, { width: 34 },
  ];
  detailSheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: detailHeaders.length } };

  downloadWorkbook(await workbook.xlsx.writeBuffer(), filename);
}
