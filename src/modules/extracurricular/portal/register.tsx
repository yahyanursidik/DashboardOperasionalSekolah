import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Target, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabaseClient as supabase } from "../../../lib/supabase/client";
import { toast } from "sonner";
import { useList } from "@refinedev/core";

export const ExtracurricularPortalRegister: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { data: programsData, isLoading: loadingPrograms } = useList({ 
    resource: "extracurriculars", 
    filters: [{ field: "is_active", operator: "eq", value: true }] 
  });

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone_number: "",
    school_origin: "",
    parent_name: "",
    address: "",
    program_id: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => setStep(2);
  const handlePrev = () => setStep(1);

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
      const { data: profileData, error: profileError } = await supabase
        .from('external_students')
        .insert({
          user_id: userId,
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number,
          school_origin: formData.school_origin,
          parent_name: formData.parent_name,
          address: formData.address,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // 3. Register to Program
      if (formData.program_id) {
        const { error: memberError } = await supabase
          .from('extracurricular_members')
          .insert({
            extracurricular_id: formData.program_id,
            external_student_id: (profileData as any).id,
            status: 'PENDING'
          });
        
        if (memberError) throw memberError;
      }

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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pendaftaran Berhasil!</h2>
          <p className="text-muted-foreground mb-8">
            Akun Anda telah berhasil dibuat. Data pendaftaran ekstrakurikuler sedang menunggu persetujuan admin. Silakan login untuk mengecek status.
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
          Bergabung dengan program ekstrakurikuler Yayasan TSLS
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          
          <div className="mb-8 flex items-center justify-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
            <div className={`w-16 h-1 mx-2 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
          </div>

          <form className="space-y-6" onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            
            {step === 1 && (
              <div className="space-y-5 animate-in slide-in-from-right-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Nama Lengkap Siswa <span className="text-red-500">*</span></label>
                  <input type="text" required name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama sesuai akta" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium">Asal Sekolah <span className="text-red-500">*</span></label>
                    <input type="text" required name="school_origin" value={formData.school_origin} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="SDN/SMPN..." />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium">No. Telepon/WA <span className="text-red-500">*</span></label>
                    <input type="tel" required name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="08..." />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Nama Orang Tua/Wali <span className="text-red-500">*</span></label>
                  <input type="text" required name="parent_name" value={formData.parent_name} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Alamat Domisili</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y" rows={2}></textarea>
                </div>

                <button type="submit" className="w-full h-12 text-base font-medium rounded-lg mt-6 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Lanjut ke Pemilihan Program
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-in slide-in-from-right-4">
                <div className="p-4 bg-muted/30 rounded-xl border mb-6">
                  <label className="block text-sm font-bold mb-3">Pilih Program Ekstrakurikuler <span className="text-red-500">*</span></label>
                  <div className="space-y-3">
                    {loadingPrograms ? (
                      <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
                    ) : programsData?.data?.map((p: any) => (
                      <label key={p.id} className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${formData.program_id === p.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-gray-300 bg-white'}`}>
                        <input type="radio" name="program_id" value={p.id} checked={formData.program_id === p.id} onChange={handleChange} className="mt-1 w-4 h-4 text-primary" required />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{p.name}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">{p.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">Rp {Number(p.external_fee).toLocaleString('id-ID')}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 border-t pt-6">
                  <h4 className="font-medium text-sm text-gray-900 mb-4">Buat Akun Portal (Gunakan Email Aktif)</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Email <span className="text-red-500">*</span></label>
                      <input type="email" required name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Kata Sandi <span className="text-red-500">*</span></label>
                      <input type="password" required name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all" minLength={6} placeholder="Minimal 6 karakter" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={handlePrev} className="w-1/3 h-12 flex justify-center items-center font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
                  </button>
                  <button type="submit" disabled={isLoading} className="flex-1 h-12 text-base font-medium flex justify-center items-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50">
                    {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Menyimpan...</> : "Selesaikan Pendaftaran"}
                  </button>
                </div>
              </div>
            )}
          </form>
          
          {step === 1 && (
            <div className="mt-8 text-center">
              <Link to="/ekskul-portal/login" className="text-sm text-primary font-medium hover:underline">
                Sudah punya akun? Masuk di sini
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
