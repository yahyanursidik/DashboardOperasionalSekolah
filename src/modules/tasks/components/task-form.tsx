import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSelect } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, CheckSquare, Calendar, User, Building } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";

const taskSchema = z.object({
  title: z.string().min(1, "Judul tugas wajib diisi"),
  description: z.string().optional().nullable(),
  unit_id: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["belum_mulai", "diproses", "menunggu_pihak_lain", "selesai", "ditunda"]).default("belum_mulai"),
  due_date: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormProps {
  action: "create" | "edit";
}

export const TaskForm: React.FC<TaskFormProps> = ({ action }) => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();

  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema) as any,
    refineCoreProps: {
      action,
      resource: "admin_tasks",
      redirect: "list",
    },
    defaultValues: {
      unit_id: activeUnitId || "",
      priority: "medium",
      status: "belum_mulai",
    }
  });

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });
  const { options: profileOptions } = useSelect({ resource: "profiles", optionLabel: "full_name", optionValue: "id" });

  return (
    <div className="max-w-4xl space-y-6">
      <form onSubmit={handleSubmit(onFinish as any)} className="space-y-6">
        
        {/* SECTION 1: Informasi Tugas */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">1. Informasi Tugas</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Judul Tugas <span className="text-destructive">*</span></label>
              <input
                {...register("title")}
                placeholder="Contoh: Rekapitulasi Data SPP Bulan Ini"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi Tugas</label>
              <textarea
                {...register("description")}
                rows={4}
                placeholder="Jelaskan detail tugas yang harus diselesaikan..."
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* SECTION 2: Parameter Penugasan */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-lg">2. Parameter Penugasan</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Building className="w-4 h-4 text-muted-foreground"/> Terkait Unit</label>
              <select
                {...register("unit_id")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background"
              >
                <option value="">-- Umum / Semua Unit --</option>
                {unitOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground"/> Ditugaskan Kepada</label>
              <select
                {...register("assigned_to")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background"
              >
                <option value="">-- Tidak Ditugaskan --</option>
                {profileOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prioritas</label>
              <select
                {...register("priority")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background"
              >
                <option value="low">Rendah (Low)</option>
                <option value="medium">Menengah (Medium)</option>
                <option value="high">Tinggi (High)</option>
                <option value="urgent">Mendesak (Urgent!)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tenggat Waktu (Due Date)</label>
              <input
                type="date"
                {...register("due_date")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background"
              />
            </div>

            {action === "edit" && (
              <div className="space-y-2 md:col-span-2 pt-4 border-t">
                <label className="text-sm font-medium">Status Pekerjaan</label>
                <select
                  {...register("status")}
                  className="w-full md:w-1/2 border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background"
                >
                  <option value="belum_mulai">Belum Mulai</option>
                  <option value="diproses">Sedang Diproses</option>
                  <option value="menunggu_pihak_lain">Menunggu Pihak Lain</option>
                  <option value="selesai">Selesai</option>
                  <option value="ditunda">Ditunda</option>
                </select>
              </div>
            )}
            
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/tasks")}
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
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : action === "create" ? "Buat Tugas" : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
};
