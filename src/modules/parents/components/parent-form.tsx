import React from "react";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, User, Phone, MapPin, Briefcase, CreditCard, Heart, BookOpen, Mail } from "lucide-react";

const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;

const parentSchema = z.object({
  full_name: z.string().min(1, "Nama Lengkap wajib diisi"),
  nik: z.string().optional().nullable(),
  phone: z.string().regex(phoneRegex, "Format nomor telepon tidak valid (contoh: 08123456789)").optional().or(z.literal("")).nullable(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")).nullable(),
  occupation: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
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

  const onSubmit = (values: any) => {
    const sanitizedValues: any = { ...values };
    
    // Konversi string kosong ("") menjadi null agar tidak melanggar 
    // constraint unik (seperti NIK ganda) atau format email di database
    const fieldsToSanitize = ["nik", "phone", "email", "occupation", "education", "religion", "address"];
    fieldsToSanitize.forEach(field => {
      if (sanitizedValues[field] === "") {
        sanitizedValues[field] = null;
      }
    });

    onFinish(sanitizedValues);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <form id="parent-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Identitas Diri ── */}
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-primary/5 px-6 py-4 border-b flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg text-foreground">Identitas Diri</h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap <span className="text-destructive">*</span></label>
                <input
                  {...register("full_name")}
                  placeholder="Nama sesuai KTP"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background"
                />
                {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-muted-foreground"/> NIK
                </label>
                <input
                  {...register("nik")}
                  placeholder="Nomor Induk Kependudukan (16 digit)"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-muted-foreground"/> Agama
                  </label>
                  <select
                    {...register("religion")}
                    className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background"
                  >
                    <option value="">Pilih Agama</option>
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Konghucu">Konghucu</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-muted-foreground"/> Pendidikan
                  </label>
                  <select
                    {...register("education")}
                    className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background"
                  >
                    <option value="">Pilih Pendidikan</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA/SMK">SMA/SMK</option>
                    <option value="D3">Diploma (D3)</option>
                    <option value="S1">Sarjana (S1)</option>
                    <option value="S2">Magister (S2)</option>
                    <option value="S3">Doktor (S3)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-muted-foreground"/> Pekerjaan
                </label>
                <input
                  {...register("occupation")}
                  placeholder="Pekerjaan / Profesi saat ini"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <input type="checkbox" {...register("is_active")} className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                  <div>
                    <span className="text-sm font-semibold">Status Orang Tua Aktif</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Berikan akses notifikasi & update sekolah.</p>
                  </div>
                </label>
              </div>

            </div>
          </div>

          {/* ── Kontak & Alamat ── */}
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-rose-50/50 px-6 py-4 border-b flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-500" />
              <h3 className="font-semibold text-lg text-foreground">Kontak & Lokasi Domisili</h3>
            </div>
            <div className="p-6 space-y-5">
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-muted-foreground"/> No. Handphone (WhatsApp)
                </label>
                <input
                  {...register("phone")}
                  placeholder="Contoh: 08123456789"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background"
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message as string}</p>}
                <p className="text-[10px] text-muted-foreground">Pastikan nomor aktif di WhatsApp untuk menerima pengumuman.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-muted-foreground"/> Email (Opsional)
                </label>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="email@contoh.com"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all bg-background"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-muted-foreground"/> Alamat Lengkap
                </label>
                <textarea
                  {...register("address")}
                  rows={5}
                  placeholder="Tuliskan alamat lengkap tempat tinggal (Jalan, RT/RW, Kelurahan, Kecamatan, Kota)..."
                  className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none bg-background leading-relaxed"
                ></textarea>
              </div>

            </div>
          </div>
        </div>

        {/* ── Form Actions ── */}
        {!hideActions && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t mt-8">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-input rounded-lg hover:bg-muted transition-colors text-sm font-medium shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Batal
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-sm font-medium text-sm disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {formLoading ? "Menyimpan Data..." : "Simpan Data Orang Tua"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
