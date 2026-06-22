import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Target, Loader2, CheckCircle2 } from "lucide-react";
import { supabaseClient as supabase } from "../../../lib/supabase/client";
import { toast } from "sonner";

export const ExtracurricularPortalRegister: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone_number: "",
    school_origin: "",
    parent_name: "",
    address: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: 'external_student'
          }
        }
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Gagal membuat akun");

      // 2. Create External Student Profile
      const { error: profileError } = await supabase
        .from('external_students')
        .insert({
          user_id: userId,
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number,
          school_origin: formData.school_origin,
          parent_name: formData.parent_name,
          address: formData.address,
        });

      if (profileError) throw profileError;

      // Success
      setIsSuccess(true);
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat pendaftaran");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white p-8 rounded-2xl shadow-sm border text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Akun Berhasil Dibuat!</h2>
          <p className="text-muted-foreground mb-8">
            Akun Anda telah sukses terdaftar. Silakan login untuk menelusuri dan mendaftar ke program ekstrakurikuler yang tersedia.
          </p>
          <button onClick={() => navigate('/ekskul-portal/login')} className="w-full h-12 text-base font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            Lanjut ke Halaman Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Target className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Pendaftaran Siswa Eksternal
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Buat akun untuk bergabung dengan program ekstrakurikuler TS Lab School
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5 animate-in slide-in-from-bottom-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="block text-sm font-medium">Nama Lengkap Siswa <span className="text-red-500">*</span></label>
                  <input type="text" required name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama sesuai akta" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Asal Sekolah <span className="text-red-500">*</span></label>
                  <input type="text" required name="school_origin" value={formData.school_origin} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="SDN/SMPN..." />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium">No. Telepon/WA <span className="text-red-500">*</span></label>
                  <input type="tel" required name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="08..." />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="block text-sm font-medium">Nama Orang Tua/Wali <span className="text-red-500">*</span></label>
                  <input type="text" required name="parent_name" value={formData.parent_name} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="block text-sm font-medium">Alamat Domisili</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y" rows={2}></textarea>
                </div>
              </div>

              <div className="space-y-1 border-t pt-6 mt-6">
                <h4 className="font-medium text-sm text-gray-900 mb-4">Informasi Akun (Gunakan Email Aktif)</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Email <span className="text-red-500">*</span></label>
                    <input type="email" required name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Kata Sandi <span className="text-red-500">*</span></label>
                    <input type="password" required name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" minLength={6} placeholder="Minimal 6 karakter" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full h-12 text-base font-medium rounded-lg mt-6 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center disabled:opacity-50">
                {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Mendaftarkan...</> : "Buat Akun Sekarang"}
              </button>
            </div>
          </form>
          
          <div className="mt-8 text-center border-t pt-6">
            <p className="text-sm text-muted-foreground">
              Sudah punya akun?{' '}
              <Link to="/ekskul-portal/login" className="text-primary font-bold hover:underline">
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

