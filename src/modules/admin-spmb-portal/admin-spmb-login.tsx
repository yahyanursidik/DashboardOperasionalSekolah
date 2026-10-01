/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useNavigate } from "react-router";
import { GraduationCap, Mail } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";
import {
  PortalLoginAlert,
  PortalLoginButton,
  PortalLoginShell,
  PortalPasswordField,
  PortalTextField,
} from "../../components/auth/PortalLoginShell";

export const AdminSpmbLogin: React.FC = () => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabaseClient.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      if (!data.session) throw new Error("Sesi login belum tersedia. Silakan coba lagi.");
      const access = await supabaseClient.rpc("admission_is_manager", { target_unit_id: null });
      if (access.error) throw new Error("Kewenangan panitia belum dapat diperiksa. Periksa koneksi lalu coba lagi.");
      if (access.data !== true) {
        throw new Error("Anda tidak memiliki akses ke Admin SPMB.");
      }
      navigate("/admin-spmb", { replace: true });
    } catch (caught: any) {
      setError(caught.message === "Invalid login credentials" ? "Email atau kata sandi tidak sesuai." : caught.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalLoginShell
      portalName="Admin SPMB"
      description="Gunakan email administrator SPMB dan kata sandi pribadi."
      icon={GraduationCap}
      accent="violet"
      sideNote="Ruang pengelolaan penerimaan murid baru, verifikasi berkas, seleksi, pembayaran, dan pengumuman."
      footer="Akses terbatas untuk admin SPMB dan pimpinan sekolah yang memiliki kewenangan aktif."
    >
      {error && <PortalLoginAlert>{error}</PortalLoginAlert>}
      <form onSubmit={handleLogin} className="space-y-5">
        <PortalTextField id="admin-spmb-email" label="Email" value={email} onChange={setEmail} placeholder="admin@sekolah.sch.id" icon={Mail} accent="violet" type="email" autoComplete="username" />
        <PortalPasswordField id="admin-spmb-password" value={password} onChange={setPassword} accent="violet" />
        <PortalLoginButton loading={loading} disabled={!email.trim() || !password} accent="violet" label="Masuk ke Admin SPMB" />
      </form>
    </PortalLoginShell>
  );
};
