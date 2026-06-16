import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ChevronRight, FileText, Upload, Award, Lock } from "lucide-react";
import { getSpmbSettings } from "../mock";

export const SpmbDashboard: React.FC = () => {
  // Mock Progress (1 = done, 2 = current, 0 = locked)
  const steps = [
    { title: 'Formulir Pendaftaran', desc: 'Isi biodata diri dan orang tua.', icon: FileText, status: 1, link: '/spmb/form' },
    { title: 'Upload Berkas', desc: 'Unggah KK, Akta, dan foto.', icon: Upload, status: 2, link: '/spmb/documents' },
    { title: 'Tes Seleksi', desc: 'Jadwal wawancara dan tes akademik.', icon: CheckCircle2, status: 0, link: '#' },
    { title: 'Pengumuman', desc: 'Hasil seleksi akhir penerimaan.', icon: Award, status: 0, link: '/spmb/announcement' },
  ];

  const settings = getSpmbSettings();

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-indigo-600 to-primary text-white rounded-2xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold mb-2">Selamat Datang, Calon Siswa!</h1>
        <p className="text-white/80 max-w-lg leading-relaxed">
          Ini adalah portal resmi Seleksi Penerimaan Murid Baru. Silakan lengkapi tahapan di bawah ini secara berurutan.
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6 border-b pb-4">Timeline Pendaftaran Anda</h2>
        
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-muted"></div>
          
          <div className="space-y-6 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className={`flex gap-6 items-start ${step.status === 0 ? 'opacity-50' : ''}`}>
                  {/* Status Indicator */}
                  <div className={`w-12 h-12 rounded-full border-4 border-white flex items-center justify-center shrink-0
                    ${step.status === 1 ? 'bg-emerald-500 text-white' : 
                      step.status === 2 ? 'bg-blue-500 text-white ring-4 ring-blue-100' : 
                      'bg-slate-200 text-slate-400'}`}>
                    {step.status === 1 ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                  </div>

                  {/* Content Card */}
                  <div className={`flex-1 border rounded-xl p-5 ${step.status === 2 ? 'border-blue-200 bg-blue-50/30' : 'bg-card'}`}>
                    <div className="flex justify-between items-center gap-4">
                      <div>
                        <h3 className={`font-bold text-lg ${step.status === 2 ? 'text-blue-900' : 'text-foreground'}`}>{step.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                      </div>
                      
                      {step.status !== 0 && (
                        <Link 
                          to={step.link} 
                          className={`shrink-0 flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                            ${step.status === 1 ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
                        >
                          {step.status === 1 ? 'Edit Data' : 'Lengkapi'} 
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
