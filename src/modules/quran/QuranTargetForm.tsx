import React, { useEffect, useState } from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Award, BookOpen, CheckCircle2, ClipboardCheck, Save, ShieldCheck, Target, Users } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

const QURAN_SURAHS = [
  "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa'", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Taubah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra'", "Al-Kahf", "Maryam", "Ta-Ha", "Al-Anbiya'", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Asy-Syu'ara'", "An-Naml", "Al-Qasas", "Al-'Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba'", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Asy-Syura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jasiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Az-Zariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hasyr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Tagabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddassir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba'", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Insyiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Gasyiyah", "Al-Fajr", "Al-Balad", "Asy-Syams", "Al-Lail", "Ad-Duha", "Asy-Syarh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah", "At-Takasur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraisy", "Al-Ma'un", "Al-Kausar", "Al-Kafirun", "An-Nasr", "Al-Lahab", "Al-Ikhlas", "Al-Falaq", "An-Nas"
];

export const QuranTargetForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "quran_targets",
    action: isEdit ? "edit" : "create",
    id,
  });

  const record = queryResult?.data?.data;

  const [targetType, setTargetType] = useState<string>("tahfidz");
  const [description, setDescription] = useState<string>("");
  const [formPreview, setFormPreview] = useState({
    class_id: record?.class_id || searchParams.get("class_id") || "",
    target_amount: record?.target_amount || 1,
    amount_unit: record?.amount_unit || "halaman",
  });

  useEffect(() => {
    if (record) {
      setTargetType(record.target_type);
      setDescription(record.description);
      setFormPreview({
        class_id: record.class_id || "",
        target_amount: record.target_amount || 1,
        amount_unit: record.amount_unit || "halaman",
      });
    }
  }, [record]);

  const { options: classOptions } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });
  const selectedClass = classOptions?.find((option) => option.value === formPreview.class_id);
  const checklist = [
    { label: "Kelas terpilih", done: Boolean(formPreview.class_id), helper: selectedClass?.label || "Pilih kelas target" },
    { label: "Tipe program", done: Boolean(targetType), helper: targetType === "tahfidz" ? "Tahfidz hafalan" : "Tahsin bacaan" },
    { label: "Deskripsi jelas", done: Boolean(description), helper: "Contoh: Hafalan Surah Al-Mulk atau Tahsin jilid 4" },
    { label: "Jumlah terukur", done: Number(formPreview.target_amount || 0) > 0, helper: `${formPreview.target_amount || 0} ${formPreview.amount_unit}` },
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      class_id: formData.get("class_id"),
      target_type: targetType,
      description: description,
      target_amount: parseInt(formData.get("target_amount") as string),
      amount_unit: formData.get("amount_unit"),
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
    };

    onFinish(data);
  };

  const handleSurahSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    if (selected.length > 0) {
      // Auto-format description if multiple are selected, or single
      if (selected.length === 1) {
        setDescription(`Hafalan Surah ${selected[0]}`);
      } else {
        setDescription(`Hafalan Surah ${selected[0]} - ${selected[selected.length - 1]}`);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/quran-targets")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Target Al-Qur'an" : "Tambah Target Al-Qur'an"}
          description="Atur target Qur'an kelas yang spesifik, terukur, dan bisa dipantau dari mutaba'ah semester."
        />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Target kelas bermutu
            </div>
            <h2 className="mt-3 text-xl font-bold">
              {isEdit ? "Perbarui target kelas tanpa memutus monitoring" : "Buat standar capaian Qur'an untuk kelas"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Target kelas adalah standar umum. Gunakan target personal untuk siswa yang butuh diferensiasi atau pengayaan.
            </p>
          </div>
          <div className="grid gap-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-lg border bg-background p-3">
                <CheckCircle2 className={`mt-0.5 h-4 w-4 ${item.done ? "text-emerald-600" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.helper}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <form key={record?.id || "create-quran-target"} onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kelas</label>
              <select
                name="class_id"
                required
                defaultValue={record?.class_id || searchParams.get("class_id") || ""}
                onChange={(event) => setFormPreview((prev) => ({ ...prev, class_id: event.target.value }))}
                disabled={isEdit}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Pilih Kelas --</option>
                {classOptions?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipe Target</label>
              <select
                name="target_type"
                required
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="tahfidz">Tahfidz (Hafalan)</option>
                <option value="tahsin">Tahsin (Bacaan)</option>
              </select>
            </div>
          </div>

          {targetType === "tahfidz" && (
            <div className="space-y-2 bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
              <label className="text-sm font-medium flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <BookOpen className="w-4 h-4" />
                Pilih Surah (Opsional)
              </label>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">Pilih satu atau lebih surat untuk otomatis mengisi deskripsi target (tahan Ctrl/Cmd untuk memilih lebih dari satu).</p>
              <select 
                multiple
                onChange={handleSurahSelect}
                className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {QURAN_SURAHS.map((surah, i) => (
                  <option key={i} value={surah}>{i + 1}. {surah}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Deskripsi Target</label>
            <input
              type="text"
              name="description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Hafalan Juz 30 (An-Naba' - Al-Lail)"
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jumlah Target</label>
              <input
                type="number"
                name="target_amount"
                required
                min="1"
                defaultValue={record?.target_amount || 1}
                onChange={(event) => setFormPreview((prev) => ({ ...prev, target_amount: Number(event.target.value) }))}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Satuan Target</label>
              <select
                name="amount_unit"
                required
                defaultValue={record?.amount_unit || "halaman"}
                onChange={(event) => setFormPreview((prev) => ({ ...prev, amount_unit: event.target.value }))}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="juz">Juz</option>
                <option value="surah">Surah</option>
                <option value="halaman">Halaman</option>
                <option value="ayat">Ayat</option>
                <option value="jilid">Jilid</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <h3 className="font-semibold text-base">Alur setelah target tersimpan</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                { icon: ClipboardCheck, label: "Mutaba'ah", detail: "Setoran kelas menjadi bukti progres" },
                { icon: Target, label: "Target personal", detail: "Buat diferensiasi bila dibutuhkan" },
                { icon: Award, label: "Evaluasi", detail: "Bandingkan target dengan kelancaran" },
                { icon: Users, label: "Komunikasi", detail: "Wali kelas dan orang tua punya acuan" },
              ].map(({ icon: Icon, label, detail }) => (
                <div key={label} className="rounded-lg border bg-background p-4">
                  <Icon className="mb-2 h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
        <div className="p-6 bg-muted/50 border-t flex justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(formPreview.class_id ? `/quran-targets?class_id=${formPreview.class_id}` : "/quran-targets")}
            className="flex items-center gap-2 rounded-lg border bg-background px-5 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            Batal
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Target"}
          </button>
        </div>
      </form>
    </div>
  );
};
