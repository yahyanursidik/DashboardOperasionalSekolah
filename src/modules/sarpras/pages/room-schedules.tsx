/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useTable, useCreate, useUpdate, useDelete, useList } from "@refinedev/core";
import { 
  Plus, Edit as EditIcon, Trash2, CalendarCheck, X, 
  Search, ChevronLeft, ChevronRight, AlertCircle, Clock, Building, Repeat
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { SarprasSectionNav } from "../components/SarprasSectionNav";

export const RoomSchedulesList: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
  const RECURRENCE_TYPES = ['Harian', 'Pekanan', 'Dwimingguan', 'Bulanan', 'Waktu Tertentu'];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { tableQueryResult, current, setCurrent, pageCount, setFilters } = useTable({
    resource: "room_schedules",
    pagination: { current: 1, pageSize: 10 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  const { data: allSchedulesData } = useList({
    resource: "room_schedules",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
    pagination: { mode: "off" },
  });
  const allSchedules = allSchedulesData?.data || [];

  const { data: roomsData } = useList({
    resource: "rooms",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
    pagination: { mode: "off" },
  });
  const roomsOptions = roomsData?.data || [];

  const { data: academicYearsData } = useList({
    resource: "academic_years",
    pagination: { mode: "off" },
  });
  const academicYearsOptions = academicYearsData?.data || [];
  const activeAcademicYear = academicYearsOptions.find((ay: any) => ay.status === 'active' || ay.is_active)?.name || "2023/2024";

  // Apply filters
  useEffect(() => {
    const newFilters: any[] = [];
    if (debouncedSearch) {
      newFilters.push({ field: "activity_name", operator: "contains", value: debouncedSearch });
    }
    if (typeFilter) {
      newFilters.push({ field: "recurrence_type", operator: "eq", value: typeFilter });
    }
    if (activeUnitId) newFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
    setFilters(newFilters, "replace");
    setCurrent(1);
  }, [activeUnitId, debouncedSearch, typeFilter, setFilters, setCurrent]);

  const schedules = tableQueryResult?.data?.data || [];
  const totalSchedules = schedules.length;

  const { mutate: createSchedule, isLoading: isCreating } = useCreate();
  const { mutate: updateSchedule, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteSchedule, isLoading: isDeleting } = useDelete();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    unit_id: activeUnitId || "",
    room_id: "", 
    recurrence_type: "Pekanan",
    day_of_week: "Senin", 
    specific_date: "",
    date_of_month: 1,
    start_time: "07:00", 
    end_time: "08:30", 
    activity_name: "", 
    academic_year: "2023/2024", 
    status: "Aktif"
  });

  const handleOpenCreate = () => {
    setFormData({ 
      unit_id: activeUnitId || "",
      room_id: "", 
      recurrence_type: "Pekanan",
      day_of_week: "Senin", 
      specific_date: new Date().toISOString().split('T')[0],
      date_of_month: 1,
      start_time: "07:00", 
      end_time: "08:30", 
      activity_name: "", 
      academic_year: activeAcademicYear, 
      status: "Aktif" 
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (schedule: any) => {
    setCurrentSchedule(schedule);
    setFormData({
      unit_id: schedule.unit_id || activeUnitId || "",
      room_id: schedule.room_id || "", 
      recurrence_type: schedule.recurrence_type || "Pekanan",
      day_of_week: schedule.day_of_week || "Senin", 
      specific_date: schedule.specific_date || new Date().toISOString().split('T')[0],
      date_of_month: schedule.date_of_month || 1,
      start_time: schedule.start_time ? schedule.start_time.substring(0,5) : "07:00", 
      end_time: schedule.end_time ? schedule.end_time.substring(0,5) : "08:30", 
      activity_name: schedule.activity_name || "", 
      academic_year: schedule.academic_year || activeAcademicYear, 
      status: schedule.status || "Aktif"
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (schedule: any) => {
    setCurrentSchedule(schedule);
    setIsDeleteOpen(true);
  };

  // Helper to get day name from a Date string (YYYY-MM-DD)
  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const dayIndex = date.getDay(); // 0 is Sunday, 1 is Monday
    // Map to our DAYS array where 0 is Senin... wait, JS is 0=Sun, 1=Mon, ..., 6=Sat
    // Our DAYS: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad']
    const jsToOurDays = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return jsToOurDays[dayIndex];
  };

  // Complex Conflict Validation Logic
  const checkConflict = () => {
    const conflict = allSchedules.find(s => {
      if (isEditOpen && currentSchedule && s.id === currentSchedule.id) return false;
      if (s.room_id !== formData.room_id || s.status !== 'Aktif') return false;

      const newStart = formData.start_time;
      const newEnd = formData.end_time;
      const existingStart = s.start_time.substring(0,5);
      const existingEnd = s.end_time.substring(0,5);

      // Check Time Intersection
      if (newStart < existingEnd && newEnd > existingStart) {
        // Time intersects, now check if DAYS intersect based on recurrence
        const t1 = formData.recurrence_type;
        const t2 = s.recurrence_type || 'Pekanan'; // Legacy fallback

        if (t1 === 'Harian' || t2 === 'Harian') return true; // Daily conflicts with everything on that time
        
        if (t1 === 'Waktu Tertentu' && t2 === 'Waktu Tertentu') {
          return formData.specific_date === s.specific_date;
        }

        if (t1 === 'Waktu Tertentu' && (t2 === 'Pekanan' || t2 === 'Dwimingguan')) {
          return getDayName(formData.specific_date) === s.day_of_week;
        }

        if (t2 === 'Waktu Tertentu' && (t1 === 'Pekanan' || t1 === 'Dwimingguan')) {
          return getDayName(s.specific_date) === formData.day_of_week;
        }

        if (t1 === 'Waktu Tertentu' && t2 === 'Bulanan') {
          return parseInt(formData.specific_date.split('-')[2]) === s.date_of_month;
        }

        if (t2 === 'Waktu Tertentu' && t1 === 'Bulanan') {
          return parseInt(s.specific_date.split('-')[2]) === formData.date_of_month;
        }

        // If both are weekly/bi-weekly
        if ((t1 === 'Pekanan' || t1 === 'Dwimingguan') && (t2 === 'Pekanan' || t2 === 'Dwimingguan')) {
          return formData.day_of_week === s.day_of_week;
        }

        // If one is Monthly and the other is Weekly/Bi-weekly, there's a guaranteed conflict eventually.
        if ((t1 === 'Bulanan' && (t2 === 'Pekanan' || t2 === 'Dwimingguan')) ||
            (t2 === 'Bulanan' && (t1 === 'Pekanan' || t1 === 'Dwimingguan'))) {
          return true; // We flag it as conflict because it will overlap on some weeks
        }

        if (t1 === 'Bulanan' && t2 === 'Bulanan') {
          return formData.date_of_month === s.date_of_month;
        }
      }
      return false;
    });

    return conflict;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.start_time >= formData.end_time) {
      toast.error("Waktu selesai harus lebih besar dari waktu mulai!");
      return;
    }

    const conflict = checkConflict();
    if (conflict) {
      toast.error(`Bentrok Jadwal! Ruangan dipakai untuk "${conflict.activity_name}" (${conflict.recurrence_type || 'Pekanan'}) pada jam ${conflict.start_time.substring(0,5)} - ${conflict.end_time.substring(0,5)}`);
      return;
    }

    // Clean up payload based on recurrence type
    const payload = { ...formData };
    if (payload.recurrence_type === 'Harian') {
      payload.day_of_week = "";
      payload.specific_date = null as any;
      payload.date_of_month = null as any;
    } else if (payload.recurrence_type === 'Pekanan' || payload.recurrence_type === 'Dwimingguan') {
      payload.specific_date = null as any;
      payload.date_of_month = null as any;
    } else if (payload.recurrence_type === 'Bulanan') {
      payload.day_of_week = "";
      payload.specific_date = null as any;
    } else if (payload.recurrence_type === 'Waktu Tertentu') {
      payload.day_of_week = "";
      payload.date_of_month = null as any;
    }

    if (isCreateOpen) {
      createSchedule({ resource: "room_schedules", values: payload }, {
        onSuccess: () => { 
          setIsCreateOpen(false); 
          tableQueryResult.refetch(); 
          toast.success("Jadwal berhasil ditambahkan!");
        },
        onError: (err: any) => {
          console.error("Create Error:", err);
          toast.error(`Gagal menyimpan: ${err?.message || "Kesalahan pada server"}`);
        }
      });
    } else if (isEditOpen && currentSchedule) {
      updateSchedule({ resource: "room_schedules", id: currentSchedule.id, values: payload }, {
        onSuccess: () => { 
          setIsEditOpen(false); 
          tableQueryResult.refetch(); 
          toast.success("Jadwal berhasil diperbarui!");
        },
        onError: (err: any) => {
          console.error("Update Error:", err);
          toast.error(`Gagal memperbarui: ${err?.message || "Kesalahan pada server"}`);
        }
      });
    }
  };

  const handleDelete = () => {
    if (currentSchedule) {
      deleteSchedule({ resource: "room_schedules", id: currentSchedule.id }, {
        onSuccess: () => { 
          setIsDeleteOpen(false); 
          tableQueryResult.refetch(); 
          toast.success("Jadwal berhasil dihapus!");
        }
      });
    }
  };

  const renderScheduleInfo = (schedule: any) => {
    const type = schedule.recurrence_type || 'Pekanan';
    if (type === 'Harian') return <span className="font-bold text-gray-900">Setiap Hari</span>;
    if (type === 'Pekanan') return <span className="font-bold text-gray-900">Setiap {schedule.day_of_week}</span>;
    if (type === 'Dwimingguan') return <span className="font-bold text-blue-700">Dwimingguan ({schedule.day_of_week})</span>;
    if (type === 'Bulanan') return <span className="font-bold text-purple-700">Setiap Tgl {schedule.date_of_month}</span>;
    if (type === 'Waktu Tertentu') {
      const dateStr = new Date(schedule.specific_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      return <span className="font-bold text-amber-700">{dateStr}</span>;
    }
    return <span className="font-bold text-gray-900">{schedule.day_of_week}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <CalendarCheck className="w-7 h-7" />
            </div>
            Jadwal Ruangan
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 ml-14">Atur pemakaian ruangan berdasarkan siklus harian, mingguan, atau waktu tertentu.</p>
        </div>
        <button onClick={handleOpenCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg font-semibold text-sm active:scale-95">
          <Plus className="w-5 h-5" /> Tambah Jadwal
        </button>
      </div>

      <SarprasSectionNav />

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Cari nama kegiatan..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          >
            <option value="">Semua Siklus</option>
            {RECURRENCE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="text-sm text-muted-foreground bg-gray-50 px-3 py-1.5 rounded-lg border">
          Total: <span className="font-bold text-gray-900">{totalSchedules}</span> Jadwal
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b tracking-wider">
              <tr>
                <th className="px-6 py-4">Siklus & Waktu</th>
                <th className="px-6 py-4">Ruangan</th>
                <th className="px-6 py-4">Kegiatan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedules.map((schedule) => {
                const room = roomsOptions.find((r: any) => r.id === schedule.room_id);
                return (
                  <tr key={schedule.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      {renderScheduleInfo(schedule)}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {schedule.start_time?.substring(0,5)} - {schedule.end_time?.substring(0,5)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 rounded text-gray-500">
                          <Building className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-gray-800">{room?.name || 'Ruangan Dihapus'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-primary">{schedule.activity_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">TA: {schedule.academic_year}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        schedule.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {schedule.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(schedule)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenDelete(schedule)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {schedules.length === 0 && !tableQueryResult.isLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <CalendarCheck className="w-12 h-12 mb-3 text-gray-300" />
                      <p className="text-lg font-medium text-gray-900">Belum ada jadwal ruangan</p>
                    </div>
                  </td>
                </tr>
              )}
              {tableQueryResult.isLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex justify-center items-center gap-2 text-primary">
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-medium">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pageCount > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-medium">
              Halaman <span className="text-gray-900">{current}</span> dari <span className="text-gray-900">{pageCount}</span>
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrent(p => Math.max(1, p - 1))}
                disabled={current === 1}
                className="p-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrent(p => Math.min(pageCount, p + 1))}
                disabled={current === pageCount}
                className="p-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {(isCreateOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{isCreateOpen ? "Tambah Jadwal Ruangan" : "Edit Jadwal Ruangan"}</h2>
              </div>
              <button onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="p-2 hover:bg-gray-100 text-gray-500 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Ruangan <span className="text-red-500">*</span></label>
                  <select required value={formData.room_id} onChange={e => setFormData({...formData, room_id: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none">
                    <option value="" disabled>Pilih Ruangan</option>
                    {roomsOptions.filter((r: any) => r.status === 'Aktif').map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name} - Kapasitas: {r.capacity}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Kegiatan <span className="text-red-500">*</span></label>
                  <input required value={formData.activity_name} onChange={e => setFormData({...formData, activity_name: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="Mis: Kelas 1A, Ujian Nasional" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-gray-400" /> Siklus Pengulangan
                  </label>
                  <select required value={formData.recurrence_type} onChange={e => setFormData({...formData, recurrence_type: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-blue-50/30">
                    {RECURRENCE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                
                {/* Dynamic Fields based on Recurrence */}
                {(formData.recurrence_type === 'Pekanan' || formData.recurrence_type === 'Dwimingguan') && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Hari <span className="text-red-500">*</span></label>
                    <select required value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none">
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                
                {formData.recurrence_type === 'Bulanan' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Tanggal <span className="text-red-500">*</span></label>
                    <input type="number" min="1" max="31" required value={formData.date_of_month} onChange={e => setFormData({...formData, date_of_month: Number(e.target.value)})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="1 s.d 31" />
                  </div>
                )}

                {formData.recurrence_type === 'Waktu Tertentu' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Tanggal Spesifik <span className="text-red-500">*</span></label>
                    <input type="date" required value={formData.specific_date} onChange={e => setFormData({...formData, specific_date: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" />
                  </div>
                )}
                
                {/* Placeholder to keep grid aligned if Harian */}
                {formData.recurrence_type === 'Harian' && (
                  <div className="space-y-1.5 hidden md:block"></div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Jam Mulai <span className="text-red-500">*</span></label>
                  <input type="time" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Jam Selesai <span className="text-red-500">*</span></label>
                  <input type="time" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Tahun Akademik <span className="text-red-500">*</span></label>
                  <select required value={formData.academic_year} onChange={e => setFormData({...formData, academic_year: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none">
                    <option value="" disabled>Pilih Tahun Akademik</option>
                    {academicYearsOptions.map((ay: any) => (
                      <option key={ay.id} value={ay.name}>{ay.name} {ay.status === 'active' || ay.is_active ? '(Aktif)' : ''}</option>
                    ))}
                    {academicYearsOptions.length === 0 && (
                      <option value="2023/2024">2023/2024</option>
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Status <span className="text-red-500">*</span></label>
                  <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none">
                    <option value="Aktif">Aktif</option>
                    <option value="Batal">Batal / Nonaktif</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-6 border-t flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="px-5 py-2.5 border border-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-50 text-gray-700 transition-colors">Batal</button>
                <button type="submit" disabled={isCreating || isUpdating} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 shadow-sm transition-all disabled:opacity-70">
                  {isCreateOpen ? "Simpan Jadwal" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleteOpen && currentSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-center p-8">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Jadwal Ini?</h3>
            <p className="text-gray-500 text-sm mb-8">
              Yakin ingin menghapus jadwal <span className="font-semibold text-gray-900">"{currentSchedule.activity_name}"</span>?
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold text-sm transition-colors flex-1">
                Batal
              </button>
              <button onClick={handleDelete} disabled={isDeleting} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors flex-1">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
