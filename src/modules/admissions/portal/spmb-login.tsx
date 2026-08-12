import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GraduationCap, Mail } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { PortalLoginAlert, PortalLoginButton, PortalLoginShell, PortalPasswordField, PortalTextField } from "../../../components/auth/PortalLoginShell";

export const SpmbLogin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error: authError } = await supabaseClient.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (authError) {
      setError("Email atau kata sandi tidak sesuai. Periksa kembali data akun Anda.");
      return;
    }
    navigate("/spmb", { replace: true });
  };

  return (
    <PortalLoginShell
      portalName="Portal SPMB"
      title="Lanjutkan pendaftaran"
      description="Masuk untuk melengkapi formulir dan memantau proses penerimaan murid baru."
      icon={GraduationCap}
      accent="emerald"
      sideNote="Ruang keluarga untuk mengelola formulir, dokumen, pembayaran, dan hasil seleksi SPMB."
      footer={<>Belum memiliki akun? <Link className="font-semibold text-emerald-700 hover:underline" to="/spmb/register">Buat akun pendaftaran</Link></>}
    >
      {error && <PortalLoginAlert>{error}</PortalLoginAlert>}
      {searchParams.get("reset") === "success" && <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-5 text-emerald-800">Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.</div>}
      <form onSubmit={handleLogin} className="space-y-5">
        <PortalTextField id="spmb-email" label="Email" value={email} onChange={setEmail} placeholder="orangtua@email.com" icon={Mail} type="email" autoComplete="username" />
        <PortalPasswordField id="spmb-password" value={password} onChange={setPassword} />
        <div className="text-right"><Link to="/spmb/forgot-password" className="text-sm font-semibold text-emerald-700 hover:underline">Lupa kata sandi?</Link></div>
        <PortalLoginButton loading={loading} disabled={!email.trim() || !password} label="Masuk ke Portal SPMB" />
      </form>
    </PortalLoginShell>
  );
};
