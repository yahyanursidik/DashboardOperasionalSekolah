/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Copy, CreditCard, ExternalLink, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useSystemSettings } from "../../../app/providers/SettingsProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { deleteStoredFile, getDocumentSignedUrl, uploadDocument } from "../../../lib/supabase/storage";
import { ADMISSION_FILE_ACCEPT, admissionUploadError } from "../admission-upload";
import { useSpmbPortal } from "./spmb-context";

const db = supabaseClient as any;

export const SpmbPayment: React.FC = () => {
  const { applicant } = useSpmbPortal();
  const { financeBankName, financeAccountNumber, financeAccountName } = useSystemSettings();
  const [payments, setPayments] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [paymentLoadError, setPaymentLoadError] = useState("");
  const latest = payments[0];
  const load = async (showError = false) => {
    if (!applicant?.id) {
      setPayments([]);
      setLoadingPayment(false);
      return null;
    }
    setLoadingPayment(true);
    setPaymentLoadError("");
    try {
      const { data, error } = await db.from("admission_payments")
        .select("*")
        .eq("applicant_id", applicant.id)
        .eq("payment_type", "registration")
        .maybeSingle();
      if (error) throw error;
      setPayments(data ? [data] : []);
      return data;
    } catch (error: any) {
      const message = error?.message || "Data bukti pembayaran belum dapat dimuat.";
      setPaymentLoadError(message);
      if (showError) toast.error(`Bukti pembayaran belum dapat dimuat: ${message}`);
      // Keep the last known proof visible rather than replacing it with an empty state.
      return null;
    } finally {
      setLoadingPayment(false);
    }
  };
  useEffect(() => { void load(); }, [applicant?.id]);
  useEffect(() => { if (applicant?.registration_fee_amount != null) setAmount(String(applicant.registration_fee_amount)); }, [applicant]);
  const copyAccount = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} disalin.`);
    } catch {
      toast.error("Nomor rekening belum dapat disalin. Silakan tekan dan salin secara manual.");
    }
  };
  const openProof = async () => {
    if (!latest?.proof_url) return;
    try {
      const url = await getDocumentSignedUrl(latest.proof_url, 300);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error(`Bukti pembayaran belum dapat dibuka: ${error?.message || "silakan coba lagi."}`);
    }
  };

  const submit = async (file?: File) => {
    if (!applicant || !file || !amount || Number(amount) <= 0) { toast.error("Isi nominal dan pilih bukti pembayaran."); return; }
    const validationError = admissionUploadError(file, 3 * 1024 * 1024);
    if (validationError) { toast.error(validationError); return; }
    setLoading(true);
    let uploadedPath: string | null = null;
    try {
      const uploaded = await uploadDocument(file, `admissions/${applicant.id}/payments`);
      uploadedPath = uploaded.filePath;
      const { data, error } = await db.rpc("admission_save_registration_payment", {
        p_applicant_id: applicant.id,
        p_amount: Number(amount),
        p_paid_at: paidAt,
        p_proof_url: uploaded.filePath,
      });
      if (error) throw error;
      const savedPayment = Array.isArray(data) ? data[0] : data;
      if (!savedPayment?.id) throw new Error("Bukti pembayaran belum menerima konfirmasi dari sistem.");
      if (latest?.proof_url && latest.proof_url !== uploaded.filePath) void deleteStoredFile(latest.proof_url).catch(() => undefined);
      setPayments(savedPayment ? [savedPayment] : []);
      toast.success("Bukti pembayaran tersimpan dan dikirim untuk diverifikasi."); await load();
    } catch (error: any) {
      if (uploadedPath) void deleteStoredFile(uploadedPath).catch(() => undefined);
      toast.error(`Pembayaran belum dapat dikirim: ${error.message}`);
    }
    finally { setLoading(false); }
  };

  if (!applicant) return <div className="max-w-xl mx-auto bg-white border rounded-lg p-8 text-center"><AlertCircle className="w-8 h-8 text-amber-600 mx-auto" /><h1 className="font-bold text-xl mt-4">Formulir belum tersedia</h1><p className="text-slate-600 mt-2">Simpan formulir calon murid terlebih dahulu.</p></div>;
  const fee = applicant.registration_fee_amount == null ? null : Number(applicant.registration_fee_amount);
  const staffPending = applicant.registration_fee_category === "foundation_staff" && applicant.staff_fee_status === "pending" && fee == null;
  const isWaived = fee === 0 && applicant.staff_fee_status === "approved";
  const paymentReady = isWaived || ["submitted", "verified", "waived"].includes(latest?.status);
  const canReplaceProof = ["draft", "submitted", "documents_review"].includes(applicant.workflow_status || "draft");
  return (
    <div className="max-w-3xl mx-auto space-y-6"><Link to="/spmb" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"><ArrowLeft className="w-4 h-4" />Ringkasan pendaftaran</Link><div><p className="text-sm font-semibold text-emerald-700">Tahap 3 dari 4 · {applicant.name}</p><h1 className="text-2xl sm:text-3xl font-bold">Biaya Pendaftaran</h1><p className="text-slate-600 mt-2">Bukti transfer diperiksa panitia keuangan dan tercatat untuk anak ini. Setelah itu Anda dapat meninjau lalu mengirim pendaftaran.</p></div>
      <section className="bg-white border rounded-lg p-5 sm:p-6"><div className="flex items-start gap-4"><div className="w-11 h-11 rounded-md bg-emerald-50 text-emerald-700 grid place-items-center"><CreditCard className="w-5 h-5" /></div><div><p className="text-sm text-slate-600">Tagihan pendaftaran</p><p className="text-2xl font-bold mt-1">{fee == null ? "Menunggu penetapan" : fee.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}</p><p className="text-sm text-slate-600 mt-1">{applicant.admission_batches?.name} · {applicant.registration_fee_category === "foundation_staff" ? "Tarif staf yayasan" : "Tarif umum"}</p></div></div></section>
      {fee != null && fee > 0 && <section className="border border-emerald-200 bg-emerald-50/60 rounded-lg p-5 sm:p-6"><div className="flex items-start gap-3"><CreditCard className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" /><div className="min-w-0 flex-1"><h2 className="font-bold text-lg text-emerald-950">Rekening Pembayaran Resmi</h2><p className="text-sm text-emerald-900 mt-1">Transfer tepat sesuai nominal tagihan ke rekening berikut, lalu unggah bukti pembayaran.</p><div className="mt-4 rounded-md border border-emerald-200 bg-white p-4"><p className="text-sm font-semibold text-slate-600">{financeBankName || "BSI"}</p><div className="mt-1 flex flex-wrap items-center gap-2"><p className="font-mono text-xl font-bold tracking-wide text-slate-950">{financeAccountNumber || "1551-1441-07"}</p><button type="button" onClick={() => void copyAccount(financeAccountNumber || "1551-1441-07", "Nomor rekening")} className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50" title="Salin nomor rekening"><Copy className="w-3.5 h-3.5" />Salin</button></div><p className="mt-2 text-sm text-slate-700">a.n. <span className="font-bold">{financeAccountName || "TSL Islamic School"}</span></p><button type="button" onClick={() => void copyAccount(`${financeBankName || "BSI"}\n${financeAccountNumber || "1551-1441-07"}\n${financeAccountName || "TSL Islamic School"}`, "Detail rekening")} className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-emerald-300 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"><Copy className="w-4 h-4" />Salin semua detail rekening</button></div></div></div></section>}
      {staffPending && <section className="border border-amber-200 bg-amber-50 rounded-lg p-5 flex gap-3"><AlertCircle className="w-5 h-5 text-amber-700 shrink-0" /><div><p className="font-bold text-amber-950">Tarif staf belum ditentukan</p><p className="text-sm text-amber-900 mt-1">Tarif khusus staf untuk gelombang ini belum tersedia. Panitia akan memberi informasi setelah tarif ditetapkan.</p></div></section>}
      {!staffPending && fee == null && <section className="border border-amber-200 bg-amber-50 rounded-lg p-5 flex gap-3"><AlertCircle className="w-5 h-5 text-amber-700 shrink-0" /><div><p className="font-bold text-amber-950">Biaya belum ditentukan</p><p className="text-sm text-amber-900 mt-1">Panitia belum menetapkan biaya untuk unit atau gelombang ini. Anda tidak perlu mengirim pembayaran dulu.</p></div></section>}
      {isWaived && <section className="border border-emerald-200 bg-emerald-50 rounded-lg p-5 flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" /><div><p className="font-bold text-emerald-950">Biaya pendaftaran dibebaskan</p><p className="text-sm text-emerald-900 mt-1">Tarif staf yayasan untuk gelombang ini adalah Rp0. Tidak diperlukan bukti transfer.</p></div></section>}
      {paymentLoadError && <section className="border border-rose-200 bg-rose-50 rounded-lg p-4 flex items-center justify-between gap-3"><div className="flex gap-3"><AlertCircle className="w-5 h-5 text-rose-700 shrink-0" /><div><p className="font-bold text-rose-950">Status bukti belum dapat diperbarui</p><p className="text-sm text-rose-900 mt-1">{paymentLoadError}</p></div></div><button type="button" onClick={() => void load(true)} disabled={loadingPayment} className="shrink-0 inline-flex h-9 items-center gap-2 rounded-md border border-rose-300 px-3 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"><RefreshCw className={`w-4 h-4 ${loadingPayment ? "animate-spin" : ""}`} />Muat ulang</button></section>}
      {loadingPayment && !latest && <p className="text-sm text-slate-500">Memuat status bukti pembayaran…</p>}
      {latest && <section className={`border rounded-lg p-5 flex gap-3 ${["verified","waived"].includes(latest.status) ? "bg-emerald-50 border-emerald-200" : latest.status === "rejected" ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`}>{["verified","waived"].includes(latest.status) ? <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" /> : <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />}<div className="min-w-0 flex-1"><p className="font-bold">{latest.status === "verified" ? "Pembayaran terverifikasi" : latest.status === "waived" ? "Biaya dibebaskan" : latest.status === "rejected" ? "Bukti perlu diperbaiki" : "Bukti pembayaran sudah tersimpan — menunggu verifikasi"}</p><p className="text-sm mt-1">Nominal {Number(latest.amount).toLocaleString("id-ID", { style: "currency", currency: "IDR" })}{latest.paid_at ? ` · Transfer ${new Date(`${latest.paid_at}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}` : ""}</p>{latest.proof_url && <button type="button" onClick={() => void openProof()} className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-current/25 bg-white/70 px-3 text-sm font-semibold hover:bg-white"><ExternalLink className="w-4 h-4" />Buka bukti yang tersimpan</button>}{latest.verification_note && <p className="text-sm mt-2">Catatan panitia: {latest.verification_note}</p>}</div></section>}
      {fee != null && fee > 0 && latest?.status !== "verified" && canReplaceProof && <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-4"><h2 className="font-bold text-lg">{latest ? "Kirim bukti pengganti" : "Kirim bukti pembayaran"}</h2><div className="grid sm:grid-cols-2 gap-4"><label className="text-sm font-semibold">Nominal transfer<input type="number" value={amount} readOnly className="w-full h-11 mt-2 px-3 border rounded-md bg-slate-50 text-slate-700" /><span className="block text-xs font-normal text-slate-500 mt-1">Nominal ditetapkan sesuai tagihan agar verifikasi akurat.</span></label><label className="text-sm font-semibold">Tanggal transfer *<input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} max={new Date().toISOString().slice(0, 10)} className="w-full h-11 mt-2 px-3 border rounded-md" /></label></div><label className="h-12 px-4 border border-dashed rounded-md flex items-center justify-center gap-2 cursor-pointer font-semibold hover:bg-slate-50">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}Pilih dan kirim bukti<input type="file" className="sr-only" accept={ADMISSION_FILE_ACCEPT} disabled={loading} onChange={(event) => { void submit(event.target.files?.[0]); event.target.value = ""; }} /></label><p className="text-xs text-slate-500">Gunakan PDF, JPG, atau PNG dengan ukuran maksimal 3 MB.</p></section>}
      {fee != null && fee > 0 && latest?.status !== "verified" && !canReplaceProof && <section className="border border-amber-200 bg-amber-50 rounded-lg p-5 flex gap-3"><AlertCircle className="w-5 h-5 shrink-0 text-amber-700" /><div><p className="font-bold text-amber-950">Bukti pembayaran dikunci sementara</p><p className="mt-1 text-sm text-amber-900">Pendaftaran sudah masuk tahap seleksi. Hubungi panitia untuk membuka koreksi bila bukti pembayaran perlu diganti.</p></div></section>}
      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-lg border bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-600">{paymentReady ? "Bukti pembayaran siap diproses. Tinjau semua data sebelum mengirim pendaftaran." : fee == null ? "Tarif belum tersedia; panitia perlu menentukannya sebelum pendaftaran dapat dikirim." : "Unggah bukti pembayaran untuk membuka pengiriman pendaftaran."}</p>{paymentReady ? <Link to="/spmb/submit" className="h-11 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white inline-flex items-center justify-center">Tinjau & Kirim</Link> : <span className="h-11 rounded-md border px-5 text-sm font-semibold text-slate-400 inline-flex items-center justify-center">Pengiriman terkunci</span>}</div>
    </div>
  );
};
