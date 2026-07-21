/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock,
  Grid2X2,
  List,
  MapPin,
  Users,
} from "lucide-react";
import {
  daysOfWeek,
  dayMap,
  formatScheduleType,
  formatTime,
  getScheduleSubjectName,
  getScheduleVisual,
  isUnitLearningSchedule,
} from "../schedule-utils";

type SchedulePanelProps = {
  schedules: any[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
  showStats?: boolean;
  compact?: boolean;
  defaultType?: "all" | "mengajar" | "non_mengajar";
  defaultView?: "day" | "week";
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

function getDisplayName(schedule: any, mode: "lesson" | "work") {
  return mode === "work" ? getScheduleWorkName(schedule) : getScheduleSubjectName(schedule);
}

function getLocationName(schedule: any, mode: "lesson" | "work") {
  if (schedule.classes?.name) return schedule.classes.name;
  if (isUnitLearningSchedule(schedule)) return "Semua kelas";
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
  defaultView,
  mode = "lesson",
}) => {
  const today = dayMap[new Date().getDay()] || "Senin";
  const isWorkMode = mode === "work";
  const [activeDay, setActiveDay] = useState(today);
  const [selectedUnitId, setSelectedUnitId] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "mengajar" | "non_mengajar">(defaultType);
  const [view, setView] = useState<"day" | "week">(defaultView || (compact || isWorkMode ? "day" : "week"));

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

  const schedulesByDay = useMemo(() => {
    return daysOfWeek.reduce<Record<string, any[]>>((result, day) => {
      result[day] = filteredSchedules.filter((schedule) => schedule.day_of_week === day);
      return result;
    }, {});
  }, [filteredSchedules]);

  const activeDaySchedules = schedulesByDay[activeDay] || [];
  const teachingCount = filteredSchedules.filter((schedule) => schedule.schedule_type === "mengajar").length;
  const workCount = filteredSchedules.filter((schedule) => schedule.schedule_type !== "mengajar").length;
  const classCount = new Set(filteredSchedules.map((schedule) => schedule.class_id).filter(Boolean)).size;
  const activeDayCount = new Set(filteredSchedules.map((schedule) => schedule.day_of_week).filter(Boolean)).size;
  const weeklyHours = filteredSchedules.reduce((total, schedule) => total + getDurationHours(schedule), 0);
  const legend = useMemo(() => {
    const entries = new Map<string, any>();
    filteredSchedules.forEach((schedule) => {
      const name = getDisplayName(schedule, mode);
      if (!entries.has(name)) entries.set(name, schedule);
    });
    return Array.from(entries.entries()).slice(0, 12);
  }, [filteredSchedules, mode]);

  if (isLoading) {
    return <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">Memuat jadwal...</div>;
  }

  const ScheduleCard = ({ schedule, dense = false }: { schedule: any; dense?: boolean }) => {
    const visual = getScheduleVisual(schedule, mode);
    return (
      <article className={`relative overflow-hidden rounded-lg border ${visual.border} ${visual.background} ${dense ? "p-2.5" : "p-4"}`}>
        <span className={`absolute inset-y-0 left-0 w-1 ${visual.accent}`} aria-hidden="true" />
        <div className="flex items-start justify-between gap-2 pl-1">
          <div className="min-w-0">
            <p className={`${dense ? "text-xs" : "text-sm"} font-bold leading-5 ${visual.text}`}>{getDisplayName(schedule, mode)}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-foreground/70">
              <Clock className="h-3 w-3 shrink-0" />
              {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
            </p>
          </div>
          {!dense && (
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${visual.softBackground} ${visual.text}`}>
              {schedule.schedule_type === "mengajar" ? <BookOpen className="h-4 w-4" /> : <BriefcaseBusiness className="h-4 w-4" />}
            </span>
          )}
        </div>
        <div className={`${dense ? "mt-2 space-y-0.5" : "mt-3 flex flex-wrap gap-x-3 gap-y-1.5"} pl-1 text-[11px] text-foreground/70`}>
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{getLocationName(schedule, mode)}</span>
          </span>
          {!dense && (
            <span className="flex min-w-0 items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{getUnitName(schedule)}</span>
            </span>
          )}
        </div>
      </article>
    );
  };

  return (
    <section className="space-y-4">
      <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {units.length > 1 && (
              <select value={selectedUnitId} onChange={(event) => setSelectedUnitId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20">
                <option value="all">Semua Unit</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </select>
            )}
            {!isWorkMode && (
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "all" | "mengajar" | "non_mengajar")} className="h-10 rounded-md border bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20">
                <option value="all">Semua Jadwal</option>
                <option value="mengajar">Pembelajaran & Kegiatan</option>
                <option value="non_mengajar">Tugas Tambahan</option>
              </select>
            )}
            <div className="flex h-10 rounded-md bg-muted p-1" aria-label="Pilihan tampilan jadwal">
              <button type="button" onClick={() => setView("day")} title="Tampilan per hari" className={`inline-flex items-center gap-1.5 rounded px-3 text-xs font-bold ${view === "day" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}><List className="h-4 w-4" /> Hari</button>
              <button type="button" onClick={() => setView("week")} title="Tampilan kartu mingguan" className={`inline-flex items-center gap-1.5 rounded px-3 text-xs font-bold ${view === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}><Grid2X2 className="h-4 w-4" /> Minggu</button>
            </div>
          </div>
        </div>

        {showStats && !compact && (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(isWorkMode
              ? [
                  { label: "Total Jadwal", value: filteredSchedules.length, icon: CalendarDays, tone: "bg-blue-50 text-blue-700" },
                  { label: "Tugas Kerja", value: workCount, icon: BriefcaseBusiness, tone: "bg-emerald-50 text-emerald-700" },
                  { label: "Hari Aktif", value: activeDayCount, icon: CalendarDays, tone: "bg-amber-50 text-amber-700" },
                  { label: "Jam/Minggu", value: formatHours(weeklyHours), icon: Clock, tone: "bg-cyan-50 text-cyan-700" },
                ]
              : [
                  { label: "Total Jadwal", value: filteredSchedules.length, icon: CalendarDays, tone: "bg-blue-50 text-blue-700" },
                  { label: "Pembelajaran", value: teachingCount, icon: BookOpen, tone: "bg-emerald-50 text-emerald-700" },
                  { label: "Unit", value: new Set(filteredSchedules.map(getUnitId)).size, icon: Building2, tone: "bg-amber-50 text-amber-700" },
                  { label: "Kelas", value: classCount, icon: Users, tone: "bg-violet-50 text-violet-700" },
                ]).map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="flex items-center gap-3 rounded-md border bg-background p-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone}`}><Icon className="h-4 w-4" /></span>
                <div><p className="text-lg font-bold leading-5 text-foreground">{value}</p><p className="text-[11px] font-semibold text-muted-foreground">{label}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {legend.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto border-y bg-background px-1 py-2 text-xs">
          <span className="shrink-0 font-semibold text-muted-foreground">{isWorkMode ? "Jenis tugas" : "Mapel / kegiatan"}</span>
          {legend.map(([name, schedule]) => {
            const visual = getScheduleVisual(schedule, mode);
            return <span key={name} className="inline-flex shrink-0 items-center gap-1.5 font-medium text-foreground"><span className={`h-2.5 w-2.5 rounded-sm ${visual.accent}`} />{name}</span>;
          })}
        </div>
      )}

      {view === "day" ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {daysOfWeek.map((day) => {
              const count = schedulesByDay[day]?.length || 0;
              return (
                <button key={day} onClick={() => setActiveDay(day)} className={`min-w-[92px] rounded-md border px-3 py-2 text-sm font-bold transition ${activeDay === day ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                  {day}<span className={`ml-1 text-[10px] ${activeDay === day ? "text-primary-foreground/80" : "text-muted-foreground"}`}>({count})</span>
                </button>
              );
            })}
          </div>
          {activeDaySchedules.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-8 text-center">
              <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-muted-foreground">{emptyMessage}</p>
              <p className="mt-1 text-xs text-muted-foreground">Hari {activeDay} belum memiliki jadwal sesuai filter.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {activeDaySchedules.map((schedule, index) => <ScheduleCard key={schedule.id || `${activeDay}-${index}`} schedule={schedule} />)}
            </div>
          )}
        </>
      ) : filteredSchedules.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm font-semibold text-muted-foreground">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <div className="grid min-w-[1120px] grid-cols-7 divide-x">
            {daysOfWeek.map((day) => (
              <div key={day} className={day === today ? "bg-primary/[0.03]" : "bg-card"}>
                <div className="flex h-11 items-center justify-between border-b px-3">
                  <p className="text-sm font-bold text-foreground">{day}</p>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{schedulesByDay[day]?.length || 0}</span>
                </div>
                <div className="min-h-40 space-y-2 p-2.5">
                  {schedulesByDay[day]?.length ? schedulesByDay[day].map((schedule, index) => <ScheduleCard key={schedule.id || `${day}-${index}`} schedule={schedule} dense />) : <p className="py-5 text-center text-xs text-muted-foreground">Kosong</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
