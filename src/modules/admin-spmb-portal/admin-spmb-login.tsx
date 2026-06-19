import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { LogIn, Lock, Mail, GraduationCap } from "lucide-react";
import { useSystemSettings } from "../../app/providers/SettingsProvider";

export const AdminSpmbLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { loginCoverUrl } = useSystemSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Verify if user has admin_spmb role (or any other superadmin role)
      const { data: userRoles } = await supabaseClient
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", data.user.id);

      const rolesArray = userRoles as any[] | null;

      const hasSpmbAccess = rolesArray?.some(ur => 
        ['admin_spmb', 'super_admin', 'ketua_yayasan', 'kepsek'].includes(ur.roles?.name)
      );

      if (!hasSpmbAccess) {
        await supabaseClient.auth.signOut();
        throw new Error("Anda tidak memiliki akses ke Portal Admin SPMB.");
      }

      navigate("/admin-spmb");
    } catch (err: any) {
      setError(err.message === "Invalid login credentials" ? "Email atau password salah." : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-100/60 to-emerald-200"
      style={loginCoverUrl ? {
        backgroundImage: `url(${loginCoverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : {}}
    >
      {/* Dark overlay if using cover image to ensure form readability */}
      {loginCoverUrl && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-0"></div>}

      {/* Decorative background blobs - only show if no cover */}
      {!loginCoverUrl && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </>
      )}

      <div className="w-full max-w-md bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 relative z-10 border border-white/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-inner">
            <GraduationCap className="w-8 h-8 -rotate-3" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portal Admin SPMB</h1>
          <p className="text-slate-500 text-sm mt-2">Login untuk mengelola pendaftaran siswa baru</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 text-center font-medium shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-900 font-medium"
                placeholder="email@sekolah.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-900 font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" /> Masuk ke Portal
              </>
            )}
          </button>
        </form>
      </div>

      <footer className={`absolute bottom-8 text-center text-xs w-full z-10 ${loginCoverUrl ? 'text-white/80' : 'text-emerald-800/70 font-medium'}`}>
        &copy; {new Date().getFullYear()} TSLS OS. Portal Khusus Admin SPMB.
      </footer>
    </div>
  );
};
