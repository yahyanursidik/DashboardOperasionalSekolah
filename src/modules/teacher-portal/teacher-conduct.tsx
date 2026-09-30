/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { Eye, EyeOff, Loader2, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { ConductRecordForm } from "../counseling/components/ConductRecordForm";
import { kindLabels, statusLabels } from "../counseling/conduct-config";
import { loadTeacherAssignedClassIds } from "./teacher-assignment-data";

const db = supabaseClient as any;

export const TeacherConduct: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const employeeId: string | undefined = employee?.id;
  const [classIds, setClassIds] = useState<string[] | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    void (async () => {
      const [assigned, homeroom] = await Promise.all([
        loadTeacherAssignedClassIds(employeeId),
        db.from("classes").select("id").eq("homeroom_teacher_id", employeeId),
      ]);
      if (!cancelled) setClassIds([...new Set([...(assigned.data || []), ...((homeroom.data || []).map((row: any) => row.id))])]);
    })();
    return () => { cancelled = true; };
  }, [employeeId]);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    const { data, error } = await db.from("conduct_records")
      .select("id, kind, title, points, incident_date, status, visibility, follow_up, students(full_name), classes(name)")
      .eq("reported_by", employeeId).order("incident_date", { ascending: false }).limit(100);
    if (error) toast.error("Catatan belum dapat dimuat", { description: error.message });
    setRows(data || []);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-emerald-700" /><h1 className="text-xl font-bold text-gray-950">Tata Tertib & Prestasi</h1></div>
          <p className="mt-1 text-sm text-gray-500">Laporkan pelanggaran atau prestasi siswa di kelas Anda. Tim BK akan menindaklanjuti.</p>
        </div>
        <button type="button" onClick={() => setFormOpen(true)} disabled={classIds === null} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <Plus className="h-4 w-4" /> Catat Kejadian
        </button>
      </header>
      {classIds !== null && classIds.length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Belum ada kelas yang ditugaskan kepada Anda. Hubungi admin kurikulum untuk penugasan kelas.</p>
      )}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Laporan saya</h2>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
        {!loading && rows.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">Belum ada laporan.</p>}
        {rows.map((row) => (
          <article key={row.id} className="rounded-lg border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">{row.students?.full_name} <span className="text-xs font-normal text-gray-500">· {row.classes?.name}</span></p>
                <p className="text-sm text-gray-700">{row.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.kind === "violation" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>{kindLabels[row.kind as keyof typeof kindLabels]} · {row.points} poin</span>
                {row.visibility === "parents" ? <Eye className="h-4 w-4 text-gray-400" aria-label="Dibagikan ke orang tua" /> : <EyeOff className="h-4 w-4 text-gray-400" aria-label="Internal" />}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">{new Date(row.incident_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · {statusLabels[row.status as keyof typeof statusLabels]}{row.follow_up ? ` · ${row.follow_up}` : ""}</p>
          </article>
        ))}
      </section>
      <ConductRecordForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => void load()} classIds={classIds} />
    </div>
  );
};
