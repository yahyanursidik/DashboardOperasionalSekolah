import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight, FileText, Upload, Award, Lock, ClipboardList, Wallet, AlertCircle, Clock, UploadCloud, FileImage, Calendar, MapPin, Bell } from "lucide-react";
import { getSpmbSettings, getSpmbFinanceSettings } from "../mock";

export const SpmbDashboard: React.FC = () => {
  const [testDone, setTestDone] = useState(false);
  const [checklistDone, setChecklistDone] = useState(false);
  const [isPassed, setIsPassed] = useState(false);

  useEffect(() => {
    const updateProgress = () => {
      setTestDone(localStorage.getItem('spmbTestCompleted') === 'true');
      setChecklistDone(localStorage.getItem('spmbChecklistCompleted') === 'true');
      setIsPassed(localStorage.getItem('spmbPassed') === 'true');
    };
    
    updateProgress();
    
    window.addEventListener('spmbProgressUpdated', updateProgress);
    window.addEventListener('storage', updateProgress);
    
    return () => {
      window.removeEventListener('spmbProgressUpdated', updateProgress);
      window.removeEventListener('storage', updateProgress);
    };
  }, []);
  const loadSettings = () => {
    try {
      const raw = localStorage.getItem('spmbSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...getSpmbSettings(), ...parsed };
      }
    } catch(e) {}
    return getSpmbSettings();
  };

  const loadFinanceSettings = () => {
    try {
      const raw = localStorage.getItem('spmbFinanceSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...getSpmbFinanceSettings(), ...parsed };
      }
    } catch(e) {}
    return getSpmbFinanceSettings();
  };

  const [settings, setSettings] = useState(loadSettings());
  const [financeSettings, setFinanceSettings] = useState(loadFinanceSettings());
  
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'spmbSettings') {
        setSettings(loadSettings());
      }
      if (e.key === 'spmbFinanceSettings') {
        setFinanceSettings(loadFinanceSettings());
      }
    };
    
    const handleLocalUpdate = () => setSettings(loadSettings());
    const handleFinanceUpdate = () => setFinanceSettings(loadFinanceSettings());

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('spmbSettingsUpdated', handleLocalUpdate);
    window.addEventListener('spmbFinanceSettingsUpdated', handleFinanceUpdate);
    
    setSettings(loadSettings());
    setFinanceSettings(loadFinanceSettings());

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('spmbSettingsUpdated', handleLocalUpdate);
      window.removeEventListener('spmbFinanceSettingsUpdated', handleFinanceUpdate);
    };
  }, []);
  
  // Mock User State
  let spmbUser = null;
  try {
    const userStr = localStorage.getItem('spmbUser');
    if (userStr) spmbUser = JSON.parse(userStr);
  } catch (e) {}

  const paymentDone = localStorage.getItem('spmbPaymentUploaded') === 'true';

  const steps = [
    { title: 'Formulir Pendaftaran', desc: 'Isi biodata calon siswa dan data orang tua wali.', icon: FileText, status: 1, link: '/spmb/form' },
    { title: 'Kelengkapan Berkas', desc: 'Unggah KK, Akta Kelahiran, dan Pas Foto.', icon: Upload, status: 2, link: '/spmb/documents' },
    { title: 'Kuesioner Observasi', desc: 'Isi checklist kesiapan kemandirian anak.', icon: ClipboardList, status: checklistDone ? 1 : 2, link: '/spmb/checklist' },
    { title: 'Tes Seleksi & Wawancara', desc: 'Hadir dan ikuti tes sesuai jadwal di panel kanan.', icon: CheckCircle2, status: testDone ? 1 : (checklistDone ? 2 : 0), link: '#' },
    { title: 'Pengumuman Hasil', desc: 'Hasil seleksi akhir penerimaan murid baru.', icon: Award, status: isPassed ? 1 : (testDone ? 2 : 0), link: '/spmb/announcement' },
  ];

  if (!settings.isOpen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in-95">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <Lock className="w-12 h-12" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-3xl font-bold text-slate-800">Pendaftaran Ditutup</h2>
          <p className="text-slate-500 leading-relaxed">
            Mohon maaf, Seleksi Penerimaan Murid Baru (SPMB) untuk Tahun Akademik <strong>{settings.academicYear}</strong> ({settings.batch}) saat ini sedang ditutup.
          </p>
        </div>
        <Link to="/" className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors">
          Kembali ke Beranda Utama
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-600 to-primary text-white rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Award className="w-48 h-48" />
        </div>

        <div className="relative z-10">
          <div className="mb-6 animate-in slide-in-from-left-4 duration-500">
            <p className="text-indigo-100 text-lg font-medium">Assalamu'alykum Ummu/Abba,</p>
            <p className="text-3xl font-extrabold text-white mt-1">{spmbUser?.name || 'Calon Pendaftar'}</p>
            <p className="text-indigo-200 text-sm mt-2">Selamat datang di portal pendaftaran peserta didik baru.</p>
          </div>

          <div className="flex items-center gap-4 mb-4">
            {settings.logoUrl && (
              <div className="w-16 h-16 bg-white rounded-xl shadow-sm p-1.5 shrink-0 flex items-center justify-center">
                <img src={settings.logoUrl} alt="Logo Sekolah" className="w-full h-full object-contain" />
              </div>
            )}
            <div>
              <p className="text-indigo-100 text-sm font-semibold uppercase tracking-wider">{settings.foundationName}</p>
              <h1 className="text-xl md:text-2xl font-bold mt-1">{settings.schoolName}</h1>
            </div>
          </div>
          <h2 className="text-lg md:text-xl font-bold mb-2 text-indigo-50">Portal Pendaftaran - {settings.batch}</h2>
          
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 mt-2">
            <span className="text-sm font-medium text-indigo-100">Jenjang Dibuka:</span>
            <div className="flex gap-2">
              {settings.openUnits?.map((unit: string) => (
                <span key={unit} className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold tracking-wide">
                  {unit}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Status Card (Top Right) */}
        <div className="relative z-10 bg-white rounded-xl p-5 text-slate-800 shadow-lg md:w-72 shrink-0">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Status Pendaftaran</p>
          <div className="flex items-center gap-3">
            <div className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
            </div>
            <h3 className="font-extrabold text-lg text-amber-600">Menunggu Verifikasi</h3>
          </div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Mohon lengkapi seluruh tahapan pendaftaran di bawah agar data Anda dapat kami verifikasi.
          </p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Alur Pendaftaran */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" /> Alur Kelengkapan Data
            </h2>
            
            <div className="space-y-4">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={idx} className={`flex gap-4 p-4 border rounded-xl transition-all ${step.status === 2 ? 'border-blue-300 bg-blue-50 hover:shadow-md' : step.status === 1 ? 'border-emerald-200 bg-emerald-50/50' : 'bg-slate-50 opacity-70'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0
                      ${step.status === 1 ? 'bg-emerald-500 text-white' : 
                        step.status === 2 ? 'bg-blue-600 text-white shadow-sm' : 
                        'bg-slate-200 text-slate-400'}`}>
                      {step.status === 1 ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className={`font-bold ${step.status === 2 ? 'text-blue-900' : step.status === 1 ? 'text-emerald-900' : 'text-slate-700'}`}>{step.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{step.desc}</p>
                      </div>
                      
                      {step.status !== 0 && (
                        <Link 
                          to={step.link} 
                          className={`shrink-0 inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-bold transition-all
                            ${step.status === 1 ? 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'}`}
                        >
                          {step.status === 1 ? 'Edit Data' : 'Lengkapi Sekarang'} 
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Panel Informasi */}
        <div className="space-y-6">
          
          {/* Schedule Info Card */}
          {settings.schedule && (
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 shadow-md text-white">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-200" /> Jadwal Tes & Wawancara
              </h2>
              
              <div className="space-y-4">
                {settings.schedule.academicTestDate && (
                  <div className="flex gap-3 items-start">
                    <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
                      <FileText className="w-4 h-4 text-blue-100" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-200 font-medium mb-0.5">Tes Akademik (SD/SMP/SMA)</p>
                      <p className="text-sm font-semibold">{settings.schedule.academicTestDate}</p>
                    </div>
                  </div>
                )}
                
                {settings.schedule.interviewDate && (
                  <div className="flex gap-3 items-start">
                    <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
                      <Clock className="w-4 h-4 text-blue-100" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-200 font-medium mb-0.5">Wawancara Orang Tua</p>
                      <p className="text-sm font-semibold">{settings.schedule.interviewDate}</p>
                    </div>
                  </div>
                )}

                {settings.schedule.location && (
                  <div className="flex gap-3 items-start">
                    <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
                      <MapPin className="w-4 h-4 text-blue-100" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-200 font-medium mb-0.5">Lokasi</p>
                      <p className="text-sm font-semibold">{settings.schedule.location}</p>
                    </div>
                  </div>
                )}

                {settings.schedule.announcementDate && (
                  <div className="flex gap-3 items-start">
                    <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
                      <Bell className="w-4 h-4 text-blue-100" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-200 font-medium mb-0.5">Pengumuman Kelulusan</p>
                      <p className="text-sm font-semibold">{settings.schedule.announcementDate}</p>
                    </div>
                  </div>
                )}
              </div>

              {settings.schedule.notes && (
                <div className="mt-5 pt-4 border-t border-white/20">
                  <p className="text-xs text-blue-100 leading-relaxed italic">
                    "{settings.schedule.notes}"
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Informasi Pembayaran</h2>
            
            {settings.openUnits && settings.openUnits.length > 0 ? (
              <div className="space-y-4 mb-6">
                {settings.openUnits.map((unit: string) => {
                  const fee = financeSettings.unitFees.find((f: any) => f.unit === unit);
                  if (!fee) return null;
                  return (
                    <div key={unit} className="bg-slate-50 border rounded-xl p-4">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-slate-500 font-medium">Biaya Pendaftaran <span className="font-bold text-slate-700">{unit}</span></p>
                      </div>
                      <p className="text-2xl font-black text-slate-800">Rp {fee.amount.toLocaleString('id-ID')}</p>
                      <ul className="text-xs text-slate-500 mt-3 space-y-1">
                        {fee.details.map((detail: string, idx: number) => (
                          <li key={idx}>• {detail}</li>
                        ))}
                      </ul>

                      {fee.postAdmissionFees && fee.postAdmissionFees.length > 0 && (
                        <details className="mt-4 group">
                          <summary className="text-xs font-bold text-indigo-700 cursor-pointer flex items-center justify-between p-2.5 bg-indigo-50/80 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100/50">
                            Lihat Estimasi Biaya Pendidikan Awal
                            <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                          </summary>
                          <div className="pt-3 pb-1 px-2 animate-in slide-in-from-top-2 duration-300">
                            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">Total estimasi investasi pendidikan awal yang dibayarkan jika siswa dinyatakan diterima di jenjang <strong className="text-slate-700">{unit}</strong>:</p>
                            
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2">
                                <p className="text-[9px] font-bold text-blue-600 uppercase mb-0.5">Total Ikhwan</p>
                                <p className="text-sm font-black text-blue-900">Rp {fee.postAdmissionFees.reduce((sum: number, f: any) => (f.type === 'umum' || f.type === 'ikhwan') ? sum + f.amount : sum, 0).toLocaleString('id-ID')}</p>
                              </div>
                              <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-2">
                                <p className="text-[9px] font-bold text-rose-600 uppercase mb-0.5">Total Akhwat</p>
                                <p className="text-sm font-black text-rose-900">Rp {fee.postAdmissionFees.reduce((sum: number, f: any) => (f.type === 'umum' || f.type === 'akhwat') ? sum + f.amount : sum, 0).toLocaleString('id-ID')}</p>
                              </div>
                            </div>

                            <div className="border-t border-slate-200/60 pt-2 mt-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Rincian Komponen</p>
                              <ul className="text-xs text-slate-600 space-y-2">
                                {fee.postAdmissionFees.map((pf: any, idx: number) => (
                                  <li key={idx} className="flex justify-between items-start">
                                    <span className="flex-1">
                                      {pf.name}
                                      {pf.type !== 'umum' && (
                                        <span className={`inline-block ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${pf.type === 'ikhwan' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                                          {pf.type}
                                        </span>
                                      )}
                                    </span>
                                    <span className="font-mono text-[11px] font-medium text-slate-700 ml-2 mt-0.5">Rp {pf.amount.toLocaleString('id-ID')}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 border rounded-xl p-4 mb-6 text-sm text-slate-500 text-center">
                Belum ada jenjang yang dibuka.
              </div>
            )}

            <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider mb-4 border-b pb-2">Metode Pembayaran</h3>
            
            <div className="space-y-4 mb-6">
              {financeSettings.banks.map((bank: any, idx: number) => (
                <div key={idx} className="flex gap-3 items-center p-3 border border-emerald-100 bg-emerald-50/50 rounded-lg">
                  <Wallet className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800">{bank.bankName}</p>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">{bank.accountNumber}</p>
                    <p className="text-[10px] text-emerald-700 uppercase mt-0.5">A.N. {bank.accountName}</p>
                  </div>
                </div>
              ))}
              
              {financeSettings.qrisUrl && (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center flex flex-col items-center justify-center bg-slate-50">
                  <div className="w-32 h-32 bg-white border rounded shadow-sm flex items-center justify-center mb-3 overflow-hidden">
                    <img src={financeSettings.qrisUrl} alt="QRIS Code" className="w-full h-full object-contain" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">Scan QRIS untuk pembayaran instant</p>
                </div>
              )}
            </div>

            {paymentDone ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold">Bukti Pembayaran Diterima</p>
                  <p className="text-xs mt-1">Sedang menunggu verifikasi dari admin keuangan.</p>
                </div>
              </div>
            ) : (
              <Link 
                to="/spmb/payment"
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 px-4 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
              >
                <UploadCloud className="w-5 h-5" /> Konfirmasi Pembayaran
              </Link>
            )}
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900 text-sm">Butuh Bantuan?</h4>
              <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                Jika Anda mengalami kendala selama proses pendaftaran, silakan hubungi Panitia SPMB melalui WhatsApp: <strong className="font-bold">0811-2233-4455</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
