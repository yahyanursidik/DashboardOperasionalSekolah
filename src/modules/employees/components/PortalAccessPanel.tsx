import React, { useEffect, useState } from "react";
import { Ban, CheckCircle2, Copy, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, RefreshCw, ShieldCheck, UserCheck, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { requestEmployeeAccess } from "../employee-access-api";

type AccessAction = "provision" | "reset_password" | "disable" | "enable";

interface PortalAccessStatus {
  employeeId: string;
  portal: "teacher" | "staff";
  portalLabel: string;
  employeeActive: boolean;
  linked: boolean;
  authExists: boolean;
  enabled: boolean;
  email: string | null;
  mustChangePassword: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  passwordChangedAt: string | null;
}

interface ApiResponse {
  error?: string;
  message?: string;
  access?: PortalAccessStatus;
  temporaryPassword?: string;
}

const actionCopy: Record<AccessAction, { title: string; description: string; button: string; tone: string }> = {
  provision: { title: "Aktifkan akun portal", description: "Sistem akan membuat atau menautkan akun autentikasi dan menghasilkan kata sandi sementara.", button: "Aktifkan Akun", tone: "bg-primary text-primary-foreground hover:bg-primary/90" },
  reset_password: { title: "Reset kata sandi", description: "Kata sandi lama akan diganti. Pegawai wajib membuat kata sandi pribadi saat masuk berikutnya.", button: "Reset Kata Sandi", tone: "bg-amber-600 text-white hover:bg-amber-700" },
  disable: { title: "Nonaktifkan login portal", description: "Pegawai tidak dapat masuk hingga akses diaktifkan kembali. Data pegawai dan riwayat kerja tetap tersimpan.", button: "Nonaktifkan Login", tone: "bg-destructive text-destructive-foreground hover:bg-destructive/90" },
  enable: { title: "Aktifkan kembali login", description: "Pegawai dapat kembali masuk menggunakan NIK/email dan kata sandi terakhirnya.", button: "Aktifkan Kembali", tone: "bg-emerald-700 text-white hover:bg-emerald-800" },
};

function formatDate(value?: string | null) {
  if (!value) return "Belum pernah";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function requestAccess(employeeId: string, action: "status" | AccessAction): Promise<ApiResponse> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) throw new Error("Sesi admin tidak ditemukan. Silakan masuk kembali.");
  return requestEmployeeAccess<ApiResponse>({ employeeId, action }, session.access_token);
}

export function PortalAccessPanel({ employeeId, employeeName, employeeEmail, employeeNik, onAccessChanged }: {
  employeeId: string;
  employeeName: string;
  employeeEmail?: string | null;
  employeeNik?: string | null;
  onAccessChanged?: () => void;
}) {
  const [access, setAccess] = useState<PortalAccessStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<AccessAction | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);

  const loadStatus = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await requestAccess(employeeId, "status");
      setAccess(result.access || null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Status akun gagal dimuat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void requestAccess(employeeId, "status")
      .then((result) => {
        if (!active) return;
        setAccess(result.access || null);
        setError("");
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : "Status akun gagal dimuat.");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [employeeId]);

  const runAction = async () => {
    if (!pendingAction) return;
    setIsSubmitting(true);
    try {
      const result = await requestAccess(employeeId, pendingAction);
      if (result.access) setAccess(result.access);
      setPendingAction(null);
      if (result.temporaryPassword) {
        setTemporaryPassword(result.temporaryPassword);
        setShowTemporaryPassword(false);
      }
      toast.success(result.message || "Akses portal berhasil diperbarui.");
      onAccessChanged?.();
    } catch (requestError) {
      toast.error("Akses portal gagal diperbarui", { description: requestError instanceof Error ? requestError.message : "Silakan coba kembali." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCredentials = async () => {
    if (!temporaryPassword) return;
    const loginId = employeeNik || employeeEmail || access?.email || "NIK/email pegawai";
    await navigator.clipboard.writeText(`Akses ${access?.portalLabel || "Portal Pegawai"}\nNIK/Email: ${loginId}\nKata sandi sementara: ${temporaryPassword}\nSilakan ganti kata sandi saat pertama kali masuk.`);
    toast.success("Informasi login berhasil disalin.");
  };

  if (isLoading) return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memeriksa akses portal...</div>;
  if (error) return <div className="p-5"><div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900"><div className="flex items-start gap-3"><XCircle className="mt-0.5 h-5 w-5 shrink-0" /><div className="min-w-0"><p className="font-semibold">Status akun belum dapat dimuat</p><p className="mt-1 break-words text-sm text-red-700">{error}</p><button onClick={() => void loadStatus()} className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-xs font-semibold"><RefreshCw className="h-3.5 w-3.5" />Coba Lagi</button></div></div></div></div>;

  const accountReady = Boolean(access?.authExists && access.linked && access.enabled);
  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accountReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}><ShieldCheck className="h-5 w-5" /></div><div className="min-w-0"><h3 className="font-semibold text-foreground">Akun {access?.portalLabel || "Portal Pegawai"}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Login menggunakan NIK atau email resmi. Kata sandi dikelola oleh layanan autentikasi dan tidak tersimpan di data pegawai.</p></div></div>
        <span className={`w-max rounded-full border px-3 py-1 text-xs font-bold ${accountReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : access?.authExists && !access.enabled ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{accountReady ? "Siap Digunakan" : access?.authExists && !access.enabled ? "Login Nonaktif" : "Belum Aktif"}</span>
      </div>

      {!employeeEmail && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Email resmi belum tersedia</p><p className="mt-1 text-xs leading-5 text-amber-800">Lengkapi email pada data pegawai. NIK tetap dapat digunakan saat login, sedangkan email diperlukan sebagai identitas akun autentikasi.</p></div>}
      {!access?.employeeActive && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p className="font-semibold">Status pegawai tidak aktif</p><p className="mt-1 text-xs text-red-700">Aktifkan status kepegawaian terlebih dahulu sebelum memberikan akses portal.</p></div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-muted/20 p-4"><Mail className="h-4 w-4 text-primary" /><p className="mt-3 text-xs text-muted-foreground">Email akun</p><p className="mt-1 break-all text-sm font-semibold">{access?.email || employeeEmail || "Belum diisi"}</p></div>
        <div className="rounded-lg border bg-muted/20 p-4"><UserCheck className="h-4 w-4 text-blue-600" /><p className="mt-3 text-xs text-muted-foreground">Tautan pegawai</p><p className="mt-1 text-sm font-semibold">{access?.linked ? "Sudah tertaut" : "Belum tertaut"}</p></div>
        <div className="rounded-lg border bg-muted/20 p-4"><KeyRound className="h-4 w-4 text-amber-600" /><p className="mt-3 text-xs text-muted-foreground">Kata sandi</p><p className="mt-1 text-sm font-semibold">{access?.mustChangePassword ? "Wajib diganti" : access?.authExists ? "Pribadi" : "Belum dibuat"}</p></div>
        <div className="rounded-lg border bg-muted/20 p-4"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><p className="mt-3 text-xs text-muted-foreground">Login terakhir</p><p className="mt-1 text-sm font-semibold leading-5">{formatDate(access?.lastSignInAt)}</p></div>
      </div>

      <div className="rounded-lg border p-4"><h4 className="text-sm font-semibold">Tindakan akun</h4><p className="mt-1 text-xs text-muted-foreground">Gunakan reset hanya ketika pegawai lupa kata sandi. Kata sandi lama tidak dapat dilihat oleh admin.</p><div className="mt-4 flex flex-wrap gap-2">
        {!access?.authExists || !access.linked ? <button disabled={!employeeEmail || !access?.employeeActive} onClick={() => setPendingAction("provision")} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"><UserCheck className="h-4 w-4" />{access?.authExists ? "Tautkan Akun" : "Aktifkan Akun"}</button> : <><button onClick={() => setPendingAction("reset_password")} disabled={!access.employeeActive} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"><KeyRound className="h-4 w-4" />Reset Kata Sandi</button>{access.enabled ? <button onClick={() => setPendingAction("disable")} className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Ban className="h-4 w-4" />Nonaktifkan Login</button> : <button onClick={() => setPendingAction("enable")} disabled={!access.employeeActive} className="inline-flex items-center gap-2 rounded-md border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><ShieldCheck className="h-4 w-4" />Aktifkan Kembali</button>}</>}
        <button onClick={() => void loadStatus()} title="Muat ulang status" className="inline-flex h-10 w-10 items-center justify-center rounded-md border hover:bg-muted"><RefreshCw className="h-4 w-4" /></button>
      </div></div>

      {pendingAction && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-md rounded-lg bg-background shadow-2xl"><div className="flex items-start justify-between border-b p-5"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"><LockKeyhole className="h-5 w-5" /></div><div><h3 className="font-bold">{actionCopy[pendingAction].title}</h3><p className="mt-1 text-xs text-muted-foreground">{employeeName}</p></div></div><button disabled={isSubmitting} onClick={() => setPendingAction(null)} title="Tutup" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"><X className="h-4 w-4" /></button></div><div className="p-5"><p className="text-sm leading-6 text-muted-foreground">{actionCopy[pendingAction].description}</p><div className="mt-5 flex justify-end gap-2"><button disabled={isSubmitting} onClick={() => setPendingAction(null)} className="rounded-md border px-4 py-2 text-sm font-semibold">Batal</button><button disabled={isSubmitting} onClick={() => void runAction()} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60 ${actionCopy[pendingAction].tone}`}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{isSubmitting ? "Memproses..." : actionCopy[pendingAction].button}</button></div></div></div></div>}

      {temporaryPassword && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-md rounded-lg bg-background shadow-2xl"><div className="border-b p-5"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></div><h3 className="mt-3 font-bold">Informasi login sementara</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Sampaikan melalui kanal pribadi. Informasi ini tidak dapat ditampilkan kembali setelah jendela ditutup.</p></div><div className="space-y-3 p-5"><div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">NIK / Email</p><p className="mt-1 break-all text-sm font-semibold">{employeeNik || access?.email}</p></div><div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Kata sandi sementara</p><div className="mt-1 flex items-center gap-2"><p className="min-w-0 flex-1 break-all font-mono text-sm font-bold">{showTemporaryPassword ? temporaryPassword : "••••••••••••••"}</p><button onClick={() => setShowTemporaryPassword((value) => !value)} title={showTemporaryPassword ? "Sembunyikan" : "Tampilkan"} className="flex h-8 w-8 items-center justify-center rounded-md border">{showTemporaryPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div><div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Pegawai akan diarahkan ke Profil & Keamanan untuk membuat kata sandi pribadi sebelum menggunakan fitur portal lainnya.</div><div className="flex justify-end gap-2 pt-2"><button onClick={() => void copyCredentials()} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold"><Copy className="h-4 w-4" />Salin Informasi</button><button onClick={() => { setTemporaryPassword(""); setShowTemporaryPassword(false); }} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Selesai</button></div></div></div></div>}
    </div>
  );
}
