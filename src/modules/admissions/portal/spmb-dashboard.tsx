/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2, Circle, Clock3, CreditCard, FileText, Megaphone, UploadCloud, UserPlus } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { admissionStatusMeta, admissionStatusOrder, formatAdmissionDate, getAdmissionStatus } from "../admissions-config";
import { useSpmbPortal } from "./spmb-context";

const db = supabaseClient as any;

export const SpmbDashboard: React.FC = () => {
  const { user, applicant } = useSpmbPortal();
  const [documents, setDocuments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [assessment, setAssessment] = useState<any | null>(null);

  useEffect(() => {
    if (!applicant?.id) return;
    Promise.all([
      db.from("admission_documents").select("*").eq("applicant_id", applicant.id),
      db.from("admission_payments").select("*").eq("applicant_id", applicant.id).order("created_at", { ascending: false }),
      db.from("admission_assessments").select("*").eq("applicant_id", applicant.id).order("scheduled_at").limit(1).maybeSingle(),
    ]).then(([docResult, paymentResult, assessmentResult]) => { setDocuments(docResult.data || []); setPayments(paymentResult.data || []); setAssessment(assessmentResult.data || null); });
  }, [applicant?.id]);

  if (!applicant) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><p className="text-sm font-semibold text-emerald-700">Assalamu'alaikum, {user.user_metadata?.full_name || "Orang Tua / Wali"}</p><h1 className="text-3xl font-bold mt-1">Mulai Pendaftaran Calon Murid</h1><p className="text-slate-600 mt-2">Pilih unit dan gelombang aktif, lalu lengkapi data calon murid.</p></div>
      <div className="bg-white border rounded-lg p-8 sm:p-10 text-center"><div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full grid place-items-center mx-auto"><UserPlus className="w-7 h-7" /></div><h2 className="text-xl font-bold mt-5">Belum ada formulir pendaftaran</h2><p className="text-slate-600 mt-2 max-w-lg mx-auto">Data dapat disimpan sebagai draf sebelum dikirim. Setelah dikirim, panitia akan memeriksa berkas dan memberi jadwal seleksi.</p><Link to="/spmb/form" className="mt-6 inline-flex h-11 items-center gap-2 px-5 rounded-md bg-emerald-700 text-white font-semibold hover:bg-emerald-800">Isi Formulir <ArrowRight className="w-4 h-4" /></Link></div>
    </div>
  );

  const status = getAdmissionStatus(applicant);
  const meta = admissionStatusMeta[status];
  const currentIndex = admissionStatusOrder.indexOf(status);
  const verifiedDocs = documents.filter((doc) => doc.status === "valid").length;
  const payment = payments[0];
  const tasks = [
    { to: "/spmb/form", title: "Data calon murid", detail: status === "draft" ? "Lengkapi dan kirim formulir" : "Lihat data yang telah dikirim", icon: FileText, done: status !== "draft" },
    { to: "/spmb/documents", title: "Berkas persyaratan", detail: `${verifiedDocs} dari ${documents.length || 3} berkas terverifikasi`, icon: UploadCloud, done: verifiedDocs >= 3 },
    { to: "/spmb/payment", title: "Biaya pendaftaran", detail: payment ? `Status: ${payment.status === "verified" ? "terverifikasi" : payment.status === "rejected" ? "perlu diperbaiki" : "menunggu verifikasi"}` : "Unggah bukti pembayaran", icon: CreditCard, done: payment?.status === "verified" },
    { to: "/spmb/announcement", title: "Hasil seleksi", detail: ["accepted", "waitlisted", "rejected", "enrolled"].includes(status) ? "Keputusan sudah tersedia" : "Tersedia setelah proses seleksi", icon: Megaphone, done: ["accepted", "enrolled"].includes(status) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">{applicant.registration_number}</p><h1 className="text-2xl sm:text-3xl font-bold">Pendaftaran {applicant.name}</h1><p className="text-slate-600 mt-2">{applicant.units?.name || applicant.unit} · {applicant.academic_years?.name || applicant.academic_year} · {applicant.admission_batches?.name || "Gelombang pendaftaran"}</p></div><span className={`self-start lg:self-auto px-3 py-1.5 rounded-full text-sm font-semibold ${meta.tone}`}>{meta.label}</span></div>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-5"><Clock3 className="w-5 h-5 text-emerald-700" /><p className="text-xs uppercase font-semibold text-slate-500 mt-4">Status saat ini</p><p className="font-bold mt-1">{meta.label}</p><p className="text-sm text-slate-600 mt-1">{meta.description}</p></div>
        <div className="bg-white border rounded-lg p-5"><CalendarDays className="w-5 h-5 text-blue-700" /><p className="text-xs uppercase font-semibold text-slate-500 mt-4">Jadwal seleksi</p><p className="font-bold mt-1">{assessment?.scheduled_at ? formatAdmissionDate(assessment.scheduled_at, true) : "Belum dijadwalkan"}</p><p className="text-sm text-slate-600 mt-1">{assessment?.location || "Akan diinformasikan panitia"}</p></div>
        <div className="bg-white border rounded-lg p-5"><CreditCard className="w-5 h-5 text-amber-700" /><p className="text-xs uppercase font-semibold text-slate-500 mt-4">Biaya pendaftaran</p><p className="font-bold mt-1">{Number(applicant.admission_batches?.registration_fee || 0).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}</p><p className="text-sm text-slate-600 mt-1">{payment ? `Bukti ${payment.status}` : "Belum ada bukti pembayaran"}</p></div>
      </section>

      <section className="bg-white border rounded-lg p-5 sm:p-6"><div className="flex items-center justify-between mb-5"><div><h2 className="font-bold text-lg">Tahapan Pendaftaran</h2><p className="text-sm text-slate-600">Jejak proses diperbarui oleh panitia.</p></div></div><div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">{admissionStatusOrder.map((step, index) => { const done = currentIndex >= index || status === "enrolled"; return <div key={step} className="min-w-0"><div className={`w-8 h-8 rounded-full grid place-items-center ${done ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-400"}`}>{done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}</div><p className={`text-xs font-semibold mt-2 ${done ? "text-slate-800" : "text-slate-400"}`}>{admissionStatusMeta[step].label}</p></div>; })}</div></section>

      <section><h2 className="font-bold text-lg mb-3">Yang Perlu Diselesaikan</h2><div className="grid sm:grid-cols-2 gap-4">{tasks.map(({ to,title,detail,icon:Icon,done }) => <Link key={to} to={to} className="bg-white border rounded-lg p-5 flex items-center gap-4 hover:border-emerald-300 hover:shadow-sm"><div className={`w-11 h-11 rounded-md grid place-items-center shrink-0 ${done ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}><Icon className="w-5 h-5" /></div><div className="min-w-0 flex-1"><p className="font-bold">{title}</p><p className="text-sm text-slate-600 mt-1">{detail}</p></div><ArrowRight className="w-4 h-4 text-slate-400" /></Link>)}</div></section>
    </div>
  );
};
