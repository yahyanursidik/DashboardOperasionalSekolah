/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Printer } from "lucide-react";
import { periodLabel, rupiah } from "../payroll-utils";


const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string));

function lineQuantity(line: any) {
  const qty = Number(line.quantity);
  if (line.name?.includes("%")) return `${qty}% × ${rupiah(line.rate)}`;
  if (qty === 1) return "";
  return `${qty.toLocaleString("id-ID")} × ${rupiah(line.rate)}`;
}

/** Payslip body; `printable` adds a print button that opens a clean print window. */
export const PayslipView: React.FC<{ slip: any; lines: any[]; run: any; schoolName: string; printable?: boolean }> = ({ slip, lines, run, schoolName, printable = true }) => {
  const earnings = lines.filter((line) => line.kind === "earning");
  const deductions = lines.filter((line) => line.kind === "deduction");

  const print = () => {
    const rows = (items: any[]) => items.map((line) => `<tr><td>${escapeHtml(line.name)}<div class="q">${escapeHtml(lineQuantity(line))}</div></td><td class="r">${escapeHtml(rupiah(line.amount))}</td></tr>`).join("") || `<tr><td colspan="2" class="q">-</td></tr>`;
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Slip Gaji ${escapeHtml(slip.employee_name)} ${escapeHtml(periodLabel(run?.period_month))}</title><style>
      body{font-family:Arial,sans-serif;margin:16mm;color:#0f172a;font-size:13px}h1{font-size:18px;margin:0}h2{font-size:14px;margin:18px 0 6px}
      .muted{color:#64748b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-top:12px}table{width:100%;border-collapse:collapse}
      td{padding:5px 0;border-bottom:1px solid #e2e8f0;vertical-align:top}.r{text-align:right;white-space:nowrap}.q{font-size:11px;color:#64748b}
      .total{font-weight:700;font-size:15px;border-top:2px solid #0f172a;padding-top:8px;margin-top:12px;display:flex;justify-content:space-between}
      .sign{margin-top:48px;display:flex;justify-content:space-between;text-align:center}</style></head><body>
      <h1>${escapeHtml(schoolName)}</h1><div class="muted">Slip Gaji · ${escapeHtml(periodLabel(run?.period_month))}</div>
      <div class="grid"><div>Nama: <b>${escapeHtml(slip.employee_name)}</b></div><div>Unit: ${escapeHtml(slip.unit_name || "-")}</div>
      <div>Jabatan: ${escapeHtml(slip.position || "-")}</div><div>Kehadiran: ${slip.present_days} hari · izin ${slip.leave_days} · tidak hadir ${slip.absent_days}</div>
      <div>Keterlambatan: ${slip.late_minutes} menit</div><div>Lembur: ${Number(slip.overtime_hours).toLocaleString("id-ID")} jam</div></div>
      <h2>Pendapatan</h2><table>${rows(earnings)}<tr><td><b>Total pendapatan</b></td><td class="r"><b>${escapeHtml(rupiah(slip.gross_amount))}</b></td></tr></table>
      <h2>Potongan</h2><table>${rows(deductions)}<tr><td><b>Total potongan</b></td><td class="r"><b>${escapeHtml(rupiah(slip.deduction_amount))}</b></td></tr></table>
      <div class="total"><span>Gaji bersih diterima</span><span>${escapeHtml(rupiah(slip.net_amount))}</span></div>
      <div class="sign"><div>Penerima<br><br><br><br>${escapeHtml(slip.employee_name)}</div><div>Bagian Keuangan/SDM<br><br><br><br>(....................)</div></div>
      <script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  };

  const section = (title: string, items: any[], total: unknown) => (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="divide-y rounded-lg border">
        {items.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">-</p>}
        {items.map((line) => (
          <div key={line.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
            <div><p>{line.name}</p>{lineQuantity(line) && <p className="text-xs text-muted-foreground">{lineQuantity(line)}</p>}</div>
            <p className="whitespace-nowrap font-medium">{rupiah(line.amount)}</p>
          </div>
        ))}
        <div className="flex justify-between bg-muted/40 px-3 py-2 text-sm font-semibold"><span>Total</span><span>{rupiah(total)}</span></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-lg bg-muted/30 p-3 text-sm sm:grid-cols-3">
        <p><span className="text-muted-foreground">Hadir</span> <strong>{slip.present_days}</strong> hari</p>
        <p><span className="text-muted-foreground">Izin</span> <strong>{slip.leave_days}</strong> · <span className="text-muted-foreground">Tidak hadir</span> <strong>{slip.absent_days}</strong></p>
        <p><span className="text-muted-foreground">Telat</span> <strong>{slip.late_minutes}</strong> mnt · <span className="text-muted-foreground">Lembur</span> <strong>{Number(slip.overtime_hours).toLocaleString("id-ID")}</strong> jam</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {section("Pendapatan", earnings, slip.gross_amount)}
        {section("Potongan", deductions, slip.deduction_amount)}
      </div>
      <div className="flex flex-col gap-3 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm text-muted-foreground">Gaji bersih diterima</p><p className="text-2xl font-bold">{rupiah(slip.net_amount)}</p></div>
        {printable && <button type="button" onClick={print} className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"><Printer className="h-4 w-4" /> Cetak slip</button>}
      </div>
    </div>
  );
};
