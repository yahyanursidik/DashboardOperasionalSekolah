/* Hallmark · pre-emit critique: P5 H5 E5 S5 R4 V4
 * macrostructure: Split workflow · theme: project-native eye-care emerald
 * navigation: N9-inspired edge actions · footer: Ft2-inspired inline rule
 */
import React from "react";
import { ArrowRight, CheckCircle2, CreditCard, FilePenLine, FileUp, LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { Link } from "react-router";

export const SpmbNewParentCta = () => (
  <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
    <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-emerald-700 text-white"><UserPlus className="h-5 w-5" /></span><div className="min-w-0"><p className="font-bold text-emerald-950">Baru pertama kali mendaftar?</p><p className="mt-1 text-sm leading-5 text-emerald-900">Buat akun orang tua lebih dulu. Anda dapat menyimpan formulir dan melanjutkannya kapan saja.</p></div></div>
    <Link to="/spmb/register" className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"><UserPlus className="h-4 w-4" />Buat Akun Orang Tua<ArrowRight className="h-4 w-4" /></Link>
  </section>
);

export const SpmbRegistrationSteps = ({ compact = false }: { compact?: boolean }) => {
  const steps = [
    { icon: UserPlus, title: "Buat akun", text: "Gunakan email dan WhatsApp aktif." },
    { icon: FilePenLine, title: "Isi data", text: "Simpan data awal calon murid." },
    { icon: FileUp, title: "Lengkapi berkas", text: "Unggah dokumen dan bukti biaya." },
    { icon: CreditCard, title: "Kirim pendaftaran", text: "Panitia mulai memeriksa kelengkapan." },
  ];
  return <section aria-label="Cara mendaftar" className={`rounded-lg border bg-white ${compact ? "p-4" : "p-5"}`}><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Cara mendaftar</p><ol className={`mt-4 ${compact ? "grid grid-cols-2 gap-3" : "space-y-4"}`}>{steps.map(({ icon: Icon, title, text }, index) => <li key={title} className="flex min-w-0 gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-emerald-800"><Icon className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Tahap {index + 1}</span></span><div className="min-w-0"><p className="text-sm font-bold text-slate-900">{title}</p>{!compact && <p className="mt-0.5 text-xs leading-5 text-slate-600">{text}</p>}</div></li>)}</ol></section>;
};

export const SpmbExistingAccountCta = () => <Link to="/spmb/login" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-emerald-300 bg-white px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"><LogIn className="h-4 w-4" />Saya Sudah Memiliki Akun</Link>;

export const SpmbAuthSafetyNote = () => <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />Gunakan email pribadi yang dapat diakses. Kata sandi tidak pernah ditampilkan kepada panitia.</p>;

export const SpmbSuccessHint = ({ children }: { children: React.ReactNode }) => <div className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-5 text-emerald-900"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />{children}</div>;
