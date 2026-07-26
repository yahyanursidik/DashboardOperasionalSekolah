import React from "react";
import { useLogin } from "@refinedev/core";
import { LayoutDashboard, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  PortalLoginButton,
  PortalLoginShell,
  PortalPasswordField,
  PortalTextField,
} from "../../components/auth/PortalLoginShell";

export const LoginPage: React.FC = () => {
  const { mutate: login, isLoading } = useLogin();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login(
      { email: email.trim(), password },
      { onError: () => toast.error("Email atau kata sandi tidak sesuai.") },
    );
  };

  return (
    <PortalLoginShell
      portalName="Admin Sekolah"
      description="Gunakan email akun administrator dan kata sandi pribadi."
      icon={LayoutDashboard}
      accent="emerald"
      sideNote="Pusat kendali akademik, operasional, SDM, keuangan, dan layanan sekolah."
      footer="Akses admin diberikan sesuai peran dan unit kerja. Hubungi administrator utama bila akun belum aktif."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <PortalTextField id="admin-email" label="Email" value={email} onChange={setEmail} placeholder="nama@sekolah.sch.id" icon={Mail} type="email" autoComplete="username" />
        <PortalPasswordField id="admin-password" value={password} onChange={setPassword} />
        <PortalLoginButton loading={isLoading} disabled={!email.trim() || !password} label="Masuk ke Admin" />
      </form>
    </PortalLoginShell>
  );
};
