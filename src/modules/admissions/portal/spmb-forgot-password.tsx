import React, { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Mail } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { PortalLoginAlert, PortalLoginButton, PortalLoginShell, PortalTextField } from "../../../components/auth/PortalLoginShell";

export const SpmbForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const redirectTo = `${window.location.origin}/spmb/reset-password`;
    const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (resetError) {
      setError(resetError.message.toLowerCase().includes("rate") ? "Permintaan terlalu sering. Tunggu beberapa menit lalu coba kembali." : "Tautan pemulihan belum dapat dikirim. Periksa alamat email dan coba kembali.");
      return;
    }
    setSent(true);
  };

  return <PortalLoginShell
    portalName="Portal SPMB"
    title="Pulihkan kata sandi"
    description="Masukkan email akun orang tua / wali. Kami akan mengirim tautan aman untuk membuat kata sandi baru."
    icon={GraduationCap}
    accent="emerald"
    sideNote="Pemulihan akun mandiri untuk melanjutkan formulir dan memantau proses SPMB."
    footer={<Link className="font-semibold text-emerald-700 hover:underline" to="/spmb/login">Kembali ke halaman masuk</Link>}
  >
    {error && <PortalLoginAlert>{error}</PortalLoginAlert>}
    {sent ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><p className="font-bold">Periksa email Anda</p><p className="mt-1">Jika email terdaftar, tautan pemulihan telah dikirim. Periksa juga folder spam atau promosi.</p><button type="button" onClick={() => setSent(false)} className="mt-4 font-semibold text-emerald-800 underline underline-offset-4">Kirim ulang ke email lain</button></div> : <form onSubmit={submit} className="space-y-5"><PortalTextField id="spmb-recovery-email" label="Email akun SPMB" value={email} onChange={setEmail} placeholder="orangtua@email.com" icon={Mail} type="email" autoComplete="email" /><PortalLoginButton loading={loading} disabled={!email.trim()} label="Kirim Tautan Pemulihan" loadingLabel="Mengirim tautan..." /></form>}
  </PortalLoginShell>;
};
