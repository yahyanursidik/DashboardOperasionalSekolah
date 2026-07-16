/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, LockKeyhole, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { useSystemSettings } from "../../app/providers/SettingsProvider";
import { supabaseClient } from "../../lib/supabase/client";

function roleName(value: any) {
  const role = Array.isArray(value?.roles) ? value.roles[0] : value?.roles;
  return role?.name;
}

export const HrdPortalLogin: React.FC = () => {
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
      let email = normalizedIdentifier.includes("@") ? normalizedIdentifier : null;
      if (!email) {
        const lookup = await supabaseClient.rpc("get_login_email_by_identifier", { p_identifier: normalizedIdentifier });
        if (lookup.error || !lookup.data) {
          toast.error("Akun HRD tidak ditemukan atau belum diaktifkan.");
          return;
        }
        email = String(lookup.data);
      }

      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (authError || !authData.session) {
        toast.error("NIK/email atau kata sandi tidak sesuai.");
        return;
      }

      const [{ data: userRoles }, { data: employee }] = await Promise.all([
        supabaseClient.from("user_roles").select("roles(name)").eq("user_id", authData.session.user.id),
        supabaseClient.from("employees").select("id,status").eq("user_id", authData.session.user.id).eq("status", "active").maybeSingle(),
      ]);
      const hasAccess = Boolean(employee) && (userRoles || []).some((value: any) => ["hrd", "super_admin", "ketua_yayasan"].includes(roleName(value)));
      if (!hasAccess) {
        await supabaseClient.auth.signOut();
        toast.error("Akun aktif, tetapi belum memiliki kewenangan HRD.");
        return;
      }

      toast.success("Berhasil masuk ke Portal HRD.");
      navigate("/hrd", { replace: true });
    } catch (error: any) {
      console.error("HRD login error:", error);
      toast.error(error?.message || "Login belum dapat diproses.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8 sm:flex sm:items-center sm:justify-center" style={loginCoverUrl ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, .72), rgba(15, 23, 42, .82)), url(${loginCoverUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>
      <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-lg border bg-card shadow-2xl md:grid-cols-[.85fr_1.15fr]">
        <section className="hidden bg-primary p-10 text-primary-foreground md:flex md:flex-col md:justify-between">
          <div>
            {logoUrl ? <img src={logoUrl} alt={appName || "Logo sekolah"} className="h-16 max-w-40 rounded-md bg-white p-2 object-contain" /> : <div className="flex h-14 w-14 items-center justify-center rounded-md bg-white text-primary"><BriefcaseBusiness className="h-7 w-7" /></div>}
            <h1 className="mt-8 text-3xl font-bold">Portal HRD</h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-primary-foreground/80">Kelola siklus SDM, kehadiran, hak pegawai, kinerja, dan rekrutmen dalam satu pusat kerja.</p>
          </div>
          <p className="text-xs text-primary-foreground/70">{appName || "Sistem Informasi Sekolah"}</p>
        </section>

        <section className="min-w-0 p-6 sm:p-10">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            {logoUrl ? <img src={logoUrl} alt="Logo sekolah" className="h-11 w-11 rounded-md border object-contain p-1" /> : <BriefcaseBusiness className="h-8 w-8 text-primary" />}
            <div><p className="font-bold">Portal HRD</p><p className="text-xs text-muted-foreground">{appName || "Sistem Informasi Sekolah"}</p></div>
          </div>

          <h2 className="text-2xl font-bold">Masuk ke akun Anda</h2>
          <p className="mt-2 text-sm text-muted-foreground">Gunakan NIK atau email resmi dan kata sandi pribadi.</p>

          <form onSubmit={handleLogin} className="mt-8 min-w-0 space-y-5">
            <div>
              <label htmlFor="hrd-identifier" className="mb-1.5 block text-sm font-semibold">NIK / Email</label>
              <div className="relative min-w-0">
                {identifier.includes("@") ? <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" /> : <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />}
                <input id="hrd-identifier" autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="NIK atau email resmi" className="h-12 w-full rounded-md border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
              </div>
            </div>

            <div>
              <label htmlFor="hrd-password" className="mb-1.5 block text-sm font-semibold">Kata Sandi</label>
              <div className="relative min-w-0">
                <LockKeyhole className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <input id="hrd-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" className="h-12 w-full rounded-md border bg-background pl-10 pr-11 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>

            <button type="submit" disabled={isLoading || !identifier.trim() || !password} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? "Memeriksa akun..." : "Masuk ke Portal"}{!isLoading ? <ArrowRight className="h-4 w-4" /> : null}</button>
          </form>

          <p className="mt-6 break-words border-t pt-5 text-center text-xs leading-5 text-muted-foreground">Belum memiliki kata sandi atau kewenangan HRD? Hubungi administrator untuk aktivasi akun dan penetapan peran.</p>
        </section>
      </div>
    </div>
  );
};
