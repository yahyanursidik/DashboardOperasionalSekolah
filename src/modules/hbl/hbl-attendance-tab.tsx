/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";
import type { useHblProgram } from "./use-hbl-program";
import type { HblPlanActions } from "./hbl-program-view";

const db = supabaseClient as any;
const CELL: Record<string, { short: string; tone: string; label: string }> = {
  hadir: { short: "H", tone: "bg-emerald-100 text-emerald-800", label: "Hadir" },
  terlambat: { short: "H", tone: "bg-emerald-100 text-emerald-800", label: "Hadir (terlambat)" },
  pulang_awal: { short: "H", tone: "bg-emerald-100 text-emerald-800", label: "Hadir (pulang awal)" },
  izin: { short: "I", tone: "bg-sky-100 text-sky-800", label: "Izin" },
  sakit: { short: "S", tone: "bg-amber-100 text-amber-800", label: "Sakit" },
  alpa: { short: "A", tone: "bg-rose-100 text-rose-800", label: "Tidak hadir" },
};
const PRESENT = new Set(["hadir", "terlambat", "pulang_awal"]);

export const HblAttendanceTab: React.FC<{ data: ReturnType<typeof useHblProgram>; heldMeetings: any[]; actions: HblPlanActions }> = ({ data, heldMeetings, actions }) => {
  const [records, setRecords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const meetings = useMemo(() => [...heldMeetings].sort((a, b) => String(a.meeting_date).localeCompare(String(b.meeting_date))), [heldMeetings]);
  const studentKey = data.roster.map((student) => student.id).join(",");
  const dateKey = [...new Set(meetings.map((meeting) => meeting.meeting_date))].join(",");

  useEffect(() => {
    if (!studentKey || !dateKey) { setRecords({}); setLoading(false); return; }
    setLoading(true);
    void db.from("attendance_records").select("student_id,attendance_date,status").in("student_id", studentKey.split(",")).in("attendance_date", dateKey.split(","))
      .then(({ data: rows }: any) => {
        setRecords(Object.fromEntries((rows || []).map((row: any) => [`${row.student_id}|${row.attendance_date}`, row.status])));
        setLoading(false);
      });
  }, [dateKey, studentKey]);

  if (loading) return <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!meetings.length) return <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Belum ada pertemuan terbit yang sudah berlangsung.</p>;

  const recordedMeetings = meetings.filter((meeting) => data.roster.some((student) => records[`${student.id}|${meeting.meeting_date}`]));
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>{recordedMeetings.length}/{meetings.length} pertemuan sudah dicatat. Klik judul kolom untuk mengisi kehadiran pertemuan tersebut.</p>
        <p className="flex flex-wrap gap-2">{["hadir", "izin", "sakit", "alpa"].map((key) => <span key={key} className={`rounded px-1.5 py-0.5 font-bold ${CELL[key].tone}`}>{CELL[key].short} = {CELL[key].label}</span>)}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="sticky left-0 z-10 bg-muted px-4 py-2 text-left">Anak</th>
              {meetings.map((meeting) => (
                <th key={meeting.id} className="px-1 py-2">
                  <button type="button" title={meeting.title} onClick={() => actions.openMeeting(meeting.id, "attendance")} className={`rounded px-1.5 py-1 font-semibold hover:bg-background ${recordedMeetings.includes(meeting) ? "" : "text-amber-700"}`}>
                    {new Date(`${meeting.meeting_date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 text-right">Kehadiran</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.roster.map((student) => {
              const statuses = meetings.map((meeting) => records[`${student.id}|${meeting.meeting_date}`]);
              const counted = statuses.filter(Boolean);
              const present = counted.filter((status) => PRESENT.has(status)).length;
              const pct = counted.length ? Math.round((present / counted.length) * 100) : null;
              return (
                <tr key={student.id}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-4 py-2 font-medium">{student.full_name}</td>
                  {statuses.map((status, index) => (
                    <td key={meetings[index].id} className="px-1 py-2 text-center">
                      {status ? <span title={CELL[status]?.label} className={`inline-block w-6 rounded text-xs font-bold ${CELL[status]?.tone || "bg-muted"}`}>{CELL[status]?.short || "?"}</span> : <span className="text-muted-foreground">·</span>}
                    </td>
                  ))}
                  <td className={`px-3 py-2 text-right font-bold ${pct === null ? "text-muted-foreground" : pct >= 80 ? "text-emerald-700" : pct >= 60 ? "text-amber-700" : "text-rose-700"}`}>{pct === null ? "–" : `${pct}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
