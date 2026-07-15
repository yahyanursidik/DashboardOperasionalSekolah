export const formatCurrency = (value: unknown) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

export const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const getFinanceBasePath = (pathname: string) =>
  pathname.startsWith("/bendahara") ? "/bendahara" : "/finance";

export const belongsToFinanceUnit = (recordUnitId: string | null | undefined, activeUnitId: string | null) =>
  !activeUnitId || !recordUnitId || recordUnitId === activeUnitId;

export const getExpenseStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    draft: "Draf",
    submitted: "Menunggu Persetujuan",
    approved: "Disetujui",
    rejected: "Ditolak",
    paid: "Dibayar",
    void: "Dibatalkan",
  };
  return labels[status || ""] || "Tercatat";
};

export const getFundTypeLabel = (fundType?: string) => {
  const labels: Record<string, string> = {
    operational: "Operasional",
    tuition: "Dana Pendidikan",
    bos: "Dana BOS",
    ziswaf: "ZISWAF",
    scholarship: "Beasiswa",
    building: "Sarpras/Gedung",
    activity: "Kegiatan",
  };
  return labels[fundType || ""] || "Operasional";
};

export const downloadCsv = (filename: string, rows: Array<Record<string, unknown>>) => {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => headers.map((key) => escape(row[key])).join(","))].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
