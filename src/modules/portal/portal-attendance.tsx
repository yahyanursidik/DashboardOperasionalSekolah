import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, FileText } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";
import type { ParentPortalContext } from "./portal-context";

const statusMeta: Record<string, { label: string; className: string }> = {
  hadir: { label: "Hadir", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  terlambat: { label: "Terlambat", className: "bg-amber-50 text-amber-700 border-amber-200" },
  pulang_awal: { label: "Pulang awal", className: "bg-orange-50 text-orange-700 border-orange-200" },
  izin: { label: "Izin", className: "bg-blue-50 text-blue-700 border-blue-200" },
  sakit: { label: "Sakit", className: "bg-violet-50 text-violet-700 border-violet-200" },
  alpa: { label: "Alpa", className: "bg-red-50 text-red-700 border-red-200" },
};

type AttendanceRecord = {
  id: string;
  attendance_date: string;
  status: string;
  arrival_time?: string | null;
  note?: string | null;
};

function monthBounds(value: string) {
  const [year, month] = value.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return { start: `${value}-01`, end: `${value}-${String(lastDay).padStart(2, "0")}` };
}

export const PortalAttendance: React.FC = () => {
  const { student } = useOutletContext<ParentPortalContext>();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAttendance = async () => {
      setIsLoading(true);
      setError("");
      const { start, end } = monthBounds(month);
      const { data, error: queryError } = await supabaseClient
        .from("attendance_records")
        .select("id, attendance_date, status, arrival_time, note")
        .eq("student_id", student.id)
        .gte("attendance_date", start)
        .lte("attendance_date", end)
        .order("attendance_date", { ascending: false });

      if (queryError) {
        console.error("Parent attendance error:", queryError);
        setError("Data kehadiran belum dapat dimuat. Pastikan akses portal siswa sudah aktif.");
      }
      setRecords((data || []) as unknown as AttendanceRecord[]);
      setIsLoading(false);
    };
    void fetchAttendance();
  }, [month, student.id]);

  const summary = useMemo(() => {
    const counts = { present: 0, permission: 0, sick: 0, absent: 0, late: 0 };
    records.forEach((record) => {
      const status = String(record.status || "").toLowerCase();
      if (["hadir", "terlambat", "pulang_awal"].includes(status)) counts.present += 1;
      if (status === "terlambat") counts.late += 1;
      if (status === "izin") counts.permission += 1;
      if (status === "sakit") counts.sick += 1;
      if (status === "alpa") counts.absent += 1;
    });
    const total = records.length;
    return { ...counts, total, percentage: total ? Math.round((counts.present / total) * 100) : 0 };
  }, [records]);

  return (
    <div className="space-y-5 p-4 md:p-0">
      <header className="flex flex-col gap-3 border-b bg-white p-5 md:flex-row md:items-end md:justify-between md:rounded-lg md:border">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-700">Perkembangan anak</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">Kehadiran Siswa</h1>
          <p className="mt-1 text-sm text-gray-500">Riwayat hadir, izin, sakit, keterlambatan, dan catatan sekolah.</p>
        </div>
        <label className="text-xs font-semibold text-gray-600">
          Bulan
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mt-1 block h-10 rounded-md border bg-white px-3 text-sm" />
        </label>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Kehadiran", value: `${summary.percentage}%`, icon: CheckCircle2, tone: "text-emerald-700" },
          { label: "Hari tercatat", value: summary.total, icon: CalendarDays, tone: "text-blue-700" },
          { label: "Terlambat", value: summary.late, icon: Clock3, tone: "text-amber-700" },
          { label: "Izin / sakit", value: summary.permission + summary.sick, icon: FileText, tone: "text-violet-700" },
          { label: "Alpa", value: summary.absent, icon: AlertCircle, tone: "text-red-700" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border bg-white p-4">
            <Icon className={`h-5 w-5 ${tone}`} />
            <p className="mt-3 text-2xl font-bold text-gray-950">{value}</p>
            <p className="text-xs font-semibold text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="border-b px-5 py-4">
          <h2 className="font-bold text-gray-900">Catatan harian</h2>
        </div>
        {isLoading ? (
          <p className="p-8 text-center text-sm text-gray-500">Memuat kehadiran...</p>
        ) : error ? (
          <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">Belum ada data kehadiran pada bulan yang dipilih.</div>
        ) : (
          <div className="divide-y">
            {records.map((record) => {
              const status = String(record.status || "").toLowerCase();
              const meta = statusMeta[status] || { label: record.status, className: "bg-gray-50 text-gray-700 border-gray-200" };
              return (
                <div key={record.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[150px_140px_1fr] sm:items-center">
                  <div>
                    <p className="font-semibold text-gray-900">{new Date(`${record.attendance_date}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long" })}</p>
                    <p className="text-xs text-gray-500">{new Date(`${record.attendance_date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <span className={`w-max rounded-md border px-2.5 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>
                  <div className="text-sm text-gray-600">
                    {record.arrival_time && <span className="mr-3 font-semibold">Masuk {String(record.arrival_time).slice(0, 5)}</span>}
                    <span>{record.note || "Tidak ada catatan tambahan."}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
