import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ClipboardList, Trash2, Plus, Check, X, GraduationCap } from "lucide-react";
import { getPaudIndicators, updatePaudIndicators, getSdReadinessIndicators, updateSdReadinessIndicators } from "../mock";

export const AdmissionsSettings: React.FC = () => {
  const [paudIndicators, setPaudIndicators] = useState<string[]>([]);
  const [isAddingPaud, setIsAddingPaud] = useState(false);
  const [newPaudIndicator, setNewPaudIndicator] = useState("");

  const [sdIndicators, setSdIndicators] = useState<string[]>([]);
  const [isAddingSd, setIsAddingSd] = useState(false);
  const [newSdIndicator, setNewSdIndicator] = useState("");

  useEffect(() => {
    setPaudIndicators(getPaudIndicators());
    setSdIndicators(getSdReadinessIndicators());
  }, []);

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
        description="Konfigurasi kuesioner observasi dan kesiapan bersekolah"
      />

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
