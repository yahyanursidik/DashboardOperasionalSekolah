import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ClipboardList, Trash2, Plus, Check, X, GraduationCap, Settings, Save, Upload, Image as ImageIcon, Calendar } from "lucide-react";
import { getPaudIndicators, updatePaudIndicators, getSdReadinessIndicators, updateSdReadinessIndicators, getSpmbSettings, updateSpmbSettings, getSpmbBatches, updateSpmbBatches } from "../mock";
import type { SpmbSettings } from "../mock";

export const AdmissionsSettings: React.FC = () => {
  const [paudIndicators, setPaudIndicators] = useState<string[]>([]);
  const [isAddingPaud, setIsAddingPaud] = useState(false);
  const [newPaudIndicator, setNewPaudIndicator] = useState("");

  const [sdIndicators, setSdIndicators] = useState<string[]>([]);
  const [isAddingSd, setIsAddingSd] = useState(false);
  const [newSdIndicator, setNewSdIndicator] = useState("");

  const [settings, setSettings] = useState<SpmbSettings | null>(null);

  const [batches, setBatches] = useState<string[]>([]);
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");

  useEffect(() => {
    setPaudIndicators(getPaudIndicators());
    setSdIndicators(getSdReadinessIndicators());
    setSettings(getSpmbSettings());
    setBatches(getSpmbBatches());
  }, []);

  const handleSaveSettings = () => {
    if (settings) {
      try {
        updateSpmbSettings(settings);
        alert("Pengaturan Umum SPMB berhasil disimpan!");
      } catch (e) {
        // Error already handled in mock.ts
      }
    }
  };

  const confirmAddBatch = () => {
    if (newBatchName && newBatchName.trim() !== '') {
      const newBatch = newBatchName.trim();
      const updatedBatches = [...batches, newBatch];
      setBatches(updatedBatches);
      updateSpmbBatches(updatedBatches);
      
      if (settings) {
        const newSettings = { ...settings, batch: newBatch };
        setSettings(newSettings);
        updateSpmbSettings(newSettings); // Explicitly save to be safe
      }
      setIsAddingBatch(false);
      setNewBatchName("");
    }
  };

  const cancelAddBatch = () => {
    setIsAddingBatch(false);
    setNewBatchName("");
  };

  const handleUnitToggle = (unit: string) => {
    if (!settings) return;
    const currentUnits = settings.openUnits || [];
    if (currentUnits.includes(unit)) {
      setSettings({ ...settings, openUnits: currentUnits.filter(u => u !== unit) });
    } else {
      setSettings({ ...settings, openUnits: [...currentUnits, unit] });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && settings) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmAddPaud = () => {
    if (newPaudIndicator && newPaudIndicator.trim() !== '') {
      const updated = [...paudIndicators, newPaudIndicator.trim()];
      setPaudIndicators(updated);
      updatePaudIndicators(updated);
      setIsAddingPaud(false);
      setNewPaudIndicator("");
    }
  };

  const handleDeletePaud = (idx: number) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus indikator PAUD ini?")) {
      const updated = [...paudIndicators];
      updated.splice(idx, 1);
      setPaudIndicators(updated);
      updatePaudIndicators(updated);
    }
  };

  const confirmAddSd = () => {
    if (newSdIndicator && newSdIndicator.trim() !== '') {
      const updated = [...sdIndicators, newSdIndicator.trim()];
      setSdIndicators(updated);
      updateSdReadinessIndicators(updated);
      setIsAddingSd(false);
      setNewSdIndicator("");
    }
  };

  const handleDeleteSd = (idx: number) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus indikator SD ini?")) {
      const updated = [...sdIndicators];
      updated.splice(idx, 1);
      setSdIndicators(updated);
      updateSdReadinessIndicators(updated);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Pengaturan SPMB" 
        description="Konfigurasi pendaftaran, kuesioner observasi dan kesiapan bersekolah"
      />

      {settings && (
        <div className="bg-white border rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">Pengaturan Umum SPMB</h3>
              <p className="text-sm text-emerald-700/80 mt-1">Konfigurasi nama lembaga, gelombang aktif, dan jenjang yang dibuka.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status Pendaftaran Publik</label>
              <div className="flex items-center gap-3 mt-2">
                <button 
                  onClick={() => setSettings({ ...settings, isOpen: !settings.isOpen })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${settings.isOpen ? 'bg-emerald-500' : 'bg-slate-300'}`}
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
                value={settings.academicYear || "2026/2027"} 
                onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
                    value={settings.batch || ""} 
                    onChange={(e) => setSettings({ ...settings, batch: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {batches.map((b, idx) => (
                      <option key={idx} value={b}>{b}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setIsAddingBatch(true)}
                    title="Tambah Gelombang Baru"
                    className="p-2 border rounded-lg hover:bg-emerald-50 transition-colors bg-white text-emerald-600 border-emerald-200 shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Yayasan</label>
              <input 
                type="text" 
                value={settings.foundationName || ""}
                onChange={(e) => setSettings({ ...settings, foundationName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Sekolah</label>
              <input 
                type="text" 
                value={settings.schoolName || ""}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="mb-6 border-t pt-6">
            <h4 className="text-sm font-bold mb-4">Logo Lembaga (Untuk Portal SPMB)</h4>
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-50 relative group">
                {settings.logoUrl ? (
                  <>
                    <img src={settings.logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => setSettings({ ...settings, logoUrl: '' })}
                        className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                        title="Hapus Logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors font-medium text-sm">
                  <Upload className="w-4 h-4" />
                  Pilih File Gambar
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleLogoUpload}
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Format yang didukung: JPG, PNG, WEBP. Maksimal 1MB. Disarankan menggunakan gambar dengan latar belakang transparan.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 border-t pt-6">
            <label className="text-sm font-medium block mb-2">Jenjang Pendidikan yang Dibuka</label>
            <div className="flex flex-wrap gap-3">
              {['PAUD/TK', 'SDIT', 'SMPIT', 'SMAIT'].map(unit => (
                <label key={unit} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-slate-50">
                  <input 
                    type="checkbox" 
                    checked={settings.openUnits?.includes(unit) || false}
                    onChange={() => handleUnitToggle(unit)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium">{unit}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button 
              onClick={handleSaveSettings}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" /> Simpan Pengaturan Umum
            </button>
          </div>
        </div>
      )}

      {settings && (
        <div className="bg-white border rounded-2xl p-6 shadow-sm mb-6 border-blue-200">
          <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900">Pengaturan Jadwal Pelaksanaan Tes & Wawancara</h3>
              <p className="text-sm text-blue-700/80 mt-1">Konfigurasi tanggal seleksi, lokasi, dan informasi penting untuk calon siswa.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jadwal Tes Akademik (SDIT/SMPIT/SMAIT)</label>
              <input 
                type="text" 
                value={settings.schedule?.academicTestDate || ""}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  schedule: { ...(settings.schedule || { interviewDate: '', announcementDate: '', location: '', notes: '', academicTestDate: '' }), academicTestDate: e.target.value } 
                })}
                placeholder="Misal: Sabtu, 24 Juli 2026 (08.00 - Selesai)"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jadwal Wawancara Orang Tua</label>
              <input 
                type="text" 
                value={settings.schedule?.interviewDate || ""}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  schedule: { ...(settings.schedule || { academicTestDate: '', announcementDate: '', location: '', notes: '', interviewDate: '' }), interviewDate: e.target.value } 
                })}
                placeholder="Misal: Ahad, 25 Juli 2026 (Sesuai Undangan)"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lokasi Pelaksanaan</label>
              <input 
                type="text" 
                value={settings.schedule?.location || ""}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  schedule: { ...(settings.schedule || { academicTestDate: '', interviewDate: '', announcementDate: '', notes: '', location: '' }), location: e.target.value } 
                })}
                placeholder="Misal: Gedung Utama SIT TSLS"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Pengumuman Kelulusan</label>
              <input 
                type="text" 
                value={settings.schedule?.announcementDate || ""}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  schedule: { ...(settings.schedule || { academicTestDate: '', interviewDate: '', location: '', notes: '', announcementDate: '' }), announcementDate: e.target.value } 
                })}
                placeholder="Misal: 30 Juli 2026 (Melalui Portal Ini)"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Catatan Tambahan / Perlengkapan</label>
              <textarea 
                rows={2}
                value={settings.schedule?.notes || ""}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  schedule: { ...(settings.schedule || { academicTestDate: '', interviewDate: '', announcementDate: '', location: '', notes: '' }), notes: e.target.value } 
                })}
                placeholder="Misal: Harap membawa alat tulis lengkap dan hadir 15 menit sebelum acara dimulai."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button 
              onClick={handleSaveSettings}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" /> Simpan Pengaturan Jadwal
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel PAUD */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm border-purple-200">
          <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-purple-900">Kuesioner Observasi PAUD</h3>
              <p className="text-sm text-purple-700/80 mt-1">Daftar pertanyaan mandiri untuk calon siswa KB/TK.</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {paudIndicators.map((indicator, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                <span className="font-medium text-slate-700">{indicator}</span>
                <button 
                  onClick={() => handleDeletePaud(idx)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Hapus Indikator"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {isAddingPaud ? (
              <div className="flex gap-2 p-3 border border-purple-300 bg-purple-50 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Tuliskan indikator baru..."
                  value={newPaudIndicator}
                  onChange={(e) => setNewPaudIndicator(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmAddPaud();
                    if (e.key === 'Escape') setIsAddingPaud(false);
                  }}
                />
                <button 
                  onClick={confirmAddPaud}
                  className="p-2 border border-emerald-500 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsAddingPaud(false)}
                  className="p-2 border rounded-lg bg-white text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingPaud(true)}
                className="w-full p-4 border border-dashed border-purple-300 rounded-lg text-purple-700 font-medium hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Tambah Indikator Baru
              </button>
            )}
          </div>
        </div>

        {/* Panel SD */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm border-blue-200">
          <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900">Checklist Kesiapan SD</h3>
              <p className="text-sm text-blue-700/80 mt-1">Daftar pertanyaan kesiapan calon siswa SD.</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {sdIndicators.map((indicator, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                <span className="font-medium text-slate-700">{indicator}</span>
                <button 
                  onClick={() => handleDeleteSd(idx)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Hapus Indikator"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {isAddingSd ? (
              <div className="flex gap-2 p-3 border border-blue-300 bg-blue-50 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Tuliskan indikator kesiapan baru..."
                  value={newSdIndicator}
                  onChange={(e) => setNewSdIndicator(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmAddSd();
                    if (e.key === 'Escape') setIsAddingSd(false);
                  }}
                />
                <button 
                  onClick={confirmAddSd}
                  className="p-2 border border-emerald-500 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsAddingSd(false)}
                  className="p-2 border rounded-lg bg-white text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingSd(true)}
                className="w-full p-4 border border-dashed border-blue-300 rounded-lg text-blue-700 font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Tambah Indikator Kesiapan
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
