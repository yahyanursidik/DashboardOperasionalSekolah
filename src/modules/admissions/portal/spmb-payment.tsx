/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, CreditCard, Loader2, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { uploadDocument } from "../../../lib/supabase/storage";
import { useSpmbPortal } from "./spmb-context";

const db = supabaseClient as any;

export const SpmbPayment: React.FC = () => {
  const { applicant } = useSpmbPortal();
  const [payments, setPayments] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const latest = payments[0];
  const load = async () => { if (!applicant?.id) return; const { data } = await db.from("admission_payments").select("*").eq("applicant_id", applicant.id).order("created_at", { ascending: false }); setPayments(data || []); };
  useEffect(() => { void load(); }, [applicant?.id]);
  useEffect(() => { if (applicant?.admission_batches?.registration_fee) setAmount(String(applicant.admission_batches.registration_fee)); }, [applicant]);

  const submit = async (file?: File) => {
    if (!applicant || !file || !amount || Number(amount) <= 0) { toast.error("Isi nominal dan pilih bukti pembayaran."); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error("Ukuran bukti maksimal 3 MB."); return; }
    setLoading(true);
    try {
      const uploaded = await uploadDocument(file, `admissions/${applicant.id}/payments`);
      const { error } = await db.from("admission_payments").upsert({ applicant_id: applicant.id, payment_type: "registration", amount: Number(amount), paid_at: paidAt, proof_url: uploaded.filePath, status: "submitted", verification_note: null, verified_at: null, verified_by: null }, { onConflict: "applicant_id,payment_type" });
      if (error) throw error;
      toast.success("Bukti pembayaran dikirim untuk diverifikasi."); await load();
    } catch (error: any) { toast.error(`Pembayaran belum dapat dikirim: ${error.message}`); }
    finally { setLoading(false); }
  };

  if (!applicant) return <div className="max-w-xl mx-auto bg-white border rounded-lg p-8 text-center"><AlertCircle className="w-8 h-8 text-amber-600 mx-auto" /><h1 className="font-bold text-xl mt-4">Formulir belum tersedia</h1><p className="text-slate-600 mt-2">Simpan formulir calon murid terlebih dahulu.</p></div>;
  const fee = Number(applicant.admission_batches?.registration_fee || 0);
  return (
    <div className="max-w-3xl mx-auto space-y-6"><Link to="/spmb" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"><ArrowLeft className="w-4 h-4" />Ringkasan pendaftaran</Link><div><h1 className="text-2xl sm:text-3xl font-bold">Biaya Pendaftaran</h1><p className="text-slate-600 mt-2">Bukti transfer diperiksa panitia keuangan dan tercatat dalam riwayat.</p></div>
      <section className="bg-white border rounded-lg p-5 sm:p-6"><div className="flex items-start gap-4"><div className="w-11 h-11 rounded-md bg-emerald-50 text-emerald-700 grid place-items-center"><CreditCard className="w-5 h-5" /></div><div><p className="text-sm text-slate-600">Tagihan gelombang</p><p className="text-2xl font-bold mt-1">{fee.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}</p><p className="text-sm text-slate-600 mt-1">{applicant.admission_batches?.name}</p></div></div></section>
      {latest && <section className={`border rounded-lg p-5 flex gap-3 ${latest.status === "verified" ? "bg-emerald-50 border-emerald-200" : latest.status === "rejected" ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`}>{latest.status === "verified" ? <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" /> : <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />}<div><p className="font-bold">{latest.status === "verified" ? "Pembayaran terverifikasi" : latest.status === "rejected" ? "Bukti perlu diperbaiki" : "Menunggu verifikasi pembayaran"}</p><p className="text-sm mt-1">Nominal {Number(latest.amount).toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</p>{latest.verification_note && <p className="text-sm mt-2">Catatan panitia: {latest.verification_note}</p>}</div></section>}
      {latest?.status !== "verified" && <section className="bg-white border rounded-lg p-5 sm:p-6 space-y-4"><h2 className="font-bold text-lg">{latest ? "Kirim bukti pengganti" : "Kirim bukti pembayaran"}</h2><div className="grid sm:grid-cols-2 gap-4"><label className="text-sm font-semibold">Nominal transfer *<input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-11 mt-2 px-3 border rounded-md" /></label><label className="text-sm font-semibold">Tanggal transfer *<input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="w-full h-11 mt-2 px-3 border rounded-md" /></label></div><label className="h-12 px-4 border border-dashed rounded-md flex items-center justify-center gap-2 cursor-pointer font-semibold hover:bg-slate-50">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}Pilih dan kirim bukti<input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png" disabled={loading} onChange={(event) => { void submit(event.target.files?.[0]); event.target.value = ""; }} /></label></section>}
    </div>
  );
};
