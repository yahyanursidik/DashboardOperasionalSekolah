import React, { useState } from "react";
import { useCreate, useSelect, useGetIdentity } from "@refinedev/core";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Save, BookOpen, User, Calendar, FileText, AlertTriangle, Eye, ShieldAlert, Award, Activity, Star } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
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

export const StudentJournalCreate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const { mutate: createJournal, isLoading: isSaving } = useCreate();
  const { data: user } = useGetIdentity<any>();

  const [studentId, setStudentId] = useState(searchParams.get("student_id") || "");
  const [classIdFilter, setClassIdFilter] = useState(searchParams.get("class_id") || "");
  const [category, setCategory] = useState("akademik");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [dateRecorded, setDateRecorded] = useState(new Date().toISOString().split('T')[0]);
  const [visibility, setVisibility] = useState("internal");

  // STPPA State
  const [stppaMetrics, setStppaMetrics] = useState<Record<string, string>>({});

  const { options: classOptions } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : []
  });

  const { options: studentOptions, queryResult } = useSelect({
    resource: "students",
    optionLabel: "full_name",
    optionValue: "id",
    filters: [
      { field: "status", operator: "eq", value: "active" } as const,
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId } as const] : []),
      ...(classIdFilter ? [{ field: "class_id", operator: "eq", value: classIdFilter } as const] : []),
    ] as any[],
    queryOptions: {
      enabled: true // Always fetch, but better if filtered by class
    }
  });

  const handleStppaChange = (domainKey: string, value: string) => {
    setStppaMetrics(prev => ({ ...prev, [domainKey]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return toast.error("Silakan pilih siswa!");
    if (!activeYearId || !activeUnitId) return toast.error("Unit & Tahun Ajaran aktif belum diatur!");

    createJournal({
      resource: "student_journals",
      values: {
        student_id: studentId,
        employee_id: user?.employee_id || null, // Assuming user metadata has employee_id
        category,
        title,
        description,
        action_taken: actionTaken || null,
        date_recorded: dateRecorded,
        visibility,
        stppa_metrics: category === 'stppa' ? stppaMetrics : null,
        academic_year_id: activeYearId,
        unit_id: activeUnitId
      },
      successNotification: () => ({ message: "Rekam jejak berhasil disimpan", type: "success" })
    }, {
      onSuccess: () => navigate("/student-journals")
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Tulis Jurnal & Rekam Jejak"
        description="Dokumentasikan kejadian, milestone, atau evaluasi perkembangan siswa."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ROW 1: SISWA & TANGGAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-xl border shadow-sm">
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-lg text-foreground border-b pb-2 mb-4">Informasi Subjek</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">Filter Kelas (Opsional)</label>
                  <select
                    value={classIdFilter}
                    onChange={(e) => { setClassIdFilter(e.target.value); setStudentId(""); }}
                    className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-background hover:bg-muted/30"
                  >
                    <option value="">-- Semua Kelas --</option>
                    {classOptions?.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Siswa Target <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    disabled={queryResult?.isLoading}
                    className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-background hover:bg-muted/30 disabled:opacity-50"
                  >
                    <option value="">{queryResult?.isLoading ? "Memuat data siswa..." : "-- Pilih Siswa --"}</option>
                    {studentOptions?.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {studentId && (
                    <div className="mt-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-3 animate-in fade-in zoom-in-95">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-900 line-clamp-1">{studentOptions?.find(s => s.value.toString() === studentId)?.label}</p>
                        <p className="text-xs text-emerald-600">Siswa Terpilih</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-lg text-foreground border-b pb-2 mb-4">Pengaturan Jurnal</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Tanggal Kejadian/Catatan <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={dateRecorded}
                    onChange={(e) => setDateRecorded(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-background hover:bg-muted/30"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> Visibilitas Laporan <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-background hover:bg-muted/30"
                  >
                    <option value="internal">Internal (Hanya Guru & Yayasan)</option>
                    <option value="parents">Publik (Muncul di Aplikasi Wali Siswa/Orang Tua)</option>
                  </select>
                  <div className={`mt-2 p-3 rounded-lg flex items-start gap-3 border ${visibility === 'internal' ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-200'}`}>
                    <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${visibility === 'internal' ? 'text-slate-500' : 'text-blue-500'}`} />
                    <p className={`text-xs leading-relaxed ${visibility === 'internal' ? 'text-slate-600' : 'text-blue-700'}`}>
                      {visibility === 'internal' 
                        ? 'Catatan ini bersifat rahasia. Sangat cocok untuk rekam jejak internal sekolah seperti evaluasi psikologis atau kasus sensitif.' 
                        : 'Orang tua akan melihat catatan ini. Pastikan bahasa penulisan santun dan konstruktif (membangun).'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: KONTEN JURNAL */}
        <div className="bg-card p-6 rounded-xl border shadow-sm space-y-8">
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2 border-b pb-2">Kategori Jurnal <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${
                      isSelected ? 'bg-primary/5 border-primary text-primary shadow-sm scale-100' : 'border-transparent bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground scale-95 hover:scale-100'
                    }`}
                  >
                    <Icon className="w-7 h-7" />
                    <span className="text-xs font-semibold leading-tight">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2 border-b pb-2">Detail Catatan</label>
            <div className="space-y-5 pt-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Judul Catatan <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Menjuarai Lomba Menggambar, Kesulitan Membaca Suku Kata, dll."
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-background font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><FileText className="w-4 h-4"/> Deskripsi Lengkap <span className="text-red-500">*</span></label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ceritakan detail kejadian, observasi, atau perkembangan siswa..."
                  className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-background min-h-[120px] resize-y"
                />
              </div>

              {category !== 'stppa' && category !== 'anekdot' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Tindakan/Follow-up (Opsional)</label>
                  <textarea
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="Contoh: Sudah dikomunikasikan dengan orang tua melalui WA, atau Siswa telah diberikan nasihat."
                    className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-background min-h-[80px] resize-y"
                  />
                </div>
              )}
            </div>
          </div>

          {/* STPPA SECTION */}
          {category === 'stppa' && (
            <div className="mt-8 border-2 border-indigo-100 rounded-2xl overflow-hidden bg-indigo-50/30 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-indigo-600 p-5 text-white">
                <h4 className="font-bold text-lg flex items-center gap-2">
                  <Star className="w-6 h-6 fill-white text-white" /> Instrumen Evaluasi STPPA PAUD
                </h4>
                <p className="text-indigo-100 text-sm mt-1">Silakan pilih indikator tingkat pencapaian perkembangan anak (opsional per bidang).</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {STPPA_DOMAINS.map(domain => (
                    <div key={domain.key} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm space-y-2 hover:shadow-md transition-shadow">
                      <label className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        {domain.label}
                      </label>
                      <select
                        value={stppaMetrics[domain.key] || ""}
                        onChange={(e) => handleStppaChange(domain.key, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none bg-background focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-700"
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

        <div className="flex justify-end gap-3 pt-6 border-t mt-8">
          <button
            type="button"
            onClick={() => navigate("/student-journals")}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Batal & Kembali
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg font-bold text-sm disabled:opacity-70 active:scale-95"
          >
            <Save className="w-5 h-5" />
            {isSaving ? "Menyimpan Data..." : "Simpan Jurnal & Rekam Jejak"}
          </button>
        </div>
      </form>
    </div>
  );
};
