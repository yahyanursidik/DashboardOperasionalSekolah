/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useList } from "@refinedev/core";
import { useOutletContext } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  Camera,
  CheckCircle2,
  HeartHandshake,
  Ruler,
  Sparkles,
} from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import {
  formatPaudDate,
  PAUD_ASPECTS,
  PAUD_SCALE_LABELS,
  PAUD_SCALE_TONES,
  type PaudScale,
} from "../paud/paud-config";

export const PortalPaud: React.FC = () => {
  const { student } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const studentId = student?.id;
  const commonFilters: any[] = studentId ? [{ field: "student_id", operator: "eq", value: studentId }] : [];
  if (activeYearId) commonFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  if (activeSemesterId) commonFilters.push({ field: "semester_id", operator: "eq", value: activeSemesterId });
  commonFilters.push(
    { field: "status", operator: "eq", value: "published" },
    { field: "is_parent_visible", operator: "eq", value: true },
  );

  const activitiesQuery = useList({
    resource: "paud_activities",
    filters: commonFilters,
    sorters: [{ field: "date", order: "desc" }],
    pagination: { pageSize: 12 },
    queryOptions: { enabled: Boolean(studentId) },
    meta: { select: "*,employees(full_name)" },
  });
  const assessmentsQuery = useList({
    resource: "paud_stppa_assessments",
    filters: commonFilters,
    sorters: [{ field: "date", order: "desc" }],
    pagination: { pageSize: 10 },
    queryOptions: { enabled: Boolean(studentId) },
    meta: { select: "*,employees(full_name)" },
  });
  const activities = activitiesQuery.data?.data || [];
  const assessments = assessmentsQuery.data?.data || [];
  const latestAssessment = assessments[0] as any;
  const isError = activitiesQuery.isError || assessmentsQuery.isError;

  return (
    <div className="space-y-6 pb-10">
      <header className="border-b pb-5">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-emerald-50 p-2 text-emerald-700"><BookOpen className="h-5 w-5" /></span>
          <div>
            <h1 className="text-2xl font-bold">Perkembangan Anak KB/TK</h1>
            <p className="mt-1 text-sm text-muted-foreground">Bukti kegiatan, capaian perkembangan, dan dukungan yang dapat dilanjutkan bersama di rumah.</p>
          </div>
        </div>
      </header>

      {isError && (
        <div className="flex gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div><p className="font-semibold">Catatan perkembangan belum dapat dimuat</p><p className="mt-1">Silakan coba lagi atau hubungi sekolah bila kendala berlanjut.</p></div>
        </div>
      )}

      {!studentId ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">Pilih anak KB/TK yang terhubung untuk melihat perkembangannya.</div>
      ) : (
        <>
          <section className="rounded-lg border bg-card p-5 sm:p-6">
            <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Laporan terbaru</p>
                <h2 className="mt-1 text-xl font-bold">{latestAssessment?.period_name || "Asesmen belum diterbitkan"}</h2>
                {latestAssessment && <p className="mt-1 text-sm text-muted-foreground">{formatPaudDate(latestAssessment.date)} · {latestAssessment.employees?.full_name || "Tim guru"}</p>}
              </div>
              {latestAssessment && <span className="w-fit rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Telah diterbitkan sekolah</span>}
            </div>

            {assessmentsQuery.isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Memuat asesmen...</div>
            ) : !latestAssessment ? (
              <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
                <AlertCircle className="h-9 w-9 opacity-25" />
                <p className="mt-3 font-semibold text-foreground">Belum ada laporan pada periode aktif</p>
                <p className="mt-1 max-w-lg text-sm">Guru sedang mengumpulkan bukti observasi sebelum menerbitkan asesmen perkembangan.</p>
              </div>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {PAUD_ASPECTS.map((aspect) => {
                    const scale = latestAssessment[`${aspect.id}_scale`] as PaudScale | undefined;
                    const description = latestAssessment[`${aspect.id}_desc`];
                    return (
                      <article key={aspect.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-bold">{aspect.title}</h3>
                          {scale && <span className={`rounded border px-2 py-1 text-xs font-bold ${PAUD_SCALE_TONES[scale]}`}>{scale}</span>}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description || "Belum ada narasi khusus."}</p>
                        {scale && <p className="mt-3 text-xs font-semibold text-primary">{PAUD_SCALE_LABELS[scale]}</p>}
                      </article>
                    );
                  })}
                </div>

                {(latestAssessment.strengths || latestAssessment.follow_up || latestAssessment.parent_partnership) && (
                  <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <Note icon={Sparkles} title="Kekuatan dan minat" text={latestAssessment.strengths} />
                    <Note icon={CheckCircle2} title="Tindak lanjut sekolah" text={latestAssessment.follow_up} />
                    <Note icon={HeartHandshake} title="Dukungan di rumah" text={latestAssessment.parent_partnership} />
                  </div>
                )}

                {(latestAssessment.growth_weight || latestAssessment.growth_height || latestAssessment.growth_head) && (
                  <div className="mt-5 flex flex-wrap items-center gap-5 rounded-md bg-muted/30 p-4 text-sm">
                    <span className="flex items-center gap-2 font-semibold"><Ruler className="h-4 w-4 text-primary" /> Catatan pertumbuhan</span>
                    {latestAssessment.growth_weight && <span>Berat: <strong>{latestAssessment.growth_weight} kg</strong></span>}
                    {latestAssessment.growth_height && <span>Tinggi: <strong>{latestAssessment.growth_height} cm</strong></span>}
                    {latestAssessment.growth_head && <span>Lingkar kepala: <strong>{latestAssessment.growth_head} cm</strong></span>}
                  </div>
                )}
              </>
            )}
          </section>

          <section>
            <div className="mb-4">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Camera className="h-5 w-5 text-primary" /> Momen dan bukti belajar</h2>
              <p className="mt-1 text-sm text-muted-foreground">Dokumentasi yang telah dipilih guru untuk dibagikan kepada keluarga.</p>
            </div>
            {activitiesQuery.isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Memuat dokumentasi...</div>
            ) : !activities.length ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Belum ada dokumentasi yang diterbitkan pada periode aktif.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activities.map((activity: any) => (
                  <article key={activity.id} className="overflow-hidden rounded-lg border bg-card">
                    {activity.photo_url ? (
                      <img src={activity.photo_url} alt={activity.title} className="aspect-[16/9] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[16/9] items-center justify-center bg-muted"><Camera className="h-8 w-8 text-muted-foreground/30" /></div>
                    )}
                    <div className="p-4">
                      <p className="text-xs font-semibold text-primary">{formatPaudDate(activity.date)}</p>
                      <h3 className="mt-1 font-bold">{activity.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{activity.description}</p>
                      {!!activity.islamic_values?.length && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {activity.islamic_values.map((value: string) => <span key={value} className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{value}</span>)}
                        </div>
                      )}
                      {activity.follow_up && <p className="mt-3 border-t pt-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Lanjutan:</strong> {activity.follow_up}</p>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {assessments.length > 1 && (
            <section className="rounded-lg border bg-card p-5">
              <h2 className="font-bold">Riwayat laporan</h2>
              <div className="mt-3 divide-y">
                {assessments.slice(1).map((assessment: any) => (
                  <div key={assessment.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="font-semibold">{assessment.period_name}</span>
                    <span className="text-muted-foreground">{formatPaudDate(assessment.date)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

function Note({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text?: string | null }) {
  if (!text) return null;
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="flex items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4 text-primary" />{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
