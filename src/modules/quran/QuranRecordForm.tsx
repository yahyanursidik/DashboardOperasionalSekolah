import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSelect, useList } from "@refinedev/core";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Award, BookOpen, CheckCircle, FileText, ShieldCheck, Target, Users } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { PageHeader } from "../../components/layout/PageHeader";

const quranSchema = z.object({
  student_id: z.string().min(1, "Pilih siswa"),
  academic_year_id: z.string().min(1, "Tahun ajaran wajib diisi"),
  semester_id: z.string().min(1, "Semester wajib diisi"),
  record_type: z.enum(["tahsin", "tahfidz"]),
  date: z.string().min(1, "Tanggal wajib diisi"),
  surah_or_jilid: z.string().min(1, "Wajib diisi (Surah / Jilid)"),
  ayat_or_page: z.string().min(1, "Wajib diisi (Ayat / Halaman)"),
  fluency_score: z.enum(["Sangat Lancar", "Lancar", "Kurang Lancar", "Mengulang"]),
  tajwid_score: z.string().optional().nullable(),
  makhroj_score: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  class_id: z.string().optional().nullable(),
  halaqoh_id: z.string().optional().nullable(),
  subject_id: z.string().optional().nullable(),
});

type QuranFormValues = z.infer<typeof quranSchema>;

export const QuranRecordForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const initialStudentId = searchParams.get("student_id") || "";
  const initialClassId = searchParams.get("class_id") || "";
  const initialHalaqohId = searchParams.get("halaqoh_id") || "";

  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuranFormValues>({
    resolver: zodResolver(quranSchema) as any,
    refineCoreProps: {
      action: id ? "edit" : "create",
      resource: "quran_records",
      id,
      redirect: "list",
    },
    defaultValues: {
      academic_year_id: activeYearId || "",
      semester_id: activeSemesterId || "",
      record_type: "tahfidz",
      date: new Date().toISOString().split('T')[0],
      fluency_score: "Lancar",
      student_id: initialStudentId,
      class_id: initialClassId || null,
      halaqoh_id: initialHalaqohId || null,
      subject_id: null,
    }
  });

  const recordType = watch("record_type");
  const selectedStudentId = watch("student_id");
  const selectedSurahOrJilid = watch("surah_or_jilid");
  const selectedAyatOrPage = watch("ayat_or_page");
  const selectedFluency = watch("fluency_score");
  const selectedTajwid = watch("tajwid_score");
  const selectedMakhroj = watch("makhroj_score");
  const selectedDate = watch("date");
  const selectedSubjectId = watch("subject_id");

  const [inputMode, setInputMode] = useState<"kelas" | "halaqoh">(initialHalaqohId ? "halaqoh" : (initialClassId || initialStudentId ? "kelas" : "halaqoh"));
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedHalaqohId, setSelectedHalaqohId] = useState<string>(initialHalaqohId);

  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const { options: classOptions } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    filters: selectedUnitId ? [{ field: "unit_id", operator: "eq", value: selectedUnitId }] : [],
    queryOptions: { enabled: !!selectedUnitId },
    sorters: [{ field: "name", order: "asc" }],
  });

  const { options: halaqohOptions } = useSelect({
    resource: "tahfidz_halaqohs",
    optionLabel: "name",
    optionValue: "id",
    filters: [{ field: "program_type", operator: "eq", value: recordType }],
    sorters: [{ field: "name", order: "asc" }],
  });

  const { data: halaqohData } = useList({
    resource: "tahfidz_halaqohs",
    filters: [
      { field: "program_type", operator: "eq", value: recordType },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
    ],
    meta: { select: "id, name, subject_id, subjects(id, name, unit_id, quran_program_type, units(name))" },
    pagination: { mode: "off" },
  });
  const selectedHalaqoh = (halaqohData?.data || []).find((item: any) => item.id === selectedHalaqohId);

  const { data: subjectsData } = useList({
    resource: "subjects",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }],
    meta: { select: "id, name, unit_id, quran_program_type, units(name)" },
    pagination: { mode: "off" },
  });
  const compatibleSubjects = useMemo(() => (subjectsData?.data || []).filter((subject: any) => {
    const supportsProgram = subject.quran_program_type === recordType || subject.quran_program_type === "both";
    return supportsProgram && (!selectedUnitId || subject.unit_id === selectedUnitId);
  }), [recordType, selectedUnitId, subjectsData?.data]);

  useEffect(() => {
    if (inputMode === "halaqoh") {
      setValue("subject_id", selectedHalaqoh?.subject_id || null);
      return;
    }
    if (selectedSubjectId && !compatibleSubjects.some((subject: any) => subject.id === selectedSubjectId)) {
      setValue("subject_id", null);
    }
  }, [compatibleSubjects, inputMode, selectedHalaqoh?.subject_id, selectedSubjectId, setValue]);

  const { data: halaqohMembers, isLoading: loadingMembers } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: [{ field: "halaqoh_id", operator: "eq", value: selectedHalaqohId }],
    queryOptions: { enabled: !!selectedHalaqohId },
    meta: { select: "student_id, students(full_name)" },
    pagination: { mode: "off" }
  });

  const { data: studentTargetsData } = useList({
    resource: "tahfidz_student_targets",
    filters: [
      ...(selectedStudentId ? [{ field: "student_id", operator: "eq" as const, value: selectedStudentId }] : []),
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
      { field: "target_type", operator: "eq" as const, value: "tahfidz" },
    ],
    queryOptions: { enabled: !!selectedStudentId && recordType === "tahfidz" },
    pagination: { mode: "off" },
  });

  const { data: latestRecordsData } = useList({
    resource: "quran_records",
    filters: [
      ...(selectedStudentId ? [{ field: "student_id", operator: "eq" as const, value: selectedStudentId }] : []),
      { field: "record_type", operator: "eq" as const, value: recordType },
    ],
    sorters: [{ field: "date", order: "desc" }],
    queryOptions: { enabled: !!selectedStudentId },
    pagination: { pageSize: 3 },
  });

  const { options: studentOptions, queryResult: studentQuery } = useSelect({
    resource: "students",
    optionLabel: "full_name",
    optionValue: "id",
    filters: selectedClassId ? [
      { field: "class_id", operator: "eq", value: selectedClassId },
      { field: "status", operator: "eq", value: "active" }
    ] : [{ field: "status", operator: "eq", value: "active" }],
    queryOptions: { enabled: inputMode === "kelas" && (!!selectedClassId || !!initialStudentId) },
  });

  const handleModeChange = (mode: "kelas" | "halaqoh") => {
    setInputMode(mode);
    setValue("student_id", "");
    if (mode === "halaqoh") {
      setValue("class_id", null);
    } else {
      setValue("halaqoh_id", null);
      setValue("subject_id", null);
    }
  };

  const handleFinish = (values: QuranFormValues) => onFinish({
    ...values,
    subject_id: inputMode === "halaqoh" ? selectedHalaqoh?.subject_id || null : values.subject_id || null,
  });

  const activeTarget = studentTargetsData?.data?.[0];
  const latestRecord = latestRecordsData?.data?.[0];
  const checklist = [
    { label: "Siswa terpilih", done: Boolean(selectedStudentId), helper: "Setoran harus melekat ke siswa yang tepat" },
    { label: inputMode === "halaqoh" ? "Halaqoh terpilih" : "Kelas terpilih", done: inputMode === "halaqoh" ? Boolean(selectedHalaqohId) : Boolean(selectedClassId || initialClassId), helper: "Memudahkan rekap guru dan laporan" },
    { label: "Materi setoran", done: Boolean(selectedSurahOrJilid && selectedAyatOrPage), helper: selectedSurahOrJilid ? `${selectedSurahOrJilid} ${selectedAyatOrPage || ""}` : "Isi surah/juz dan ayat" },
    { label: "Kelancaran", done: Boolean(selectedFluency), helper: selectedFluency || "Pilih kualitas setoran" },
    { label: "Tajwid/makhraj", done: Boolean(selectedTajwid || selectedMakhroj), helper: "Disarankan agar tindak lanjut lebih jelas" },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Input Jurnal Setoran (Mutaba'ah)"
        description="Catat setoran hafalan atau bacaan tahsin siswa dengan data yang siap dipakai untuk target, laporan, dan evaluasi guru."
      />

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Setoran bermutu
            </div>
            <h2 className="mt-3 text-xl font-bold">Catat setoran yang bisa ditindaklanjuti</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Setoran yang baik mencatat siswa, kelompok, materi, kelancaran, dan catatan tajwid/makhraj sehingga guru bisa melihat progres sekaligus area perbaikan.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground">Target aktif</p>
                <p className="mt-1 text-sm font-bold">{activeTarget ? activeTarget.description : "Belum ada / belum dipilih"}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground">Setoran terakhir</p>
                <p className="mt-1 text-sm font-bold">{latestRecord ? `${latestRecord.surah_or_jilid || "-"} (${new Date(latestRecord.date).toLocaleDateString("id-ID")})` : "-"}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-lg border bg-background p-3">
                <CheckCircle className={`mt-0.5 h-4 w-4 ${item.done ? "text-emerald-600" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.helper}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit(handleFinish as any)} className="bg-card rounded-xl border shadow-sm overflow-hidden">
        
        {/* Tipe Penilaian */}
        <div className="p-6 border-b bg-muted/20">
          <label className="text-sm font-medium mb-3 block">Program <span className="text-destructive">*</span></label>
          <div className="flex gap-4">
            <label className={`flex-1 flex items-center justify-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
              recordType === 'tahfidz' ? 'bg-primary/10 border-primary text-primary' : 'bg-background hover:bg-muted'
            }`}>
              <input type="radio" value="tahfidz" {...register("record_type")} className="sr-only" />
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold">Tahfidz (Hafalan)</span>
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
              recordType === 'tahsin' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-background hover:bg-muted'
            }`}>
              <input type="radio" value="tahsin" {...register("record_type")} className="sr-only" />
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold">Tahsin (Bacaan)</span>
            </label>
          </div>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Pemilihan Sumber Siswa */}
          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">1. Pilih Siswa</h3>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="input_mode" checked={inputMode === "halaqoh"} onChange={() => handleModeChange("halaqoh")} />
                Berdasarkan Halaqoh
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="input_mode" checked={inputMode === "kelas"} onChange={() => handleModeChange("kelas")} />
                Berdasarkan Kelas
              </label>
            </div>

            {inputMode === "halaqoh" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Halaqoh</label>
                  <select
                    value={selectedHalaqohId}
                    onChange={(e) => {
                      setSelectedHalaqohId(e.target.value);
                      setValue("halaqoh_id", e.target.value);
                      const halaqoh = (halaqohData?.data || []).find((item: any) => item.id === e.target.value);
                      setValue("subject_id", halaqoh?.subject_id || null);
                    }}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                  >
                    <option value="">-- Pilih Halaqoh --</option>
                    {halaqohOptions?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Siswa <span className="text-destructive">*</span></label>
                  <select
                    {...register("student_id")}
                    disabled={loadingMembers}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background disabled:opacity-50"
                  >
                    <option value="">{selectedHalaqohId ? "-- Pilih Siswa --" : "-- Pilih Halaqoh Dulu --"}</option>
                    {halaqohMembers?.data?.map((m: any) => (
                      <option key={m.student_id} value={m.student_id}>{m.students?.full_name}</option>
                    ))}
                  </select>
                  {errors.student_id && <p className="text-xs text-destructive">{errors.student_id.message as string}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Mata Pelajaran</label>
                  <div className="rounded-md border bg-background px-3 py-2 text-sm">
                    {selectedHalaqoh?.subjects?.name || "Pilih halaqoh yang sudah dihubungkan ke mapel Tahfidz"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit</label>
                  <select
                    value={selectedUnitId}
                    onChange={(e) => {
                      setSelectedUnitId(e.target.value);
                      setSelectedClassId("");
                    }}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                  >
                    <option value="">-- Pilih Unit --</option>
                    {unitOptions?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kelas</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setValue("class_id", e.target.value);
                    }}
                    disabled={!selectedUnitId}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background disabled:opacity-50"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classOptions?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Siswa <span className="text-destructive">*</span></label>
                  <select
                    {...register("student_id")}
                    disabled={studentQuery.isLoading}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background disabled:opacity-50"
                  >
                    <option value="">{selectedClassId ? "-- Pilih Siswa --" : "-- Pilih Kelas Dulu --"}</option>
                    {studentOptions?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.student_id && <p className="text-xs text-destructive">{errors.student_id.message as string}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mata Pelajaran <span className="text-destructive">*</span></label>
                  <select
                    {...register("subject_id")}
                    required={inputMode === "kelas"}
                    disabled={!selectedUnitId}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background disabled:opacity-50"
                  >
                    <option value="">-- Pilih Mapel {recordType === "tahfidz" ? "Tahfidz" : "Tahsin"} --</option>
                    {compatibleSubjects.map((subject: any) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">2. Detail Setoran</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Setoran <span className="text-destructive">*</span></label>
                <input
                  type="date"
                  {...register("date")}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {recordType === 'tahfidz' ? 'Nama Surah / Juz' : 'Nama Jilid'} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  {...register("surah_or_jilid")}
                  placeholder={recordType === 'tahfidz' ? "Contoh: Al-Baqarah / Juz 30" : "Contoh: Umi Jilid 4"}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
                {errors.surah_or_jilid && <p className="text-xs text-destructive">{errors.surah_or_jilid.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {recordType === 'tahfidz' ? 'Ayat ke berapa?' : 'Halaman berapa?'} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  {...register("ayat_or_page")}
                  placeholder={recordType === 'tahfidz' ? "Contoh: Ayat 1-10" : "Contoh: Halaman 12-14"}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
                {errors.ayat_or_page && <p className="text-xs text-destructive">{errors.ayat_or_page.message as string}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">3. Penilaian Mutaba'ah</h3>
            
            {/* Fluency Score */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary">Tingkat Kelancaran Hafalan <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Sangat Lancar', 'Lancar', 'Kurang Lancar', 'Mengulang'].map((score) => {
                  const isSelected = watch("fluency_score") === score;
                  let colors = "bg-background hover:bg-muted";
                  if (isSelected) {
                    if (score === 'Sangat Lancar') colors = "bg-emerald-100 border-emerald-500 text-emerald-700";
                    else if (score === 'Lancar') colors = "bg-blue-100 border-blue-500 text-blue-700";
                    else if (score === 'Kurang Lancar') colors = "bg-amber-100 border-amber-500 text-amber-700";
                    else colors = "bg-red-100 border-red-500 text-red-700";
                  }

                  return (
                    <label key={score} className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all text-sm font-medium ${colors}`}>
                      <input type="radio" value={score} {...register("fluency_score")} className="sr-only" />
                      {score}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Skor Tajwid (Opsional)</label>
                <select
                  {...register("tajwid_score")}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none bg-background"
                >
                  <option value="">-- Pilih Nilai --</option>
                  <option value="A (Sangat Baik)">A (Sangat Baik)</option>
                  <option value="B (Baik)">B (Baik)</option>
                  <option value="C (Cukup)">C (Cukup)</option>
                  <option value="D (Kurang)">D (Kurang)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Skor Makharijul Huruf (Opsional)</label>
                <select
                  {...register("makhroj_score")}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none bg-background"
                >
                  <option value="">-- Pilih Nilai --</option>
                  <option value="A (Sangat Baik)">A (Sangat Baik)</option>
                  <option value="B (Baik)">B (Baik)</option>
                  <option value="C (Cukup)">C (Cukup)</option>
                  <option value="D (Kurang)">D (Kurang)</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan / Pesan Guru (Opsional)</label>
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Catatan spesifik tentang perbaikan bacaan, adab, dll..."
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none"
              ></textarea>
            </div>

          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <h3 className="font-semibold text-base">Dampak setelah setoran disimpan</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                { icon: Target, label: "Target personal", detail: "Progres target siswa bertambah" },
                { icon: FileText, label: "Laporan", detail: "Rekap tahfidz semester terisi" },
                { icon: Award, label: "Kesiapan ujian", detail: "Guru tahu kapan siswa siap tasmi" },
                { icon: Users, label: "Monitoring halaqoh", detail: "Muhaffizh melihat ritme setoran" },
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

        {/* Footer */}
        <div className="p-6 bg-muted/20 border-t flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(selectedHalaqohId ? `/quran?halaqoh_id=${selectedHalaqohId}` : "/quran")}
            className="flex items-center gap-2 px-6 py-2.5 border rounded-md hover:bg-muted transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Batal
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-70"
          >
            <CheckCircle className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Setoran"}
          </button>
        </div>
      </form>
    </div>
  );
};
