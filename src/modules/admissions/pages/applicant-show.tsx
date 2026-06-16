import React from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { User, FileText, CheckCircle, ChevronLeft, Download, AlertCircle, Info, ClipboardList, GraduationCap } from "lucide-react";
import { mockApplicants } from "../mock";

export const ApplicantShow: React.FC = () => {
  const { id } = useParams();

  const applicant = mockApplicants.find(a => a.id === id) || mockApplicants[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/admissions/applicants" className="p-2 border rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <PageHeader 
          title={`Detail Pendaftar: ${applicant.name}`} 
          description={`No Registrasi: ${applicant.id}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Biodata */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 mb-4 gap-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Biodata Lengkap
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold uppercase">
                  {applicant.unit} {applicant.targetClass ? `- ${applicant.targetClass}` : ''}
                </span>
                {applicant.admissionPath === 'Siswa Pindahan' && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold uppercase">
                    Pindahan
                  </span>
                )}
              </div>
            </div>

            {applicant.admissionPath === 'Siswa Pindahan' && applicant.transferReason && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Alasan Kepindahan</h4>
                  <p className="text-sm text-amber-800 mt-1">{applicant.transferReason}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Nama Lengkap</p>
                <p className="font-semibold text-foreground">{applicant.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">NIK</p>
                <p className="font-semibold text-foreground">{applicant.nik}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Tempat, Tanggal Lahir</p>
                <p className="font-semibold text-foreground">Jakarta, {applicant.dob}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Asal Sekolah</p>
                <p className="font-semibold text-foreground">{applicant.school}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Nama Orang Tua</p>
                <p className="font-semibold text-foreground">{applicant.parentName}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">No. HP Orang Tua</p>
                <p className="font-semibold text-foreground">{applicant.parentPhone}</p>
              </div>
            </div>
          </div>

          {applicant.unit === 'PAUD/TK' && applicant.paudChecklist && (
            <div className="bg-card border rounded-2xl p-6 shadow-sm border-purple-200">
              <h3 className="font-bold text-lg border-b pb-3 mb-4 flex items-center gap-2 text-purple-800">
                <ClipboardList className="w-5 h-5 text-purple-600" /> Hasil Observasi Mandiri PAUD
              </h3>
              
              <div className="space-y-3">
                {Object.entries(applicant.paudChecklist).map(([key, value], idx) => {
                  return (
                    <div key={idx} className="flex justify-between items-center p-3 border-b last:border-0 border-slate-100">
                      <span className="text-sm font-medium">{key}</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full 
                        ${value === 'Sudah Bisa' ? 'bg-emerald-100 text-emerald-700' : 
                          value === 'Mulai Bisa' ? 'bg-blue-100 text-blue-700' : 
                          'bg-amber-100 text-amber-700'}`}>
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {applicant.unit === 'SD' && applicant.sdChecklist && (
            <div className="bg-card border rounded-2xl p-6 shadow-sm border-blue-200">
              <h3 className="font-bold text-lg border-b pb-3 mb-4 flex items-center gap-2 text-blue-800">
                <GraduationCap className="w-5 h-5 text-blue-600" /> Hasil Checklist Kesiapan SD
              </h3>
              
              <div className="space-y-3">
                {Object.entries(applicant.sdChecklist).map(([key, value], idx) => {
                  return (
                    <div key={idx} className="flex justify-between items-center p-3 border-b last:border-0 border-slate-100">
                      <span className="text-sm font-medium">{key}</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full 
                        ${value === 'Sudah Bisa' ? 'bg-emerald-100 text-emerald-700' : 
                          value === 'Mulai Bisa' ? 'bg-blue-100 text-blue-700' : 
                          'bg-amber-100 text-amber-700'}`}>
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg border-b pb-3 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" /> Verifikasi Berkas
            </h3>
            <ul className="space-y-3">
              {['Kartu Keluarga', 'Akta Kelahiran', 'Pas Foto'].map((doc, idx) => (
                <li key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-md">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">{doc}</span>
                  </div>
                  <button className="text-sm font-medium text-blue-600 flex items-center gap-1 hover:underline">
                    <Download className="w-4 h-4" /> Unduh
                  </button>
                </li>
              ))}
              
              {/* Optional Rapor */}
              <li className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 ${applicant.unit === 'PAUD/TK' ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${applicant.unit === 'PAUD/TK' ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                    {applicant.unit === 'PAUD/TK' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </div>
                  <span className="font-medium text-sm">Rapor Terakhir {applicant.unit === 'PAUD/TK' && '(Opsional)'}</span>
                </div>
                {applicant.unit !== 'PAUD/TK' && (
                  <button className="text-sm font-medium text-blue-600 flex items-center gap-1 hover:underline">
                    <Download className="w-4 h-4" /> Unduh
                  </button>
                )}
              </li>
            </ul>
          </div>
        </div>

        {/* Kolom Kanan: Aksi & Status */}
        <div className="space-y-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg border-b pb-3 mb-4">Status & Tindakan</h3>
            
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">Status Saat Ini</p>
              <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                {applicant.status}
              </span>
            </div>

            <div className="space-y-3">
              <button className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Validasi Semua Berkas
              </button>
              {(applicant.unit === 'SMP' || applicant.unit === 'SMA') && (
                <button className="w-full py-2.5 border border-primary text-primary hover:bg-primary/5 font-medium rounded-lg text-sm transition-colors">
                  Input Nilai Ujian
                </button>
              )}
              <button className="w-full py-2.5 border border-amber-500 text-amber-600 hover:bg-amber-50 font-medium rounded-lg text-sm transition-colors">
                Tandai Lulus Seleksi
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
