import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSelect } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, Users, Building } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

const classSchema = z.object({
  name: z.string().min(1, "Nama Kelas wajib diisi"),
  code: z.string().optional().nullable(),
  level: z.string().min(1, "Tingkat/Level wajib diisi"),
  capacity: z.coerce.number().min(1, "Kapasitas minimal 1").default(30),
  
  unit_id: z.string().min(1, "Pilih Unit Pendidikan"),
  academic_year_id: z.string().min(1, "Tahun Ajaran wajib diisi"),
  homeroom_teacher_id: z.string().optional().nullable(),
  
  is_active: z.boolean().default(true),
});

type ClassFormValues = z.infer<typeof classSchema>;

interface ClassFormProps {
  action: "create" | "edit";
}

export const ClassForm: React.FC<ClassFormProps> = ({ action }) => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();

  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema) as any,
    refineCoreProps: {
      action,
      resource: "classes",
      redirect: "list",
    },
    defaultValues: {
      unit_id: activeUnitId || "",
      academic_year_id: activeYearId || "",
      capacity: 30,
      is_active: true
    }
  });

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });
  const { options: yearOptions } = useSelect({ resource: "academic_years", optionLabel: "name", optionValue: "id" });
  const { options: teacherOptions } = useSelect({ 
    resource: "teachers", 
    optionLabel: "full_name", 
    optionValue: "id",
    filters: [{ field: "is_active", operator: "eq", value: true }]
  });

  const onSubmit = async (data: ClassFormValues) => {
    // Transform payload so it matches the Supabase 'classes' table
    const payload = {
      name: data.name,
      code: data.code || null,
      level: data.level,
      grade_level: parseInt(data.level) || 0, // Required by DB
      capacity: data.capacity,
      unit_id: data.unit_id,
      academic_year_id: data.academic_year_id,
      is_active: data.is_active
    };

    // Ignore homeroom_teacher_id for the classes insert, since it belongs to teacher_assignments table
    await onFinish(payload as any);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* SECTION 1: Identitas Kelas */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">1. Identitas Kelas</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Kelas <span className="text-destructive">*</span></label>
              <input
                {...register("name")}
                placeholder="Contoh: Kelas 7A Abu Bakar"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kode Kelas</label>
              <input
                {...register("code")}
                placeholder="Contoh: 7A"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all uppercase"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tingkat / Level <span className="text-destructive">*</span></label>
              <input
                {...register("level")}
                placeholder="Contoh: 7, 8, 10, X"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
              {errors.level && <p className="text-xs text-destructive">{errors.level.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kapasitas Maksimal</label>
              <input
                type="number"
                {...register("capacity")}
                placeholder="30"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
              {errors.capacity && <p className="text-xs text-destructive">{errors.capacity.message as string}</p>}
            </div>

            <div className="space-y-2 md:col-span-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register("is_active")} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm font-medium">Kelas Aktif</span>
              </label>
              <p className="text-xs text-muted-foreground ml-6">Hanya kelas aktif yang akan muncul di absensi dan pendaftaran siswa baru.</p>
            </div>
          </div>
        </div>

        {/* SECTION 2: Data Akademik */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <Building className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-lg">2. Data Akademik</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit Pendidikan <span className="text-destructive">*</span></label>
              <select
                {...register("unit_id")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background"
              >
                <option value="">-- Pilih Unit --</option>
                {unitOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errors.unit_id && <p className="text-xs text-destructive">{errors.unit_id.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tahun Ajaran <span className="text-destructive">*</span></label>
              <select
                {...register("academic_year_id")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background"
              >
                <option value="">-- Pilih Tahun Ajaran --</option>
                {yearOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errors.academic_year_id && <p className="text-xs text-destructive">{errors.academic_year_id.message as string}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Wali Kelas (Opsional)</label>
              <select
                {...register("homeroom_teacher_id")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background"
              >
                <option value="">-- Belum Ditentukan --</option>
                {teacherOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">Anda juga dapat menugaskan wali kelas dari menu Penugasan Guru.</p>
            </div>

          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/classes")}
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
            {formLoading ? "Menyimpan..." : "Simpan Data Kelas"}
          </button>
        </div>
      </form>
    </div>
  );
};
