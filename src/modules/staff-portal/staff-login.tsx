import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, LockKeyhole, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { useSystemSettings } from "../../app/providers/SettingsProvider";
import { supabaseClient } from "../../lib/supabase/client";
import { staffPortalPositions } from "./staff-utils";

export const StaffLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { appName, logoUrl, loginCoverUrl } = useSystemSettings();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!navigator.onLine) return toast.error("Tidak ada koneksi internet. Periksa jaringan Anda.");
    setIsLoading(true);
    try {
      const normalizedIdentifier = identifier.trim();
      let { data: staffEmail, error: lookupError } = await supabaseClient.rpc("get_staff_login_email_by_identifier", { p_identifier: normalizedIdentifier });
      if (lookupError) {
        const legacy = await supabaseClient.rpc("get_login_email_by_identifier", { p_identifier: normalizedIdentifier });
        staffEmail = legacy.data;
        lookupError = legacy.error;
      }
      if (lookupError || !staffEmail) {
        toast.error("Akun staf tidak ditemukan atau belum diaktifkan.");
        return;
      }

      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({ email: String(staffEmail), password });
      if (authError || !authData.session) {
        toast.error("NIK/email atau kata sandi tidak sesuai.");
        return;
      }

      let { data: hasAccess, error: accessError } = await supabaseClient.rpc("staff_has_portal_access");
      if (accessError) {
        const { data } = await supabaseClient.from("employees").select("position").eq("user_id", authData.session.user.id).eq("status", "active").maybeSingle();
        const employeeData = data as { position?: string | null } | null;
        hasAccess = staffPortalPositions.includes(employeeData?.position || "");
        accessError = null;
      }
      if (!hasAccess) {
        await supabaseClient.auth.signOut();
        toast.error("Akun aktif, tetapi tidak termasuk penugasan Portal Staf.");
        return;
      }

      toast.success("Berhasil masuk ke Portal Staf.");
      navigate("/staff", { replace: true });
    } catch (error) {
      console.error("Staff login error:", error);
      toast.error("Login belum dapat diproses. Silakan coba kembali.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-950 px-4 py-8 sm:flex sm:items-center sm:justify-center" style={loginCoverUrl ? { backgroundImage: `linear-gradient(rgba(3, 46, 35, .82), rgba(3, 46, 35, .92)), url(${loginCoverUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>
      <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-lg border border-white/15 bg-white shadow-2xl md:grid-cols-[.85fr_1.15fr]">
        <section className="hidden bg-gray-900 p-10 text-white md:flex md:flex-col md:justify-between"><div>{logoUrl ? <img src={logoUrl} alt={appName || "Logo sekolah"} className="h-16 max-w-40 rounded-md bg-white p-2 object-contain" /> : <div className="flex h-14 w-14 items-center justify-center rounded-md bg-white text-gray-900"><BriefcaseBusiness className="h-7 w-7" /></div>}<h1 className="mt-8 text-3xl font-bold">Portal Staf</h1><p className="mt-3 max-w-xs text-sm leading-6 text-gray-300">Kelola tugas, jadwal, absensi, izin, dan laporan operasional sekolah dalam satu ruang kerja.</p></div><p className="text-xs text-gray-400">{appName || "Sistem Informasi Sekolah"}</p></section>
        <section className="min-w-0 p-6 sm:p-10">
          <div className="mb-8 flex items-center gap-3 md:hidden">{logoUrl ? <img src={logoUrl} alt="Logo sekolah" className="h-11 w-11 rounded-md border object-contain p-1" /> : <BriefcaseBusiness className="h-8 w-8 text-emerald-700" />}<div><p className="font-bold text-gray-900">Portal Staf</p><p className="text-xs text-gray-500">{appName || "Sistem Informasi Sekolah"}</p></div></div>
          <h2 className="text-2xl font-bold text-gray-950">Masuk ke akun Anda</h2><p className="mt-2 text-sm text-gray-500">Gunakan NIK atau email resmi dan kata sandi pribadi.</p>
          <form onSubmit={handleLogin} className="mt-8 min-w-0 space-y-5">
            <div><label htmlFor="staff-identifier" className="mb-1.5 block text-sm font-semibold text-gray-700">NIK / Email</label><div className="relative min-w-0">{identifier.includes("@") ? <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" /> : <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />}<input id="staff-identifier" autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="NIK atau email resmi" className="h-12 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></div></div>
            <div><label htmlFor="staff-password" className="mb-1.5 block text-sm font-semibold text-gray-700">Kata Sandi</label><div className="relative min-w-0"><LockKeyhole className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" /><input id="staff-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" className="h-12 w-full rounded-md border border-gray-300 bg-white pl-10 pr-11 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /><button type="button" title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
            <button disabled={isLoading || !identifier.trim() || !password} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-60">{isLoading ? "Memeriksa akun..." : "Masuk ke Portal"}{!isLoading && <ArrowRight className="h-4 w-4" />}</button>
          </form>
          <p className="mt-6 break-words border-t pt-5 text-center text-xs leading-5 text-gray-500">Belum memiliki kata sandi atau akses ditolak? Hubungi HRD/Tata Usaha untuk aktivasi akun dan verifikasi jabatan.</p>
        </section>
      </div>
    </div>
  );
};
