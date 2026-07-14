import React, { useMemo, useState } from "react";
import { useCreate, useShow, useUpdate } from "@refinedev/core";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Mail,
  Phone,
  Save,
  User,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  calculateAverageScore,
  formatPosition,
  formatRecruitmentStatus,
  getApplicantNextAction,
  getApplicantQuality,
  getRecruitmentStatusConfig,
  recruitmentStatuses,
} from "../recruitment-utils";

export const ApplicantShow: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePortal = location.pathname.startsWith("/hrd") ? "/hrd" : "/recruitment";

  const { queryResult } = useShow({
    resource: "recruitment_applicants",
    id,
    meta: { select: "*, recruitment_vacancies(*)" },
  });

  const { mutate: updateApplicant, isLoading: isUpdating } = useUpdate();
  const { mutateAsync: createEmployee } = useCreate();

  const applicant = queryResult?.data?.data;
  const isLoading = queryResult.isLoading;

  const [scoreDiniyah, setScoreDiniyah] = useState<string>("");
  const [scorePedagogik, setScorePedagogik] = useState<string>("");
  const [scoreWawancara, setScoreWawancara] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [rejectionNotes, setRejectionNotes] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);

  React.useEffect(() => {
    if (!applicant) return;
    setScoreDiniyah(applicant.score_diniyah?.toString() || "");
    setScorePedagogik(applicant.score_pedagogik?.toString() || "");
    setScoreWawancara(applicant.score_wawancara?.toString() || "");
    setNotes(applicant.interviewer_notes || "");
    setRejectionNotes(applicant.rejection_notes || "");
  }, [applicant]);

  const parsedScores = useMemo(
    () => ({
      score_diniyah: scoreDiniyah ? Number(scoreDiniyah) : null,
      score_pedagogik: scorePedagogik ? Number(scorePedagogik) : null,
      score_wawancara: scoreWawancara ? Number(scoreWawancara) : null,
    }),
    [scoreDiniyah, scorePedagogik, scoreWawancara]
  );

  if (isLoading || !applicant) {
    return <div className="p-12 text-center">Memuat detail pelamar...</div>;
  }

  const averageScore = calculateAverageScore({ ...applicant, ...parsedScores });
  const quality = getApplicantQuality({ ...applicant, ...parsedScores });
  const statusConfig = getRecruitmentStatusConfig(applicant.status);
  const checklist = [
    { label: "Kontak kandidat lengkap", done: !!applicant.phone && !!applicant.email },
    { label: "Pendidikan dan alamat tercatat", done: !!applicant.last_education && !!applicant.address },
    { label: "Nilai seleksi telah diinput", done: averageScore !== null },
    { label: "Catatan wawancara tersedia", done: notes.trim().length >= 10 },
    { label: applicant.status === "ditolak" ? "Alasan penolakan tersedia" : "Keputusan seleksi siap ditindaklanjuti", done: applicant.status !== "ditolak" || rejectionNotes.trim().length >= 10 },
  ];

  const validateScore = (score: number | null) => score === null || (score >= 0 && score <= 100);

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "ditolak" && rejectionNotes.trim().length < 10) {
      toast.error("Isi catatan penolakan minimal 10 karakter sebelum menolak pelamar");
      return;
    }
    if (newStatus === "lulus" && averageScore !== null && averageScore < 70 && !confirm("Rata-rata skor di bawah 70. Tetap nyatakan lulus?")) return;

    updateApplicant({
      resource: "recruitment_applicants",
      id: id as string,
      values: {
        status: newStatus,
        rejection_notes: rejectionNotes.trim() || null,
      },
      successNotification: () => ({ message: `Tahapan pelamar diperbarui ke ${formatRecruitmentStatus(newStatus)}`, type: "success" }),
    });
  };

  const handleSaveScores = () => {
    if (!validateScore(parsedScores.score_diniyah) || !validateScore(parsedScores.score_pedagogik) || !validateScore(parsedScores.score_wawancara)) {
      toast.error("Skor harus berada pada rentang 0 sampai 100");
      return;
    }

    updateApplicant({
      resource: "recruitment_applicants",
      id: id as string,
      values: {
        ...parsedScores,
        interviewer_notes: notes.trim() || null,
        rejection_notes: rejectionNotes.trim() || null,
      },
      successNotification: () => ({ message: "Nilai dan catatan berhasil disimpan", type: "success" }),
    });
  };

  const handleConvertToEmployee = async () => {
    if (applicant.status !== "lulus") {
      toast.error("Pelamar harus berstatus lulus sebelum dikonversi menjadi pegawai");
      return;
    }
    if (applicant.employee_id) {
      toast.info("Pelamar ini sudah terhubung ke data pegawai");
      return;
    }
    if (!confirm("Jadikan pelamar ini sebagai pegawai aktif? Data dasar akan disalin ke master pegawai.")) return;

    setIsConverting(true);
    try {
      const result = await createEmployee({
        resource: "employees",
        values: {
          full_name: applicant.full_name,
          phone: applicant.phone,
          address: applicant.address,
          position: applicant.recruitment_vacancies?.position || "guru",
          unit_id: applicant.recruitment_vacancies?.unit_id,
          status: "active",
        },
      });

      const newEmployeeId = result.data.id;

      updateApplicant(
        {
          resource: "recruitment_applicants",
          id: id as string,
          values: { employee_id: newEmployeeId },
        },
        {
          onSuccess: () => {
            toast.success("Pelamar berhasil dikonversi menjadi pegawai");
            navigate(`/employees/show/${newEmployeeId}`);
          },
        }
      );
    } catch (error: any) {
      toast.error(error?.message || "Terjadi kesalahan saat mengonversi data");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detail & Proses Pelamar"
        description="Evaluasi berkas, input nilai, ubah tahapan, dan lakukan penempatan pegawai."
        action={
          <Link to={`${basePortal}/applicants`} className="flex items-center gap-2 bg-card text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
        }
      />

      <div className={`border rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-3 ${statusConfig.className}`}>
        <span>Status saat ini: <strong>{formatRecruitmentStatus(applicant.status)}</strong></span>
        <span>{getApplicantNextAction(applicant)}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_320px] gap-6">
        <div className="space-y-6">
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <div className="flex flex-col items-center text-center pb-6 border-b">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
                <User className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold">{applicant.full_name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{applicant.recruitment_vacancies?.title || "Lowongan tidak ditemukan"}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatPosition(applicant.recruitment_vacancies?.position)}</p>
              {applicant.employee_id && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                  <CheckCircle2 className="w-4 h-4" /> Telah Jadi Pegawai
                </div>
              )}
            </div>

            <div className="pt-6 space-y-4 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-4 h-4" /> <span className="text-foreground font-medium">{applicant.phone || "-"}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-4 h-4" /> <span className="text-foreground font-medium">{applicant.email || "-"}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <GraduationCap className="w-4 h-4" /> <span className="text-foreground font-medium">{applicant.last_education || "Belum diisi"}</span>
              </div>
            </div>
          </div>

          {applicant.status === "lulus" && !applicant.employee_id && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
              <h3 className="font-bold text-emerald-800 mb-2">Siap Diangkat Jadi Pegawai</h3>
              <p className="text-xs text-emerald-700 mb-4">Data dasar akan disalin ke master pegawai. Lengkapi NIK, dokumen, dan penugasan setelah konversi.</p>
              <button
                onClick={handleConvertToEmployee}
                disabled={isConverting}
                className="w-full bg-emerald-600 text-white flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-70"
              >
                {isConverting ? "Memproses..." : <><UserPlus className="w-4 h-4" /> Jadikan Pegawai</>}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-5">Tahapan Seleksi</h3>
            <div className="flex flex-wrap gap-2">
              {recruitmentStatuses.map((status, index) => {
                const isActive = applicant.status === status.id;
                const isRejected = status.id === "ditolak";

                return (
                  <button
                    key={status.id}
                    onClick={() => handleStatusChange(status.id)}
                    disabled={isUpdating}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-full transition-all ${
                      isActive ? status.className : isRejected ? "bg-background hover:bg-red-50 text-red-700" : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {status.label}
                    {index < recruitmentStatuses.length - 2 && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="font-semibold text-lg">Nilai & Catatan Seleksi</h3>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Skor Diniyah", value: scoreDiniyah, setter: setScoreDiniyah },
                  { label: "Skor Pedagogik", value: scorePedagogik, setter: setScorePedagogik },
                  { label: "Skor Wawancara", value: scoreWawancara, setter: setScoreWawancara },
                ].map((field) => (
                  <div key={field.label} className="space-y-2">
                    <label className="text-sm font-medium">{field.label} (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={field.value}
                      onChange={(e) => field.setter(e.target.value)}
                      className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Catatan Wawancara / Kelebihan</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Tulis ringkasan hasil wawancara, kekuatan kandidat, komitmen adab, kesiapan mengajar, dan catatan risiko."
                />
              </div>

              <div className="space-y-2 p-4 bg-red-50/50 rounded-lg border border-red-100">
                <label className="text-sm font-medium text-red-800 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Catatan Penolakan
                </label>
                <textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={3}
                  className="w-full border-red-200 focus:border-red-500 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500/50 resize-none bg-white"
                  placeholder="Wajib diisi sebelum status ditolak."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={handleSaveScores} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm">
                  <Save className="w-4 h-4" /> Simpan Nilai & Catatan
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold">Definition of Done</p>
              <p className="text-xs text-muted-foreground">Kelengkapan sebelum keputusan akhir.</p>
            </div>
            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 ${item.done ? "text-green-600" : "text-muted-foreground"}`} />
                  <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" /> Ringkasan Seleksi
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Rata-rata Skor</p>
                <p className="text-2xl font-bold">{averageScore ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Kelengkapan Data</p>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={quality >= 80 ? "h-full bg-emerald-500" : quality >= 55 ? "h-full bg-amber-500" : "h-full bg-red-500"} style={{ width: `${quality}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{quality}% lengkap</p>
              </div>
              <Link to={`${basePortal}/cbt/results`} className="inline-flex text-sm border rounded-md px-3 py-2 hover:bg-muted">
                Lihat Hasil CBT
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
