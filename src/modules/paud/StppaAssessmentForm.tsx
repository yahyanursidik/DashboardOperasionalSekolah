/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { supabaseClient } from "../../lib/supabase/client";
import { PAUD_LEARNING_MODE_LABELS, PAUD_PHASES, type PaudPhaseId } from "./paud-config";
import { usePaudScope } from "./use-paud-scope";
import { PaudAssessmentEditor } from "./components/PaudAssessmentEditor";

const db = supabaseClient as any;

export const StppaAssessmentForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const scope = usePaudScope();
  const studentId = params.get("student") || "";
  const phase = (PAUD_PHASES.some((item) => item.id === params.get("phase")) ? params.get("phase") : "awal") as PaudPhaseId;
  const [classId, setClassId] = React.useState("");

  // Legacy edit links (/stppa-assessments/edit/:id) resolve to the student and phase.
  React.useEffect(() => {
    if (!id) return;
    void db.from("paud_stppa_assessments").select("student_id,phase").eq("id", id).maybeSingle().then(({ data }: any) => {
      if (data) navigate(`/stppa-assessments/create?student=${data.student_id}&phase=${data.phase || "akhir"}`, { replace: true });
    });
  }, [id, navigate]);

  const student = scope.students.find((item) => item.id === studentId) || null;
  React.useEffect(() => {
    if (student?.class_id) setClassId(student.class_id);
  }, [student?.class_id]);

  const classStudents = scope.students.filter((item) => item.class_id === classId);
  const index = classStudents.findIndex((item) => item.id === studentId);
  const go = (next: { student?: string; phase?: PaudPhaseId }) => {
    setParams({ student: next.student ?? studentId, phase: next.phase ?? phase });
  };
  const classItem = scope.classById.get(classId);
  const unit = scope.unitById.get(student?.unit_id || "");
  const outOfScope = Boolean(studentId) && !scope.isLoading && !student;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <div className="flex items-start gap-3">
        <button title="Kembali" onClick={() => navigate("/stppa-assessments")} className="mt-1 rounded-full border p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title="Isi Asesmen Perkembangan"
          description="Kurikulum Merdeka Fase Fondasi: asesmen awal, tengah, dan akhir semester berdasarkan kumpulan bukti belajar."
        />
      </div>

      <section className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select
            value={classId}
            onChange={(event) => { setClassId(event.target.value); setParams({ phase }); }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Pilih kelas PAUD/TK</option>
            {scope.classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {PAUD_LEARNING_MODE_LABELS[scope.unitById.get(item.unit_id)?.delivery_mode || "reguler"]}</option>
            ))}
          </select>
          <select value={studentId} onChange={(event) => go({ student: event.target.value })} disabled={!classId} className="h-10 rounded-md border bg-background px-3 text-sm disabled:opacity-50">
            <option value="">{classId ? "Pilih anak" : "Pilih kelas terlebih dahulu"}</option>
            {classStudents.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="button" title="Anak sebelumnya" disabled={index <= 0} onClick={() => go({ student: classStudents[index - 1].id })} className="h-10 rounded-md border px-3 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" title="Anak berikutnya" disabled={index < 0 || index >= classStudents.length - 1} onClick={() => go({ student: classStudents[index + 1].id })} className="h-10 rounded-md border px-3 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-3 inline-flex w-full rounded-md border bg-muted/40 p-1 sm:w-auto">
          {PAUD_PHASES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go({ phase: item.id })}
              className={`flex-1 rounded px-4 py-2 text-sm font-semibold sm:flex-none ${phase === item.id ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              {item.title}
            </button>
          ))}
        </div>
      </section>

      {!scope.activeYearId || !scope.activeSemesterId ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Tahun ajaran dan semester aktif wajib dipilih sebelum mengisi asesmen.</div>
      ) : outOfScope ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Anak tidak ditemukan pada unit PAUD/TK yang dapat Anda kelola.</div>
      ) : !student || !scope.semester ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">Pilih kelas dan anak untuk mulai mengisi asesmen.</div>
      ) : (
        <PaudAssessmentEditor
          key={`${student.id}-${phase}-${scope.semester.id}`}
          student={student}
          classId={student.class_id || classId}
          className={classItem?.name}
          unitName={unit?.name}
          phase={phase}
          learningMode={scope.studentMode(student)}
          academicYearId={scope.activeYearId}
          semester={scope.semester}
        />
      )}
    </div>
  );
};
