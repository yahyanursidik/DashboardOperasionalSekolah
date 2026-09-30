/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { Award, Loader2, ShieldAlert } from "lucide-react";
import { supabaseClient } from "../../lib/supabase/client";
import { conductLevel, kindLabels, netConductPoints, statusLabels } from "../counseling/conduct-config";

const db = supabaseClient as any;

/** Parent view of shared conduct records (RLS only returns records marked for parents). */
export const PortalConduct: React.FC = () => {
  const { student } = useOutletContext<any>();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student?.id) return;
    let cancelled = false;
    void db.from("conduct_records").select("id, kind, title, points, incident_date, status, description, follow_up")
      .eq("student_id", student.id).order("incident_date", { ascending: false })
      .then(({ data }: any) => { if (!cancelled) { setRows(data || []); setLoading(false); } });
    return () => { cancelled = true; };
  }, [student?.id]);

  const violation = rows.filter((row) => row.kind === "violation").reduce((sum, row) => sum + Number(row.points || 0), 0);
  const achievement = rows.filter((row) => row.kind === "achievement").reduce((sum, row) => sum + Number(row.points || 0), 0);
  const net = netConductPoints(violation, achievement);
  const level = conductLevel(net);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Sikap & Prestasi</h1>
        <p className="mt-1 text-sm text-gray-500">Catatan tata tertib dan prestasi {student?.full_name || "ananda"} yang dibagikan sekolah.</p>
      </header>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-4"><Award className="h-5 w-5 text-emerald-600" /><p className="mt-2 text-2xl font-bold">{achievement}</p><p className="text-xs text-gray-500">Poin prestasi</p></div>
        <div className="rounded-xl border bg-white p-4"><ShieldAlert className="h-5 w-5 text-rose-600" /><p className="mt-2 text-2xl font-bold">{violation}</p><p className="text-xs text-gray-500">Poin pelanggaran</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs font-semibold uppercase text-gray-500">Status</p><p className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${level ? level.tone : "bg-emerald-100 text-emerald-800"}`}>{level ? level.level : "Baik"}</p></div>
      </div>
      {level && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Mohon berkoordinasi dengan wali kelas atau guru BK untuk pendampingan ananda.</p>}
      <section className="space-y-3">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
        {!loading && rows.length === 0 && <p className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-gray-500">Belum ada catatan yang dibagikan.</p>}
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.kind === "violation" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>{kindLabels[row.kind as keyof typeof kindLabels]}</span>
                <p className="mt-1.5 font-semibold text-gray-900">{row.title}</p>
                {row.description && <p className="mt-1 text-sm text-gray-600">{row.description}</p>}
                {row.follow_up && <p className="mt-1 text-sm text-emerald-700">Tindak lanjut: {row.follow_up}</p>}
              </div>
              <p className="shrink-0 text-lg font-bold text-gray-900">{row.points}<span className="ml-0.5 text-xs font-normal text-gray-500">poin</span></p>
            </div>
            <p className="mt-2 text-xs text-gray-500">{new Date(row.incident_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · {statusLabels[row.status as keyof typeof statusLabels]}</p>
          </article>
        ))}
      </section>
    </div>
  );
};
