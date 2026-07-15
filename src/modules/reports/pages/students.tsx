/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useList, useTable } from "@refinedev/core";
import { ChevronLeft, ChevronRight, Download, FilterX, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { exportToCsv } from "../../../lib/csv";
import { ReportsSectionNav } from "../components/ReportsSectionNav";
import { fetchAllReportRows, recordReportExport, type ReportQueryFilter } from "../report-utils";

const statusLabels: Record<string, string> = { active: "Aktif", graduated: "Lulus", transferred: "Pindah", dropped_out: "Keluar" };

export const StudentReport: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const { data: classData } = useList({ resource: "classes", filters: [...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []), ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : [])], pagination: { mode: "off" }, sorters: [{ field: "grade_level", order: "asc" }] });
  const filters: any[] = [];
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (classId) filters.push({ field: "class_id", operator: "eq", value: classId });
  if (status) filters.push({ field: "status", operator: "eq", value: status });
  if (search.trim()) filters.push({ field: "full_name", operator: "contains", value: search.trim() });
  const { tableQueryResult, current, setCurrent, pageCount } = useTable({ resource: "students", filters: { permanent: filters }, pagination: { current: 1, pageSize: 20 }, sorters: { initial: [{ field: "full_name", order: "asc" }] }, meta: { select: "id,full_name,nis,nisn,gender,date_of_birth,status,unit_id,class_id,units(name),classes(name)" } });
  const rows = tableQueryResult.data?.data || [];

  const exportReport = async () => {
    setIsExporting(true);
    try {
      const exportFilters = filters.map((filter) => ({ field: filter.field, operator: filter.operator, value: filter.value })) as ReportQueryFilter[];
      const data = await fetchAllReportRows<any>("students", "id,full_name,nis,nisn,gender,date_of_birth,status,unit_id,class_id,units(name),classes(name)", exportFilters, "full_name");
      exportToCsv(data.map((student) => ({ "Nama Lengkap": student.full_name, NIS: student.nis, NISN: student.nisn || "", "Jenis Kelamin": student.gender === "L" ? "Laki-laki" : "Perempuan", "Tanggal Lahir": student.date_of_birth || "", Kelas: student.classes?.name || "Belum ditempatkan", Unit: student.units?.name || "", Status: statusLabels[student.status] || student.status })), `Laporan_Siswa_${status || "semua"}`);
      await recordReportExport({ reportKey: "students", reportLabel: "Laporan Siswa", format: "csv", rowCount: data.length, unitId: activeUnitId, academicYearId: activeYearId, semesterId: activeSemesterId, filters: { classId, status, search } });
      toast.success(`${data.length} data siswa berhasil diekspor.`);
    } catch (error) { toast.error("Ekspor laporan siswa gagal", { description: error instanceof Error ? error.message : "Kesalahan tidak diketahui" }); }
    finally { setIsExporting(false); }
  };

  return <div className="space-y-6"><PageHeader title="Laporan Siswa" description="Data induk, status layanan, penempatan kelas, dan identitas pokok siswa sesuai lingkup laporan." action={<button onClick={() => void exportReport()} disabled={isExporting} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Ekspor Semua Hasil</button>} /><ReportsSectionNav />
    <section className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-[minmax(220px,1fr)_220px_180px_auto] md:items-end"><label className="text-xs font-bold text-muted-foreground">Cari nama siswa<input value={search} onChange={(event) => { setSearch(event.target.value); setCurrent(1); }} placeholder="Nama lengkap" className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label><label className="text-xs font-bold text-muted-foreground">Kelas<select value={classId} onChange={(event) => { setClassId(event.target.value); setCurrent(1); }} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Semua kelas</option>{classData?.data?.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-bold text-muted-foreground">Status<select value={status} onChange={(event) => { setStatus(event.target.value); setCurrent(1); }} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Semua status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button onClick={() => { setSearch(""); setClassId(""); setStatus("active"); setCurrent(1); }} className="flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold text-muted-foreground"><FilterX className="h-4 w-4" />Reset</button></section>
    <section className="overflow-hidden rounded-lg border bg-card">{tableQueryResult.isLoading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : rows.length === 0 ? <div className="flex h-64 flex-col items-center justify-center text-center"><Users className="h-10 w-10 text-muted-foreground/30" /><p className="mt-3 font-bold">Data siswa tidak ditemukan</p><p className="mt-1 text-sm text-muted-foreground">Periksa unit, kelas, status, atau kata pencarian.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Siswa</th><th className="px-4 py-3">NIS / NISN</th><th className="px-4 py-3">L/P</th><th className="px-4 py-3">Unit / kelas</th><th className="px-4 py-3">Tanggal lahir</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{rows.map((student: any) => <tr key={student.id} className="hover:bg-muted/20"><td className="px-4 py-3 font-semibold">{student.full_name}</td><td className="px-4 py-3"><p>{student.nis}</p><p className="text-xs text-muted-foreground">{student.nisn || "NISN belum diisi"}</p></td><td className="px-4 py-3">{student.gender}</td><td className="px-4 py-3"><p>{student.units?.name || "-"}</p><p className="text-xs text-muted-foreground">{student.classes?.name || "Belum ditempatkan"}</p></td><td className="px-4 py-3">{student.date_of_birth ? new Date(`${student.date_of_birth}T00:00:00`).toLocaleDateString("id-ID") : "-"}</td><td className="px-4 py-3"><span className="rounded bg-muted px-2 py-1 text-xs font-bold">{statusLabels[student.status] || student.status}</span></td></tr>)}</tbody></table></div>}{pageCount > 1 && <div className="flex items-center justify-between border-t px-4 py-3 text-sm"><span>{tableQueryResult.data?.total || 0} siswa - halaman {current}/{pageCount}</span><div className="flex gap-2"><button title="Sebelumnya" disabled={current === 1} onClick={() => setCurrent(current - 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button title="Berikutnya" disabled={current === pageCount} onClick={() => setCurrent(current + 1)} className="rounded-md border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>}</section>
  </div>;
};
