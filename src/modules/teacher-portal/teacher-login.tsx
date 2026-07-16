import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Eye, EyeOff, LockKeyhole, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { useSystemSettings } from "../../app/providers/SettingsProvider";
import { supabaseClient } from "../../lib/supabase/client";

export const TeacherLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { appName, logoUrl, loginCoverUrl } = useSystemSettings();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!navigator.onLine) {
      toast.error("Tidak ada koneksi internet. Periksa jaringan Anda.");
      return;
    }

    setIsLoading(true);
    try {
      const normalizedIdentifier = identifier.trim();
      let { data: teacherEmail, error: lookupError } = await supabaseClient.rpc(
        "get_teacher_login_email_by_identifier",
        { p_identifier: normalizedIdentifier },
      );

      // Compatibility while the quality migration is waiting to be applied.
      if (lookupError) {
        const legacyLookup = await supabaseClient.rpc("get_login_email_by_identifier", { p_identifier: normalizedIdentifier });
        teacherEmail = legacyLookup.data;
        lookupError = legacyLookup.error;
      }

      if (lookupError || !teacherEmail) {
        toast.error("Akun pengajar tidak ditemukan atau belum memiliki penugasan aktif.");
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
    <div
      className="min-h-screen bg-muted/40 px-4 py-8 sm:flex sm:items-center sm:justify-center"
      style={loginCoverUrl ? { backgroundImage: `linear-gradient(rgba(3, 46, 35, .78), rgba(3, 46, 35, .9)), url(${loginCoverUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}
    >
      <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-lg border border-white/15 bg-white shadow-2xl md:grid-cols-[.85fr_1.15fr]">
        <section className="hidden bg-primary p-10 text-primary-foreground md:flex md:flex-col md:justify-between">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt={appName || "Logo sekolah"} className="h-16 max-w-40 rounded-md bg-white p-2 object-contain" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-white text-primary"><BookOpen className="h-7 w-7" /></div>
            )}
            <h1 className="mt-8 text-3xl font-bold">Portal Pengajar</h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-primary-foreground/80">Akses jadwal, kelas, penilaian, jurnal, absensi, dan administrasi kerja dalam satu ruang.</p>
          </div>
          <p className="text-xs text-primary-foreground/70">{appName || "Sistem Informasi Sekolah"}</p>
        </section>

        <section className="min-w-0 p-6 sm:p-10">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            {logoUrl ? <img src={logoUrl} alt="Logo sekolah" className="h-11 w-11 rounded-md border object-contain p-1" /> : <BookOpen className="h-8 w-8 text-primary" />}
            <div><p className="font-bold text-foreground">Portal Pengajar</p><p className="text-xs text-muted-foreground">{appName || "Sistem Informasi Sekolah"}</p></div>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Masuk ke akun Anda</h2>
          <p className="mt-2 text-sm text-muted-foreground">Gunakan NIK atau email resmi dan kata sandi pribadi.</p>

          <form onSubmit={handleLogin} className="min-w-0 space-y-5 mt-8">
            <div>
              <label htmlFor="teacher-identifier" className="mb-1.5 block text-sm font-semibold text-foreground">NIK / Email</label>
              <div className="relative min-w-0">
                {identifier.includes("@") ? <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" /> : <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />}
                <input id="teacher-identifier" autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="NIK atau email resmi" className="h-12 w-full rounded-md border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
              </div>
            </div>

            <div>
              <label htmlFor="teacher-password" className="mb-1.5 block text-sm font-semibold text-foreground">Kata Sandi</label>
              <div className="relative min-w-0">
                <LockKeyhole className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input id="teacher-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" className="h-12 w-full rounded-md border bg-background pl-10 pr-11 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading || !identifier.trim() || !password} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? "Memeriksa akun..." : "Masuk ke Portal"}
              {!isLoading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 break-words border-t pt-5 text-center text-xs leading-5 text-gray-500">Belum memiliki kata sandi atau akses ditolak? Hubungi admin sekolah untuk aktivasi akun dan verifikasi penugasan.</p>
        </section>
      </div>
    </div>
  );
};
