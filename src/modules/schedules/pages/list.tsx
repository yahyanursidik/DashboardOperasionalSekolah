import React, { useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Calendar, Plus, Filter, Clock, MapPin, Trash2, Edit, BookOpen, Shield, Copy, LayoutList, LayoutGrid } from "lucide-react";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { CopyScheduleModal } from "../components/CopyScheduleModal";

const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export const SchedulesList: React.FC = () => {
  const navigate = useNavigate();
  const { activeYearId } = useAcademicYear();
  const { activeUnitId } = useCurrentUnit();
  const { mutate: deleteSchedule } = useDelete();
  
  const [filterDay, setFilterDay] = useState("");
  const [filterType, setFilterType] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  const filters: any[] = [];
  if (filterDay) filters.push({ field: "day_of_week", operator: "eq", value: filterDay });
  if (filterType) filters.push({ field: "schedule_type", operator: "eq", value: filterType });
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) filters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });

  const { data, isLoading } = useList({
    resource: "employee_schedules",
    meta: { select: "*, employees(full_name, position), classes(name), units(name)" },
    filters,
    sorters: [
      { field: "day_of_week", order: "asc" },
      { field: "start_time", order: "asc" }
    ],
    pagination: { pageSize: 500 } // Get all for board view
  });

  const renderScheduleIcon = (type: string) => {
    switch(type) {
      case 'mengajar': return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'shift_keamanan': return <Shield className="w-4 h-4 text-slate-700" />;
      default: return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  const schedulesByDay = daysOfWeek.reduce((acc, day) => {
    acc[day] = data?.data?.filter(s => s.day_of_week === day).sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal & Shift Pegawai"
        description="Kelola jadwal mengajar, jadwal piket, dan shift non-akademik (Berlaku 1 Semester)."
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
              {data?.data.map((sch) => (
                <tr key={sch.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{sch.day_of_week}</p>
                        <p className="text-xs text-muted-foreground">{sch.start_time?.slice(0,5)} - {sch.end_time?.slice(0,5)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{sch.employees?.full_name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{sch.employees?.position?.replace('_', ' ')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium border border-primary/20">
                      {sch.units?.name || "Semua Unit"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center border">
                        {renderScheduleIcon(sch.schedule_type)}
                      </div>
                      <span className="capitalize text-xs font-semibold">{sch.schedule_type?.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {sch.schedule_type === 'mengajar' ? (
                      <div>
                        <p className="font-medium">{sch.subject || "Guru Kelas"}</p>
                        <p className="text-xs flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3"/> Kelas: {sch.classes?.name || "-"}</p>
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
              ))}
              {data?.data.length === 0 && (
                <tr><td colSpan={6} className="text-center p-12 text-muted-foreground">Tidak ada jadwal yang ditemukan di unit dan semester ini.</td></tr>
              )}
            </tbody>
          </table>
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
                        {sch.start_time?.slice(0,5)} - {sch.end_time?.slice(0,5)}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onClick={() => navigate(`/schedules/edit/${sch.id}`)} className="text-muted-foreground hover:text-primary"><Edit className="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                    
                    <p className="font-semibold text-sm leading-tight mb-1">{sch.employees?.full_name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase mb-2">{sch.employees?.position?.replace('_', ' ')}</p>
                    
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      {renderScheduleIcon(sch.schedule_type)}
                      <span className="capitalize">{sch.schedule_type?.replace('_', ' ')}</span>
                    </div>

                    {sch.schedule_type === 'mengajar' && (
                      <div className="mt-2 pt-2 border-t text-xs">
                        <p className="font-medium text-foreground truncate" title={sch.subject}>{sch.subject}</p>
                        <p className="text-muted-foreground">Kelas: {sch.classes?.name}</p>
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
