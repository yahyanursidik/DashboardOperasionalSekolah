import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound, LockKeyhole, Mail, User, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { useSystemSettings } from "../../app/providers/SettingsProvider";

type FinanceEmployee = { id?: string; full_name?: string | null; position?: string | null; status?: string | null };
type RoleRow = { roles?: { name?: string | null } | null };

export const BendaharaLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { appName, logoUrl, loginCoverUrl } = useSystemSettings();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = identifier.trim();
    if (!value) return;
    if (!navigator.onLine) {
      toast.error("Tidak ada koneksi internet. Periksa jaringan Anda.");
      return;
    }

    setIsLoading(true);
    try {
      const { data: resolvedEmail, error: resolveError } = await supabaseClient.rpc("get_finance_login_email_by_identifier", { p_identifier: value });
      if (resolveError || !resolvedEmail) {
        toast.error("Akun tidak ditemukan. Pastikan NIK atau email benar.");
        return;
      }

      const email = String(resolvedEmail).trim();
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (authError || !authData.session) {
        toast.error("Kata sandi tidak sesuai atau akun belum aktif. Hubungi administrator sekolah bila akses belum dibuat.");
        return;
      }

      await supabaseClient.rpc("link_my_account");
      const [employeeResult, rolesResult] = await Promise.all([
        supabaseClient.from("employees").select("id, full_name, position, status").eq("user_id", authData.user.id).maybeSingle(),
        supabaseClient.from("user_roles").select("roles(name)").eq("user_id", authData.user.id),
      ]);
      const employee = employeeResult.data as FinanceEmployee | null;
      const position = String(employee?.position || "").toLowerCase();
      const roleNames = ((rolesResult.data || []) as RoleRow[]).map((item) => item.roles?.name).filter((name): name is string => Boolean(name));
      const allowed = position.includes("bendahara") || position.includes("keuangan") || roleNames.some((role: string) => ["super_admin", "ketua_yayasan", "kepala_tu", "admin_keuangan"].includes(role));
      if (!allowed || employee?.status === "inactive") {
        await supabaseClient.auth.signOut();
        toast.error("Akun ini tidak memiliki penugasan aktif sebagai bendahara/keuangan.");
        return;
      }

      toast.success("Selamat datang di Portal Bendahara.");
      navigate("/bendahara");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan saat memverifikasi akun.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 flex items-center justify-center" style={loginCoverUrl ? { backgroundImage: `url(${loginCoverUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : {}}>
      {loginCoverUrl && <div className="fixed inset-0 bg-slate-950/55" />}
      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-lg border bg-white shadow-xl md:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-between bg-emerald-800 p-8 text-white md:p-10">
          <div>
            {logoUrl ? <img src={logoUrl} alt="Logo sekolah" className="mb-8 h-16 w-16 rounded-lg bg-white object-contain p-2" /> : <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-lg bg-white text-emerald-800"><Wallet className="h-7 w-7" /></div>}
            <h1 className="text-2xl font-bold">Portal Bendahara</h1>
            <p className="mt-3 text-sm leading-6 text-emerald-100">Kelola penagihan, kas, anggaran, dan laporan keuangan sekolah dari satu ruang kerja.</p>
          </div>
          <p className="mt-10 text-xs text-emerald-200">{appName || "Sistem Informasi Sekolah"}</p>
        </div>

        <div className="p-8 md:p-10">
          <div className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-amber-50 text-amber-700"><KeyRound className="h-5 w-5" /></div>
            <h2 className="text-xl font-bold">Masuk ke ruang kerja</h2>
            <p className="mt-1 text-sm text-muted-foreground">Gunakan NIK atau email resmi pegawai.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">NIK / Email</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">{identifier.includes("@") ? <Mail className="h-5 w-5" /> : <User className="h-5 w-5" />}</span>
                <input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Masukkan NIK atau email resmi" className="w-full rounded-md border py-3 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Kata Sandi</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi akun" className="w-full rounded-md border py-3 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" />
              </div>
            </label>
            <button disabled={isLoading || !identifier.trim() || !password} className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{isLoading ? "Memeriksa akun..." : "Masuk ke Portal"}{!isLoading && <ArrowRight className="h-5 w-5" />}</button>
          </form>
          <p className="mt-8 border-t pt-5 text-xs text-muted-foreground">Akses hanya diberikan kepada pegawai dengan penugasan bendahara atau peran keuangan aktif.</p>
        </div>
      </div>
    </div>
  );
};
