import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { GraduationCap, Mail } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { PortalLoginAlert, PortalLoginButton, PortalLoginShell, PortalPasswordField, PortalTextField } from "../../../components/auth/PortalLoginShell";
import { SpmbNewParentCta, SpmbRegistrationSteps } from "./spmb-auth-guide";

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
      title="Masuk untuk melanjutkan"
      description="Lanjutkan formulir, unggah berkas, dan pantau informasi pendaftaran anak dalam satu tempat."
      icon={GraduationCap}
      accent="emerald"
      sideNote="Ruang keluarga untuk mengelola formulir, dokumen, pembayaran, dan hasil seleksi SPMB."
      footer={<span>Sudah memiliki akun tetapi tidak bisa masuk? <Link className="font-semibold text-emerald-700 hover:underline" to="/spmb/forgot-password">Pulihkan kata sandi</Link></span>}
    >
      {error && <PortalLoginAlert>{error}</PortalLoginAlert>}
      {searchParams.get("reset") === "success" && <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-5 text-emerald-800">Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.</div>}
      <SpmbNewParentCta />
      <form onSubmit={handleLogin} className="mt-6 space-y-5">
        <div className="pt-1"><p className="text-sm font-bold text-slate-900">Sudah memiliki akun?</p><p className="mt-1 text-xs leading-5 text-slate-600">Masukkan email dan kata sandi yang digunakan saat membuat akun.</p></div>
        <PortalTextField id="spmb-email" label="Email akun" value={email} onChange={setEmail} placeholder="orangtua@email.com" icon={Mail} type="email" autoComplete="username" />
        <PortalPasswordField id="spmb-password" value={password} onChange={setPassword} />
        <div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">Lupa sandi atau akun terkunci?</span><Link to="/spmb/forgot-password" className="shrink-0 text-sm font-semibold text-emerald-700 hover:underline">Pulihkan akun</Link></div>
        <PortalLoginButton loading={loading} disabled={!email.trim() || !password} label="Masuk ke Portal SPMB" />
      </form>
      <div className="mt-6"><SpmbRegistrationSteps compact /></div>
    </PortalLoginShell>
  );
};
