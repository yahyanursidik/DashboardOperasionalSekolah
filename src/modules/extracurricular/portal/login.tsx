import React from "react";
import { useLogin } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Target } from "lucide-react";
import { toast } from "sonner";
import {
  PortalLoginButton,
  PortalLoginShell,
  PortalPasswordField,
  PortalTextField,
} from "../../../components/auth/PortalLoginShell";

export const ExtracurricularPortalLogin: React.FC = () => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const { mutate: login, isLoading } = useLogin();
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    login(
      { email: email.trim(), password },
      {
        onSuccess: () => navigate("/ekskul-portal"),
        onError: () => toast.error("Email atau kata sandi tidak sesuai."),
      },
    );
  };

  return (
    <PortalLoginShell
      portalName="Portal Ekstrakurikuler"
      description="Gunakan email peserta dan kata sandi yang telah didaftarkan."
      icon={Target}
      accent="rose"
      sideNote="Ruang peserta untuk jadwal kegiatan, kehadiran, capaian, dan informasi program ekstrakurikuler."
      footer={<>Belum memiliki akun? <Link className="font-semibold text-rose-700 hover:underline" to="/ekskul-portal/register">Daftar program ekstrakurikuler</Link></>}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <PortalTextField id="extracurricular-email" label="Email" value={email} onChange={setEmail} placeholder="nama@email.com" icon={Mail} accent="rose" type="email" autoComplete="username" />
        <PortalPasswordField id="extracurricular-password" value={password} onChange={setPassword} accent="rose" />
        <PortalLoginButton loading={isLoading} disabled={!email.trim() || !password} accent="rose" />
      </form>
    </PortalLoginShell>
  );
};
