/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { BookOpen, Download } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { supabaseClient } from "../../lib/supabase/client";
import { calculateFinalScore, getAssessmentGradeTypes, getFinalAssessmentType } from "../curriculum/assessment-policy";
import { LessonSchedulePanel } from "../schedules/components/LessonSchedulePanel";
import { loadStudentLearningSchedules } from "../schedules/schedule-data";

const LEGACY_GRADE_TYPES: Record<string, string> = {
  tugas_1: "formatif",
  tugas_2: "sumatif_lingkup",
  uts: "sts",
  uas: "semester_final",
};

export const PortalAcademic: React.FC = () => {
  const { student } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [grades, setGrades] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSchedulesLoading, setIsSchedulesLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      setIsLoading(true);
      const { data, error } = await supabaseClient
        .from("academic_grades")
        .select("id, subject_id, semester_id, grade_type, score, created_at, subjects(name, category), semesters(name, academic_years(name)), subject_curriculum_semesters(include_in_report, final_assessment_type, assessment_weights)")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });
      if (error) console.error("Parent grade history error:", error);
      setGrades((data || []) as any[]);
      setIsLoading(false);
    };
    void fetchGrades();
  }, [student.id]);

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsSchedulesLoading(true);
      try {
        if (!student?.class_id) {
          setSchedules([]);
          return;
        }
        const { data, error } = await loadStudentLearningSchedules({
          classId: student.class_id,
          unitId: student.unit_id || student.classes?.unit_id,
          academicYearId: activeYearId,
          semesterId: activeSemesterId,
        });
        if (error) console.error("Portal academic schedules error:", error);
        setSchedules(data || []);
      } catch (error) {
        console.error("Portal academic schedules error:", error);
      } finally {
        setIsSchedulesLoading(false);
      }
    };
    void fetchSchedules();
  }, [activeSemesterId, activeYearId, student?.class_id, student?.classes?.unit_id, student?.unit_id]);

  const periods = useMemo(() => {
    const periodMap = new Map<string, any>();
    grades.forEach((grade) => {
      const semester = grade.semesters;
      const yearName = semester?.academic_years?.name || "Tahun ajaran";
      const semesterName = semester?.name || "Semester";
      const periodKey = String(grade.semester_id);
      const period = periodMap.get(periodKey) || { id: periodKey, label: `${yearName} - Semester ${semesterName}`, subjects: new Map<string, any>() };
      const subjectKey = String(grade.subject_id);
      const plan = grade.subject_curriculum_semesters;
      if (plan?.include_in_report === false) return;
      const subject = period.subjects.get(subjectKey) || {
        id: subjectKey,
        name: grade.subjects?.name || "Mata Pelajaran",
        category: grade.subjects?.category,
        plan,
        scores: {},
      };
      const normalizedType = LEGACY_GRADE_TYPES[grade.grade_type] || grade.grade_type;
      const finalType = getFinalAssessmentType(plan, semesterName);
      const scoreKey = normalizedType === "semester_final" ? finalType : normalizedType;
      subject.scores[scoreKey] = grade.score;
      period.subjects.set(subjectKey, subject);
      periodMap.set(periodKey, period);
    });

    return Array.from(periodMap.values()).map((period) => ({
      ...period,
      subjects: Array.from(period.subjects.values()).map((subject: any) => {
        const semesterName = period.label.toLowerCase().includes("genap") ? "Genap" : "Ganjil";
        const components = getAssessmentGradeTypes(subject.plan, semesterName);
        return {
          ...subject,
          components,
          finalType: getFinalAssessmentType(subject.plan, semesterName),
          finalScore: calculateFinalScore(subject.scores, subject.plan, semesterName),
        };
      }).sort((a: any, b: any) => a.name.localeCompare(b.name)),
    }));
  }, [grades]);

  const isPaud = String(student.level || "").toLowerCase().includes("paud");

  return (
    <div className="space-y-6 p-4">
      <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        <BookOpen className="h-6 w-6 text-emerald-600" /> Nilai & e-Rapor
      </h2>

      <LessonSchedulePanel
        schedules={schedules}
        isLoading={isSchedulesLoading}
        title="Jadwal Pelajaran"
        description="Jadwal pelajaran kelas aktif siswa untuk membantu orang tua menyiapkan buku, tugas, dan pendampingan belajar."
        emptyMessage="Belum ada jadwal pelajaran untuk kelas siswa ini."
        defaultType="mengajar"
        compact
      />

      {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Memuat riwayat nilai...</div> : periods.length === 0 ? (
        <div className="rounded-md border border-dashed bg-gray-50 p-8 text-center text-gray-500">Belum ada riwayat nilai akademik yang dapat ditampilkan.</div>
      ) : (
        <div className="space-y-5">
          {periods.map((period) => (
            <section key={period.id} className="overflow-hidden rounded-md border bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-bold text-emerald-900">{period.label}</h3>
                <Link to="/portal/reports" className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                  <Download className="h-3.5 w-3.5" /> Buka e-Rapor
                </Link>
              </div>
              <div className="divide-y">
                {period.subjects.map((subject: any) => {
                  const qualitative = Object.values(subject.scores).filter(Boolean).at(-1);
                  return (
                    <div key={subject.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div>
                        <p className="font-semibold text-gray-900">{subject.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{subject.category || "Akademik"} | {subject.finalType === "none" ? "Tanpa asesmen akhir" : subject.finalType.toUpperCase()}</p>
                        <p className="mt-1 text-xs text-gray-500">{subject.components.map((component: any) => `${component.label} ${component.weight}%`).join(" | ")}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold uppercase text-gray-500">Nilai akhir</p>
                        <p className="text-2xl font-bold text-gray-950">{isPaud ? String(qualitative || "-") : subject.finalScore ?? "-"}</p>
                        {!isPaud && subject.finalScore === null ? <p className="text-[10px] text-amber-700">Komponen nilai belum lengkap</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
