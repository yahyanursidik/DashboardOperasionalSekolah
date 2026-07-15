import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useWatch } from "react-hook-form";
import { useList, useOne } from "@refinedev/core";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Save, FileText, CalendarDays, BookOpen, LayoutList, Layers3, ClipboardCheck } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { CurriculumFormFields } from "./components/CurriculumFormFields";
import { getSdPhaseByGrade, getSdPhaseLabelByGrade } from "./sdCurriculumStructure";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { toast } from "sonner";
import {
  createEmptySemesterPlans,
  type CurriculumSemesterName,
} from "../curriculum-utils";
import { getEnabledSubjectSemesters, saveCurriculumSemesterPlans } from "../semester-plan-persistence";

export const SubjectCurriculumCreate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get("subject_id");
  const gradeLevelParam = searchParams.get("grade_level");
  const academicYearParam = searchParams.get("academic_year_id");
  const [activeTab, setActiveTab] = useState("identitas");
  const [selectedSemester, setSelectedSemester] = useState<CurriculumSemesterName>("Ganjil");
  const navigate = useNavigate();
  const { activeSemesterId } = useAcademicYear();

  const { data: subjectData } = useOne({
    resource: "subjects",
    id: subjectId || "",
    queryOptions: { enabled: !!subjectId }
  });

  const { data: academicYears } = useList({
    resource: "academic_years",
    pagination: { mode: "off" }
  });

  const {
    register,
    control,
    getValues,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    defaultValues: {
      grade_level: gradeLevelParam ? Number(gradeLevelParam) : undefined,
      academic_year_id: academicYearParam || undefined,
      prota_data: [],
      semester_plans: createEmptySemesterPlans(),
    }
  });

  const selectedGrade = useWatch({ control, name: "grade_level" });
  const selectedAcademicYearId = useWatch({ control, name: "academic_year_id" });
  const selectedPhase = getSdPhaseByGrade(Number(selectedGrade));
  const phaseLabel = getSdPhaseLabelByGrade(Number(selectedGrade));
  const subject = subjectData?.data;
  const enabledSemesters = useMemo(() => getEnabledSubjectSemesters(subject), [subject]);
  const { data: activeSemesterData } = useOne({
    resource: "semesters",
    id: activeSemesterId || "",
    queryOptions: { enabled: Boolean(activeSemesterId) },
  });
  const selectedAcademicYearName = academicYears?.data?.find((year: any) => String(year.id) === String(selectedAcademicYearId))?.name;
  const contextTitle = selectedGrade
    ? `Buat Kurikulum ${subject?.name || "Mapel"} Kelas ${selectedGrade}`
    : `Buat Kurikulum ${subject?.name || "Mapel"}`;

  const existingFilters = useMemo(() => {
    const filters: any[] = [{ field: "subject_id", operator: "eq", value: subjectId }];
    if (selectedAcademicYearId) filters.push({ field: "academic_year_id", operator: "eq", value: selectedAcademicYearId });
    return filters;
  }, [selectedAcademicYearId, subjectId]);
  const { data: existingData } = useList({
    resource: "subject_curriculums",
    filters: existingFilters,
    pagination: { pageSize: 20 },
    queryOptions: { enabled: Boolean(subjectId && selectedAcademicYearId) },
  });
  const existingRecord = existingData?.data?.find((record: any) => Number(record.grade_level) === Number(selectedGrade));
  const phaseSource = existingData?.data?.find((record: any) =>
    (selectedPhase?.grades as readonly number[] | undefined)?.includes(Number(record.grade_level)) && Boolean(record.cp_text || record.atp_text),
  );

  useEffect(() => {
    if (!phaseSource || existingRecord) return;
    if (!getValues("cp_text") && phaseSource.cp_text) setValue("cp_text", phaseSource.cp_text);
    if (!getValues("atp_text") && phaseSource.atp_text) setValue("atp_text", phaseSource.atp_text);
    if (!getValues("kktp_text") && phaseSource.kktp_text) setValue("kktp_text", phaseSource.kktp_text);
  }, [existingRecord, getValues, phaseSource, setValue]);

  useEffect(() => {
    const activeName = activeSemesterData?.data?.name as CurriculumSemesterName | undefined;
    if (activeName && enabledSemesters.includes(activeName)) {
      setSelectedSemester(activeName);
    } else if (!enabledSemesters.includes(selectedSemester)) {
      setSelectedSemester(enabledSemesters[0] || "Ganjil");
    }
  }, [activeSemesterData?.data?.name, enabledSemesters, selectedSemester]);

  const handleSave = async (data: any) => {
    if (existingRecord) return;
    const { semester_plans: semesterPlans, ...annualValues } = data;
    let createdId: string | null = null;
    try {
      const { data: created, error } = await supabaseClient
        .from("subject_curriculums")
        .insert({ ...annualValues, subject_id: subjectId })
        .select("id")
        .single();
      if (error) throw error;
      const createdRecord = created as any;
      createdId = createdRecord.id;
      await saveCurriculumSemesterPlans({
        subjectCurriculumId: createdRecord.id,
        academicYearId: data.academic_year_id,
        plans: semesterPlans,
        enabledSemesters,
      });
      toast.success("Kurikulum tahunan dan rencana semester berhasil disimpan");
      navigate(gradeLevelParam ? `/curriculum/subjects?grade_level=${gradeLevelParam}` : `/curriculum/subjects/show/${subjectId}`);
    } catch (error: any) {
      if (createdId) await supabaseClient.from("subject_curriculums").delete().eq("id", createdId);
      toast.error("Gagal menyimpan kurikulum", { description: error.message });
    }
  };

  const tabs = [
    { id: "identitas", label: "CP & ATP Fase", icon: FileText },
    { id: "prota", label: "Prota Kelas", icon: LayoutList },
    { id: "promes", label: "Promes Kelas", icon: CalendarDays },
    { id: "assessment", label: "Asesmen & Rapor", icon: ClipboardCheck },
    { id: "rppm", label: "RPPM", icon: Layers3 },
    { id: "rpph", label: "RPPH / Modul", icon: BookOpen },
  ];

  if (!subjectId) return <div className="p-8 text-rose-500">Mata pelajaran tidak valid.</div>;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={contextTitle}
          description="Isi dokumen kurikulum untuk satu mata pelajaran pada satu kelas dan satu tahun ajaran."
        />
      </div>

      <form
        onSubmit={handleSubmit(handleSave, () => setActiveTab("identitas"))}
        className="bg-card rounded-xl border shadow-sm p-6 space-y-6"
      >
        <section className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-4">
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mata Pelajaran</p>
            <p className="mt-1 font-bold">{subject?.name || "Memuat mapel..."}</p>
            <p className="text-xs text-muted-foreground">{subject?.code || "Tanpa kode"}</p>
          </div>
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kelas</p>
            <p className="mt-1 font-bold">{selectedGrade ? `Kelas ${selectedGrade}` : "Belum dipilih"}</p>
            <p className="text-xs text-muted-foreground">{phaseLabel}</p>
          </div>
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tahun Ajaran</p>
            <p className="mt-1 font-bold">{selectedAcademicYearName || "Belum dipilih"}</p>
            <p className="text-xs text-muted-foreground">Kurikulum disimpan per tahun ajaran.</p>
          </div>
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ruang Lingkup</p>
            <p className="mt-1 font-bold">Per Mapel per Kelas</p>
            <p className="text-xs text-muted-foreground">Fondasi tahunan dan pelaksanaan per semester.</p>
          </div>
        </section>

        {existingRecord ? (
          <div className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div><p className="font-semibold">Kurikulum untuk kombinasi ini sudah tersedia</p><p className="mt-0.5">Satu mapel, kelas, dan tahun ajaran hanya boleh memiliki satu dokumen. Buka dokumen yang ada untuk melanjutkan.</p></div>
            </div>
            <Link to={`/curriculum/subject-curriculums/edit/${existingRecord.id}`} className="shrink-0 rounded-md border border-amber-300 bg-background px-3 py-2 font-semibold hover:bg-amber-100">Buka Dokumen</Link>
          </div>
        ) : phaseSource ? (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            CP, ATP, dan KKTP diambil dari kelas lain dalam {selectedPhase?.label} agar arah fase tetap konsisten. Anda tetap dapat meninjaunya sebelum menyimpan.
          </div>
        ) : null}

        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="grid gap-3 md:grid-cols-5">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-h-16 items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                    activeTab === tab.id
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${activeTab === tab.id ? "bg-white/15" : "bg-primary/10 text-primary"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold opacity-80">Langkah {index + 1}</span>
                    <span className="block text-sm font-bold">{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab !== "identitas" && activeTab !== "prota" ? (
          <section className="rounded-md border bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold">Rencana pelaksanaan semester</p>
                <p className="text-xs text-muted-foreground">Promes, RPPM, RPPH/Modul Ajar, dan JP disimpan terpisah untuk Ganjil dan Genap.</p>
              </div>
              <div className="inline-flex rounded-md border bg-background p-1">
                {enabledSemesters.map((semester) => (
                  <button key={semester} type="button" onClick={() => setSelectedSemester(semester)} className={`rounded px-4 py-2 text-sm font-semibold ${selectedSemester === semester ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                    {semester}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <div className={activeTab === "identitas" ? "space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Identitas Kurikulum Mapel</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Kelas Kurikulum <span className="text-rose-500">*</span></label>
                    <select
                      {...register("grade_level", { required: "Jenjang Kelas wajib diisi", valueAsNumber: true })}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {[1, 2, 3, 4, 5, 6].filter(g => !subjectData?.data?.grade_levels || subjectData.data.grade_levels.map(Number).includes(g)).map(g => <option key={g} value={g}>Kelas {g}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">Kurikulum ini hanya berlaku untuk mapel ini di kelas yang dipilih.</p>
                    {errors.grade_level && <span className="text-xs text-rose-500 mt-1">{errors.grade_level.message as string}</span>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Tahun Ajaran <span className="text-rose-500">*</span></label>
                    <select
                      {...register("academic_year_id", { required: "Tahun Ajaran wajib diisi" })}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">-- Pilih Tahun Ajaran --</option>
                      {academicYears?.data?.map((ay: any) => (
                        <option key={ay.id} value={ay.id}>{ay.name}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">Satu mapel dan kelas hanya punya satu kurikulum per tahun ajaran.</p>
                    {errors.academic_year_id && <span className="text-xs text-rose-500 mt-1">{errors.academic_year_id.message as string}</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b pb-2">
                  <h3 className="text-lg font-semibold">CP dan ATP Satu Fase</h3>
                  <p className="text-sm text-muted-foreground">
                    {phaseLabel}. CP dan ATP menjadi acuan fase untuk mapel ini, sedangkan Prota, Promes, RPPM, dan RPPH diisi khusus untuk kelas {selectedGrade || "yang dipilih"}.
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Capaian Pembelajaran (CP) {selectedPhase ? selectedPhase.label : ""}
                  </label>
                  <textarea
                    {...register("cp_text")}
                    rows={7}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                    placeholder="Masukkan CP untuk satu fase, misalnya Fase A Bahasa Indonesia berlaku kelas 1-2..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Alur Tujuan Pembelajaran (ATP) {selectedPhase ? selectedPhase.label : ""}</label>
                  <textarea
                    {...register("atp_text")}
                    rows={8}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                    placeholder="Susun ATP satu fase secara berurutan dari awal sampai akhir fase..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">KKTP / Kriteria Ketercapaian</label>
                  <textarea
                    {...register("kktp_text")}
                    rows={4}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                    placeholder="Kriteria ketercapaian yang membantu guru membaca progres peserta didik..."
                  />
                </div>
              </div>
            </div>

            <aside className="rounded-xl border bg-muted/20 p-5">
              <p className="text-sm font-bold text-foreground">Syarat lengkap</p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg bg-background p-3">
                  <p className="font-semibold text-foreground">1. CP & ATP</p>
                  <p>Diisi sebagai acuan {phaseLabel.toLowerCase()} untuk mapel ini.</p>
                </div>
                <div className="rounded-lg bg-background p-3">
                  <p className="font-semibold text-foreground">2. Prota & Promes</p>
                  <p>Disusun khusus untuk kelas {selectedGrade || "yang dipilih"}.</p>
                </div>
                <div className="rounded-lg bg-background p-3">
                  <p className="font-semibold text-foreground">3. RPPM & RPPH</p>
                  <p>RPPM per pekan dan RPPH/modul ajar per pertemuan.</p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <CurriculumFormFields key={selectedSemester} register={register} control={control} errors={errors} activeTab={activeTab} selectedSemester={selectedSemester} />

        <div className="pt-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || Boolean(existingRecord)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Menyimpan..." : "Simpan Kurikulum Mapel"}
          </button>
        </div>
      </form>
    </div>
  );
};
