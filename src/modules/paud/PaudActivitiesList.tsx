/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useDelete, useList } from "@refinedev/core";
import { Link } from "react-router-dom";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Filter,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../app/providers/UnitProvider";
import { formatPaudDate, PAUD_OBSERVATION_METHODS } from "./paud-config";

const PAGE_SIZE = 12;

export const PaudActivitiesList: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteActivity } = useDelete();
  const [classId, setClassId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const activityFilters: any[] = [];
  if (activeYearId) activityFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  if (activeSemesterId) activityFilters.push({ field: "semester_id", operator: "eq", value: activeSemesterId });

  const { data, isLoading, isError } = useList({
    resource: "paud_activities",
    filters: activityFilters,
    sorters: [{ field: "date", order: "desc" }],
    pagination: { mode: "off" },
    meta: {
      select: "*, students(id,full_name,class_id,unit_id,classes(id,name)), employees(full_name)",
    },
  });
  const classesQuery = useList({
    resource: "classes",
    filters: [
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []),
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
    meta: { select: "id,name,unit_id" },
  });

  const records = (data?.data || []).filter((record: any) => {
    const unitMatches = !activeUnitId || record.students?.unit_id === activeUnitId;
    const classMatches = !classId || record.class_id === classId || record.students?.class_id === classId;
    const statusMatches = !status || (record.status || "published") === status;
    const keyword = search.trim().toLowerCase();
    const searchMatches = !keyword || [record.title, record.description, record.students?.full_name]
      .some((value) => String(value || "").toLowerCase().includes(keyword));
    return unitMatches && classMatches && statusMatches && searchMatches;
  });

  const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const pagedRecords = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const publishedCount = records.filter((item: any) => (item.status || "published") === "published").length;
  const studentCount = new Set(records.map((item: any) => item.student_id)).size;
  const classes = classesQuery.data?.data || [];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Jurnal Observasi Anak"
        description="Catat bukti belajar autentik, aspek perkembangan, nilai Islam, dan tindak lanjut pada periode aktif."
        action={
          <Link to="/paud-activities/create" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Catat Observasi
          </Link>
        }
      />

      <nav className="flex flex-wrap gap-2 border-b pb-3 text-sm">
        <Link to="/paud" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted">Pusat PAUD/TK</Link>
        <span className="rounded-md bg-primary/10 px-3 py-2 font-semibold text-primary">Jurnal Observasi</span>
        <Link to="/stppa-assessments" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted">Asesmen Perkembangan</Link>
        <Link to="/curriculum/paud" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted">Kurikulum</Link>
      </nav>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary icon={Camera} value={records.length} label="Observasi periode aktif" />
        <Summary icon={Users} value={studentCount} label="Anak terdokumentasi" />
        <Summary icon={Eye} value={publishedCount} label="Terbit ke orang tua" />
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Cari anak, kegiatan, atau narasi..."
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
            />
          </label>
          <select value={classId} onChange={(event) => { setClassId(event.target.value); setPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">Semua kelas</option>
            {classes.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">Semua status</option>
            <option value="draft">Draf internal</option>
            <option value="published">Terbit</option>
          </select>
          <button
            type="button"
            onClick={() => { setSearch(""); setClassId(""); setStatus(""); }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"
          >
            <Filter className="h-4 w-4" /> Reset
          </button>
        </div>
      </section>

      {isError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Jurnal belum dapat dimuat. Jalankan migrasi PAUD/TK terbaru lalu muat ulang halaman.
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Memuat jurnal observasi...</div>
      ) : !pagedRecords.length ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <Camera className="h-10 w-10 opacity-25" />
          <p className="mt-3 font-semibold text-foreground">Belum ada observasi sesuai filter</p>
          <p className="mt-1 max-w-md text-sm">Mulai dari momen belajar yang bermakna dan tuliskan perilaku yang benar-benar terlihat.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pagedRecords.map((record: any) => {
            const method = PAUD_OBSERVATION_METHODS.find((item) => item.value === record.observation_method)?.label || "Dokumentasi";
            return (
              <article key={record.id} className="overflow-hidden rounded-lg border bg-card">
                <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-muted">
                  {record.photo_url ? (
                    <img src={record.photo_url} alt={record.title} className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-9 w-9 text-muted-foreground/30" />
                  )}
                  <span className="absolute left-3 top-3 rounded bg-background/95 px-2 py-1 text-xs font-semibold shadow-sm">
                    {formatPaudDate(record.date)}
                  </span>
                  <span className={`absolute right-3 top-3 rounded px-2 py-1 text-xs font-semibold ${
                    (record.status || "published") === "published" ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800"
                  }`}>
                    {(record.status || "published") === "published" ? "Terbit" : "Draf"}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-primary">{record.students?.classes?.name || "Tanpa kelas"} · {method}</p>
                  <h2 className="mt-1 line-clamp-1 text-lg font-bold">{record.title}</h2>
                  <p className="mt-1 text-sm font-semibold">{record.students?.full_name || "Siswa tidak ditemukan"}</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{record.description || "Belum ada narasi observasi."}</p>
                  {!!record.development_aspects?.length && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {record.development_aspects.slice(0, 3).map((aspect: string) => (
                        <span key={aspect} className="rounded bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">{aspect}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-muted-foreground">{record.employees?.full_name || "Pencatat belum terhubung"}</span>
                    <div className="flex gap-1">
                      <Link title="Ubah observasi" to={`/paud-activities/edit/${record.id}`} className="rounded-md p-2 text-sky-700 hover:bg-sky-50">
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        title="Hapus observasi"
                        onClick={() => {
                          if (!window.confirm("Hapus jurnal observasi ini? Data yang sudah dibagikan kepada orang tua juga akan hilang.")) return;
                          deleteActivity(
                            { resource: "paud_activities", id: record.id },
                            {
                              onSuccess: () => toast.success("Jurnal observasi dihapus."),
                              onError: (error) => toast.error(`Gagal menghapus: ${error.message}`),
                            },
                          );
                        }}
                        className="rounded-md p-2 text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {records.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t pt-4 text-sm">
          <span className="text-muted-foreground">Halaman {page} dari {pageCount} · {records.length} observasi</span>
          <div className="flex gap-2">
            <button title="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-md border p-2 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button title="Halaman berikutnya" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-md border p-2 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function Summary({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <span className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span>
      <div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
    </div>
  );
}
