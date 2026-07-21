import React, { useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link } from "react-router-dom";
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardCheck, FileText, Plus, Users, Trash2, Edit, Search, BookOpen, Clock } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { DeleteConfirmModal } from "../../../components/common/DeleteConfirmModal";
import { toast } from "sonner";

export const HalaqohsList: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { mutate: deleteMutate } = useDelete();
  const [search, setSearch] = useState("");
  
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: "", name: "" });

  const { data, isLoading, refetch } = useList({
    resource: "tahfidz_halaqohs",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "program_type", operator: "eq" as const, value: "tahfidz" },
      ...(search ? [{ field: "name", operator: "contains" as const, value: search }] : [])
    ],
    sorters: [
      { field: "name", order: "asc" }
    ],
    pagination: {
      mode: "server",
      pageSize: 500
    },
    meta: {
      select: "*, employees(full_name), subjects(id, name, quran_program_type, units(name))"
    }
  });

  const records = data?.data || [];
  const { data: membersData } = useList({
    resource: "tahfidz_halaqoh_members",
    meta: { select: "halaqoh_id, student_id" },
    pagination: { mode: "off" },
  });
  const { data: quranRecordsData } = useList({
    resource: "quran_records",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "record_type", operator: "eq" as const, value: "tahfidz" },
    ],
    meta: { select: "id, halaqoh_id, student_id, fluency_score" },
    pagination: { mode: "off" },
  });
  const { data: targetsData } = useList({
    resource: "tahfidz_student_targets",
    filters: [
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "target_type", operator: "eq" as const, value: "tahfidz" },
    ],
    meta: { select: "id, student_id, status" },
    pagination: { mode: "off" },
  });

  const members = membersData?.data || [];
  const quranRecords = quranRecordsData?.data || [];
  const targets = targetsData?.data || [];
  const getHalaqohMetrics = (halaqoh: any) => {
    const halaqohMembers = members.filter((member: any) => member.halaqoh_id === halaqoh.id);
    const memberIds = new Set(halaqohMembers.map((member: any) => member.student_id));
    const halaqohRecords = quranRecords.filter((record: any) => record.halaqoh_id === halaqoh.id || memberIds.has(record.student_id));
    const halaqohTargets = targets.filter((target: any) => target.halaqoh_id === halaqoh.id || (!target.halaqoh_id && memberIds.has(target.student_id)));
    const missing: string[] = [];

    if (!halaqoh.subject_id) missing.push("mapel");
    if (!halaqoh.employee_id) missing.push("muhaffizh");
    if (!halaqoh.schedule_day && !halaqoh.schedule_time) missing.push("jadwal");
    if (halaqohMembers.length === 0) missing.push("anggota");
    if (halaqohTargets.length < halaqohMembers.length) missing.push("target");
    if (halaqohRecords.length === 0) missing.push("setoran");

    return {
      membersCount: halaqohMembers.length,
      recordsCount: halaqohRecords.length,
      targetsCount: halaqohTargets.length,
      hasTeacher: Boolean(halaqoh.employee_id),
      hasSchedule: Boolean(halaqoh.schedule_day || halaqoh.schedule_time),
      isReady: missing.length === 0,
      missing,
    };
  };
  const metrics = records.map((record: any) => getHalaqohMetrics(record));
  const totalMembers = metrics.reduce((sum, item) => sum + item.membersCount, 0);
  const readyCount = metrics.filter((item) => item.isReady).length;
  const withoutTeacher = metrics.filter((item) => !item.hasTeacher).length;
  const withoutTarget = metrics.filter((item) => item.membersCount > item.targetsCount).length;
  const readinessPercent = records.length ? Math.round((readyCount / records.length) * 100) : 0;

  const confirmDelete = () => {
    deleteMutate({
      resource: "tahfidz_halaqohs",
      id: deleteModal.id,
    }, {
      onSuccess: () => {
        toast.success("Halaqoh berhasil dihapus");
        setDeleteModal({ isOpen: false, id: "", name: "" });
        refetch();
      },
      onError: () => {
        toast.error("Gagal menghapus halaqoh");
        setDeleteModal({ isOpen: false, id: "", name: "" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
        onConfirm={confirmDelete}
        title="Hapus Halaqoh"
        message={`Apakah Anda yakin ingin menghapus halaqoh "${deleteModal.name}"? Semua data anggota di dalamnya juga akan terhapus.`}
      />

      <PageHeader
        title="Halaqoh Tahfidz"
        description="Pusat kelola kelompok tahfidz: anggota, muhaffizh, jadwal, target hafalan, mutaba'ah, ujian, dan laporan perkembangan."
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <BookOpen className="h-4 w-4" />
              Program tahfidz berbasis mutu
            </div>
            <h2 className="mt-3 text-2xl font-bold">Mulai dari halaqoh, lanjut ke target dan setoran</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Halaqoh dipakai sebagai pintu kerja guru: susun anggota, tetapkan target personal, catat mutaba'ah, lalu pantau laporan semester.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { icon: BookOpen, label: "Halaqoh", value: records.length },
              { icon: Users, label: "Anggota", value: totalMembers },
              { icon: CheckCircle2, label: "Siap", value: `${readyCount}/${records.length}` },
              { icon: BarChart3, label: "Mutu", value: `${readinessPercent}%` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg border bg-muted/20 p-4">
                <Icon className="mb-2 h-5 w-5 text-emerald-600" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Perlu tindak lanjut
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{withoutTeacher}</p>
              <p className="text-[11px] text-muted-foreground">Tanpa guru</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{withoutTarget}</p>
              <p className="text-[11px] text-muted-foreground">Target kurang</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xl font-bold">{records.length - readyCount}</p>
              <p className="text-[11px] text-muted-foreground">Belum siap</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Definition of done halaqoh
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {["Muhaffizh", "Jadwal", "Anggota", "Target personal", "Setoran semester"].map((item) => (
              <div key={item} className="rounded-lg border bg-muted/20 p-3 text-xs font-semibold text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Cari nama halaqoh..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        
        <Link
          to="/tahfidz-halaqohs/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Tambah Halaqoh
        </Link>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Nama Halaqoh</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Muhaffizh / Guru</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Anggota</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Kesiapan</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Jadwal</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                      <p>Memuat data halaqoh...</p>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="w-8 h-8 opacity-50" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-1">Belum ada halaqoh</h3>
                      <p className="max-w-sm mb-4">Belum ada data halaqoh pada semester ini atau kata kunci pencarian tidak ditemukan.</p>
                      {!search && (
                        <Link
                          to="/tahfidz-halaqohs/create"
                          className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> Buat Halaqoh Pertama
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const itemMetrics = getHalaqohMetrics(record);
                  return (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <Link to={`/tahfidz-halaqohs/show/${record.id}`} className="font-bold text-gray-900 hover:text-primary transition-colors">
                        {record.name}
                        <p className={`mt-1 text-xs font-semibold ${record.subjects?.name ? "text-primary" : "text-amber-700"}`}>
                          {record.subjects?.name ? `${record.subjects.name} - ${record.subjects.units?.name || "Unit"}` : "Mapel Tahfidz belum ditautkan"}
                        </p>
                      </Link>
                      {record.description && <p className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">{record.description}</p>}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {record.employees?.full_name ? (
                        <Link to={`/employees/show/${record.employee_id}`} className="hover:text-primary transition-colors">
                          {record.employees.full_name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground italic">Belum ditentukan</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold">{itemMetrics.membersCount} siswa</span>
                        <span className="text-xs text-muted-foreground">{itemMetrics.targetsCount} target / {itemMetrics.recordsCount} setoran</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold ${itemMetrics.isReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                          {itemMetrics.isReady ? "Siap operasional" : "Perlu dilengkapi"}
                        </span>
                        {!itemMetrics.isReady && (
                          <p className="text-[10px] font-medium text-amber-700">Lengkapi: {itemMetrics.missing.slice(0, 2).join(", ")}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.schedule_day || record.schedule_time ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{record.schedule_day || "-"}, {record.schedule_time || "-"}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs bg-muted px-2 py-1 rounded">Belum diatur</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/tahfidz-halaqohs/show/${record.id}`}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1"
                          title="Kelola Anggota"
                        >
                          <Users className="w-4 h-4" /> <span className="text-xs font-medium">Anggota</span>
                        </Link>
                        <Link
                          to={`/quran/create?halaqoh_id=${record.id}`}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Input setoran"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/tahfidz-reports?halaqoh_id=${record.id}`}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Laporan"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                        <div className="w-px h-4 bg-border mx-1"></div>
                        <Link
                          to={`/tahfidz-halaqohs/edit/${record.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Halaqoh"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, id: record.id as string, name: record.name })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Halaqoh"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
