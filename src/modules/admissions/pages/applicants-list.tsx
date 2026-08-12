/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, Eye, Filter, Inbox, Loader2, Search, ShieldAlert, Trash2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { deleteStoredFile } from "../../../lib/supabase/storage";
import { isOnlinePreschoolProgram, timeZoneLabel } from "../../../lib/timezones";
import { admissionStatusMeta, admissionStatuses, formatAdmissionDate, getAdmissionStatus } from "../admissions-config";
import { applicantTargetLabel, entryTypeLabel } from "../quota-utils";

const db = supabaseClient as any;
const PAGE_SIZE = 15;

export const ApplicantsList: React.FC = () => {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin-spmb") ? "/admin-spmb" : "/admissions";
  const [rows, setRows] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ search: "", unit: "", year: "", classId: "", entryType: "", status: "" });

  const load = async () => {
    setLoading(true);
    let query = db.from("admissions_applicants").select("*, units(name), academic_years(name), admission_batches(name), desired_classes:desired_class_id(name,grade_level)", { count: "exact" }).is("archived_at", null).order("registration_date", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (filters.unit) query = query.eq("unit_id", filters.unit);
    if (filters.year) query = query.eq("academic_year_id", filters.year);
    if (filters.classId) query = query.eq("desired_class_id", filters.classId);
    if (filters.entryType) query = query.eq("entry_type", filters.entryType);
    if (filters.status) query = query.eq("workflow_status", filters.status);
    if (filters.search.trim()) { const search = filters.search.trim().replace(/[,%()]/g, " "); query = query.or(`name.ilike.%${search}%,registration_number.ilike.%${search}%,nik.ilike.%${search}%,parent_name.ilike.%${search}%`); }
    const { data, count: total, error } = await query;
    setLoading(false);
    if (error) { toast.error(`Data pendaftar belum dapat dimuat: ${error.message}`); return; }
    setRows(data || []); setCount(total || 0);
  };
  useEffect(() => { Promise.all([
    db.from("units").select("id,name").order("name"),
    db.from("academic_years").select("id,name,is_active").order("start_date", { ascending: false }),
    db.from("classes").select("id,name,unit_id,academic_year_id,grade_level").order("grade_level").order("name"),
  ]).then(([u, y, c]) => { setUnits(u.data || []); setYears(y.data || []); setClasses(c.data || []); }); }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 250); return () => window.clearTimeout(timer); }, [page, filters]);

  const setFilter = (key: keyof typeof filters, value: string) => { setPage(1); setFilters((current) => ({ ...current, [key]: value })); };
  const archive = async (row: any) => { if (!window.confirm(`Arsipkan pendaftaran ${row.name}? Data tetap tersimpan dalam audit dan laporan historis.`)) return; const { error } = await db.from("admissions_applicants").update({ archived_at: new Date().toISOString() }).eq("id", row.id); if (error) toast.error(error.message); else { toast.success("Pendaftaran dipindahkan ke arsip."); void load(); } };
  const purge = async (row: any) => {
    if (getAdmissionStatus(row) === "enrolled" || row.student_id) {
      toast.error("Pendaftar sudah menjadi siswa aktif dan tidak dapat dihapus dari modul SPMB.");
      return;
    }
    const reason = window.prompt(`Alat pemulihan teknis akan menghapus seluruh data SPMB milik ${row.name}.\n\nTuliskan alasan teknis (minimal 8 karakter):`);
    if (reason === null) return;
    if (reason.trim().length < 8) { toast.error("Alasan teknis wajib diisi sedikitnya 8 karakter."); return; }
    const confirmation = window.prompt(`Tindakan ini permanen. Ketik nomor pendaftaran ${row.registration_number} untuk melanjutkan:`);
    if (confirmation === null) return;
    if (confirmation.trim().toUpperCase() !== String(row.registration_number || "").trim().toUpperCase()) { toast.error("Nomor pendaftaran tidak sesuai. Penghapusan dibatalkan."); return; }

    setDeletingId(row.id);
    const { data, error } = await db.rpc("admission_purge_applicant", {
      p_applicant_id: row.id,
      p_confirmation: confirmation.trim(),
      p_reason: reason.trim(),
    });
    if (error) {
      setDeletingId(null);
      toast.error(`Data belum dapat dihapus: ${error.message}`);
      return;
    }

    const result = data && typeof data === "object" ? data : {};
    const paths = Array.isArray(result.stored_paths) ? result.stored_paths.filter((path: unknown): path is string => typeof path === "string") : [];
    const cleanup = await Promise.allSettled(paths.map((path: string) => deleteStoredFile(path)));
    const cleanupFailures = cleanup.filter((item) => item.status === "rejected").length;
    setDeletingId(null);
    if (cleanupFailures > 0) toast.warning(`Data pendaftaran sudah dihapus, tetapi ${cleanupFailures} berkas storage perlu dibersihkan ulang.`);
    else toast.success(result.released_quota ? "Data dihapus permanen dan satu kursi kuota telah dikembalikan." : "Seluruh data pendaftaran berhasil dihapus permanen.");
    if (rows.length === 1 && page > 1) setPage((current) => current - 1); else await load();
  };
  const visibleClasses = classes.filter((row) => (!filters.unit || row.unit_id === filters.unit) && (!filters.year || row.academic_year_id === filters.year));
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return <div className="space-y-6"><PageHeader title="Pendaftar SPMB" description="Periksa calon murid berdasarkan unit, kelas tujuan, jalur masuk, tahapan seleksi, dan daftar ulang." />
    <div className="border border-amber-300 bg-amber-50 rounded-md p-4 flex gap-3 text-sm text-amber-950"><ShieldAlert className="w-5 h-5 shrink-0" /><div><p className="font-bold">Pemulihan data teknis</p><p className="mt-1">Gunakan hapus permanen hanya untuk data rusak atau pendaftaran uji. Formulir, berkas, pembayaran, dan proses terkait akan dihapus; kuota yang pernah terpakai akan kembali. Siswa yang sudah aktif dilindungi dari penghapusan.</p></div></div>
    <section className="bg-white border rounded-lg p-4"><div className="grid sm:grid-cols-2 xl:grid-cols-6 gap-3"><label className="relative sm:col-span-2"><Search className="absolute w-4 h-4 left-3 top-3 text-slate-400" /><input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} className="w-full h-10 pl-9 pr-3 border rounded-md" placeholder="Cari nama, nomor daftar, NIK, atau wali" /></label><FilterSelect value={filters.unit} onChange={(v) => setFilter("unit", v)}><option value="">Semua unit</option>{units.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FilterSelect><FilterSelect value={filters.year} onChange={(v) => setFilter("year", v)}><option value="">Semua tahun</option>{years.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FilterSelect><FilterSelect value={filters.classId} onChange={(v) => setFilter("classId", v)}><option value="">Semua kelas</option>{visibleClasses.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FilterSelect><FilterSelect value={filters.entryType} onChange={(v) => setFilter("entryType", v)}><option value="">Semua jalur</option><option value="new">Siswa baru</option><option value="transfer">Siswa pindahan</option></FilterSelect><FilterSelect value={filters.status} onChange={(v) => setFilter("status", v)}><option value="">Semua status</option>{admissionStatuses.map((x) => <option key={x} value={x}>{admissionStatusMeta[x].label}</option>)}</FilterSelect></div><p className="text-xs text-slate-500 mt-3 flex items-center gap-2"><Filter className="w-3.5 h-3.5" />{count} pendaftaran sesuai filter</p></section>
    <section className="bg-white border rounded-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 border-b text-slate-600"><tr><th className="text-left px-5 py-3">Calon murid</th><th className="text-left px-5 py-3">Unit / tujuan</th><th className="text-left px-5 py-3">Jalur</th><th className="text-left px-5 py-3">Orang tua / wali</th><th className="text-left px-5 py-3">Status</th><th className="text-left px-5 py-3">Masuk</th><th className="text-right px-5 py-3">Aksi</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="w-7 h-7 animate-spin text-emerald-700 mx-auto" /></td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="py-16 text-center text-slate-500"><Inbox className="w-9 h-9 mx-auto mb-3 text-slate-300" />Belum ada pendaftar sesuai filter.</td></tr> : rows.map((row) => { const status = getAdmissionStatus(row); const protectedStudent = status === "enrolled" || Boolean(row.student_id); return <tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-bold text-slate-900">{row.name}</p><p className="text-xs text-slate-500 mt-1">{row.registration_number || "Nomor dibuat otomatis"}</p></td><td className="px-5 py-4"><p className="font-medium">{row.units?.name || row.unit || "-"}</p><p className="text-xs text-slate-500 mt-1">{applicantTargetLabel(row)} · {row.academic_years?.name || row.academic_year || "-"}</p>{isOnlinePreschoolProgram(row) && <p className={`mt-1 text-xs font-semibold ${row.learning_timezone ? "text-blue-700" : "text-amber-700"}`}>Zona waktu: {row.learning_timezone ? timeZoneLabel(row.learning_timezone) : "Belum diisi"}{row.residence_country ? ` · ${row.residence_country}` : ""}</p>}</td><td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${row.entry_type === "transfer" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}>{entryTypeLabel(row.entry_type)}</span></td><td className="px-5 py-4"><p>{row.parent_name || "-"}</p><p className="text-xs text-slate-500 mt-1">{row.parent_phone || "-"}</p></td><td className="px-5 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${admissionStatusMeta[status].tone}`}>{admissionStatusMeta[status].label}</span></td><td className="px-5 py-4 text-slate-600">{formatAdmissionDate(row.registration_date)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><Link to={`${base}/applicants/${row.registration_number || row.id}`} title="Buka pendaftaran" className="w-9 h-9 grid place-items-center rounded-md border hover:bg-emerald-50 hover:text-emerald-700"><Eye className="w-4 h-4" /></Link><button onClick={() => archive(row)} title="Arsipkan pendaftaran" className="w-9 h-9 grid place-items-center rounded-md border hover:bg-amber-50 hover:text-amber-700"><Archive className="w-4 h-4" /></button><button type="button" onClick={() => void purge(row)} disabled={protectedStudent || deletingId === row.id} title={protectedStudent ? "Data siswa aktif dilindungi" : "Hapus seluruh data pendaftaran"} className="w-9 h-9 grid place-items-center rounded-md border text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-35">{deletingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</button></div></td></tr>; })}</tbody></table></div><div className="border-t px-5 py-3 flex items-center justify-between text-sm"><span className="text-slate-600">Halaman {page} dari {pages}</span><div className="flex gap-2"><button title="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage((v) => v - 1)} className="w-9 h-9 border rounded-md grid place-items-center disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><button title="Halaman berikutnya" disabled={page >= pages} onClick={() => setPage((v) => v + 1)} className="w-9 h-9 border rounded-md grid place-items-center disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div></section>
  </div>;
};

const FilterSelect = ({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) => <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 px-3 border rounded-md bg-white">{children}</select>;
