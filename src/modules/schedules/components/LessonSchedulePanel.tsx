import React, { useMemo, useState } from "react";
import { BookOpen, BriefcaseBusiness, Building2, CalendarDays, Clock, GraduationCap, MapPin, Users } from "lucide-react";
import { daysOfWeek, dayMap, formatScheduleType, formatTime, getScheduleSubjectName } from "../schedule-utils";

type SchedulePanelProps = {
  schedules: any[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
  showStats?: boolean;
  compact?: boolean;
  defaultType?: "all" | "mengajar" | "non_mengajar";
  mode?: "lesson" | "work";
};

function getUnitId(schedule: any) {
  return schedule.unit_id || schedule.classes?.unit_id || "tanpa-unit";
}

function getUnitName(schedule: any) {
  return schedule.units?.name || schedule.classes?.units?.name || "Lintas Unit";
}

function getScheduleWorkName(schedule: any) {
  const explicitName = getScheduleSubjectName(schedule);
  if (explicitName && explicitName !== "Mata Pelajaran") return explicitName;
  return formatScheduleType(schedule.schedule_type) || "Tugas Kerja";
}

function getLocationName(schedule: any, mode: "lesson" | "work") {
  if (schedule.classes?.name) return schedule.classes.name;
  return mode === "work" ? getUnitName(schedule) : "Tanpa kelas";
}

function getDurationHours(schedule: any) {
  const toMinutes = (time?: string | null) => {
    if (!time) return 0;
    const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  const start = toMinutes(schedule.start_time);
  let end = toMinutes(schedule.end_time);
  if (!start || !end || start === end) return 0;
  if (end < start) end += 24 * 60;
  return Math.max(0, (end - start) / 60);
}

function formatHours(hours: number) {
  if (!hours) return "0j";
  return Number.isInteger(hours) ? `${hours}j` : `${hours.toFixed(1)}j`;
}

function sortSchedules(a: any, b: any) {
  const dayDiff = daysOfWeek.indexOf(a.day_of_week) - daysOfWeek.indexOf(b.day_of_week);
  if (dayDiff !== 0) return dayDiff;
  return String(a.start_time || "").localeCompare(String(b.start_time || ""));
}

export const LessonSchedulePanel: React.FC<SchedulePanelProps> = ({
  schedules,
  isLoading,
  title = "Jadwal Pelajaran",
  description = "Jadwal mengajar dan penugasan aktif berdasarkan unit, kelas, dan tahun ajaran.",
  emptyMessage = "Belum ada jadwal pelajaran yang tertaut.",
  showStats = true,
  compact = false,
  defaultType = "all",
  mode = "lesson",
}) => {
  const today = dayMap[new Date().getDay()] || "Senin";
  const [activeDay, setActiveDay] = useState(today);
  const [selectedUnitId, setSelectedUnitId] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "mengajar" | "non_mengajar">(defaultType);

  const sortedSchedules = useMemo(() => [...(schedules || [])].sort(sortSchedules), [schedules]);
  const units = useMemo(() => {
    const map = new Map<string, string>();
    sortedSchedules.forEach((schedule) => map.set(getUnitId(schedule), getUnitName(schedule)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [sortedSchedules]);

  const filteredSchedules = useMemo(() => {
    return sortedSchedules.filter((schedule) => {
      const matchesUnit = selectedUnitId === "all" || getUnitId(schedule) === selectedUnitId;
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "mengajar" && schedule.schedule_type === "mengajar") ||
        (typeFilter === "non_mengajar" && schedule.schedule_type !== "mengajar");
      return matchesUnit && matchesType;
    });
  }, [selectedUnitId, sortedSchedules, typeFilter]);

  const activeDaySchedules = filteredSchedules.filter((schedule) => schedule.day_of_week === activeDay);
  const teachingCount = filteredSchedules.filter((schedule) => schedule.schedule_type === "mengajar").length;
  const workCount = filteredSchedules.filter((schedule) => schedule.schedule_type !== "mengajar").length;
  const classCount = new Set(filteredSchedules.map((schedule) => schedule.class_id).filter(Boolean)).size;
  const activeDayCount = new Set(filteredSchedules.map((schedule) => schedule.day_of_week).filter(Boolean)).size;
  const weeklyHours = filteredSchedules.reduce((total, schedule) => total + getDurationHours(schedule), 0);
  const displayName = (schedule: any) => (mode === "work" ? getScheduleWorkName(schedule) : getScheduleSubjectName(schedule));
  const isWorkMode = mode === "work";

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        {isWorkMode ? "Memuat jadwal kerja..." : "Memuat jadwal pelajaran..."}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">{title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-gray-500">{description}</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={selectedUnitId}
              onChange={(event) => setSelectedUnitId(event.target.value)}
              className="h-10 rounded-xl border bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Semua Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as "all" | "mengajar" | "non_mengajar")}
              className="h-10 rounded-xl border bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">{isWorkMode ? "Semua Tugas" : "Semua Jadwal"}</option>
              {!isWorkMode && <option value="mengajar">Pelajaran Saja</option>}
              <option value="non_mengajar">{isWorkMode ? "Operasional" : "Tugas Non Mengajar"}</option>
            </select>
          </div>
        </div>

        {showStats && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(isWorkMode
              ? [
                  { label: "Total Jadwal", value: filteredSchedules.length, icon: CalendarDays, tone: "bg-blue-50 text-blue-700" },
                  { label: "Tugas Kerja", value: workCount, icon: BriefcaseBusiness, tone: "bg-emerald-50 text-emerald-700" },
                  { label: "Unit", value: units.length, icon: Building2, tone: "bg-amber-50 text-amber-700" },
                  { label: "Jam/Minggu", value: formatHours(weeklyHours), icon: Clock, tone: "bg-cyan-50 text-cyan-700" },
                ]
              : [
                  { label: "Total Jadwal", value: filteredSchedules.length, icon: CalendarDays, tone: "bg-blue-50 text-blue-700" },
                  { label: "Pelajaran", value: teachingCount, icon: BookOpen, tone: "bg-emerald-50 text-emerald-700" },
                  { label: "Unit", value: units.length, icon: Building2, tone: "bg-amber-50 text-amber-700" },
                  { label: "Kelas", value: classCount, icon: Users, tone: "bg-purple-50 text-purple-700" },
                ]).map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="rounded-2xl border bg-gray-50 p-3">
                <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xl font-black text-gray-900">{value}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {daysOfWeek.map((day) => {
          const count = filteredSchedules.filter((schedule) => schedule.day_of_week === day).length;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`min-w-[92px] rounded-2xl border px-3 py-2 text-sm font-black transition ${
                activeDay === day ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {day}
              <span className={`ml-1 text-[10px] ${activeDay === day ? "text-primary-foreground/80" : "text-gray-400"}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {activeDaySchedules.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center shadow-sm">
          <CalendarDays className="mx-auto mb-3 h-9 w-9 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">{emptyMessage}</p>
          <p className="mt-1 text-xs text-gray-400">Hari {activeDay} belum memiliki jadwal sesuai filter.</p>
        </div>
      ) : (
        <div className={compact ? "space-y-2" : "space-y-3"}>
          {activeDaySchedules.map((schedule, index) => (
            <div key={schedule.id || `${schedule.day_of_week}-${schedule.start_time}-${index}`} className="rounded-2xl border bg-white p-4 shadow-sm hover:border-primary/40">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {schedule.schedule_type === "mengajar" ? <BookOpen className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="line-clamp-1 font-black text-gray-900">{displayName(schedule)}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-blue-700">
                        <MapPin className="h-3.5 w-3.5" />
                        {getLocationName(schedule, mode)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-amber-700">
                        <Building2 className="h-3.5 w-3.5" />
                        {getUnitName(schedule)}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black uppercase text-gray-600">
                  {formatScheduleType(schedule.schedule_type)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!compact && filteredSchedules.length > 0 && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-gray-900">
            <GraduationCap className="h-4 w-4 text-primary" />
            {isWorkMode ? "Ringkasan Mingguan" : "Tampilan Mingguan"}
          </h3>
          {isWorkMode && (
            <div className="mb-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-[11px] font-bold uppercase text-emerald-700">Hari Aktif</p>
                <p className="mt-1 text-xl font-black text-emerald-950">{activeDayCount}</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3">
                <p className="text-[11px] font-bold uppercase text-blue-700">Estimasi Jam</p>
                <p className="mt-1 text-xl font-black text-blue-950">{formatHours(weeklyHours)}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3">
                <p className="text-[11px] font-bold uppercase text-amber-700">Unit Terkait</p>
                <p className="mt-1 text-xl font-black text-amber-950">{units.length}</p>
              </div>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-7">
            {daysOfWeek.map((day) => {
              const rows = filteredSchedules.filter((schedule) => schedule.day_of_week === day);
              return (
                <div key={day} className="rounded-2xl border bg-gray-50 p-3">
                  <p className="mb-2 text-sm font-black text-gray-900">{day}</p>
                  {rows.length === 0 ? (
                    <p className="text-xs text-gray-400">Kosong</p>
                  ) : (
                    <div className="space-y-2">
                      {rows.map((schedule, index) => (
                        <div key={schedule.id || `${day}-${index}`} className="rounded-xl bg-white p-2 shadow-sm">
                          <p className="line-clamp-1 text-xs font-black text-gray-900">{displayName(schedule)}</p>
                          <p className="mt-0.5 text-[10px] font-semibold text-gray-500">{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</p>
                          <p className="line-clamp-1 text-[10px] text-primary">{getLocationName(schedule, mode)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
