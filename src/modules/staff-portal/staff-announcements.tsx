/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Bell, Building2, Calendar, CheckCircle2, Clock, Megaphone, Search } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";
import { PageHeader } from "../../components/layout/PageHeader";

const READ_KEY = "staff_portal_read_announcement_ids";

function getReadIds() {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
  } catch {
    return new Set<string>();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids)));
}

function targetLabel(item: any) {
  if (item.target_type === "staff") return "Guru & Pegawai";
  if (item.target_type === "unit") return item.units?.name || "Unit";
  return "Semua Warga Sekolah";
}

export const StaffAnnouncements: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setIsLoading(true);
      try {
        const [{ data }, readsResult] = await Promise.all([
          supabaseClient.from("announcements").select("id, title, content, target_type, unit_id, status, publish_at, created_at, units(name)").eq("status", "terkirim").order("publish_at", { ascending: false }).order("created_at", { ascending: false }).limit(100),
          supabaseClient.from("employee_announcement_reads").select("announcement_id").eq("employee_id", employee.id),
        ]);

        const scoped = (data || []).filter((item: any) => {
          if (item.publish_at && new Date(item.publish_at).getTime() > Date.now()) return false;
          if (item.target_type === "all" || item.target_type === "staff") return true;
          if (item.target_type === "unit") return !item.unit_id || item.unit_id === employee.unit_id;
          return false;
        });
        setAnnouncements(scoped);
        if (!readsResult.error) {
          const persisted = new Set<string>((readsResult.data || []).map((row: any) => row.announcement_id));
          setReadIds(persisted);
          saveReadIds(persisted);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, [employee.id, employee.unit_id]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      if (filter !== "all" && item.target_type !== filter) return false;
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return `${item.title} ${item.content}`.toLowerCase().includes(needle);
    });
  }, [announcements, filter, query]);

  const unreadCount = announcements.filter((item) => !readIds.has(item.id)).length;

  const markRead = async (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(next);
    const { error } = await supabaseClient.from("employee_announcement_reads").upsert({ employee_id: employee.id, announcement_id: id, read_at: new Date().toISOString() }, { onConflict: "employee_id,announcement_id" });
    if (error && error.code !== "42P01") console.error("Staff announcement receipt error:", error);
  };

  const markAllRead = async () => {
    const next = new Set(readIds);
    announcements.forEach((item) => next.add(item.id));
    setReadIds(next);
    saveReadIds(next);
    if (announcements.length) {
      const { error } = await supabaseClient.from("employee_announcement_reads").upsert(announcements.map((item) => ({ employee_id: employee.id, announcement_id: item.id, read_at: new Date().toISOString() })), { onConflict: "employee_id,announcement_id" });
      if (error && error.code !== "42P01") console.error("Staff announcement receipts error:", error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Informasi Sekolah" description="Pengumuman resmi untuk staf dan unit kerja Anda." />

      <section className="rounded-md border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">Kotak Informasi</p>
              <h3 className="text-2xl font-black text-gray-900">{unreadCount} belum dibaca</h3>
              <p className="mt-1 text-sm text-gray-500">Informasi operasional, keamanan, kebersihan, dan layanan sekolah.</p>
            </div>
          </div>
          <button onClick={markAllRead} disabled={announcements.length === 0} className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100">
            <CheckCircle2 className="h-4 w-4" />
            Tandai Semua Dibaca
          </button>
        </div>
      </section>

      <section className="rounded-md border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul atau isi pengumuman..." className="w-full bg-transparent text-sm outline-none" />
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">Semua Informasi</option>
            <option value="staff">Guru & Pegawai</option>
            <option value="unit">Unit Saya</option>
          </select>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-md border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">Memuat pengumuman...</div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card p-10 text-center">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-black text-gray-700">Belum ada pengumuman</p>
          <p className="mt-1 text-sm text-gray-500">Tidak ada informasi yang cocok dengan filter saat ini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((item) => {
            const isRead = readIds.has(item.id);
            return (
              <article key={item.id} className={`rounded-md border bg-card transition ${isRead ? "border-border" : "border-amber-300 ring-2 ring-amber-100"}`}>
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${isRead ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"}`}>
                        {item.target_type === "unit" ? <Building2 className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          {!isRead && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">Baru</span>}
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">{targetLabel(item)}</span>
                        </div>
                        <h3 className="text-lg font-black leading-tight text-gray-900">{item.title}</h3>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[11px] font-medium text-gray-500">
                      <div className="flex items-center justify-end gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.publish_at || item.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.publish_at || item.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{item.content}</div>
                  {!isRead && <button onClick={() => markRead(item.id)} className="mt-4 rounded-md bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800">Tandai Dibaca</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
