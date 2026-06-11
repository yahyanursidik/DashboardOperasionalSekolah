import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSelect } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, User, MapPin, Briefcase } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";

const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;

const teacherSchema = z.object({
  full_name: z.string().min(1, "Nama Lengkap wajib diisi"),
  nickname: z.string().optional().nullable(),
  gender: z.enum(["L", "P"], { message: "Pilih jenis kelamin" }),
  phone: z.string().regex(phoneRegex, "Format nomor telepon tidak valid").optional().nullable(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")).nullable(),
  
  nip: z.string().optional().nullable(),
  role_title: z.string().min(1, "Jabatan Utama wajib diisi"),
  unit_id: z.string().min(1, "Pilih Unit Penugasan Utama"),
  status: z.enum(["active", "inactive", "contract", "part_time"]).default("active"),
  is_active: z.boolean().default(true),
  
  address: z.string().optional().nullable(),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

interface TeacherFormProps {
  action: "create" | "edit";
}

export const TeacherForm: React.FC<TeacherFormProps> = ({ action }) => {
  const navigate = useNavigate();
  const { activeUnitId } = useCurrentUnit();

  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema) as any,
    refineCoreProps: {
      action,
      resource: "teachers",
      redirect: "list",
    },
    defaultValues: {
      unit_id: activeUnitId || "",
    }
  });

  const { options: unitOptions, queryResult: unitQuery } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
  });

  return (
    <div className="max-w-4xl space-y-6">
      <form onSubmit={handleSubmit(onFinish as any)} className="space-y-6">
        
        {/* SECTION 1: Identitas Pegawai */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">1. Identitas Pegawai</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Lengkap (Sesuai KTP) <span className="text-destructive">*</span></label>
              <input
                {...register("full_name")}
                placeholder="Nama Lengkap"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Panggilan</label>
              <input
                {...register("nickname")}
                placeholder="Panggilan"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis Kelamin <span className="text-destructive">*</span></label>
              <select
                {...register("gender")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background"
              >
                <option value="">-- Pilih --</option>
                <option value="L">Ikhwan (Laki-laki)</option>
                <option value="P">Akhawat (Perempuan)</option>
              </select>
              {errors.gender && <p className="text-xs text-destructive">{errors.gender.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">No. Handphone / WhatsApp</label>
              <input
                {...register("phone")}
                placeholder="08xxxxxxxxxx"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message as string}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Email Institusi / Pribadi</label>
              <input
                type="email"
                {...register("email")}
                placeholder="guru@contoh.com"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message as string}</p>}
            </div>
          </div>
        </div>

        {/* SECTION 2: Data Kepegawaian */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-lg">2. Data Kepegawaian</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">NIP / ID Pegawai</label>
              <input
                {...register("nip")}
                placeholder="Nomor Induk / NIP"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jabatan Utama <span className="text-destructive">*</span></label>
              <input
                {...register("role_title")}
                placeholder="Contoh: Guru Matematika"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
              {errors.role_title && <p className="text-xs text-destructive">{errors.role_title.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Unit Penugasan Utama <span className="text-destructive">*</span></label>
              <select
                {...register("unit_id")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background"
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
              <label className="text-sm font-medium">Status Kepegawaian <span className="text-destructive">*</span></label>
              <select
                {...register("status")}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all bg-background"
              >
                <option value="active">Pegawai Tetap (Aktif)</option>
                <option value="contract">Pegawai Kontrak</option>
                <option value="part_time">Honorer / Part-time</option>
                <option value="inactive">Nonaktif / Resign</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register("is_active")} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm font-medium">Akun Aktif di Sistem</span>
              </label>
              <p className="text-xs text-muted-foreground ml-6">Jika tidak dicentang, guru tidak akan bisa login ke aplikasi absensi atau penilaian.</p>
            </div>
          </div>
        </div>

        {/* SECTION 3: Alamat */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-lg">3. Alamat Domisili</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              <textarea
                {...register("address")}
                rows={3}
                placeholder="Alamat lengkap tempat tinggal"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/teachers")}
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
            {formLoading ? "Menyimpan..." : "Simpan Data Guru"}
          </button>
        </div>
      </form>
    </div>
  );
};
