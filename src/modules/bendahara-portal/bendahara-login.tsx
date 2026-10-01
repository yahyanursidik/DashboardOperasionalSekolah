import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, User, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { loadEmployeePortalWorkspace, normalizeEmployeeIdentifier, portalAccessMessage } from "../../lib/supabase/employee-portal-access";
import { PortalLoginButton, PortalLoginShell, PortalPasswordField, PortalTextField } from "../../components/auth/PortalLoginShell";

export const BendaharaLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = normalizeEmployeeIdentifier(identifier);
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

      const linked = await supabaseClient.rpc("link_my_account");
      if (linked.error) { toast.error("Tautan akun belum dapat diperiksa. Coba lagi atau hubungi admin sekolah."); return; }
      await loadEmployeePortalWorkspace(supabaseClient, authData.session.user.id, "bendahara");

      toast.success("Selamat datang di Portal Bendahara.");
      navigate("/bendahara");
    } catch (error: unknown) {
      toast.error(portalAccessMessage(error));
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
