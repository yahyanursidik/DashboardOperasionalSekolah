/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Clock3, Loader2, LocateFixed, LogIn, LogOut, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { isMissingSupabaseRelation } from "../../../lib/supabase/schema-errors";

type EmployeeEventAttendanceProps = {
  employee: any;
  portal: "teacher" | "staff";
};

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function shortTime(value?: string) {
  return String(value || "-").slice(0, 5);
}

function formatDate(value?: string) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long" }) : "-";
}

function formatEventError(error: any) {
  const message = String(error?.message || error || "");
  if (message.includes("EVENT_ALREADY_CHECKED_IN")) return "Kehadiran kegiatan sudah tercatat.";
  if (message.includes("EVENT_ALREADY_CHECKED_OUT")) return "Jam selesai kegiatan sudah tercatat.";
  if (message.includes("EVENT_CHECK_IN_REQUIRED")) return "Catat hadir kegiatan sebelum mencatat selesai.";
  if (message.includes("EVENT_CHECK_IN_CLOSED")) return "Batas akhir presensi kegiatan telah lewat. Hubungi penanggung jawab kegiatan.";
  if (message.includes("EVENT_NOT_TODAY")) return "Presensi hanya dapat dilakukan pada tanggal kegiatan.";
  if (message.includes("EVENT_NOT_OPEN")) return "Kegiatan belum dibuka atau sudah ditutup.";
  if (message.includes("LOCATION_REQUIRED")) return "Lokasi perangkat diperlukan untuk kegiatan ini.";
  if (message.includes("LOCATION_ACCURACY_LOW")) return "Akurasi GPS belum memadai. Pindah ke area terbuka lalu coba lagi.";
  if (message.includes("OUTSIDE_GEOFENCE")) return "Anda berada di luar radius lokasi kegiatan.";
  return error?.message || "Presensi kegiatan belum dapat disimpan.";
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Perangkat tidak mendukung layanan lokasi."));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}

export const EmployeeEventAttendance: React.FC<EmployeeEventAttendanceProps> = ({ employee, portal }) => {
  const today = localDateValue();
  const [participations, setParticipations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [savingEventId, setSavingEventId] = useState("");

  const loadEvents = async () => {
    setIsLoading(true);
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const end = new Date();
    end.setDate(end.getDate() + 45);
    const { data, error } = await supabaseClient
      .from("attendance_event_participants")
      .select("id,participation_type,notes,attendance_events(id,title,event_type,event_date,start_time,end_time,check_in_close,grace_minutes,description,status,require_geofence,site_id,units(name),attendance_sites(name,address,radius_meters),attendance_event_records(id,employee_id,status,check_in_at,check_out_at,late_minutes,verification_status))")
      .eq("employee_id", employee.id)
      .gte("attendance_events.event_date", localDateValue(start))
      .lte("attendance_events.event_date", localDateValue(end));
    if (error && isMissingSupabaseRelation(error, "attendance_event_participants")) {
      setParticipations([]);
      setIsAvailable(false);
      setIsLoading(false);
      return;
    }
    if (error) toast.error("Jadwal kegiatan belum dapat dimuat", { description: "Silakan coba kembali atau hubungi admin sistem." });
    else setIsAvailable(true);
    const rows = (data || []).filter((item: any) => item.attendance_events && item.attendance_events.status !== "cancelled").sort((a: any, b: any) => `${a.attendance_events.event_date}${a.attendance_events.start_time}`.localeCompare(`${b.attendance_events.event_date}${b.attendance_events.start_time}`));
    setParticipations(rows);
    setIsLoading(false);
  };

  useEffect(() => { void loadEvents(); }, [employee.id]);

  const relevantRows = useMemo(() => participations.filter((item) => {
    const event = item.attendance_events;
    return event.event_date >= today || event.attendance_event_records?.some((record: any) => record.employee_id === employee.id && !record.check_out_at);
  }).slice(0, 8), [employee.id, participations, today]);

  const recordEvent = async (event: any, action: "check_in" | "check_out") => {
    setSavingEventId(event.id);
    try {
      let coordinates: GeolocationCoordinates | null = null;
      if (event.require_geofence) coordinates = (await getCurrentPosition()).coords;
      const { data, error } = await supabaseClient.rpc("record_employee_event_attendance", {
        p_event_id: event.id,
        p_action: action,
        p_site_id: event.site_id || null,
        p_latitude: coordinates?.latitude ?? null,
        p_longitude: coordinates?.longitude ?? null,
        p_accuracy_meters: coordinates?.accuracy ?? null,
        p_device_context: { portal, activity: "attendance_event", platform: navigator.platform || "unknown" },
      });
      if (error) throw error;
      const result = data as any;
      toast.success(action === "check_in"
        ? result?.status === "late" ? `Hadir kegiatan tercatat. Terlambat ${result.late_minutes} menit.` : "Hadir kegiatan berhasil dicatat."
        : "Selesai kegiatan berhasil dicatat.");
      await loadEvents();
    } catch (error: any) {
      toast.error(formatEventError(error));
    } finally { setSavingEventId(""); }
  };

  if (!isAvailable) return null;

  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700"><CalendarClock className="h-5 w-5" /></div><div><h2 className="font-bold text-gray-900">Rapat & Kegiatan Tambahan</h2><p className="mt-1 text-xs leading-5 text-gray-500">Presensi kegiatan terpisah dari jam kerja harian agar rapat, pelatihan, dan tugas insidental tidak saling menimpa.</p></div></div>
        <span className="w-fit rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">{relevantRows.length} kegiatan</span>
      </div>
      {isLoading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" /></div> : relevantRows.length === 0 ? <div className="py-8 text-center"><CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-300" /><p className="text-sm font-semibold text-gray-600">Belum ada kegiatan tambahan yang ditugaskan.</p></div> : <div className="divide-y">{relevantRows.map((participation) => {
        const event = participation.attendance_events;
        const record = (event.attendance_event_records || []).find((item: any) => item.employee_id === employee.id);
        const isToday = event.event_date === today;
        const canRecord = isToday && event.status === "published";
        return <article key={participation.id} className="py-4 first:pt-4 last:pb-0"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-gray-900">{event.title}</h3><span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${participation.participation_type === "required" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>{participation.participation_type === "required" ? "Wajib" : "Opsional"}</span>{isToday ? <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Hari ini</span> : null}</div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500"><span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{formatDate(event.event_date)}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{shortTime(event.start_time)}-{shortTime(event.end_time)}</span><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.attendance_sites?.name || event.units?.name || "Sesuai informasi kegiatan"}</span></div>{event.description ? <p className="mt-2 text-xs leading-5 text-gray-600">{event.description}</p> : null}<p className="mt-2 text-[11px] font-medium text-emerald-700">Datang lebih awal diterima. Batas akhir masuk {shortTime(event.check_in_close)}{event.require_geofence ? `, GPS radius ${event.attendance_sites?.radius_meters || "-"} m` : ", tanpa GPS wajib"}.</p></div><div className="flex shrink-0 items-center gap-2">{record ? <span className={`rounded-md px-3 py-2 text-xs font-bold ${record.status === "late" ? "bg-orange-50 text-orange-700" : record.status === "absent" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{record.status === "late" ? `Terlambat ${record.late_minutes} menit` : record.status === "absent" ? "Tidak hadir" : "Hadir"}</span> : null}<button onClick={() => void recordEvent(event, "check_in")} disabled={!canRecord || Boolean(record?.check_in_at) || savingEventId === event.id} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{savingEventId === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : event.require_geofence ? <LocateFixed className="h-4 w-4" /> : <LogIn className="h-4 w-4" />} Hadir</button><button onClick={() => void recordEvent(event, "check_out")} disabled={!canRecord || !record?.check_in_at || Boolean(record?.check_out_at) || savingEventId === event.id} className="inline-flex min-h-10 items-center gap-2 rounded-md border bg-white px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-40"><LogOut className="h-4 w-4" /> Selesai</button></div></div></article>;
      })}</div>}
      <div className="mt-4 flex items-start gap-2 rounded-md bg-gray-50 p-3 text-xs text-gray-500"><Users className="mt-0.5 h-4 w-4 shrink-0" /><p>Ketidakhadiran kegiatan wajib difinalisasi oleh admin kegiatan. Izin kerja harian tidak otomatis menghapus penugasan rapat; konfirmasikan kepada penanggung jawab bila berhalangan.</p></div>
    </section>
  );
};
