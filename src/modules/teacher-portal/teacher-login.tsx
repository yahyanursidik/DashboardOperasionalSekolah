import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { PortalLoginButton, PortalLoginShell, PortalPasswordField, PortalTextField } from "../../components/auth/PortalLoginShell";

export const TeacherLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!navigator.onLine) {
      toast.error("Tidak ada koneksi internet. Periksa jaringan Anda.");
      return;
    }

    setIsLoading(true);
    try {
      // NIK is often copied from a document with spaces.  Keep an email intact,
      // but remove all whitespace from a NIK before looking up the employee.
      const normalizedIdentifier = identifier.includes("@")
        ? identifier.trim().toLowerCase()
        : identifier.replace(/\s+/g, "");
      let { data: teacherEmail, error: lookupError } = await supabaseClient.rpc(
        "get_teacher_login_email_by_identifier",
        { p_identifier: normalizedIdentifier },
      );

      // The access-aware lookup is deliberately strict.  Fall back to the
      // employee lookup when it returns no row, so a valid employee receives
      // the correct "access/assignment" message after their password is
      // verified instead of being told that their account does not exist.
      if (lookupError || !teacherEmail) {
        const legacyLookup = await supabaseClient.rpc("get_login_email_by_identifier", { p_identifier: normalizedIdentifier });
        if (legacyLookup.data) teacherEmail = legacyLookup.data;
        lookupError = legacyLookup.error;
      }

      if (lookupError) {
        console.error("Teacher identifier lookup error:", lookupError);
        toast.error("Data akun belum dapat diperiksa. Silakan coba kembali.");
        return;
      }

      if (!teacherEmail) {
        toast.error("NIK/email belum terdaftar sebagai data pegawai aktif.");
        return;
      }

      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: teacherEmail,
        password,
      });

      if (authError || !authData.session) {
        toast.error("NIK/email atau kata sandi tidak sesuai.");
        return;
      }

      let { data: hasAccess, error: accessError } = await supabaseClient.rpc("teacher_has_portal_access");
      if (accessError) {
        const { data: employee } = await supabaseClient.from("employees").select("id, position").eq("user_id", authData.session.user.id).eq("status", "active").maybeSingle();
        const currentEmployee = employee as unknown as { id: string; position: string } | null;
        const teachingPositions = ["guru", "guru_quran", "bk", "kepala_sekolah", "wakasek", "wakasek_umum", "wakasek_kurikulum", "wakasek_kesiswaan", "kepala_unit"];
        const { data: assignment } = currentEmployee
          ? await supabaseClient.from("teacher_assignments").select("id").eq("employee_id", currentEmployee.id).eq("is_active", true).in("role_type", ["homeroom", "wali_kelas", "subject", "subject_teacher", "guru_mapel", "guru_quran", "guru_diniyah", "coordinator"]).limit(1).maybeSingle()
          : { data: null };
        hasAccess = Boolean(currentEmployee && (teachingPositions.includes(currentEmployee.position) || assignment));
        accessError = null;
      }
      if (!hasAccess) {
        await supabaseClient.auth.signOut();
        toast.error("Akun aktif, tetapi belum memiliki penugasan di portal pengajar.");
        return;
      }

      const mustChangePassword = Boolean(authData.session.user.app_metadata?.must_change_password || authData.session.user.user_metadata?.must_change_password);
      toast.success(mustChangePassword ? "Silakan buat kata sandi pribadi terlebih dahulu." : "Berhasil masuk ke Portal Pengajar.");
      navigate(mustChangePassword ? "/teacher/profile?security=required" : "/teacher", { replace: true });
    } catch (error) {
      console.error("Teacher login error:", error);
      toast.error("Login belum dapat diproses. Silakan coba kembali.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PortalLoginShell
      portalName="Portal Pengajar"
      description="Gunakan NIK atau email resmi dan kata sandi pribadi."
      icon={BookOpen}
      accent="emerald"
      sideNote="Ruang kerja pengajar untuk pembelajaran, perkembangan siswa, kehadiran, dan administrasi tugas."
      footer="Belum memiliki kata sandi atau akses ditolak? Hubungi admin sekolah untuk aktivasi akun dan verifikasi penugasan."
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <PortalTextField id="teacher-identifier" label="NIK / Email" value={identifier} onChange={setIdentifier} placeholder="NIK atau email resmi" icon={identifier.includes("@") ? Mail : User} autoComplete="username" />
        <PortalPasswordField id="teacher-password" value={password} onChange={setPassword} />
        <PortalLoginButton loading={isLoading} disabled={!identifier.trim() || !password} />
      </form>
    </PortalLoginShell>
  );
};
