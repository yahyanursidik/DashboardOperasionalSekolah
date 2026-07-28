/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import {
  PortalLoginButton,
  PortalLoginShell,
  PortalTextField,
} from "../../components/auth/PortalLoginShell";

export const PortalLogin: React.FC = () => {
  const [studentIdentifier, setStudentIdentifier] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!navigator.onLine) {
      toast.error("Tidak ada koneksi internet. Periksa jaringan Anda.");
      return;
    }
    const identifier = studentIdentifier.trim();
    if (!identifier) {
      toast.error("Masukkan NIS atau NISN siswa terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    try {
      const { data: parentEmail, error: emailError } = await supabaseClient
        .rpc("get_parent_login_email_by_student", { p_nisn: identifier, p_nis: identifier });
      if (emailError || !parentEmail) {
        toast.error("Data siswa tidak ditemukan, belum tertaut ke orang tua, atau email orang tua belum diisi.");
        return;
      }

      let { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: parentEmail,
        password: "parent123",
      });
      if (authError?.message.includes("Invalid login credentials")) {
        const retry = await supabaseClient.auth.signInWithPassword({ email: parentEmail, password: "password123" });
        if (retry.error?.message.includes("Invalid login credentials")) {
          const signup = await supabaseClient.auth.signUp({
            email: parentEmail,
            password: "parent123",
            options: { data: { full_name: "Orang Tua Siswa", role: "parent" } },
          });
          authData = signup.data as any;
          authError = signup.error as any;
          if (!signup.error && !signup.data?.session) {
            const retryAfterSignup = await supabaseClient.auth.signInWithPassword({ email: parentEmail, password: "parent123" });
            authData = retryAfterSignup.data as any;
            authError = retryAfterSignup.error as any;
          }
        } else {
          authData = retry.data as any;
          authError = retry.error as any;
        }
      }
      if (authError || !authData.session) {
        toast.error("Gagal memverifikasi akses orang tua.");
        return;
      }

      const { data: accountLinked, error: linkError } = await supabaseClient.rpc("ensure_parent_portal_account");
      if (linkError || !accountLinked) {
        await supabaseClient.auth.signOut();
        toast.error("Akun orang tua belum dapat ditautkan. Hubungi Tata Usaha untuk memeriksa email dan status akun.");
        return;
      }
      toast.success("Selamat datang di Portal Orang Tua.");
      navigate("/portal", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan sistem saat login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PortalLoginShell
      portalName="Portal Orang Tua"
      title="Akses data ananda"
      description="Gunakan NIS sekolah atau NISN siswa yang sudah ditautkan dengan akun orang tua."
      icon={GraduationCap}
      accent="emerald"
      sideNote="Ruang keluarga untuk memantau perkembangan, kehadiran, pengumuman, layanan, dan administrasi ananda."
      footer="NIS atau NISN belum dapat digunakan? Hubungi Tata Usaha untuk memeriksa tautan siswa dan izin akses portal."
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <PortalTextField
          id="parent-student-identifier"
          label="NIS / NISN Siswa"
          value={studentIdentifier}
          onChange={setStudentIdentifier}
          placeholder="Masukkan NIS atau NISN"
          icon={BadgeCheck}
          inputMode="numeric"
          autoComplete="username"
          help="Pastikan data orang tua sudah tertaut pada profil siswa."
        />
        <PortalLoginButton
          loading={isLoading}
          disabled={!studentIdentifier.trim()}
          label="Masuk ke Portal Orang Tua"
          loadingLabel="Memeriksa data siswa..."
        />
      </form>
    </PortalLoginShell>
  );
};
