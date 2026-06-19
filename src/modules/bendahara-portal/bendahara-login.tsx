import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { toast } from "sonner";
import { Wallet, ArrowRight } from "lucide-react";
import { useSystemSettings } from "../../app/providers/SettingsProvider";

export const BendaharaLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { appName, logoUrl, loginCoverUrl } = useSystemSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      // Auto-signup fallback for demo users
      if (authError && authError.message.includes("Invalid login credentials")) {
        const signup = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: "Staf Bendahara", role: "finance" }
          }
        });
        authData = signup.data as any;
        authError = signup.error as any;
        
        if (signup.data?.session) {
           await supabaseClient.rpc('link_my_account');
        }
      }

      if (authError || !authData?.session) {
        throw new Error((authError as any)?.message || "Gagal memverifikasi akses.");
      }

      // Pastikan pengguna memiliki role finance/bendahara atau admin
      const { data: userData } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', authData.user?.id)
        .single();
        
      const dbRole = (userData as any)?.role;
      const metaRole = authData.user?.user_metadata?.role;
      const role = dbRole || metaRole;

      if (role !== 'finance' && role !== 'superadmin' && role !== 'admin') {
         toast.warning("Anda tidak memiliki akses ke portal bendahara.");
         await supabaseClient.auth.signOut();
         return;
      }

      // Pastikan akun tertaut
      await supabaseClient.rpc('link_my_account');

      toast.success(`Selamat datang di Portal Bendahara!`);
      navigate("/bendahara");
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
        <div className="bg-emerald-700/90 p-8 text-center relative overflow-hidden border-b border-white/20">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-black/10 blur-xl"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain bg-white rounded-2xl p-2 mb-4 shadow-lg" />
            ) : (
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <Wallet className="w-8 h-8 text-emerald-700" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-white tracking-tight">Portal Bendahara</h1>
            <p className="text-emerald-100/90 mt-2 text-sm font-medium">{appName || "Sistem Manajemen Keuangan"}</p>
          </div>
        </div>
        
        {/* Form Area */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Email Bendahara</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@sekolah.edu"
                className="w-full px-4 py-3 rounded-xl border border-white/50 bg-white/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 shadow-inner"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-white/50 bg-white/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 shadow-inner"
              />
              <p className="text-xs text-emerald-800/80 mt-2 font-medium">
                Untuk Demo: Gunakan email <strong>bendahara@demo.com</strong> dan sandi <strong>bendahara123</strong>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-6 shadow-lg shadow-emerald-600/30 disabled:opacity-70 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? "Mengautentikasi..." : "Masuk"}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
          
          <div className="mt-8 text-center border-t border-slate-200/50 pt-6">
            <p className="text-xs text-slate-500 font-medium">
              Akses terbatas hanya untuk staf keuangan sekolah.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
