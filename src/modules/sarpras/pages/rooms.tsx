/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useTable, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { 
  Plus, Edit as EditIcon, Trash2, Building, X, 
  Search, Eye, ChevronLeft, ChevronRight, AlertCircle, MapPin, Users, Activity
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { SarprasSectionNav } from "../components/SarprasSectionNav";

export const RoomsList: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { tableQueryResult, current, setCurrent, pageCount, setFilters } = useTable({
    resource: "rooms",
    pagination: { current: 1, pageSize: 10 },
    sorters: { initial: [{ field: "name", order: "asc" }] },
  });

  // Apply filters
  useEffect(() => {
    const newFilters: any[] = [];
    if (debouncedSearch) {
      newFilters.push({ field: "name", operator: "contains", value: debouncedSearch });
    }
    if (activeUnitId) newFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
    setFilters(newFilters, "replace");
    setCurrent(1);
  }, [activeUnitId, debouncedSearch, setFilters, setCurrent]);

  const rooms = tableQueryResult?.data?.data || [];
  const totalRooms = rooms.length;

  const { mutate: createRoom, isLoading: isCreating } = useCreate();
  const { mutate: updateRoom, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteRoom, isLoading: isDeleting } = useDelete();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    unit_id: activeUnitId || "", code: "", name: "", type: "Ruang Kelas", capacity: 30, location: "", status: "Aktif", notes: ""
  });

  const TYPES = ['Ruang Kelas', 'Laboratorium', 'Perpustakaan', 'Aula', 'Lapangan', 'Ruang Guru', 'Lainnya'];
  const STATUSES = ['Aktif', 'Sedang Direnovasi', 'Nonaktif'];

  const handleOpenCreate = () => {
    setFormData({ unit_id: activeUnitId || "", code: "", name: "", type: "Ruang Kelas", capacity: 30, location: "", status: "Aktif", notes: "" });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (room: any) => {
    setCurrentRoom(room);
    setFormData({
      unit_id: room.unit_id || activeUnitId || "",
      code: room.code || "", name: room.name, type: room.type || "Ruang Kelas", 
      capacity: room.capacity || 30, location: room.location || "", 
      status: room.status || "Aktif", notes: room.notes || ""
    });
    setIsEditOpen(true);
  };

  const handleOpenView = (room: any) => {
    setCurrentRoom(room);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (room: any) => {
    setCurrentRoom(room);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreateOpen) {
      createRoom({ resource: "rooms", values: formData }, {
        onSuccess: () => { 
          setIsCreateOpen(false); 
          tableQueryResult.refetch(); 
          toast.success("Ruangan berhasil ditambahkan");
        },
        onError: () => toast.error("Gagal menambahkan ruangan")
      });
    } else if (isEditOpen && currentRoom) {
      updateRoom({ resource: "rooms", id: currentRoom.id, values: formData }, {
        onSuccess: () => { 
          setIsEditOpen(false); 
          tableQueryResult.refetch(); 
          toast.success("Ruangan berhasil diperbarui");
        },
        onError: () => toast.error("Gagal memperbarui ruangan")
      });
    }
  };

  const handleDelete = () => {
    if (currentRoom) {
      deleteRoom({ resource: "rooms", id: currentRoom.id }, {
        onSuccess: () => { 
          setIsDeleteOpen(false); 
          tableQueryResult.refetch(); 
          toast.success("Ruangan berhasil dihapus");
        },
        onError: () => toast.error("Gagal menghapus ruangan")
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <Building className="w-7 h-7" />
            </div>
            Data Ruangan
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 ml-14">Kelola data ruang kelas, lab, dan fasilitas fisik sekolah lainnya.</p>
        </div>
        <button onClick={handleOpenCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg font-semibold text-sm active:scale-95">
          <Plus className="w-5 h-5" /> Tambah Ruangan
        </button>
      </div>

      <SarprasSectionNav />

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Cari nama ruangan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          />
        </div>
        <div className="text-sm text-muted-foreground bg-gray-50 px-3 py-1.5 rounded-lg border">
          Total: <span className="font-bold text-gray-900">{totalRooms}</span> Ruangan
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b tracking-wider">
              <tr>
                <th className="px-6 py-4">Nama Ruangan</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4">Kapasitas</th>
                <th className="px-6 py-4">Lokasi</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{room.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{room.code}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                      {room.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Users className="w-4 h-4 text-gray-400" />
                      {room.capacity} orang
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {room.location || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      room.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' :
                      room.status === 'Sedang Direnovasi' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {room.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenView(room)} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Lihat Detail">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleOpenEdit(room)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleOpenDelete(room)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rooms.length === 0 && !tableQueryResult.isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Building className="w-12 h-12 mb-3 text-gray-300" />
                      <p className="text-lg font-medium text-gray-900">Tidak ada ruangan ditemukan</p>
                    </div>
                  </td>
                </tr>
              )}
              {tableQueryResult.isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-16">
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
                <h2 className="text-xl font-bold text-gray-900">{isCreateOpen ? "Tambah Data Ruangan" : "Edit Data Ruangan"}</h2>
              </div>
              <button onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="p-2 hover:bg-gray-100 text-gray-500 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Kode Ruangan</label>
                  <input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-mono" placeholder="Mis: R-SD-1A" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Nama Ruangan <span className="text-red-500">*</span></label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="Mis: Kelas 1A" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Tipe Ruangan <span className="text-red-500">*</span></label>
                  <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none">
                    <option value="" disabled>Pilih Tipe</option>
                    {TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Kapasitas (Orang) <span className="text-red-500">*</span></label>
                  <input type="number" min="1" required value={formData.capacity} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Lokasi / Gedung</label>
                  <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" placeholder="Mis: Gedung A Lt. 1" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Status <span className="text-red-500">*</span></label>
                  <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Catatan</label>
                <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="flex w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none" />
              </div>
              
              <div className="pt-6 border-t flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="px-5 py-2.5 border border-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-50 text-gray-700 transition-colors">Batal</button>
                <button type="submit" disabled={isCreating || isUpdating} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 shadow-sm transition-all disabled:opacity-70">
                  {isCreateOpen ? "Simpan Ruangan" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleteOpen && currentRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-center p-8">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Ruangan Ini?</h3>
            <p className="text-gray-500 text-sm mb-8">
              Yakin ingin menghapus ruangan <span className="font-semibold text-gray-900">"{currentRoom.name}"</span>?
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

      {/* View Modal */}
      {isViewOpen && currentRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Detail Ruangan</h2>
              <button onClick={() => setIsViewOpen(false)} className="p-2 hover:bg-gray-100 text-gray-500 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Building className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{currentRoom.name}</h3>
                  <p className="text-sm text-gray-500 font-mono mt-0.5">{currentRoom.code || '-'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Building className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Tipe</span>
                  </div>
                  <p className="font-medium text-gray-900">{currentRoom.type}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Kapasitas</span>
                  </div>
                  <p className="font-medium text-gray-900">{currentRoom.capacity} Orang</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border col-span-2">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Lokasi</span>
                  </div>
                  <p className="font-medium text-gray-900">{currentRoom.location || 'Tidak ada deskripsi lokasi'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border col-span-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Status Operasional</span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    currentRoom.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' :
                    currentRoom.status === 'Sedang Direnovasi' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {currentRoom.status}
                  </span>
                </div>
              </div>

              {currentRoom.notes && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Catatan Tambahan</h4>
                  <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl text-sm text-gray-700">
                    {currentRoom.notes}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50/50 flex justify-end">
               <button onClick={() => setIsViewOpen(false)} className="px-5 py-2.5 bg-white border shadow-sm hover:bg-gray-50 text-gray-800 rounded-lg font-semibold text-sm transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
