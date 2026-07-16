/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, Clock3, Loader2, MapPin, Pencil, Search, Send, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";

const EVENT_TYPES = [
  ["meeting", "Rapat"],
  ["training", "Pelatihan / In-house Training"],
  ["school_activity", "Kegiatan Sekolah"],
  ["religious_activity", "Kajian / Kegiatan Keislaman"],
  ["committee", "Kepanitiaan"],
  ["maintenance", "Pemeliharaan / Perbaikan Sarpras"],
  ["emergency_duty", "Penugasan Darurat"],
  ["other", "Kegiatan Lainnya"],
] as const;

const EMPTY_FORM = {
  id: "",
  title: "",
  event_type: "meeting",
  unit_id: "",
  event_date: new Date().toISOString().slice(0, 10),
  start_time: "15:30",
  end_time: "17:00",
  check_in_close: "16:30",
  grace_minutes: "10",
  site_id: "",
  require_geofence: false,
  participation_type: "required",
  description: "",
};

const statusStyle: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700",
  draft: "bg-amber-50 text-amber-700",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-gray-100 text-gray-600",
};

function eventTypeLabel(value?: string) {
  return EVENT_TYPES.find(([key]) => key === value)?.[1] || "Kegiatan";
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function shortTime(value?: string) {
  return String(value || "-").slice(0, 5);
}

export const AttendanceEvents: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [participantSearch, setParticipantSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const [eventResult, employeeResult, unitResult, siteResult] = await Promise.all([
      supabaseClient.from("attendance_events").select("*,units(name),attendance_sites(name,address,radius_meters),attendance_event_participants(id,employee_id,participation_type,employees(full_name,nik,position,units(name))),attendance_event_records(id,employee_id,status,check_in_at,check_out_at,late_minutes,verification_status)").order("event_date", { ascending: false }).order("start_time", { ascending: false }).limit(100),
      supabaseClient.from("employees").select("id,full_name,nik,position,unit_id,units(name)").eq("status", "active").order("full_name"),
      supabaseClient.from("units").select("id,name").order("name"),
      supabaseClient.from("attendance_sites").select("id,name,address,radius_meters,attendance_site_units(unit_id)").eq("is_active", true).order("name"),
    ]);
    const error = eventResult.error || employeeResult.error || unitResult.error || siteResult.error;
    if (error) toast.error("Data kegiatan belum dapat dimuat", { description: error.message });
    const eventRows = (eventResult.data || []) as any[];
    setEvents(eventRows);
    setEmployees(employeeResult.data || []);
    setUnits(unitResult.data || []);
    setSites(siteResult.data || []);
    setSelectedEventId((current) => current && eventRows.some((item) => item.id === current) ? current : eventRows[0]?.id || "");
    setIsLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const eligibleSites = useMemo(() => sites.filter((site) => {
    if (!form.unit_id) return true;
    const mappings = site.attendance_site_units || [];
    return mappings.length === 0 || mappings.some((mapping: any) => mapping.unit_id === form.unit_id);
  }), [form.unit_id, sites]);

  const visibleEmployees = useMemo(() => {
    const query = participantSearch.trim().toLowerCase();
    return employees.filter((employee) => {
      if (form.unit_id && employee.unit_id !== form.unit_id) return false;
      if (!query) return true;
      return [employee.full_name, employee.nik, employee.position, employee.units?.name].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [employees, form.unit_id, participantSearch]);

  const selectedEvent = events.find((event) => event.id === selectedEventId) || null;
  const recordMap = useMemo(() => new Map((selectedEvent?.attendance_event_records || []).map((record: any) => [record.employee_id, record])), [selectedEvent]);
  const eventCounts = useMemo(() => {
    const records = selectedEvent?.attendance_event_records || [];
    return {
      participants: selectedEvent?.attendance_event_participants?.length || 0,
      present: records.filter((record: any) => ["present", "late"].includes(record.status)).length,
      late: records.filter((record: any) => record.status === "late").length,
      absent: records.filter((record: any) => record.status === "absent").length,
    };
  }, [selectedEvent]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, event_date: new Date().toISOString().slice(0, 10) });
    setSelectedEmployees(new Set());
    setParticipantSearch("");
  };

  const editEvent = (event: any) => {
    setForm({
      id: event.id,
      title: event.title,
      event_type: event.event_type,
      unit_id: event.unit_id || "",
      event_date: event.event_date,
      start_time: shortTime(event.start_time),
      end_time: shortTime(event.end_time),
      check_in_close: shortTime(event.check_in_close),
      grace_minutes: String(event.grace_minutes),
      site_id: event.site_id || "",
      require_geofence: event.require_geofence,
      participation_type: event.attendance_event_participants?.[0]?.participation_type || "required",
      description: event.description || "",
    });
    setSelectedEmployees(new Set((event.attendance_event_participants || []).map((participant: any) => participant.employee_id)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleEmployee = (employeeId: string) => setSelectedEmployees((current) => {
    const next = new Set(current);
    if (next.has(employeeId)) next.delete(employeeId); else next.add(employeeId);
    return next;
  });

  const saveEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedEmployees.size === 0) return toast.error("Pilih minimal satu peserta kegiatan.");
    if (form.require_geofence && !form.site_id) return toast.error("Pilih lokasi GPS untuk kegiatan ini.");
    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(), event_type: form.event_type, unit_id: form.unit_id || null,
        event_date: form.event_date, start_time: form.start_time, end_time: form.end_time,
        check_in_close: form.check_in_close, grace_minutes: Number(form.grace_minutes),
        site_id: form.site_id || null, require_geofence: form.require_geofence,
        description: form.description.trim() || null, status: "published",
      };
      const existingEvent = form.id ? events.find((item) => item.id === form.id) : null;
      const hasAttendanceRecords = Boolean(existingEvent?.attendance_event_records?.length);
      const existingParticipantIds = new Set<string>((existingEvent?.attendance_event_participants || []).map((participant: any) => String(participant.employee_id)));
      const participantsChanged = hasAttendanceRecords && (
        existingParticipantIds.size !== selectedEmployees.size
        || Array.from(selectedEmployees).some((employeeId) => !existingParticipantIds.has(employeeId))
      );
      if (participantsChanged) throw new Error("Daftar peserta tidak dapat diubah karena presensi kegiatan sudah tercatat.");
      const query = form.id
        ? supabaseClient.from("attendance_events").update(payload).eq("id", form.id).select("id").single()
        : supabaseClient.from("attendance_events").insert(payload).select("id").single();
      const { data, error } = await query;
      if (error) throw error;
      const eventId = (data as any).id;
      if (form.id && !hasAttendanceRecords) {
        const { error: deleteError } = await supabaseClient.from("attendance_event_participants").delete().eq("event_id", eventId);
        if (deleteError) throw deleteError;
      }
      if (!hasAttendanceRecords) {
        const { error: participantError } = await supabaseClient.from("attendance_event_participants").insert(
          Array.from(selectedEmployees).map((employeeId) => ({ event_id: eventId, employee_id: employeeId, participation_type: form.participation_type }))
        );
        if (participantError) throw participantError;
      }
      toast.success(form.id ? "Kegiatan dan peserta diperbarui." : "Kegiatan diterbitkan ke portal peserta.");
      resetForm();
      await loadData();
      setSelectedEventId(eventId);
    } catch (error: any) {
      toast.error("Kegiatan belum dapat disimpan", { description: error.message });
    } finally { setIsSaving(false); }
  };

  const setEventStatus = async (eventId: string, status: "cancelled" | "published") => {
    const { error } = await supabaseClient.from("attendance_events").update({ status }).eq("id", eventId);
    if (error) return toast.error(error.message);
    toast.success(status === "cancelled" ? "Kegiatan dibatalkan." : "Kegiatan diterbitkan kembali.");
    await loadData();
  };

  const finalizeEvent = async (eventId: string) => {
    setIsSaving(true);
    const { data, error } = await supabaseClient.rpc("finalize_attendance_event", { p_event_id: eventId });
    if (error) toast.error("Kegiatan belum dapat difinalisasi", { description: error.message });
    else { toast.success(`Kegiatan selesai. ${Number(data || 0)} peserta wajib dicatat tidak hadir.`); await loadData(); }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapat & Kegiatan Pegawai"
        description="Kelola kehadiran kegiatan insidental tanpa mengubah presensi kerja harian guru maupun staf."
        action={<div className="flex gap-2"><Link to="/attendance/overtime" className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold"><Clock3 className="h-4 w-4" /> Lembur</Link><Link to="/attendance/employees" className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold"><CalendarClock className="h-4 w-4" /> Presensi Harian</Link></div>}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={saveEvent} className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b pb-4"><div><h2 className="font-bold">{form.id ? "Ubah kegiatan" : "Jadwalkan kegiatan"}</h2><p className="mt-1 text-xs text-muted-foreground">Rapat, pelatihan, kajian pegawai, perbaikan sarpras, atau penugasan darurat bertanggal.</p></div>{form.id ? <button type="button" onClick={resetForm} className="text-xs font-bold text-muted-foreground">Batal ubah</button> : null}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold sm:col-span-2">Nama kegiatan<input required minLength={3} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Contoh: Rapat Evaluasi Bulanan" className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal" /></label>
            <label className="text-sm font-semibold">Jenis<select value={form.event_type} onChange={(event) => setForm({ ...form, event_type: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal">{EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-sm font-semibold">Unit<select value={form.unit_id} onChange={(event) => setForm({ ...form, unit_id: event.target.value, site_id: "" })} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal"><option value="">Lintas unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
            <label className="text-sm font-semibold">Tanggal<input required type="date" value={form.event_date} onChange={(event) => setForm({ ...form, event_date: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal" /></label>
            <label className="text-sm font-semibold">Toleransi terlambat<input type="number" min="0" max="180" value={form.grace_minutes} onChange={(event) => setForm({ ...form, grace_minutes: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal" /></label>
            <label className="text-sm font-semibold">Mulai<input required type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal" /></label>
            <label className="text-sm font-semibold">Selesai<input required type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Batas akhir absen masuk<input required type="time" value={form.check_in_close} onChange={(event) => setForm({ ...form, check_in_close: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal" /><span className="mt-1 block text-xs font-normal text-muted-foreground">Peserta boleh absen lebih awal pada tanggal kegiatan.</span></label>
            <label className="text-sm font-semibold sm:col-span-2">Lokasi<select value={form.site_id} onChange={(event) => setForm({ ...form, site_id: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 font-normal"><option value="">Tanpa lokasi khusus</option>{eligibleSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
            <label className="flex items-start gap-3 rounded-md border p-3 text-sm sm:col-span-2"><input type="checkbox" checked={form.require_geofence} onChange={(event) => setForm({ ...form, require_geofence: event.target.checked })} className="mt-1" /><span><strong>Wajib verifikasi GPS</strong><span className="mt-0.5 block text-xs text-muted-foreground">Gunakan untuk kegiatan tatap muka di lokasi sekolah; nonaktifkan untuk rapat daring.</span></span></label>
            <label className="text-sm font-semibold sm:col-span-2">Keterangan<textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Agenda, ruang, pakaian, atau perlengkapan yang perlu dibawa" className="mt-1.5 w-full rounded-md border bg-background p-3 font-normal" /></label>
          </div>

          <div className="space-y-3 border-t pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="font-bold">Peserta</h3><p className="text-xs text-muted-foreground">{selectedEmployees.size} pegawai dipilih. Pilihan unit membatasi daftar peserta.</p></div><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={participantSearch} onChange={(event) => setParticipantSearch(event.target.value)} placeholder="Cari nama, NIK, jabatan" className="h-10 w-full rounded-md border pl-9 pr-3 text-sm sm:w-64" /></label></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedEmployees(new Set([...selectedEmployees, ...visibleEmployees.map((employee) => employee.id)]))} className="rounded-md border px-3 py-1.5 text-xs font-bold">Pilih semua hasil</button><button type="button" onClick={() => setSelectedEmployees(new Set())} className="rounded-md border px-3 py-1.5 text-xs font-bold">Kosongkan</button><select value={form.participation_type} onChange={(event) => setForm({ ...form, participation_type: event.target.value })} className="rounded-md border px-3 py-1.5 text-xs font-bold"><option value="required">Kehadiran wajib</option><option value="optional">Kehadiran opsional</option></select></div>
            <div className="max-h-64 overflow-y-auto rounded-md border"><div className="divide-y">{visibleEmployees.map((employee) => <label key={employee.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/40"><input type="checkbox" checked={selectedEmployees.has(employee.id)} onChange={() => toggleEmployee(employee.id)} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{employee.full_name}</span><span className="block truncate text-xs text-muted-foreground">{employee.nik || "Tanpa NIK"} | {String(employee.position || "-").replace(/_/g, " ")} | {employee.units?.name || "Lintas unit"}</span></span></label>)}{visibleEmployees.length === 0 ? <p className="p-5 text-center text-sm text-muted-foreground">Tidak ada pegawai sesuai filter.</p> : null}</div></div>
          </div>
          <button disabled={isSaving} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{form.id ? "Simpan Perubahan" : "Terbitkan Kegiatan"}</button>
        </form>

        <div className="space-y-3">
          <div><h2 className="font-bold">Daftar kegiatan</h2><p className="mt-1 text-xs text-muted-foreground">Pilih kegiatan untuk melihat pemantauan peserta.</p></div>
          {isLoading ? <div className="rounded-lg border bg-card p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : events.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada rapat atau kegiatan pegawai.</div> : events.map((event) => <button key={event.id} type="button" onClick={() => setSelectedEventId(event.id)} className={`w-full rounded-lg border p-4 text-left shadow-sm ${selectedEventId === event.id ? "border-primary bg-primary/5" : "bg-card hover:border-primary/40"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(event.event_date)}</p></div><span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${statusStyle[event.status] || statusStyle.draft}`}>{event.status}</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{shortTime(event.start_time)}-{shortTime(event.end_time)}</span><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{event.attendance_event_participants?.length || 0}</span><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.units?.name || "Lintas unit"}</span></div></button>)}
        </div>
      </section>

      {selectedEvent ? <section className="space-y-4 rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase text-primary">{eventTypeLabel(selectedEvent.event_type)}</p><h2 className="mt-1 text-xl font-bold">{selectedEvent.title}</h2><p className="mt-1 text-sm text-muted-foreground">{formatDate(selectedEvent.event_date)} | {shortTime(selectedEvent.start_time)}-{shortTime(selectedEvent.end_time)} | {selectedEvent.attendance_sites?.name || "Tanpa GPS khusus"}</p></div><div className="flex flex-wrap gap-2">{!['completed','cancelled'].includes(selectedEvent.status) ? <button onClick={() => editEvent(selectedEvent)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold"><Pencil className="h-3.5 w-3.5" /> Ubah</button> : null}{selectedEvent.status === "published" ? <><button onClick={() => void setEventStatus(selectedEvent.id, "cancelled")} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold text-red-600"><XCircle className="h-3.5 w-3.5" /> Batalkan</button><button disabled={isSaving} onClick={() => void finalizeEvent(selectedEvent.id)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> Finalisasi</button></> : selectedEvent.status === "cancelled" ? <button onClick={() => void setEventStatus(selectedEvent.id, "published")} className="rounded-md border px-3 py-2 text-xs font-bold">Terbitkan Kembali</button> : null}</div></div>
        <div className="grid gap-3 sm:grid-cols-4">{[{ label: "Peserta", value: eventCounts.participants }, { label: "Hadir", value: eventCounts.present }, { label: "Terlambat", value: eventCounts.late }, { label: "Tidak hadir", value: eventCounts.absent }].map((item) => <div key={item.label} className="rounded-md border bg-muted/20 p-3"><p className="text-2xl font-bold">{item.value}</p><p className="text-xs font-semibold text-muted-foreground">{item.label}</p></div>)}</div>
        <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Pegawai</th><th className="px-4 py-3">Unit / Peran</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Masuk</th><th className="px-4 py-3">Pulang</th><th className="px-4 py-3">Verifikasi</th></tr></thead><tbody className="divide-y">{(selectedEvent.attendance_event_participants || []).map((participant: any) => { const record: any = recordMap.get(participant.employee_id); return <tr key={participant.id}><td className="px-4 py-3"><p className="font-semibold">{participant.employees?.full_name}</p><p className="text-xs text-muted-foreground">{participant.employees?.nik || "-"}</p></td><td className="px-4 py-3"><p>{participant.employees?.units?.name || "Lintas unit"}</p><p className="text-xs text-muted-foreground">{String(participant.employees?.position || "-").replace(/_/g, " ")}</p></td><td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-bold ${record?.status === "late" ? "bg-orange-50 text-orange-700" : record?.status === "present" ? "bg-emerald-50 text-emerald-700" : record?.status === "absent" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>{record?.status === "present" ? "Hadir" : record?.status === "late" ? `Terlambat ${record.late_minutes} mnt` : record?.status === "absent" ? "Tidak hadir" : "Belum absen"}</span></td><td className="px-4 py-3">{record?.check_in_at ? new Date(record.check_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</td><td className="px-4 py-3">{record?.check_out_at ? new Date(record.check_out_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</td><td className="px-4 py-3 text-xs">{record?.verification_status === "verified" ? "GPS valid" : record ? "Tanpa GPS" : "-"}</td></tr>; })}</tbody></table></div>
      </section> : null}
    </div>
  );
};
