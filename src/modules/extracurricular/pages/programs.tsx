import React, { useState } from "react";
import { useList, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Plus, Edit2, Trash2, Search, Activity, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

export const ProgramsList: React.FC = () => {
  const { data, isLoading, refetch } = useList({ resource: "extracurriculars", sorters: [{ field: "name", order: "asc" }] });
  const { mutate: create, isLoading: isCreating } = useCreate();
  const { mutate: update, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteMutate } = useDelete();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    coach_name: "",
    schedule: "",
    internal_fee: 0,
    external_fee: 0,
    is_active: true
  });

  const isSaving = isCreating || isUpdating;

  const openCreate = () => {
    setFormData({ name: "", description: "", coach_name: "", schedule: "", internal_fee: 0, external_fee: 0, is_active: true });
    setEditId(null);
    setModalMode("create");
  };

  const openEdit = (item: any) => {
    setFormData({
      name: item.name,
      description: item.description || "",
      coach_name: item.coach_name || "",
      schedule: item.schedule || "",
      internal_fee: item.internal_fee || 0,
      external_fee: item.external_fee || 0,
      is_active: item.is_active
    });
    setEditId(item.id);
    setModalMode("edit");
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus program ekskul ini? Semua data pendaftar dan absensi terkait mungkin akan terhapus jika tidak ada perlindungan relasi database.")) {
      deleteMutate({ resource: "extracurriculars", id }, {
        onSuccess: () => {
          toast.success("Program berhasil dihapus");
          refetch();
        }
      });
    }
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Nama program wajib diisi");
      return;
    }
    
    if (modalMode === "create") {
      create({ resource: "extracurriculars", values: formData }, { 
        onSuccess: () => {
          toast.success("Program baru berhasil ditambahkan");
          setModalMode(null);
        }
      });
    } else if (modalMode === "edit" && editId) {
      update({ resource: "extracurriculars", id: editId, values: formData }, {
        onSuccess: () => {
          toast.success("Program berhasil diperbarui");
          setModalMode(null);
        }
      });
    }
  };

  const filteredData = data?.data?.filter((item: any) => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.coach_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Program Ekstrakurikuler"
        description="Kelola daftar ekskul, pelatih, jadwal, dan pengaturan biaya."
      />

      <div className="bg-card rounded-xl border shadow-sm flex flex-col">
        <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Cari program atau pelatih..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
          </div>
          <button onClick={openCreate} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Tambah Program
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Program</th>
                <th className="px-6 py-4 whitespace-nowrap">Pelatih / PJ</th>
                <th className="px-6 py-4 whitespace-nowrap">Jadwal</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Biaya Internal</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Biaya Eksternal</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Status</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    <span className="text-muted-foreground text-sm">Memuat data...</span>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                        <Activity className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Belum ada program ekstrakurikuler yang sesuai.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 font-medium">{item.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.coach_name || '-'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.schedule || '-'}</td>
                    <td className="px-6 py-4 text-right tabular-nums">Rp {Number(item.internal_fee).toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 text-right tabular-nums">Rp {Number(item.external_fee).toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-background rounded-xl shadow-2xl border w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
              <h3 className="font-semibold text-lg">{modalMode === "create" ? "Tambah Program Baru" : "Edit Program"}</h3>
              <button onClick={() => setModalMode(null)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Program Ekstrakurikuler <span className="text-destructive">*</span></label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Contoh: Coding & Robotic"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Deskripsi / Profil Singkat</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px]"
                  placeholder="Ceritakan tentang kegiatan ekskul ini..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Pelatih / Penanggung Jawab</label>
                  <input 
                    type="text"
                    value={formData.coach_name}
                    onChange={(e) => setFormData({...formData, coach_name: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Contoh: Kak Budi"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jadwal Pelaksanaan</label>
                  <input 
                    type="text"
                    value={formData.schedule}
                    onChange={(e) => setFormData({...formData, schedule: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Contoh: Rabu & Jumat, 15:30 - 17:00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 border rounded-lg bg-muted/20">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Biaya Siswa Internal (Rp)</label>
                  <input 
                    type="number"
                    value={formData.internal_fee}
                    onChange={(e) => setFormData({...formData, internal_fee: parseInt(e.target.value) || 0})}
                    className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Biaya Siswa Eksternal (Rp)</label>
                  <input 
                    type="number"
                    value={formData.external_fee}
                    onChange={(e) => setFormData({...formData, external_fee: parseInt(e.target.value) || 0})}
                    className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    min="0"
                  />
                </div>
                <div className="md:col-span-2 pt-2">
                   <label className="flex items-center gap-2 cursor-pointer w-max">
                     <input 
                       type="checkbox" 
                       checked={formData.is_active}
                       onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                       className="w-4 h-4 rounded text-primary focus:ring-primary"
                     />
                     <span className="text-sm font-medium">Program Aktif (Dibuka untuk pendaftaran)</span>
                   </label>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t bg-muted/10 flex justify-end gap-3">
              <button 
                onClick={() => setModalMode(null)} 
                disabled={isSaving}
                className="px-4 py-2 rounded-lg font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Menyimpan..." : "Simpan Program"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
