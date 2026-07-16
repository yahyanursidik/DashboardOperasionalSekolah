/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, Eye, Filter, Inbox, Loader2, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { admissionStatusMeta, admissionStatuses, formatAdmissionDate, getAdmissionStatus } from "../admissions-config";

const db = supabaseClient as any;
const PAGE_SIZE = 15;

export const ApplicantsList: React.FC = () => {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin-spmb") ? "/admin-spmb" : "/admissions";
  const [rows, setRows] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [filters, setFilters] = useState({ search: "", unit: "", year: "", status: "" });

  const load = async () => {
    setLoading(true);
    let query = db.from("admissions_applicants").select("*, units(name), academic_years(name), admission_batches(name)", { count: "exact" }).is("archived_at", null).order("registration_date", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (filters.unit) query = query.eq("unit_id", filters.unit);
    if (filters.year) query = query.eq("academic_year_id", filters.year);
    if (filters.status) query = query.eq("workflow_status", filters.status);
    if (filters.search.trim()) {
      const search = filters.search.trim().replace(/[,%()]/g, " ");
      query = query.or(`name.ilike.%${search}%,registration_number.ilike.%${search}%,nik.ilike.%${search}%,parent_name.ilike.%${search}%`);
    }
    const { data, count: total, error } = await query;
    setLoading(false);
    if (error) { toast.error(`Data pendaftar belum dapat dimuat: ${error.message}`); return; }
    setRows(data || []); setCount(total || 0);
  };

  useEffect(() => { Promise.all([db.from("units").select("id,name").order("name"), db.from("academic_years").select("id,name,is_active").order("start_date", { ascending: false })]).then(([unitResult, yearResult]) => { setUnits(unitResult.data || []); setYears(yearResult.data || []); }); }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 250); return () => window.clearTimeout(timer); }, [page, filters]);

  const setFilter = (key: keyof typeof filters, value: string) => { setPage(1); setFilters((current) => ({ ...current, [key]: value })); };
  const archive = async (row: any) => {
    if (!window.confirm(`Arsipkan pendaftaran ${row.name}? Data tetap tersimpan dalam audit dan laporan historis.`)) return;
    const { error } = await db.from("admissions_applicants").update({ archived_at: new Date().toISOString() }).eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success("Pendaftaran dipindahkan ke arsip."); void load(); }
  };
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return <div className="space-y-6">
    <PageHeader title="Pendaftar SPMB" description="Periksa kelengkapan, seleksi, keputusan, dan daftar ulang calon murid lintas unit." />
    <section className="bg-white border rounded-lg p-4"><div className="grid md:grid-cols-[minmax(240px,1fr)_180px_180px_190px] gap-3"><label className="relative"><Search className="absolute w-4 h-4 left-3 top-3 text-slate-400" /><input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} className="w-full h-10 pl-9 pr-3 border rounded-md" placeholder="Cari nama, nomor daftar, NIK, atau wali" /></label><select value={filters.unit} onChange={(e) => setFilter("unit", e.target.value)} className="h-10 px-3 border rounded-md"><option value="">Semua unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><select value={filters.year} onChange={(e) => setFilter("year", e.target.value)} className="h-10 px-3 border rounded-md"><option value="">Semua tahun ajaran</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.is_active ? " · aktif" : ""}</option>)}</select><select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className="h-10 px-3 border rounded-md"><option value="">Semua status</option>{admissionStatuses.map((status) => <option key={status} value={status}>{admissionStatusMeta[status].label}</option>)}</select></div><p className="text-xs text-slate-500 mt-3 flex items-center gap-2"><Filter className="w-3.5 h-3.5" />{count} pendaftaran sesuai filter</p></section>
    <section className="bg-white border rounded-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 border-b text-slate-600"><tr><th className="text-left px-5 py-3">Calon murid</th><th className="text-left px-5 py-3">Unit / tujuan</th><th className="text-left px-5 py-3">Orang tua / wali</th><th className="text-left px-5 py-3">Status</th><th className="text-left px-5 py-3">Masuk</th><th className="text-right px-5 py-3">Aksi</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="w-7 h-7 animate-spin text-emerald-700 mx-auto" /></td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="py-16 text-center text-slate-500"><Inbox className="w-9 h-9 mx-auto mb-3 text-slate-300" />Belum ada pendaftar sesuai filter.</td></tr> : rows.map((row) => { const status = getAdmissionStatus(row); return <tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-bold text-slate-900">{row.name}</p><p className="text-xs text-slate-500 mt-1">{row.registration_number || "Nomor dibuat otomatis"}</p></td><td className="px-5 py-4"><p className="font-medium">{row.units?.name || row.unit || "-"}</p><p className="text-xs text-slate-500 mt-1">Kelas {row.desired_grade ?? "-"} · {row.academic_years?.name || row.academic_year || "-"}</p></td><td className="px-5 py-4"><p>{row.parent_name || "-"}</p><p className="text-xs text-slate-500 mt-1">{row.parent_phone || "-"}</p></td><td className="px-5 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${admissionStatusMeta[status].tone}`}>{admissionStatusMeta[status].label}</span></td><td className="px-5 py-4 text-slate-600">{formatAdmissionDate(row.registration_date)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><Link to={`${base}/applicants/${row.registration_number || row.id}`} title="Buka pendaftaran" className="w-9 h-9 grid place-items-center rounded-md border hover:bg-emerald-50 hover:text-emerald-700"><Eye className="w-4 h-4" /></Link><button onClick={() => archive(row)} title="Arsipkan pendaftaran" className="w-9 h-9 grid place-items-center rounded-md border hover:bg-amber-50 hover:text-amber-700"><Archive className="w-4 h-4" /></button></div></td></tr>; })}</tbody></table></div><div className="border-t px-5 py-3 flex items-center justify-between text-sm"><span className="text-slate-600">Halaman {page} dari {pages}</span><div className="flex gap-2"><button title="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="w-9 h-9 border rounded-md grid place-items-center disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><button title="Halaman berikutnya" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="w-9 h-9 border rounded-md grid place-items-center disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div></section>
  </div>;
};
