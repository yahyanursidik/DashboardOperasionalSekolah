import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowLeft, CalendarCheck, CheckCircle2, Clock, LogIn, LogOut, ShieldCheck, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { formatLeaveType, isLeaveActiveOnDate, toDateInputValue } from "../leaves/leave-utils";
import { formatShortTime, formatSubstituteStatus } from "../substitutes/substitute-utils";

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function statusLabel(status?: string | null) {
  const map: Record<string, string> = {
    present: "Hadir",
    late: "Terlambat",
    sick: "Sakit",
    leave: "Izin",
    absent: "Alpha",
  };
  return map[status || ""] ?? status ?? "Belum Absen";
}

function statusClass(status?: string | null) {
  if (status === "present") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "late") return "bg-orange-100 text-orange-700 border-orange-200";
  if (status === "leave" || status === "sick") return "bg-blue-100 text-blue-700 border-blue-200";
  if (status === "absent") return "bg-red-100 text-red-700 border-red-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

export const TeacherAttendance: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const today = toDateInputValue(new Date());
  const [record, setRecord] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeLeave, setActiveLeave] = useState<any>(null);
  const [substitutes, setSubstitutes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: attendanceRows }, { data: leaveRows }, { data: substituteRows }] = await Promise.all([
        supabaseClient
          .from("employee_attendance")
          .select("id, date, status, time_in, time_out, notes, created_at")
          .eq("employee_id", employee.id)
          .order("date", { ascending: false })
          .limit(15),
        supabaseClient
          .from("leave_requests")
          .select("id, leave_type, start_date, end_date, status, reason")
          .eq("employee_id", employee.id)
          .eq("status", "approved")
          .lte("start_date", today)
          .gte("end_date", today),
        supabaseClient
          .from("substitute_assignments")
          .select("id, date, start_time, end_time, subject, status, classes(name), absent:absent_employee_id(full_name)")
          .eq("substitute_employee_id", employee.id)
          .eq("date", today)
          .neq("status", "cancelled")
          .order("start_time", { ascending: true }),
      ]);

      const rows = attendanceRows ?? [];
      setHistory(rows);
      setRecord(rows.find((item: any) => item.date === today) ?? null);
      setActiveLeave((leaveRows ?? []).find((item: any) => isLeaveActiveOnDate(item, today)) ?? null);
      setSubstitutes(substituteRows ?? []);
    } catch (error) {
      console.error("Teacher attendance fetch error:", error);
      toast.error("Gagal memuat data absensi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [employee.id]);

  const saveAttendance = async (values: Record<string, any>, successMessage: string) => {
    setIsSaving(true);
    try {
      const payload = {
        employee_id: employee.id,
        date: today,
        ...values,
      };
      const { error } = await supabaseClient
        .from("employee_attendance")
        .upsert(payload, { onConflict: "employee_id,date" });
      if (error) throw error;
      toast.success(successMessage);
      await fetchData();
    } catch (error) {
      console.error("Teacher attendance save error:", error);
      toast.error("Gagal menyimpan absensi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckIn = () => {
    saveAttendance(
      {
        status: record?.status || "present",
        time_in: record?.time_in || nowTime(),
        notes: record?.notes || "Absen mandiri dari portal pengajar.",
      },
      "Jam masuk berhasil disimpan."
    );
  };

  const handleCheckOut = () => {
    if (!record?.time_in) {
      toast.error("Simpan jam masuk terlebih dahulu.");
      return;
    }
    saveAttendance(
      {
        status: record.status || "present",
        time_in: record.time_in,
        time_out: nowTime(),
        notes: record.notes || "Absen mandiri dari portal pengajar.",
      },
      "Jam pulang berhasil disimpan."
    );
  };

  const attendanceDone = Boolean(record?.time_in);
  const daySummary = useMemo(() => {
    if (activeLeave) return `Izin disetujui: ${formatLeaveType(activeLeave.leave_type)}`;
    if (record?.status) return statusLabel(record.status);
    return "Belum ada absen hari ini";
  }, [activeLeave, record]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/teacher" className="p-2 bg-white rounded-full shadow-sm border text-gray-600 hover:text-primary transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="font-bold text-lg text-gray-900">Absensi Saya</h2>
          <p className="text-xs text-gray-500">{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <section className="rounded-3xl bg-white border shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500">Status Hari Ini</p>
            <h3 className="mt-1 text-2xl font-black text-gray-900">{daySummary}</h3>
            <p className="mt-2 text-sm text-gray-500">
              {record?.time_in ? `Masuk ${formatShortTime(record.time_in)}` : "Jam masuk belum tersimpan"}
              {record?.time_out ? `, pulang ${formatShortTime(record.time_out)}` : ""}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(record?.status)}`}>
            {statusLabel(record?.status)}
          </span>
        </div>

        {activeLeave && (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <p>Izin Anda sudah disetujui HRD untuk hari ini. Jika tetap hadir, simpan absen agar admin mengetahui kondisi aktual.</p>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={handleCheckIn}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" /> {attendanceDone ? "Perbarui Masuk" : "Absen Masuk"}
          </button>
          <button
            onClick={handleCheckOut}
            disabled={isSaving || !record?.time_in}
            className="flex items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" /> Absen Pulang
          </button>
        </div>
      </section>

      {substitutes.length > 0 && (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
            <UserRoundCheck className="w-4 h-4 text-emerald-600" />
            Tugas Inval Hari Ini
          </h3>
          <div className="space-y-3">
            {substitutes.map((item) => (
              <div key={item.id} className="rounded-xl border bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.subject || "Tugas pengganti"}</p>
                    <p className="text-xs text-gray-500">{formatShortTime(item.start_time)} - {formatShortTime(item.end_time)} {item.classes?.name ? `- Kelas ${item.classes.name}` : ""}</p>
                    <p className="mt-1 text-xs text-gray-500">Menggantikan {item.absent?.full_name || "pengajar lain"}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                    {formatSubstituteStatus(item.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
          <CalendarCheck className="w-4 h-4 text-primary" />
          Riwayat 15 Hari Terakhir
        </h3>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-400">Memuat riwayat...</p>
        ) : history.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Belum ada riwayat absensi.</p>
        ) : (
          <div className="divide-y">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">{new Date(`${item.date}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" })}</p>
                  <p className="text-xs text-gray-500">
                    {item.time_in ? `Masuk ${formatShortTime(item.time_in)}` : "Tidak ada jam masuk"}
                    {item.time_out ? ` - Pulang ${formatShortTime(item.time_out)}` : ""}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClass(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
