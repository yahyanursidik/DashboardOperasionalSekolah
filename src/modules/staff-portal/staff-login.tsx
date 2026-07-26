import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { staffPortalPositions } from "./staff-utils";
import { PortalLoginButton, PortalLoginShell, PortalPasswordField, PortalTextField } from "../../components/auth/PortalLoginShell";

export const StaffLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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

      const mustChangePassword = Boolean(authData.session.user.app_metadata?.must_change_password || authData.session.user.user_metadata?.must_change_password);
      toast.success(mustChangePassword ? "Silakan buat kata sandi pribadi terlebih dahulu." : "Berhasil masuk ke Portal Staf.");
      navigate(mustChangePassword ? "/staff/profile?security=required" : "/staff", { replace: true });
    } catch (error) {
      console.error("Staff login error:", error);
      toast.error("Login belum dapat diproses. Silakan coba kembali.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PortalLoginShell
      portalName="Portal Staf"
      description="Gunakan NIK atau email resmi dan kata sandi pribadi."
      icon={BriefcaseBusiness}
      accent="cyan"
      sideNote="Ruang kerja operasional untuk jadwal, kehadiran, izin, tugas, dan laporan staf."
      footer="Belum memiliki kata sandi atau akses ditolak? Hubungi HRD/Tata Usaha untuk aktivasi akun dan verifikasi jabatan."
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <PortalTextField id="staff-identifier" label="NIK / Email" value={identifier} onChange={setIdentifier} placeholder="NIK atau email resmi" icon={identifier.includes("@") ? Mail : User} accent="cyan" autoComplete="username" />
        <PortalPasswordField id="staff-password" value={password} onChange={setPassword} accent="cyan" />
        <PortalLoginButton loading={isLoading} disabled={!identifier.trim() || !password} accent="cyan" />
      </form>
    </PortalLoginShell>
  );
};
