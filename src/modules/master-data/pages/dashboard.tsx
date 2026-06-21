import React, { useState, useMemo, useEffect } from "react";
import { useList, useUpdate, useCreate, useDelete } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Plus, Building, Calendar, BookOpen, Edit2, ToggleLeft, ToggleRight, X, Save, Search, Inbox, Loader2, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

// Utility for formatting dates
const formatDate = (dateString?: string | null) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const MasterDataDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"units" | "academic_years" | "semesters">("units");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Induk (Master Data)"
        description="Kelola Unit Sekolah, Tahun Ajaran, dan Semester aktif."
      />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="flex border-b overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab("units")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "units" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Building className="w-4 h-4" />
            Unit Pendidikan
          </button>
          <button
            onClick={() => setActiveTab("academic_years")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "academic_years" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Tahun Ajaran
          </button>
          <button
            onClick={() => setActiveTab("semesters")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "semesters" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Semester
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col bg-muted/10">
          {activeTab === "units" && <UnitsTab />}
          {activeTab === "academic_years" && <AcademicYearsTab />}
          {activeTab === "semesters" && <SemestersTab />}
        </div>
      </div>
    </div>
  );
};

// --- EMPTY STATE COMPONENT ---
const EmptyState: React.FC<{ title: string; description: string; action?: React.ReactNode }> = ({ title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
    <div className="bg-background border shadow-sm w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
      <Inbox className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm mb-6 max-w-sm">{description}</p>
    {action}
  </div>
);

// --- MODAL COMPONENT ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-xl shadow-2xl border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- TABLE PAGINATION ---
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
    <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20">
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

// --- DELETE CONFIRM MODAL ---
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  warningText: string;
  isDeleting: boolean;
}> = ({ isOpen, onClose, onConfirm, title, itemName, warningText, isDeleting }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-xl border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="font-bold text-xl mb-2">{title}</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Anda akan menghapus data <span className="font-semibold text-foreground">"{itemName}"</span> secara permanen.
          </p>
          <div className="bg-red-50 text-red-800 text-xs p-4 rounded-xl border border-red-100 text-left leading-relaxed">
            <p className="font-bold mb-1.5 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5"/> Peringatan Keamanan Database</p>
            {warningText}
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6 pt-2">
          <button onClick={onClose} disabled={isDeleting} className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-foreground bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50">
            Batal
          </button>
          <button onClick={onConfirm} disabled={isDeleting} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-xl hover:bg-red-700 transition-colors font-semibold text-sm disabled:opacity-50 shadow-sm">
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {isDeleting ? "Menghapus..." : "Ya, Hapus Data"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- TAB COMPONENTS ---

const UnitsTab: React.FC = () => {
  const { data, isLoading } = useList({ resource: "units", pagination: { mode: "off" } });
  const { mutate: create, isLoading: isCreating } = useCreate();
  const { mutate: update, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteMutate, isLoading: isDeleting } = useDelete();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: "", name: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const isSaving = isCreating || isUpdating;

  const openCreate = () => { setFormName(""); setEditId(null); setModalMode("create"); };
  const openEdit = (unit: any) => { setFormName(unit.name); setEditId(String(unit.id)); setModalMode("edit"); };

  const handleSave = () => {
    if (!formName.trim() || isSaving) return;
    if (modalMode === "create") {
      create({ resource: "units", values: { name: formName } }, { onSuccess: () => setModalMode(null) });
    } else if (modalMode === "edit" && editId) {
      update({ resource: "units", id: editId, values: { name: formName } }, { onSuccess: () => setModalMode(null) });
    }
  };

  const confirmDelete = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const executeDelete = () => {
    deleteMutate(
      { resource: "units", id: deleteModal.id },
      {
        onSuccess: () => {
          toast.success(`Unit ${deleteModal.name} berhasil dihapus.`);
          setDeleteModal({ isOpen: false, id: "", name: "" });
        },
        onError: (error) => {
          console.error("Delete Unit error:", error);
          toast.error(`PENGHAPUSAN DITOLAK: Unit ${deleteModal.name} tidak bisa dihapus karena masih digunakan (terhubung) dengan data Kelas, Siswa, atau Pegawai.`);
          setDeleteModal({ isOpen: false, id: "", name: "" });
        }
      }
    );
  };

  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((item: any) => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading) return <div className="flex-1 flex justify-center items-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Cari Unit Pendidikan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border bg-background rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
          />
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm w-full sm:w-auto whitespace-nowrap">
          <Plus className="w-4 h-4" /> Tambah Unit
        </button>
      </div>

      <div className="overflow-x-auto border rounded-xl flex-1 bg-background shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b">
            <tr>
              <th className="px-6 py-4 whitespace-nowrap">Nama Unit</th>
              <th className="px-6 py-4 whitespace-nowrap">ID Unit</th>
              <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.map((unit: any) => (
              <tr key={unit.id} className="hover:bg-muted/30 transition-colors group">
                <td className="px-6 py-4 font-medium">{unit.name}</td>
                <td className="px-6 py-4 text-muted-foreground font-mono text-xs bg-muted/30 rounded inline-block mt-3 ml-6">{unit.id}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(unit)} className="p-2 text-muted-foreground hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50" title="Edit Unit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => confirmDelete(String(unit.id), unit.name)} className="p-2 text-muted-foreground hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" title="Hapus Unit">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={3} className="p-0">
                  <EmptyState 
                    title={searchTerm ? "Pencarian tidak ditemukan" : "Belum ada Unit Pendidikan"} 
                    description={searchTerm ? `Tidak ada unit yang cocok dengan "${searchTerm}"` : "Mulai dengan menambahkan unit pendidikan pertama Anda untuk mengelola sekolah."} 
                    action={!searchTerm ? <button onClick={openCreate} className="text-primary text-sm font-medium hover:underline flex items-center gap-1"><Plus className="w-4 h-4"/> Tambah Unit Sekarang</button> : null}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          totalItems={filteredData.length} 
          itemsPerPage={itemsPerPage} 
          onPageChange={setCurrentPage} 
        />
      </div>

      <Modal isOpen={!!modalMode} onClose={() => setModalMode(null)} title={modalMode === "create" ? "Tambah Unit Baru" : "Edit Unit"}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Unit <span className="text-red-500">*</span></label>
            <input 
              value={formName} 
              onChange={e => setFormName(e.target.value)} 
              className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-background" 
              placeholder="contoh: SDIT Al-Fatih" 
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t mt-6">
            <button onClick={() => setModalMode(null)} disabled={isSaving} className="px-4 py-2 text-sm font-medium rounded-lg text-foreground bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50">
              Batal
            </button>
            <button onClick={handleSave} disabled={isSaving || !formName.trim()} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Menyimpan..." : "Simpan Data"}
            </button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
        onConfirm={executeDelete}
        title="Hapus Unit Pendidikan?"
        itemName={deleteModal.name}
        warningText="Penghapusan akan ditolak secara otomatis oleh sistem jika unit ini sedang berelasi dengan data Siswa, Kelas, atau Pegawai. Pastikan unit ini sudah dikosongkan sebelum dihapus."
        isDeleting={isDeleting}
      />
    </div>
  );
};

const AcademicYearsTab: React.FC = () => {
  const { data, isLoading } = useList({ resource: "academic_years", sorters: [{ field: "name", order: "desc" }], pagination: { mode: "off" } });
  const { mutate: create, isLoading: isCreating } = useCreate();
  const { mutate: update, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteMutate, isLoading: isDeleting } = useDelete();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: "", name: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", start_date: "", end_date: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const isSaving = isCreating || isUpdating;

  const openCreate = () => { setFormData({ name: "", start_date: "", end_date: "" }); setEditId(null); setModalMode("create"); };
  const openEdit = (row: any) => { setFormData({ name: row.name, start_date: row.start_date || "", end_date: row.end_date || "" }); setEditId(String(row.id)); setModalMode("edit"); };

  const handleSave = () => {
    if (!formData.name || isSaving) return;
    const values = { name: formData.name, start_date: formData.start_date || null, end_date: formData.end_date || null };
    if (modalMode === "create") {
      create({ resource: "academic_years", values: { ...values, is_active: false } }, { onSuccess: () => setModalMode(null) });
    } else if (modalMode === "edit" && editId) {
      update({ resource: "academic_years", id: editId, values }, { onSuccess: () => setModalMode(null) });
    }
  };

  const toggleStatus = (id: string, currentStatus: boolean) => {
    update({ resource: "academic_years", id, values: { is_active: !currentStatus } });
  };

  const confirmDelete = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const executeDelete = () => {
    deleteMutate(
      { resource: "academic_years", id: deleteModal.id },
      {
        onSuccess: () => {
          toast.success(`Tahun Ajaran ${deleteModal.name} berhasil dihapus.`);
          setDeleteModal({ isOpen: false, id: "", name: "" });
        },
        onError: (error) => {
          console.error("Delete Academic Year error:", error);
          toast.error(`PENGHAPUSAN DITOLAK: Tahun Ajaran ${deleteModal.name} tidak bisa dihapus karena telah digunakan dalam riwayat Semester, Nilai, atau Pembayaran.`);
          setDeleteModal({ isOpen: false, id: "", name: "" });
        }
      }
    );
  };

  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((item: any) => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading) return <div className="flex-1 flex justify-center items-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Cari Tahun Ajaran..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border bg-background rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
          />
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm w-full sm:w-auto whitespace-nowrap">
          <Plus className="w-4 h-4" /> Tambah Tahun
        </button>
      </div>

      <div className="overflow-x-auto border rounded-xl flex-1 bg-background shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b">
            <tr>
              <th className="px-6 py-4 whitespace-nowrap">Tahun Ajaran</th>
              <th className="px-6 py-4 whitespace-nowrap">Periode</th>
              <th className="px-6 py-4 whitespace-nowrap text-center">Status Aktif</th>
              <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.map((year: any) => (
              <tr key={year.id} className={`hover:bg-muted/30 transition-colors group ${year.is_active ? 'bg-primary/5' : ''}`}>
                <td className="px-6 py-4 font-bold">{year.name}</td>
                <td className="px-6 py-4 text-muted-foreground text-xs sm:text-sm">
                  {formatDate(year.start_date)} <span className="mx-2 text-muted-foreground/50">s/d</span> {formatDate(year.end_date)}
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => toggleStatus(String(year.id), year.is_active)} 
                    className={`inline-flex items-center justify-center p-1.5 rounded-full transition-all duration-300 ${year.is_active ? 'text-green-600 bg-green-100 hover:bg-green-200 shadow-sm scale-110' : 'text-muted-foreground hover:bg-muted scale-100'}`}
                    title={year.is_active ? "Nonaktifkan" : "Aktifkan"}
                  >
                    {year.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(year)} className="p-2 text-muted-foreground hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50" title="Edit Tahun Ajaran">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => confirmDelete(String(year.id), year.name)} className="p-2 text-muted-foreground hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" title="Hapus Tahun Ajaran">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={4} className="p-0">
                   <EmptyState 
                    title={searchTerm ? "Pencarian tidak ditemukan" : "Belum ada Tahun Ajaran"} 
                    description={searchTerm ? `Tidak ada tahun ajaran yang cocok dengan "${searchTerm}"` : "Mulai dengan menambahkan tahun ajaran baru."} 
                    action={!searchTerm ? <button onClick={openCreate} className="text-primary text-sm font-medium hover:underline flex items-center gap-1"><Plus className="w-4 h-4"/> Tambah Tahun Ajaran</button> : null}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          totalItems={filteredData.length} 
          itemsPerPage={itemsPerPage} 
          onPageChange={setCurrentPage} 
        />
      </div>

      <Modal isOpen={!!modalMode} onClose={() => setModalMode(null)} title={modalMode === "create" ? "Tambah Tahun Ajaran" : "Edit Tahun Ajaran"}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Tahun Ajaran <span className="text-red-500">*</span></label>
            <input 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-background" 
              placeholder="contoh: 2024/2025" 
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Mulai</label>
              <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Selesai</label>
              <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm bg-background" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t mt-6">
            <button onClick={() => setModalMode(null)} disabled={isSaving} className="px-4 py-2 text-sm font-medium rounded-lg text-foreground bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50">
              Batal
            </button>
            <button onClick={handleSave} disabled={isSaving || !formData.name.trim()} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Menyimpan..." : "Simpan Data"}
            </button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
        onConfirm={executeDelete}
        title="Hapus Tahun Ajaran?"
        itemName={deleteModal.name}
        warningText="Menghapus Tahun Ajaran dapat merusak data operasional sebelumnya (misal Semester, Tagihan, atau Raport) jika sudah terhubung. Pastikan ini adalah tahun ajaran baru yang kosong."
        isDeleting={isDeleting}
      />
    </div>
  );
};

const SemestersTab: React.FC = () => {
  const { data: yearsData } = useList({ resource: "academic_years", sorters: [{ field: "name", order: "desc" }], pagination: { mode: "off" } });
  const { data, isLoading } = useList({ resource: "semesters", meta: { select: "*, academic_years(name)" }, pagination: { mode: "off" } });
  const { mutate: create, isLoading: isCreating } = useCreate();
  const { mutate: update, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteMutate, isLoading: isDeleting } = useDelete();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: "", name: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "Ganjil", academic_year_id: "", start_date: "", end_date: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const isSaving = isCreating || isUpdating;

  const openCreate = () => { setFormData({ name: "Ganjil", academic_year_id: yearsData?.data?.[0]?.id ? String(yearsData.data[0].id) : "", start_date: "", end_date: "" }); setEditId(null); setModalMode("create"); };
  const openEdit = (row: any) => { setFormData({ name: row.name, academic_year_id: row.academic_year_id, start_date: row.start_date || "", end_date: row.end_date || "" }); setEditId(String(row.id)); setModalMode("edit"); };

  const handleSave = () => {
    if (!formData.name || !formData.academic_year_id || isSaving) return;
    const values = { name: formData.name, academic_year_id: formData.academic_year_id, start_date: formData.start_date || null, end_date: formData.end_date || null };
    if (modalMode === "create") {
      create({ resource: "semesters", values: { ...values, is_active: false } }, { onSuccess: () => setModalMode(null) });
    } else if (modalMode === "edit" && editId) {
      update({ resource: "semesters", id: editId, values }, { onSuccess: () => setModalMode(null) });
    }
  };

  const toggleStatus = (id: string | number, currentStatus: boolean) => {
    update({ resource: "semesters", id, values: { is_active: !currentStatus } });
  };

  const confirmDelete = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const executeDelete = () => {
    deleteMutate(
      { resource: "semesters", id: deleteModal.id },
      {
        onSuccess: () => {
          toast.success(`Semester ${deleteModal.name} berhasil dihapus.`);
          setDeleteModal({ isOpen: false, id: "", name: "" });
        },
        onError: (error) => {
          console.error("Delete Semester error:", error);
          toast.error(`PENGHAPUSAN DITOLAK: Semester ${deleteModal.name} tidak bisa dihapus karena berelasi dengan data Jadwal atau Absensi.`);
          setDeleteModal({ isOpen: false, id: "", name: "" });
        }
      }
    );
  };

  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((item: any) => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.academic_years?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading) return <div className="flex-1 flex justify-center items-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Cari Semester / Tahun..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border bg-background rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
          />
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm w-full sm:w-auto whitespace-nowrap">
          <Plus className="w-4 h-4" /> Tambah Semester
        </button>
      </div>

      <div className="overflow-x-auto border rounded-xl flex-1 bg-background shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b">
            <tr>
              <th className="px-6 py-4 whitespace-nowrap">Semester</th>
              <th className="px-6 py-4 whitespace-nowrap">Tahun Ajaran</th>
              <th className="px-6 py-4 whitespace-nowrap">Periode</th>
              <th className="px-6 py-4 whitespace-nowrap text-center">Status Aktif</th>
              <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.map((sem: any) => (
              <tr key={sem.id} className={`hover:bg-muted/30 transition-colors group ${sem.is_active ? 'bg-primary/5' : ''}`}>
                <td className="px-6 py-4 font-bold">{sem.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{sem.academic_years?.name || "-"}</td>
                <td className="px-6 py-4 text-muted-foreground text-xs sm:text-sm">
                  {formatDate(sem.start_date)} <span className="mx-2 text-muted-foreground/50">s/d</span> {formatDate(sem.end_date)}
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => toggleStatus(String(sem.id), sem.is_active)} 
                    className={`inline-flex items-center justify-center p-1.5 rounded-full transition-all duration-300 ${sem.is_active ? 'text-green-600 bg-green-100 hover:bg-green-200 shadow-sm scale-110' : 'text-muted-foreground hover:bg-muted scale-100'}`}
                    title={sem.is_active ? "Nonaktifkan" : "Aktifkan"}
                  >
                    {sem.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(sem)} className="p-2 text-muted-foreground hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50" title="Edit Semester">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => confirmDelete(String(sem.id), sem.name)} className="p-2 text-muted-foreground hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" title="Hapus Semester">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="p-0">
                   <EmptyState 
                    title={searchTerm ? "Pencarian tidak ditemukan" : "Belum ada Semester"} 
                    description={searchTerm ? `Tidak ada semester yang cocok dengan "${searchTerm}"` : "Mulai dengan menambahkan semester baru."} 
                    action={!searchTerm ? <button onClick={openCreate} className="text-primary text-sm font-medium hover:underline flex items-center gap-1"><Plus className="w-4 h-4"/> Tambah Semester</button> : null}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          totalItems={filteredData.length} 
          itemsPerPage={itemsPerPage} 
          onPageChange={setCurrentPage} 
        />
      </div>

      <Modal isOpen={!!modalMode} onClose={() => setModalMode(null)} title={modalMode === "create" ? "Tambah Semester" : "Edit Semester"}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tahun Ajaran <span className="text-red-500">*</span></label>
            <select value={formData.academic_year_id} onChange={e => setFormData({...formData, academic_year_id: e.target.value})} className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-background">
              <option value="" disabled>Pilih Tahun Ajaran</option>
              {yearsData?.data?.map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Semester <span className="text-red-500">*</span></label>
            <select value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-background">
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Mulai</label>
              <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Selesai</label>
              <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full border rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm bg-background" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t mt-6">
            <button onClick={() => setModalMode(null)} disabled={isSaving} className="px-4 py-2 text-sm font-medium rounded-lg text-foreground bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50">
              Batal
            </button>
            <button onClick={handleSave} disabled={isSaving || !formData.academic_year_id} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? "Menyimpan..." : "Simpan Data"}
            </button>
          </div>
        </div>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
        onConfirm={executeDelete}
        title="Hapus Semester?"
        itemName={deleteModal.name}
        warningText="Semester tidak bisa dihapus jika sedang ada data jadwal pelajaran atau absensi yang berjalan di dalamnya. Penghapusan ini bersifat permanen."
        isDeleting={isDeleting}
      />
    </div>
  );
};
