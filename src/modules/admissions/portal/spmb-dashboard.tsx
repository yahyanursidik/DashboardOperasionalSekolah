/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, CreditCard, FileText, PenLine, UploadCloud, UserPlus } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { admissionStatusMeta, formatAdmissionDate, getAdmissionStatus, getRequiredAdmissionDocumentTypes } from "../admissions-config";
import { getAdmissionProfileFields } from "../admission-program-profile";
import { applicantTargetLabel, entryTypeLabel } from "../quota-utils";
import { timeZoneLabel } from "../../../lib/timezones";
import { useSpmbPortal } from "./spmb-context";

const db = supabaseClient as any;

export const SpmbDashboard: React.FC = () => {
  const { user, applicants, applicant } = useSpmbPortal();
  const [documents, setDocuments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [assessment, setAssessment] = useState<any | null>(null);
  const [editLogs, setEditLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!applicant?.id) return;
    Promise.all([
      db.from("admission_documents").select("*").eq("applicant_id", applicant.id),
      db.from("admission_payments").select("*").eq("applicant_id", applicant.id).order("created_at", { ascending: false }),
      db.from("admission_assessments").select("*").eq("applicant_id", applicant.id).order("scheduled_at").limit(1).maybeSingle(),
      db.from("admission_applicant_edit_logs").select("actor_kind,changed_fields,created_at").eq("applicant_id", applicant.id).order("created_at", { ascending: false }).limit(5),
    ]).then(([docResult, paymentResult, assessmentResult, editLogResult]) => { setDocuments(docResult.data || []); setPayments(paymentResult.data || []); setAssessment(assessmentResult.data || null); setEditLogs(editLogResult.data || []); });
  }, [applicant?.id]);

  if (!applicant) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><p className="text-sm font-semibold text-emerald-700">Assalamu'alaikum, {user.user_metadata?.full_name || "Orang Tua / Wali"}</p><h1 className="text-3xl font-bold mt-1">{applicants.length ? "Daftarkan Anak Lain" : "Mulai Pendaftaran Calon Murid"}</h1><p className="text-slate-600 mt-2">Setiap anak memiliki formulir, berkas, pembayaran, dan status seleksi masing-masing.</p></div>
      <div className="bg-white border rounded-lg p-8 sm:p-10 text-center"><div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full grid place-items-center mx-auto"><UserPlus className="w-7 h-7" /></div><h2 className="text-xl font-bold mt-5">{applicants.length ? "Formulir anak baru" : "Belum ada formulir pendaftaran"}</h2><p className="text-slate-600 mt-2 max-w-lg mx-auto">Setelah disimpan, nama anak akan tersedia pada pemilih calon murid di bagian atas portal.</p><Link to="/spmb/form" className="mt-6 inline-flex h-11 items-center gap-2 px-5 rounded-md bg-emerald-700 text-white font-semibold hover:bg-emerald-800">Isi Formulir Anak <ArrowRight className="w-4 h-4" /></Link></div>
    </div>
  );

  const status = getAdmissionStatus(applicant);
  const canEditData = ["draft", "documents_review"].includes(status);
  const meta = admissionStatusMeta[status];
  const requiredDocumentTypes = getRequiredAdmissionDocumentTypes(applicant);
  const uploadedDocs = requiredDocumentTypes.filter((type) => documents.some((doc) => doc.document_type === type.value && !["rejected", "revision_required"].includes(doc.status))).length;
  const payment = payments[0];
  const feePending = applicant.registration_fee_amount == null;
  const feeWaived = Number(applicant.registration_fee_amount) === 0 && applicant.staff_fee_status === "approved";
  const admissionProfile = applicant.admission_profile && typeof applicant.admission_profile === "object" ? applicant.admission_profile : {};
  const profileReady = getAdmissionProfileFields(applicant).filter((field) => field.required).every((field) => String(admissionProfile[field.key] || "").trim());
  const dataReady = Boolean(applicant.name && applicant.nik && applicant.dob && applicant.parent_name && applicant.parent_phone && applicant.parent_education_level && applicant.address && applicant.domicile_regency && applicant.domicile_province && profileReady);
  const paymentSubmitted = payment && ["submitted", "verified", "waived"].includes(payment.status);
  const tasks = [
    { to: "/spmb/form", title: "1. Data calon murid", detail: dataReady ? "Data awal telah disimpan" : "Lengkapi data calon murid dan keluarga", icon: FileText, done: dataReady },
    { to: "/spmb/documents", title: "2. Berkas persyaratan", detail: `${uploadedDocs} dari ${requiredDocumentTypes.length} berkas wajib telah diunggah`, icon: UploadCloud, done: uploadedDocs === requiredDocumentTypes.length },
    { to: "/spmb/payment", title: "3. Biaya pendaftaran", detail: feePending ? (applicant.staff_fee_status === "pending" ? "Menunggu verifikasi tarif staf" : "Tarif belum ditentukan") : feeWaived ? "Biaya dibebaskan" : payment ? `Bukti ${payment.status === "verified" ? "terverifikasi" : payment.status === "rejected" ? "perlu diperbaiki" : "diterima"}` : "Unggah bukti pembayaran", icon: CreditCard, done: Boolean(paymentSubmitted) },
    { to: "/spmb/submit", title: "4. Kirim ke panitia", detail: status === "submitted" ? "Pendaftaran telah diterima panitia" : "Tinjau kelengkapan lalu kirim", icon: CheckCircle2, done: status !== "draft" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">{applicant.registration_number}</p><h1 className="text-2xl sm:text-3xl font-bold">Pendaftaran {applicant.name}</h1><p className="text-slate-600 mt-2">{applicant.units?.name || applicant.unit} · {applicant.academic_years?.name || applicant.academic_year} · {applicant.admission_batches?.name || "Gelombang pendaftaran"}</p><p className="text-sm font-semibold text-slate-800 mt-2">{applicantTargetLabel(applicant)} · {entryTypeLabel(applicant.entry_type)}</p>{applicant.learning_timezone && <p className="mt-2 text-sm font-semibold text-blue-700">Waktu belajar: {timeZoneLabel(applicant.learning_timezone)} · {applicant.residence_country || "Domisili belum diisi"}</p>}</div><span className={`self-start lg:self-auto px-3 py-1.5 rounded-full text-sm font-semibold ${meta.tone}`}>{meta.label}</span></div>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-5"><Clock3 className="w-5 h-5 text-emerald-700" /><p className="text-xs uppercase font-semibold text-slate-500 mt-4">Status saat ini</p><p className="font-bold mt-1">{meta.label}</p><p className="text-sm text-slate-600 mt-1">{meta.description}</p></div>
        <div className="bg-white border rounded-lg p-5"><CalendarDays className="w-5 h-5 text-blue-700" /><p className="text-xs uppercase font-semibold text-slate-500 mt-4">Jadwal seleksi</p><p className="font-bold mt-1">{assessment?.scheduled_at ? formatAdmissionDate(assessment.scheduled_at, true, applicant.learning_timezone || "Asia/Jakarta") : "Belum dijadwalkan"}</p><p className="text-sm text-slate-600 mt-1">{assessment?.location || "Akan diinformasikan panitia"}</p>{assessment?.scheduled_at && applicant.learning_timezone && applicant.learning_timezone !== "Asia/Jakarta" && <p className="mt-1 text-xs text-slate-500">Waktu sekolah: {formatAdmissionDate(assessment.scheduled_at, true)} WIB</p>}</div>
        <div className="bg-white border rounded-lg p-5"><CreditCard className="w-5 h-5 text-amber-700" /><p className="text-xs uppercase font-semibold text-slate-500 mt-4">Biaya pendaftaran</p><p className="font-bold mt-1">{feePending ? "Menunggu penetapan" : Number(applicant.registration_fee_amount).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}</p><p className="text-sm text-slate-600 mt-1">{feePending ? applicant.staff_fee_status === "pending" ? "Pengajuan tarif staf diperiksa" : "Panitia belum menetapkan tarif" : feeWaived ? "Tarif staf yayasan dibebaskan" : payment ? `Bukti ${payment.status}` : "Belum ada bukti pembayaran"}</p></div>
      </section>

      <section className="bg-white border rounded-lg p-5 sm:p-6"><div className="flex items-center justify-between mb-5"><div><h2 className="font-bold text-lg">Tahapan Pendaftaran</h2><p className="text-sm text-slate-600">Selesaikan empat tahap berikut sebelum panitia memulai pemeriksaan.</p></div></div><ol className="grid sm:grid-cols-4 gap-3">{tasks.map(({ title, detail, done }, index) => <li key={title} className={`min-w-0 border rounded-lg p-4 ${done ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200"}`}><div className={`w-8 h-8 rounded-full grid place-items-center text-sm font-bold ${done ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}>{done ? <CheckCircle2 className="w-4 h-4" /> : index + 1}</div><p className="text-sm font-bold mt-3">{title.replace(/^\d\. /, "")}</p><p className="text-xs text-slate-600 mt-1">{detail}</p></li>)}</ol></section>

      <section><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-bold text-lg">Yang Perlu Diselesaikan</h2><p className="mt-1 text-sm text-slate-600">Data dapat disunting selama masih draf atau panitia meminta perbaikan.</p></div>{canEditData ? <Link to="/spmb/form" className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-300 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"><PenLine className="h-4 w-4" />Edit data pendaftaran</Link> : <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Data sedang diproses panitia</span>}</div><div className="grid sm:grid-cols-2 gap-4">{tasks.map(({ to,title,detail,icon:Icon,done }) => <Link key={to} to={to} className="bg-white border rounded-lg p-5 flex items-center gap-4 hover:border-emerald-300 hover:shadow-sm"><div className={`w-11 h-11 rounded-md grid place-items-center shrink-0 ${done ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}><Icon className="w-5 h-5" /></div><div className="min-w-0 flex-1"><p className="font-bold">{title}</p><p className="text-sm text-slate-600 mt-1">{detail}</p></div><ArrowRight className="w-4 h-4 text-slate-400" /></Link>)}</div></section>
      <section className="rounded-lg border bg-white p-5"><h2 className="flex items-center gap-2 font-bold text-lg"><PenLine className="h-5 w-5 text-emerald-700" />Riwayat Perbaikan Data</h2><p className="mt-1 text-sm text-slate-600">Untuk keamanan, riwayat hanya menunjukkan bagian yang diperbarui, bukan nilai data pribadi.</p><div className="mt-4 space-y-3">{editLogs.map((item, index) => <div key={`${item.created_at}-${index}`} className="border-l-2 border-emerald-200 pl-3"><p className="text-sm font-semibold">{item.actor_kind === "admin" ? "Diperbarui panitia" : "Diperbarui oleh Anda"}</p><p className="mt-1 text-xs text-slate-500">{formatAdmissionDate(item.created_at, true, applicant.learning_timezone || "Asia/Jakarta")}</p><p className="mt-1 text-xs text-slate-600">{(item.changed_fields || []).map((field: string) => field.replaceAll("_", " ")).join(", ")}</p></div>)}{editLogs.length === 0 && <p className="text-sm text-slate-500">Belum ada perbaikan data.</p>}</div></section>
    </div>
  );
};
