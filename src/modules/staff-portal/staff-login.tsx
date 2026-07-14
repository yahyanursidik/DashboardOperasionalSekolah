import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, KeyRound, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { useSystemSettings } from "../../app/providers/SettingsProvider";

export const StaffLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { appName, logoUrl, loginCoverUrl } = useSystemSettings();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!navigator.onLine) {
      toast.error("Tidak ada koneksi internet. Periksa jaringan Anda.");
      return;
    }

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      toast.error("Masukkan NIK atau email pegawai terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    try {
      const { data: emailData, error: emailError } = await supabaseClient
        .rpc("get_login_email_by_identifier", { p_identifier: trimmedIdentifier });

      if (emailError || !emailData) {
        toast.error("Akun tidak ditemukan. Pastikan NIK / Email benar.");
        return;
      }

      const staffEmail = String(emailData).trim();
      let { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: staffEmail,
        password: "sekolah123",
      });

      if (authError && authError.message.includes("Invalid login credentials")) {
        const retry = await supabaseClient.auth.signInWithPassword({
          email: staffEmail,
          password: "password123",
        });

        if (retry.error && retry.error.message.includes("Invalid login credentials")) {
          const signup = await supabaseClient.auth.signUp({
            email: staffEmail,
            password: "sekolah123",
            options: {
              data: { full_name: "Staf Sekolah", role: "staff" },
            },
          });

          authData = signup.data as any;
          authError = signup.error as any;

          if (!signup.error && !signup.data?.session) {
            const retryAfterSignup = await supabaseClient.auth.signInWithPassword({
              email: staffEmail,
              password: "sekolah123",
            });
            authData = retryAfterSignup.data as any;
            authError = retryAfterSignup.error as any;
          }
        } else {
          authData = retry.data as any;
          authError = retry.error as any;
        }
      }

      if (authError || !authData.session) {
        toast.error("Gagal memverifikasi akun staf. Hubungi HRD/Tata Usaha untuk aktivasi akun.");
        return;
      }

      await supabaseClient.rpc("link_my_account");
      toast.success("Selamat datang di Portal Staf.");
      navigate("/staff");
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan sistem saat login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-100 relative overflow-hidden font-sans"
      style={loginCoverUrl ? { backgroundImage: `url(${loginCoverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
    >
      {loginCoverUrl && <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />}

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white/75 shadow-2xl backdrop-blur-xl">
        <div className="bg-slate-900 p-8 text-center text-white">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-lg" />
          ) : (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-lg">
              <BriefcaseBusiness className="h-8 w-8" />
            </div>
          )}
          <h1 className="text-2xl font-black">Portal Staf</h1>
          <p className="mt-1 text-sm text-slate-300">{appName || "Sistem Informasi Sekolah"}</p>
        </div>

        <div className="p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <KeyRound className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-black text-gray-900">Masuk Staf Non-Akademik</h2>
            <p className="mt-1 text-sm text-gray-500">Gunakan NIK atau email pegawai.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">NIK / Email</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  {identifier.includes("@") ? <Mail className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </div>
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                  placeholder="Masukkan NIK atau email resmi"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !identifier}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-slate-800 disabled:opacity-70"
            >
              {isLoading ? "Memeriksa..." : "Masuk ke Portal"}
              {!isLoading && <ArrowRight className="h-5 w-5" />}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">Butuh bantuan akun? Hubungi HRD/Tata Usaha.</p>
        </div>
      </div>
    </div>
  );
};
