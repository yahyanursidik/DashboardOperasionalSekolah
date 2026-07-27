/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import {
  Award,
  BookOpenCheck,
  CheckSquare,
  ChevronDown,
  CircleAlert,
  GraduationCap,
  Loader2,
  Save,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { getScheduleSubjectName } from "../schedules/schedule-utils";
import { getAssessmentGradeTypes } from "../curriculum/assessment-policy";
import {
  isHomeroomAssignment,
  isTeachingAssignment,
  loadTeacherAcademicAssignments,
} from "./teacher-assignment-data";

type AttendanceStatus = "hadir" | "izin" | "sakit" | "alpa" | "terlambat" | "pulang_awal";
type SubjectOption = {
  id?: string | null;
  name: string;
  curriculumStatus?: "draft" | "in_progress" | "ready" | "reviewed" | "missing";
  weeklyHours?: number | null;
  curriculumSemesterId?: string | null;
  includeInReport?: boolean;
  finalAssessmentType?: "sas" | "asat" | "none";
  assessmentWeights?: Record<string, number>;
};

const curriculumStatusMeta = {
  reviewed: { label: "Ditelaah", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  ready: { label: "Siap", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  in_progress: { label: "Sedang disusun", className: "border-amber-200 bg-amber-50 text-amber-700" },
  draft: { label: "Draf", className: "border-gray-200 bg-gray-50 text-gray-600" },
  missing: { label: "Belum tersedia", className: "border-red-200 bg-red-50 text-red-700" },
} as const;

const attendanceOptions: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "hadir", label: "Hadir" },
  { value: "sakit", label: "Sakit" },
  { value: "izin", label: "Izin" },
  { value: "alpa", label: "Alpa" },
  { value: "terlambat", label: "Terlambat" },
  { value: "pulang_awal", label: "Pulang Awal" },
];

const getLocalDateString = () => {
  const date = new Date();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

function normalizeSubjectName(value?: string | null) {
  return String(value || "")
    .replace(/\s*\(kelompok\s+\d+\)\s*$/i, "")
    .trim()
    .toLowerCase();
}

export const TeacherClasses: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [classView, setClassView] = useState<"all" | "homeroom" | "teaching">("all");
  const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(new Set());
  
  // States for Student List Modal (for Attendance/Grades)
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [actionType, setActionType] = useState<"attendance" | "grades" | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(getLocalDateString());
  const [attendanceValues, setAttendanceValues] = useState<Record<string, AttendanceStatus>>({});
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [gradeType, setGradeType] = useState("formatif");
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({});
  const [activeSemesterName, setActiveSemesterName] = useState<string>();

  useEffect(() => {
    const loadActiveSemester = async () => {
      if (!activeSemesterId) {
        setActiveSemesterName(undefined);
        return;
      }
      const { data } = await supabaseClient.from("semesters").select("name").eq("id", activeSemesterId).maybeSingle();
      setActiveSemesterName((data as any)?.name || undefined);
    };
    void loadActiveSemester();
  }, [activeSemesterId]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        let scheduleQuery = supabaseClient
          .from("employee_schedules")
          .select("class_id, subject_id, subject, classes(id, name, level, grade_level, capacity, homeroom_teacher_id, unit_id, academic_year_id, units(id, name, education_level)), subjects(id, name)")
          .eq("employee_id", employee.id)
          .eq("schedule_type", "mengajar")
          .not("class_id", "is", null);
        if (activeYearId) scheduleQuery = scheduleQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) scheduleQuery = scheduleQuery.eq("semester_id", activeSemesterId);

        let homeroomQuery = supabaseClient
          .from("classes")
          .select("id, name, level, grade_level, capacity, homeroom_teacher_id, unit_id, academic_year_id, units(id, name, education_level)")
          .eq("homeroom_teacher_id", employee.id);
        if (activeYearId) homeroomQuery = homeroomQuery.eq("academic_year_id", activeYearId);

        const [scheduleResult, assignmentResult, homeroomResult] = await Promise.all([
          scheduleQuery,
          loadTeacherAcademicAssignments({
            employeeId: employee.id,
            academicYearId: activeYearId,
            semesterId: activeSemesterId,
          }),
          homeroomQuery,
        ]);
        if (scheduleResult.error) {
          toast.error("Jadwal mengajar belum dapat dimuat", { description: scheduleResult.error.message });
        }
        if (assignmentResult.error) {
          toast.error("Penugasan akademik belum dapat dimuat", { description: assignmentResult.error.message });
        }

        const schedules = (scheduleResult.data || []) as any[];
        const assignments = (assignmentResult.data || []) as any[];
        const map = new Map<string, any>();
        const ensureClass = (cls: any) => {
          if (!cls?.id) return null;
          const current = map.get(cls.id) ?? {
            ...cls,
            _subjects: [],
            _students: [],
            _isHomeroom: false,
            _isTeaching: false,
            _assignmentRoles: [],
          };
          map.set(cls.id, current);
          return current;
        };

        schedules.forEach((schedule: any) => {
          const cls = schedule.classes;
          const current = ensureClass(cls);
          if (!current) return;
          current._isTeaching = true;
          const subjectName = getScheduleSubjectName(schedule);
          const subjectOption: SubjectOption = { id: schedule.subject_id || schedule.subjects?.id || null, name: subjectName };
          if (subjectName && !current._subjects.some(
            (subject: SubjectOption) => normalizeSubjectName(subject.name) === normalizeSubjectName(subjectName),
          )) {
            current._subjects.push(subjectOption);
          }
        });

        assignments.forEach((assignment: any) => {
          const current = ensureClass(assignment.classes);
          if (!current) return;
          if (!current._assignmentRoles.includes(assignment.role_type)) {
            current._assignmentRoles.push(assignment.role_type);
          }
          if (isHomeroomAssignment(assignment)) current._isHomeroom = true;
          if (!isTeachingAssignment(assignment)) return;
          current._isTeaching = true;

          const subjectName = assignment.subjects?.name || assignment.subject;
          if (!subjectName) return;
          const matchingSchedule = schedules.find(
            (schedule: any) =>
              schedule.class_id === assignment.class_id
              && normalizeSubjectName(getScheduleSubjectName(schedule)) === normalizeSubjectName(subjectName),
          );
          const subjectOption: SubjectOption = {
            id: assignment.subject_id || assignment.subjects?.id || matchingSchedule?.subject_id || matchingSchedule?.subjects?.id || null,
            name: subjectName,
            weeklyHours: assignment.hours_per_week ?? null,
          };
          const existingSubject = current._subjects.find(
            (subject: SubjectOption) => normalizeSubjectName(subject.name) === normalizeSubjectName(subjectName),
          );
          if (existingSubject) {
            Object.assign(existingSubject, {
              id: existingSubject.id || subjectOption.id,
              weeklyHours: subjectOption.weeklyHours ?? existingSubject.weeklyHours,
            });
          } else {
            current._subjects.push(subjectOption);
          }
        });

        (homeroomResult.data || []).forEach((cls: any) => {
          const current = ensureClass(cls);
          if (current) current._isHomeroom = true;
        });

        const classRows = Array.from(map.values());
        const classIds = classRows.map((cls) => cls.id);
        if (classIds.length > 0) {
          const { data: studentRows, error: studentsError } = await supabaseClient
            .from("students")
            .select("id, full_name, nis, nisn, gender, class_id")
            .in("class_id", classIds)
            .eq("status", "active")
            .order("full_name");
          if (studentsError) {
            toast.error("Daftar siswa belum dapat dimuat", { description: studentsError.message });
          } else {
            classRows.forEach((cls) => {
              cls._students = (studentRows || []).filter((student: any) => student.class_id === cls.id);
            });
          }
        }

        const subjectIds = [...new Set<string>(
          classRows.flatMap((cls) => (cls._subjects || []).map((subject: SubjectOption) => subject.id).filter(Boolean)),
        )];
        if (activeYearId && activeSemesterId && subjectIds.length > 0) {
          const { data: curriculumRows, error: curriculumError } = await supabaseClient
            .from("subject_curriculums")
            .select("id, subject_id, grade_level, subject_curriculum_semesters(id, semester_id, status, weekly_hours, include_in_report, final_assessment_type, assessment_weights)")
            .eq("academic_year_id", activeYearId)
            .in("subject_id", subjectIds);

          if (curriculumError) {
            console.error("Teacher curriculum readiness error:", curriculumError);
          } else {
            const availableCurriculums = (curriculumRows || []) as any[];
            classRows.forEach((cls) => {
              const gradeLevel = Number(cls.grade_level || cls.level);
              cls._subjects = (cls._subjects || []).map((subject: SubjectOption) => {
                const curriculum = availableCurriculums.find(
                  (row: any) => String(row.subject_id) === String(subject.id) && Number(row.grade_level) === gradeLevel,
                );
                const semesterPlan = curriculum?.subject_curriculum_semesters?.find(
                  (plan: any) => String(plan.semester_id) === String(activeSemesterId),
                );
                return {
                  ...subject,
                  curriculumStatus: semesterPlan?.status || "missing",
                  weeklyHours: semesterPlan?.weekly_hours ?? subject.weeklyHours ?? null,
                  curriculumSemesterId: semesterPlan?.id || null,
                  includeInReport: semesterPlan?.include_in_report !== false,
                  finalAssessmentType: semesterPlan?.final_assessment_type,
                  assessmentWeights: semesterPlan?.assessment_weights,
                };
              });
            });
          }
        }

        setClasses(classRows.sort((a, b) => {
          if (a._isHomeroom !== b._isHomeroom) return a._isHomeroom ? -1 : 1;
          return String(a.name).localeCompare(String(b.name));
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClasses();
  }, [activeSemesterId, activeYearId, employee.id]);

  const classSummary = useMemo(() => {
    const homeroomClasses = classes.filter((cls) => cls._isHomeroom);
    const teachingClasses = classes.filter((cls) => cls._isTeaching);
    return {
      homeroomClasses: homeroomClasses.length,
      homeroomStudents: homeroomClasses.reduce((total, cls) => total + (cls._students?.length || 0), 0),
      teachingClasses: teachingClasses.length,
      subjects: new Set(
        teachingClasses.flatMap((cls) => (cls._subjects || []).map((subject: SubjectOption) => normalizeSubjectName(subject.name))),
      ).size,
    };
  }, [classes]);
  const visibleClasses = useMemo(
    () => classes.filter((cls) =>
      classView === "all"
      || (classView === "homeroom" && cls._isHomeroom)
      || (classView === "teaching" && cls._isTeaching)
    ),
    [classView, classes],
  );

  const selectedSubjectOffering = useMemo(
    () => (selectedClass?._subjects || []).find((subject: SubjectOption) => String(subject.id) === String(selectedSubjectId)),
    [selectedClass, selectedSubjectId],
  );
  const gradeTypes = useMemo(
    () => getAssessmentGradeTypes({
      final_assessment_type: selectedSubjectOffering?.finalAssessmentType,
      assessment_weights: selectedSubjectOffering?.assessmentWeights,
    }, activeSemesterName),
    [activeSemesterName, selectedSubjectOffering?.assessmentWeights, selectedSubjectOffering?.finalAssessmentType],
  );

  useEffect(() => {
    const fetchExistingGrades = async () => {
      if (actionType !== "grades" || !selectedClass?.id || !activeSemesterId || !selectedSubjectId || students.length === 0) {
        return;
      }

      const { data, error } = await supabaseClient
        .from("academic_grades")
        .select("student_id, score")
        .eq("class_id", selectedClass.id)
        .eq("semester_id", activeSemesterId)
        .eq("subject_id", selectedSubjectId)
        .eq("grade_type", gradeType);

      if (error) {
        toast.error("Gagal memuat nilai sebelumnya", { description: error.message });
        return;
      }

      const nextValues: Record<string, string> = {};
      students.forEach((student) => {
        nextValues[student.id] = "";
      });
      (data || []).forEach((grade: any) => {
        nextValues[grade.student_id] = grade.score || "";
      });
      setGradeValues(nextValues);
    };

    fetchExistingGrades();
  }, [actionType, activeSemesterId, gradeType, selectedClass?.id, selectedSubjectId, students]);

  const loadAttendanceForDate = async (clsId: string, date: string, studentRows: any[]) => {
    const defaults: Record<string, AttendanceStatus> = {};
    studentRows.forEach((student) => {
      defaults[student.id] = "hadir";
    });

    const { data, error } = await supabaseClient
      .from("attendance_records")
      .select("student_id, status")
      .eq("class_id", clsId)
      .eq("attendance_date", date);

    if (error) {
      toast.error("Gagal memuat absensi sebelumnya", { description: error.message });
      setAttendanceValues(defaults);
      return;
    }

    (data || []).forEach((record: any) => {
      defaults[record.student_id] = record.status || "hadir";
    });
    setAttendanceValues(defaults);
  };

  const closeModal = () => {
    setSelectedClass(null);
    setActionType(null);
    setStudents([]);
    setAttendanceValues({});
    setGradeValues({});
    setSelectedSubjectId("");
    setGradeType("formatif");
  };

  const openClassAction = async (cls: any, type: "attendance" | "grades") => {
    setSelectedClass(cls);
    setActionType(type);
    setIsStudentsLoading(true);
    setAttendanceDate(getLocalDateString());
    setAttendanceValues({});
    setGradeValues({});
    const firstSubject = (cls._subjects || []).find((subject: SubjectOption) => subject.id);
    const firstGradeTypes = getAssessmentGradeTypes({
      final_assessment_type: firstSubject?.finalAssessmentType,
      assessment_weights: firstSubject?.assessmentWeights,
    }, activeSemesterName);
    setGradeType(firstGradeTypes[0]?.value || "formatif");
    setSelectedSubjectId(type === "grades" ? (firstSubject?.id || "") : "");

    try {
      const { data } = await supabaseClient
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", cls.id)
        .eq("status", "active")
        .order("full_name");
      
      const studentRows = data || [];
      setStudents(studentRows);
      if (type === "attendance") {
        await loadAttendanceForDate(cls.id, getLocalDateString(), studentRows);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsStudentsLoading(false);
    }
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      toast.error("Gagal menyimpan: Tidak ada koneksi internet.");
      return;
    }
    if (!activeYearId || !selectedClass?.unit_id) {
      toast.error("Tahun ajaran aktif atau unit kelas belum lengkap.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = students.map((student) => ({
        student_id: student.id,
        class_id: selectedClass.id,
        unit_id: selectedClass.unit_id,
        academic_year_id: activeYearId,
        attendance_date: attendanceDate,
        status: attendanceValues[student.id] || "hadir",
        recorded_by: employee.user_id || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabaseClient
        .from("attendance_records")
        .upsert(payload, { onConflict: "student_id,attendance_date" });

      if (error) throw error;
      toast.success("Absensi kelas berhasil disimpan.", { description: `${students.length} siswa diperbarui untuk ${selectedClass.name}.` });
      closeModal();
    } catch (error: any) {
      toast.error("Gagal menyimpan absensi", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      toast.error("Gagal menyimpan: Tidak ada koneksi internet.");
      return;
    }
    if (!activeSemesterId) {
      toast.error("Semester aktif belum dipilih.");
      return;
    }
    if (!selectedSubjectId) {
      toast.error("Pilih mata pelajaran yang tertaut jadwal.");
      return;
    }

    const invalidStudent = students.find((student) => {
      const score = gradeValues[student.id];
      if (!score) return false;
      const numeric = Number(score);
      return Number.isNaN(numeric) || numeric < 0 || numeric > 100;
    });
    if (invalidStudent) {
      toast.error("Nilai harus berupa angka 0-100.", { description: invalidStudent.full_name });
      return;
    }

    const payload = students
      .map((student) => ({
        student_id: student.id,
        subject_id: selectedSubjectId,
        class_id: selectedClass.id,
        semester_id: activeSemesterId,
        subject_curriculum_semester_id: selectedSubjectOffering?.curriculumSemesterId || null,
        grade_type: gradeType,
        score: gradeValues[student.id]?.trim(),
      }))
      .filter((row) => row.score);

    if (payload.length === 0) {
      toast.error("Belum ada nilai yang diisi.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabaseClient
        .from("academic_grades")
        .upsert(payload, { onConflict: "student_id,subject_id,class_id,semester_id,grade_type" });

      if (error) throw error;
      toast.success("Nilai akademik berhasil disimpan.", { description: `${payload.length} nilai diperbarui untuk ${selectedClass.name}.` });
      closeModal();
    } catch (error: any) {
      toast.error("Gagal menyimpan nilai", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Memuat daftar kelas...</div>;
  }

  return (
    <div className="space-y-5 p-4 md:p-0">
      <header>
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-950">
          <Users className="h-6 w-6 text-primary" /> Kelas & Siswa
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Kelas wali, kelas yang diampu, daftar siswa aktif, absensi, dan penilaian pada periode akademik aktif.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Kelas Wali", value: classSummary.homeroomClasses, icon: UserRoundCheck, tone: "bg-amber-50 text-amber-700" },
          { label: "Siswa Wali", value: classSummary.homeroomStudents, icon: Users, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Kelas Diampu", value: classSummary.teachingClasses, icon: GraduationCap, tone: "bg-blue-50 text-blue-700" },
          { label: "Mata Pelajaran", value: classSummary.subjects, icon: BookOpenCheck, tone: "bg-violet-50 text-violet-700" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-gray-950">{value}</p>
            <p className="text-xs font-semibold text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-gray-900">Ruang kerja berdasarkan surat penugasan</p>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          Penugasan wali kelas dan pengampu mata pelajaran menjadi acuan utama. Jadwal mengajar melengkapi jam pelaksanaan, sedangkan jumlah siswa dihitung dari data aktif kelas.
        </p>
        <div className="mt-4 grid grid-cols-3 rounded-md border bg-gray-50 p-1">
          {[
            { value: "all", label: "Semua" },
            { value: "homeroom", label: "Kelas Wali" },
            { value: "teaching", label: "Diampu" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setClassView(option.value as typeof classView)}
              className={`h-9 rounded px-2 text-xs font-bold transition ${
                classView === option.value ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-4 pb-8">
        {visibleClasses.length === 0 && (
          <div className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-gray-500">
            Tidak ada kelas pada kategori ini untuk periode aktif.
          </div>
        )}
        {visibleClasses.map((cls) => (
          <div key={cls.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b bg-gray-50 p-4">
              <div className="min-w-0">
                <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold text-gray-900">
                  {cls.name}
                  {cls._isHomeroom && (
                    <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Wali Kelas</span>
                  )}
                  {cls._isTeaching && (
                    <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">Pengampu</span>
                  )}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[cls.units?.name, `Tingkat ${cls.grade_level || cls.level || "-"}`].filter(Boolean).join(" - ")}
                </p>
              </div>
              <div className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {cls._students?.length || 0} siswa aktif
              </div>
            </div>

            {cls._subjects?.length > 0 && (
              <div className="space-y-2 border-b px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <BookOpenCheck className="h-4 w-4 text-emerald-600" />
                  Mata Pelajaran yang Diampu
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {cls._subjects.map((subject: SubjectOption) => {
                    const status = curriculumStatusMeta[subject.curriculumStatus || "missing"];
                    return (
                      <div key={`${subject.id || subject.name}-curriculum`} className="flex min-w-0 items-center justify-between gap-3 rounded-md border bg-white px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-gray-900">{subject.name}</p>
                          <p className="text-[10px] text-gray-500">
                            {subject.weeklyHours ? `${subject.weeklyHours} JP/minggu` : "JP belum ditetapkan"}
                            {subject.finalAssessmentType ? ` | ${subject.finalAssessmentType === "none" ? "Tanpa ujian akhir" : subject.finalAssessmentType.toUpperCase()}` : ""}
                            {subject.includeInReport === false ? " | Laporan terpisah" : " | Masuk rapor"}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${status.className}`}>{status.label}</span>
                      </div>
                    );
                  })}
                </div>
                {cls._subjects.some((subject: SubjectOption) => subject.curriculumStatus === "missing") && (
                  <p className="flex items-start gap-1.5 text-[11px] leading-4 text-red-700">
                    <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Hubungi koordinator kurikulum sebelum melanjutkan pembelajaran mapel yang belum memiliki perangkat semester.
                  </p>
                )}
              </div>
            )}

            <div className="border-b">
              <button
                type="button"
                onClick={() => setExpandedClassIds((current) => {
                  const next = new Set(current);
                  if (next.has(cls.id)) next.delete(cls.id);
                  else next.add(cls.id);
                  return next;
                })}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                aria-expanded={expandedClassIds.has(cls.id)}
              >
                <span className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <Users className="h-4 w-4 text-primary" />
                  Daftar {cls._students?.length || 0} siswa aktif
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition ${expandedClassIds.has(cls.id) ? "rotate-180" : ""}`} />
              </button>
              {expandedClassIds.has(cls.id) && (
                <div className="border-t bg-gray-50/70 p-3">
                  {cls._students?.length ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {cls._students.map((student: any, index: number) => (
                        <div key={student.id} className="flex min-w-0 items-center gap-3 rounded-md border bg-white px-3 py-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-gray-900">{student.full_name}</p>
                            <p className="truncate text-[10px] text-gray-500">NIS {student.nis || student.nisn || "-"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-xs text-gray-500">Belum ada siswa aktif yang terhubung ke kelas ini.</p>
                  )}
                </div>
              )}
            </div>

            <div className={`grid divide-x ${cls._isHomeroom && cls._subjects?.some((subject: SubjectOption) => subject.id) ? "grid-cols-2" : "grid-cols-1"}`}>
              {cls._isHomeroom && (
                <button
                  type="button"
                  onClick={() => openClassAction(cls, "attendance")}
                  className="flex items-center justify-center gap-2 p-3 transition hover:bg-gray-50"
                >
                  <CheckSquare className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-bold text-gray-700">Absensi Harian</span>
                </button>
              )}
              {cls._subjects?.some((subject: SubjectOption) => subject.id) && (
                <button
                  type="button"
                  onClick={() => openClassAction(cls, "grades")}
                  className="flex items-center justify-center gap-2 p-3 transition hover:bg-gray-50"
                >
                  <Award className="h-5 w-5 text-blue-600" />
                  <span className="text-xs font-bold text-gray-700">Input Nilai Mapel</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Modal */}
      {selectedClass && actionType && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">
                  {actionType === 'attendance' ? 'Absensi Harian' : 'Input Nilai'}
                </h3>
                <p className="text-xs text-primary font-medium">Kelas: {selectedClass.name}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-900 font-bold px-2 py-1">
                TUTUP
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1">
              {isStudentsLoading ? (
                <div className="text-center py-8 text-sm text-gray-500 animate-pulse">Memuat data siswa...</div>
              ) : (
                <form 
                  id="actionForm" 
                  onSubmit={actionType === 'attendance' ? handleSaveAttendance : handleSaveGrades}
                  className="space-y-4"
                >
                  {actionType === 'attendance' && (
                    <div className="mb-6">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Tanggal Absensi</label>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={async (event) => {
                          const nextDate = event.target.value;
                          setAttendanceDate(nextDate);
                          await loadAttendanceForDate(selectedClass.id, nextDate, students);
                        }}
                        className="w-full border rounded-lg p-2 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {actionType === 'grades' && (
                    <div className="mb-6 grid gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Mata Pelajaran</label>
                        <select
                          value={selectedSubjectId}
                          onChange={(event) => {
                            setSelectedSubjectId(event.target.value);
                            const offering = (selectedClass._subjects || []).find((subject: SubjectOption) => String(subject.id) === event.target.value);
                            const nextTypes = getAssessmentGradeTypes({ final_assessment_type: offering?.finalAssessmentType, assessment_weights: offering?.assessmentWeights }, activeSemesterName);
                            setGradeType(nextTypes[0]?.value || "formatif");
                          }}
                          className="w-full border rounded-lg p-2 text-sm outline-none focus:border-primary"
                        >
                          <option value="">Pilih mata pelajaran</option>
                          {(selectedClass._subjects || []).map((subject: SubjectOption) => (
                            <option key={`${subject.id || subject.name}`} value={subject.id || ""} disabled={!subject.id}>
                              {subject.name}{!subject.id ? " (belum tertaut master mapel)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Jenis Nilai</label>
                        <select
                          value={gradeType}
                          onChange={(event) => setGradeType(event.target.value)}
                          className="w-full border rounded-lg p-2 text-sm outline-none focus:border-primary"
                        >
                          {gradeTypes.map((type) => (
                            <option key={type.value} value={type.value}>{type.label} ({type.weight}%)</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="divide-y border rounded-xl overflow-hidden">
                    {students.map((student, index) => (
                      <div key={student.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex gap-3 items-center">
                          <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900 line-clamp-1">{student.full_name}</p>
                            <p className="text-[10px] text-gray-500">NIS: {student.nis}</p>
                          </div>
                        </div>

                        {actionType === 'attendance' ? (
                          <select
                            value={attendanceValues[student.id] || "hadir"}
                            onChange={(event) => setAttendanceValues((prev) => ({ ...prev, [student.id]: event.target.value as AttendanceStatus }))}
                            className="border rounded px-2 py-1 text-xs font-medium outline-none focus:border-primary shrink-0 bg-white"
                          >
                            {attendanceOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input 
                            type="number" 
                            min="0" max="100" 
                            placeholder="Nilai" 
                            value={gradeValues[student.id] || ""}
                            onChange={(event) => setGradeValues((prev) => ({ ...prev, [student.id]: event.target.value }))}
                            className="w-16 border rounded px-2 py-1 text-sm text-center outline-none focus:border-primary shrink-0"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {students.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">Belum ada siswa di kelas ini.</div>
                  )}
                </form>
              )}
            </div>

            <div className="p-4 border-t bg-white shrink-0">
              <button
                type="submit"
                form="actionForm"
                disabled={isStudentsLoading || isSaving || students.length === 0}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Menyimpan..." : "Simpan Data"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
