import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, User, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { PortalLoginButton, PortalLoginShell, PortalPasswordField, PortalTextField } from "../../components/auth/PortalLoginShell";

type FinanceEmployee = { id?: string; full_name?: string | null; position?: string | null; status?: string | null };
type RoleRow = { roles?: { name?: string | null } | null };

export const BendaharaLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
    <PortalLoginShell
      portalName="Portal Bendahara"
      title="Masuk ke ruang kerja"
      description="Gunakan NIK atau email resmi pegawai dan kata sandi pribadi."
      icon={Wallet}
      accent="amber"
      sideNote="Ruang kerja keuangan untuk penagihan, kas, anggaran, penerimaan, dan pelaporan."
      footer="Akses hanya diberikan kepada pegawai dengan penugasan bendahara atau peran keuangan aktif."
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <PortalTextField id="finance-identifier" label="NIK / Email" value={identifier} onChange={setIdentifier} placeholder="NIK atau email resmi" icon={identifier.includes("@") ? Mail : User} accent="amber" autoComplete="username" />
        <PortalPasswordField id="finance-password" value={password} onChange={setPassword} accent="amber" />
        <PortalLoginButton loading={isLoading} disabled={!identifier.trim() || !password} accent="amber" />
      </form>
    </PortalLoginShell>
  );
};
