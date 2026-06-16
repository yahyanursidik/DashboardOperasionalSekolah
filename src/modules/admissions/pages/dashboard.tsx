import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Users, FileCheck, XCircle, TrendingUp, Settings, Plus, Check, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getDashboardStats, getSpmbSettings, updateSpmbSettings, getSpmbBatches, updateSpmbBatches } from "../mock";
import type { SpmbSettings } from "../mock";

export const AdmissionsDashboard: React.FC = () => {
  const [settings, setSettings] = useState<SpmbSettings>({ isOpen: true, academicYear: '2026/2027', batch: 'Gelombang 1' });
  const [batches, setBatches] = useState<string[]>([]);
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");

  useEffect(() => {
    setSettings(getSpmbSettings());
    setBatches(getSpmbBatches());
  }, []);

  const handleToggleStatus = () => {
    const newSettings = { ...settings, isOpen: !settings.isOpen };
    setSettings(newSettings);
    updateSpmbSettings(newSettings);
  };

  const handleAcademicYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSettings = { ...settings, academicYear: e.target.value };
    setSettings(newSettings);
    updateSpmbSettings(newSettings);
  };

  const handleBatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSettings = { ...settings, batch: e.target.value };
    setSettings(newSettings);
    updateSpmbSettings(newSettings);
  };

  const confirmAddBatch = () => {
    if (newBatchName && newBatchName.trim() !== '') {
      const updatedBatches = [...batches, newBatchName.trim()];
      setBatches(updatedBatches);
      updateSpmbBatches(updatedBatches);
      
      const newSettings = { ...settings, batch: newBatchName.trim() };
      setSettings(newSettings);
      updateSpmbSettings(newSettings);
      
      setIsAddingBatch(false);
      setNewBatchName("");
    }
  };

  const cancelAddBatch = () => {
    setIsAddingBatch(false);
    setNewBatchName("");
  };

  const statsData = getDashboardStats();

  const funnelData = [
    { name: 'Mendaftar', jumlah: statsData.total },
    { name: 'Berkas Lengkap', jumlah: statsData.waiting + statsData.verified + statsData.passed },
    { name: 'Verifikasi Valid', jumlah: statsData.verified + statsData.passed },
    { name: 'Lulus Tes', jumlah: statsData.passed },
  ];

  const stats = [
    { label: "Total Pendaftar", value: statsData.total, icon: Users, color: "text-blue-600 bg-blue-100" },
    { label: "Berkas Terverifikasi", value: statsData.verified + statsData.passed, icon: FileCheck, color: "text-emerald-600 bg-emerald-100" },
    { label: "Menunggu Verifikasi", value: statsData.waiting, icon: TrendingUp, color: "text-amber-600 bg-amber-100" },
    { label: "Ditolak", value: statsData.rejected, icon: XCircle, color: "text-rose-600 bg-rose-100" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard SPMB" 
        description="Pantau statistik dan corong (funnel) Seleksi Penerimaan Murid Baru."
        action={
          <Link to="/admissions/applicants" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Kelola Pendaftar
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-card border rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pengaturan SPMB Panel */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
            <Settings className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold">Pengaturan Pendaftaran</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status Pendaftaran Publik</label>
            <div className="flex items-center gap-3 mt-2">
              <button 
                onClick={handleToggleStatus}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${settings.isOpen ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.isOpen ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm font-bold ${settings.isOpen ? 'text-emerald-600' : 'text-slate-500'}`}>
                {settings.isOpen ? 'Buka (Menerima Pendaftar)' : 'Tutup (Terkunci)'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Tahun Akademik Target</label>
            <select 
              value={settings.academicYear} 
              onChange={handleAcademicYearChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
              <option value="2027/2028">2027/2028</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Gelombang Pendaftaran</label>
            {isAddingBatch ? (
              <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Misal: Gelombang 4..."
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmAddBatch();
                    if (e.key === 'Escape') cancelAddBatch();
                  }}
                />
                <button 
                  onClick={confirmAddBatch}
                  title="Simpan"
                  className="p-2 border border-emerald-500 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button 
                  onClick={cancelAddBatch}
                  title="Batal"
                  className="p-2 border rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 animate-in fade-in duration-200">
                <select 
                  value={settings.batch} 
                  onChange={handleBatchChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  {batches.map((b, idx) => (
                    <option key={idx} value={b}>{b}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setIsAddingBatch(true)}
                  title="Tambah Gelombang Baru"
                  className="p-2 border rounded-lg hover:bg-blue-50 transition-colors bg-white text-blue-600 border-blue-200"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-6 shadow-sm mt-6">
        <h3 className="text-lg font-bold mb-6">Funnel Pendaftaran</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#374151' }} />
              <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px' }} />
              <Bar dataKey="jumlah" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
