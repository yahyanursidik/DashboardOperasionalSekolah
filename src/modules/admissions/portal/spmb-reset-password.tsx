import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2 } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { PortalLoginAlert, PortalLoginButton, PortalLoginShell, PortalPasswordField } from "../../../components/auth/PortalLoginShell";

export const SpmbResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    void supabaseClient.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasRecoverySession(Boolean(data.session));
      setCheckingSession(false);
    });
    const { data: listener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasRecoverySession(true);
      setCheckingSession(false);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) { setError("Kata sandi baru harus terdiri dari minimal 8 karakter."); return; }
    if (password !== confirmation) { setError("Konfirmasi kata sandi belum sama."); return; }
    setLoading(true);
    const { error: updateError } = await supabaseClient.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message.toLowerCase().includes("different") ? "Kata sandi baru harus berbeda dari kata sandi sebelumnya." : "Kata sandi belum dapat diperbarui. Minta tautan pemulihan baru dan coba kembali.");
      return;
    }
    await supabaseClient.auth.signOut();
    navigate("/spmb/login?reset=success", { replace: true });
  };

  return <PortalLoginShell
    portalName="Portal SPMB"
    title="Buat kata sandi baru"
    description="Gunakan sedikitnya 8 karakter dan simpan kata sandi di tempat yang aman."
    icon={GraduationCap}
    accent="emerald"
    sideNote="Tautan pemulihan hanya berlaku untuk satu sesi dan memiliki batas waktu."
    footer={<Link className="font-semibold text-emerald-700 hover:underline" to="/spmb/forgot-password">Minta tautan pemulihan baru</Link>}
  >
    {checkingSession ? <div className="py-10 text-center text-sm text-slate-600"><Loader2 className="w-6 h-6 animate-spin text-emerald-700 mx-auto mb-3" />Memeriksa tautan pemulihan...</div> : !hasRecoverySession ? <PortalLoginAlert>Tautan pemulihan tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.</PortalLoginAlert> : <><>{error && <PortalLoginAlert>{error}</PortalLoginAlert>}</><form onSubmit={submit} className="space-y-5"><PortalPasswordField id="spmb-new-password" label="Kata sandi baru" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} /><PortalPasswordField id="spmb-confirm-password" label="Ulangi kata sandi baru" value={confirmation} onChange={setConfirmation} autoComplete="new-password" minLength={8} /><PortalLoginButton loading={loading} disabled={!password || !confirmation} label="Simpan Kata Sandi Baru" loadingLabel="Menyimpan..." /></form></>}
  </PortalLoginShell>;
};
