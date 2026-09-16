import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Phone, User } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { PortalLoginAlert, PortalLoginButton, PortalLoginShell, PortalPasswordField, PortalTextField } from "../../../components/auth/PortalLoginShell";
import { SpmbAuthSafetyNote, SpmbExistingAccountCta, SpmbRegistrationSteps, SpmbSuccessHint } from "./spmb-auth-guide";

export const SpmbRegister: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabaseClient.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { full_name: form.name.trim(), phone: form.phone.trim(), portal: "spmb" } },
    });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message.includes("already") ? "Email ini sudah terdaftar. Silakan masuk dengan akun yang tersedia." : error.message });
      return;
    }
    if (data.session) navigate("/spmb/form", { replace: true });
    else setMessage({ type: "success", text: "Akun berhasil dibuat. Periksa email untuk konfirmasi, lalu masuk ke Portal SPMB." });
  };

  return <PortalLoginShell
    portalName="Portal SPMB"
    title="Buat akun orang tua"
    description="Mulai dengan satu akun untuk menyimpan formulir, berkas, pembayaran, dan seluruh informasi pendaftaran anak."
    icon={GraduationCap}
    accent="emerald"
    sideNote="Akun dibuat oleh orang tua atau wali. Setelah itu pendaftaran dapat disimpan sebagai draf dan dilanjutkan kapan pun."
    footer={<span>Sudah pernah membuat akun? <Link className="font-semibold text-emerald-700 hover:underline" to="/spmb/login">Masuk ke Portal SPMB</Link></span>}
  >
    {message?.type === "error" && <PortalLoginAlert>{message.text}</PortalLoginAlert>}
    {message?.type === "success" ? <div className="space-y-5"><SpmbSuccessHint><div><p className="font-bold">Akun berhasil dibuat</p><p className="mt-1">{message.text}</p></div></SpmbSuccessHint><SpmbExistingAccountCta /></div> : <>
      <SpmbRegistrationSteps />
      <form onSubmit={submit} className="mt-6 space-y-5">
        <PortalTextField id="spmb-register-name" label="Nama orang tua / wali" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="Sesuai identitas resmi" icon={User} autoComplete="name" />
        <PortalTextField id="spmb-register-phone" label="Nomor WhatsApp aktif" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} placeholder="08xxxxxxxxxx" icon={Phone} type="tel" autoComplete="tel" inputMode="tel" />
        <PortalTextField id="spmb-register-email" label="Email pribadi" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} placeholder="orangtua@email.com" icon={Mail} type="email" autoComplete="email" />
        <PortalPasswordField id="spmb-register-password" label="Buat kata sandi" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} autoComplete="new-password" minLength={8} />
        <SpmbAuthSafetyNote />
        <PortalLoginButton loading={loading} disabled={!form.name.trim() || !form.phone.trim() || !form.email.trim() || form.password.length < 8} label="Buat Akun & Mulai Formulir" loadingLabel="Membuat akun..." />
      </form>
      <div className="mt-4"><SpmbExistingAccountCta /></div>
    </>}
  </PortalLoginShell>;
};
