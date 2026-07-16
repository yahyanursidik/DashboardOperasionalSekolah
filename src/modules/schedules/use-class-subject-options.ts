/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { supabaseClient } from "../../lib/supabase/client";

export interface ClassSubjectOption {
  value: string;
  label: string;
  assigned: boolean;
  curriculumStatus: string | null;
}

interface ClassRecord {
  id: string;
  name: string;
  grade_level: number | null;
  level?: number | null;
  unit_id: string | null;
  academic_year_id: string | null;
}

interface CurriculumSubject {
  id: string;
  name: string;
  code?: string | null;
  is_active?: boolean | null;
  unit_id?: string | null;
  grade_levels?: number[] | null;
  semesters?: string[] | null;
}

interface SemesterPlan {
  semester_id: string;
  status?: string | null;
}

interface CurriculumRow {
  subject_id: string;
  subjects: CurriculumSubject | CurriculumSubject[] | null;
  subject_curriculum_semesters: SemesterPlan[] | SemesterPlan | null;
}

function firstRecord<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

function normalizeSubjectName(value: string) {
  return value.trim().toLocaleLowerCase("id-ID").replace(/\s+/g, " ");
}

function semesterMatches(subject: CurriculumSubject, semesterName: string | null) {
  if (!semesterName || !Array.isArray(subject.semesters) || subject.semesters.length === 0) return true;
  const expected = semesterName.trim().toLocaleLowerCase("id-ID");
  return subject.semesters.some((semester) => semester.trim().toLocaleLowerCase("id-ID") === expected);
}

export function useClassSubjectOptions({
  classId,
  employeeId,
  academicYearId,
  semesterId,
}: {
  classId: string;
  employeeId: string;
  academicYearId?: string | null;
  semesterId?: string | null;
}) {
  const [options, setOptions] = useState<ClassSubjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Pilih kelas untuk memuat mata pelajaran kurikulum.");
  const [error, setError] = useState("");
  const [assignmentSupported, setAssignmentSupported] = useState(true);

  useEffect(() => {
    let active = true;
    setOptions([]);
    setError("");
    setAssignmentSupported(true);
    if (!classId) {
      setMessage("Pilih kelas untuk memuat mata pelajaran kurikulum.");
      setIsLoading(false);
      return () => { active = false; };
    }
    if (!academicYearId || !semesterId) {
      setMessage("Tahun ajaran dan semester aktif belum lengkap.");
      setIsLoading(false);
      return () => { active = false; };
    }

    setIsLoading(true);
    setMessage("Memuat mata pelajaran kelas...");
    const load = async () => {
      const { data: classData, error: classError } = await supabaseClient
        .from("classes")
        .select("id, name, grade_level, level, unit_id, academic_year_id")
        .eq("id", classId)
        .maybeSingle();
      if (classError) throw classError;
      const selectedClass = classData as ClassRecord | null;
      if (!selectedClass) throw new Error("Kelas yang dipilih tidak ditemukan.");
      if (selectedClass.academic_year_id && selectedClass.academic_year_id !== academicYearId) {
        throw new Error(`Kelas ${selectedClass.name} tidak berada pada tahun ajaran aktif.`);
      }
      const gradeLevel = Number(selectedClass.grade_level || selectedClass.level || 0);
      if (!gradeLevel) throw new Error(`Tingkat kelas ${selectedClass.name} belum dikonfigurasi.`);

      const { data: semesterData, error: semesterError } = await supabaseClient
        .from("semesters")
        .select("id, name, academic_year_id")
        .eq("id", semesterId)
        .maybeSingle();
      if (semesterError) throw semesterError;
      const selectedSemester = semesterData as unknown as { name: string; academic_year_id: string | null } | null;
      if (selectedSemester?.academic_year_id && selectedSemester.academic_year_id !== academicYearId) {
        throw new Error("Semester aktif tidak berada pada tahun ajaran yang dipilih.");
      }

      let assignmentQuery = supabaseClient
        .from("teacher_assignments")
        .select("subject_id")
        .eq("class_id", classId)
        .eq("academic_year_id", academicYearId)
        .eq("semester_id", semesterId)
        .eq("is_active", true)
        .not("subject_id", "is", null);
      if (employeeId) assignmentQuery = assignmentQuery.eq("employee_id", employeeId);

      let legacySubjectQuery = supabaseClient
        .from("subjects")
        .select("id, name, code, is_active, unit_id, grade_levels, semesters")
        .eq("is_active", true)
        .contains("grade_levels", [gradeLevel]);
      if (selectedClass.unit_id) legacySubjectQuery = legacySubjectQuery.eq("unit_id", selectedClass.unit_id);

      const [curriculumResult, legacySubjectResult, assignmentResult] = await Promise.all([
        supabaseClient
          .from("subject_curriculums")
          .select("subject_id, subjects(id, name, code, is_active, unit_id, grade_levels, semesters), subject_curriculum_semesters!inner(semester_id, status)")
          .eq("academic_year_id", academicYearId)
          .eq("grade_level", gradeLevel)
          .eq("subject_curriculum_semesters.semester_id", semesterId),
        legacySubjectQuery,
        assignmentQuery,
      ]);
      if (curriculumResult.error) throw curriculumResult.error;
      if (legacySubjectResult.error) throw legacySubjectResult.error;

      const assignmentRows = (assignmentResult.data || []) as unknown as Array<{ subject_id: string | null }>;
      const supportsStructuredAssignment = !assignmentResult.error;
      if (active) setAssignmentSupported(supportsStructuredAssignment);
      const assignedSubjectIds = new Set(assignmentRows.map((row) => String(row.subject_id || "")).filter(Boolean));
      const optionMap = new Map<string, ClassSubjectOption>();
      const curriculumRows = (curriculumResult.data || []) as unknown as CurriculumRow[];
      const addOption = (subject: CurriculumSubject, curriculumStatus: string | null) => {
        if (!subject.id || subject.is_active === false || !semesterMatches(subject, selectedSemester?.name || null)) return;
        if (selectedClass.unit_id && subject.unit_id && subject.unit_id !== selectedClass.unit_id) return;
        const candidate: ClassSubjectOption = {
          value: String(subject.id),
          label: subject.code ? `${subject.name} (${subject.code})` : subject.name,
          assigned: employeeId ? (!supportsStructuredAssignment || assignedSubjectIds.has(String(subject.id))) : false,
          curriculumStatus,
        };
        const semanticKey = normalizeSubjectName(subject.name);
        const existing = optionMap.get(semanticKey);
        if (!existing || (!existing.assigned && candidate.assigned)) optionMap.set(semanticKey, candidate);
      };

      for (const row of curriculumRows) {
        const subject = firstRecord(row.subjects);
        const plan = firstRecord(row.subject_curriculum_semesters);
        if (subject) addOption(subject, plan?.status || null);
      }

      // Data lama mengaitkan mapel lewat subjects.grade_levels. Gunakan hanya
      // ketika kurikulum semester untuk tingkat tersebut belum dikonfigurasi.
      if (curriculumRows.length === 0) {
        for (const subject of (legacySubjectResult.data || []) as unknown as CurriculumSubject[]) addOption(subject, null);
      }

      const nextOptions = Array.from(optionMap.values()).sort((first, second) => first.label.localeCompare(second.label, "id"));
      if (!active) return;
      setOptions(nextOptions);
      const assignedCount = nextOptions.filter((option) => option.assigned).length;
      if (nextOptions.length === 0) {
        setMessage(`Belum ada mata pelajaran untuk ${selectedClass.name} pada semester aktif.`);
      } else if (!employeeId) {
        setMessage(`${nextOptions.length} mata pelajaran mengikuti ${selectedClass.name}. Pilih pegawai untuk memeriksa penugasan.`);
      } else if (!supportsStructuredAssignment) {
        setMessage(`${nextOptions.length} mata pelajaran mengikuti ${selectedClass.name} dan semester aktif.`);
      } else if (assignedCount === 0) {
        setMessage(`${nextOptions.length} mata pelajaran mengikuti ${selectedClass.name}, tetapi belum ada yang ditugaskan kepada pegawai ini.`);
      } else {
        setMessage(`${assignedCount} dari ${nextOptions.length} mata pelajaran ${selectedClass.name} sesuai dengan penugasan pegawai.`);
      }
    };

    void load()
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Mata pelajaran kelas gagal dimuat.");
        setMessage("");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [academicYearId, classId, employeeId, semesterId]);

  return { options, isLoading, message, error, assignmentSupported };
}
