import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useWatch } from "react-hook-form";
import { useList, useOne } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, FileText, CalendarDays, BookOpen, LayoutList, Layers3, ClipboardCheck } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { CurriculumFormFields } from "./components/CurriculumFormFields";
import { getSdPhaseByGrade, getSdPhaseLabelByGrade } from "./sdCurriculumStructure";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import {
  normalizeSemesterPlans,
  type CurriculumSemesterName,
} from "../curriculum-utils";
import { getEnabledSubjectSemesters, saveCurriculumSemesterPlans } from "../semester-plan-persistence";

export const SubjectCurriculumEdit: React.FC = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("identitas");
  const [selectedSemester, setSelectedSemester] = useState<CurriculumSemesterName>("Ganjil");
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { activeSemesterId } = useAcademicYear();

  const { data: academicYears } = useList({
    resource: "academic_years",
    pagination: { mode: "off" }
  });

  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
    refineCore: { queryResult },
  } = useForm<any>({
    refineCoreProps: {
      resource: "subject_curriculums",
      id,
      redirect: false,
    },
  });

  const selectedGrade = useWatch({ control, name: "grade_level" });
  const selectedAcademicYearId = useWatch({ control, name: "academic_year_id" });
  const selectedPhase = getSdPhaseByGrade(Number(selectedGrade));
  const phaseLabel = getSdPhaseLabelByGrade(Number(selectedGrade));

  const currData = queryResult?.data?.data;
  const subjectId = currData?.subject_id;

  const { data: subjectData } = useOne({
    resource: "subjects",
    id: subjectId || "",
    queryOptions: { enabled: !!subjectId }
  });
  const subject = subjectData?.data;
  const enabledSemesters = useMemo(() => getEnabledSubjectSemesters(subject), [subject]);
  const { data: semesterPlansData } = useList({
    resource: "subject_curriculum_semesters",
    filters: [{ field: "subject_curriculum_id", operator: "eq", value: id || "" }],
    pagination: { pageSize: 10 },
    queryOptions: { enabled: Boolean(id) },
  });
  const { data: activeSemesterData } = useOne({
    resource: "semesters",
    id: activeSemesterId || "",
    queryOptions: { enabled: Boolean(activeSemesterId) },
  });
  const selectedAcademicYearName = academicYears?.data?.find((year: any) => String(year.id) === String(selectedAcademicYearId))?.name;
  const contextTitle = selectedGrade
    ? `Edit Kurikulum ${subject?.name || "Mapel"} Kelas ${selectedGrade}`
    : `Edit Kurikulum ${subject?.name || "Mapel"}`;

  useEffect(() => {
    if (!currData) return;
    setValue("semester_plans", normalizeSemesterPlans(semesterPlansData?.data || [], currData), { shouldDirty: false });
  }, [currData, semesterPlansData?.data, setValue]);

  useEffect(() => {
    const activeName = activeSemesterData?.data?.name as CurriculumSemesterName | undefined;
    if (activeName && enabledSemesters.includes(activeName)) {
      setSelectedSemester(activeName);
    } else if (!enabledSemesters.includes(selectedSemester)) {
      setSelectedSemester(enabledSemesters[0] || "Ganjil");
    }
  }, [activeSemesterData?.data?.name, enabledSemesters, selectedSemester]);

  const handleSave = async (data: any) => {
    if (!id || !currData) return;
    const semesterPlans = data.semester_plans || normalizeSemesterPlans(semesterPlansData?.data || [], currData);
    const academicYearId = data.academic_year_id || currData.academic_year_id;
    const gradeLevel = data.grade_level || currData.grade_level;
    setIsSaving(true);
    try {
      const { error } = await supabaseClient
        .from("subject_curriculums")
        .update({
          grade_level: gradeLevel,
          academic_year_id: academicYearId,
          cp_text: data.cp_text || null,
          atp_text: data.atp_text || null,
          kktp_text: data.kktp_text || null,
          prota_data: Array.isArray(data.prota_data) ? data.prota_data : [],
        })
        .eq("id", id);
      if (error) throw error;
      await saveCurriculumSemesterPlans({
        subjectCurriculumId: id,
        academicYearId,
        plans: semesterPlans,
        enabledSemesters,
      });
      toast.success("Kurikulum tahunan dan rencana semester berhasil diperbarui");
      navigate(`/curriculum/subjects?grade_level=${gradeLevel}`);
    } catch (error: any) {
      toast.error("Gagal menyimpan perubahan", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (queryResult?.isLoading) return <div className="p-8 text-muted-foreground">Memuat...</div>;

  const tabs = [
    { id: "identitas", label: "CP & ATP Fase", icon: FileText },
    { id: "prota", label: "Prota Kelas", icon: LayoutList },
    { id: "promes", label: "Promes Kelas", icon: CalendarDays },
    { id: "assessment", label: "Asesmen & Rapor", icon: ClipboardCheck },
    { id: "rppm", label: "RPPM", icon: Layers3 },
    { id: "rpph", label: "RPPH / Modul", icon: BookOpen },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={contextTitle}
          description="Perbarui dokumen kurikulum untuk satu mata pelajaran pada satu kelas dan satu tahun ajaran."
        />
      </div>

      <form onSubmit={handleSubmit(handleSave)} className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
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

        <div className={activeTab === "identitas" ? "space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Identitas Kurikulum Mapel</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Kelas Kurikulum <span className="text-destructive">*</span></label>
                    <select
                      {...register("grade_level", { required: "Jenjang Kelas wajib diisi", valueAsNumber: true })}
                      disabled
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {[1, 2, 3, 4, 5, 6].filter(g => !subjectData?.data?.grade_levels || subjectData.data.grade_levels.map(Number).includes(g)).map(g => <option key={g} value={g}>Kelas {g}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">Identitas kelas dikunci untuk menjaga histori dan relasi rencana semester.</p>
                    {errors.grade_level && <span className="text-xs text-destructive mt-1">{errors.grade_level.message as string}</span>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Tahun Ajaran <span className="text-destructive">*</span></label>
                    <select
                      {...register("academic_year_id", { required: "Tahun Ajaran wajib diisi" })}
                      disabled
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">-- Pilih Tahun Ajaran --</option>
                      {academicYears?.data?.map((ay: any) => (
                        <option key={ay.id} value={ay.id}>{ay.name}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">Tahun ajaran dikunci agar histori Ganjil dan Genap tidak berpindah periode.</p>
                    {errors.academic_year_id && <span className="text-xs text-destructive mt-1">{errors.academic_year_id.message as string}</span>}
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
                    placeholder="Masukkan CP untuk satu fase..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Alur Tujuan Pembelajaran (ATP) {selectedPhase ? selectedPhase.label : ""}</label>
                  <textarea
                    {...register("atp_text")}
                    rows={8}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                    placeholder="Susun ATP satu fase secara berurutan..."
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

        {activeTab !== "identitas" && activeTab !== "prota" ? (
          <section className="rounded-md border bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold">Rencana pelaksanaan semester</p>
                <p className="text-xs text-muted-foreground">Pilih semester untuk mengelola Promes, RPPM, RPPH/Modul Ajar, dan alokasi JP.</p>
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
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Menyimpan..." : "Simpan Kurikulum Mapel"}
          </button>
        </div>
      </form>
    </div>
  );
};
