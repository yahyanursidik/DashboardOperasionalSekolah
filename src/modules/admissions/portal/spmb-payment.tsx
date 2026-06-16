import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, UploadCloud, FileImage, AlertCircle, CreditCard, Wallet } from "lucide-react";

export const SpmbPayment: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('spmbPaymentUploaded');
    if (saved) {
      setIsSubmitted(true);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Harap pilih file bukti transfer terlebih dahulu.");
      return;
    }
    
    // Simulasikan upload
    setTimeout(() => {
      localStorage.setItem('spmbPaymentUploaded', 'true');
      setIsSubmitted(true);
    }, 1000);
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
        <button onClick={() => navigate('/spmb')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </button>
        <div className="bg-white border rounded-2xl p-10 shadow-sm text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Bukti Pembayaran Berhasil Diunggah</h2>
          <p className="text-slate-600 leading-relaxed mb-8">
            Tim Panitia Keuangan kami akan memverifikasi pembayaran Anda dalam 1x24 jam kerja. Anda dapat mengecek status verifikasi di Dashboard.
          </p>
          <button 
            onClick={() => navigate('/spmb')}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Kembali ke Dashboard
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
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Pembayaran Biaya Pendaftaran</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Unggah bukti transfer Anda di sini untuk melanjutkan proses validasi pendaftaran oleh tim keuangan sekolah.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Instruksi Transfer */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 mb-4">Informasi Rekening Tujuan</h3>
            
            <div className="bg-slate-50 border rounded-xl p-4 space-y-4">
              <div className="flex gap-3">
                <Wallet className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bank Syariah Indonesia (BSI)</p>
                  <p className="font-bold text-lg text-slate-800 tracking-wider">712 345 6789</p>
                  <p className="text-sm text-slate-600">a.n. Yayasan Pendidikan TSLS</p>
                </div>
              </div>
              <div className="flex gap-3 border-t pt-4">
                <Wallet className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bank Muamalat</p>
                  <p className="font-bold text-lg text-slate-800 tracking-wider">123 456 7890</p>
                  <p className="text-sm text-slate-600">a.n. Yayasan Pendidikan TSLS</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Pastikan nominal yang ditransfer sesuai dengan tagihan awal pendaftaran (Rp 350.000,-). Bukti struk harus mencantumkan nama calon siswa pada keterangan berita transfer (jika memungkinkan).</p>
            </div>
          </div>

          {/* Form Upload */}
          <form onSubmit={handleSubmit} className="flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4">Upload Bukti Transfer</h3>
            
            <div className="flex-1">
              <label 
                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                  {file ? (
                    <>
                      <FileImage className="w-10 h-10 text-primary mb-3" />
                      <p className="text-sm font-semibold text-primary truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
                      <p className="text-sm font-semibold text-slate-700 mb-1">Klik untuk memilih file</p>
                      <p className="text-xs text-muted-foreground">atau seret dan lepas file di sini</p>
                      <p className="text-xs text-slate-400 mt-2">Format: JPG, PNG, PDF (Maks. 2MB)</p>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                type="submit"
                disabled={!file}
                className="w-full px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <UploadCloud className="w-5 h-5" /> Unggah Bukti
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
