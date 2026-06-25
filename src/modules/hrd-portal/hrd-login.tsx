import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { ArrowRight, Mail, Building, Lock } from "lucide-react";
import { toast } from "sonner";
import { useSystemSettings } from "../../app/providers/SettingsProvider";

export const HrdPortalLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      // 1. Standar Login Auth Supabase dengan Email dan Password
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        toast.error("Gagal masuk. Pastikan email dan kata sandi benar.");
        setIsLoading(false);
        return;
      }

      // 2. Verifikasi Hak Akses (Role)
      const { data: userRoles } = await supabaseClient
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", authData.user.id);

      const rolesArray = userRoles as any[] | null;

      const hasHrdAccess = rolesArray?.some(ur => 
        ['hrd', 'super_admin', 'ketua_yayasan'].includes(ur.roles?.name)
      );

      if (!hasHrdAccess) {
        await supabaseClient.auth.signOut();
        toast.error("Akses Ditolak. Anda tidak memiliki role HRD.");
        setIsLoading(false);
        return;
      }

      toast.success(`Selamat datang di Portal HRD!`);
      navigate("/hrd");
    } catch (err: any) {
      console.error("Login Error Catch:", err);
      toast.error(err.message || "Terjadi kesalahan sistem saat login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-gray-200 to-slate-300 relative overflow-hidden font-sans"
      style={loginCoverUrl ? {
        backgroundImage: `url(${loginCoverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : {}}
    >
      {loginCoverUrl && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-0"></div>}

      {!loginCoverUrl && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-slate-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-80 h-80 bg-gray-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </>
      )}
      
      <div className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
        
        <div className="bg-primary p-8 text-center relative overflow-hidden border-b border-primary/20">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-black/10 blur-xl"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain bg-white rounded-2xl p-2 mb-4 shadow-lg" />
            ) : (
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <Building className="w-8 h-8 text-primary" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-primary-foreground mb-1">Portal HRD Yayasan</h1>
            <p className="text-primary-foreground/80 text-sm font-medium">{appName || "Sistem Informasi Yayasan"}</p>
          </div>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900">Masuk ke Sistem</h2>
            <p className="text-gray-500 text-sm mt-1">Gunakan Email dan Kata Sandi Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Karyawan</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hrd@yayasan.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-70 shadow-md shadow-primary/20 mt-2"
            >
              {isLoading ? "Memeriksa..." : "Masuk"}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              Butuh bantuan? Hubungi Administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
