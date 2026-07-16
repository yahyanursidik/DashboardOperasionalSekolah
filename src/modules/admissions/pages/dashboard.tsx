/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, ClipboardCheck, FileClock, Loader2, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { admissionStatusMeta, formatAdmissionDate, getAdmissionStatus } from "../admissions-config";

const db = supabaseClient as any;

export const AdmissionsDashboard: React.FC = () => {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin-spmb") ? "/admin-spmb" : "/admissions";
  const [applicants, setApplicants] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { Promise.all([
    db.from("admissions_applicants").select("*, units(name), academic_years(name)").is("archived_at", null).order("registration_date", { ascending: false }),
    db.from("admission_documents").select("id,status"),
    db.from("admission_payments").select("id,status"),
  ]).then(([appResult, docResult, payResult]) => { setApplicants(appResult.data || []); setDocuments(docResult.data || []); setPayments(payResult.data || []); setLoading(false); }); }, []);

  const metrics = useMemo(() => {
    const statuses = applicants.map(getAdmissionStatus);
    return [
      { label: "Total pendaftar", value: applicants.length, icon: Users, tone: "bg-blue-50 text-blue-700" },
      { label: "Perlu pemeriksaan", value: statuses.filter((status) => ["submitted", "documents_review"].includes(status)).length, icon: FileClock, tone: "bg-amber-50 text-amber-700" },
      { label: "Siap / selesai seleksi", value: statuses.filter((status) => ["verified", "assessment_scheduled", "assessed"].includes(status)).length, icon: ClipboardCheck, tone: "bg-violet-50 text-violet-700" },
      { label: "Diterima", value: statuses.filter((status) => ["accepted", "enrolled"].includes(status)).length, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
    ];
  }, [applicants]);
  const byUnit = useMemo(() => Object.entries(applicants.reduce((acc: Record<string, number>, row) => { const name = row.units?.name || row.unit || "Belum ditentukan"; acc[name] = (acc[name] || 0) + 1; return acc; }, {})).sort((a,b) => b[1]-a[1]), [applicants]);
  const maxUnit = Math.max(1, ...byUnit.map((entry) => entry[1]));

  if (loading) return <div className="py-28 grid place-items-center"><Loader2 className="w-8 h-8 text-emerald-700 animate-spin" /></div>;
  return <div className="space-y-6"><PageHeader title="SPMB / Penerimaan Murid Baru" description="Kendali penerimaan lintas unit, tahun ajaran, verifikasi, seleksi, dan pembentukan siswa." action={<Link to={`${base}/applicants`} className="h-10 px-4 rounded-md bg-emerald-700 text-white font-semibold text-sm inline-flex items-center gap-2 hover:bg-emerald-800">Buka Pendaftar <ArrowRight className="w-4 h-4" /></Link>} />
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{metrics.map(({ label,value,icon:Icon,tone }) => <div key={label} className="bg-white border rounded-lg p-5"><div className={`w-10 h-10 rounded-md grid place-items-center ${tone}`}><Icon className="w-5 h-5" /></div><p className="text-3xl font-bold mt-5">{value}</p><p className="text-sm text-slate-600 mt-1">{label}</p></div>)}</div>
    {(documents.filter((doc) => doc.status === "submitted").length > 0 || payments.filter((pay) => ["pending", "submitted"].includes(pay.status)).length > 0) && <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"><AlertCircle className="w-5 h-5 text-amber-700 shrink-0" /><div className="flex-1"><p className="font-bold text-amber-950">Antrean verifikasi perlu ditindaklanjuti</p><p className="text-sm text-amber-800 mt-1">{documents.filter((doc) => doc.status === "submitted").length} berkas dan {payments.filter((pay) => ["pending", "submitted"].includes(pay.status)).length} pembayaran menunggu pemeriksaan.</p></div><Link to={`${base}/applicants?queue=verification`} className="text-sm font-semibold text-amber-900 hover:underline">Buka antrean</Link></div>}
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6"><section className="bg-white border rounded-lg overflow-hidden"><div className="p-5 border-b flex items-center justify-between"><div><h2 className="font-bold text-lg">Pendaftar Terbaru</h2><p className="text-sm text-slate-600 mt-1">Prioritaskan pendaftaran yang baru dikirim.</p></div><Link to={`${base}/applicants`} className="text-sm font-semibold text-emerald-700">Lihat semua</Link></div><div className="divide-y">{applicants.slice(0,6).map((row) => { const status = getAdmissionStatus(row); return <Link key={row.id} to={`${base}/applicants/${row.registration_number || row.id}`} className="p-4 sm:px-5 flex items-center gap-4 hover:bg-slate-50"><div className="w-10 h-10 rounded-full bg-slate-100 grid place-items-center font-bold text-slate-600">{row.name?.charAt(0)}</div><div className="min-w-0 flex-1"><p className="font-bold truncate">{row.name}</p><p className="text-xs text-slate-500 mt-1 truncate">{row.units?.name || row.unit || "Tanpa unit"} · {formatAdmissionDate(row.registration_date)}</p></div><span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${admissionStatusMeta[status].tone}`}>{admissionStatusMeta[status].label}</span></Link>; })}{applicants.length === 0 && <p className="p-10 text-center text-slate-500">Belum ada pendaftar.</p>}</div></section>
      <section className="bg-white border rounded-lg p-5"><h2 className="font-bold text-lg">Sebaran per Unit</h2><p className="text-sm text-slate-600 mt-1 mb-6">Membantu pemantauan kuota dan kebutuhan kelas.</p><div className="space-y-5">{byUnit.map(([name,value]) => <div key={name}><div className="flex justify-between text-sm mb-2"><span className="font-semibold">{name}</span><span className="text-slate-600">{value}</span></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-600" style={{ width: `${(value/maxUnit)*100}%` }} /></div></div>)}{byUnit.length === 0 && <p className="text-sm text-slate-500">Belum ada distribusi unit.</p>}</div></section></div>
  </div>;
};
