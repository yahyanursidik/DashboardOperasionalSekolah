import React, { useMemo, useState } from "react";
import { useTable, useUpdate, useCreate, useSelect, useList } from "@refinedev/core";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Users, Clock, Loader2, Play, ChevronLeft, ChevronRight, CalendarCheck,
  AlertTriangle, CheckCircle2, FileText, Briefcase, Timer, Filter,
  ClipboardList, CalendarDays
} from "lucide-react";
import { toast } from "sonner";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { dayMap, formatTime, getScheduleSubjectName } from "../../schedules/schedule-utils";

const STATUS_OPTIONS = [
  { value: "present", label: "Hadir", active: "bg-emerald-500 text-white", idle: "bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700" },
  { value: "late", label: "Terlambat", active: "bg-orange-500 text-white", idle: "bg-slate-100 text-slate-500 hover:bg-orange-100 hover:text-orange-700" },
  { value: "sick", label: "Sakit", active: "bg-amber-500 text-white", idle: "bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-700" },
  { value: "leave", label: "Izin", active: "bg-blue-500 text-white", idle: "bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-700" },
  { value: "absent", label: "Alpa", active: "bg-rose-500 text-white", idle: "bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-700" },
];

const POSITION_OPTIONS = [
  ["kepala_sekolah", "Kepala Sekolah"],
  ["wakasek_umum", "Wakil Kepala Sekolah (Umum)"],
  ["wakasek_kurikulum", "Wakil Kepala Sekolah Bidang Kurikulum"],
  ["wakasek_kesiswaan", "Wakil Kepala Sekolah Bidang Kesiswaan"],
  ["kepala_unit", "Kepala Unit"],
  ["guru", "Guru / Pengajar"],
  ["guru_quran", "Guru Al Qur'an"],
  ["school_center", "School Center"],
  ["bendahara", "Bendahara / Keuangan"],
  ["penanggung_jawab", "Penanggung Jawab"],
  ["bk", "Bimbingan Konseling"],
  ["pustakawan", "Pustakawan"],
  ["laboran", "Laboran"],
  ["tu", "Tata Usaha"],
  ["sarpras", "Sarana Prasarana"],
  ["satpam", "Satpam"],
  ["cleaning_service", "Cleaning Service"],
  ["lainnya", "Lainnya"],
];

function toLocalDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPosition(position?: string) {
  return POSITION_OPTIONS.find(([value]) => value === position)?.[1] || (position || "-").replace(/_/g, " ");
}

function getDateDayName(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return dayMap[new Date(year, month - 1, day).getDay()] || "Senin";
}

function isDateWithin(date: string, start?: string, end?: string) {
  if (!start || !end) return false;
  return start <= date && date <= end;
}

const TablePagination: React.FC<{
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) => {
  const actualTotalPages = Math.max(1, totalPages);
  const start = totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20 mt-auto">
      <p className="text-sm text-muted-foreground">
        Menampilkan <span className="font-medium text-foreground">{start}-{end}</span> dari <span className="font-medium text-foreground">{totalItems}</span> data
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium px-2">{currentPage} / {actualTotalPages}</span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= actualTotalPages}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export const EmployeeAttendanceList: React.FC = () => {
  const today = toLocalDateInput();
  const [selectedDate, setSelectedDate] = useState(today);
  const [filterUnit, setFilterUnit] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterAttendance, setFilterAttendance] = useState("");
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const { activeYearId } = useAcademicYear();

  const dayName = getDateDayName(selectedDate);
  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });

  const { tableQueryResult, current, pageSize, setCurrent, pageCount } = useTable({
    resource: "employees",
    pagination: { current: 1, pageSize: 20 },
    filters: {
      permanent: [
        { field: "status", operator: "eq", value: "active" },
        ...(filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit }] : []),
        ...(filterPosition ? [{ field: "position", operator: "eq", value: filterPosition }] : []),
      ] as any[]
    },
    sorters: { permanent: [{ field: "full_name", order: "asc" }] },
    meta: {
      select: "*, units(name), employee_attendance(id, status, time_in, time_out, notes, date)"
    }
  });

  const scheduleFilters: any[] = [{ field: "day_of_week", operator: "eq", value: dayName }];
  if (activeYearId) scheduleFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  if (filterUnit) scheduleFilters.push({ field: "unit_id", operator: "eq", value: filterUnit });

  const { data: schedulesData } = useList({
    resource: "employee_schedules",
    filters: scheduleFilters,
    pagination: { pageSize: 1000 },
    meta: { select: "employee_id, day_of_week, start_time, end_time, schedule_type, subject, subject_id, classes(name), subjects(name)" },
  });

  const leaveFilters: any[] = [
    { field: "status", operator: "eq", value: "approved" },
    { field: "start_date", operator: "lte", value: selectedDate },
    { field: "end_date", operator: "gte", value: selectedDate },
  ];
  if (activeYearId) leaveFilters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  if (filterUnit) leaveFilters.push({ field: "unit_id", operator: "eq", value: filterUnit });

  const { data: leavesData } = useList({
    resource: "leave_requests",
    filters: leaveFilters,
    pagination: { pageSize: 1000 },
    meta: { select: "id, employee_id, leave_type, start_date, end_date, status" },
  });

  const { mutate: updateAttendance } = useUpdate();
  const { mutate: createAttendance } = useCreate();

  const employees = tableQueryResult?.data?.data || [];
  const isLoading = tableQueryResult.isLoading;

  const scheduleMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    (schedulesData?.data ?? []).forEach((schedule: any) => {
      if (!map[schedule.employee_id]) map[schedule.employee_id] = [];
      map[schedule.employee_id].push(schedule);
    });
    Object.values(map).forEach((items) => items.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")));
    return map;
  }, [schedulesData]);

  const leaveMap = useMemo(() => {
    const map: Record<string, any> = {};
    (leavesData?.data ?? []).forEach((leave: any) => {
      if (isDateWithin(selectedDate, leave.start_date, leave.end_date)) map[leave.employee_id] = leave;
    });
    return map;
  }, [leavesData, selectedDate]);

  const getRecord = (employee: any) => employee.employee_attendance?.find((a: any) => a.date === selectedDate);
  const displayedEmployees = employees.filter((employee: any) => {
    if (!filterAttendance) return true;
    const record = getRecord(employee);
    if (filterAttendance === "unfilled") return !record;
    if (filterAttendance === "scheduled") return (scheduleMap[employee.id] ?? []).length > 0;
    if (filterAttendance === "leave_approved") return Boolean(leaveMap[employee.id]);
    return record?.status === filterAttendance;
  });

  const stats = useMemo(() => {
    const records = employees.map((employee: any) => ({ employee, record: getRecord(employee) }));
    return {
      total: employees.length,
      present: records.filter((item) => item.record?.status === "present").length,
      late: records.filter((item) => item.record?.status === "late").length,
      sick: records.filter((item) => item.record?.status === "sick").length,
      leave: records.filter((item) => item.record?.status === "leave").length,
      absent: records.filter((item) => item.record?.status === "absent").length,
      unfilled: records.filter((item) => !item.record).length,
      scheduled: employees.filter((employee: any) => (scheduleMap[employee.id] ?? []).length > 0).length,
      scheduledPending: employees.filter((employee: any) => {
        const record = getRecord(employee);
        return (scheduleMap[employee.id] ?? []).length > 0 && record?.status !== "present" && record?.status !== "late";
      }).length,
      approvedLeaves: employees.filter((employee: any) => Boolean(leaveMap[employee.id])).length,
    };
  }, [employees, selectedDate, scheduleMap, leaveMap]);

  const saveAttendance = (employee: any, values: Record<string, any>, successMessage: string) => {
    setLoadingStates(prev => ({ ...prev, [employee.id]: true }));
    const existingRecord = getRecord(employee);

    if (existingRecord) {
      updateAttendance({
        resource: "employee_attendance",
        id: existingRecord.id,
        values,
        invalidates: ["list"]
      }, {
        onSuccess: () => {
          toast.success(successMessage);
          setLoadingStates(prev => ({ ...prev, [employee.id]: false }));
        },
        onError: () => {
          toast.error("Gagal memperbarui presensi");
          setLoadingStates(prev => ({ ...prev, [employee.id]: false }));
        }
      });
      return;
    }

    createAttendance({
      resource: "employee_attendance",
      values: {
        employee_id: employee.id,
        date: selectedDate,
        ...values,
      },
      invalidates: ["list"]
    }, {
      onSuccess: () => {
        toast.success(successMessage);
        setLoadingStates(prev => ({ ...prev, [employee.id]: false }));
      },
      onError: () => {
        toast.error("Gagal mencatat presensi");
        setLoadingStates(prev => ({ ...prev, [employee.id]: false }));
      }
    });
  };

  const handleStatusChange = (employee: any, newStatus: string) => {
    const leave = leaveMap[employee.id];
    const notes = newStatus === "leave" && leave
      ? `Sinkron dari pengajuan ${String(leave.leave_type || "izin").replace(/_/g, " ")} yang sudah disetujui.`
      : undefined;
    saveAttendance(employee, { status: newStatus, ...(notes ? { notes } : {}) }, "Status presensi diperbarui");
  };

  const handleTimeChange = (employee: any, field: "time_in" | "time_out", time: string) => {
    const existingRecord = getRecord(employee);
    saveAttendance(
      employee,
      { [field]: time, status: existingRecord?.status || "present" },
      field === "time_in" ? "Jam masuk disimpan" : "Jam keluar disimpan"
    );
  };

  const handleNotesChange = (employee: any, notes: string) => {
    const existingRecord = getRecord(employee);
    saveAttendance(employee, { notes, status: existingRecord?.status || "present" }, "Catatan presensi disimpan");
  };

  const setTimeNow = (employee: any, field: "time_in" | "time_out") => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    handleTimeChange(employee, field, timeStr);
  };

  const markScheduledPresent = async () => {
    const payload = displayedEmployees
      .filter((employee: any) => !getRecord(employee) && !leaveMap[employee.id] && (scheduleMap[employee.id] ?? []).length > 0)
      .map((employee: any) => {
        const firstSchedule = scheduleMap[employee.id]?.[0];
        return {
          employee_id: employee.id,
          date: selectedDate,
          status: "present",
          time_in: firstSchedule?.start_time ? formatTime(firstSchedule.start_time) : null,
          notes: "Ditandai hadir massal berdasarkan jadwal aktif hari ini.",
        };
      });

    if (payload.length === 0) {
      toast.info("Tidak ada pegawai terjadwal yang perlu ditandai hadir.");
      return;
    }

    setBulkLoading(true);
    const { error } = await supabaseClient
      .from("employee_attendance")
      .upsert(payload, { onConflict: "employee_id,date" });

    setBulkLoading(false);
    if (error) {
      toast.error(error.message || "Gagal menandai hadir massal.");
      return;
    }

    toast.success(`${payload.length} pegawai terjadwal ditandai hadir.`);
    tableQueryResult.refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presensi Pegawai"
        description="Kelola kehadiran guru, ustadz, staf, piket, dan shift berbasis jadwal operasional harian."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/schedules" className="flex items-center gap-2 border px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium">
              <CalendarDays className="w-4 h-4" /> Jadwal
            </Link>
            <Link to="/leaves" className="flex items-center gap-2 border px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium">
              <FileText className="w-4 h-4" /> Izin/Cuti
            </Link>
            <Link to="/reports/employee-attendance" className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 text-sm font-medium">
              <ClipboardList className="w-4 h-4" /> Laporan
            </Link>
          </div>
        }
      />

      <section className="bg-card border rounded-xl shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Workflow Presensi Mutu</p>
            <h2 className="text-lg font-bold text-foreground mt-1">Sinkronkan presensi dengan jadwal dan pengajuan izin</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Tanggal menggunakan waktu lokal perangkat. Pegawai yang punya jadwal hari ini dan izin/cuti approved ditandai agar operator tidak salah input.
            </p>
          </div>
          <button
            onClick={markScheduledPresent}
            disabled={bulkLoading || displayedEmployees.length === 0}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-60 text-sm font-semibold"
          >
            {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Tandai Hadir Pegawai Terjadwal
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { icon: Users, label: "Pegawai Aktif", value: stats.total, detail: "halaman ini", tone: "bg-blue-100 text-blue-700" },
          { icon: CalendarCheck, label: "Terjadwal", value: stats.scheduled, detail: dayName, tone: "bg-purple-100 text-purple-700" },
          { icon: CheckCircle2, label: "Hadir", value: stats.present, detail: `${stats.late} terlambat`, tone: "bg-emerald-100 text-emerald-700" },
          { icon: FileText, label: "Izin/Sakit", value: stats.leave + stats.sick, detail: `${stats.approvedLeaves} izin approved`, tone: "bg-amber-100 text-amber-700" },
          { icon: AlertTriangle, label: "Belum Diinput", value: stats.unfilled, detail: `${stats.absent} alpa`, tone: "bg-rose-100 text-rose-700" },
        ].map((item) => (
          <div key={item.label} className="bg-card border rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.tone}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border shadow-sm p-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Tanggal Presensi</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-input rounded-xl px-4 py-2.5 text-sm bg-background font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all hover:bg-muted/30"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Jabatan</label>
          <select
            value={filterPosition}
            onChange={(e) => { setFilterPosition(e.target.value); setCurrent(1); }}
            className="border border-input rounded-xl px-4 py-2.5 text-sm bg-background min-w-[180px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all hover:bg-muted/30"
          >
            <option value="">Semua Jabatan</option>
            {POSITION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Unit</label>
          <select
            value={filterUnit}
            onChange={(e) => { setFilterUnit(e.target.value); setCurrent(1); }}
            className="border border-input rounded-xl px-4 py-2.5 text-sm bg-background min-w-[180px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all hover:bg-muted/30"
          >
            <option value="">Semua Unit</option>
            {unitOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Status</label>
          <select
            value={filterAttendance}
            onChange={(e) => setFilterAttendance(e.target.value)}
            className="border border-input rounded-xl px-4 py-2.5 text-sm bg-background min-w-[180px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all hover:bg-muted/30"
          >
            <option value="">Semua Status</option>
            <option value="unfilled">Belum Diinput</option>
            <option value="scheduled">Terjadwal Hari Ini</option>
            <option value="leave_approved">Ada Izin Approved</option>
            {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </div>
        {(filterUnit || filterPosition || filterAttendance) && (
          <button
            onClick={() => { setFilterUnit(""); setFilterPosition(""); setFilterAttendance(""); setCurrent(1); }}
            className="inline-flex items-center gap-2 text-sm text-red-600 hover:underline font-medium pb-2"
          >
            <Filter className="w-4 h-4" /> Reset Filter
          </button>
        )}
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-64 text-muted-foreground">Memuat data pegawai...</div>
        ) : displayedEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Tidak ada data pegawai yang sesuai filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Pegawai</th>
                  <th className="px-4 py-3">Jadwal Hari Ini</th>
                  <th className="px-4 py-3 text-center">Status Kehadiran</th>
                  <th className="px-4 py-3 text-center">Jam Masuk</th>
                  <th className="px-4 py-3 text-center">Jam Keluar</th>
                  <th className="px-4 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedEmployees.map((emp: any) => {
                  const record = getRecord(emp);
                  const status = record?.status || "";
                  const schedules = scheduleMap[emp.id] ?? [];
                  const leave = leaveMap[emp.id];
                  const timeEnabled = status === "present" || status === "late";

                  return (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 min-w-[220px]">
                        <div className="font-semibold text-foreground">{emp.full_name}</div>
                        <div className="text-[10px] text-muted-foreground font-bold mt-0.5">{emp.nik || "-"}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                            {formatPosition(emp.position)}
                          </span>
                          {emp.units?.name && (
                            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-semibold">
                              {emp.units.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[220px]">
                        {schedules.length > 0 ? (
                          <div className="space-y-1">
                            {schedules.slice(0, 2).map((schedule: any, index: number) => (
                              <div key={index} className="rounded-lg border bg-background px-2 py-1.5">
                                <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-primary" />
                                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {schedule.schedule_type === "mengajar" ? getScheduleSubjectName(schedule) : String(schedule.schedule_type || "Jadwal").replace(/_/g, " ")}
                                  {schedule.classes?.name ? ` - ${schedule.classes.name}` : ""}
                                </p>
                              </div>
                            ))}
                            {schedules.length > 2 && <p className="text-[11px] text-muted-foreground">+{schedules.length - 2} jadwal lain</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Tidak terjadwal</span>
                        )}
                        {leave && (
                          <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5 text-xs text-blue-700">
                            Izin approved: {String(leave.leave_type || "izin").replace(/_/g, " ")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[260px]">
                        <div className="flex flex-wrap justify-center gap-1.5 relative">
                          {loadingStates[emp.id] && (
                            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 backdrop-blur-[1px] rounded-md">
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            </div>
                          )}
                          {STATUS_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleStatusChange(emp, option.value)}
                              disabled={loadingStates[emp.id]}
                              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all disabled:opacity-50 ${status === option.value ? `${option.active} shadow-md` : option.idle}`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="time"
                            value={record?.time_in ? formatTime(record.time_in) : ""}
                            onChange={(e) => handleTimeChange(emp, "time_in", e.target.value)}
                            disabled={!timeEnabled || loadingStates[emp.id]}
                            className="border rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 bg-background shadow-sm"
                          />
                          <button
                            onClick={() => setTimeNow(emp, "time_in")}
                            disabled={!timeEnabled || loadingStates[emp.id]}
                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors disabled:opacity-50 border border-indigo-100"
                            title="Set waktu sekarang"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="time"
                            value={record?.time_out ? formatTime(record.time_out) : ""}
                            onChange={(e) => handleTimeChange(emp, "time_out", e.target.value)}
                            disabled={!timeEnabled || loadingStates[emp.id]}
                            className="border rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 bg-background shadow-sm"
                          />
                          <button
                            onClick={() => setTimeNow(emp, "time_out")}
                            disabled={!timeEnabled || loadingStates[emp.id]}
                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors disabled:opacity-50 border border-indigo-100"
                            title="Set waktu sekarang"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[220px]">
                        <input
                          type="text"
                          defaultValue={record?.notes || ""}
                          onBlur={(e) => {
                            if ((record?.notes || "") !== e.target.value) handleNotesChange(emp, e.target.value);
                          }}
                          placeholder={leave ? "Catatan izin/cuti..." : "Catatan opsional"}
                          className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40 bg-background"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <TablePagination
              currentPage={current}
              totalPages={pageCount}
              totalItems={tableQueryResult?.data?.total || 0}
              itemsPerPage={pageSize}
              onPageChange={setCurrent}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="font-semibold text-sm">Perlu tindak lanjut</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 bg-background">
              <p className="text-2xl font-bold text-foreground">{stats.unfilled}</p>
              <p className="text-xs text-muted-foreground mt-1">Pegawai belum diinput pada halaman ini</p>
            </div>
            <div className="rounded-lg border p-3 bg-background">
              <p className="text-2xl font-bold text-foreground">{stats.scheduledPending}</p>
              <p className="text-xs text-muted-foreground mt-1">Terjadwal tetapi belum hadir/terlambat</p>
            </div>
            <div className="rounded-lg border p-3 bg-background">
              <p className="text-2xl font-bold text-foreground">{stats.approvedLeaves}</p>
              <p className="text-xs text-muted-foreground mt-1">Izin approved perlu disinkronkan presensi</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <p className="font-semibold text-sm mb-3">Definition of done presensi</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            {["Tanggal lokal benar", "Pegawai terjadwal sudah dicek", "Izin/cuti approved sinkron", "Jam masuk/keluar terisi untuk hadir", "Catatan ada untuk kasus khusus"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
