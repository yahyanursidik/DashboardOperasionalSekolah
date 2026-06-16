import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Wallet, Plus, Trash2, Check, X, Upload, Image as ImageIcon, Save, Info } from "lucide-react";
import { getSpmbFinanceSettings, updateSpmbFinanceSettings } from "../../admissions/mock";
import type { SpmbFinanceSettings, SpmbUnitFee, BankAccount, PostAdmissionFee } from "../../admissions/mock";

export const SpmbFeesConfig: React.FC = () => {
  const [settings, setSettings] = useState<SpmbFinanceSettings | null>(null);
  const [activeTab, setActiveTab] = useState<string>('PAUD/TK');
  const [newDetail, setNewDetail] = useState("");
  const [isAddingDetail, setIsAddingDetail] = useState(false);

  // State for Post-Admission Fees
  const [isAddingPostFee, setIsAddingPostFee] = useState(false);
  const [newPostFeeName, setNewPostFeeName] = useState("");
  const [newPostFeeAmount, setNewPostFeeAmount] = useState("");
  const [newPostFeeType, setNewPostFeeType] = useState<'umum' | 'ikhwan' | 'akhwat'>('umum');

  useEffect(() => {
    setSettings(getSpmbFinanceSettings());
  }, []);

  const handleSave = () => {
    if (settings) {
      try {
        updateSpmbFinanceSettings(settings);
        alert("Pengaturan Biaya SPMB berhasil disimpan!");
      } catch (e) {
        // Error is handled in mock
      }
    }
  };

  if (!settings) return null;

  const currentFeeIndex = settings.unitFees.findIndex(f => f.unit === activeTab);
  const currentFee = currentFeeIndex !== -1 ? settings.unitFees[currentFeeIndex] : null;

  // -- Registration Fees Handlers --
  const handleAmountChange = (val: string) => {
    if (!currentFee) return;
    const numericValue = parseInt(val.replace(/\D/g, '')) || 0;
    const updatedFees = [...settings.unitFees];
    updatedFees[currentFeeIndex] = { ...currentFee, amount: numericValue };
    setSettings({ ...settings, unitFees: updatedFees });
  };

  const handleAddDetail = () => {
    if (newDetail.trim() && currentFee) {
      const updatedFees = [...settings.unitFees];
      updatedFees[currentFeeIndex] = { 
        ...currentFee, 
        details: [...currentFee.details, newDetail.trim()] 
      };
      setSettings({ ...settings, unitFees: updatedFees });
      setNewDetail("");
      setIsAddingDetail(false);
    }
  };

  const handleDeleteDetail = (idx: number) => {
    if (currentFee) {
      const updatedFees = [...settings.unitFees];
      const newDetails = [...currentFee.details];
      newDetails.splice(idx, 1);
      updatedFees[currentFeeIndex] = { ...currentFee, details: newDetails };
      setSettings({ ...settings, unitFees: updatedFees });
    }
  };

  // -- Post-Admission Fees Handlers --
  const handleAddPostFee = () => {
    if (newPostFeeName.trim() && currentFee) {
      const numericAmount = parseInt(newPostFeeAmount.replace(/\D/g, '')) || 0;
      const newFee: PostAdmissionFee = {
        id: Date.now().toString(),
        name: newPostFeeName.trim(),
        amount: numericAmount,
        type: newPostFeeType
      };
      const updatedFees = [...settings.unitFees];
      updatedFees[currentFeeIndex] = {
        ...currentFee,
        postAdmissionFees: [...(currentFee.postAdmissionFees || []), newFee]
      };
      setSettings({ ...settings, unitFees: updatedFees });
      setNewPostFeeName("");
      setNewPostFeeAmount("");
      setNewPostFeeType('umum');
      setIsAddingPostFee(false);
    }
  };

  const handleDeletePostFee = (idx: number) => {
    if (currentFee) {
      const updatedFees = [...settings.unitFees];
      const newPostFees = [...(currentFee.postAdmissionFees || [])];
      newPostFees.splice(idx, 1);
      updatedFees[currentFeeIndex] = { ...currentFee, postAdmissionFees: newPostFees };
      setSettings({ ...settings, unitFees: updatedFees });
    }
  };

  // -- Bank & QRIS Handlers --
  const handleQrisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && settings) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, qrisUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBank = () => {
    const newBank: BankAccount = { id: Date.now().toString(), bankName: "Bank Baru", accountNumber: "000", accountName: "Yayasan TSLS" };
    setSettings({ ...settings, banks: [...settings.banks, newBank] });
  };

  const handleUpdateBank = (idx: number, field: keyof BankAccount, val: string) => {
    const updatedBanks = [...settings.banks];
    updatedBanks[idx] = { ...updatedBanks[idx], [field]: val };
    setSettings({ ...settings, banks: updatedBanks });
  };

  const handleDeleteBank = (idx: number) => {
    const updatedBanks = [...settings.banks];
    updatedBanks.splice(idx, 1);
    setSettings({ ...settings, banks: updatedBanks });
  };

  // Calculate Totals for Post-Admission
  const calculateTotal = (type: 'ikhwan' | 'akhwat') => {
    if (!currentFee?.postAdmissionFees) return 0;
    return currentFee.postAdmissionFees.reduce((total, fee) => {
      if (fee.type === 'umum' || fee.type === type) return total + fee.amount;
      return total;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Pengaturan Biaya SPMB" 
        description="Konfigurasi nominal pendaftaran, daftar ulang, rincian fasilitas, dan rekening pembayaran."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-24">
        
        {/* Kolom Kiri: Rincian per Jenjang */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex overflow-x-auto border-b bg-slate-50 p-2 gap-2">
              {settings.unitFees.map(fee => (
                <button
                  key={fee.unit}
                  onClick={() => setActiveTab(fee.unit)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === fee.unit ? 'bg-primary text-primary-foreground shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                  Jenjang {fee.unit}
                </button>
              ))}
            </div>

            {currentFee && (
              <div className="p-6 space-y-8">
                
                {/* 1. SECTION: Biaya Pendaftaran */}
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b">1. Biaya Pendaftaran (Seleksi)</h3>
                  
                  <div className="mb-6">
                    <label className="text-sm font-bold text-slate-700 block mb-2">Total Biaya Pendaftaran</label>
                    <div className="relative max-w-md">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                      <input 
                        type="text" 
                        value={currentFee.amount.toLocaleString('id-ID')}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 text-lg font-bold border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-bold text-slate-700 block mb-2">Rincian Fasilitas / Komponen Biaya Pendaftaran</label>
                    <div className="space-y-3">
                      {currentFee.details.map((detail, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                          <span className="font-medium text-slate-700">{detail}</span>
                          <button 
                            onClick={() => handleDeleteDetail(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {isAddingDetail ? (
                        <div className="flex gap-2 p-3 border border-primary/30 bg-primary/5 rounded-lg">
                          <input 
                            type="text" 
                            autoFocus
                            placeholder="Tuliskan rincian biaya..."
                            value={newDetail}
                            onChange={(e) => setNewDetail(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddDetail();
                              if (e.key === 'Escape') setIsAddingDetail(false);
                            }}
                          />
                          <button onClick={handleAddDetail} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                            <Check className="w-5 h-5" />
                          </button>
                          <button onClick={() => setIsAddingDetail(false)} className="p-2 bg-white border text-slate-600 rounded-lg hover:bg-slate-100">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setIsAddingDetail(true)}
                          className="w-full p-4 border border-dashed border-slate-300 rounded-lg text-slate-500 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-5 h-5" /> Tambah Rincian Pendaftaran
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. SECTION: Biaya Pendidikan Awal */}
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b">2. Komponen Biaya Pendidikan Awal (Dibayar Setelah Diterima)</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Total Biaya Ikhwan (Laki-laki)</p>
                      <p className="text-2xl font-black text-blue-900">Rp {calculateTotal('ikhwan').toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                      <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Total Biaya Akhwat (Perempuan)</p>
                      <p className="text-2xl font-black text-rose-900">Rp {calculateTotal('akhwat').toLocaleString('id-ID')}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentFee.postAdmissionFees?.map((fee, idx) => (
                      <div key={fee.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-slate-50 gap-3">
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 text-sm">{fee.name}</p>
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                            fee.type === 'umum' ? 'bg-slate-200 text-slate-700' :
                            fee.type === 'ikhwan' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {fee.type === 'umum' ? 'SEMUA SISWA' : fee.type === 'ikhwan' ? 'KHUSUS IKHWAN' : 'KHUSUS AKHWAT'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                          <span className="font-mono font-bold text-slate-700">Rp {fee.amount.toLocaleString('id-ID')}</span>
                          <button 
                            onClick={() => handleDeletePostFee(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {isAddingPostFee ? (
                      <div className="flex flex-col gap-3 p-4 border border-primary/30 bg-primary/5 rounded-xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-600 mb-1 block">Nama Komponen (Misal: SPP Juli)</label>
                            <input 
                              type="text" 
                              value={newPostFeeName}
                              onChange={(e) => setNewPostFeeName(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 mb-1 block">Nominal (Rp)</label>
                            <input 
                              type="text" 
                              value={newPostFeeAmount}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setNewPostFeeAmount(Number(val).toLocaleString('id-ID'));
                              }}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 mb-1 block">Berlaku Untuk</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="radio" name="postFeeType" checked={newPostFeeType === 'umum'} onChange={() => setNewPostFeeType('umum')} />
                              Semua Siswa
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="radio" name="postFeeType" checked={newPostFeeType === 'ikhwan'} onChange={() => setNewPostFeeType('ikhwan')} />
                              Khusus Ikhwan
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="radio" name="postFeeType" checked={newPostFeeType === 'akhwat'} onChange={() => setNewPostFeeType('akhwat')} />
                              Khusus Akhwat
                            </label>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-primary/10">
                          <button onClick={() => setIsAddingPostFee(false)} className="px-4 py-2 bg-white border text-slate-600 rounded-lg hover:bg-slate-100 text-sm font-bold">
                            Batal
                          </button>
                          <button onClick={handleAddPostFee} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-bold flex items-center gap-2">
                            <Check className="w-4 h-4" /> Simpan Komponen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsAddingPostFee(true)}
                        className="w-full p-4 border border-dashed border-slate-300 rounded-lg text-slate-500 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" /> Tambah Komponen Biaya Pendidikan Awal
                      </button>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Rekening & QRIS */}
        <div className="space-y-6">
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" /> Metode Pembayaran
            </h3>

            <div className="space-y-4 mb-6">
              {settings.banks.map((bank, idx) => (
                <div key={idx} className="p-4 border rounded-xl bg-slate-50 space-y-3 relative group">
                  <button 
                    onClick={() => handleDeleteBank(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <input 
                    type="text" 
                    value={bank.bankName} 
                    onChange={(e) => handleUpdateBank(idx, 'bankName', e.target.value)}
                    placeholder="Nama Bank (misal: BSI)"
                    className="w-full px-3 py-1.5 text-sm font-bold border-b bg-transparent focus:outline-none focus:border-primary"
                  />
                  <input 
                    type="text" 
                    value={bank.accountNumber} 
                    onChange={(e) => handleUpdateBank(idx, 'accountNumber', e.target.value)}
                    placeholder="Nomor Rekening"
                    className="w-full px-3 py-1.5 text-sm font-mono border-b bg-transparent focus:outline-none focus:border-primary"
                  />
                  <input 
                    type="text" 
                    value={bank.accountName} 
                    onChange={(e) => handleUpdateBank(idx, 'accountName', e.target.value)}
                    placeholder="Atas Nama"
                    className="w-full px-3 py-1.5 text-sm border-b bg-transparent focus:outline-none focus:border-primary"
                  />
                </div>
              ))}
              
              <button 
                onClick={handleAddBank}
                className="w-full py-2 border border-dashed border-emerald-300 text-emerald-700 rounded-xl hover:bg-emerald-50 text-sm font-bold flex justify-center items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Tambah Rekening
              </button>
            </div>

            <h4 className="text-sm font-bold mb-3 border-t pt-4">QRIS Pembayaran</h4>
            <div className="flex flex-col items-center gap-4">
              <div className="w-40 h-40 shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-50 relative group">
                {settings.qrisUrl ? (
                  <>
                    <img src={settings.qrisUrl} alt="QRIS" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => setSettings({ ...settings, qrisUrl: '' })}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                        title="Hapus QRIS"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <ImageIcon className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors font-medium text-sm w-full justify-center">
                <Upload className="w-4 h-4" />
                Unggah QRIS Baru
                <input type="file" accept="image/*" className="hidden" onChange={handleQrisUpload} />
              </label>
            </div>
          </div>
        </div>

      </div>

      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <div className="bg-white/90 backdrop-blur border shadow-lg px-4 py-2.5 rounded-xl hidden md:flex items-center gap-2 text-slate-600 text-sm">
          <Info className="w-4 h-4 text-emerald-500" /> Pastikan Anda menyimpan perubahan sebelum berpindah menu.
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
        >
          <Save className="w-5 h-5" /> Simpan Semua Pengaturan Biaya
        </button>
      </div>

    </div>
  );
};
