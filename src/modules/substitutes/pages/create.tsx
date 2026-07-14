import React, { useEffect, useMemo, useState } from "react";
import { useCreate, useList, useSelect } from "@refinedev/core";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Loader2,
  MapPin,
  Save,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { dayMap, formatTime, getScheduleSubjectName } from "../../schedules/schedule-utils";
import {
  formatAssignmentDate,
  hasAssignmentOverlap,
  isValidAssignmentTime,
  getAssignmentDurationMinutes,
} from "../substitute-utils";
import { toast } from "sonner";

export const SubstituteCreate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeYearId } = useAcademicYear();
  const { activeUnitId } = useCurrentUnit();
  const { mutate: createAssignment, isLoading: isSaving } = useCreate();
  const leaveRequestId = searchParams.get("leave_request_id");

  const [selectedUnitId, setSelectedUnitId] = useState(activeUnitId || "");
  const [absentEmployeeId, setAbsentEmployeeId] = useState(searchParams.get("absent_employee_id") || "");
  const [substituteEmployeeId, setSubstituteEmployeeId] = useState("");
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [startTime, setStartTime] = useState(searchParams.get("start_time") || "");
  const [endTime, setEndTime] = useState(searchParams.get("end_time") || "");
  const [classId, setClassId] = useState(searchParams.get("class_id") || "");
  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [notes, setNotes] = useState(searchParams.get("notes") || "");

  useEffect(() => {
    if (activeUnitId) setSelectedUnitId(activeUnitId);
  }, [activeUnitId]);

  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
  });

  const { options: employeeOptions } = useSelect({
    resource: "employees",
    optionLabel: "full_name",
    optionValue: "id",
    filters: selectedUnitId ? [{ field: "unit_id", operator: "eq", value: selectedUnitId }] : [],
  });

  const { options: classOptions } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    filters: selectedUnitId ? [{ field: "unit_id", operator: "eq", value: selectedUnitId }] : [],
  });

  const dayName = date ? dayMap[new Date(`${date}T00:00:00`).getDay()] : "";
  const scheduleFilters: any[] = [
    ...(absentEmployeeId ? [{ field: "employee_id", operator: "eq", value: absentEmployeeId }] : []),
    ...(dayName ? [{ field: "day_of_week", operator: "eq", value: dayName }] : []),
    ...(activeYearId ? [{ field: "academic_year_id", operator: "eq", value: activeYearId }] : []),
  ];

  const { data: absentSchedulesData } = useList({
    resource: "employee_schedules",
    meta: { select: "*, classes(name), subjects(name)" },
    filters: scheduleFilters,
    pagination: { pageSize: 50 },
    queryOptions: { enabled: !!absentEmployeeId && !!date },
  });

  const durationMinutes = getAssignmentDurationMinutes(startTime, endTime);
  const checklist = [
    { label: "Guru absen dan pengganti sudah dipilih", done: !!absentEmployeeId && !!substituteEmployeeId && absentEmployeeId !== substituteEmployeeId },
    { label: "Tanggal dan jam mengajar valid", done: !!date && isValidAssignmentTime(startTime, endTime) },
    { label: "Kelas dan mata pelajaran jelas", done: !!classId && subject.trim().length > 1 },
    { label: "Instruksi untuk pengganti diisi", done: notes.trim().length >= 10 },
    { label: "Relasi izin/cuti tercatat bila berasal dari pengajuan", done: !leaveRequestId || !!leaveRequestId },
  ];

  const absentSchedules = useMemo(() => absentSchedulesData?.data ?? [], [absentSchedulesData?.data]);

  const applySchedule = (schedule: any) => {
    setStartTime(formatTime(schedule.start_time));
    setEndTime(formatTime(schedule.end_time));
    setClassId(schedule.class_id || "");
    setSubject(getScheduleSubjectName(schedule));
    if (!notes.trim()) {
      setNotes(`Lanjutkan pembelajaran ${getScheduleSubjectName(schedule)} untuk ${schedule.classes?.name || "kelas terkait"}.`);
    }
  };

  const findSubstituteConflict = async () => {
    const { data: existing, error } = await supabaseClient
      .from("substitute_assignments")
      .select("id, start_time, end_time, status")
      .eq("substitute_employee_id", substituteEmployeeId)
      .eq("date", date)
      .neq("status", "cancelled");

    if (error) throw error;

    return (existing ?? []).find((item: any) => hasAssignmentOverlap(startTime, endTime, item.start_time, item.end_time));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) return toast.error("Pilih unit terlebih dahulu");
    if (!absentEmployeeId || !substituteEmployeeId) return toast.error("Lengkapi pilihan guru");
    if (absentEmployeeId === substituteEmployeeId) return toast.error("Guru yang absen dan pengganti tidak boleh sama");
    if (!isValidAssignmentTime(startTime, endTime)) return toast.error("Jam selesai harus setelah jam mulai");
    if (!subject.trim()) return toast.error("Isi mata pelajaran atau tugas pengganti");
    if (notes.trim().length < 10) return toast.error("Catatan tugas perlu lebih jelas");

    try {
      const conflict = await findSubstituteConflict();
      if (conflict) {
        toast.error("Guru pengganti sudah memiliki penugasan lain pada jam tersebut");
        return;
      }

      createAssignment(
        {
          resource: "substitute_assignments",
          values: {
            absent_employee_id: absentEmployeeId,
            substitute_employee_id: substituteEmployeeId,
            date,
            start_time: startTime,
            end_time: endTime,
            class_id: classId || null,
            subject: subject.trim(),
            notes: notes.trim(),
            leave_request_id: leaveRequestId || null,
            status: "scheduled",
            academic_year_id: activeYearId,
            unit_id: selectedUnitId,
          },
          successNotification: () => ({ message: "Penugasan guru inval berhasil dibuat", type: "success" }),
        },
        {
          onSuccess: () => navigate("/substitutes"),
        }
      );
    } catch (error: any) {
      toast.error(error?.message || "Gagal memvalidasi penugasan");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat Penugasan Guru Inval"
        description="Tentukan guru pengganti, jam mengajar, kelas, dan instruksi agar pembelajaran tetap berjalan."
      />

      {leaveRequestId && (
        <div className="bg-purple-50 border border-purple-200 text-purple-800 rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>Penugasan ini dibuat dari pengajuan izin/cuti dan akan ditautkan sebagai tindak lanjut.</span>
          <Link to="/leaves" className="text-xs border border-purple-300 rounded-md px-3 py-1.5 hover:bg-purple-100">
            Lihat Izin/Cuti
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <select
                  required
                  value={selectedUnitId}
                  onChange={(e) => {
                    setSelectedUnitId(e.target.value);
                    setAbsentEmployeeId("");
                    setSubstituteEmployeeId("");
                    setClassId("");
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                >
                  <option value="">-- Pilih Unit --</option>
                  {unitOptions?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-red-700">
                  <UserMinus className="w-4 h-4" /> Guru yang Absen
                </label>
                <select
                  required
                  value={absentEmployeeId}
                  onChange={(e) => setAbsentEmployeeId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/50 outline-none bg-background border-red-200"
                >
                  <option value="">-- Pilih Guru --</option>
                  {employeeOptions?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-green-700">
                  <UserCheck className="w-4 h-4" /> Guru Pengganti
                </label>
                <select
                  required
                  value={substituteEmployeeId}
                  onChange={(e) => setSubstituteEmployeeId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500/50 outline-none bg-background border-green-200"
                >
                  <option value="">-- Pilih Guru --</option>
                  {employeeOptions?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Tanggal Mengajar
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Jam Mengajar
                </label>
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
                <p className="text-xs text-muted-foreground">
                  {durationMinutes > 0 ? `${durationMinutes} menit pembelajaran` : "Jam selesai harus setelah jam mulai."}
                </p>
              </div>

              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Kelas
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classOptions?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Mata Pelajaran / Tugas
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika, Tahfidz, Piket Kelas"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" /> Catatan Khusus / Tugas
              </label>
              <textarea
                rows={4}
                placeholder="Tuliskan instruksi materi, halaman, target pembelajaran, atau amanah kelas."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate("/substitutes")}
                className="flex items-center gap-2 px-6 py-2.5 border rounded-md hover:bg-muted transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-70"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Menyimpan..." : "Simpan Penugasan"}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold">Definition of Done</p>
              <p className="text-xs text-muted-foreground">Pastikan penugasan siap dieksekusi di kelas.</p>
            </div>
            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 ${item.done ? "text-green-600" : "text-muted-foreground"}`} />
                  <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Jadwal Guru Absen</p>
                <p className="text-xs text-muted-foreground">{date ? formatAssignmentDate(date) : "Pilih tanggal untuk melihat jadwal."}</p>
              </div>
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>

            {absentSchedules.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/30">
                Belum ada jadwal aktif guru absen pada tanggal ini.
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                {absentSchedules.map((schedule: any) => (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => applySchedule(schedule)}
                    className="w-full text-left border rounded-md p-3 text-sm hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">
                      {formatTime(schedule.start_time)}-{formatTime(schedule.end_time)} {schedule.classes?.name ? `- ${schedule.classes.name}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{getScheduleSubjectName(schedule)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
