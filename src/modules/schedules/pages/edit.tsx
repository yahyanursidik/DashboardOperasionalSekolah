import React, { useEffect, useState } from "react";
import { useUpdate, useSelect, useOne } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Save, Calendar, Clock, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { daysOfWeek, formatTime, hasTimeOverlap, isValidTimeRange, scheduleTypes } from "../schedule-utils";

const CROSS_UNIT_VALUE = "__cross_unit__";

export const ScheduleEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeYearId } = useAcademicYear();
  const { activeUnitId } = useCurrentUnit();
  
  const { mutate: updateSchedule, isLoading: isSaving } = useUpdate();
  const { data: scheduleData, isLoading } = useOne({
    resource: "employee_schedules",
    id: id as string
  });

  const [employeeId, setEmployeeId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Senin");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("15:00");
  const [scheduleType, setScheduleType] = useState("mengajar");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState(activeUnitId || "");
  const [isInit, setIsInit] = useState(false);
  const isCrossUnit = selectedUnitId === CROSS_UNIT_VALUE;

  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id"
  });

  React.useEffect(() => {
    if (scheduleData?.data && !isInit) {
      const sch = scheduleData.data;
      setEmployeeId(sch.employee_id);
      setDayOfWeek(sch.day_of_week);
      setStartTime(sch.start_time.slice(0, 5));
      setEndTime(sch.end_time.slice(0, 5));
      setScheduleType(sch.schedule_type);
      setClassId(sch.class_id || "");
      setSubjectId(sch.subject_id || "");
      setSelectedUnitId(sch.unit_id || CROSS_UNIT_VALUE);
      setIsInit(true);
    }
  }, [scheduleData, isInit, activeUnitId]);

  const { options: employeeOptions } = useSelect({ 
    resource: "employees", 
    optionLabel: "full_name", 
    optionValue: "id",
    filters: selectedUnitId && !isCrossUnit ? [{ field: "unit_id", operator: "eq", value: selectedUnitId }] : []
  });

  const { options: classOptions } = useSelect({ 
    resource: "classes", 
    optionLabel: "name", 
    optionValue: "id",
    filters: selectedUnitId && !isCrossUnit ? [{ field: "unit_id", operator: "eq", value: selectedUnitId }] : []
  });

  const { options: subjectOptions } = useSelect({
    resource: "subjects",
    optionLabel: "name",
    optionValue: "id",
    filters: [
      { field: "is_active", operator: "eq", value: true },
      ...(selectedUnitId && !isCrossUnit ? [{ field: "unit_id", operator: "eq" as const, value: selectedUnitId }] : [])
    ]
  });

  const selectedSubjectName = subjectOptions?.find((option) => option.value === subjectId)?.label as string | undefined;
  const formChecklist = [
    { label: "Pegawai dipilih", done: Boolean(employeeId) },
    { label: "Unit/lintas unit terpilih", done: Boolean(selectedUnitId || activeUnitId) },
    { label: "Jam mulai dan selesai valid", done: isValidTimeRange(startTime, endTime, scheduleType === "shift_keamanan") },
    { label: "Mapel terisi untuk mengajar", done: scheduleType !== "mengajar" || Boolean(subjectId) },
    { label: "Kelas jelas untuk portal", done: scheduleType !== "mengajar" || Boolean(classId) },
  ];

  const findBlockingConflict = async () => {
    let query = supabaseClient
      .from("employee_schedules")
      .select("id, employee_id, class_id, day_of_week, start_time, end_time, schedule_type, subject")
      .eq("day_of_week", dayOfWeek)
      .neq("id", id as string);

    if (activeYearId) query = query.eq("academic_year_id", activeYearId);
    if (scheduleType === "mengajar" && classId) {
      query = query.or(`employee_id.eq.${employeeId},class_id.eq.${classId}`);
    } else {
      query = query.eq("employee_id", employeeId);
    }

    const { data: existingSchedulesResult, error } = await query;
    if (error) throw error;

    const existingSchedules = (existingSchedulesResult ?? []) as any[];
    const overlapping = existingSchedules.filter((schedule: any) =>
      hasTimeOverlap(startTime, endTime, schedule.start_time, schedule.end_time)
    );
    const employeeConflict = overlapping.find((schedule: any) => schedule.employee_id === employeeId);
    if (employeeConflict) {
      return `Pegawai sudah punya jadwal ${employeeConflict.day_of_week} ${formatTime(employeeConflict.start_time)} - ${formatTime(employeeConflict.end_time)}.`;
    }

    const classConflict = scheduleType === "mengajar" && classId
      ? overlapping.find((schedule: any) => schedule.class_id === classId && schedule.schedule_type === "mengajar")
      : null;
    if (classConflict) {
      return `Kelas ini sudah punya jadwal mengajar ${formatTime(classConflict.start_time)} - ${formatTime(classConflict.end_time)}.`;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return toast.error("Pilih pegawai terlebih dahulu");
    if (!isValidTimeRange(startTime, endTime, scheduleType === "shift_keamanan")) {
      return toast.error("Jam selesai harus lebih besar dari jam mulai. Shift malam hanya diperbolehkan untuk keamanan.");
    }
    if (!selectedUnitId) return toast.error("Pilih unit sekolah atau Lintas Unit.");
    if (scheduleType === "mengajar" && !subjectId) return toast.error("Pilih mata pelajaran untuk jadwal mengajar.");

    try {
      const conflictMessage = await findBlockingConflict();
      if (conflictMessage) {
        toast.error(conflictMessage);
        return;
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal memeriksa bentrok jadwal.");
      return;
    }

    updateSchedule({
      resource: "employee_schedules",
      id: id as string,
      values: {
        employee_id: employeeId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        schedule_type: scheduleType,
        class_id: scheduleType === 'mengajar' ? (classId || null) : null,
        subject_id: scheduleType === 'mengajar' ? (subjectId || null) : null,
        subject: scheduleType === 'mengajar' ? (selectedSubjectName || null) : null,
        academic_year_id: activeYearId,
        unit_id: isCrossUnit ? null : (selectedUnitId || activeUnitId || null)
      },
      successNotification: () => ({ message: "Jadwal berhasil diperbarui", type: "success" })
    }, {
      onSuccess: () => navigate("/schedules")
    });
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">Memuat...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Edit Jadwal Pegawai"
        description="Perbarui jadwal kerja atau jam mengajar mingguan, dengan pemeriksaan bentrok sebelum disimpan."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
      <div className="bg-card rounded-xl border shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Pegawai</label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
            >
              <option value="">-- Pilih Pegawai --</option>
              {employeeOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
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
              <option value={CROSS_UNIT_VALUE}>Lintas Unit</option>
              {unitOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {isCrossUnit && (
              <p className="text-xs text-muted-foreground">
                Jadwal ini berlaku lintas unit dan akan disimpan tanpa unit spesifik.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Calendar className="w-4 h-4"/> Hari</label>
              <select
                required
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-2">
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
                onChange={(e) => setScheduleType(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                {scheduleTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {scheduleType === 'mengajar' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4"/> Kelas Target (Opsional)</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                  >
                    <option value="">-- Lintas Kelas --</option>
                    {classOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mata Pelajaran <span className="text-destructive">*</span></label>
                  <select
                    required={scheduleType === 'mengajar'}
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {subjectOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
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
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
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
      </aside>
      </div>
    </div>
  );
};
