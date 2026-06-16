import React from "react";
import { Link } from "react-router-dom";
import { Award, ChevronLeft, Calendar } from "lucide-react";

export const SpmbAnnouncement: React.FC = () => {
  // Mock status: 'waiting', 'accepted', 'rejected'
  const resultStatus: string = 'accepted'; 

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/spmb" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="w-4 h-4" /> Kembali ke Dashboard
      </Link>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden text-center">
        
        {resultStatus === 'waiting' && (
          <div className="p-12 flex flex-col items-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <Calendar className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Pengumuman Belum Tersedia</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Hasil seleksi penerimaan murid baru untuk gelombang ini belum dirilis. Silakan periksa kembali halaman ini pada tanggal yang telah ditentukan.
            </p>
          </div>
        )}

        {resultStatus === 'accepted' && (
          <>
            <div className="bg-emerald-600 text-white p-12 flex flex-col items-center">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 ring-8 ring-white/10">
                <Award className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-black mb-2 uppercase tracking-wide">Selamat!</h2>
              <p className="text-emerald-50 text-lg">Anda Dinyatakan Lulus Seleksi</p>
            </div>
            <div className="p-8">
              <p className="text-muted-foreground mb-6">
                Berdasarkan hasil tes akademik dan wawancara, Ananda <strong>Ahmad Faiz</strong> dinyatakan diterima sebagai siswa TSLS OS tahun ajaran baru.
              </p>
              <div className="bg-muted/30 border rounded-xl p-6 text-left mb-6">
                <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">Langkah Selanjutnya:</h4>
                <ul className="list-disc pl-5 space-y-2 text-sm font-medium">
                  <li>Melakukan daftar ulang paling lambat tanggal 15 Juli 2026.</li>
                  <li>Melakukan pembayaran biaya masuk melalui portal Bendahara.</li>
                  <li>Mengikuti kegiatan Masa Pengenalan Lingkungan Sekolah (MPLS).</li>
                </ul>
              </div>
              <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm">
                Lanjut ke Daftar Ulang
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
