import React, { useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSelect, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, Send, MessageSquare, Target } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(3, "Judul pengumuman wajib diisi"),
  content: z.string().min(10, "Isi pengumuman terlalu pendek"),
  target_type: z.enum(["all", "unit", "class", "staff", "parents"]),
  unit_id: z.string().optional().nullable(),
  class_id: z.string().optional().nullable(),
  publish_at: z.string().optional().nullable(),
  status: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FormProps {
  action: "create" | "edit";
}

export const AnnouncementForm: React.FC<FormProps> = ({ action }) => {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<any>();

  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    refineCoreProps: {
      action,
      resource: "announcements",
      redirect: "list",
    },
    defaultValues: {
      target_type: "all",
      status: "draft",
    }
  });

  const targetType = watch("target_type");
  const unitId = watch("unit_id");
  const [submitStatus, setSubmitStatus] = useState<string>("draft");

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });
  const { options: classOptions } = useSelect({ 
    resource: "classes", 
    optionLabel: "name", 
    optionValue: "id",
    filters: unitId ? [{ field: "unit_id", operator: "eq", value: unitId }] : [],
    queryOptions: { enabled: !!unitId }
  });

  // When action is create, we append created_by
  const onSubmit = (data: any) => {
    onFinish({
      ...data,
      status: submitStatus,
      ...(action === "create" ? { created_by: identity?.id } : {})
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Konten Pengumuman */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">1. Pesan Pengumuman</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Judul Pengumuman</label>
              <input
                {...register("title")}
                placeholder="Contoh: Pemberitahuan Libur Nasional"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background"
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Isi Pesan (Mendukung Markdown / Format Teks Panjang)</label>
              <textarea
                {...register("content")}
                rows={8}
                placeholder="Tuliskan detail pengumuman di sini..."
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none bg-background font-mono"
              ></textarea>
              {errors.content && <p className="text-xs text-destructive">{errors.content.message as string}</p>}
              <p className="text-xs text-muted-foreground mt-1">Gunakan Enter untuk memisahkan paragraf. Pesan ini akan dikirim via Portal, dan secara opsional diteruskan ke WhatsApp.</p>
            </div>
          </div>
        </div>

        {/* Target Audiens */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-lg">2. Target Audiens & Jadwal</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Penerima Pengumuman</label>
              <select
                {...register("target_type")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                onChange={(e) => {
                  register("target_type").onChange(e);
                  setValue("unit_id", null);
                  setValue("class_id", null);
                }}
              >
                <option value="all">Semua Entitas (Siswa, Orang Tua, Staf)</option>
                <option value="parents">Hanya Orang Tua</option>
                <option value="staff">Hanya Guru & Pegawai</option>
                <option value="unit">Spesifik Unit Pendidikan</option>
                <option value="class">Spesifik Kelas / Rombel</option>
              </select>
            </div>

            {(targetType === 'unit' || targetType === 'class') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Unit</label>
                <select
                  {...register("unit_id")}
                  required
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                >
                  <option value="">-- Pilih Unit --</option>
                  {unitOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {targetType === 'class' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Kelas</label>
                <select
                  {...register("class_id")}
                  required
                  disabled={!unitId}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background disabled:opacity-50"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-2 md:col-span-2 pt-4 border-t">
              <label className="text-sm font-medium">Jadwal Publikasi (Opsional)</label>
              <input
                type="datetime-local"
                {...register("publish_at")}
                className="w-full md:w-1/2 border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">Jika dikosongkan, pengumuman akan langsung terkirim setelah di-Approve.</p>
            </div>
            
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/announcements")}
            className="flex items-center gap-2 px-6 py-2.5 border rounded-md hover:bg-muted transition-colors text-sm font-medium mr-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Batal
          </button>
          
          <button
            type="submit"
            disabled={formLoading}
            onClick={() => setSubmitStatus("draft")}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 border px-6 py-2.5 rounded-md hover:bg-slate-200 transition-colors shadow-sm font-medium text-sm disabled:opacity-70"
          >
            <Save className="w-4 h-4" />
            Simpan Draft
          </button>

          <button
            type="submit"
            disabled={formLoading}
            onClick={() => setSubmitStatus("menunggu_approval")}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-70"
          >
            <Send className="w-4 h-4" />
            Ajukan Approval
          </button>
        </div>
      </form>
    </div>
  );
};
