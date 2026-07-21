import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowLeft, Bell, Building2, Calendar, CheckCircle2, Clock, Megaphone, Search, Users } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { loadTeacherAssignedUnitIds } from "../schedules/schedule-data";

const READ_KEY = "teacher_portal_read_announcement_ids";

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
  if (item.target_type === "class") return item.classes?.name ? `Kelas ${item.classes.name}` : "Kelas";
  return "Semua Warga Sekolah";
}

function targetIcon(type?: string) {
  if (type === "unit") return Building2;
  if (type === "class") return Users;
  return Megaphone;
}

export const TeacherAnnouncements: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setIsLoading(true);
      try {
        let scheduleQuery = supabaseClient
          .from("employee_schedules")
          .select("class_id")
          .eq("employee_id", employee.id)
          .not("class_id", "is", null);
        if (activeYearId) scheduleQuery = scheduleQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) scheduleQuery = scheduleQuery.eq("semester_id", activeSemesterId);

        const [{ data: scheduleRows }, { data: homeroomRows }, { data: announcementRows }, readsResult, assignedUnitIds] = await Promise.all([
          scheduleQuery,
          supabaseClient
            .from("classes")
            .select("id")
            .eq("homeroom_teacher_id", employee.id),
          supabaseClient
            .from("announcements")
            .select("id, title, content, target_type, unit_id, class_id, status, publish_at, created_at, units(name), classes(name)")
            .eq("status", "terkirim")
            .order("publish_at", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(100),
          supabaseClient
            .from("employee_announcement_reads")
            .select("announcement_id")
            .eq("employee_id", employee.id),
          loadTeacherAssignedUnitIds(employee.id, activeYearId, activeSemesterId),
        ]);

        const classIds = new Set<string>();
        (scheduleRows || []).forEach((row: any) => row.class_id && classIds.add(row.class_id));
        (homeroomRows || []).forEach((row: any) => row.id && classIds.add(row.id));
        const now = Date.now();
        const accessibleUnitIds = new Set([employee.unit_id, ...assignedUnitIds].filter(Boolean));

        const scopedAnnouncements = (announcementRows || []).filter((item: any) => {
          if (item.publish_at && new Date(item.publish_at).getTime() > now) return false;
          if (item.target_type === "all" || item.target_type === "staff") return true;
          if (item.target_type === "unit") return !item.unit_id || accessibleUnitIds.has(item.unit_id);
          if (item.target_type === "class") return item.class_id && classIds.has(item.class_id);
          return false;
        });

        setAnnouncements(scopedAnnouncements);
        if (!readsResult.error) {
          const persistedIds = new Set<string>((readsResult.data || []).map((row: any) => row.announcement_id));
          setReadIds(persistedIds);
          saveReadIds(persistedIds);
        }
      } catch (error) {
        console.error("Teacher announcements fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, [activeSemesterId, activeYearId, employee.id, employee.unit_id]);

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
    if (error && error.code !== "42P01") console.error("Announcement receipt error:", error);
  };

  const markAllRead = async () => {
    const next = new Set(readIds);
    announcements.forEach((item) => next.add(item.id));
    setReadIds(next);
    saveReadIds(next);
    if (announcements.length) {
      const { error } = await supabaseClient.from("employee_announcement_reads").upsert(announcements.map((item) => ({ employee_id: employee.id, announcement_id: item.id, read_at: new Date().toISOString() })), { onConflict: "employee_id,announcement_id" });
      if (error && error.code !== "42P01") console.error("Announcement receipts error:", error);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/teacher" className="p-2 bg-white rounded-full shadow-sm border text-gray-600 hover:text-primary transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <h2 className="font-bold text-lg text-gray-900">Informasi Sekolah</h2>
          <p className="text-xs text-gray-500">Pengumuman resmi yang relevan untuk guru dan unit Anda.</p>
        </div>
      </div>

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Kotak Informasi</p>
              <h3 className="text-2xl font-black text-gray-900">{unreadCount} belum dibaca</h3>
              <p className="mt-1 text-sm text-gray-500">Biasakan cek pengumuman sebelum mulai mengajar.</p>
            </div>
          </div>
          <button
            onClick={markAllRead}
            disabled={announcements.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Tandai Semua Dibaca
          </button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari judul atau isi pengumuman..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm font-medium outline-none"
          >
            <option value="all">Semua Informasi</option>
            <option value="staff">Guru & Pegawai</option>
            <option value="unit">Unit Saya</option>
            <option value="class">Kelas Saya</option>
          </select>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-gray-400">
          Memuat pengumuman...
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-bold text-gray-700">Belum ada pengumuman</p>
          <p className="mt-1 text-sm text-gray-500">Tidak ada informasi yang cocok dengan filter saat ini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((item) => {
            const isRead = readIds.has(item.id);
            const Icon = targetIcon(item.target_type);
            return (
              <article key={item.id} className={`rounded-2xl border bg-white shadow-sm transition ${isRead ? "border-gray-200" : "border-amber-300 ring-2 ring-amber-100"}`}>
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isRead ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          {!isRead && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Baru</span>}
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">{targetLabel(item)}</span>
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
                  {!isRead && (
                    <button onClick={() => markRead(item.id)} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                      Tandai Dibaca
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
