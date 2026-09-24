/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { sendNotificationEmail } from "../../../lib/email";
import { supabaseClient } from "../../../lib/supabase/client";
import { getRequiredAdmissionDocumentTypes } from "../admissions-config";
import { getAdmissionProfileFields } from "../admission-program-profile";
import { useSpmbPortal } from "./spmb-context";

const db = supabaseClient as any;

export const SpmbSubmit: React.FC = () => {
  const navigate = useNavigate();
  const { applicant, refreshApplicants } = useSpmbPortal();
  const [documents, setDocuments] = useState<any[]>([]);
  const [payment, setPayment] = useState<any | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!applicant?.id) return;
    Promise.all([
      db.from("admission_documents").select("document_type,status").eq("applicant_id", applicant.id),
      db.from("admission_payments").select("status,amount").eq("applicant_id", applicant.id).eq("payment_type", "registration").maybeSingle(),
    ]).then(([documentResult, paymentResult]) => {
      setDocuments(documentResult.data || []);
      setPayment(paymentResult.data || null);
    });
  }, [applicant?.id]);

  const requiredDocuments = useMemo(() => applicant ? getRequiredAdmissionDocumentTypes(applicant) : [], [applicant]);
  const isUploaded = (documentType: string) => documents.some((document) => document.document_type === documentType && !["rejected", "revision_required"].includes(document.status));
  // Keep this explicit server-aligned check even when a browser has retained an
  // older route bundle. The final-submit RPC also validates this same document.
  const commitmentUploaded = isUploaded("home_learning_commitment");
  const missingDocuments = requiredDocuments.filter((type) => !isUploaded(type.value));
  if (!commitmentUploaded && !missingDocuments.some((type) => type.value === "home_learning_commitment")) {
    missingDocuments.push({ value: "home_learning_commitment", label: "Surat komitmen program", required: true } as (typeof requiredDocuments)[number]);
  }
  const paymentReady = payment && ["submitted", "verified", "waived"].includes(payment.status);
  const admissionProfile = applicant?.admission_profile && typeof applicant.admission_profile === "object" ? applicant.admission_profile : {};
  const missingProfileFields = applicant ? getAdmissionProfileFields(applicant).filter((field) => field.required && !String(admissionProfile[field.key] || "").trim()) : [];
  const dataReady = Boolean(applicant?.name && applicant?.nik && applicant?.parent_name && applicant?.parent_phone && applicant?.parent_education_level && applicant?.address && applicant?.domicile_regency && applicant?.domicile_province && missingProfileFields.length === 0);
  const ready = Boolean(applicant) && dataReady && missingDocuments.length === 0 && paymentReady;

  const submit = async () => {
    if (!applicant || !ready || !agreed) return;
    setSubmitting(true);
    const { error } = await db.rpc("admission_submit_application", { p_applicant_id: applicant.id });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Pendaftaran belum dapat dikirim. Periksa data dan persyaratan Anda.");
      return;
    }
    await refreshApplicants(applicant.id);
    toast.success("Pendaftaran berhasil dikirim ke panitia.");
    void sendSubmissionReceipt(applicant).catch(() => undefined);
    navigate("/spmb");
  };

  if (!applicant) return <div className="max-w-xl mx-auto bg-white border rounded-lg p-8 text-center"><AlertCircle className="w-8 h-8 text-amber-600 mx-auto" /><h1 className="font-bold text-xl mt-4">Formulir belum tersedia</h1><p className="text-slate-600 mt-2">Mulai dari data awal calon murid terlebih dahulu.</p><Link to="/spmb/form" className="inline-flex mt-5 h-10 items-center px-4 bg-emerald-700 text-white rounded-md font-semibold">Isi Data Awal</Link></div>;

  return <div className="max-w-3xl mx-auto space-y-6">
    <Link to="/spmb/payment" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"><ArrowLeft className="w-4 h-4" />Kembali ke pembayaran</Link>
    <div><p className="text-sm font-semibold text-emerald-700">Tahap 4 dari 4 · {applicant.name}</p><h1 className="text-2xl sm:text-3xl font-bold">Tinjau dan Kirim Pendaftaran</h1><p className="text-slate-600 mt-2">Periksa kelengkapan di bawah. Setelah dikirim, panitia mulai memeriksa data dan berkas Anda.</p></div>
    <section className="bg-white border rounded-lg overflow-hidden"><div className="p-5 border-b"><h2 className="font-bold text-lg">Ringkasan kelengkapan</h2></div><div className="divide-y">
      <CheckRow done={dataReady} title="Data calon murid dan keluarga" detail={missingProfileFields.length ? `Masih perlu: ${missingProfileFields.map((field) => field.label).join(", ")}.` : "Identitas, pendidikan orang tua/wali, domisili, kontak, dan data khusus program telah disimpan."} to="/spmb/form" />
      <CheckRow done={missingDocuments.length === 0} title="Berkas persyaratan" detail={missingDocuments.length ? `Masih perlu: ${missingDocuments.map((item) => item.label).join(", ")}.` : `${requiredDocuments.length} berkas wajib sudah diunggah.`} to="/spmb/documents" />
      <CheckRow done={Boolean(paymentReady)} title="Biaya pendaftaran" detail={paymentReady ? "Bukti pembayaran sudah diterima dan menunggu/selesai diverifikasi." : "Unggah bukti pembayaran sesuai tagihan."} to="/spmb/payment" />
    </div></section>
    {!commitmentUploaded && <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 sm:flex-row sm:items-center sm:justify-between"><span className="flex gap-3"><AlertCircle className="h-5 w-5 shrink-0 text-blue-700" /><span><strong>Surat komitmen program belum diunggah.</strong><br />Unduh contoh yang sesuai pilihan unit, tanda tangani, lalu unggah pada bagian Berkas Persyaratan.</span></span><Link to="/spmb/documents" className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-blue-300 bg-white px-3 font-semibold text-blue-800 hover:bg-blue-100">Unggah surat</Link></div>}
    {!ready && <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle className="h-5 w-5 shrink-0" /><p>Pengiriman belum dapat dilakukan. Lengkapi item yang masih ditandai di atas.</p></div>}
    {ready && <label className="flex gap-3 rounded-lg border bg-white p-5 cursor-pointer"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 h-4 w-4" /><span><span className="font-semibold">Saya menyatakan data dan berkas yang diberikan benar.</span><span className="mt-1 block text-sm text-slate-600">Saya memahami panitia dapat meminta perbaikan bila ada data atau berkas yang tidak sesuai.</span></span></label>}
    <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-lg border bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-600">Sistem akan memeriksa ulang kelengkapan pada server sebelum menerima pengiriman.</p><button type="button" disabled={!ready || !agreed || submitting} onClick={() => void submit()} className="h-11 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Kirim ke Panitia</button></div>
  </div>;
};

const escapeEmailHtml = (value: unknown) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character] || character));

const sendSubmissionReceipt = async (applicant: any) => {
  const { data } = await supabaseClient.auth.getUser();
  const recipient = data.user?.email?.trim();
  if (!recipient) return;
  const childName = escapeEmailHtml(applicant.name);
  const registrationNumber = escapeEmailHtml(applicant.registration_number || "pendaftaran Anda");
  const result = await sendNotificationEmail({
    to: recipient,
    subject: `Pendaftaran ${applicant.registration_number || "SPMB"} telah dikirim`,
    html: `<html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6"><h2 style="color:#075e4a">Pendaftaran telah diterima</h2><p>Assalamu’alaikum Bapak/Ibu,</p><p>Pendaftaran <strong>${childName}</strong> dengan nomor <strong>${registrationNumber}</strong> telah dikirim ke panitia TS Lab School.</p><p>Panitia akan memeriksa data, berkas, dan bukti pembayaran. Silakan pantau perkembangan melalui Portal SPMB.</p><p>Wassalamu’alaikum,<br/><strong>TS Lab School</strong></p></body></html>`,
    text: `Pendaftaran ${applicant.name || "calon murid"} (${applicant.registration_number || "SPMB"}) telah dikirim ke panitia TS Lab School. Silakan pantau perkembangan melalui Portal SPMB.`,
  });
  if (!result.success) console.warn("Email tanda terima SPMB tidak terkirim:", result.error);
};

const CheckRow = ({ done, title, detail, to }: { done: boolean; title: string; detail: string; to: string }) => <div className="flex items-center gap-4 p-5"><CheckCircle2 className={`h-6 w-6 shrink-0 ${done ? "text-emerald-600" : "text-slate-300"}`} /><div className="min-w-0 flex-1"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-slate-600">{detail}</p></div><Link to={to} className="h-9 shrink-0 inline-flex items-center rounded-md border px-3 text-sm font-semibold text-emerald-800">Periksa</Link></div>;
