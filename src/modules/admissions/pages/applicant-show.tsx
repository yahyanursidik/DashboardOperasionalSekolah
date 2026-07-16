/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CalendarDays, CheckCircle2, Clock3, CreditCard, ExternalLink, FileText, GraduationCap, Loader2, Phone, Save, User, XCircle } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { getDocumentSignedUrl } from "../../../lib/supabase/storage";
import { admissionDocumentTypes, admissionStatusMeta, formatAdmissionDate, getAdmissionStatus, type AdmissionStatus } from "../admissions-config";

const db = supabaseClient as any;
const transitions: Partial<Record<AdmissionStatus, { value: AdmissionStatus; label: string }[]>> = {
  submitted: [{ value: "documents_review", label: "Mulai pemeriksaan berkas" }, { value: "verified", label: "Nyatakan berkas terverifikasi" }, { value: "rejected", label: "Belum dapat diterima" }],
  documents_review: [{ value: "verified", label: "Nyatakan berkas terverifikasi" }, { value: "submitted", label: "Kembalikan untuk perbaikan" }, { value: "rejected", label: "Belum dapat diterima" }],
  verified: [{ value: "assessment_scheduled", label: "Jadwalkan seleksi" }, { value: "accepted", label: "Terima tanpa seleksi tambahan" }, { value: "rejected", label: "Belum dapat diterima" }],
  assessment_scheduled: [{ value: "assessed", label: "Tandai seleksi selesai" }, { value: "verified", label: "Batalkan jadwal seleksi" }, { value: "rejected", label: "Belum dapat diterima" }],
  assessed: [{ value: "accepted", label: "Diterima" }, { value: "waitlisted", label: "Masuk daftar tunggu" }, { value: "rejected", label: "Belum diterima" }],
  waitlisted: [{ value: "accepted", label: "Diterima dari daftar tunggu" }, { value: "rejected", label: "Belum diterima" }, { value: "withdrawn", label: "Mengundurkan diri" }],
  accepted: [{ value: "withdrawn", label: "Mengundurkan diri" }],
};

export const ApplicantShow: React.FC = () => {
  const { id = "" } = useParams();
  const location = useLocation();
  const base = location.pathname.startsWith("/admin-spmb") ? "/admin-spmb" : "/admissions";
  const [applicant, setApplicant] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [action, setAction] = useState("");
  const [note, setNote] = useState("");
  const [schedule, setSchedule] = useState({ assessment_type: "academic_test", scheduled_at: "", location: "", notes: "" });
  const [enrollment, setEnrollment] = useState({ nis: "", class_id: "" });

  const load = async () => {
    setLoading(true);
    let result = await db.from("admissions_applicants").select("*, units(name), academic_years(name), admission_batches(name,quota,registration_fee)").eq("registration_number", id).maybeSingle();
    if (!result.data && /^[0-9a-f-]{36}$/i.test(id)) result = await db.from("admissions_applicants").select("*, units(name), academic_years(name), admission_batches(name,quota,registration_fee)").eq("id", id).maybeSingle();
    if (result.error || !result.data) { setApplicant(null); setLoading(false); return; }
    const row = result.data; setApplicant(row);
    const [doc, pay, assess, hist, classResult] = await Promise.all([
      db.from("admission_documents").select("*").eq("applicant_id", row.id).order("created_at"),
      db.from("admission_payments").select("*").eq("applicant_id", row.id).order("created_at", { ascending: false }),
      db.from("admission_assessments").select("*, employees(full_name)").eq("applicant_id", row.id).order("scheduled_at"),
      db.from("admission_status_history").select("*").eq("applicant_id", row.id).order("created_at", { ascending: false }),
      db.from("classes").select("id,name,grade_level").eq("unit_id", row.unit_id).eq("academic_year_id", row.academic_year_id).order("grade_level").order("name"),
    ]);
    setDocuments(doc.data || []); setPayments(pay.data || []); setAssessments(assess.data || []); setHistory(hist.data || []); setClasses(classResult.data || []); setLoading(false);
  };
  useEffect(() => { void load(); }, [id]);
  const status = applicant ? getAdmissionStatus(applicant) : "draft";
  const availableActions = transitions[status] || [];
  useEffect(() => { setAction(availableActions[0]?.value || ""); }, [status]);

  const transition = async () => {
    if (!applicant || !action) return;
    if (["rejected", "waitlisted", "withdrawn"].includes(action) && !note.trim()) { toast.error("Catatan keputusan wajib diisi agar komunikasi kepada orang tua jelas."); return; }
    setWorking(true);
    const { error } = await db.rpc("admission_transition", { p_applicant_id: applicant.id, p_to_status: action, p_note: note.trim() || null });
    setWorking(false);
    if (error) toast.error(error.message); else { toast.success("Status pendaftaran diperbarui dan dicatat dalam riwayat."); setNote(""); await load(); }
  };

  const reviewDocument = async (document: any, valid: boolean) => {
    const reviewNote = valid ? null : window.prompt("Tuliskan perbaikan yang harus dilakukan orang tua:");
    if (!valid && !reviewNote) return;
    const { data: auth } = await supabaseClient.auth.getUser();
    const { error } = await db.from("admission_documents").update({ status: valid ? "valid" : "revision_required", review_note: reviewNote, reviewed_at: new Date().toISOString(), reviewed_by: auth.user?.id }).eq("id", document.id);
    if (error) toast.error(error.message); else { toast.success(valid ? "Berkas dinyatakan valid." : "Permintaan perbaikan dikirim."); await load(); }
  };
  const reviewPayment = async (payment: any, valid: boolean) => {
    const reviewNote = valid ? null : window.prompt("Tuliskan alasan bukti pembayaran ditolak:");
    if (!valid && !reviewNote) return;
    const { data: auth } = await supabaseClient.auth.getUser();
    const { error } = await db.from("admission_payments").update({ status: valid ? "verified" : "rejected", verification_note: reviewNote, verified_at: new Date().toISOString(), verified_by: auth.user?.id }).eq("id", payment.id);
    if (error) toast.error(error.message); else { toast.success("Status pembayaran diperbarui."); await load(); }
  };
  const openFile = async (path?: string) => { if (!path) return; try { window.open(await getDocumentSignedUrl(path, 300), "_blank", "noopener,noreferrer"); } catch { toast.error("Berkas belum dapat dibuka."); } };

  const saveAssessment = async () => {
    if (!applicant || !schedule.scheduled_at || !schedule.location.trim()) { toast.error("Isi tanggal, waktu, dan lokasi seleksi."); return; }
    setWorking(true);
    const { error } = await db.from("admission_assessments").upsert({ applicant_id: applicant.id, ...schedule, result: "pending" }, { onConflict: "applicant_id,assessment_type" });
    if (!error && status === "verified") await db.rpc("admission_transition", { p_applicant_id: applicant.id, p_to_status: "assessment_scheduled", p_note: `Seleksi dijadwalkan di ${schedule.location}.` });
    setWorking(false);
    if (error) toast.error(error.message); else { toast.success("Jadwal seleksi tersimpan dan terlihat di portal orang tua."); await load(); }
  };
  const completeAssessment = async (assessment: any) => {
    const score = window.prompt("Nilai seleksi (0-100):", String(assessment.score || "")); if (score === null) return;
    const numericScore = Number(score); if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) { toast.error("Nilai harus berada antara 0 dan 100."); return; }
    const result = numericScore >= 75 ? "recommended" : numericScore >= 60 ? "considered" : "not_recommended";
    const { error } = await db.from("admission_assessments").update({ score: numericScore, result, completed_at: new Date().toISOString() }).eq("id", assessment.id);
    if (!error && status === "assessment_scheduled") await db.rpc("admission_transition", { p_applicant_id: applicant.id, p_to_status: "assessed", p_note: "Seluruh rangkaian seleksi telah selesai." });
    if (error) toast.error(error.message); else { toast.success("Hasil seleksi tersimpan."); await load(); }
  };
  const enroll = async () => {
    if (!applicant || !enrollment.nis.trim()) { toast.error("NIS wajib diisi."); return; }
    setWorking(true); const { error } = await db.rpc("admission_enroll_student", { p_applicant_id: applicant.id, p_nis: enrollment.nis.trim(), p_class_id: enrollment.class_id || null }); setWorking(false);
    if (error) toast.error(error.message); else { toast.success("Calon murid berhasil menjadi siswa aktif dan akun orang tua telah ditautkan."); await load(); }
  };

  const validDocs = documents.filter((doc) => doc.status === "valid").length;
  const requiredDocs = admissionDocumentTypes.filter((doc) => doc.required).length;
  const latestPayment = payments[0];
  const info = useMemo(() => applicant ? [["Nama lengkap",applicant.name],["NIK",applicant.nik],["NISN",applicant.nisn],["Jenis kelamin",applicant.gender === "P" ? "Perempuan" : "Laki-laki"],["Tempat, tanggal lahir",`${applicant.birth_place || "-"}, ${formatAdmissionDate(applicant.dob)}`],["Asal sekolah",applicant.previous_school],["Orang tua / wali",applicant.parent_name],["WhatsApp",applicant.parent_phone],["Email",applicant.parent_email],["Alamat",applicant.address]] : [], [applicant]);

  if (loading) return <div className="py-28 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-700" /></div>;
  if (!applicant) return <div className="max-w-xl mx-auto py-20 text-center"><AlertCircle className="w-10 h-10 text-amber-600 mx-auto" /><h1 className="text-xl font-bold mt-4">Pendaftar tidak ditemukan</h1><Link to={`${base}/applicants`} className="inline-flex mt-5 text-emerald-700 font-semibold">Kembali ke daftar</Link></div>;

  return <div className="space-y-6 max-w-6xl mx-auto"><div className="flex items-start gap-3"><Link to={`${base}/applicants`} title="Kembali" className="w-10 h-10 border rounded-md grid place-items-center shrink-0 hover:bg-slate-50"><ArrowLeft className="w-4 h-4" /></Link><div className="flex-1"><PageHeader title={applicant.name} description={`${applicant.registration_number} · ${applicant.units?.name || applicant.unit} · Kelas ${applicant.desired_grade || "-"}`} /></div><span className={`hidden sm:inline-flex px-3 py-1.5 rounded-full text-sm font-semibold ${admissionStatusMeta[status].tone}`}>{admissionStatusMeta[status].label}</span></div>
    <div className="grid sm:grid-cols-3 gap-4"><Summary icon={FileText} label="Berkas valid" value={`${validDocs}/${requiredDocs}`} detail={validDocs >= requiredDocs ? "Persyaratan utama lengkap" : "Masih perlu pemeriksaan"} /><Summary icon={CreditCard} label="Pembayaran" value={latestPayment?.status === "verified" ? "Valid" : latestPayment ? "Diproses" : "Belum ada"} detail={latestPayment ? Number(latestPayment.amount).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }) : "Bukti belum diunggah"} /><Summary icon={CalendarDays} label="Seleksi" value={assessments.some((item) => item.completed_at) ? "Selesai" : assessments.length ? "Terjadwal" : "Belum ada"} detail={assessments[0]?.scheduled_at ? formatAdmissionDate(assessments[0].scheduled_at, true) : "Jadwal belum dibuat"} /></div>
    <div className="grid lg:grid-cols-[1.55fr_1fr] gap-6"><div className="space-y-6">
      <section className="bg-white border rounded-lg p-5 sm:p-6"><h2 className="font-bold text-lg flex items-center gap-2"><User className="w-5 h-5 text-emerald-700" />Identitas dan Kontak</h2><div className="grid sm:grid-cols-2 gap-x-6 gap-y-5 mt-5">{info.map(([label,value]) => <div key={label} className={label === "Alamat" ? "sm:col-span-2" : ""}><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="font-medium mt-1 break-words">{value || "-"}</p></div>)}</div></section>
      <section className="bg-white border rounded-lg overflow-hidden"><div className="p-5 border-b"><h2 className="font-bold text-lg">Verifikasi Berkas</h2><p className="text-sm text-slate-600 mt-1">Buka berkas sebelum menyatakan valid atau meminta revisi.</p></div><div className="divide-y">{documents.map((doc) => <div key={doc.id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3"><div className="flex-1"><p className="font-bold">{admissionDocumentTypes.find((type) => type.value === doc.document_type)?.label || doc.document_type}</p><p className="text-xs text-slate-500 mt-1">{doc.file_name} · {doc.status}</p>{doc.review_note && <p className="text-sm text-rose-700 mt-2">{doc.review_note}</p>}</div><div className="flex gap-2"><button onClick={() => openFile(doc.file_url)} title="Buka berkas" className="w-9 h-9 border rounded-md grid place-items-center"><ExternalLink className="w-4 h-4" /></button><button onClick={() => reviewDocument(doc,true)} title="Nyatakan valid" className="w-9 h-9 border rounded-md grid place-items-center text-emerald-700"><CheckCircle2 className="w-4 h-4" /></button><button onClick={() => reviewDocument(doc,false)} title="Minta perbaikan" className="w-9 h-9 border rounded-md grid place-items-center text-rose-700"><XCircle className="w-4 h-4" /></button></div></div>)}{documents.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Belum ada berkas yang diunggah.</p>}</div></section>
      <section className="bg-white border rounded-lg overflow-hidden"><div className="p-5 border-b"><h2 className="font-bold text-lg">Pembayaran Pendaftaran</h2></div>{latestPayment ? <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4"><div className="flex-1"><p className="font-bold">{Number(latestPayment.amount).toLocaleString("id-ID", { style: "currency", currency: "IDR" })}</p><p className="text-sm text-slate-600 mt-1">Transfer {formatAdmissionDate(latestPayment.paid_at)} · {latestPayment.status}</p>{latestPayment.verification_note && <p className="text-sm text-rose-700 mt-2">{latestPayment.verification_note}</p>}</div><div className="flex gap-2"><button onClick={() => openFile(latestPayment.proof_url)} title="Buka bukti" className="w-9 h-9 border rounded-md grid place-items-center"><ExternalLink className="w-4 h-4" /></button><button onClick={() => reviewPayment(latestPayment,true)} className="h-9 px-3 border rounded-md text-sm font-semibold text-emerald-700">Verifikasi</button><button onClick={() => reviewPayment(latestPayment,false)} className="h-9 px-3 border rounded-md text-sm font-semibold text-rose-700">Tolak bukti</button></div></div> : <p className="p-8 text-center text-sm text-slate-500">Belum ada bukti pembayaran.</p>}</section>
      <section className="bg-white border rounded-lg p-5 sm:p-6"><h2 className="font-bold text-lg">Observasi / Seleksi</h2><div className="grid sm:grid-cols-2 gap-4 mt-5"><select value={schedule.assessment_type} onChange={(e) => setSchedule((v) => ({...v,assessment_type:e.target.value}))} className="h-10 px-3 border rounded-md"><option value="observation">Observasi kesiapan</option><option value="academic_test">Tes akademik</option><option value="quran">Pemetaan Al-Qur'an</option><option value="interview">Wawancara keluarga</option><option value="psychology">Psikologi</option></select><input type="datetime-local" value={schedule.scheduled_at} onChange={(e) => setSchedule((v) => ({...v,scheduled_at:e.target.value}))} className="h-10 px-3 border rounded-md" /><input value={schedule.location} onChange={(e) => setSchedule((v) => ({...v,location:e.target.value}))} placeholder="Lokasi / ruang / tautan" className="h-10 px-3 border rounded-md sm:col-span-2" /><textarea value={schedule.notes} onChange={(e) => setSchedule((v) => ({...v,notes:e.target.value}))} placeholder="Catatan persiapan untuk keluarga" className="min-h-20 p-3 border rounded-md sm:col-span-2" /></div><button onClick={saveAssessment} disabled={working} className="mt-4 h-10 px-4 rounded-md bg-slate-900 text-white font-semibold text-sm flex items-center gap-2"><Save className="w-4 h-4" />Simpan Jadwal</button><div className="mt-5 divide-y border-t">{assessments.map((item) => <div key={item.id} className="py-4 flex items-center gap-3"><div className="flex-1"><p className="font-bold text-sm">{item.assessment_type.replaceAll("_"," ")}</p><p className="text-xs text-slate-500 mt-1">{formatAdmissionDate(item.scheduled_at,true)} · {item.location || "-"} {item.score != null ? `· Nilai ${item.score}` : ""}</p></div>{!item.completed_at && <button onClick={() => completeAssessment(item)} className="h-9 px-3 border rounded-md text-sm font-semibold">Catat hasil</button>}</div>)}</div></section>
    </div><aside className="space-y-6">
      {availableActions.length > 0 && <section className="bg-white border rounded-lg p-5"><h2 className="font-bold text-lg">Tindak Lanjut</h2><p className="text-sm text-slate-600 mt-1">Perubahan status masuk ke riwayat audit.</p><select value={action} onChange={(e) => setAction(e.target.value)} className="w-full h-10 px-3 border rounded-md mt-4">{availableActions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan keputusan / informasi untuk orang tua" className="w-full min-h-24 p-3 border rounded-md mt-3" /><button onClick={transition} disabled={working} className="w-full h-10 mt-3 bg-emerald-700 text-white rounded-md font-semibold flex items-center justify-center gap-2">{working ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Terapkan Tindak Lanjut</button></section>}
      {status === "accepted" && <section className="bg-emerald-50 border border-emerald-200 rounded-lg p-5"><h2 className="font-bold text-lg flex items-center gap-2"><GraduationCap className="w-5 h-5" />Daftar Ulang</h2><p className="text-sm text-emerald-900 mt-1">Membuat siswa aktif sekaligus menautkan akun orang tua.</p><input value={enrollment.nis} onChange={(e) => setEnrollment((v) => ({...v,nis:e.target.value}))} placeholder="NIS baru *" className="w-full h-10 px-3 border rounded-md mt-4 bg-white" /><select value={enrollment.class_id} onChange={(e) => setEnrollment((v) => ({...v,class_id:e.target.value}))} className="w-full h-10 px-3 border rounded-md mt-3 bg-white"><option value="">Belum tentukan kelas</option>{classes.map((item) => <option key={item.id} value={item.id}>Kelas {item.grade_level} · {item.name}</option>)}</select><button onClick={enroll} disabled={working} className="w-full h-10 mt-3 bg-emerald-700 text-white rounded-md font-semibold">Jadikan Siswa Aktif</button></section>}
      <section className="bg-white border rounded-lg p-5"><h2 className="font-bold text-lg flex items-center gap-2"><Clock3 className="w-5 h-5 text-slate-500" />Riwayat Proses</h2><div className="mt-5 space-y-5">{history.map((item) => <div key={item.id} className="relative pl-5 border-l"><span className="absolute -left-1.5 top-0 w-3 h-3 bg-emerald-600 rounded-full ring-4 ring-white" /><p className="font-semibold text-sm">{admissionStatusMeta[item.to_status as AdmissionStatus]?.label || item.to_status}</p><p className="text-xs text-slate-500 mt-1">{formatAdmissionDate(item.created_at,true)}</p>{item.note && <p className="text-sm text-slate-600 mt-2">{item.note}</p>}</div>)}{history.length === 0 && <p className="text-sm text-slate-500">Belum ada riwayat perubahan.</p>}</div></section>
      <section className="bg-white border rounded-lg p-5"><h2 className="font-bold text-lg flex items-center gap-2"><Phone className="w-5 h-5 text-slate-500" />Kontak Keluarga</h2><p className="font-semibold mt-4">{applicant.parent_name || "-"}</p><a className="text-sm text-emerald-700 mt-2 block hover:underline" href={`https://wa.me/${String(applicant.parent_phone || "").replace(/^0/,"62").replace(/\D/g,"")}`} target="_blank" rel="noreferrer">{applicant.parent_phone || "Nomor belum diisi"}</a></section>
    </aside></div>
  </div>;
};

const Summary = ({ icon: Icon,label,value,detail }: { icon: React.ElementType; label:string; value:string; detail:string }) => <div className="bg-white border rounded-lg p-5"><Icon className="w-5 h-5 text-emerald-700" /><p className="text-xs uppercase font-semibold text-slate-500 mt-4">{label}</p><p className="font-bold text-lg mt-1">{value}</p><p className="text-xs text-slate-500 mt-1">{detail}</p></div>;
