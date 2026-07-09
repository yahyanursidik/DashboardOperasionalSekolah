import React, { useState, useEffect } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import { useList } from "@refinedev/core";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, FileText, Layers3, Save, AlertCircle, Sparkles, Upload } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { PaudThemeFormFields } from "./components/PaudThemeFormFields";
import {
  PAUD_FOUNDATION_LEVEL,
  PAUD_LEVELS,
  FOUNDATION_ELEMENTS,
  getFoundationTemplateValues,
  getModuleTemplateValues,
  getPaudLevelMeta,
} from "./paudCurriculumTemplates";

export const PaudThemeCreate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeUnitId } = useCurrentUnit();
  const [activeTab, setActiveTab] = useState("atp");

  const { data: academicYears } = useList({
    resource: "academic_years",
    pagination: { mode: "off" }
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
    refineCore: { onFinish, formLoading },
  } = useForm<any>({
    defaultValues: {
      academic_year_id: searchParams.get("academic_year_id") || "",
      grade_level: PAUD_FOUNDATION_LEVEL,
      atp_text: "",
      prota_data: [],
      prosem_data: { semester: "Ganjil", rows: [] },
      rppm_data: [],
      rpph_data: [],
    },
    refineCoreProps: {
      resource: "paud_curriculums",
      redirect: "list",
      successNotification: (data: any, values: any, resource?: string) => {
        const isInduk = values.grade_level === -2;
        toast.success(isInduk ? "Dokumen Induk Fase Fondasi berhasil ditambahkan!" : "Modul Ajar PAUD berhasil ditambahkan!");
        return false as any; 
      },
      errorNotification: (error: any) => {
        toast.error("Gagal menyimpan dokumen: " + error?.message);
        return false as any;
      }
    },
  });

  const handleFormSubmit = (data: any) => {
    onFinish({
      ...data,
      unit_id: activeUnitId,
    });
  };

  const selectedAcademicYearId = useWatch({ control, name: "academic_year_id" });
  const selectedGradeLevel = useWatch({ control, name: "grade_level" });
  const atpText = useWatch({ control, name: "atp_text" }) || "";

  const applyFoundationTemplate = (force = false) => {
    const current = getValues();
    const shouldApply = force || !current.atp_text;
    if (!shouldApply) return;

    const template = getFoundationTemplateValues();
    setValue("grade_level", template.grade_level, { shouldDirty: true });
    setValue("atp_text", template.atp_text, { shouldDirty: true });
    setValue("prota_data", template.prota_data, { shouldDirty: true });
    setValue("prosem_data", template.prosem_data, { shouldDirty: true });
    setValue("rppm_data", [], { shouldDirty: true });
    setValue("rpph_data", [], { shouldDirty: true });
  };

  const applyModuleTemplate = (gradeLevel: number, force = false) => {
    const current = getValues();
    const hasRppm = Array.isArray(current.rppm_data) && current.rppm_data.length > 0;
    const hasRpph = Array.isArray(current.rpph_data) && current.rpph_data.length > 0;
    if (!force && (hasRppm || hasRpph)) return;

    const template = getModuleTemplateValues(gradeLevel);
    setValue("grade_level", template.grade_level, { shouldDirty: true });
    setValue("atp_text", "", { shouldDirty: true });
    setValue("prota_data", [], { shouldDirty: true });
    setValue("prosem_data", template.prosem_data, { shouldDirty: true });
    setValue("rppm_data", template.rppm_data, { shouldDirty: true });
    setValue("rpph_data", template.rpph_data, { shouldDirty: true });
  };

  const importAtpFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = file.name.toLowerCase().endsWith(".json") ? JSON.parse(text) : undefined;
      const value = parsed ? parsed.atp_text || parsed.text || text : text;
      setValue("atp_text", String(value), { shouldDirty: true });
      toast.success("ATP berhasil diimpor");
    } catch (error: any) {
      toast.error("Gagal impor ATP: " + error.message);
    }
  };

  // Pengecekan eksistensi Fase Fondasi
  const { data: existingFaseFondasiData, isLoading: isCheckingFaseFondasi } = useList({
    resource: "paud_curriculums",
    filters: [
      { field: "grade_level", operator: "eq", value: -2 },
      { field: "academic_year_id", operator: "eq", value: selectedAcademicYearId || "" },
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [])
    ] as any,
    queryOptions: {
      enabled: !!selectedAcademicYearId,
    }
  });

  const hasFaseFondasi = existingFaseFondasiData?.data && existingFaseFondasiData.data.length > 0;
  const isReadyToCheck = selectedAcademicYearId && !isCheckingFaseFondasi;

  // Efek Samping: Paksakan grade_level sesuai kondisi Fase Fondasi
  useEffect(() => {
    if (isReadyToCheck) {
      if (hasFaseFondasi) {
        if (selectedGradeLevel === PAUD_FOUNDATION_LEVEL) {
          applyModuleTemplate(0);
        }
        if (activeTab === "prota" || activeTab === "prosem" || activeTab === "atp") {
          setActiveTab("rppm");
        }
      } else {
        applyFoundationTemplate();
        if (activeTab === "rppm" || activeTab === "rpph") {
          setActiveTab("atp");
        }
      }
    }
  }, [hasFaseFondasi, isReadyToCheck, selectedGradeLevel, activeTab, setValue]);

  const selectedLevelMeta = getPaudLevelMeta(Number(selectedGradeLevel));
  const workflowSteps = !hasFaseFondasi
    ? [
        { id: "atp", title: "ATP", subtitle: "Alur Tujuan Pembelajaran", icon: FileText },
        { id: "prota", title: "Prota", subtitle: "Program Tahunan", icon: ClipboardList },
        { id: "prosem", title: "Prosem", subtitle: "Program Semester", icon: CalendarDays },
      ]
    : [
        { id: "rppm", title: "RPPM", subtitle: `Rencana mingguan ${selectedLevelMeta.label}`, icon: Layers3 },
        { id: "rpph", title: "RPPH / Modul Ajar", subtitle: `Rencana harian ${selectedLevelMeta.label}`, icon: CalendarDays },
      ];
  const activeIndex = Math.max(0, workflowSteps.findIndex((step) => step.id === activeTab));
  const nextStep = workflowSteps[activeIndex + 1];
  const previousStep = workflowSteps[activeIndex - 1];
  const atpCharacterCount = typeof atpText === "string" ? atpText.trim().length : 0;
  const atpWordCount = typeof atpText === "string" ? atpText.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      <div className="flex items-center gap-4">
        <Link to="/curriculum/paud" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader 
          title="Buat Dokumen Kurikulum PAUD"
          description="Alur pembuatan kurikulum PAUD bersifat sistematis. Pilih Tahun Ajaran untuk memulai langkah pertama."
        />
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        
        {/* LANGKAH 1: PILIH TAHUN AJARAN */}
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Langkah pertama</p>
              <h2 className="text-xl font-bold text-foreground">Pilih tahun ajaran</h2>
              <p className="text-sm text-muted-foreground">Sistem akan mengecek apakah Fase Fondasi untuk tahun ajaran ini sudah tersedia.</p>
            </div>
            <select
              {...register("academic_year_id", { required: "Tahun Ajaran wajib diisi" })}
              className="w-full rounded-md border border-input px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/50 md:w-[280px]"
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {academicYears?.data?.map((ay: any) => (
                <option key={ay.id} value={ay.id}>{ay.name}</option>
              ))}
            </select>
          </div>
          {errors.academic_year_id && <span className="text-xs text-destructive mt-2 block">{errors.academic_year_id.message as string}</span>}
        </div>

        {isCheckingFaseFondasi && (
          <div className="p-8 text-center text-muted-foreground animate-pulse border border-dashed rounded-xl">
            Mengecek status kurikulum untuk tahun ajaran ini...
          </div>
        )}

        {/* LANGKAH 2: FORM DINAMIS (TERKUNCI) */}
        {isReadyToCheck && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            
            {/* MESSAGE / WIZARD GUIDANCE */}
            {!hasFaseFondasi ? (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Fase Fondasi Belum Dibuat</h4>
                  <p className="text-sm mt-1">Sistem mendeteksi bahwa belum ada dokumen induk Fase Fondasi untuk tahun ajaran ini. Anda <strong>diwajibkan</strong> menyusun ATP, Program Tahunan, dan Program Semester terlebih dahulu sebelum bisa merancang RPPM/RPPH per kelas.</p>
                  <button
                    type="button"
                    onClick={() => applyFoundationTemplate(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Isi template Fase Fondasi
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Fase Fondasi Tersedia</h4>
                  <p className="text-sm mt-1">Dokumen Induk (ATP, Prota, Promes) untuk tahun ajaran ini sudah lengkap. Anda kini dapat fokus membuat <strong>Modul Ajar (RPPM & RPPH)</strong> khusus untuk masing-masing kelas (KB/TK A/TK B) yang merujuk pada dokumen induk tersebut.</p>
                  <button
                    type="button"
                    onClick={() => applyModuleTemplate(Number(selectedGradeLevel) || 0, true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Isi template {selectedLevelMeta.label}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-900">
                <p className="text-xs font-bold uppercase tracking-wide">Induk Fase</p>
                <p className="mt-1 text-sm font-semibold">ATP, Prota, Prosem</p>
              </div>
              {PAUD_LEVELS.map((level) => (
                <div key={level.value} className={`rounded-lg border p-3 ${level.tone}`}>
                  <p className="text-xs font-bold uppercase tracking-wide">{level.label}</p>
                  <p className="mt-1 text-sm font-semibold">{level.age}: RPPM & RPPH</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Alur pengisian</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {!hasFaseFondasi ? "Dokumen induk Fase Fondasi" : `Modul ajar ${selectedLevelMeta.label}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {!hasFaseFondasi ? "Isi berurutan dari ATP sampai Prosem." : "Pilih tingkat, lalu isi RPPM dan RPPH."}
                  </p>
                </div>

                {hasFaseFondasi && (
                  <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <label className="mb-1.5 block text-sm font-medium">Tingkat modul</label>
                    {(() => {
                      const gradeField = register("grade_level", { required: "Tipe/Kelompok wajib diisi", valueAsNumber: true });

                      return (
                        <select
                          {...gradeField}
                          onChange={(event) => {
                            gradeField.onChange(event);
                            applyModuleTemplate(Number(event.target.value), true);
                          }}
                          className="w-full rounded-md border border-input px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                        >
                          {PAUD_LEVELS.map((level) => (
                            <option key={level.value} value={level.value}>
                              {level.label} - {level.name}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                )}

                {!hasFaseFondasi && <input type="hidden" {...register("grade_level", { valueAsNumber: true })} value={PAUD_FOUNDATION_LEVEL} />}

                <nav className="rounded-lg border bg-card p-2 shadow-sm">
                  {workflowSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = activeTab === step.id;

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
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-bold">{index + 1}. {step.title}</span>
                          <span className="block text-xs">{step.subtitle}</span>
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
                    <h3 className="text-xl font-bold text-foreground">{workflowSteps[activeIndex]?.title}</h3>
                    <p className="text-sm text-muted-foreground">{workflowSteps[activeIndex]?.subtitle}</p>
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

                {(!hasFaseFondasi && activeTab === "atp") && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-primary">Langkah pertama dokumen induk</p>
                          <h3 className="mt-1 text-xl font-black text-foreground">ATP Fase Fondasi sebagai arah besar pembelajaran</h3>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            Isi ATP terlebih dahulu agar Prota, Prosem, RPPM, dan RPPH punya rujukan yang sama untuk KB, TK A, dan TK B.
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
              <Link to="/curriculum/paud" className="px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-muted transition-colors text-muted-foreground">
                Batal
              </Link>
              <button type="submit" disabled={formLoading} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm">
                <Save className="w-4 h-4" />
                {formLoading ? "Menyimpan..." : (hasFaseFondasi ? "Buat Modul Ajar" : "Simpan Fase Fondasi")}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
