import React, { useState } from "react";
import { useShow, useUpdate, useCreate } from "@refinedev/core";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, User, Phone, Mail, GraduationCap, CheckCircle2, XCircle, ChevronRight, Save, UserPlus } from "lucide-react";

const STATUSES = [
  { id: 'berkas_masuk', label: 'Berkas Masuk' },
  { id: 'seleksi_berkas', label: 'Seleksi Berkas' },
  { id: 'ujian_tulis', label: 'Ujian Dasar' },
  { id: 'wawancara', label: 'Wawancara' },
  { id: 'lulus', label: 'Lulus' },
  { id: 'ditolak', label: 'Ditolak' }
];

export const ApplicantShow: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePortal = location.pathname.startsWith("/hrd") ? "/hrd" : "/recruitment";
  
  const { queryResult } = useShow({
    resource: "recruitment_applicants",
    id,
    meta: { select: "*, recruitment_vacancies(*)" }
  });

  const { mutate: updateApplicant } = useUpdate();
  const { mutateAsync: createEmployee } = useCreate();

  const applicant = queryResult?.data?.data;
  const isLoading = queryResult.isLoading;

  const [scoreDiniyah, setScoreDiniyah] = useState<string>("");
  const [scorePedagogik, setScorePedagogik] = useState<string>("");
  const [scoreWawancara, setScoreWawancara] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [rejectionNotes, setRejectionNotes] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);

  // Sync state when data loads
  React.useEffect(() => {
    if (applicant) {
      setScoreDiniyah(applicant.score_diniyah?.toString() || "");
      setScorePedagogik(applicant.score_pedagogik?.toString() || "");
      setScoreWawancara(applicant.score_wawancara?.toString() || "");
      setNotes(applicant.interviewer_notes || "");
      setRejectionNotes(applicant.rejection_notes || "");
    }
  }, [applicant]);

  if (isLoading || !applicant) {
    return <div className="p-12 text-center">Memuat detail pelamar...</div>;
  }

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'ditolak' && !rejectionNotes) {
      alert("Harap isi catatan penolakan terlebih dahulu sebelum menolak pelamar.");
      return;
    }
    
    updateApplicant({
      resource: "recruitment_applicants",
      id: id as string,
      values: { status: newStatus }
    });
  };

  const handleSaveScores = () => {
    updateApplicant({
      resource: "recruitment_applicants",
      id: id as string,
      values: {
        score_diniyah: scoreDiniyah ? parseInt(scoreDiniyah) : null,
        score_pedagogik: scorePedagogik ? parseInt(scorePedagogik) : null,
        score_wawancara: scoreWawancara ? parseInt(scoreWawancara) : null,
        interviewer_notes: notes,
        rejection_notes: rejectionNotes
      }
    });
    alert("Nilai dan catatan berhasil disimpan!");
  };

  const handleConvertToEmployee = async () => {
    if (!confirm("Apakah Anda yakin ingin menjadikan pelamar ini sebagai Pegawai? Data akan disalin ke Master Pegawai.")) return;
    
    setIsConverting(true);
    try {
      const result = await createEmployee({
        resource: "employees",
        values: {
          full_name: applicant.full_name,
          phone: applicant.phone,
          address: applicant.address,
          position: applicant.recruitment_vacancies?.position || 'guru',
          unit_id: applicant.recruitment_vacancies?.unit_id,
          status: 'active'
        }
      });
      
      const newEmployeeId = result.data.id;
      
      // Update applicant record
      updateApplicant({
        resource: "recruitment_applicants",
        id: id as string,
        values: { employee_id: newEmployeeId }
      }, {
        onSuccess: () => {
          alert("Berhasil! Pelamar kini telah menjadi Pegawai. Silakan lengkapi NIK dan detail lainnya di menu Master Data Pegawai.");
        }
      });
    } catch (error) {
      alert("Terjadi kesalahan saat mengkonversi data.");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detail & Proses Pelamar"
        description="Lakukan evaluasi, input nilai, dan ubah tahapan pelamar."
        action={
          <Link
            to={`${basePortal}/applicants`}
            className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Info Pelamar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex flex-col items-center text-center pb-6 border-b">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <User className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold">{applicant.full_name}</h2>
              <p className="text-sm text-muted-foreground mt-1">Melamar: <span className="font-semibold text-foreground">{applicant.recruitment_vacancies?.title}</span></p>
              
              {applicant.employee_id && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                  <CheckCircle2 className="w-4 h-4" /> Telah Diangkat Jadi Pegawai
                </div>
              )}
            </div>
            
            <div className="pt-6 space-y-4 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-4 h-4" /> <span className="text-foreground font-medium">{applicant.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-4 h-4" /> <span className="text-foreground font-medium">{applicant.email || '-'}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <GraduationCap className="w-4 h-4" /> <span className="text-foreground font-medium">{applicant.last_education || 'Belum diisi'}</span>
              </div>
            </div>
          </div>
          
          {/* Action Lulus / Konversi */}
          {applicant.status === 'lulus' && !applicant.employee_id && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <h3 className="font-bold text-emerald-800 mb-2">Pelamar Dinyatakan Lulus!</h3>
              <p className="text-xs text-emerald-600 mb-4">Anda dapat menyalin data pelamar ini langsung ke master data Pegawai.</p>
              <button 
                onClick={handleConvertToEmployee}
                disabled={isConverting}
                className="w-full bg-emerald-600 text-white flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                {isConverting ? "Memproses..." : <><UserPlus className="w-4 h-4" /> Jadikan Pegawai</>}
              </button>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Tracking & Penilaian */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tracking Status */}
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-6">Tahapan Seleksi</h3>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((status, index) => {
                const isActive = applicant.status === status.id;
                const isRejected = status.id === 'ditolak';
                
                return (
                  <button
                    key={status.id}
                    onClick={() => handleStatusChange(status.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-full transition-all ${
                      isActive && !isRejected ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 
                      isActive && isRejected ? 'bg-red-600 text-white border-red-600 shadow-sm' : 
                      'bg-background hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {status.label}
                    {index < STATUSES.length - 2 && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Penilaian */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="font-semibold text-lg">Input Nilai & Catatan Wawancara</h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Skor Dasar Diniyah (0-100)</label>
                  <input 
                    type="number" 
                    min="0" max="100"
                    value={scoreDiniyah}
                    onChange={(e) => setScoreDiniyah(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Skor Pedagogik (0-100)</label>
                  <input 
                    type="number" 
                    min="0" max="100"
                    value={scorePedagogik}
                    onChange={(e) => setScorePedagogik(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Skor Wawancara (0-100)</label>
                  <input 
                    type="number" 
                    min="0" max="100"
                    value={scoreWawancara}
                    onChange={(e) => setScoreWawancara(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Catatan Wawancara / Kelebihan</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Tulis ringkasan hasil wawancara, kelebihan kandidat, dll..."
                />
              </div>

              <div className="space-y-2 p-4 bg-red-50/50 rounded-lg border border-red-100">
                <label className="text-sm font-medium text-red-800 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Catatan Penolakan (Wajib jika status Ditolak)
                </label>
                <textarea 
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={2}
                  className="w-full border-red-200 focus:border-red-500 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500/50 resize-none bg-white"
                  placeholder="Alasan penolakan untuk evaluasi atau blacklist..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleSaveScores}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" /> Simpan Nilai & Catatan
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
