import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Bell, Calendar, CheckCheck, ChevronDown, Clock, Megaphone } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";
import type { ParentPortalContext } from "./portal-context";

type PortalAnnouncement = {
  id: string;
  title: string;
  content: string;
  target_type: string;
  publish_at?: string | null;
  created_at: string;
  units?: { name?: string | null } | null;
  classes?: { name?: string | null } | null;
};

type AnnouncementRead = { announcement_id: string };

export const PortalAnnouncements: React.FC = () => {
  const { parent, refreshUnreadAnnouncements } = useOutletContext<ParentPortalContext>();
  const [announcements, setAnnouncements] = useState<PortalAnnouncement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setIsLoading(true);
      setError("");
      const [{ data, error: announcementError }, { data: reads }] = await Promise.all([
        supabaseClient
          .from("announcements")
          .select("id, title, content, target_type, unit_id, class_id, publish_at, created_at, units(name), classes(name)")
          .eq("status", "terkirim")
          .in("target_type", ["all", "parents", "unit", "class"])
          .order("publish_at", { ascending: false })
          .order("created_at", { ascending: false }),
        supabaseClient.from("parent_announcement_reads").select("announcement_id").eq("parent_id", parent.id),
      ]);
      if (announcementError) {
        console.error("Parent announcements error:", announcementError);
        setError("Pengumuman belum dapat dimuat.");
      }
      setAnnouncements((data || []) as unknown as PortalAnnouncement[]);
      setReadIds(new Set(((reads || []) as unknown as AnnouncementRead[]).map((item) => item.announcement_id)));
      setIsLoading(false);
    };
    void fetchAnnouncements();
  }, [parent.id]);

  const unreadCount = useMemo(() => announcements.filter((item) => !readIds.has(item.id)).length, [announcements, readIds]);
  const visibleAnnouncements = filter === "unread" ? announcements.filter((item) => !readIds.has(item.id)) : announcements;

  const openAnnouncement = async (announcementId: string) => {
    setExpandedId((current) => current === announcementId ? null : announcementId);
    if (readIds.has(announcementId)) return;
    const { error: readError } = await supabaseClient.from("parent_announcement_reads").upsert({
      announcement_id: announcementId,
      parent_id: parent.id,
      read_at: new Date().toISOString(),
    }, { onConflict: "announcement_id,parent_id" });
    if (!readError) {
      setReadIds((current) => new Set([...current, announcementId]));
      await refreshUnreadAnnouncements();
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-0">
      <header className="flex flex-col gap-4 rounded-lg border bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-700">Informasi resmi sekolah</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">Pengumuman</h1>
          <p className="mt-1 text-sm text-gray-500">Informasi sesuai unit dan kelas anak yang tertaut.</p>
        </div>
        <div className="flex rounded-md border bg-gray-50 p-1">
          <button onClick={() => setFilter("all")} className={`rounded px-3 py-2 text-xs font-bold ${filter === "all" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"}`}>Semua ({announcements.length})</button>
          <button onClick={() => setFilter("unread")} className={`rounded px-3 py-2 text-xs font-bold ${filter === "unread" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"}`}>Belum dibaca ({unreadCount})</button>
        </div>
      </header>

      {isLoading ? (
        <div className="rounded-lg border bg-white p-10 text-center text-sm text-gray-500">Memuat pengumuman...</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : visibleAnnouncements.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center">
          <Bell className="mx-auto h-9 w-9 text-gray-300" />
          <p className="mt-3 font-semibold text-gray-700">{filter === "unread" ? "Semua pengumuman sudah dibaca" : "Belum ada pengumuman"}</p>
          <p className="mt-1 text-sm text-gray-500">Informasi baru dari sekolah akan tampil di sini.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white divide-y">
          {visibleAnnouncements.map((announcement) => {
            const isRead = readIds.has(announcement.id);
            const isExpanded = expandedId === announcement.id;
            const scope = announcement.classes?.name || announcement.units?.name || (announcement.target_type === "all" ? "Seluruh sekolah" : "Orang tua");
            const publishedAt = announcement.publish_at || announcement.created_at;
            return (
              <article key={announcement.id} className={isRead ? "bg-white" : "bg-emerald-50/40"}>
                <button onClick={() => void openAnnouncement(announcement.id)} className="flex w-full items-start gap-4 p-5 text-left hover:bg-gray-50">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${isRead ? "bg-gray-100 text-gray-500" : "bg-emerald-100 text-emerald-700"}`}><Megaphone className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!isRead && <span className="h-2 w-2 rounded-full bg-emerald-600" />}
                      <h2 className="font-bold text-gray-950">{announcement.title}</h2>
                      <span className="rounded border bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500">{scope}</span>
                    </div>
                    {!isExpanded && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{announcement.content}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400"><span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(publishedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>{isRead && <span className="flex items-center gap-1 text-emerald-700"><CheckCheck className="h-3.5 w-3.5" /> Dibaca</span>}</div>
                  </div>
                  <ChevronDown className={`mt-2 h-4 w-4 shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {isExpanded && <div className="border-t bg-white px-5 py-5 sm:pl-[76px]"><p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{announcement.content}</p></div>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
