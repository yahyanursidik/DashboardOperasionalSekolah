import React from "react";
import { useDelete, useList, useShow } from "@refinedev/core";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, Circle, Edit, FileText, Layers3, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { CurriculumSectionNav } from "../components/CurriculumSectionNav";
import { SD_PHASES, getSdPhaseCompletion, hasRows } from "../subject-curriculums/sdCurriculumStructure";
import {
  getCurriculumCompletion,
  getSemesterLearningPlanRows,
  getSemesterPlan,
  getSemesterRppmRows,
} from "../curriculum-utils";
import { getAssessmentWeightTotal, getFinalAssessmentType } from "../assessment-policy";

const StatusPill: React.FC<{ done: boolean; label: string; detail?: string }> = ({ done, label, detail }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
      done
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-500"
    }`}
  >
    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
    {label}
    {detail ? <span className="font-normal opacity-80">({detail})</span> : null}
  </span>
);

export const SubjectShow: React.FC = () => {
  const { id } = useParams();
  const subjectId = id || "";
  const { mutate: deleteCurriculum } = useDelete();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const { queryResult } = useShow({
    resource: "subjects",
    id: subjectId,
    meta: { select: "*, units(name)" },
  });
  const subject = queryResult?.data?.data;

  const { data: curriculumsData, isLoading: curriculumsLoading } = useList({
    resource: "subject_curriculums",
    filters: [
      { field: "subject_id", operator: "eq", value: subjectId },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq", value: activeYearId }] : []),
    ] as any,
    sorters: [{ field: "grade_level", order: "asc" }],
    meta: { select: "*, academic_years(name), subject_curriculum_semesters(*)" },
  });

  if (queryResult.isLoading) return <div className="p-8 text-center text-muted-foreground">Memuat data...</div>;
  if (!subject) return <div className="p-8 text-center text-rose-500">Mata pelajaran tidak ditemukan.</div>;

  const records = curriculumsData?.data || [];
  const allowedGrades = Array.isArray(subject.grade_levels) && subject.grade_levels.length > 0 ? subject.grade_levels.map(Number) : [1, 2, 3, 4, 5, 6];
  const activePhases = SD_PHASES.filter((phase) => phase.grades.some((grade) => allowedGrades.includes(grade)));
  const firstMissingGrade = allowedGrades.find((grade: number) => !records.some((record) => Number(record.grade_level) === grade)) || allowedGrades[0];
  const createUrl = (grade: number) => {
    const params = new URLSearchParams({ subject_id: subjectId, grade_level: String(grade) });
    if (activeYearId) params.set("academic_year_id", activeYearId);
    return `/curriculum/subject-curriculums/create?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/curriculum/subjects" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader
          title={subject.name}
          description={`${subject.code ? subject.code + " - " : ""}${subject.category || "Mata pelajaran"} | ${subject.units?.name || "Unit belum dipilih"}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                to={createUrl(firstMissingGrade)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Buat Kelas {firstMissingGrade}
              </Link>
              <Link
                to={`/curriculum/subjects/edit/${subjectId}`}
                className="flex items-center gap-2 border px-4 py-2 rounded-md hover:bg-muted transition-colors font-medium text-sm"
              >
                <Edit className="w-4 h-4" />
                Edit Mapel
              </Link>
            </div>
          }
        />
      </div>
      <CurriculumSectionNav />

      {subject.quran_program_type ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">
                Terhubung ke Program {subject.quran_program_type === "both" ? "Tahsin & Tahfidz" : subject.quran_program_type === "tahsin" ? "Tahsin" : "Tahfidz"}
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                Mapel ini tersedia untuk halaqoh, jurnal, target, asesmen, jadwal pengajar, portal orang tua, dan rekomendasi rapor.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(subject.quran_program_type === "tahfidz" || subject.quran_program_type === "both") && (
                <Link to="/tahfidz-halaqohs" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-xs font-bold hover:bg-emerald-100">Buka Tahfidz</Link>
              )}
              {(subject.quran_program_type === "tahsin" || subject.quran_program_type === "both") && (
                <Link to="/tahsin-halaqohs" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-xs font-bold hover:bg-emerald-100">Buka Tahsin</Link>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {!activeYearId ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Tahun ajaran belum aktif. Pilih tahun ajaran agar dokumen kelas tidak tercampur dengan periode lain.
        </div>
      ) : null}

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <BookOpen className="h-4 w-4" />
              Model Kurikulum Merdeka SD
            </div>
            <h2 className="mt-3 text-2xl font-bold">CP dan ATP per fase, perangkat ajar per kelas</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Untuk SD, Fase A mencakup kelas 1-2, Fase B kelas 3-4, dan Fase C kelas 5-6. Guru mengisi CP dan ATP sebagai arah satu fase, lalu menurunkannya menjadi Prota, Promes, RPPM, dan RPPH/Modul Ajar sesuai kelas.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Data</p>
              <p className="mt-1 text-2xl font-bold">{records.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fase Aktif</p>
              <p className="mt-1 text-2xl font-bold">{activePhases.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kelas Mapel</p>
              <p className="mt-1 text-2xl font-bold">{allowedGrades.join(", ")}</p>
            </div>
          </div>
        </div>
      </section>

      {curriculumsLoading ? (
        <div className="py-8 text-center text-muted-foreground">Memuat kurikulum...</div>
      ) : records.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed bg-muted/20 py-14 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <h4 className="font-semibold">Belum ada kurikulum SD untuk mapel ini</h4>
          <p className="mt-1 text-sm text-muted-foreground">Mulai dari CP dan ATP fase, lalu turunkan perangkat ajar per kelas.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {activePhases.map((phase) => {
            const completion = getSdPhaseCompletion(records, phase.grades);
            const cpAtpRecord = completion.records.find((record) => record.cp_text || record.atp_text);

            return (
              <section key={phase.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                  <div>
                    <div className="inline-flex rounded-md bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                      {phase.label} | {phase.rangeLabel}
                    </div>
                    <h3 className="mt-3 text-xl font-bold">{subject.name} {phase.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{phase.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill done={completion.cpFilled} label="CP Fase" />
                    <StatusPill done={completion.atpFilled} label="ATP Fase" />
                    <StatusPill done={completion.completedClasses === phase.grades.length} label="Kelas" detail={`${completion.completedClasses}/${phase.grades.length}`} />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm font-bold">Dokumen Fase</p>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-md bg-background p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">CP</p>
                        <p className="mt-1 text-sm">{cpAtpRecord?.cp_text ? "Sudah tersedia" : "Belum diisi"}</p>
                      </div>
                      <div className="rounded-md bg-background p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">ATP</p>
                        <p className="mt-1 text-sm">{cpAtpRecord?.atp_text ? "Sudah tersedia" : "Belum diisi"}</p>
                      </div>
                    </div>
                    <Link
                      to={cpAtpRecord ? `/curriculum/subject-curriculums/edit/${cpAtpRecord.id}` : createUrl(phase.grades.find((grade) => allowedGrades.includes(grade)) || firstMissingGrade)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      <FileText className="h-4 w-4" />
                      {cpAtpRecord ? "Edit CP/ATP" : "Isi CP/ATP"}
                    </Link>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {phase.grades.filter((grade) => allowedGrades.includes(grade)).map((grade) => {
                      const record = records.find((item) => Number(item.grade_level) === grade);
                      const protaCount = Array.isArray(record?.prota_data) ? record.prota_data.length : 0;
                      const semesterPlan = getSemesterPlan(record, activeSemesterId);
                      const prosemCount = Array.isArray(semesterPlan?.prosem_data?.rows) ? semesterPlan.prosem_data.rows.length : 0;
                      const rppmCount = getSemesterRppmRows(record, activeSemesterId).length;
                      const rpphCount = getSemesterLearningPlanRows(record, activeSemesterId).length;
                      const semesterReady = getCurriculumCompletion(record, cpAtpRecord, activeSemesterId).ready;
                      const finalAssessment = getFinalAssessmentType(semesterPlan, semesterPlan?.semester_name);
                      const assessmentWeightTotal = getAssessmentWeightTotal(semesterPlan);

                      return (
                        <article key={grade} className="rounded-lg border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-bold">Kelas {grade}</p>
                              <p className="text-xs text-muted-foreground">{record?.academic_years?.name || "Tahun ajaran belum dipilih"}</p>
                            </div>
                            <div className="flex gap-1">
                              <Link
                                to={record ? `/curriculum/subject-curriculums/edit/${record.id}` : createUrl(grade)}
                                className="rounded-md p-2 text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                                title={record ? "Edit perangkat ajar" : "Buat perangkat ajar"}
                              >
                                {record ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                              </Link>
                              {record ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Hapus kurikulum kelas ${grade}?`)) {
                                      deleteCurriculum(
                                        { resource: "subject_curriculums", id: String(record.id) },
                                        {
                                          onSuccess: () => toast.success("Kurikulum berhasil dihapus"),
                                          onError: (error) => toast.error("Gagal menghapus kurikulum: " + error.message),
                                        }
                                      );
                                    }
                                  }}
                                  className="rounded-md p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                                  title="Hapus"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <StatusPill done={semesterReady} label={semesterPlan?.semester_name ? `Semester ${semesterPlan.semester_name}` : "Semester Aktif"} />
                            <StatusPill done={Boolean(semesterPlan)} label={finalAssessment === "none" ? "Tanpa SAS/ASAT" : finalAssessment.toUpperCase()} />
                            <StatusPill done={Boolean(semesterPlan) && semesterPlan?.include_in_report !== false} label={semesterPlan?.include_in_report === false ? "Laporan Terpisah" : "Masuk Rapor"} />
                            <StatusPill done={assessmentWeightTotal === 100} label="Bobot Nilai" detail={`${assessmentWeightTotal}%`} />
                            <StatusPill done={hasRows(record?.prota_data)} label="Prota" detail={`${protaCount} baris`} />
                            <StatusPill done={prosemCount > 0} label="Promes" detail={`${prosemCount} pekan`} />
                            <StatusPill done={rppmCount > 0} label="RPPM" detail={`${rppmCount} pekan`} />
                            <StatusPill done={rpphCount > 0} label="RPPH" detail={`${rpphCount} modul`} />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="rounded-md border bg-muted/20 p-2">
                              <CalendarDays className="mb-1 h-4 w-4 text-primary" />
                              Prota dan Promes mengikuti kebutuhan kelas {grade}.
                            </div>
                            <div className="rounded-md border bg-muted/20 p-2">
                              <Layers3 className="mb-1 h-4 w-4 text-primary" />
                              RPPM dan RPPH dibuat per pekan/pertemuan.
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
