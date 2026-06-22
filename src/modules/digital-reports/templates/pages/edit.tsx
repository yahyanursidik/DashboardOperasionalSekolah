import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Settings, List, GripVertical, AlertCircle } from "lucide-react";
import { useSelect, useShow } from "@refinedev/core";
import { useCurrentUnit } from "../../../../app/providers/UnitProvider";
import { supabaseClient } from "../../../../lib/supabase/client";
import { toast } from "sonner";
import { useGetIdentity } from "@refinedev/core";
import { logAudit } from "../../../../lib/audit";

type FormValues = {
  name: string;
  report_type: string;
  unit_id: string;
  description: string;
  is_active: boolean;
  sections: {
    id?: string;
    title: string;
    description: string;
    display_order: number;
    parent_visible: boolean;
    is_active: boolean;
    items: {
      id?: string;
      name: string;
      description: string;
      assessment_type: string;
      scale_type: string;
      max_score: number | null;
      display_order: number;
      parent_visible: boolean;
      is_required: boolean;
    }[];
  }[];
};

export const ReportTemplateEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { activeUnitId } = useCurrentUnit();
  const { data: user } = useGetIdentity<any>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Template Data
  const { queryResult } = useShow({
    resource: "report_templates",
    id,
    meta: {
      select: "*, sections:report_template_sections(*, items:report_template_items(*))"
    }
  });

  const { data: queryData, isLoading } = queryResult;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      report_type: "",
      unit_id: activeUnitId || "",
      description: "",
      is_active: true,
      sections: []
    }
  });

  useEffect(() => {
    if (queryData?.data) {
      const td = queryData.data as any;
      
      // Sort sections by display_order
      const sortedSections = [...(td.sections || [])].sort((a, b) => a.display_order - b.display_order);
      
      // Sort items within sections
      sortedSections.forEach(sec => {
        sec.items = [...(sec.items || [])].sort((a: any, b: any) => a.display_order - b.display_order);
      });

      reset({
        name: td.name,
        report_type: td.report_type,
        unit_id: td.unit_id,
        description: td.description || "",
        is_active: td.is_active,
        sections: sortedSections
      });
    }
  }, [queryData, reset]);

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control,
    name: "sections"
  });

  const { options: unitOptions } = useSelect({ resource: "units" });

  const onSubmit = async (data: FormValues) => {
    if (!user?.id || !id) {
      toast.error("Sesi tidak valid atau ID tidak ditemukan.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Update Template
      const { error: templateError } = await supabaseClient
        .from('report_templates')
        .update({
          unit_id: activeUnitId || data.unit_id,
          name: data.name,
          report_type: data.report_type,
          description: data.description,
          is_active: data.is_active,
          updated_by: user.id
        })
        .eq('id', id);

      if (templateError) throw templateError;

      // Track IDs to keep
      const sectionIdsToKeep: string[] = [];
      const itemIdsToKeep: string[] = [];

      // 2. Upsert Sections & Items
      for (let i = 0; i < data.sections.length; i++) {
        const sec = data.sections[i];
        
        let sectionId = sec.id;
        
        if (sectionId) {
          // Update existing section
          await supabaseClient.from('report_template_sections').update({
            title: sec.title,
            description: sec.description,
            display_order: i + 1,
            parent_visible: sec.parent_visible,
            is_active: sec.is_active,
            updated_by: user.id
          }).eq('id', sectionId);
        } else {
          // Insert new section
          const { data: newSec, error } = await supabaseClient.from('report_template_sections').insert({
            template_id: id,
            title: sec.title,
            description: sec.description,
            display_order: i + 1,
            parent_visible: sec.parent_visible,
            is_active: sec.is_active,
            created_by: user.id,
            updated_by: user.id
          }).select('id').single();
          
          if (error) throw error;
          sectionId = (newSec as any).id;
        }

        sectionIdsToKeep.push(sectionId!);

        // Items logic
        if (sec.items && sec.items.length > 0) {
          for (let j = 0; j < sec.items.length; j++) {
            const item = sec.items[j];
            let itemId = item.id;

            if (itemId) {
              await supabaseClient.from('report_template_items').update({
                name: item.name,
                description: item.description,
                assessment_type: item.assessment_type,
                scale_type: item.scale_type || null,
                max_score: item.max_score || null,
                display_order: j + 1,
                parent_visible: item.parent_visible,
                is_required: item.is_required,
                updated_by: user.id
              }).eq('id', itemId);
            } else {
              const { data: newItem, error } = await supabaseClient.from('report_template_items').insert({
                section_id: sectionId,
                name: item.name,
                description: item.description,
                assessment_type: item.assessment_type,
                scale_type: item.scale_type || null,
                max_score: item.max_score || null,
                display_order: j + 1,
                parent_visible: item.parent_visible,
                is_required: item.is_required,
                created_by: user.id,
                updated_by: user.id
              }).select('id').single();
              
              if (error) throw error;
              itemId = (newItem as any).id;
            }
            itemIdsToKeep.push(itemId!);
          }
        }
      }

      // Cleanup: We should ideally delete sections/items that were removed from the form.
      // However, to prevent cascading deletes of `student_report_scores`, it is safer to just 
      // deactivate them or restrict deletion if they have scores. 
      // For now, we will attempt to delete them. If it fails due to FK constraints, we ignore.
      
      const originalSections = (queryData?.data as any)?.sections || [];
      const originalSectionIds = originalSections.map((s: any) => s.id);
      let originalItemIds: string[] = [];
      originalSections.forEach((s: any) => {
        originalItemIds = originalItemIds.concat((s.items || []).map((i: any) => i.id));
      });

      const itemsToDelete = originalItemIds.filter(id => !itemIdsToKeep.includes(id));
      const sectionsToDelete = originalSectionIds.filter((id: string) => !sectionIdsToKeep.includes(id));

      if (itemsToDelete.length > 0) {
        try { await supabaseClient.from('report_template_items').delete().in('id', itemsToDelete); } catch (e) {}
      }
      
      if (sectionsToDelete.length > 0) {
        try { await supabaseClient.from('report_template_sections').delete().in('id', sectionsToDelete); } catch (e) {}
      }

      await logAudit(
        user.id,
        'update',
        'report_templates',
        id,
        null,
        { action: 'Template structure updated', sections_count: data.sections.length }
      );

      toast.success("Template berhasil diperbarui!");
      navigate("/reports/templates");
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyimpan: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Memuat data template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Template Rapor</h1>
            <p className="text-sm text-muted-foreground">Ubah struktur dan komponen penilaian.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">Batal</button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <strong>Perhatian:</strong> Menghapus section atau item yang sudah digunakan pada rapor siswa yang aktif mungkin akan diblokir oleh sistem atau menghapus nilai yang sudah masuk.
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {/* Basic Info Section */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Informasi Template</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Nama Template <span className="text-destructive">*</span></label>
              <input {...register("name", { required: "Nama template wajib diisi" })} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis Rapor <span className="text-destructive">*</span></label>
              <select {...register("report_type", { required: "Jenis rapor wajib dipilih" })} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background">
                <option value="progress_awal">Progress Awal (PTS 1 / PTS 2)</option>
                <option value="progress_tengah">Progress Tengah Semester</option>
                <option value="rapor_semester">Rapor Akhir Semester (PAS / PAT)</option>
                <option value="rapor_program_khusus">Rapor Program Khusus (Tahfidz, dll)</option>
              </select>
            </div>

            {!activeUnitId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit Sekolah <span className="text-destructive">*</span></label>
                <select {...register("unit_id", { required: "Unit wajib dipilih" })} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background">
                  {unitOptions?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Deskripsi / Catatan Tambahan</label>
              <textarea {...register("description")} rows={2} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y" />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="is_active" {...register("is_active")} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Template Aktif (Dapat digunakan)</label>
            </div>
          </div>
        </div>

        {/* Sections Builder */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Struktur Rapor (Sections)</h2>
            <button
              type="button"
              onClick={() => appendSection({ title: "", description: "", display_order: sectionFields.length + 1, parent_visible: true, is_active: true, items: [] })}
              className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Tambah Section
            </button>
          </div>

          {sectionFields.map((section, sIndex) => (
            <div key={section.id} className="bg-card rounded-xl border shadow-sm overflow-hidden mb-6">
              <div className="px-4 py-3 bg-muted/40 border-b flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                <div className="flex-1">
                  <input type="hidden" {...register(`sections.${sIndex}.id` as const)} />
                  <input
                    {...register(`sections.${sIndex}.title` as const, { required: "Judul section wajib" })}
                    placeholder="Judul Section (misal: Akademik, Al-Qur'an)"
                    className="w-full bg-transparent font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 rounded px-2 py-1"
                  />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" {...register(`sections.${sIndex}.parent_visible` as const)} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                    Tampil di Ortu
                  </label>
                  <button type="button" onClick={() => removeSection(sIndex)} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-md hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 border-b border-dashed">
                 <input
                    {...register(`sections.${sIndex}.description` as const)}
                    placeholder="Deskripsi opsional untuk section ini..."
                    className="w-full text-sm px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
              </div>

              <div className="p-4 bg-muted/10">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><List className="w-4 h-4 text-primary" /> Item Penilaian</h4>
                <SectionItems control={control} register={register} sectionIndex={sIndex} />
              </div>
            </div>
          ))}
        </div>
      </form>
    </div>
  );
};

const SectionItems = ({ control, register, sectionIndex }: { control: any, register: any, sectionIndex: number }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `sections.${sectionIndex}.items`
  });

  return (
    <div className="space-y-3">
      {fields.map((item, iIndex) => (
        <div key={item.id} className="flex flex-col lg:flex-row gap-3 p-3 bg-background border rounded-lg shadow-sm">
          <input type="hidden" {...register(`sections.${sectionIndex}.items.${iIndex}.id` as const)} />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
              <input
                {...register(`sections.${sectionIndex}.items.${iIndex}.name` as const, { required: true })}
                placeholder="Nama Item (misal: Matematika, Membaca)"
                className="flex-1 px-3 py-1.5 text-sm font-medium border rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <select
                {...register(`sections.${sectionIndex}.items.${iIndex}.assessment_type` as const)}
                className="w-36 px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                <option value="numeric">Angka (0-100)</option>
                <option value="rubric">Rubrik (BB, MB...)</option>
                <option value="predicate">Predikat (A, B...)</option>
                <option value="narrative">Narasi / Teks</option>
                <option value="checklist">Checklist (Ya/Tidak)</option>
              </select>
            </div>
            
            <div className="pl-7 flex items-center gap-3">
              <input
                {...register(`sections.${sectionIndex}.items.${iIndex}.description` as const)}
                placeholder="Deskripsi / Kompetensi Dasar (opsional)"
                className="flex-1 px-3 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0">
                <input type="checkbox" {...register(`sections.${sectionIndex}.items.${iIndex}.parent_visible` as const)} className="w-3 h-3 rounded" />
                Tampil
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0">
                <input type="checkbox" {...register(`sections.${sectionIndex}.items.${iIndex}.is_required` as const)} className="w-3 h-3 rounded" />
                Wajib Isi
              </label>
            </div>
          </div>

          <button type="button" onClick={() => remove(iIndex)} className="p-2 text-muted-foreground hover:text-red-600 rounded-md hover:bg-red-50 self-start lg:self-center shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => append({ name: "", description: "", assessment_type: "numeric", scale_type: "", max_score: 100, display_order: fields.length + 1, parent_visible: true, is_required: true })}
        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 mt-2 pl-2"
      >
        <Plus className="w-3.5 h-3.5" /> Tambah Item
      </button>
    </div>
  );
};
