import { supabaseClient } from "../../lib/supabase/client";

type TeachingScheduleValidation = {
  valid: boolean;
  message?: string;
};

export async function validateTeachingScheduleCurriculum({
  classId,
  subjectId,
  academicYearId,
  semesterId,
}: {
  classId: string;
  subjectId: string;
  academicYearId: string;
  semesterId: string;
}): Promise<TeachingScheduleValidation> {
  const [{ data: classRecord, error: classError }, { data: subjectRecord, error: subjectError }] = await Promise.all([
    supabaseClient
      .from("classes")
      .select("id, name, grade_level, unit_id, academic_year_id")
      .eq("id", classId)
      .maybeSingle(),
    supabaseClient
      .from("subjects")
      .select("id, name, unit_id, semesters")
      .eq("id", subjectId)
      .maybeSingle(),
  ]);

  if (classError) throw classError;
  if (subjectError) throw subjectError;
  if (!classRecord) return { valid: false, message: "Kelas yang dipilih tidak ditemukan." };
  if (!subjectRecord) return { valid: false, message: "Mata pelajaran yang dipilih tidak ditemukan." };
  const selectedClass = classRecord as any;
  const selectedSubject = subjectRecord as any;

  if (selectedClass.academic_year_id && selectedClass.academic_year_id !== academicYearId) {
    return { valid: false, message: `Kelas ${selectedClass.name} bukan bagian dari tahun ajaran aktif.` };
  }
  if (selectedClass.unit_id && selectedSubject.unit_id && selectedClass.unit_id !== selectedSubject.unit_id) {
    return { valid: false, message: `${selectedSubject.name} dan kelas ${selectedClass.name} berasal dari unit yang berbeda.` };
  }

  const gradeLevel = Number(selectedClass.grade_level);
  if (!gradeLevel) {
    return { valid: false, message: `Tingkat kelas ${selectedClass.name} belum dikonfigurasi.` };
  }

  const { data: semesterRecord, error: semesterError } = await supabaseClient
    .from("semesters")
    .select("id, name")
    .eq("id", semesterId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle();
  if (semesterError) throw semesterError;
  if (!semesterRecord) {
    return { valid: false, message: "Semester aktif tidak sesuai dengan tahun ajaran aktif." };
  }
  const selectedSemester = semesterRecord as any;

  const enabledSemesters = Array.isArray(selectedSubject.semesters) && selectedSubject.semesters.length > 0
    ? selectedSubject.semesters
    : ["Ganjil", "Genap"];
  if (!enabledSemesters.includes(selectedSemester.name)) {
    return { valid: false, message: `${selectedSubject.name} tidak diaktifkan untuk semester ${selectedSemester.name}.` };
  }

  const { data: curriculumRecord, error: curriculumError } = await supabaseClient
    .from("subject_curriculums")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("grade_level", gradeLevel)
    .eq("academic_year_id", academicYearId)
    .maybeSingle();
  if (curriculumError) throw curriculumError;
  if (!curriculumRecord) {
    return {
      valid: false,
      message: `Kurikulum ${selectedSubject.name} untuk kelas ${gradeLevel} belum dibuat pada tahun ajaran aktif.`,
    };
  }

  const { data: semesterPlan, error: semesterPlanError } = await supabaseClient
    .from("subject_curriculum_semesters")
    .select("id")
    .eq("subject_curriculum_id", (curriculumRecord as any).id)
    .eq("semester_id", semesterId)
    .maybeSingle();
  if (semesterPlanError) throw semesterPlanError;
  if (!semesterPlan) {
    return {
      valid: false,
      message: `Perangkat semester ${selectedSemester.name} untuk ${selectedSubject.name} kelas ${gradeLevel} belum dibuat.`,
    };
  }

  return { valid: true };
}
