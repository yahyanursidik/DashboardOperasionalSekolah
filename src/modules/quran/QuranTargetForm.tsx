import React, { useEffect, useState } from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, BookOpen } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

const QURAN_SURAHS = [
  "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa'", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Taubah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra'", "Al-Kahf", "Maryam", "Ta-Ha", "Al-Anbiya'", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Asy-Syu'ara'", "An-Naml", "Al-Qasas", "Al-'Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba'", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Asy-Syura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jasiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Az-Zariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hasyr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Tagabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddassir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba'", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Insyiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Gasyiyah", "Al-Fajr", "Al-Balad", "Asy-Syams", "Al-Lail", "Ad-Duha", "Asy-Syarh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah", "At-Takasur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraisy", "Al-Ma'un", "Al-Kausar", "Al-Kafirun", "An-Nasr", "Al-Lahab", "Al-Ikhlas", "Al-Falaq", "An-Nas"
];

export const QuranTargetForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "quran_targets",
    action: isEdit ? "edit" : "create",
    id,
  });

  const record = queryResult?.data?.data;

  const [targetType, setTargetType] = useState<string>("tahfidz");
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    if (record) {
      setTargetType(record.target_type);
      setDescription(record.description);
    }
  }, [record]);

  const { options: classOptions } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

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
    <div className="space-y-6 max-w-2xl mx-auto">
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
          description="Atur target hafalan atau bacaan untuk satu semester"
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kelas</label>
              <select
                name="class_id"
                required
                defaultValue={record?.class_id || ""}
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
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Satuan Target</label>
              <select
                name="amount_unit"
                required
                defaultValue={record?.amount_unit || "halaman"}
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

        </div>
        <div className="p-6 bg-muted/50 border-t flex justify-end">
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
