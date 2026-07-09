import React, { useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useWatch } from "react-hook-form";
import { useList, useOne } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, FileText, CalendarDays, BookOpen, LayoutList, Layers3 } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { CurriculumFormFields } from "./components/CurriculumFormFields";
import { getSdPhaseByGrade, getSdPhaseLabelByGrade } from "./sdCurriculumStructure";

export const SubjectCurriculumEdit: React.FC = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("identitas");
  const navigate = useNavigate();

  const { data: academicYears } = useList({
    resource: "academic_years",
    pagination: { mode: "off" }
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    refineCore: { onFinish, formLoading, queryResult },
  } = useForm({
    refineCoreProps: {
      resource: "subject_curriculums",
      id,
      redirect: false,
      onMutationSuccess: (data: any) => {
        toast.success("Perubahan kurikulum kelas berhasil disimpan");
        const gradeLevel = data?.data?.grade_level || queryResult?.data?.data?.grade_level;
        if (gradeLevel) {
          navigate(`/curriculum/subjects?grade_level=${gradeLevel}`);
        } else {
          navigate(-1);
        }
      },
      onMutationError: (error: any) => {
        toast.error("Gagal menyimpan perubahan: " + error?.message);
      }
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
  const selectedAcademicYearName = academicYears?.data?.find((year: any) => String(year.id) === String(selectedAcademicYearId))?.name;
  const contextTitle = selectedGrade
    ? `Edit Kurikulum ${subject?.name || "Mapel"} Kelas ${selectedGrade}`
    : `Edit Kurikulum ${subject?.name || "Mapel"}`;

  if (queryResult?.isLoading) return <div className="p-8 text-muted-foreground">Memuat...</div>;

  const tabs = [
    { id: "identitas", label: "CP & ATP Fase", icon: FileText },
    { id: "prota", label: "Prota Kelas", icon: LayoutList },
    { id: "promes", label: "Promes Kelas", icon: CalendarDays },
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

      <form onSubmit={handleSubmit(onFinish)} className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
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
            <p className="text-xs text-muted-foreground">CP/ATP fase, perangkat ajar kelas.</p>
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
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {[1, 2, 3, 4, 5, 6].filter(g => !subjectData?.data?.grade_levels || subjectData.data.grade_levels.includes(g)).map(g => <option key={g} value={g}>Kelas {g}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">Kurikulum ini hanya berlaku untuk mapel ini di kelas yang dipilih.</p>
                    {errors.grade_level && <span className="text-xs text-destructive mt-1">{errors.grade_level.message as string}</span>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Tahun Ajaran <span className="text-destructive">*</span></label>
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

        <CurriculumFormFields register={register} control={control} errors={errors} activeTab={activeTab} />

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
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Kurikulum Mapel"}
          </button>
        </div>
      </form>
    </div>
  );
};
