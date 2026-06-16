import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { getPaudIndicators, getSdReadinessIndicators } from "../mock";

export const SpmbChecklist: React.FC = () => {
  const navigate = useNavigate();
  const [unit, setUnit] = useState<"PAUD" | "SD" | null>(null);
  const [indicators, setIndicators] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Check if already submitted in this session/mock
    const saved = localStorage.getItem('spmbChecklistCompleted');
    if (saved) {
      setIsSubmitted(true);
    }
  }, []);

  const handleSelectUnit = (selectedUnit: "PAUD" | "SD") => {
    setUnit(selectedUnit);
    setAnswers({});
    if (selectedUnit === "PAUD") {
      setIndicators(getPaudIndicators());
    } else {
      setIndicators(getSdReadinessIndicators());
    }
  };

  const handleToggle = (idx: number) => {
    setAnswers(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < indicators.length) {
      alert("Harap jawab semua pertanyaan kuesioner.");
      return;
    }
    
    // Save state
    localStorage.setItem('spmbChecklistCompleted', 'true');
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <button onClick={() => navigate('/spmb')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </button>
        <div className="bg-white border rounded-2xl p-10 shadow-sm text-center max-w-2xl mx-auto mt-10">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Checklist Berhasil Disimpan</h2>
          <p className="text-slate-600 leading-relaxed mb-8">
            Terima kasih telah mengisi kuesioner observasi/kesiapan. Data ini akan digunakan sebagai informasi tambahan saat wawancara seleksi penerimaan murid baru.
          </p>
          <button 
            onClick={() => navigate('/spmb')}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Lanjutkan Proses Pendaftaran
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <button onClick={() => navigate('/spmb')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
      </button>

      <div className="bg-white border rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-8 pb-6 border-b">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Checklist Kesiapan & Observasi</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Silakan pilih jenjang pendidikan yang didaftar untuk menampilkan kuesioner yang sesuai. Jawablah setiap pertanyaan dengan sejujur-jujurnya sesuai dengan kondisi anak.
            </p>
          </div>
        </div>

        {!unit ? (
          <div className="space-y-6 text-center py-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Pilih Jenjang Pendaftaran Anak Anda:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
              <button 
                onClick={() => handleSelectUnit('PAUD')}
                className="group p-6 border-2 border-slate-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="font-black text-xl">KB/TK</span>
                </div>
                <h4 className="font-bold text-lg text-slate-800 group-hover:text-purple-700">PAUD / KB / TK</h4>
                <p className="text-sm text-slate-500 mt-2">Kuesioner kemandirian dasar dan motorik anak usia dini.</p>
              </button>
              
              <button 
                onClick={() => handleSelectUnit('SD')}
                className="group p-6 border-2 border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="font-black text-xl">SDIT</span>
                </div>
                <h4 className="font-bold text-lg text-slate-800 group-hover:text-blue-700">Sekolah Dasar (SD)</h4>
                <p className="text-sm text-slate-500 mt-2">Checklist kesiapan psikologis dan akademik calon siswa SD.</p>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border">
              <div>
                <p className="text-sm font-medium text-slate-500">Kuesioner Terpilih:</p>
                <p className="font-bold text-slate-800">{unit === 'PAUD' ? 'Kemandirian Usia Dini (PAUD/TK)' : 'Kesiapan Bersekolah (SD)'}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setUnit(null)} 
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Ganti Jenjang
              </button>
            </div>

            <div className="space-y-4">
              {indicators.map((indicator, idx) => (
                <div key={idx} className="flex gap-4 p-4 border rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-slate-700 leading-relaxed">{idx + 1}. {indicator}</p>
                  </div>
                  <div className="shrink-0 flex gap-4 items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name={`indicator-${idx}`} 
                        checked={answers[idx] === true}
                        onChange={() => handleToggle(idx)}
                        required
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Ya / Bisa</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name={`indicator-${idx}`} 
                        checked={answers[idx] === false}
                        onChange={() => handleToggle(idx)}
                        required
                        className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Belum Bisa</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>Pastikan Anda telah mengisi seluruh pertanyaan di atas sebelum menyimpan. Data ini tidak menentukan kelulusan secara mutlak, melainkan untuk pemetaan awal calon siswa.</p>
            </div>

            <div className="flex justify-end border-t pt-6">
              <button 
                type="submit"
                className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Simpan & Kumpulkan
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
