import React from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import {
  PortalLoginAlert,
  PortalLoginButton,
  PortalLoginShell,
  PortalTextField,
} from "../../components/auth/PortalLoginShell";

export const CbtPortalLogin: React.FC = () => {
  const [token, setToken] = React.useState("");
  const [error, setError] = React.useState("");
  const navigate = useNavigate();

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    const value = token.trim().toUpperCase();
    if (!value) {
      setError("Token ujian wajib diisi.");
      return;
    }
    navigate(`/cbt/test/${value}`);
  };

  return (
    <PortalLoginShell
      portalName="Ujian CBT"
      title="Masukkan token ujian"
      description="Gunakan token yang diberikan panitia atau administrator ujian."
      icon={KeyRound}
      accent="violet"
      sideNote="Ruang ujian terkontrol untuk peserta yang telah menerima token aktif."
      footer="Pastikan perangkat memiliki daya yang cukup dan koneksi internet stabil sebelum memulai."
    >
      {error && <PortalLoginAlert>{error}</PortalLoginAlert>}
      <form onSubmit={handleLogin} className="space-y-5">
        <PortalTextField
          id="cbt-token"
          label="Token Ujian"
          value={token}
          onChange={(value) => { setToken(value); setError(""); }}
          placeholder="Contoh: X7B9K2"
          icon={KeyRound}
          accent="violet"
          maxLength={10}
          uppercase
          autoComplete="one-time-code"
        />
        <PortalLoginButton loading={false} disabled={!token.trim()} accent="violet" label="Masuk ke Ruang Ujian" />
      </form>
    </PortalLoginShell>
  );
};
