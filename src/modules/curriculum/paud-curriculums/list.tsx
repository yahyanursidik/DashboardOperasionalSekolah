import React from "react";
import { useDelete } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Edit,
  Eye,
  FileText,
  Layers3,
  ListChecks,
  Palette,
  Plus,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { CurriculumSectionNav } from "../components/CurriculumSectionNav";
import {
  PAUD_FOUNDATION_LEVEL,
  PAUD_LEVELS,
  getPaudCompletion,
  getPaudLevelMeta,
} from "./paudCurriculumTemplates";

type YearGroup = {
  academicYearId: string;
  academicYearName: string;
  records: any[];
  foundation?: any;
};

const getRecordForLevel = (records: any[], level: number) => records.find((record) => record.grade_level === level);

export const PaudThemeList: React.FC = () => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { mutate: deleteTheme } = useDelete();

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "grade_level",
        accessorKey: "grade_level",
        header: "Dokumen",
        cell: function render({ getValue }) {
          const meta = getPaudLevelMeta(getValue<number>());

          return (
            <div className="space-y-1">
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${meta.tone}`}>
                {meta.label}
              </span>
              <p className="text-xs text-muted-foreground">{meta.name}</p>
            </div>
          );
        },
      },
      {
        id: "academic_year",
        accessorKey: "academic_years.name",
        header: "Tahun Ajaran",
        cell: function render({ row }) {
          return row.original.academic_years?.name || "-";
        },
      },
      {
        id: "status",
        header: "Kelengkapan",
        cell: function render({ row }) {
          const completion = getPaudCompletion(row.original);

          return (
            <div className="min-w-[220px] space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${completion.percent}%` }} />
                </div>
                <span className="text-xs font-bold text-primary">{completion.percent}%</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {completion.chips.map((chip) => (
                  <span
                    key={chip.label}
                    className={`inline-flex rounded px-2 py-0.5 text-[11px] font-bold ${
                      chip.done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {chip.label}: {chip.value}
                  </span>
                ))}
              </div>
            </div>
          );
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "Aksi",
        cell: function render({ getValue }) {
          const id = getValue<string>();

          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/curriculum/paud/show/${id}`)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                title="Lihat detail"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate(`/curriculum/paud/edit/${id}`)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-blue-50 hover:text-blue-600"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm("Apakah Anda yakin ingin menghapus kurikulum ini?")) {
                    deleteTheme(
                      { resource: "paud_curriculums", id },
                      {
                        onSuccess: () => toast.success("Kurikulum PAUD berhasil dihapus"),
                        onError: (error) => toast.error("Gagal menghapus kurikulum PAUD: " + error.message),
                      },
                    );
                  }
                }}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
                title="Hapus"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [deleteTheme, navigate],
  );

  const filters = [];
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });

  const { getHeaderGroups, getRowModel } = useTable({
    columns,
    refineCoreProps: {
      resource: "paud_curriculums",
      meta: { select: "*, academic_years(name)" },
      filters: { permanent: filters as any },
      sorters: { permanent: [{ field: "created_at", order: "desc" }] },
      pagination: { pageSize: 50 },
    },
  });

  const records = getRowModel().rows.map((row) => row.original);
  const yearGroups = React.useMemo<YearGroup[]>(() => {
    const grouped = new Map<string, YearGroup>();

    records.forEach((record) => {
      const academicYearId = record.academic_year_id || "unknown";
      const academicYearName = record.academic_years?.name || "Tanpa Tahun Ajaran";

      if (!grouped.has(academicYearId)) {
        grouped.set(academicYearId, {
          academicYearId,
          academicYearName,
          records: [],
        });
      }

      const group = grouped.get(academicYearId)!;
      group.records.push(record);
      if (record.grade_level === PAUD_FOUNDATION_LEVEL) {
        group.foundation = record;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => a.academicYearName.localeCompare(b.academicYearName)).reverse();
  }, [records]);

  const foundationCount = records.filter((record) => record.grade_level === PAUD_FOUNDATION_LEVEL).length;
  const moduleCount = records.filter((record) => record.grade_level !== PAUD_FOUNDATION_LEVEL).length;
  const completeCount = records.filter((record) => {
    const completion = getPaudCompletion(record);
    return completion.completed === completion.total;
  }).length;

  const handlePrimaryAction = (group?: YearGroup) => {
    if (!group || !group.foundation) {
      navigate("/curriculum/paud/create");
      return;
    }

    const missingLevel = PAUD_LEVELS.find((level) => !getRecordForLevel(group.records, level.value));
    if (missingLevel) {
      navigate(`/curriculum/paud/create?academic_year_id=${group.academicYearId}`);
      return;
    }

    navigate(`/curriculum/paud/edit/${group.foundation.id}`);
  };

  const latestGroup = yearGroups[0];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Link to="/curriculum" className="rounded-full p-2 transition-colors hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader
          title="Pusat Kurikulum PAUD"
          description="Mulai dari ATP Fase Fondasi, lanjut Prota dan Prosem, lalu turunkan ke RPPM dan RPPH/Modul Ajar untuk KB, TK A, dan TK B."
          action={
            <button
              onClick={() => handlePrimaryAction(latestGroup)}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Lanjutkan Pengisian
            </button>
          }
        />
      </div>
      <CurriculumSectionNav />

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Alur kerja utama</p>
            <h2 className="mt-1 text-2xl font-black text-foreground">Satu tahun ajaran, satu Fase Fondasi, tiga modul tingkat</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Halaman ini disusun sebagai papan kerja. User cukup ikuti urutan dokumen: lengkapi induk Fase Fondasi, lalu buat modul KB, TK A, dan TK B.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-sky-50 p-3 text-sky-900">
              <FileText className="mb-2 h-5 w-5" />
              <p className="text-2xl font-black">{foundationCount}</p>
              <p className="text-xs font-bold uppercase">Fase Fondasi</p>
            </div>
            <div className="rounded-lg border bg-violet-50 p-3 text-violet-900">
              <Layers3 className="mb-2 h-5 w-5" />
              <p className="text-2xl font-black">{moduleCount}</p>
              <p className="text-xs font-bold uppercase">Modul Tingkat</p>
            </div>
            <div className="rounded-lg border bg-emerald-50 p-3 text-emerald-900">
              <CheckCircle2 className="mb-2 h-5 w-5" />
              <p className="text-2xl font-black">{completeCount}</p>
              <p className="text-xs font-bold uppercase">Lengkap</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-5">
          {[
            { title: "ATP", desc: "arah tujuan", icon: FileText },
            { title: "Prota", desc: "program tahunan", icon: ListChecks },
            { title: "Prosem", desc: "program semester", icon: CalendarDays },
            { title: "RPPM", desc: "rencana mingguan", icon: Layers3 },
            { title: "RPPH", desc: "modul ajar harian", icon: CalendarDays },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold">{index + 1}. {step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg border bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Mulai dari ATP</p>
                <h3 className="mt-1 text-lg font-black text-foreground">Alur Tujuan Pembelajaran Fase Fondasi</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  ATP adalah dokumen pembuka untuk satu tahun ajaran. Setelah ATP terisi, lanjutkan Prota dan Prosem sebelum membuat RPPM/RPPH per tingkat.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Tahun aktif</p>
              <p className="mt-1 text-base font-black text-foreground">{latestGroup?.academicYearName || "-"}</p>
              <p className="text-xs text-muted-foreground">Prioritas pengisian</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Status ATP</p>
              <p className="mt-1 text-base font-black text-foreground">
                {latestGroup?.foundation?.atp_text ? "Terisi" : "Belum ada"}
              </p>
              <p className="text-xs text-muted-foreground">
                {latestGroup?.foundation ? "Dokumen Fase Fondasi tersedia" : "Buat Fase Fondasi dahulu"}
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
              {latestGroup?.foundation ? (
                <>
                  <button
                    onClick={() => navigate(`/curriculum/paud/edit/${latestGroup.foundation!.id}`)}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Edit ATP <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/curriculum/paud/show/${latestGroup.foundation!.id}`)}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Tinjau ATP
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate(latestGroup ? `/curriculum/paud/create?academic_year_id=${latestGroup.academicYearId}` : "/curriculum/paud/create")}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> Buat ATP
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {yearGroups.length > 0 ? (
        <div className="space-y-4">
          {yearGroups.map((group) => {
            const foundationCompletion = group.foundation ? getPaudCompletion(group.foundation) : undefined;
            const missingLevel = PAUD_LEVELS.find((level) => !getRecordForLevel(group.records, level.value));
            const nextActionLabel = !group.foundation
              ? "Buat Fase Fondasi"
              : missingLevel
                ? `Buat Modul ${missingLevel.label}`
                : "Tinjau Fase Fondasi";

            return (
              <section key={group.academicYearId} className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tahun Ajaran</p>
                    <h3 className="text-xl font-black text-foreground">{group.academicYearName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {group.foundation
                        ? "Dokumen induk sudah tersedia. Lanjutkan modul per tingkat sesuai kebutuhan."
                        : "Belum ada dokumen induk. Mulai dari ATP Fase Fondasi."}
                    </p>
                  </div>
                  <button
                    onClick={() => handlePrimaryAction(group)}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {nextActionLabel} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                          Fase Fondasi
                        </span>
                        <h4 className="mt-2 font-bold text-foreground">ATP, Prota, Prosem</h4>
                      </div>
                      {group.foundation ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => navigate(`/curriculum/paud/show/${group.foundation.id}`)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-indigo-600"
                            title="Lihat detail"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/curriculum/paud/edit/${group.foundation.id}`)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-blue-600"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {foundationCompletion ? (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${foundationCompletion.percent}%` }} />
                          </div>
                          <span className="text-xs font-bold text-primary">{foundationCompletion.percent}%</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {foundationCompletion.chips.map((chip) => (
                            <span
                              key={chip.label}
                              className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                                chip.done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {chip.label}: {chip.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/curriculum/paud/create?academic_year_id=${group.academicYearId}`)}
                        className="mt-4 w-full rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-3 text-sm font-semibold text-primary hover:bg-primary/10"
                      >
                        Mulai ATP Fase Fondasi
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {PAUD_LEVELS.map((level) => {
                      const record = getRecordForLevel(group.records, level.value);
                      const completion = record ? getPaudCompletion(record) : undefined;

                      return (
                        <div key={level.value} className="rounded-lg border bg-muted/20 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${level.tone}`}>
                                {level.label}
                              </span>
                              <p className="mt-2 text-sm font-bold text-foreground">{level.age}</p>
                              <p className="text-xs text-muted-foreground">RPPM dan RPPH</p>
                            </div>
                            {record ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
                          </div>

                          {record && completion ? (
                            <div className="mt-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                                  <div className="h-full rounded-full bg-primary" style={{ width: `${completion.percent}%` }} />
                                </div>
                                <span className="text-xs font-bold text-primary">{completion.percent}%</span>
                              </div>
                              <button
                                onClick={() => navigate(`/curriculum/paud/edit/${record.id}`)}
                                className="w-full rounded-md border border-input px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-background hover:text-foreground"
                              >
                                Edit Modul
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => navigate(`/curriculum/paud/create?academic_year_id=${group.academicYearId}`)}
                              disabled={!group.foundation}
                              className="mt-4 w-full rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
                              title={!group.foundation ? "Buat Fase Fondasi terlebih dahulu" : `Buat modul ${level.label}`}
                            >
                              Buat Modul
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center shadow-sm">
          <Palette className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-bold text-foreground">Belum ada kurikulum PAUD</h3>
          <p className="mt-1 text-sm text-muted-foreground">Mulai dengan membuat ATP Fase Fondasi untuk tahun ajaran baru.</p>
          <Link
            to="/curriculum/paud/create"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Buat Fase Fondasi
          </Link>
        </div>
      )}

      <details className="rounded-lg border bg-card shadow-sm">
        <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-foreground">
          Detail semua dokumen
        </summary>
        <div className="overflow-x-auto border-t">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              {getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-4 font-medium">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y">
              {getRowModel().rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-muted/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};
