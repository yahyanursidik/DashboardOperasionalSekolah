import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import { useList } from "@refinedev/core";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Layers3,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { PaudThemeFormFields } from "./components/PaudThemeFormFields";
import {
  FOUNDATION_ELEMENTS,
  PAUD_FOUNDATION_LEVEL,
  getFoundationTemplateValues,
  getModuleTemplateValues,
  getPaudLevelMeta,
} from "./paudCurriculumTemplates";

type WorkflowStep = {
  id: string;
  title: string;
  subtitle: string;
  done: boolean;
  meta: string;
  icon: React.ElementType;
};

const normalizeProtaRows = (rows: any[] = []) =>
  rows.map((row) => ({
    ...row,
    bulan: row.bulan || "",
    tema_topik: row.tema_topik || row.materi_pokok || row.materi || row.topik || "",
    subtema_topik: row.subtema_topik || "",
    alokasi_waktu: row.alokasi_waktu || row.alokasi || row.durasi || "",
    integrasi_khas: row.integrasi_khas || "",
    semester: row.semester || "Semester I (Gasal/Ganjil)",
  }));

const normalizeProsemRows = (rows: any[] = []) =>
  rows.map((row, index) => ({
    ...row,
    minggu: row.minggu || row.minggu_ke || index + 1,
    semester: row.semester || "Semester I (Gasal/Ganjil)",
    bulan: row.bulan || "",
    topik_subtopik: row.topik_subtopik || row.materi_pokok || row.topik || "",
    modul_ajar: row.modul_ajar || row.modul || "",
  }));

export const PaudThemeEdit: React.FC = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("atp");

  const { data: academicYears } = useList({
    resource: "academic_years",
    pagination: { mode: "off" },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
    refineCore: { onFinish, formLoading, queryResult },
  } = useForm<any>({
    refineCoreProps: {
      resource: "paud_curriculums",
      id,
      redirect: "list",
      successNotification: (_data: any, values: any) => {
        const isInduk = values.grade_level === PAUD_FOUNDATION_LEVEL;
        toast.success(isInduk ? "Dokumen Induk Fase Fondasi berhasil diperbarui!" : "Modul Ajar PAUD berhasil diperbarui!");
        return false as any;
      },
      errorNotification: (error: any) => {
        toast.error("Gagal menyimpan perubahan: " + error?.message);
        return false as any;
      },
    },
  });

  const selectedGradeLevel = useWatch({ control, name: "grade_level" });
  const atpText = useWatch({ control, name: "atp_text" });
  const protaData = useWatch({ control, name: "prota_data" });
  const prosemData = useWatch({ control, name: "prosem_data" });
  const rppmData = useWatch({ control, name: "rppm_data" });
  const rpphData = useWatch({ control, name: "rpph_data" });

  const isFaseFondasi = selectedGradeLevel === PAUD_FOUNDATION_LEVEL;
  const selectedLevelMeta = getPaudLevelMeta(Number(selectedGradeLevel));

  useEffect(() => {
    const record = queryResult?.data?.data;
    if (!record) return;

    reset({
      ...record,
      grade_level: Number(record.grade_level),
      academic_year_id: record.academic_year_id || "",
      atp_text: record.atp_text || "",
      prota_data: Array.isArray(record.prota_data) ? normalizeProtaRows(record.prota_data) : [],
      prosem_data: {
        semester: record.prosem_data?.semester || "Ganjil",
        rows: Array.isArray(record.prosem_data?.rows) ? normalizeProsemRows(record.prosem_data.rows) : [],
      },
      rppm_data: Array.isArray(record.rppm_data) ? record.rppm_data : [],
      rpph_data: Array.isArray(record.rpph_data) ? record.rpph_data : [],
    });
    setActiveTab(Number(record.grade_level) === PAUD_FOUNDATION_LEVEL ? "atp" : "rppm");
  }, [queryResult?.data?.data?.id, reset]);

  const workflowSteps = useMemo<WorkflowStep[]>(() => {
    if (isFaseFondasi) {
      return [
        {
          id: "atp",
          title: "ATP",
          subtitle: "Alur Tujuan Pembelajaran",
          icon: FileText,
          done: typeof atpText === "string" && atpText.trim().length > 20,
          meta: typeof atpText === "string" && atpText.trim().length > 20 ? "Terisi" : "Kosong",
        },
        {
          id: "prota",
          title: "Prota",
          subtitle: "Program Tahunan",
          icon: ClipboardList,
          done: Array.isArray(protaData) && protaData.length > 0,
          meta: `${Array.isArray(protaData) ? protaData.length : 0} baris`,
        },
        {
          id: "prosem",
          title: "Prosem",
          subtitle: "Program Semester",
          icon: CalendarDays,
          done: Array.isArray(prosemData?.rows) && prosemData.rows.length > 0,
          meta: `${Array.isArray(prosemData?.rows) ? prosemData.rows.length : 0} baris`,
        },
      ];
    }

    return [
      {
        id: "rppm",
        title: "RPPM",
        subtitle: "Rencana Mingguan",
        icon: Layers3,
        done: Array.isArray(rppmData) && rppmData.length > 0,
        meta: `${Array.isArray(rppmData) ? rppmData.length : 0} minggu`,
      },
      {
        id: "rpph",
        title: "RPPH / Modul Ajar",
        subtitle: "Rencana Harian",
        icon: CalendarDays,
        done: Array.isArray(rpphData) && rpphData.length > 0,
        meta: `${Array.isArray(rpphData) ? rpphData.length : 0} hari`,
      },
    ];
  }, [atpText, isFaseFondasi, prosemData?.rows, protaData, rpphData, rppmData]);

  const activeIndex = Math.max(0, workflowSteps.findIndex((step) => step.id === activeTab));
  const activeStep = workflowSteps[activeIndex] || workflowSteps[0];
  const nextStep = workflowSteps[activeIndex + 1];
  const previousStep = workflowSteps[activeIndex - 1];
  const completedSteps = workflowSteps.filter((step) => step.done).length;
  const progressPercent = workflowSteps.length ? Math.round((completedSteps / workflowSteps.length) * 100) : 0;
  const atpCharacterCount = typeof atpText === "string" ? atpText.trim().length : 0;
  const atpWordCount = typeof atpText === "string" ? atpText.trim().split(/\s+/).filter(Boolean).length : 0;

  const applyTemplate = () => {
    if (isFaseFondasi) {
      const template = getFoundationTemplateValues();
      setValue("atp_text", template.atp_text, { shouldDirty: true });
      setValue("prota_data", template.prota_data, { shouldDirty: true });
      setValue("prosem_data", template.prosem_data, { shouldDirty: true });
      return;
    }

    const currentGrade = Number(getValues("grade_level"));
    const template = getModuleTemplateValues(currentGrade);
    setValue("rppm_data", template.rppm_data, { shouldDirty: true });
    setValue("rpph_data", template.rpph_data, { shouldDirty: true });
  };

  const importAtpFile = async (file: File) => {
    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text);
        setValue("atp_text", String(parsed.atp_text || parsed.text || text), { shouldDirty: true });
      } else {
        setValue("atp_text", text, { shouldDirty: true });
      }
      toast.success("ATP berhasil diimpor");
    } catch (error: any) {
      toast.error("Gagal impor ATP: " + error.message);
    }
  };

  if (queryResult?.isLoading) {
    return <div className="p-8 text-muted-foreground">Memuat...</div>;
  }

  return (
    <div className="max-w-7xl space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link to="/curriculum/paud" className="rounded-full p-2 transition-colors hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader
          title={isFaseFondasi ? "Edit Fase Fondasi PAUD" : `Edit Modul Ajar ${selectedLevelMeta.label}`}
          description={
            isFaseFondasi
              ? "Kerjakan berurutan: ATP, Prota, lalu Prosem untuk tahun ajaran ini."
              : "Kerjakan RPPM dan RPPH/Modul Ajar untuk tingkat yang dipilih."
          }
        />
      </div>

      <form onSubmit={handleSubmit(onFinish)} className="space-y-6">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${selectedLevelMeta.tone}`}>
                {selectedLevelMeta.label}
              </span>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {isFaseFondasi ? "Dokumen induk Fase Fondasi" : `Modul ajar ${selectedLevelMeta.name}`}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isFaseFondasi
                    ? "ATP menjadi arah besar, Prota memetakan satu tahun, Prosem membagi pelaksanaan per semester."
                    : "RPPM memetakan minggu belajar, RPPH/Modul Ajar merinci kegiatan harian."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                {...register("academic_year_id", { required: "Tahun Ajaran wajib diisi" })}
                className="min-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
              >
                <option value="">-- Pilih Tahun Ajaran --</option>
                {academicYears?.data?.map((ay: any) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyTemplate}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
              >
                <Sparkles className="h-4 w-4" /> Template
              </button>
            </div>
          </div>
          {errors.academic_year_id && <span className="mt-2 block text-xs text-destructive">{errors.academic_year_id.message as string}</span>}
          <input type="hidden" {...register("grade_level", { valueAsNumber: true })} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Progress dokumen</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-black text-foreground">{completedSteps}</span>
                <span className="pb-1 text-sm font-semibold text-muted-foreground">/ {workflowSteps.length} langkah</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <nav className="rounded-lg border bg-card p-2 shadow-sm">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === activeStep.id;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveTab(step.id)}
                    className={`mb-1 flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors last:mb-0 ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">
                        {index + 1}. {step.title}
                      </span>
                      <span className="block text-xs">{step.subtitle}</span>
                      <span className="mt-1 block text-[11px] font-semibold">{step.meta}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Langkah {activeIndex + 1} dari {workflowSteps.length}
                </p>
                <h3 className="text-xl font-bold text-foreground">{activeStep.title}</h3>
                <p className="text-sm text-muted-foreground">{activeStep.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                {previousStep && (
                  <button
                    type="button"
                    onClick={() => setActiveTab(previousStep.id)}
                    className="rounded-md border border-input px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Sebelumnya
                  </button>
                )}
                {nextStep && (
                  <button
                    type="button"
                    onClick={() => setActiveTab(nextStep.id)}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Lanjut <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {isFaseFondasi && activeTab === "atp" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-primary">Langkah pertama dokumen induk</p>
                      <h3 className="mt-1 text-xl font-black text-foreground">ATP Fase Fondasi sebagai arah besar pembelajaran</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        ATP menjadi rujukan Prota, Prosem, RPPM, dan RPPH. Pastikan arahnya cukup jelas untuk KB, TK A, dan TK B.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md border bg-background p-3">
                        <p className="text-xs font-bold uppercase text-muted-foreground">Status ATP</p>
                        <p className="mt-1 text-lg font-black text-foreground">{atpCharacterCount > 20 ? "Terisi" : "Kosong"}</p>
                      </div>
                      <div className="rounded-md border bg-background p-3">
                        <p className="text-xs font-bold uppercase text-muted-foreground">Estimasi</p>
                        <p className="mt-1 text-lg font-black text-foreground">{atpWordCount} kata</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {FOUNDATION_ELEMENTS.map((element, index) => (
                    <div key={element} className="rounded-lg border bg-background p-4">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-sm font-black text-primary">{index + 1}</span>
                      <p className="mt-3 text-sm font-bold text-foreground">{element}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Pastikan tujuan pembelajaran mengalir ke aktivitas bermain bermakna.</p>
                    </div>
                  ))}
                </div>

                <div data-color-mode="light" className="overflow-hidden rounded-lg border bg-card">
                  <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <label className="block text-sm font-bold text-foreground">Detail ATP Fase Fondasi</label>
                      <p className="text-xs text-muted-foreground">Gunakan template, impor dokumen, atau tulis langsung. Format Markdown didukung.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setValue("atp_text", getFoundationTemplateValues().atp_text, { shouldDirty: true });
                          toast.success("Template ATP berhasil diterapkan");
                        }}
                        className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/15"
                      >
                        <Sparkles className="h-4 w-4" /> Template ATP
                      </button>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/15">
                        <Upload className="h-4 w-4" /> Impor ATP
                        <input
                          type="file"
                          accept=".md,.txt,.json"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) importAtpFile(file);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      {nextStep && (
                        <button
                          type="button"
                          onClick={() => setActiveTab(nextStep.id)}
                          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          Lanjut Prota <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Controller
                    control={control}
                    name="atp_text"
                    defaultValue=""
                    render={({ field }) => (
                      <MDEditor
                        value={field.value || ""}
                        onChange={field.onChange}
                        height={620}
                        previewOptions={{
                          rehypePlugins: [[rehypeSanitize]],
                        }}
                        className="w-full border-0"
                      />
                    )}
                  />
                </div>
              </div>
            )}

            <PaudThemeFormFields register={register} control={control} setValue={setValue} errors={errors} activeTab={activeTab} />
          </section>
        </div>

        <div className="flex justify-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <Link
            to="/curriculum/paud"
            className="rounded-md border border-input px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {formLoading ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
};
