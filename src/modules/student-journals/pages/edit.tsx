import React, { useState, useEffect } from "react";
import { useUpdate, useOne, useSelect } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Save, BookOpen, User, Calendar, FileText, AlertTriangle, Eye, ShieldAlert, Award, Activity, Star } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "akademik", label: "Akademik (Perkembangan Belajar)", icon: BookOpen },
  { value: "karakter", label: "Karakter & Sikap", icon: Star },
  { value: "kendala", label: "Kendala / Kesulitan Belajar", icon: AlertTriangle },
  { value: "ekskul", label: "Ekstrakurikuler & Bakat", icon: Award },
  { value: "kesehatan", label: "Kesehatan / UKS", icon: Activity },
  { value: "kasus", label: "Kasus / Pelanggaran Disiplin", icon: ShieldAlert },
  { value: "anekdot", label: "Catatan Anekdot", icon: Eye },
  { value: "stppa", label: "Pencapaian STPPA (Khusus PAUD)", icon: Star },
];

const STPPA_DOMAINS = [
  { key: "NAM", label: "Nilai Agama & Moral" },
  { key: "FM", label: "Fisik Motorik" },
  { key: "KOG", label: "Kognitif" },
  { key: "BHS", label: "Bahasa" },
  { key: "SOSEM", label: "Sosial Emosional" },
  { key: "SN", label: "Seni" }
];

const STPPA_SCORES = [
  { value: "BB", label: "Belum Berkembang (BB)" },
  { value: "MB", label: "Mulai Berkembang (MB)" },
  { value: "BSH", label: "Berkembang Sesuai Harapan (BSH)" },
  { value: "BSB", label: "Berkembang Sangat Baik (BSB)" },
];

export const StudentJournalEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  
  const { data: journalData, isLoading } = useOne({
    resource: "student_journals",
    id: id as string,
    meta: { select: "*, students(full_name)" }
  });

  const { mutate: updateJournal, isLoading: isSaving } = useUpdate();

  const [studentId, setStudentId] = useState("");
  const [category, setCategory] = useState("akademik");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [dateRecorded, setDateRecorded] = useState("");
  const [visibility, setVisibility] = useState("internal");
  const [stppaMetrics, setStppaMetrics] = useState<Record<string, string>>({});
  const [isInit, setIsInit] = useState(false);

  useEffect(() => {
    if (journalData?.data && !isInit) {
      const data = journalData.data;
      setStudentId(data.student_id);
      setCategory(data.category);
      setTitle(data.title);
      setDescription(data.description);
      setActionTaken(data.action_taken || "");
      setDateRecorded(data.date_recorded);
      setVisibility(data.visibility);
      if (data.stppa_metrics) setStppaMetrics(data.stppa_metrics);
      setIsInit(true);
    }
  }, [journalData, isInit]);

  const { options: studentOptions } = useSelect({
    resource: "students",
    optionLabel: "full_name",
    optionValue: "id",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
  });

  const handleStppaChange = (domainKey: string, value: string) => {
    setStppaMetrics(prev => ({ ...prev, [domainKey]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return toast.error("Silakan pilih siswa!");

    updateJournal({
      resource: "student_journals",
      id: id as string,
      values: {
        student_id: studentId,
        category,
        title,
        description,
        action_taken: actionTaken || null,
        date_recorded: dateRecorded,
        visibility,
        stppa_metrics: category === 'stppa' ? stppaMetrics : null,
      },
      successNotification: () => ({ message: "Rekam jejak berhasil diperbarui", type: "success" })
    }, {
      onSuccess: () => navigate("/student-journals")
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Edit Jurnal & Rekam Jejak"
        description="Ubah dokumentasi kejadian atau evaluasi perkembangan siswa."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ROW 1: SISWA & TANGGAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-xl border shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Siswa Target *</label>
              <select
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                <option value="">-- Pilih Siswa --</option>
                {studentOptions?.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {journalData?.data?.students && (
                <p className="text-xs text-muted-foreground">Siswa saat ini: {journalData.data.students.full_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Tanggal Kejadian/Catatan *</label>
              <input
                type="date"
                required
                value={dateRecorded}
                onChange={(e) => setDateRecorded(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> Visibilitas *</label>
              <select
                required
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                <option value="internal">Internal (Hanya Guru & Sekolah)</option>
                <option value="parents">Publik (Bisa Dilihat Orang Tua)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ROW 2: KONTEN JURNAL */}
        <div className="bg-card p-6 rounded-xl border shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Kategori Jurnal *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border text-center transition-all ${
                      isSelected ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-semibold leading-tight">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Judul Catatan *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4"/> Deskripsi Lengkap *</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background min-h-[120px]"
            />
          </div>

          {category !== 'stppa' && category !== 'anekdot' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Tindakan/Follow-up (Opsional)</label>
              <textarea
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background min-h-[80px]"
              />
            </div>
          )}

          {/* STPPA SECTION */}
          {category === 'stppa' && (
            <div className="mt-8 border rounded-xl overflow-hidden bg-muted/20">
              <div className="bg-indigo-50 border-b p-4">
                <h4 className="font-semibold text-indigo-800 flex items-center gap-2">
                  <Star className="w-5 h-5 fill-indigo-600 text-indigo-600" /> Instrumen Evaluasi STPPA PAUD
                </h4>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {STPPA_DOMAINS.map(domain => (
                    <div key={domain.key} className="bg-card p-3 rounded border shadow-sm space-y-2">
                      <label className="text-sm font-semibold text-foreground block">{domain.label}</label>
                      <select
                        value={stppaMetrics[domain.key] || ""}
                        onChange={(e) => handleStppaChange(domain.key, e.target.value)}
                        className="w-full border rounded-md px-2 py-1.5 text-sm outline-none bg-background focus:border-indigo-400"
                      >
                        <option value="">-- Belum Dinilai --</option>
                        {STPPA_SCORES.map(score => (
                          <option key={score.value} value={score.value}>{score.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/student-journals")}
            className="flex items-center gap-2 px-6 py-2.5 border rounded-md hover:bg-muted transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Batal
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-70"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
};
