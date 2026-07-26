/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useDelete, useList } from "@refinedev/core";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Edit,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../app/providers/UnitProvider";
import {
  formatPaudDate,
  PAUD_ASPECTS,
  PAUD_SCALE_LABELS,
  PAUD_SCALE_TONES,
  type PaudScale,
} from "./paud-config";

const PAGE_SIZE = 15;

export const StppaAssessmentsList: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteAssessment } = useDelete();
  const [classId, setClassId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const filters: any[] = [];
  if (activeYearId) filters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  if (activeSemesterId) filters.push({ field: "semester_id", operator: "eq", value: activeSemesterId });

  const { data, isLoading, isError } = useList({
    resource: "paud_stppa_assessments",
    filters,
    sorters: [{ field: "date", order: "desc" }],
    pagination: { mode: "off" },
    meta: { select: "*, students(id,full_name,class_id,unit_id,classes(id,name)), employees(full_name)" },
  });
  const classesQuery = useList({
    resource: "classes",
    filters: [
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
    meta: { select: "id,name" },
  });
  const studentsQuery = useList({
    resource: "students",
    filters: [
      { field: "status", operator: "eq", value: "active" },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
    ],
    pagination: { mode: "off" },
    meta: { select: "id,class_id" },
  });

  const records = (data?.data || []).filter((record: any) => {
    const unitMatches = !activeUnitId || record.students?.unit_id === activeUnitId;
    const classMatches = !classId || record.class_id === classId || record.students?.class_id === classId;
    const statusMatches = !status || (record.status || "published") === status;
    const keyword = search.trim().toLowerCase();
    const searchMatches = !keyword || [record.students?.full_name, record.period_name]
      .some((value) => String(value || "").toLowerCase().includes(keyword));
    return unitMatches && classMatches && statusMatches && searchMatches;
  });
  const activeStudents = (studentsQuery.data?.data || []).filter((student: any) => !classId || student.class_id === classId);
  const assessedIds = new Set(records.map((record: any) => record.student_id));
  const coverage = activeStudents.length ? Math.round((assessedIds.size / activeStudents.length) * 100) : 0;
  const published = records.filter((record: any) => (record.status || "published") === "published").length;
  const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const pagedRecords = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Asesmen Perkembangan Anak"
        description="Pantau capaian enam aspek STPPA, pertumbuhan, kekuatan anak, dan tindak lanjut bersama keluarga."
        action={
          <Link to="/stppa-assessments/create" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Isi Asesmen
          </Link>
        }
      />

      <nav className="flex flex-wrap gap-2 border-b pb-3 text-sm">
        <Link to="/paud" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted">Pusat PAUD/TK</Link>
        <Link to="/paud-activities" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted">Jurnal Observasi</Link>
        <span className="rounded-md bg-primary/10 px-3 py-2 font-semibold text-primary">Asesmen Perkembangan</span>
        <Link to="/curriculum/paud" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted">Kurikulum</Link>
      </nav>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary icon={ClipboardCheck} value={records.length} label="Asesmen periode aktif" />
        <Summary icon={Users} value={`${assessedIds.size}/${activeStudents.length}`} label="Anak sudah dinilai" />
        <Summary icon={CheckCircle2} value={`${coverage}%`} label={`${published} asesmen terbit`} />
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_180px]">
          <label className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari nama anak atau periode..." className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" />
          </label>
          <select value={classId} onChange={(event) => { setClassId(event.target.value); setPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">Semua kelas</option>
            {(classesQuery.data?.data || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">Semua status</option>
            <option value="draft">Draf internal</option>
            <option value="published">Terbit</option>
          </select>
        </div>
      </section>

      {isError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Asesmen belum dapat dimuat. Pastikan migrasi PAUD/TK terbaru telah diterapkan.
        </div>
      )}

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Anak dan periode</th>
                {PAUD_ASPECTS.map((aspect) => <th key={aspect.id} className="px-3 py-3 text-center">{aspect.shortTitle}</th>)}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">Memuat asesmen perkembangan...</td></tr>
              ) : !pagedRecords.length ? (
                <tr><td colSpan={10} className="px-4 py-14 text-center text-muted-foreground">Belum ada asesmen sesuai kelas dan periode aktif.</td></tr>
              ) : pagedRecords.map((record: any) => (
                <tr key={record.id} className="align-top hover:bg-muted/20">
                  <td className="px-4 py-4">
                    <p className="font-bold">{record.students?.full_name || "Siswa tidak ditemukan"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{record.students?.classes?.name || "Tanpa kelas"}</p>
                    <p className="mt-2 text-xs font-semibold text-primary">{record.period_name}</p>
                    <p className="text-xs text-muted-foreground">{formatPaudDate(record.date)}</p>
                  </td>
                  {PAUD_ASPECTS.map((aspect) => (
                    <td key={aspect.id} className="px-3 py-4 text-center">
                      <ScaleBadge scale={record[`${aspect.id}_scale`]} />
                    </td>
                  ))}
                  <td className="px-4 py-4">
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${
                      (record.status || "published") === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {(record.status || "published") === "published" ? "Terbit" : "Draf"}
                    </span>
                    <p className="mt-2 max-w-32 text-xs text-muted-foreground">{record.employees?.full_name || "Admin sekolah"}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <Link title="Ubah asesmen" to={`/stppa-assessments/edit/${record.id}`} className="rounded-md p-2 text-sky-700 hover:bg-sky-50"><Edit className="h-4 w-4" /></Link>
                      <button
                        title="Hapus asesmen"
                        onClick={() => {
                          if (!window.confirm("Hapus asesmen perkembangan ini?")) return;
                          deleteAssessment(
                            { resource: "paud_stppa_assessments", id: record.id },
                            {
                              onSuccess: () => toast.success("Asesmen dihapus."),
                              onError: (error) => toast.error(`Gagal menghapus: ${error.message}`),
                            },
                          );
                        }}
                        className="rounded-md p-2 text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {records.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t pt-4 text-sm">
          <span className="text-muted-foreground">Halaman {page} dari {pageCount} · {records.length} asesmen</span>
          <div className="flex gap-2">
            <button title="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-md border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button title="Halaman berikutnya" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-md border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
};

function ScaleBadge({ scale }: { scale?: PaudScale | null }) {
  if (!scale) return <span className="text-muted-foreground">-</span>;
  return (
    <span title={PAUD_SCALE_LABELS[scale]} className={`inline-flex min-w-10 justify-center rounded border px-2 py-1 text-xs font-bold ${PAUD_SCALE_TONES[scale]}`}>
      {scale}
    </span>
  );
}

function Summary({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <span className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span>
      <div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
    </div>
  );
}
