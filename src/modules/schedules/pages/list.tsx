import React, { useMemo, useState } from "react";
import { useList, useDelete, useSelect } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Calendar, Plus, Filter, Clock, MapPin, Trash2, Edit, BookOpen, Shield, Copy,
  LayoutList, LayoutGrid, Users, AlertTriangle, CheckCircle2, CalendarCheck,
  UserCheck, ClipboardList
} from "lucide-react";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { CopyScheduleModal } from "../components/CopyScheduleModal";
import {
  daysOfWeek,
  findScheduleConflicts,
  formatScheduleType,
  formatTime,
  getScheduleSubjectName,
} from "../schedule-utils";

export const SchedulesList: React.FC = () => {
  const navigate = useNavigate();
  const { activeYearId } = useAcademicYear();
  const { activeUnitId } = useCurrentUnit();
  const { mutate: deleteSchedule } = useDelete();
  
  const [filterDay, setFilterDay] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  const filters: any[] = [];
  if (filterDay) filters.push({ field: "day_of_week", operator: "eq", value: filterDay });
  if (filterType) filters.push({ field: "schedule_type", operator: "eq", value: filterType });
  if (filterEmployee) filters.push({ field: "employee_id", operator: "eq", value: filterEmployee });
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) filters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });

  const { data, isLoading } = useList({
    resource: "employee_schedules",
    meta: { select: "*, employees(full_name, position), classes(name), units(name), subjects(name)" },
    filters,
    sorters: [
      { field: "day_of_week", order: "asc" },
      { field: "start_time", order: "asc" }
    ],
    pagination: { pageSize: 500 } // Get all for board view
  });

  const { options: employeeOptions } = useSelect({
    resource: "employees",
    optionLabel: "full_name",
    optionValue: "id",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
  });

  const renderScheduleIcon = (type: string) => {
    switch(type) {
      case 'mengajar': return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'shift_keamanan': return <Shield className="w-4 h-4 text-slate-700" />;
      default: return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  const schedules = useMemo(() => {
    return [...(data?.data ?? [])].sort((first, second) => {
      const dayDiff = daysOfWeek.indexOf(first.day_of_week) - daysOfWeek.indexOf(second.day_of_week);
      if (dayDiff !== 0) return dayDiff;
      return (first.start_time || "").localeCompare(second.start_time || "");
    });
  }, [data?.data]);
  const conflicts = useMemo(() => findScheduleConflicts(schedules), [schedules]);
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    conflicts.forEach((conflict) => {
      if (conflict.first?.id) ids.add(conflict.first.id);
      if (conflict.second?.id) ids.add(conflict.second.id);
    });
    return ids;
  }, [conflicts]);
  const stats = useMemo(() => {
    const employeeIds = new Set(schedules.map((schedule) => schedule.employee_id).filter(Boolean));
    const teaching = schedules.filter((schedule) => schedule.schedule_type === "mengajar");
    const withoutSubject = teaching.filter((schedule) => !schedule.subject_id && !schedule.subject && !schedule.subjects?.name).length;
    const withoutClass = teaching.filter((schedule) => !schedule.class_id).length;
    return {
      total: schedules.length,
      employees: employeeIds.size,
      teaching: teaching.length,
      operations: schedules.filter((schedule) => schedule.schedule_type !== "mengajar").length,
      conflicts: conflicts.length,
      withoutSubject,
      withoutClass,
      followUps: conflicts.length + withoutSubject + withoutClass,
    };
  }, [schedules, conflicts]);

  const schedulesByDay = daysOfWeek.reduce((acc, day) => {
    acc[day] = schedules.filter(s => s.day_of_week === day).sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal Operasional Pegawai"
        description="Kelola jadwal mengajar, piket, shift, standby, dan kesiapan jadwal semester aktif."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCopyModalOpen(true)}
              className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors shadow-sm font-medium text-sm border"
            >
              <Copy className="w-4 h-4" /> Salin Jadwal
            </button>
            <Link
              to="/schedules/create"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Tambah Jadwal
            </Link>
          </div>
        }
      />

      <CopyScheduleModal isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} />

      <section className="bg-card border rounded-xl shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Workflow Jadwal Mutu</p>
            <h2 className="text-lg font-bold text-foreground mt-1">Jadwal menjadi dasar presensi, substitusi, dan portal pengajar</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Pastikan setiap jadwal punya pegawai, waktu valid, unit, mata pelajaran/kelas untuk mengajar, dan tidak bentrok.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/employees" className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
              <Users className="w-4 h-4" /> Pegawai
            </Link>
            <Link to="/attendance/employees" className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
              <Clock className="w-4 h-4" /> Presensi
            </Link>
            <Link to="/substitutes" className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
              <ClipboardList className="w-4 h-4" /> Guru Inval
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: CalendarCheck, label: "Total Jadwal", value: stats.total, detail: "semester aktif", tone: "bg-blue-100 text-blue-700" },
          { icon: UserCheck, label: "Pegawai Terjadwal", value: stats.employees, detail: "orang", tone: "bg-emerald-100 text-emerald-700" },
          { icon: BookOpen, label: "Jadwal Mengajar", value: stats.teaching, detail: `${stats.withoutSubject} tanpa mapel`, tone: "bg-purple-100 text-purple-700" },
          { icon: Shield, label: "Piket & Shift", value: stats.operations, detail: "non-akademik", tone: "bg-amber-100 text-amber-700" },
        ].map((item) => (
          <div key={item.label} className="bg-card border rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.tone}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="font-semibold text-sm">Perlu tindak lanjut jadwal</p>
            <span className="ml-auto text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
              {stats.followUps} item
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 bg-background">
              <p className="text-2xl font-bold text-foreground">{stats.conflicts}</p>
              <p className="text-xs text-muted-foreground mt-1">Potensi bentrok pegawai/kelas</p>
            </div>
            <div className="rounded-lg border p-3 bg-background">
              <p className="text-2xl font-bold text-foreground">{stats.withoutSubject}</p>
              <p className="text-xs text-muted-foreground mt-1">Jadwal mengajar tanpa mapel</p>
            </div>
            <div className="rounded-lg border p-3 bg-background">
              <p className="text-2xl font-bold text-foreground">{stats.withoutClass}</p>
              <p className="text-xs text-muted-foreground mt-1">Jadwal mengajar lintas/tanpa kelas</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <p className="font-semibold text-sm mb-3">Definition of done jadwal</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            {["Pegawai dan unit/lintas unit valid", "Hari dan jam selesai benar", "Mapel/kelas terisi untuk mengajar", "Tidak bentrok dengan jadwal lain", "Siap tampil di portal pengajar"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div className="flex gap-4 items-center flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground ml-2" />
          <select 
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none"
            disabled={viewMode === 'board'}
          >
            <option value="">Semua Hari</option>
            {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none"
          >
            <option value="">Semua Tipe Jadwal</option>
            <option value="mengajar">Mengajar</option>
            <option value="piket">Piket</option>
            <option value="shift_keamanan">Shift Keamanan</option>
            <option value="shift_kebersihan">Shift Kebersihan</option>
            <option value="standby">Standby</option>
          </select>
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none"
          >
            <option value="">Semua Pegawai</option>
            {employeeOptions?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {(filterDay || filterType || filterEmployee) && (
            <button
              onClick={() => { setFilterDay(""); setFilterType(""); setFilterEmployee(""); }}
              className="text-xs text-red-600 hover:underline font-medium"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="flex bg-muted p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutList className="w-4 h-4" /> Tabel
          </button>
          <button 
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'board' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="w-4 h-4" /> Papan
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-card rounded-xl border shadow-sm p-8 text-center text-muted-foreground animate-pulse">Memuat jadwal...</div>
      ) : viewMode === 'list' ? (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Hari & Waktu</th>
                  <th className="px-6 py-4">Pegawai</th>
                  <th className="px-6 py-4">Unit</th>
                  <th className="px-6 py-4">Tipe Jadwal</th>
                  <th className="px-6 py-4">Keterangan / Lokasi</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schedules.map((sch) => {
                  const hasConflict = conflictIds.has(String(sch.id));
                  return (
                    <tr key={sch.id} className={`hover:bg-muted/30 transition-colors ${hasConflict ? "bg-amber-50/50" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{sch.day_of_week}</p>
                              {hasConflict && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">Bentrok</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">{formatTime(sch.start_time)} - {formatTime(sch.end_time)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{sch.employees?.full_name || "-"}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{sch.employees?.position?.replace('_', ' ') || "-"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium border border-primary/20">
                          {sch.units?.name || "Lintas Unit"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center border">
                            {renderScheduleIcon(sch.schedule_type)}
                          </div>
                          <span className="capitalize text-xs font-semibold">{formatScheduleType(sch.schedule_type)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {sch.schedule_type === 'mengajar' ? (
                          <div>
                            <p className="font-medium">{getScheduleSubjectName(sch)}</p>
                            <p className="text-xs flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3"/> Kelas: {sch.classes?.name || "Lintas kelas"}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Penugasan Umum</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/schedules/edit/${sch.id}`)}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                          title="Edit Jadwal"
                        ><Edit className="w-4 h-4"/></button>
                        <button
                          onClick={() => { if(confirm('Hapus jadwal ini?')) deleteSchedule({ resource: "employee_schedules", id: sch.id as string }) }}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors ml-2"
                          title="Hapus Jadwal"
                        ><Trash2 className="w-4 h-4"/></button>
                      </td>
                    </tr>
                  );
                })}
                {schedules.length === 0 && (
                  <tr><td colSpan={6} className="text-center p-12 text-muted-foreground">Tidak ada jadwal yang ditemukan di unit dan semester ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
          {daysOfWeek.map(day => (
            <div key={day} className="flex-none w-[280px] bg-muted/30 rounded-xl border flex flex-col snap-start">
              <div className="p-3 border-b bg-muted/50 rounded-t-xl">
                <h3 className="font-semibold text-sm flex items-center justify-between">
                  {day}
                  <span className="bg-background px-2 py-0.5 rounded-full text-xs border text-muted-foreground">
                    {schedulesByDay[day]?.length || 0}
                  </span>
                </h3>
              </div>
              <div className="p-3 space-y-3 overflow-y-auto max-h-[600px] flex-1 custom-scrollbar">
                {schedulesByDay[day]?.map(sch => (
                  <div key={sch.id} className="bg-card p-3 rounded-lg border shadow-sm relative group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        <Clock className="w-3 h-3" />
                        {formatTime(sch.start_time)} - {formatTime(sch.end_time)}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onClick={() => navigate(`/schedules/edit/${sch.id}`)} className="text-muted-foreground hover:text-primary"><Edit className="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                    
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm leading-tight mb-1">{sch.employees?.full_name || "-"}</p>
                        <p className="text-[10px] text-muted-foreground uppercase mb-2">{sch.employees?.position?.replace('_', ' ') || "-"}</p>
                      </div>
                      {conflictIds.has(String(sch.id)) && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">Bentrok</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      {renderScheduleIcon(sch.schedule_type)}
                      <span className="capitalize">{formatScheduleType(sch.schedule_type)}</span>
                    </div>

                    {sch.schedule_type === 'mengajar' && (
                      <div className="mt-2 pt-2 border-t text-xs">
                        <p className="font-medium text-foreground truncate" title={getScheduleSubjectName(sch)}>{getScheduleSubjectName(sch)}</p>
                        <p className="text-muted-foreground">Kelas: {sch.classes?.name || "Lintas kelas"}</p>
                        <p className="text-muted-foreground">Unit: {sch.units?.name || "Lintas Unit"}</p>
                      </div>
                    )}
                  </div>
                ))}
                {(!schedulesByDay[day] || schedulesByDay[day].length === 0) && (
                  <div className="text-center p-4 text-xs text-muted-foreground italic border-2 border-dashed rounded-lg">
                    Kosong
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
