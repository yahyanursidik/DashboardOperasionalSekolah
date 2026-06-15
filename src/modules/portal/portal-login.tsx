import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { GraduationCap, ArrowRight, UserCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const PortalLogin: React.FC = () => {
  const [nisn, setNisn] = useState("");
  const [nis, setNis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!navigator.onLine) {
      toast.error("Tidak ada koneksi internet. Periksa jaringan Anda.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Cari email orang tua berdasarkan NISN & NIS
      const { data: parentEmail, error: emailError } = await supabaseClient
        .rpc("get_parent_login_email_by_student", { p_nisn: nisn, p_nis: nis });

      if (emailError || !parentEmail) {
        toast.error("Data Siswa tidak ditemukan atau belum ditautkan ke Orang Tua.");
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
           authData = signup.data;
           authError = signup.error;

           // Jika signup berhasil, panggil RPC untuk menautkan akun
           if (signup.data?.session) {
             await supabaseClient.rpc('link_my_account');
           }
        } else {
           authData = retry.data;
           authError = retry.error;
        }
      }

      if (authError || !authData.session) {
        toast.error("Gagal memverifikasi akses orang tua.");
        return;
      }

      toast.success("Login berhasil!");
      navigate("/portal");
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan sistem. Coba lagi nanti.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-emerald-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Portal Orang Tua</h1>
          <p className="text-emerald-100 mt-2 text-sm">Pantau perkembangan anak Anda dengan mudah</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NISN Siswa</label>
              <input
                type="text"
                required
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder="Masukkan NISN"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIS (Nomor Induk Siswa Sekolah)</label>
              <input
                type="text"
                required
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                placeholder="Masukkan NIS"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Untuk Demo: Gunakan NISN <strong>0102030407</strong> dan NIS <strong>2425003</strong> (Atas nama: Aisyah Putri)
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
