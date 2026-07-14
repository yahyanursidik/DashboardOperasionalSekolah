import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { GraduationCap, ArrowRight, UserCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useSystemSettings } from "../../app/providers/SettingsProvider";

export const PortalLogin: React.FC = () => {
  const [studentIdentifier, setStudentIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { loginCoverUrl, logoUrl, appName } = useSystemSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!navigator.onLine) {
      toast.error("Tidak ada koneksi internet. Periksa jaringan Anda.");
      return;
    }

    const identifier = studentIdentifier.trim();
    if (!identifier) {
      toast.error("Masukkan NIS atau NISN siswa terlebih dahulu.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Cari email orang tua berdasarkan NIS atau NISN siswa.
      const { data: parentEmail, error: emailError } = await supabaseClient
        .rpc("get_parent_login_email_by_student", { p_nisn: identifier, p_nis: identifier });

      if (emailError || !parentEmail) {
        toast.error("Data siswa tidak ditemukan, belum tertaut ke orang tua, atau email orang tua belum diisi.");
        return;
      }

      // 2. Login ke Supabase Auth dengan email yang ditemukan
      let { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: parentEmail,
        password: "parent123", // Password default hasil migrasi
      });

      // Fallback untuk akun demo lama (seed lama menggunakan password123)
      if (authError && authError.message.includes("Invalid login credentials")) {
        const retry = await supabaseClient.auth.signInWithPassword({
          email: parentEmail,
          password: "password123", 
        });
        
        // Jika masih gagal, berarti akun belum ada di auth.users (sudah dihapus untuk reset)
        // Kita auto-buatkan (signUp), trigger database akan otomatis mem-bypass konfirmasi email!
        if (retry.error && retry.error.message.includes("Invalid login credentials")) {
           const signup = await supabaseClient.auth.signUp({
             email: parentEmail,
             password: "parent123",
             options: {
                data: { full_name: "Orang Tua Siswa", role: "parent" }
             }
           });
           authData = signup.data as any;
           authError = signup.error as any;

           // Jika signup berhasil, panggil RPC untuk menautkan akun
           if (signup.data?.session) {
             console.log("Memanggil RPC link_my_account...");
             const rpcResult = await supabaseClient.rpc('link_my_account');
             console.log("Hasil RPC link_my_account:", rpcResult);
           } else if (!signup.error && !signup.data?.session) {
             // Jika signup berhasil tapi tidak ada session (karena Confirm Email aktif di Supabase),
             // trigger DB sudah auto-confirm email, jadi kita bisa login lagi
             const retryAfterSignup = await supabaseClient.auth.signInWithPassword({
               email: parentEmail,
               password: "parent123",
             });
             
             authData = retryAfterSignup.data as any;
             authError = retryAfterSignup.error as any;
             
             if (retryAfterSignup.data?.session) {
               console.log("Memanggil RPC link_my_account setelah auto-confirm...");
               await supabaseClient.rpc('link_my_account');
             }
           }
        } else {
           console.log("Login dengan password123 berhasil");
           authData = retry.data as any;
           authError = retry.error as any;
        }
      }

      if (authError || !authData.session) {
        toast.error("Gagal memverifikasi akses orang tua.");
        return;
      }

      // Login berhasil! Sesi secara otomatis disimpan di LocalStorage oleh Supabase.
      console.log("Login berhasil, authData:", authData);
      
      // PASTIKAN SELALU PANGGIL LINK RPC WALAUPUN SIGNIN NORMAL BERHASIL!
      console.log("Memastikan akun tertaut via RPC...");
      await supabaseClient.rpc('link_my_account');

      toast.success(`Selamat datang, Wali Siswa!`);
      navigate("/portal");
    } catch (err: any) {
      console.error("Login Error Catch:", err);
      toast.error(err.message || "Terjadi kesalahan sistem saat login.");
    } finally {
      setIsLoading(false);
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

      {/* Decorative background blobs */}
      {!loginCoverUrl && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </>
      )}
      
      <div className="relative z-10 w-full max-w-md bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
        <div className="bg-emerald-600/90 p-8 text-center border-b border-white/20">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <GraduationCap className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">Portal Orang Tua</h1>
          <p className="text-emerald-100 mt-2 text-sm">{appName || "Pantau perkembangan anak Anda dengan mudah"}</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIS / NISN Siswa</label>
              <input
                type="text"
                required
                value={studentIdentifier}
                onChange={(e) => setStudentIdentifier(e.target.value)}
                placeholder="Contoh: 25260011"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Gunakan NIS sekolah atau NISN nasional siswa yang sudah ditautkan ke data orang tua.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
            >
              {isLoading ? "Memeriksa data..." : "Masuk ke Portal"}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Admin TSLS OS &copy; {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
