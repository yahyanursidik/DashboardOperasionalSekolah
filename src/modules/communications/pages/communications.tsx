/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "../../../components/layout/PageHeader";
import { MessageSquare, Send, Users, Smartphone, FileText, CheckCircle2, Loader2, Radio, Mail } from "lucide-react";
import { toast } from "sonner";
import { useCreate, useGetIdentity, useList } from "@/lib/refine-compat";
import { describeNotificationResult, sendNotificationEvent } from "../../../lib/email";

type TargetType = "all_parents" | "class_parents" | "all_teachers";

const targetLabels: Record<string, string> = {
  all: "Semua pengguna",
  unit: "Satu unit",
  class: "Orang tua per kelas",
  staff: "Guru & staf",
  parents: "Semua orang tua",
};

// Broadcasts are published announcements (shown in the parent, teacher, and staff portals)
// and, optionally, emailed through the notify-email Edge Function (Mailketing). Recipients
// are resolved on the server from the announcement's target.
export const CommunicationsPage: React.FC = () => {
  const { data: identity } = useGetIdentity<any>();
  const [targetType, setTargetType] = useState<TargetType>("class_parents");
  const [selectedClass, setSelectedClass] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [isEmailing, setIsEmailing] = useState(false);

  const { data: classesData, isLoading: isLoadingClasses } = useList({
    resource: "classes",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });
  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = useList({
    resource: "announcements",
    pagination: { currentPage: 1, pageSize: 5, mode: "server" },
    sorters: [{ field: "created_at", order: "desc" }],
    meta: { select: "id, title, target_type, status, created_at, classes(name)" },
  });
  const { mutate: createAnnouncement, isLoading: isSending } = useCreate();
  const historyIds = (historyData?.data || []).map((item: any) => String(item.id));
  const { data: emailStatusData, refetch: refetchEmailStatus } = useList({
    resource: "email_messages",
    pagination: { mode: "off" },
    filters: [{ field: "event_type", operator: "eq", value: "announcement" }, { field: "source_id", operator: "in", value: historyIds }],
    meta: { select: "source_id, status" },
    queryOptions: { enabled: historyIds.length > 0 },
  });
  const emailStats = (emailStatusData?.data || []).reduce((acc: Record<string, { sent: number; failed: number; pending: number }>, row: any) => {
    const entry = acc[row.source_id] || { sent: 0, failed: 0, pending: 0 };
    if (row.status === "sent") entry.sent += 1; else if (row.status === "failed") entry.failed += 1; else entry.pending += 1;
    acc[row.source_id] = entry;
    return acc;
  }, {});

  const emailAnnouncement = async (announcementId: string, retryFailed = false) => {
    setIsEmailing(true);
    const result = await sendNotificationEvent("announcement", [announcementId], { retryFailed });
    setIsEmailing(false);
    if (result.success && !result.totals?.failed) toast.success(describeNotificationResult(result));
    else toast.error(describeNotificationResult(result));
    void refetchEmailStatus();
  };

  const classes = (classesData?.data || []) as Array<{ id: string; name: string; unit_id: string | null }>;
  const canSend = title.trim().length >= 3 && message.trim().length >= 10 && (targetType !== "class_parents" || Boolean(selectedClass));

  const handleSend = () => {
    if (!canSend) return;
    const selected = classes.find((item) => String(item.id) === selectedClass);
    const target = targetType === "class_parents"
      ? { target_type: "class", class_id: selectedClass, unit_id: selected?.unit_id || null }
      : targetType === "all_parents"
        ? { target_type: "parents", class_id: null, unit_id: null }
        : { target_type: "staff", class_id: null, unit_id: null };

    createAnnouncement({
      resource: "announcements",
      values: {
        title: title.trim(),
        content: message.trim(),
        ...target,
        status: "terkirim",
        publish_at: new Date().toISOString(),
        created_by: identity?.id,
      },
      successNotification: false,
    }, {
      onSuccess: (created: any) => {
        toast.success("Pesan diterbitkan ke portal penerima.");
        const createdId = created?.data?.id;
        if (sendEmail && createdId) void emailAnnouncement(String(createdId));
        setLastSent(title.trim());
        setTitle("");
        setMessage("");
        void refetchHistory();
      },
      onError: (error: any) => toast.error("Pesan belum terkirim", { description: error?.message }),
    });
  };

  const targetButton = (value: TargetType, label: string, Icon: React.ElementType) => (
    <button
      type="button"
      onClick={() => setTargetType(value)}
      className={`flex items-center gap-2 px-4 py-3 border rounded-lg text-sm font-medium transition-all ${targetType === value ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" : "hover:border-primary/50 text-muted-foreground"}`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Komunikasi"
        description="Kirim pesan broadcast ke orang tua, kelas tertentu, atau guru & staf melalui portal masing-masing."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="border-b px-6 py-4 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Tulis Pesan Broadcast Baru</h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">Pilih Target Penerima</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {targetButton("class_parents", "Orang Tua per Kelas", Users)}
                  {targetButton("all_parents", "Semua Orang Tua", Users)}
                  {targetButton("all_teachers", "Guru & Staf", Smartphone)}
                </div>
              </div>

              {targetType === "class_parents" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pilih Kelas</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:border-primary outline-none"
                    disabled={isLoadingClasses}
                  >
                    <option value="">{isLoadingClasses ? "Memuat kelas..." : "-- Pilih Kelas --"}</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Judul Pesan</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Pengingat pengumpulan formulir kegiatan"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-medium">Isi Pesan</label>
                  <span className="text-xs text-muted-foreground">{message.length} karakter</span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Tulis pesan yang ingin disampaikan (minimal 10 karakter)..."
                  className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:border-primary outline-none resize-y"
                />
              </div>

              <label className="flex items-start gap-3 rounded-lg border p-3 text-sm cursor-pointer">
                <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                <span>
                  <span className="font-medium flex items-center gap-1.5"><Mail className="w-4 h-4 text-primary" /> Kirim juga via email</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">Dikirim ke email orang tua/wali siswa dan pegawai yang terdaftar sesuai target penerima.</span>
                </span>
              </label>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {lastSent ? (
                  <span className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" /> "{lastSent}" sudah terbit di portal penerima.
                  </span>
                ) : <span className="text-xs text-muted-foreground">Pesan terbit sebagai pengumuman dan langsung tampil di portal penerima.</span>}
                <button
                  onClick={handleSend}
                  disabled={!canSend || isSending || isEmailing}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSending || isEmailing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSending ? "Menerbitkan..." : isEmailing ? "Mengirim email..." : "Kirim Broadcast"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border rounded-xl p-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Radio className="w-5 h-5 text-primary" />
              Saluran Pengiriman
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between gap-2"><span>Portal Orang Tua / Guru / Staf</span><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Aktif</span></li>
              <li className="flex items-center justify-between gap-2"><span>Email (Mailketing)</span><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Aktif</span></li>
            </ul>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Setiap penerima hanya menerima satu email per pesan. Status per penerima dapat dipantau di <Link to="/communications/email-log" className="text-primary hover:underline">Log Email</Link>.
            </p>
          </div>

          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="border-b px-6 py-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Riwayat Broadcast</h3>
            </div>
            <div className="divide-y">
              {isLoadingHistory && <div className="p-4 text-sm text-muted-foreground">Memuat riwayat...</div>}
              {!isLoadingHistory && (historyData?.data || []).length === 0 && (
                <div className="p-4 text-sm text-muted-foreground flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Belum ada pesan terkirim.</div>
              )}
              {(historyData?.data || []).map((item: any) => (
                <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <h4 className="font-medium text-sm truncate">{item.title}</h4>
                  <div className="flex justify-between items-center mt-2 gap-2">
                    <span className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground truncate">
                      {item.target_type === "class" && item.classes?.name ? `Kelas ${item.classes.name}` : targetLabels[item.target_type] || item.target_type}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(item.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {emailStats[item.id] ? (
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" /> {emailStats[item.id].sent} terkirim
                        {emailStats[item.id].failed ? `, ${emailStats[item.id].failed} gagal` : ""}
                        {emailStats[item.id].pending ? `, ${emailStats[item.id].pending} antre` : ""}
                      </span>
                      {(emailStats[item.id].failed > 0 || emailStats[item.id].pending > 0) && (
                        <button type="button" disabled={isEmailing} onClick={() => void emailAnnouncement(String(item.id), true)} className="font-semibold text-primary hover:underline disabled:opacity-50">Kirim ulang</button>
                      )}
                    </div>
                  ) : item.status === "terkirim" ? (
                    <button type="button" disabled={isEmailing} onClick={() => void emailAnnouncement(String(item.id))} className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                      <Mail className="w-3.5 h-3.5" /> Kirim via email
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <Link to="/announcements" className="block w-full p-3 text-center text-sm font-medium text-primary hover:bg-primary/5 transition-colors">
              Lihat Semua Riwayat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
