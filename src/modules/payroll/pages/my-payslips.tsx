/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { ChevronRight, Loader2, Wallet } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { useSystemSettings } from "../../../app/providers/SettingsProvider";
import { PayslipView } from "../components/PayslipView";
import { periodLabel, rupiah, runStatusLabels } from "../payroll-utils";

const db = supabaseClient as any;

/** Teacher/staff portal: payslips of the signed-in employee (RLS only returns released ones). */
export const MyPayslips: React.FC = () => {
  const { appName } = useSystemSettings();
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lines, setLines] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    void db.from("payroll_slips").select("*, payroll_runs(title, period_month, status, paid_at)").order("created_at", { ascending: false })
      .then(({ data }: any) => {
        if (cancelled) return;
        setSlips((data || []).sort((a: any, b: any) => String(b.payroll_runs?.period_month).localeCompare(String(a.payroll_runs?.period_month))));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const toggle = async (slip: any) => {
    if (openId === slip.id) { setOpenId(null); return; }
    const { data } = await db.from("payroll_slip_lines").select("*").eq("slip_id", slip.id).order("kind").order("sort_order");
    setLines(data || []);
    setOpenId(slip.id);
  };

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2"><Wallet className="h-6 w-6 text-emerald-700" /><h1 className="text-xl font-bold text-gray-950">Slip Gaji</h1></div>
        <p className="mt-1 text-sm text-gray-500">Rincian gaji bulanan Anda setelah disetujui bagian keuangan/SDM.</p>
      </header>
      {loading && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
      {!loading && slips.length === 0 && <p className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-gray-500">Belum ada slip gaji yang dirilis.</p>}
      <div className="space-y-3">
        {slips.map((slip) => (
          <article key={slip.id} className="overflow-hidden rounded-xl border bg-white">
            <button type="button" onClick={() => void toggle(slip)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-gray-50" aria-expanded={openId === slip.id}>
              <div>
                <p className="font-semibold text-gray-900">{periodLabel(slip.payroll_runs?.period_month)}</p>
                <p className="mt-0.5 text-xs text-gray-500"><span className={`rounded-full px-2 py-0.5 font-semibold ${runStatusLabels[slip.payroll_runs?.status]?.tone || ""}`}>{runStatusLabels[slip.payroll_runs?.status]?.label}</span></p>
              </div>
              <div className="flex items-center gap-2"><p className="text-lg font-bold text-gray-900">{rupiah(slip.net_amount)}</p><ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${openId === slip.id ? "rotate-90" : ""}`} /></div>
            </button>
            {openId === slip.id && <div className="border-t p-4"><PayslipView slip={slip} lines={lines} run={slip.payroll_runs} schoolName={appName} /></div>}
          </article>
        ))}
      </div>
    </div>
  );
};
