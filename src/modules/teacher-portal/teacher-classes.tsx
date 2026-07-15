import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Users, CheckSquare, Award, Loader2, Save, BookOpenCheck, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { getScheduleSubjectName } from "../schedules/schedule-utils";
import { getAssessmentGradeTypes } from "../curriculum/assessment-policy";

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

export const TeacherClasses: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
          .select("class_id, subject_id, subject, classes(id, name, level, grade_level, capacity, homeroom_teacher_id, unit_id), subjects(id, name)")
          .eq("employee_id", employee.id);
        if (activeYearId) scheduleQuery = scheduleQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) scheduleQuery = scheduleQuery.eq("semester_id", activeSemesterId);

        const { data: schedules } = await scheduleQuery;
        const { data: homeroomClasses } = await supabaseClient
          .from("classes")
          .select("id, name, level, grade_level, capacity, homeroom_teacher_id, unit_id")
          .eq("homeroom_teacher_id", employee.id);

        const map = new Map<string, any>();
        (schedules || []).forEach((schedule: any) => {
          const cls = schedule.classes;
          if (!cls?.id) return;
          const current = map.get(cls.id) ?? { ...cls, _subjects: [] };
          const subjectName = getScheduleSubjectName(schedule);
          const subjectOption: SubjectOption = { id: schedule.subject_id || schedule.subjects?.id || null, name: subjectName };
          if (subjectName && !current._subjects.some((subject: SubjectOption) => subject.name === subjectName)) {
            current._subjects.push(subjectOption);
          }
          map.set(cls.id, current);
        });
        (homeroomClasses || []).forEach((cls: any) => {
          map.set(cls.id, map.get(cls.id) ?? { ...cls, _subjects: [] });
        });

        const classRows = Array.from(map.values());
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
                  weeklyHours: semesterPlan?.weekly_hours ?? null,
                  curriculumSemesterId: semesterPlan?.id || null,
                  includeInReport: semesterPlan?.include_in_report !== false,
                  finalAssessmentType: semesterPlan?.final_assessment_type,
                  assessmentWeights: semesterPlan?.assessment_weights,
                };
              });
            });
          }
        }

        setClasses(classRows.sort((a, b) => String(a.name).localeCompare(String(b.name))));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClasses();
  }, [activeSemesterId, activeYearId, employee.id]);

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
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-primary" /> Kelola Kelas
      </h2>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-gray-900">Ruang kerja kelas berdasarkan penugasan</p>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          Daftar ini hanya menampilkan kelas wali dan kelas yang memiliki jadwal mengajar untuk Anda pada tahun ajaran aktif. Absensi dan nilai yang disimpan langsung masuk ke data sekolah.
        </p>
      </div>

      <div className="space-y-4 pb-8">
        {classes.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed p-8 text-center text-sm text-gray-500">
            Belum ada kelas yang ditugaskan kepada Anda pada tahun ajaran aktif.
          </div>
        )}
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  {cls.name}
                  {cls.homeroom_teacher_id === employee.id && (
                    <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">Wali Kelas</span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tingkat: {cls.level}
                </p>
              </div>
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold shrink-0">
                {cls.capacity} Siswa
              </div>
            </div>

            {cls._subjects?.length > 0 && (
              <div className="space-y-2 border-b px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <BookOpenCheck className="h-4 w-4 text-emerald-600" />
                  Perangkat Semester Aktif
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
            
            <div className="grid grid-cols-2 divide-x">
              <button 
                onClick={() => openClassAction(cls, "attendance")}
                className="p-3 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition"
              >
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-gray-700">Absensi Harian</span>
              </button>
              <button 
                onClick={() => openClassAction(cls, "grades")}
                className="p-3 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition"
              >
                <Award className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold text-gray-700">Input Nilai</span>
              </button>
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
