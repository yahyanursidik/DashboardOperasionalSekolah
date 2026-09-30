import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Bell, CalendarCheck, CheckCheck, FileText, ListTodo, Megaphone, Wallet } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";

type NotificationRow = {
  id: string;
  category: "announcement" | "report" | "payment" | "leave" | "task";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const categoryIcons: Record<NotificationRow["category"], React.ElementType> = {
  announcement: Megaphone,
  report: FileText,
  payment: Wallet,
  leave: CalendarCheck,
  task: ListTodo,
};

// The notifications table arrives with migration 20260930140000; until it is applied the bell
// keeps its previous behaviour (a link to the announcements page).
const isMissingTable = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === "42P01" || error.code === "PGRST205" || /notifications/.test(error.message || "") && /exist|schema cache/.test(error.message || "")));

const db = supabaseClient as unknown as {
  from: (table: string) => any;
  channel: typeof supabaseClient.channel;
  removeChannel: typeof supabaseClient.removeChannel;
  auth: typeof supabaseClient.auth;
};

function relativeTime(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

interface NotificationBellProps {
  /** Where the bell leads when the notification centre is unavailable. */
  fallbackHref: string;
  /** Badge shown in fallback mode (e.g. unread announcements computed by the layout). */
  fallbackBadge?: number;
  buttonClassName?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ fallbackHref, fallbackBadge = 0, buttonClassName }) => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (uid: string) => {
    const [list, counter] = await Promise.all([
      db.from("notifications").select("id, category, title, body, link, read_at, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid).is("read_at", null),
    ]);
    if (isMissingTable(list.error)) {
      setAvailable(false);
      return;
    }
    setAvailable(!list.error);
    setItems((list.data || []) as NotificationRow[]);
    setUnread(Number(counter.count || 0));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void db.auth.getSession().then(({ data }) => {
      if (!cancelled) setUserId(data.session?.user.id || null);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for the signed-in user
    void load(userId);
    const channel = db.channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload: { new: NotificationRow }) => {
        setItems((current) => [payload.new, ...current.filter((item) => item.id !== payload.new.id)].slice(0, 20));
        setUnread((count) => count + 1);
      })
      .subscribe();
    // Realtime can be blocked by proxies; a slow poll keeps the badge honest.
    const poll = window.setInterval(() => void load(userId), 120_000);
    return () => {
      window.clearInterval(poll);
      void db.removeChannel(channel);
    };
  }, [userId, load]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => (ids.includes(item.id) ? { ...item, read_at: item.read_at || now } : item)));
    setUnread((count) => Math.max(0, count - items.filter((item) => ids.includes(item.id) && !item.read_at).length));
    await db.from("notifications").update({ read_at: now }).in("id", ids).is("read_at", null);
  };

  const markAllRead = async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || now })));
    setUnread(0);
    await db.from("notifications").update({ read_at: now }).eq("user_id", userId).is("read_at", null);
  };

  const openItem = (item: NotificationRow) => {
    void markRead([item.id]);
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  const baseButton = buttonClassName || "relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground";
  const badge = (count: number) => count > 0 ? (
    <span className="absolute right-1 top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] font-bold leading-4 text-white">{count > 9 ? "9+" : count}</span>
  ) : null;

  if (available === false || !userId) {
    return (
      <Link to={fallbackHref} title="Informasi dan pengumuman" aria-label="Buka pengumuman" className={`relative ${baseButton}`}>
        <Bell className="h-5 w-5" />
        {badge(fallbackBadge)}
      </Link>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} title="Notifikasi" aria-label={`Notifikasi, ${unread} belum dibaca`} aria-expanded={open} className={`relative ${baseButton}`}>
        <Bell className="h-5 w-5" />
        {badge(unread)}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifikasi</p>
            {unread > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>}
            {items.map((item) => {
              const Icon = categoryIcons[item.category] || Bell;
              return (
                <button key={item.id} type="button" onClick={() => openItem(item)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-muted/50 ${item.read_at ? "" : "bg-primary/5"}`}>
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted"><Icon className="h-4 w-4 text-primary" /></span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${item.read_at ? "font-medium" : "font-semibold"}`}>{item.title}</span>
                    {item.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{item.body}</span>}
                    <span className="mt-1 block text-[11px] text-muted-foreground">{relativeTime(item.created_at)}</span>
                  </span>
                  {!item.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                </button>
              );
            })}
          </div>
          <Link to={fallbackHref} onClick={() => setOpen(false)} className="block border-t px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-muted/50">
            Lihat semua pengumuman
          </Link>
        </div>
      )}
    </div>
  );
};
