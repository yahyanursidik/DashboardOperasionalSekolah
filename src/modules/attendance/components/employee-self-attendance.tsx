/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FilePenLine,
  Loader2,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { dayMap, formatTime, getScheduleSubjectName } from "../../schedules/schedule-utils";
import { formatLeaveType, isLeaveActiveOnDate, toDateInputValue } from "../../leaves/leave-utils";
import { formatShortTime, formatSubstituteStatus } from "../../substitutes/substitute-utils";

type PortalKind = "teacher" | "staff";

type EmployeeSelfAttendanceProps = {
  employee: any;
  portal: PortalKind;
  showSubstitutes?: boolean;
};

type AttendancePolicy = {
  id?: string;
  unit_id?: string | null;
  require_geofence: boolean;
  allow_correction_request: boolean;
  max_accuracy_meters: number;
  grace_minutes: number;
  check_in_open?: string;
  check_in_close?: string;
};

const FALLBACK_POLICY: AttendancePolicy = {
  require_geofence: false,
  allow_correction_request: true,
  max_accuracy_meters: 100,
  grace_minutes: 10,
};

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    present: "Hadir",
    late: "Terlambat",
    sick: "Sakit",
    leave: "Izin",
    absent: "Alpa",
  };
  return labels[status || ""] ?? status ?? "Belum absen";
}

function statusClass(status?: string | null) {
  if (status === "present") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "late") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "leave" || status === "sick") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "absent") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function verificationLabel(status?: string | null) {
  const labels: Record<string, string> = {
    verified: "Lokasi terverifikasi",
    approved_exception: "Pengecualian disetujui",
    manual: "Dicatat admin",
    pending_review: "Menunggu tinjauan",
    rejected: "Ditolak",
    unverified: "Tanpa verifikasi lokasi",
  };
  return labels[status || ""] ?? "Belum diverifikasi";
}

function formatAttendanceError(error: any) {
  const message = String(error?.message || error || "");
  if (message.includes("ALREADY_CHECKED_IN")) return "Jam masuk hari ini sudah tercatat dan tidak dapat ditimpa.";
  if (message.includes("CHECK_IN_REQUIRED")) return "Absen masuk harus dicatat sebelum absen pulang.";
  if (message.includes("ATTENDANCE_SITE_REQUIRED")) return "Pilih lokasi kerja sebelum mencatat absensi.";
  if (message.includes("ATTENDANCE_SITE_NOT_ASSIGNED")) return "Lokasi ini tidak sesuai dengan unit atau jadwal tugas Anda hari ini.";
  if (message.includes("ATTENDANCE_SITE_INVALID")) return "Lokasi absensi tidak aktif atau tidak ditemukan.";
  if (message.includes("OUTSIDE_CHECK_IN_WINDOW")) return "Anda berada di luar jam masuk yang diizinkan. Ajukan koreksi bila ada penugasan khusus.";
  if (message.includes("OUTSIDE_SHIFT_CHECK_IN_WINDOW")) return "Anda berada di luar jam absen shift yang ditugaskan. Periksa shift aktif atau ajukan koreksi.";
  if (message.includes("OUTSIDE_SCHEDULE_CHECK_IN_WINDOW")) return "Waktu absen terlalu jauh dari jadwal tugas hari ini. Ajukan koreksi bila ada perubahan penugasan.";
  if (message.includes("LOCATION_INVALID")) return "Koordinat lokasi perangkat tidak valid.";
  if (message.includes("attendance_corrections_one_pending_action_idx")) return "Permohonan untuk aksi dan tanggal ini sudah menunggu tinjauan.";
  if (message.includes("LOCATION_REQUIRED")) return "Lokasi perangkat diperlukan untuk absensi pada unit ini.";
  if (message.includes("LOCATION_ACCURACY_LOW")) return "Akurasi GPS belum memadai. Pindah ke area terbuka lalu coba lagi.";
  if (message.includes("OUTSIDE_GEOFENCE")) {
    const values = message.match(/OUTSIDE_GEOFENCE:(\d+):(\d+)/);
    return values
      ? `Anda berada sekitar ${values[1]} meter dari lokasi kerja, di luar radius ${values[2]} meter.`
      : "Anda berada di luar radius lokasi kerja yang diizinkan.";
  }
  if (message.includes("EMPLOYEE_NOT_FOUND")) return "Akun pegawai aktif tidak ditemukan.";
  return error?.message || "Absensi gagal disimpan.";
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Perangkat tidak mendukung layanan lokasi."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export const EmployeeSelfAttendance: React.FC<EmployeeSelfAttendanceProps> = ({ employee, portal, showSubstitutes = false }) => {
  const today = toDateInputValue(new Date());
  const backPath = portal === "teacher" ? "/teacher" : "/staff";
  const [history, setHistory] = useState<any[]>([]);
  const [activeLeave, setActiveLeave] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [substitutes, setSubstitutes] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [correctionAction, setCorrectionAction] = useState<"check_in" | "check_out">("check_in");
  const [correctionType, setCorrectionType] = useState("location_issue");
  const [correctionTime, setCorrectionTime] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const dayName = dayMap[new Date().getDay()] || "Senin";
      const attendancePromise = supabaseClient
        .from("employee_attendance")
        .select("id,date,status,time_in,time_out,notes,site_id,location_status,verification_status,is_late,late_minutes,is_early_departure,early_departure_minutes,attendance_sites(name)")
        .eq("employee_id", employee.id)
        .order("date", { ascending: false })
        .limit(30);
      const leavePromise = supabaseClient
        .from("leave_requests")
        .select("id,leave_type,start_date,end_date,status,reason")
        .eq("employee_id", employee.id)
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today);
      const schedulePromise = supabaseClient
        .from("employee_schedules")
        .select("id,unit_id,day_of_week,start_time,end_time,schedule_type,subject,subject_id,attendance_shift_id,classes(name),subjects(name),units(name),attendance_shifts(name,check_in_open,check_in_close,grace_minutes,early_departure_tolerance_minutes)")
        .eq("employee_id", employee.id)
        .eq("day_of_week", dayName)
        .order("start_time");
      const sitesPromise = supabaseClient
        .from("attendance_sites")
        .select("id,name,address,radius_meters,accuracy_limit_meters,is_active,attendance_site_units(unit_id,units(name))")
        .eq("is_active", true)
        .order("name");
      const policiesPromise = supabaseClient
        .from("attendance_policies")
        .select("id,unit_id,require_geofence,allow_correction_request,max_accuracy_meters,grace_minutes,check_in_open,check_in_close")
        .eq("is_active", true);
      const correctionsPromise = supabaseClient
        .from("attendance_correction_requests")
        .select("id,request_date,attendance_action,request_type,requested_time,reason,status,review_note,created_at")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false })
        .limit(10);
      const substitutePromise = showSubstitutes
        ? supabaseClient
            .from("substitute_assignments")
            .select("id,date,start_time,end_time,subject,status,classes(name),absent:absent_employee_id(full_name)")
            .eq("substitute_employee_id", employee.id)
            .eq("date", today)
            .neq("status", "cancelled")
            .order("start_time")
        : Promise.resolve({ data: [], error: null } as any);

      const results = await Promise.all([
        attendancePromise,
        leavePromise,
        schedulePromise,
        sitesPromise,
        policiesPromise,
        correctionsPromise,
        substitutePromise,
      ]);
      const firstError = results.find((result: any) => result.error)?.error;
      if (firstError) throw firstError;

      setHistory(results[0].data ?? []);
      setActiveLeave((results[1].data ?? []).find((item: any) => isLeaveActiveOnDate(item, today)) ?? null);
      setSchedules(results[2].data ?? []);
      setSites(results[3].data ?? []);
      setPolicies((results[4].data ?? []) as unknown as AttendancePolicy[]);
      setCorrections(results[5].data ?? []);
      setSubstitutes(results[6].data ?? []);
    } catch (error) {
      console.error("Employee attendance fetch error:", error);
      toast.error("Data absensi belum dapat dimuat. Pastikan pembaruan database sudah diterapkan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [employee.id]);

  const currentRecord = history.find((item) => item.date === today) ?? null;
  const openRecord = history.find((item) => item.time_in && !item.time_out) ?? currentRecord;
  const scheduleUnitIds = useMemo(
    () => new Set(schedules.map((schedule) => schedule.unit_id).filter(Boolean)),
    [schedules]
  );
  const activeUnitId = schedules.find((schedule) => schedule.unit_id)?.unit_id || employee.unit_id || null;
  const assignedShiftSchedule = schedules.find((schedule) => schedule.attendance_shift_id) || null;
  const policy = useMemo(
    () => policies.find((item) => item.unit_id === activeUnitId) || policies.find((item) => !item.unit_id) || FALLBACK_POLICY,
    [activeUnitId, policies]
  );
  const validSites = useMemo(() => sites.filter((site) => {
    const mappings = site.attendance_site_units ?? [];
    if (mappings.length === 0) return true;
    return mappings.some((mapping: any) => mapping.unit_id === employee.unit_id || scheduleUnitIds.has(mapping.unit_id));
  }), [employee.unit_id, scheduleUnitIds, sites]);

  const effectiveSiteId = validSites.some((site) => site.id === selectedSiteId)
    ? selectedSiteId
    : validSites.length === 1 ? validSites[0].id : "";

  const recordAttendance = async (action: "check_in" | "check_out") => {
    if (activeLeave) {
      toast.error("Ada izin aktif hari ini. Hubungi admin bila Anda tetap ditugaskan hadir.");
      return;
    }
    if (action === "check_out" && !openRecord?.time_in) {
      toast.error("Absen masuk harus dicatat terlebih dahulu.");
      return;
    }
    if (policy.require_geofence && !effectiveSiteId) {
      toast.error(validSites.length === 0 ? "Lokasi absensi untuk unit Anda belum dikonfigurasi." : "Pilih lokasi kerja terlebih dahulu.");
      return;
    }

    setIsSaving(true);
    try {
      let coordinates: GeolocationCoordinates | null = null;
      if (policy.require_geofence) {
        try {
          coordinates = (await getCurrentPosition()).coords;
        } catch (error: any) {
          setIsCorrectionOpen(true);
          setCorrectionAction(action);
          throw new Error(error?.message || "Izin lokasi ditolak atau GPS tidak tersedia.", { cause: error });
        }
      }

      const { data, error } = await supabaseClient.rpc("record_employee_attendance", {
        p_action: action,
        p_site_id: effectiveSiteId || null,
        p_latitude: coordinates?.latitude ?? null,
        p_longitude: coordinates?.longitude ?? null,
        p_accuracy_meters: coordinates?.accuracy ?? null,
        p_device_context: {
          portal,
          platform: navigator.platform || "unknown",
          language: navigator.language || "id-ID",
        },
      });
      if (error) throw error;
      const result = data as any;
      toast.success(action === "check_in"
        ? (result?.status === "late" ? `Jam masuk tercatat. Terlambat ${result.late_minutes} menit.` : "Jam masuk berhasil dicatat.")
        : "Jam pulang berhasil dicatat.");
      await fetchData();
    } catch (error: any) {
      toast.error(formatAttendanceError(error));
      if (/OUTSIDE_GEOFENCE|LOCATION_|lokasi|GPS/i.test(String(error?.message || ""))) {
        setCorrectionAction(action);
        setIsCorrectionOpen(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const submitCorrection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (correctionReason.trim().length < 10) {
      toast.error("Jelaskan kendala atau tugas dinas minimal 10 karakter.");
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabaseClient.from("attendance_correction_requests").insert({
        employee_id: employee.id,
        attendance_id: currentRecord?.id || null,
        request_date: today,
        attendance_action: correctionAction,
        request_type: correctionType,
        requested_time: correctionTime || null,
        reason: correctionReason.trim(),
      });
      if (error) throw error;
      toast.success("Permohonan koreksi dikirim untuk ditinjau admin.");
      setCorrectionReason("");
      setCorrectionTime("");
      setIsCorrectionOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error?.message || "Permohonan koreksi gagal dikirim.");
    } finally {
      setIsSaving(false);
    }
  };

  const todaySummary = activeLeave
    ? `Izin disetujui: ${formatLeaveType(activeLeave.leave_type)}`
    : statusLabel(currentRecord?.status);
  const selectedSite = validSites.find((site) => site.id === effectiveSiteId);
  const pendingCorrection = corrections.find((item) => item.status === "pending" && item.request_date === today);

  return (
    <div className="space-y-5 p-4 md:p-0">
      <div className="flex items-center gap-3">
        <Link to={backPath} className="rounded-full border bg-white p-2 text-gray-600 shadow-sm" aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Absensi Saya</h1>
          <p className="text-xs text-gray-500">{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <section className="border bg-white p-5 shadow-sm rounded-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Status hari ini</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">{todaySummary}</h2>
            <p className="mt-2 text-sm text-gray-500">
              {currentRecord?.time_in ? `Masuk ${formatShortTime(currentRecord.time_in)}` : "Jam masuk belum tercatat"}
              {currentRecord?.time_out ? `, pulang ${formatShortTime(currentRecord.time_out)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(currentRecord?.status)}`}>{statusLabel(currentRecord?.status)}</span>
            {currentRecord && (
              <span className="rounded-full border bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                {verificationLabel(currentRecord.verification_status)}
              </span>
            )}
          </div>
        </div>

        {activeLeave && (
          <div className="mt-4 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <p>Izin Anda aktif hari ini. Absensi mandiri dikunci untuk mencegah data bertentangan.</p>
          </div>
        )}

        {assignedShiftSchedule?.attendance_shifts && (
          <div className="mt-4 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-bold text-emerald-900">Shift hari ini: {assignedShiftSchedule.attendance_shifts.name}</p>
              <p className="mt-1 text-xs text-emerald-800">Jam kerja {formatTime(assignedShiftSchedule.start_time)}-{formatTime(assignedShiftSchedule.end_time)} | absen masuk {formatTime(assignedShiftSchedule.attendance_shifts.check_in_open)}-{formatTime(assignedShiftSchedule.attendance_shifts.check_in_close)}</p>
            </div>
            <span className="w-fit rounded-md bg-white px-2 py-1 text-xs font-bold text-emerald-700">Toleransi {assignedShiftSchedule.attendance_shifts.grace_minutes} menit</span>
          </div>
        )}

        <div className="mt-5 grid gap-4 border-t pt-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-800">Lokasi kerja</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                value={effectiveSiteId}
                onChange={(event) => setSelectedSiteId(event.target.value)}
                disabled={!policy.require_geofence || isSaving}
                className="w-full rounded-md border bg-white py-2.5 pl-10 pr-3 text-sm disabled:bg-gray-50"
              >
                <option value="">{validSites.length ? "Pilih lokasi kerja" : "Belum ada lokasi untuk unit ini"}</option>
                {validSites.map((site) => <option key={site.id} value={site.id}>{site.name} - radius {site.radius_meters} m</option>)}
              </select>
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs text-gray-500">
              <LocateFixed className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>{policy.require_geofence
                ? `Lokasi diminta hanya saat tombol absensi ditekan. Akurasi maksimum ${policy.max_accuracy_meters} meter.`
                : "Verifikasi lokasi belum diwajibkan pada unit ini. Waktu tetap dicatat oleh server."}</p>
            </div>
            {selectedSite?.address && <p className="mt-2 text-xs text-gray-500">{selectedSite.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2 self-end">
            <button
              onClick={() => void recordAttendance("check_in")}
              disabled={isSaving || Boolean(currentRecord?.time_in) || Boolean(activeLeave)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-45"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Absen Masuk
            </button>
            <button
              onClick={() => void recordAttendance("check_out")}
              disabled={isSaving || !openRecord?.time_in || Boolean(openRecord?.time_out) || Boolean(activeLeave)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-bold text-gray-700 disabled:opacity-45"
            >
              <LogOut className="h-4 w-4" /> Absen Pulang
            </button>
          </div>
        </div>

        {(currentRecord?.late_minutes > 0 || currentRecord?.early_departure_minutes > 0) && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {currentRecord.late_minutes > 0 && <span className="rounded-md bg-orange-50 px-2 py-1 font-semibold text-orange-700">Terlambat {currentRecord.late_minutes} menit</span>}
            {currentRecord.early_departure_minutes > 0 && <span className="rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-700">Pulang awal {currentRecord.early_departure_minutes} menit</span>}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900"><Clock3 className="h-4 w-4 text-emerald-600" /> Jadwal hari ini</h2>
            <span className="text-xs text-gray-500">{schedules.length} tugas</span>
          </div>
          {schedules.length === 0 ? (
            <p className="py-5 text-center text-sm text-gray-400">Tidak ada jadwal kerja pada hari ini.</p>
          ) : (
            <div className="divide-y">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{schedule.attendance_shifts?.name || (schedule.schedule_type === "mengajar" ? getScheduleSubjectName(schedule) : String(schedule.schedule_type).replace(/_/g, " "))}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}{schedule.classes?.name ? ` - ${schedule.classes.name}` : ""}</p>
                  </div>
                  <span className="rounded-md bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-600">{schedule.units?.name || "Lintas unit"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            {pendingCorrection ? <Clock3 className="h-5 w-5 text-amber-600" /> : <FilePenLine className="h-5 w-5 text-blue-600" />}
            <div>
              <h2 className="text-sm font-bold text-gray-900">Kendala absensi</h2>
              <p className="mt-1 text-xs text-gray-500">Untuk GPS bermasalah, dinas luar, atau lupa absen. Semua koreksi melalui persetujuan.</p>
            </div>
          </div>
          {pendingCorrection ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Permohonan {pendingCorrection.attendance_action === "check_in" ? "jam masuk" : "jam pulang"} hari ini sedang ditinjau.
            </div>
          ) : policy.allow_correction_request ? (
            <button onClick={() => setIsCorrectionOpen((value) => !value)} className="mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-gray-700">
              <FilePenLine className="h-4 w-4" /> Ajukan Koreksi
            </button>
          ) : (
            <p className="mt-4 text-xs text-gray-500">Koreksi mandiri dinonaktifkan. Hubungi operator absensi.</p>
          )}
        </div>
      </section>

      {isCorrectionOpen && !pendingCorrection && (
        <form onSubmit={submitCorrection} className="rounded-lg border border-blue-200 bg-blue-50/40 p-5">
          <div className="mb-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-700" />
            <div>
              <h2 className="font-bold text-gray-900">Ajukan koreksi absensi</h2>
              <p className="text-xs text-gray-500">Isi sesuai kondisi sebenarnya. Admin akan memeriksa jadwal dan alasan Anda.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold text-gray-700">Aksi
              <select value={correctionAction} onChange={(event) => setCorrectionAction(event.target.value as any)} className="mt-1.5 w-full rounded-md border bg-white px-3 py-2 font-normal">
                <option value="check_in">Jam masuk</option><option value="check_out">Jam pulang</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700">Jenis kendala
              <select value={correctionType} onChange={(event) => setCorrectionType(event.target.value)} className="mt-1.5 w-full rounded-md border bg-white px-3 py-2 font-normal">
                <option value="location_issue">GPS/lokasi bermasalah</option><option value="missed_attendance">Lupa absen</option><option value="offsite_duty">Dinas di luar lokasi</option><option value="time_correction">Koreksi waktu</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700">Waktu yang diajukan
              <input type="time" value={correctionTime} onChange={(event) => setCorrectionTime(event.target.value)} required className="mt-1.5 w-full rounded-md border bg-white px-3 py-2 font-normal" />
            </label>
            <label className="text-sm font-semibold text-gray-700 sm:col-span-2 lg:col-span-1">Alasan
              <input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} minLength={10} required placeholder="Jelaskan kendala atau tugas" className="mt-1.5 w-full rounded-md border bg-white px-3 py-2 font-normal" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsCorrectionOpen(false)} className="rounded-md border bg-white px-4 py-2 text-sm font-semibold text-gray-700">Batal</button>
            <button disabled={isSaving} className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><FilePenLine className="h-4 w-4" /> Kirim</button>
          </div>
        </form>
      )}

      {showSubstitutes && substitutes.length > 0 && (
        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900"><UserRoundCheck className="h-4 w-4 text-emerald-600" /> Tugas inval hari ini</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {substitutes.map((item) => (
              <div key={item.id} className="rounded-md border bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-bold text-gray-900">{item.subject || "Tugas pengganti"}</p><p className="text-xs text-gray-500">{formatShortTime(item.start_time)} - {formatShortTime(item.end_time)}{item.classes?.name ? ` - ${item.classes.name}` : ""}</p><p className="mt-1 text-xs text-gray-500">Menggantikan {item.absent?.full_name || "pengajar lain"}</p></div>
                  <span className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">{formatSubstituteStatus(item.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900"><CalendarCheck className="h-4 w-4 text-emerald-600" /> Riwayat 30 hari</h2>
        {isLoading ? <p className="py-6 text-center text-sm text-gray-400">Memuat riwayat...</p> : history.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">Belum ada riwayat absensi.</p> : (
          <div className="divide-y">
            {history.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-bold text-gray-900">{new Date(`${item.date}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" })}</p><p className="text-xs text-gray-500">{item.time_in ? `Masuk ${formatShortTime(item.time_in)}` : "Tidak ada jam masuk"}{item.time_out ? ` - Pulang ${formatShortTime(item.time_out)}` : ""}{item.attendance_sites?.name ? ` - ${item.attendance_sites.name}` : ""}</p></div>
                <div className="flex flex-wrap gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClass(item.status)}`}>{statusLabel(item.status)}</span><span className="rounded-full border bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-600">{verificationLabel(item.verification_status)}</span></div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-lg border bg-gray-50 p-3 text-xs text-gray-500">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p>Waktu menggunakan server sekolah. Lokasi hanya diambil saat Anda menekan tombol absensi, tidak dilacak terus-menerus, dan disimpan sebagai bukti pemeriksaan kehadiran.</p>
      </div>
    </div>
  );
};
