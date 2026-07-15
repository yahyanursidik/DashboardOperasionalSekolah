import React, { useEffect, useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { useSearchParams } from "react-router-dom";
import { BookOpenCheck, FilterX, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { calculateFinalScore, getAssessmentGradeTypes } from "../../curriculum/assessment-policy";

const PAUD_OPTIONS = ["", "BB", "MB", "BSH", "BSB"];

type SubjectOffering = {
  id: string;
  name: string;
  curriculumSemesterId: string | null;
  plan: any;
};

export const Gradebook: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { activeSemesterId } = useAcademicYear();
  const [selectedSemester, setSelectedSemester] = useState(activeSemesterId || "");
  const [selectedClass, setSelectedClass] = useState(searchParams.get("class_id") || "");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [offerings, setOfferings] = useState<SubjectOffering[]>([]);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: semesters } = useList({ resource: "semesters", meta: { select: "*, academic_years(name)" }, pagination: { mode: "off" } });
  const { data: classes } = useList({ resource: "classes", meta: { select: "*, units(name)" }, pagination: { mode: "off" } });
  const { data: subjects } = useList({ resource: "subjects", filters: [{ field: "is_active", operator: "eq", value: true }], pagination: { mode: "off" } });
  const { data: students, isLoading: isLoadingStudents } = useList({
    resource: "students",
    filters: [{ field: "class_id", operator: "eq", value: selectedClass }, { field: "status", operator: "eq", value: "active" }],
    queryOptions: { enabled: Boolean(selectedClass) },
    pagination: { mode: "off" },
  });

  useEffect(() => {
    if (!selectedSemester && activeSemesterId) setSelectedSemester(activeSemesterId);
  }, [activeSemesterId, selectedSemester]);

  const semester = semesters?.data?.find((item: any) => String(item.id) === String(selectedSemester));
  const availableClasses = useMemo(
    () => (classes?.data || []).filter((item: any) => !semester?.academic_year_id || item.academic_year_id === semester.academic_year_id),
    [classes?.data, semester?.academic_year_id],
  );
  const currentClass = classes?.data?.find((item: any) => String(item.id) === String(selectedClass));
  const unitName = currentClass?.units?.name?.toLowerCase() || "";
  const className = currentClass?.name?.toLowerCase() || "";
  const isPaud = ["paud", "tk", "kb", "preschool"].some((name) => unitName.includes(name) || className.includes(name));

  useEffect(() => {
    if (selectedClass && !availableClasses.some((item: any) => String(item.id) === String(selectedClass))) {
      setSelectedClass("");
      setSelectedSubject("");
    }
  }, [availableClasses, selectedClass]);

  useEffect(() => {
    const loadOfferings = async () => {
      setSelectedSubject("");
      setOfferings([]);
      if (!selectedSemester || !currentClass || !semester) return;
      setIsLoadingOfferings(true);
      try {
        if (isPaud) {
          setOfferings((subjects?.data || [])
            .filter((subject: any) => !subject.unit_id || subject.unit_id === currentClass.unit_id)
            .map((subject: any) => ({ id: String(subject.id), name: subject.name, curriculumSemesterId: null, plan: null })));
          return;
        }

        const { data, error } = await supabaseClient
          .from("subject_curriculums")
          .select("id, subject_id, grade_level, subjects(id, name), subject_curriculum_semesters(id, semester_id, include_in_report, final_assessment_type, assessment_weights, status)")
          .eq("academic_year_id", currentClass.academic_year_id)
          .eq("grade_level", Number(currentClass.grade_level || currentClass.level));
        if (error) throw error;

        const nextOfferings = ((data || []) as any[]).flatMap((curriculum) => {
          const plan = curriculum.subject_curriculum_semesters?.find((item: any) => String(item.semester_id) === String(selectedSemester));
          if (!plan || !curriculum.subjects?.id) return [];
          return [{ id: String(curriculum.subjects.id), name: curriculum.subjects.name, curriculumSemesterId: String(plan.id), plan }];
        });
        setOfferings(nextOfferings.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error: any) {
        toast.error("Daftar mata pelajaran semester belum dapat dimuat", { description: error.message });
      } finally {
        setIsLoadingOfferings(false);
      }
    };
    void loadOfferings();
  }, [currentClass, isPaud, selectedSemester, semester, subjects?.data]);

  const selectedOffering = offerings.find((item) => item.id === selectedSubject);
  const gradeTypes = useMemo(
    () => getAssessmentGradeTypes(selectedOffering?.plan, semester?.name),
    [selectedOffering?.plan, semester?.name],
  );

  useEffect(() => {
    const fetchGrades = async () => {
      setGrades({});
      if (!selectedSemester || !selectedClass || !selectedSubject) return;
      const { data, error } = await supabaseClient.from("academic_grades").select("student_id, grade_type, score").eq("semester_id", selectedSemester).eq("class_id", selectedClass).eq("subject_id", selectedSubject);
      if (error) return toast.error("Nilai sebelumnya belum dapat dimuat", { description: error.message });
      const next: Record<string, string> = {};
      (data || []).forEach((grade: any) => { next[`${grade.student_id}_${grade.grade_type}`] = grade.score || ""; });
      setGrades(next);
    };
    void fetchGrades();
  }, [selectedClass, selectedSemester, selectedSubject]);

  const handleSaveAll = async () => {
    if (!selectedOffering || !students?.data) return;
    try {
      const payload = students.data.flatMap((student: any) => gradeTypes.flatMap((type) => {
        const score = grades[`${student.id}_${type.value}`];
        if (score === undefined || score === "") return [];
        const numeric = Number(score);
        if (!isPaud && (!Number.isFinite(numeric) || numeric < 0 || numeric > 100)) throw new Error(`Nilai ${student.full_name} harus 0-100.`);
        return [{ student_id: student.id, subject_id: selectedOffering.id, class_id: selectedClass, semester_id: selectedSemester, subject_curriculum_semester_id: selectedOffering.curriculumSemesterId, grade_type: type.value, score }];
      }));
      if (!payload.length) {
        toast.error("Belum ada nilai yang diisi.");
        return;
      }
      setIsSaving(true);
      const { error } = await supabaseClient.from("academic_grades").upsert(payload, { onConflict: "student_id,subject_id,class_id,semester_id,grade_type" });
      if (error) throw error;
      toast.success("Nilai berhasil disimpan", { description: `${payload.length} komponen nilai diperbarui.` });
    } catch (error: any) {
      toast.error("Nilai belum dapat disimpan", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return <div className="space-y-6">
    <PageHeader title="Gradebook Akademik" description="Input nilai berdasarkan mapel-kelas, tahun ajaran, semester, dan kebijakan asesmen kurikulum." />
    <section className="rounded-lg border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
        <label className="text-xs font-semibold text-muted-foreground">TAHUN AJARAN / SEMESTER<select value={selectedSemester} onChange={(event) => { setSelectedSemester(event.target.value); setSelectedClass(""); setSelectedSubject(""); }} className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal text-foreground"><option value="">Pilih periode</option>{semesters?.data?.map((item: any) => <option key={item.id} value={item.id}>{item.academic_years?.name || "Tahun ajaran"} - {item.name}{item.is_active ? " (Aktif)" : ""}</option>)}</select></label>
        <label className="text-xs font-semibold text-muted-foreground">KELAS<select value={selectedClass} onChange={(event) => { setSelectedClass(event.target.value); setSelectedSubject(""); }} className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal text-foreground"><option value="">Pilih kelas</option>{availableClasses.map((item: any) => <option key={item.id} value={item.id}>{item.name} - {item.units?.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-muted-foreground">MATA PELAJARAN<select value={selectedSubject} disabled={!selectedClass || isLoadingOfferings} onChange={(event) => setSelectedSubject(event.target.value)} className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal text-foreground disabled:opacity-60"><option value="">{isLoadingOfferings ? "Memuat mapel..." : "Pilih mapel semester"}</option>{offerings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <button onClick={() => { setSelectedClass(""); setSelectedSubject(""); }} title="Reset filter" className="flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold"><FilterX className="h-4 w-4" />Reset</button>
      </div>
      {selectedClass && !isPaud && !isLoadingOfferings && offerings.length === 0 ? <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Belum ada mata pelajaran yang dikonfigurasi untuk kelas dan semester ini. Lengkapi Kurikulum SD terlebih dahulu.</p> : null}
    </section>

    {selectedOffering ? <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 font-bold"><BookOpenCheck className="h-5 w-5 text-primary" />{selectedOffering.name}</h2><p className="mt-1 text-xs text-muted-foreground">{semester?.academic_years?.name} - Semester {semester?.name} | {gradeTypes.map((type) => `${type.label} ${type.weight}%`).join(" | ")}</p></div><button onClick={() => void handleSaveAll()} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Save className="h-4 w-4" />{isSaving ? "Menyimpan..." : "Simpan Nilai"}</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Siswa</th>{gradeTypes.map((type) => <th key={type.value} className="px-4 py-3 text-center">{type.label}<span className="block text-[10px] font-normal">{type.weight}%</span></th>)}<th className="px-4 py-3 text-center">Nilai Akhir</th></tr></thead><tbody className="divide-y">{isLoadingStudents ? <tr><td colSpan={gradeTypes.length + 2} className="p-8 text-center">Memuat siswa...</td></tr> : students?.data?.map((student: any) => { const studentGrades = Object.fromEntries(gradeTypes.map((type) => [type.value, grades[`${student.id}_${type.value}`]])); const finalScore = isPaud ? null : calculateFinalScore(studentGrades, selectedOffering.plan, semester?.name); return <tr key={student.id}><td className="px-4 py-3"><p className="font-semibold">{student.full_name}</p><p className="text-xs text-muted-foreground">{student.nis || student.nisn || "-"}</p></td>{gradeTypes.map((type) => <td key={type.value} className="px-4 py-2">{isPaud ? <select value={grades[`${student.id}_${type.value}`] || ""} onChange={(event) => setGrades((current) => ({ ...current, [`${student.id}_${type.value}`]: event.target.value }))} className="w-full rounded-md border px-2 py-2 text-center">{PAUD_OPTIONS.map((option) => <option key={option} value={option}>{option || "-"}</option>)}</select> : <input type="number" min={0} max={100} value={grades[`${student.id}_${type.value}`] || ""} onChange={(event) => setGrades((current) => ({ ...current, [`${student.id}_${type.value}`]: event.target.value }))} className="w-full rounded-md border px-2 py-2 text-center" />}</td>)}<td className="px-4 py-3 text-center text-base font-bold">{finalScore ?? "-"}</td></tr>; })}</tbody></table></div>
    </section> : <div className="rounded-lg border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">Pilih periode, kelas, dan mata pelajaran untuk mulai mengisi nilai.</div>}
  </div>;
};
