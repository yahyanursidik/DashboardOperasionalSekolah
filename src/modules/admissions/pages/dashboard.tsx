/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, ClipboardCheck, ContactRound, FileClock, Loader2, Users, UsersRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { admissionStatusMeta, formatAdmissionDate, getAdmissionStatus } from "../admissions-config";
import { entryTypeLabel } from "../quota-utils";

const db = supabaseClient as any;

export const AdmissionsDashboard: React.FC = () => {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin-spmb") ? "/admin-spmb" : "/admissions";
  const [applicants, setApplicants] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [quotas, setQuotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { Promise.all([
    db.from("admissions_applicants").select("*, units(name), academic_years(name)").is("archived_at", null).order("registration_date", { ascending: false }),
    db.from("admission_documents").select("id,status"),
    db.from("admission_payments").select("id,status"),
    db.from("admission_leads").select("id,stage,next_follow_up_at"),
    db.rpc("admission_quota_snapshot", { p_batch_id: null }),
  ]).then(([appResult, docResult, payResult, leadResult, quotaResult]) => { setApplicants(appResult.data || []); setDocuments(docResult.data || []); setPayments(payResult.data || []); setLeads(leadResult.data || []); setQuotas(quotaResult.data || []); setLoading(false); }); }, []);

  const metrics = useMemo(() => {
    const statuses = applicants.map(getAdmissionStatus);
    return [
      { label: "Total pendaftar", value: applicants.length, icon: Users, tone: "bg-blue-50 text-blue-700" },
      { label: "Perlu pemeriksaan", value: statuses.filter((status) => ["submitted", "documents_review"].includes(status)).length, icon: FileClock, tone: "bg-amber-50 text-amber-700" },
      { label: "Siap / selesai seleksi", value: statuses.filter((status) => ["verified", "assessment_scheduled", "assessed"].includes(status)).length, icon: ClipboardCheck, tone: "bg-violet-50 text-violet-700" },
      { label: "Diterima", value: statuses.filter((status) => ["accepted", "enrolled"].includes(status)).length, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
    ];
  }, [applicants]);
  const activeLeadStages = ["new", "contacted", "qualified", "visit_scheduled", "visited", "nurturing", "ready_to_apply"];
  const activeLeads = leads.filter((lead) => activeLeadStages.includes(lead.stage)).length;
  const overdueLeads = leads.filter((lead) => lead.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date() && activeLeadStages.includes(lead.stage)).length;
  const readyLeads = leads.filter((lead) => lead.stage === "ready_to_apply").length;
  const seatTotals = quotas.reduce((sum, row) => ({ quota: sum.quota + Number(row.quota || 0), reserved: sum.reserved + Number(row.reserved_count || 0), remaining: sum.remaining + Number(row.remaining_count || 0) }), { quota: 0, reserved: 0, remaining: 0 });

  if (loading) return <div className="py-28 grid place-items-center"><Loader2 className="w-8 h-8 text-emerald-700 animate-spin" /></div>;
  return <div className="space-y-6"><PageHeader title="SPMB / Penerimaan Murid Baru" description="Kendali penerimaan lintas unit, tahun ajaran, verifikasi, seleksi, dan pembentukan siswa." action={<Link to={`${base}/applicants`} className="h-10 px-4 rounded-md bg-emerald-700 text-white font-semibold text-sm inline-flex items-center gap-2 hover:bg-emerald-800">Buka Pendaftar <ArrowRight className="w-4 h-4" /></Link>} />
    <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">{metrics.map(({ label,value,icon:Icon,tone }) => <div key={label} className="bg-white border rounded-lg p-5"><div className={`w-10 h-10 rounded-md grid place-items-center ${tone}`}><Icon className="w-5 h-5" /></div><p className="text-3xl font-bold mt-5">{value}</p><p className="text-sm text-slate-600 mt-1">{label}</p></div>)}<div className="bg-white border rounded-lg p-5"><div className="w-10 h-10 rounded-md grid place-items-center bg-cyan-50 text-cyan-700"><UsersRound className="w-5 h-5" /></div><p className="text-3xl font-bold mt-5">{seatTotals.remaining}</p><p className="text-sm text-slate-600 mt-1">Sisa dari {seatTotals.quota} kursi</p></div></div>
    <section className="border-y bg-white px-5 py-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-cyan-50 text-cyan-700"><ContactRound className="h-5 w-5" /></span><div><h2 className="font-bold">CRM pra-pendaftaran</h2><p className="mt-1 text-sm text-slate-600">Pantau keluarga yang masih bertanya, berencana survei, atau belum mengisi formulir SPMB.</p></div></div><div className="flex flex-wrap gap-x-6 gap-y-2 text-sm"><span><strong>{activeLeads}</strong> prospek aktif</span><span className={overdueLeads ? "font-semibold text-rose-700" : ""}><CalendarClock className="mr-1 inline h-4 w-4" /><strong>{overdueLeads}</strong> terlambat</span><span><strong>{readyLeads}</strong> siap daftar</span></div><Link to={`${base}/crm`} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Buka CRM <ArrowRight className="h-4 w-4" /></Link></div></section>
    {(documents.filter((doc) => doc.status === "submitted").length > 0 || payments.filter((pay) => ["pending", "submitted"].includes(pay.status)).length > 0) && <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"><AlertCircle className="w-5 h-5 text-amber-700 shrink-0" /><div className="flex-1"><p className="font-bold text-amber-950">Antrean verifikasi perlu ditindaklanjuti</p><p className="text-sm text-amber-800 mt-1">{documents.filter((doc) => doc.status === "submitted").length} berkas dan {payments.filter((pay) => ["pending", "submitted"].includes(pay.status)).length} pembayaran menunggu pemeriksaan.</p></div><Link to={`${base}/applicants?queue=verification`} className="text-sm font-semibold text-amber-900 hover:underline">Buka antrean</Link></div>}
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6"><section className="bg-white border rounded-lg overflow-hidden"><div className="p-5 border-b flex items-center justify-between"><div><h2 className="font-bold text-lg">Pendaftar Terbaru</h2><p className="text-sm text-slate-600 mt-1">Prioritaskan pendaftaran yang baru dikirim.</p></div><Link to={`${base}/applicants`} className="text-sm font-semibold text-emerald-700">Lihat semua</Link></div><div className="divide-y">{applicants.slice(0,6).map((row) => { const status = getAdmissionStatus(row); return <Link key={row.id} to={`${base}/applicants/${row.registration_number || row.id}`} className="p-4 sm:px-5 flex items-center gap-4 hover:bg-slate-50"><div className="w-10 h-10 rounded-full bg-slate-100 grid place-items-center font-bold text-slate-600">{row.name?.charAt(0)}</div><div className="min-w-0 flex-1"><p className="font-bold truncate">{row.name}</p><p className="text-xs text-slate-500 mt-1 truncate">{row.units?.name || row.unit || "Tanpa unit"} · {formatAdmissionDate(row.registration_date)}</p></div><span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${admissionStatusMeta[status].tone}`}>{admissionStatusMeta[status].label}</span></Link>; })}{applicants.length === 0 && <p className="p-10 text-center text-slate-500">Belum ada pendaftar.</p>}</div></section>
      <section className="bg-white border rounded-lg p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-lg">Kapasitas per Tujuan</h2><p className="text-sm text-slate-600 mt-1">Kursi diterima dibandingkan rencana daya tampung.</p></div><Link to={`${base}/settings`} className="text-sm font-semibold text-emerald-700">Atur</Link></div><div className="space-y-5 mt-6">{quotas.slice().sort((a,b) => Number(a.remaining_count)-Number(b.remaining_count)).slice(0,6).map((row) => <QuotaRow key={row.quota_id} row={row} />)}{quotas.length === 0 && <p className="text-sm text-slate-500">Belum ada rencana kuota per kelas. Buka Pengaturan SPMB.</p>}</div></section></div>
  </div>;
};

const QuotaRow = ({ row }: { row: any }) => {
  const used = Number(row.reserved_count || 0);
  const total = Number(row.quota || 0);
  const full = Number(row.remaining_count) === 0;
  return <div><div className="flex justify-between gap-3 text-sm mb-2"><span className="font-semibold truncate">{row.class_name} · {entryTypeLabel(row.entry_type)}</span><span className={full ? "text-rose-700 font-bold" : "text-slate-600"}>{used}/{total}</span></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${used >= total ? "bg-rose-600" : "bg-emerald-600"}`} style={{ width: `${total ? Math.min(100, (used / total) * 100) : 0}%` }} /></div></div>;
};
