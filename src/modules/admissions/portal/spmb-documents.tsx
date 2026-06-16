import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

export const SpmbDocuments: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/spmb" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="w-4 h-4" /> Kembali ke Dashboard
      </Link>

      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-2">Upload Berkas Persyaratan</h2>
        <p className="text-muted-foreground mb-8">Pastikan dokumen yang diunggah jelas dan dapat dibaca. Format yang didukung: JPG, PNG, PDF (Maksimal 2MB per file).</p>

        <div className="space-y-6">
          
          {/* Document 1: KK */}
          <div className="border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:border-primary/50 transition-colors bg-muted/10">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold">Kartu Keluarga (KK) <span className="text-rose-500">*</span></h4>
                <p className="text-sm text-muted-foreground">kk_ahmad_faiz.pdf (1.2 MB)</p>
              </div>
            </div>
            <button className="text-sm font-medium border px-4 py-2 rounded-lg hover:bg-muted text-foreground transition-colors w-full md:w-auto">
              Ganti File
            </button>
          </div>

          {/* Document 2: Akta */}
          <div className="border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-blue-200 bg-blue-50/50 transition-colors">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-white border shadow-sm text-blue-600 flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-blue-900">Akta Kelahiran <span className="text-rose-500">*</span></h4>
                <p className="text-sm text-blue-700/70">Belum diunggah</p>
              </div>
            </div>
            <button className="text-sm font-medium bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 text-white transition-colors w-full md:w-auto shadow-sm">
              Pilih File
            </button>
          </div>

          {/* Document 3: Pas Foto */}
          <div className="border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:border-primary/50 transition-colors">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold">Pas Foto 3x4 <span className="text-rose-500">*</span></h4>
                <p className="text-sm text-muted-foreground">Belum diunggah (Warna latar merah/biru)</p>
              </div>
            </div>
            <button className="text-sm font-medium border px-4 py-2 rounded-lg hover:bg-muted text-foreground transition-colors w-full md:w-auto">
              Pilih File
            </button>
          </div>

        </div>

        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 items-start">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            Harap unggah seluruh dokumen yang diwajibkan (<span className="text-rose-500">*</span>). Panitia hanya akan memverifikasi berkas jika seluruh dokumen telah diunggah dengan lengkap.
          </p>
        </div>

      </div>
    </div>
  );
};
