import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSelect } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, User, GraduationCap, MapPin, FileText } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { PhotoUpload } from "../../../components/common/PhotoUpload";

const studentSchema = z.object({
  full_name: z.string().min(1, "Nama Lengkap wajib diisi"),
  nickname: z.string().optional().nullable(),
  gender: z.enum(["L", "P"], { message: "Pilih jenis kelamin" }),
  birth_place: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  
  unit_id: z.string().min(1, "Pilih Unit Sekolah"),
  class_id: z.string().optional().nullable(),
  nis: z.string().min(1, "NIS wajib diisi"),
  nisn: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "graduated", "transferred", "dropped_out"]).default("active"),
  
  address: z.string().optional().nullable(),
  notes_admin: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentFormProps {
  action: "create" | "edit";
}

export const StudentForm: React.FC<StudentFormProps> = ({ action }) => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();

  const {
    refineCore: { onFinish, formLoading, queryResult },
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema) as any,
    refineCoreProps: {
      action,
      resource: "students",
      redirect: "list",
    },
    defaultValues: {
      unit_id: activeUnitId || "",
    }
  });

  const selectedUnit = watch("unit_id");

  const { options: unitOptions, queryResult: unitQuery } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
  });

  const { options: classOptions, queryResult: classQuery } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    filters: [
      { field: "unit_id", operator: "eq", value: selectedUnit || "null" }
    ],
    queryOptions: { enabled: !!selectedUnit }
  });

  // Extract initial date properly for HTML date input
  const initialData = queryResult?.data?.data;
  const birthDateValue = initialData?.date_of_birth ? new Date(initialData.date_of_birth).toISOString().split('T')[0] : "";

  return (
    <div className="max-w-4xl space-y-6">
      <form onSubmit={handleSubmit(onFinish as any)} className="space-y-6">
        
        {/* SECTION 1: Identitas Siswa */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">1. Identitas Siswa</h3>
          </div>
          
          <div className="p-6 flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 flex flex-col items-center border-r pr-0 md:pr-8 border-transparent md:border-border">
              <label className="text-sm font-semibold mb-4 text-center">Foto Siswa</label>
              <PhotoUpload 
                value={watch("photo_url") || null} 
                onChange={(url) => register("photo_url").onChange({ target: { name: "photo_url", value: url } })} 
              />
            </div>
            
            <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap <span className="text-destructive">*</span></label>
              <input
                {...register("full_name")}
                placeholder="Sesuai Akta Kelahiran"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Panggilan / Kunyah</label>
              <input
                {...register("nickname")}
                placeholder="Contoh: Ahmad"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis Kelamin <span className="text-destructive">*</span></label>
              <select
                {...register("gender")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background"
              >
                <option value="">-- Pilih --</option>
                <option value="L">Ikhwan (Laki-laki)</option>
                <option value="P">Akhawat (Perempuan)</option>
              </select>
              {errors.gender && <p className="text-xs text-destructive">{errors.gender.message as string}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tempat Lahir</label>
                <input
                  {...register("birth_place")}
                  placeholder="Kota Kelahiran"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Lahir</label>
                <input
                  type="date"
                  defaultValue={birthDateValue}
                  {...register("date_of_birth")}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Data Akademik */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-lg">2. Data Akademik</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit Sekolah <span className="text-destructive">*</span></label>
              <select
                {...register("unit_id")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background"
                disabled={unitQuery.isLoading}
              >
                <option value="">-- Pilih Unit --</option>
                {unitOptions?.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.unit_id && <p className="text-xs text-destructive">{errors.unit_id.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kelas</label>
              <select
                {...register("class_id")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background"
                disabled={classQuery.isLoading || !selectedUnit}
              >
                <option value="">-- Belum Ada Kelas --</option>
                {classOptions?.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {!selectedUnit && <p className="text-xs text-muted-foreground">Pilih unit terlebih dahulu.</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nomor Induk Santri (NIS) <span className="text-destructive">*</span></label>
              <input
                {...register("nis")}
                placeholder="NIS Internal"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              />
              {errors.nis && <p className="text-xs text-destructive">{errors.nis.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">NISN</label>
              <input
                {...register("nisn")}
                placeholder="Nomor Induk Siswa Nasional"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Status Pendaftaran <span className="text-destructive">*</span></label>
              <select
                {...register("status")}
                className="w-full md:w-1/2 border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
                <option value="graduated">Lulus</option>
                <option value="transferred">Pindah / Mutasi</option>
                <option value="dropped_out">Dikeluarkan</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Status aktif akan muncul di presensi harian.</p>
            </div>
          </div>
        </div>

        {/* SECTION 3: Alamat */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-lg">3. Alamat & Kontak Darurat</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Alamat Tempat Tinggal</label>
              <textarea
                {...register("address")}
                rows={3}
                placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* SECTION 4: Catatan Administrasi */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-lg">4. Catatan Administrasi</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan Internal (Admin Only)</label>
              <textarea
                {...register("notes_admin")}
                rows={3}
                placeholder="Catatan khusus terkait siswa (hanya dapat dilihat oleh admin)."
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none bg-amber-50 dark:bg-amber-900/10"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/students")}
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
            {formLoading ? "Menyimpan..." : "Simpan Data Siswa"}
          </button>
        </div>
      </form>
    </div>
  );
};
