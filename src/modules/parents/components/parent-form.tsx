import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, User, Phone, MapPin, Briefcase } from "lucide-react";

const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;

const parentSchema = z.object({
  full_name: z.string().min(1, "Nama Lengkap wajib diisi"),
  phone: z.string().regex(phoneRegex, "Format nomor telepon tidak valid (contoh: 08123456789)").optional().nullable(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")).nullable(),
  occupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type ParentFormValues = z.infer<typeof parentSchema>;

interface ParentFormProps {
  action: "create" | "edit";
  onSuccess?: () => void;
  hideActions?: boolean;
}

export const ParentForm: React.FC<ParentFormProps> = ({ action, onSuccess, hideActions }) => {
  const navigate = useNavigate();

  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ParentFormValues>({
    resolver: zodResolver(parentSchema) as any,
    refineCoreProps: {
      action,
      resource: "parents",
      redirect: hideActions ? false : "list",
      onMutationSuccess: () => {
        if (onSuccess) onSuccess();
      }
    },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <form id="parent-form" onSubmit={handleSubmit(onFinish as any)} className="space-y-6">
        
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Data Orang Tua / Wali</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Nama Lengkap <span className="text-destructive">*</span></label>
              <input
                {...register("full_name")}
                placeholder="Nama sesuai KTP"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5"><Phone className="w-4 h-4 text-muted-foreground"/> No. Handphone (WhatsApp)</label>
              <input
                {...register("phone")}
                placeholder="08xxxxxxxxxx"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-muted-foreground"/> Pekerjaan</label>
              <input
                {...register("occupation")}
                placeholder="Pekerjaan saat ini"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                {...register("email")}
                placeholder="email@contoh.com"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message as string}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-1.5"><MapPin className="w-4 h-4 text-muted-foreground"/> Alamat Domisili</label>
              <textarea
                {...register("address")}
                rows={3}
                placeholder="Alamat lengkap tempat tinggal"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none"
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register("is_active")} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm font-medium">Status Aktif</span>
              </label>
              <p className="text-xs text-muted-foreground ml-6">Orang tua yang aktif dapat menerima notifikasi/broadcast.</p>
            </div>

          </div>
        </div>

        {!hideActions && (
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate("/parents")}
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
              {formLoading ? "Menyimpan..." : "Simpan Data Orang Tua"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
