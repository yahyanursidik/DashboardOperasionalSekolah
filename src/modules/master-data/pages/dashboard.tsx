import React, { useState } from "react";
import { useList, useUpdate, useCreate } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Plus, Building, Calendar, BookOpen, Edit2, ToggleLeft, ToggleRight, X, Save } from "lucide-react";

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
              activeTab === "units" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building className="w-4 h-4" />
            Unit Pendidikan
          </button>
          <button
            onClick={() => setActiveTab("academic_years")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "academic_years" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Tahun Ajaran
          </button>
          <button
            onClick={() => setActiveTab("semesters")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "semesters" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Semester
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col">
          {activeTab === "units" && <UnitsTab />}
          {activeTab === "academic_years" && <AcademicYearsTab />}
          {activeTab === "semesters" && <SemestersTab />}
        </div>
      </div>
    </div>
  );
};

// --- MODAL COMPONENT ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
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

// --- TAB COMPONENTS ---

const UnitsTab: React.FC = () => {
  const { data, isLoading } = useList({ resource: "units" });
  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");

  const openCreate = () => { setFormName(""); setEditId(null); setModalMode("create"); };
  const openEdit = (unit: any) => { setFormName(unit.name); setEditId(unit.id); setModalMode("edit"); };

  const handleSave = () => {
    if (!formName.trim()) return;
    if (modalMode === "create") {
      create({ resource: "units", values: { name: formName } }, { onSuccess: () => setModalMode(null) });
    } else if (modalMode === "edit" && editId) {
      update({ resource: "units", id: editId, values: { name: formName } }, { onSuccess: () => setModalMode(null) });
    }
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Memuat data...</div>;

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Daftar Unit Pendidikan</h2>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm">
          <Plus className="w-4 h-4" /> Tambah Unit
        </button>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
            <tr>
              <th className="px-6 py-4 whitespace-nowrap">Nama Unit</th>
              <th className="px-6 py-4 whitespace-nowrap">ID Unit</th>
              <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.data.map((unit) => (
              <tr key={unit.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-medium">{unit.name}</td>
                <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{unit.id}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(unit)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">Belum ada data Unit.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!modalMode} onClose={() => setModalMode(null)} title={modalMode === "create" ? "Tambah Unit Baru" : "Edit Unit"}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Unit (contoh: SDIT Al-Fatih)</label>
            <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary" placeholder="Masukkan nama unit" />
          </div>
          <button onClick={handleSave} className="w-full flex justify-center items-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md hover:bg-primary/90 font-medium">
            <Save className="w-4 h-4" /> Simpan Data
          </button>
        </div>
      </Modal>
    </div>
  );
};

const AcademicYearsTab: React.FC = () => {
  const { data, isLoading } = useList({ resource: "academic_years", sorters: [{ field: "name", order: "desc" }] });
  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", start_date: "", end_date: "" });

  const openCreate = () => { setFormData({ name: "", start_date: "", end_date: "" }); setEditId(null); setModalMode("create"); };
  const openEdit = (row: any) => { setFormData({ name: row.name, start_date: row.start_date || "", end_date: row.end_date || "" }); setEditId(row.id); setModalMode("edit"); };

  const handleSave = () => {
    if (!formData.name) return;
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

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Memuat data...</div>;

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Daftar Tahun Ajaran</h2>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm">
          <Plus className="w-4 h-4" /> Tambah Tahun
        </button>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
            <tr>
              <th className="px-6 py-4 whitespace-nowrap">Tahun Ajaran</th>
              <th className="px-6 py-4 whitespace-nowrap">Tanggal Mulai</th>
              <th className="px-6 py-4 whitespace-nowrap">Tanggal Selesai</th>
              <th className="px-6 py-4 whitespace-nowrap text-center">Status Aktif</th>
              <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.data.map((year) => (
              <tr key={year.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-bold">{year.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{year.start_date || "-"}</td>
                <td className="px-6 py-4 text-muted-foreground">{year.end_date || "-"}</td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => toggleStatus(year.id, year.is_active)} className={`flex items-center justify-center mx-auto p-1 rounded transition-colors ${year.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                    {year.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(year)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Belum ada data Tahun Ajaran.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!modalMode} onClose={() => setModalMode(null)} title={modalMode === "create" ? "Tambah Tahun Ajaran" : "Edit Tahun Ajaran"}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Tahun Ajaran (contoh: 2024/2025)</label>
            <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary" placeholder="YYYY/YYYY" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Mulai</label>
              <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Selesai</label>
              <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary" />
            </div>
          </div>
          <button onClick={handleSave} className="w-full flex justify-center items-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md hover:bg-primary/90 font-medium">
            <Save className="w-4 h-4" /> Simpan Data
          </button>
        </div>
      </Modal>
    </div>
  );
};

const SemestersTab: React.FC = () => {
  const { data: yearsData } = useList({ resource: "academic_years", sorters: [{ field: "name", order: "desc" }] });
  const { data, isLoading } = useList({ resource: "semesters", meta: { select: "*, academic_years(name)" } });
  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "Ganjil", academic_year_id: "", start_date: "", end_date: "" });

  const openCreate = () => { setFormData({ name: "Ganjil", academic_year_id: yearsData?.data?.[0]?.id || "", start_date: "", end_date: "" }); setEditId(null); setModalMode("create"); };
  const openEdit = (row: any) => { setFormData({ name: row.name, academic_year_id: row.academic_year_id, start_date: row.start_date || "", end_date: row.end_date || "" }); setEditId(row.id); setModalMode("edit"); };

  const handleSave = () => {
    if (!formData.name || !formData.academic_year_id) return;
    const values = { name: formData.name, academic_year_id: formData.academic_year_id, start_date: formData.start_date || null, end_date: formData.end_date || null };
    if (modalMode === "create") {
      create({ resource: "semesters", values: { ...values, is_active: false } }, { onSuccess: () => setModalMode(null) });
    } else if (modalMode === "edit" && editId) {
      update({ resource: "semesters", id: editId, values }, { onSuccess: () => setModalMode(null) });
    }
  };

  const toggleStatus = (id: string, currentStatus: boolean) => {
    update({ resource: "semesters", id, values: { is_active: !currentStatus } });
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Memuat data...</div>;

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Daftar Semester</h2>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm">
          <Plus className="w-4 h-4" /> Tambah Semester
        </button>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
            <tr>
              <th className="px-6 py-4 whitespace-nowrap">Semester</th>
              <th className="px-6 py-4 whitespace-nowrap">Tahun Ajaran</th>
              <th className="px-6 py-4 whitespace-nowrap">Tanggal Mulai</th>
              <th className="px-6 py-4 whitespace-nowrap">Tanggal Selesai</th>
              <th className="px-6 py-4 whitespace-nowrap text-center">Status Aktif</th>
              <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.data.map((sem) => (
              <tr key={sem.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-bold">{sem.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{sem.academic_years?.name || "-"}</td>
                <td className="px-6 py-4 text-muted-foreground">{sem.start_date || "-"}</td>
                <td className="px-6 py-4 text-muted-foreground">{sem.end_date || "-"}</td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => toggleStatus(sem.id, sem.is_active)} className={`flex items-center justify-center mx-auto p-1 rounded transition-colors ${sem.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                    {sem.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(sem)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Belum ada data Semester.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!modalMode} onClose={() => setModalMode(null)} title={modalMode === "create" ? "Tambah Semester" : "Edit Semester"}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tahun Ajaran</label>
            <select value={formData.academic_year_id} onChange={e => setFormData({...formData, academic_year_id: e.target.value})} className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background">
              <option value="" disabled>Pilih Tahun Ajaran</option>
              {yearsData?.data?.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Semester</label>
            <select value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background">
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Mulai</label>
              <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Selesai</label>
              <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary" />
            </div>
          </div>
          <button onClick={handleSave} className="w-full flex justify-center items-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md hover:bg-primary/90 font-medium">
            <Save className="w-4 h-4" /> Simpan Data
          </button>
        </div>
      </Modal>
    </div>
  );
};
