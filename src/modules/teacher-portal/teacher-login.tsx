import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { School, ArrowRight, UserCheck, KeyRound, Mail, User, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useSystemSettings } from "../../app/providers/SettingsProvider";

export const TeacherLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { appName, logoUrl, loginCoverUrl } = useSystemSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      toast.error("Tidak ada koneksi internet. Periksa jaringan Anda.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Dapatkan Email (Karena Supabase Auth butuh email, bukan NIK)
      const { data: emailData, error: emailError } = await supabaseClient
        .rpc("get_login_email_by_identifier", { p_identifier: identifier });

      if (emailError || !emailData) {
        toast.error("Akun tidak ditemukan. Pastikan NIK / Email benar.");
        return;
      }

      const userEmail = emailData;

      // 2. Lakukan login ke Supabase Auth
      let { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: userEmail,
        password: "sekolah123", 
      });

      // Fallback untuk akun lama yang masih memakai sandi awal.
      if (authError && authError.message.includes("Invalid login credentials")) {
        const retry = await supabaseClient.auth.signInWithPassword({
          email: userEmail,
          password: "password123", 
        });

        // Jika masih gagal, lakukan auto-signup
        if (retry.error && retry.error.message.includes("Invalid login credentials")) {
           const signup = await supabaseClient.auth.signUp({
             email: userEmail,
             password: "sekolah123",
             options: {
                data: { full_name: "Guru", role: "guru" }
             }
           });
           authData = signup.data as any;
           authError = signup.error as any;

           // Jika signup berhasil, panggil RPC untuk menautkan akun
           if (signup.data?.session) {
             console.log("Memanggil RPC link_my_account...");
             const rpcResult = await supabaseClient.rpc('link_my_account');
             console.log("Hasil RPC link_my_account:", rpcResult);
           }
        } else {
           console.log("Login dengan password123 berhasil");
           authData = retry.data as any;
           authError = retry.error as any;
        }
      }

      if (authError || !authData.session) {
        toast.error(authError?.message || "Gagal melakukan otentikasi.");
        return;
      }

      // Login berhasil! Sesi secara otomatis disimpan di LocalStorage oleh Supabase.
      console.log("Login berhasil, authData:", authData);
      
      // PASTIKAN SELALU PANGGIL LINK RPC WALAUPUN SIGNIN NORMAL BERHASIL!
      console.log("Memastikan akun tertaut via RPC...");
      const linkResult = await supabaseClient.rpc('link_my_account');
      console.log("Hasil akhir link_my_account:", linkResult);

      toast.success(`Selamat datang!`);
      navigate("/teacher");
    } catch (err: any) {
      console.error("Login Error Catch:", err);
      toast.error(err.message || "Terjadi kesalahan sistem saat login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-green-100/60 to-emerald-200 relative overflow-hidden font-sans"
      style={loginCoverUrl ? {
        backgroundImage: `url(${loginCoverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : {}}
    >
      {/* Dark overlay if using cover image to ensure form readability */}
      {loginCoverUrl && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-0"></div>}

      {/* Decorative background blobs */}
      {!loginCoverUrl && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </>
      )}
      
      <div className="relative z-10 w-full max-w-md bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
        
        {/* Header Area */}
        <div className="bg-primary/90 p-8 text-center relative overflow-hidden border-b border-white/20">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-black/10 blur-xl"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain bg-white rounded-2xl p-2 mb-4 shadow-lg" />
            ) : (
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-primary-foreground mb-1">Portal Guru</h1>
            <p className="text-primary-foreground/80 text-sm font-medium">{appName || "Sistem Informasi Manajemen Sekolah"}</p>
          </div>
        </div>

        {/* Form Area */}
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="bg-orange-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <School className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Selamat Datang</h2>
            <p className="text-gray-500 text-sm mt-1">Masuk dengan NIK atau Email</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIK / Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  {identifier.includes('@') ? <Mail className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Masukkan NIK atau email resmi"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !identifier}
              className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-70 shadow-md shadow-primary/20"
            >
              {isLoading ? "Memeriksa..." : "Masuk ke Portal"}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              Butuh bantuan? Hubungi Admin Tata Usaha.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
