/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from "react";
import { useOne, useSelect } from "@refinedev/core";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Save, Calendar, Clock, MapPin, AlertTriangle, CheckCircle2, CalendarRange, CalendarPlus, TimerReset } from "lucide-react";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { isMissingSupabaseColumn } from "../../../lib/supabase/schema-errors";
import { daysOfWeek, formatTime, hasTimeOverlap, isValidTimeRange, scheduleTypes, workWeekDays } from "../schedule-utils";
import { validateTeachingScheduleCurriculum } from "../curriculum-schedule-validation";
import { canReceiveAcademicAssignment, getEmployeePosition } from "../../employees/employee-role-config";
import { useClassSubjectOptions } from "../use-class-subject-options";

const CROSS_UNIT_VALUE = "__cross_unit__";
type SchedulePattern = "single" | "weekdays" | "custom";

interface ExistingSchedule {
  employee_id?: string | null;
  class_id?: string | null;
  day_of_week?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  schedule_type?: string | null;
}

export const ScheduleCreate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { activeUnitId } = useCurrentUnit();
  const [isSaving, setIsSaving] = useState(false);

  const [employeeId, setEmployeeId] = useState(() => searchParams.get("employee_id") || "");
  const [dayOfWeek, setDayOfWeek] = useState("Senin");
  const [schedulePattern, setSchedulePattern] = useState<SchedulePattern>("single");
  const [selectedDays, setSelectedDays] = useState<string[]>(workWeekDays);
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("15:00");
  const [scheduleType, setScheduleType] = useState("mengajar");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState(() => searchParams.get("unit_id") || activeUnitId || "");
  const isCrossUnit = selectedUnitId === CROSS_UNIT_VALUE;
  const effectiveDays = scheduleType === "mengajar" || schedulePattern === "single"
    ? [dayOfWeek]
    : schedulePattern === "weekdays"
      ? workWeekDays
      : daysOfWeek.filter((day) => selectedDays.includes(day));

  const changeSchedulePattern = (pattern: SchedulePattern) => {
    setSchedulePattern(pattern);
    if (pattern === "weekdays") setSelectedDays(workWeekDays);
    if (pattern === "custom" && selectedDays.length === 0) setSelectedDays([dayOfWeek]);
  };

  const toggleScheduleDay = (day: string) => {
    setSelectedDays((current) => current.includes(day)
      ? current.filter((item) => item !== day)
      : daysOfWeek.filter((item) => [...current, day].includes(item)));
  };

  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id"
  });

  const { options: employeeOptions } = useSelect({ 
    resource: "employees", 
    optionLabel: "full_name", 
    optionValue: "id",
    filters: [
      { field: "status", operator: "eq", value: "active" },
      ...(selectedUnitId && !isCrossUnit ? [{ field: "unit_id", operator: "eq" as const, value: selectedUnitId }] : []),
    ]
  });

  const { data: employeeData } = useOne({
    resource: "employees",
    id: employeeId || "",
    meta: { select: "id, full_name, position, unit_id" },
    queryOptions: { enabled: Boolean(employeeId) },
  });
  const selectedPosition = getEmployeePosition(employeeData?.data?.position);
  const availableScheduleTypes = employeeId
    ? scheduleTypes.filter((type) => selectedPosition.allowedScheduleTypes.includes(type.value))
    : scheduleTypes;

  useEffect(() => {
    if (employeeId && !selectedPosition.allowedScheduleTypes.includes(scheduleType)) {
      setScheduleType(selectedPosition.allowedScheduleTypes[0] || "standby");
      setClassId("");
      setSubjectId("");
    }
  }, [employeeId, scheduleType, selectedPosition.allowedScheduleTypes]);

  const { options: classOptions } = useSelect({ 
    resource: "classes", 
    optionLabel: "name", 
    optionValue: "id",
    filters: [
      ...(selectedUnitId && !isCrossUnit ? [{ field: "unit_id", operator: "eq" as const, value: selectedUnitId }] : []),
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
    ]
  });

  const { options: subjectOptions, isLoading: subjectsLoading, message: subjectsMessage, error: subjectsError, assignmentSupported } = useClassSubjectOptions({
    classId,
    employeeId,
    academicYearId: activeYearId,
    semesterId: activeSemesterId,
  });

  useEffect(() => {
    if (subjectId && !subjectOptions.some((option) => option.value === subjectId && option.assigned)) setSubjectId("");
  }, [subjectId, subjectOptions]);

  const selectedSubjectName = subjectOptions?.find((option) => option.value === subjectId)?.label as string | undefined;
  const formChecklist = [
    { label: "Pegawai dipilih", done: Boolean(employeeId) },
    { label: "Tahun ajaran dan semester aktif", done: Boolean(activeYearId && activeSemesterId) },
    { label: scheduleType === "mengajar" ? "Unit kelas terpilih" : "Unit/lintas unit terpilih", done: Boolean(selectedUnitId || activeUnitId) && (scheduleType !== "mengajar" || !isCrossUnit) },
    { label: effectiveDays.length > 1 ? `${effectiveDays.length} hari kerja dipilih` : "Hari kerja dipilih", done: effectiveDays.length > 0 },
    { label: "Jam mulai dan selesai valid", done: isValidTimeRange(startTime, endTime, scheduleType === "shift_keamanan") },
    { label: "Mapel terisi untuk mengajar", done: scheduleType !== "mengajar" || Boolean(subjectId) },
    { label: "Kelas jelas untuk portal", done: scheduleType !== "mengajar" || Boolean(classId) },
  ];

  const findBlockingConflict = async (targetDays: string[]) => {
    let query = supabaseClient
      .from("employee_schedules")
      .select("id, employee_id, class_id, day_of_week, start_time, end_time, schedule_type, subject")
      .in("day_of_week", targetDays);

    if (activeYearId) query = query.eq("academic_year_id", activeYearId);
    if (activeSemesterId) query = query.eq("semester_id", activeSemesterId);
    if (scheduleType === "mengajar" && classId) {
      query = query.or(`employee_id.eq.${employeeId},class_id.eq.${classId}`);
    } else {
      query = query.eq("employee_id", employeeId);
    }

    const { data: existingSchedulesResult, error } = await query;
    if (error) throw error;

    const existingSchedules = (existingSchedulesResult ?? []) as ExistingSchedule[];
    const overlapping = existingSchedules.filter((schedule) =>
      hasTimeOverlap(startTime, endTime, schedule.start_time, schedule.end_time)
    );
    const employeeConflict = overlapping.find((schedule) => schedule.employee_id === employeeId);
    if (employeeConflict) {
      return `Pegawai sudah punya jadwal ${employeeConflict.day_of_week} ${formatTime(employeeConflict.start_time)} - ${formatTime(employeeConflict.end_time)}.`;
    }

    const classConflict = scheduleType === "mengajar" && classId
      ? overlapping.find((schedule) => schedule.class_id === classId && schedule.schedule_type === "mengajar")
      : null;
    if (classConflict) {
      return `Kelas ini sudah punya jadwal mengajar ${formatTime(classConflict.start_time)} - ${formatTime(classConflict.end_time)}.`;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return toast.error("Pilih pegawai terlebih dahulu");
    if (!selectedPosition.allowedScheduleTypes.includes(scheduleType)) return toast.error("Tipe jadwal tidak sesuai dengan jabatan utama pegawai.");
    if (!isValidTimeRange(startTime, endTime, scheduleType === "shift_keamanan")) {
      return toast.error("Jam selesai harus lebih besar dari jam mulai. Shift malam hanya diperbolehkan untuk keamanan.");
    }
    if (!selectedUnitId) return toast.error("Pilih unit sekolah atau Lintas Unit.");
    if (effectiveDays.length === 0) return toast.error("Pilih minimal satu hari kerja.");
    if (scheduleType === "mengajar" && isCrossUnit) return toast.error("Jadwal mengajar harus dibuat pada unit kelas yang spesifik. Gunakan Lintas Unit untuk tugas operasional.");
    if (!activeSemesterId) return toast.error("Semester aktif belum dipilih.");
    if (!activeYearId) return toast.error("Tahun ajaran aktif belum dipilih.");
    if (scheduleType === "mengajar" && !subjectId) return toast.error("Pilih mata pelajaran untuk jadwal mengajar.");
    if (scheduleType === "mengajar" && !classId) return toast.error("Pilih kelas untuk jadwal mengajar.");

    let assignmentId: string | null = null;
    try {
      if (scheduleType === "mengajar") {
        if (!canReceiveAcademicAssignment(employeeData?.data?.position)) {
          return toast.error("Jabatan utama pegawai tidak memiliki fungsi mengajar.");
        }
        const curriculumValidation = await validateTeachingScheduleCurriculum({
          classId,
          subjectId,
          academicYearId: activeYearId,
          semesterId: activeSemesterId,
        });
        if (!curriculumValidation.valid) {
          toast.error("Jadwal belum dapat disimpan", { description: curriculumValidation.message });
          return;
        }

        if (assignmentSupported) {
          const { data: assignment, error: assignmentError } = await supabaseClient
            .from("teacher_assignments")
            .select("id")
            .eq("employee_id", employeeId)
            .eq("unit_id", selectedUnitId)
            .eq("class_id", classId)
            .eq("subject_id", subjectId)
            .eq("academic_year_id", activeYearId)
            .eq("semester_id", activeSemesterId)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();
          if (assignmentError) throw assignmentError;
          if (!assignment) {
            toast.error("Penugasan akademik belum tersedia", { description: "Tambahkan penugasan kelas dan mata pelajaran pada profil pegawai sebelum menyusun jadwal mengajar." });
            return;
          }
          assignmentId = (assignment as unknown as { id: string }).id;
        }
      }
      const conflictMessage = await findBlockingConflict(effectiveDays);
      if (conflictMessage) {
        toast.error(conflictMessage);
        return;
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal memeriksa bentrok jadwal.");
      return;
    }

    setIsSaving(true);
    const scheduleRows = effectiveDays.map((day) => ({
        employee_id: employeeId,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        schedule_type: scheduleType,
        class_id: scheduleType === 'mengajar' ? (classId || null) : null,
        subject_id: scheduleType === 'mengajar' ? (subjectId || null) : null,
        subject: scheduleType === 'mengajar' ? (selectedSubjectName || null) : null,
        academic_year_id: activeYearId,
        semester_id: activeSemesterId,
        ...(assignmentSupported ? { assignment_id: assignmentId } : {}),
        unit_id: isCrossUnit ? null : (selectedUnitId || activeUnitId || null),
      }));
    let { error } = await supabaseClient.from("employee_schedules").insert(scheduleRows);
    if (error && isMissingSupabaseColumn(error, "assignment_id", "employee_schedules")) {
      const compatibleRows = scheduleRows.map((row) => {
        const compatibleRow = { ...row } as Record<string, unknown>;
        delete compatibleRow.assignment_id;
        return compatibleRow;
      });
      ({ error } = await supabaseClient.from("employee_schedules").insert(compatibleRows));
    }
    setIsSaving(false);
    if (error) {
      toast.error("Jadwal belum dapat disimpan", { description: error.message });
      return;
    }
    toast.success(effectiveDays.length > 1 ? `${effectiveDays.length} jadwal rutin berhasil dibuat.` : "Jadwal berhasil ditambahkan.");
    navigate("/schedules");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Tambah Jadwal Pegawai"
        description="Atur jadwal kerja atau jam mengajar mingguan, dengan pemeriksaan bentrok sebelum disimpan."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Pegawai</label>
            <select
              required
              value={employeeId}
              onChange={(e) => { setEmployeeId(e.target.value); setSubjectId(""); }}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
            >
              <option value="">-- Pilih Pegawai --</option>
              {employeeData?.data && !employeeOptions?.some((option) => option.value === employeeData.data.id) ? <option value={employeeData.data.id}>{employeeData.data.full_name}</option> : null}
              {employeeOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {employeeId ? <p className="text-xs text-muted-foreground">Jabatan utama: <strong>{selectedPosition.label}</strong>. Tipe jadwal disesuaikan otomatis.</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Unit Sekolah / Lintas Unit</label>
            <select
              required
              value={selectedUnitId}
              onChange={(e) => { setSelectedUnitId(e.target.value); setEmployeeId(""); setClassId(""); setSubjectId(""); }}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
            >
              <option value="">-- Pilih Unit --</option>
              {scheduleType !== "mengajar" && <option value={CROSS_UNIT_VALUE}>Lintas Unit</option>}
              {unitOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {isCrossUnit && (
              <p className="text-xs text-muted-foreground">
                Gunakan untuk jadwal pegawai yang berlaku lintas unit, seperti piket umum, shift kebersihan, keamanan, atau standby.
              </p>
            )}
          </div>

          {scheduleType !== "mengajar" && (
            <section className="space-y-3 rounded-md border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <CalendarRange className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">Pola jadwal rutin</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Buat beberapa hari sekaligus dengan jam yang sama. Cocok untuk satpam, cleaning service, school center, sarpras, dan staf operasional.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-md border bg-background p-1">
                {([
                  { value: "single", label: "Satu hari" },
                  { value: "weekdays", label: "Senin-Jumat" },
                  { value: "custom", label: "Pilih hari" },
                ] as const).map((pattern) => (
                  <button key={pattern.value} type="button" onClick={() => changeSchedulePattern(pattern.value)} className={`min-h-10 rounded px-2 text-xs font-semibold ${schedulePattern === pattern.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                    {pattern.label}
                  </button>
                ))}
              </div>
              {schedulePattern === "custom" && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {daysOfWeek.map((day) => {
                    const checked = selectedDays.includes(day);
                    return <label key={day} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-xs font-semibold ${checked ? "border-primary bg-primary/5 text-primary" : "bg-background text-muted-foreground"}`}><input type="checkbox" checked={checked} onChange={() => toggleScheduleDay(day)} className="h-4 w-4 accent-primary" />{day}</label>;
                  })}
                </div>
              )}
              {schedulePattern === "weekdays" && <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">Sistem akan membuat 5 jadwal: Senin, Selasa, Rabu, Kamis, dan Jumat.</p>}
            </section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(scheduleType === "mengajar" || schedulePattern === "single") && <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Calendar className="w-4 h-4"/> Hari</label>
              <select required value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background">
                {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>}

            <div className={`space-y-2 ${(scheduleType !== "mengajar" && schedulePattern !== "single") ? "md:col-span-2" : ""}`}>
              <label className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4"/> Jam Shift</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2 pt-4 border-t">
              <label className="text-sm font-medium">Tipe Jadwal</label>
              <select
                required
                value={scheduleType}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setScheduleType(nextType);
                  if (nextType === "mengajar" && selectedUnitId === CROSS_UNIT_VALUE) {
                    setSelectedUnitId(activeUnitId || "");
                    setEmployeeId("");
                  }
                  if (nextType !== "mengajar") {
                    setClassId("");
                    setSubjectId("");
                  }
                }}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                {availableScheduleTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {scheduleType === 'mengajar' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4"/> Kelas <span className="text-destructive">*</span></label>
                  <select
                    required
                    value={classId}
                    onChange={(e) => { setClassId(e.target.value); setSubjectId(""); }}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mata Pelajaran <span className="text-destructive">*</span></label>
                  <select
                    key={`${classId}:${activeYearId || ""}:${activeSemesterId || ""}`}
                    required={scheduleType === 'mengajar'}
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    disabled={!classId || subjectsLoading || subjectOptions.length === 0}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                  >
                    <option value="">{!classId ? "-- Pilih kelas dahulu --" : subjectsLoading ? "Memuat mata pelajaran..." : "-- Pilih Mata Pelajaran --"}</option>
                    {subjectOptions.map((option) => <option key={option.value} value={option.value} disabled={!option.assigned}>{option.label}{option.assigned ? "" : " - belum ditugaskan"}</option>)}
                  </select>
                  <p className={`text-xs leading-5 ${subjectsError ? "text-destructive" : "text-muted-foreground"}`}>{subjectsError || subjectsMessage}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/schedules")}
              className="flex items-center gap-2 px-6 py-2.5 border rounded-md hover:bg-muted transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Menyimpan..." : effectiveDays.length > 1 ? `Simpan ${effectiveDays.length} Jadwal` : "Simpan Jadwal"}
            </button>
          </div>
        </form>
      </div>
      <aside className="space-y-4">
        <div className="bg-card border rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="font-semibold text-sm">Cek sebelum simpan</p>
          </div>
          <div className="space-y-2">
            {formChecklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`w-3.5 h-3.5 ${item.done ? "text-emerald-600" : "text-muted-foreground"}`} />
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Sistem akan menolak jadwal jika pegawai atau kelas sudah terpakai di jam yang sama.
          </p>
        </div>
        {scheduleType !== "mengajar" && <div className="rounded-md border bg-card p-4">
          <p className="text-sm font-semibold">Penugasan di luar jadwal rutin</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Perbaikan sarpras, rapat, kegiatan sekolah, atau tugas darurat dicatat terpisah agar tetap sah tanpa mengubah jadwal mingguan.</p>
          <div className="mt-3 grid gap-2">
            <Link to="/attendance/events" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold hover:bg-muted"><CalendarPlus className="h-4 w-4" />Buat Kegiatan Tambahan</Link>
            <Link to="/attendance/overtime" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold hover:bg-muted"><TimerReset className="h-4 w-4" />Kelola Lembur</Link>
          </div>
        </div>}
      </aside>
      </div>
    </div>
  );
};
