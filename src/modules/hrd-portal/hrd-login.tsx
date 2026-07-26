/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { PortalLoginButton, PortalLoginShell, PortalPasswordField, PortalTextField } from "../../components/auth/PortalLoginShell";

function roleName(value: any) {
  const role = Array.isArray(value?.roles) ? value.roles[0] : value?.roles;
  return role?.name;
}

export const HrdPortalLogin: React.FC = () => {
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
    <PortalLoginShell
      portalName="Portal HRD"
      description="Gunakan NIK atau email resmi dan kata sandi pribadi."
      icon={BriefcaseBusiness}
      accent="blue"
      sideNote="Ruang pengelolaan SDM untuk kehadiran, hak pegawai, kinerja, dan rekrutmen."
      footer="Belum memiliki kata sandi atau kewenangan HRD? Hubungi administrator untuk aktivasi akun dan penetapan peran."
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <PortalTextField id="hrd-identifier" label="NIK / Email" value={identifier} onChange={setIdentifier} placeholder="NIK atau email resmi" icon={identifier.includes("@") ? Mail : User} accent="blue" autoComplete="username" />
        <PortalPasswordField id="hrd-password" value={password} onChange={setPassword} accent="blue" />
        <PortalLoginButton loading={isLoading} disabled={!identifier.trim() || !password} accent="blue" />
      </form>
    </PortalLoginShell>
  );
};
