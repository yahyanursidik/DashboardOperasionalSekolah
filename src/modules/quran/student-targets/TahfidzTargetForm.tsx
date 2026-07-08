import React, { useEffect, useState } from "react";
import { useForm, useSelect, useList } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, BookOpen } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

const QURAN_SURAHS = [
  "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa'", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Taubah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra'", "Al-Kahf", "Maryam", "Ta-Ha", "Al-Anbiya'", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Asy-Syu'ara'", "An-Naml", "Al-Qasas", "Al-'Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba'", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Asy-Syura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jasiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Az-Zariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hasyr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Tagabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddassir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba'", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Insyiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Gasyiyah", "Al-Fajr", "Al-Balad", "Asy-Syams", "Al-Lail", "Ad-Duha", "Asy-Syarh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat", "Al-Qari'ah", "At-Takasur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraisy", "Al-Ma'un", "Al-Kausar", "Al-Kafirun", "An-Nasr", "Al-Lahab", "Al-Ikhlas", "Al-Falaq", "An-Nas"
];

export const TahfidzTargetForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "tahfidz_student_targets",
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

  const [selectedHalaqoh, setSelectedHalaqoh] = useState<string>("");

  // Fetch available halaqohs
  const { data: halaqohsData, isLoading: isLoadingHalaqohs } = useList({
    resource: "tahfidz_halaqohs",
    pagination: { mode: "off" }
  });
  const halaqohs = halaqohsData?.data || [];

  // Fetch members of the selected halaqoh
  const { data: membersData, isLoading: isLoadingStudents } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: [{ field: "halaqoh_id", operator: "eq", value: selectedHalaqoh }],
    queryOptions: { enabled: !!selectedHalaqoh },
    meta: { select: "*, students(id, full_name, classes(name, units(name)))" },
    pagination: { mode: "off" }
  });

  const members = membersData?.data || [];

  const [selectedSurahs, setSelectedSurahs] = useState<string[]>([]);
  const [surahSearch, setSurahSearch] = useState("");

  const toggleSurah = (surah: string) => {
    let newSelected;
    if (selectedSurahs.includes(surah)) {
      newSelected = selectedSurahs.filter(s => s !== surah);
    } else {
      newSelected = [...selectedSurahs, surah];
    }
    
    setSelectedSurahs(newSelected);
    
    if (newSelected.length > 0) {
      if (newSelected.length === 1) {
        setDescription(`Hafalan Surah ${newSelected[0]}`);
      } else {
        setDescription(`Hafalan Surah ${newSelected[0]} - ${newSelected[newSelected.length - 1]}`);
      }
    } else {
      setDescription("");
    }
  };

  const filteredSurahs = QURAN_SURAHS.filter(s => s.toLowerCase().includes(surahSearch.toLowerCase()));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      student_id: formData.get("student_id"),
      target_type: targetType,
      description: description,
      target_amount: parseInt(formData.get("target_amount") as string),
      amount_unit: formData.get("amount_unit"),
      status: formData.get("status") || "in_progress",
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
    };

    onFinish(data);
  };

  // handleSurahSelect is removed because we use custom toggle

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/tahfidz-student-targets")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Target Personal" : "Tambah Target Personal"}
          description="Atur target hafalan spesifik untuk siswa"
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Halaqoh / Kelompok Tahfidz</label>
            <select
              value={selectedHalaqoh}
              onChange={(e) => setSelectedHalaqoh(e.target.value)}
              disabled={isEdit}
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
            >
              <option value="">-- Pilih Halaqoh --</option>
              {halaqohs.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Siswa</label>
              <select
                name="student_id"
                required
                defaultValue={record?.student_id || ""}
                disabled={isEdit || !selectedHalaqoh}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {selectedHalaqoh ? "-- Pilih Siswa dari Halaqoh --" : "-- Pilih Halaqoh Terlebih Dahulu --"}
                </option>
                {members.map(member => {
                  const student = member.students;
                  if (!student) return null;
                  return (
                    <option key={student.id} value={student.id}>
                      {student.full_name} ({student.classes?.units?.name || "Tanpa Unit"} - {student.classes?.name || "Tanpa Kelas"})
                    </option>
                  );
                })}
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
            <div className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-sm font-semibold flex items-center gap-2 text-emerald-800">
                  <BookOpen className="w-4 h-4" />
                  Pilih Surah Target (Opsional)
                </label>
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Cari surah..."
                    value={surahSearch}
                    onChange={(e) => setSurahSearch(e.target.value)}
                    className="w-full h-8 px-3 rounded-md border-emerald-200 text-xs focus:ring-emerald-500/20"
                  />
                </div>
              </div>
              <p className="text-xs text-emerald-600 mb-2">
                Klik surah di bawah ini untuk memilih. Deskripsi akan otomatis terisi berdasarkan surah yang Anda pilih.
              </p>
              
              <div className="h-40 overflow-y-auto bg-white border border-emerald-100 rounded-lg p-3">
                <div className="flex flex-wrap gap-2">
                  {filteredSurahs.map((surah) => {
                    const index = QURAN_SURAHS.indexOf(surah) + 1;
                    const isSelected = selectedSurahs.includes(surah);
                    return (
                      <button
                        key={surah}
                        type="button"
                        onClick={() => toggleSurah(surah)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          isSelected 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {index}. {surah}
                      </button>
                    );
                  })}
                  {filteredSurahs.length === 0 && (
                    <p className="text-xs text-muted-foreground italic p-2">Surah tidak ditemukan</p>
                  )}
                </div>
              </div>
              
              {selectedSurahs.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-700">
                  <span className="font-medium">Terpilih ({selectedSurahs.length}):</span> 
                  <span className="truncate">{selectedSurahs.join(", ")}</span>
                </div>
              )}
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
              placeholder="Contoh: Lanjut Hafalan Juz 29"
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
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
                defaultValue={record?.amount_unit || "juz"}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="juz">Juz</option>
                <option value="surah">Surah</option>
                <option value="halaman">Halaman</option>
                <option value="ayat">Ayat</option>
                <option value="jilid">Jilid</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                required
                defaultValue={record?.status || "in_progress"}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="in_progress">Proses (In Progress)</option>
                <option value="completed">Tercapai (Completed)</option>
                <option value="failed">Gagal (Failed)</option>
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
