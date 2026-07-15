import React, { useState } from "react";
import { useList, useUpdate, type CrudFilters } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { CheckCircle, XCircle, Eye, Clock, X } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { FinanceSectionNav } from "../components/FinanceSectionNav";
import { supabaseClient } from "../../../lib/supabase/client";
import { belongsToFinanceUnit } from "../finance-utils";

type PaymentTransaction = {
  id: string;
  status: string;
  payment_method?: string | null;
  amount_paid?: number | null;
  payment_date?: string | null;
  proof_image_url?: string | null;
  notes?: string | null;
  cash_account_id?: string | null;
  external_student_id?: string | null;
  student_invoices?: { title?: string | null; amount?: number | null; discount?: number | null; paid_amount?: number | null; unit_id?: string | null; academic_year_id?: string | null } | null;
  students?: { full_name?: string | null; nis?: string | null } | null;
  external_students?: { full_name?: string | null; school_origin?: string | null } | null;
};
type CashAccount = { id: string; account_type: string; unit_id?: string | null };

export const PaymentVerifications: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const [filterStatus, setFilterStatus] = useState("pending_verification");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const filters: CrudFilters = [];
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });

  const { data, isLoading } = useList<PaymentTransaction>({
    resource: "payment_transactions",
    filters,
    meta: { select: "*, student_invoices(title, amount, discount, paid_amount, unit_id, academic_year_id), students(full_name, nis), external_students(full_name, school_origin)" },
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { mode: "off" }
  });
  const { data: cashAccountsData } = useList<CashAccount>({ resource: "finance_cash_accounts", filters: [{ field: "is_active", operator: "eq", value: true }], pagination: { mode: "off" } });
  const cashAccounts = (cashAccountsData?.data || []).filter((account) => belongsToFinanceUnit(account.unit_id, activeUnitId));
  const visibleTransactions = (data?.data || []).filter((transaction) => {
    if (activeUnitId && transaction.student_invoices?.unit_id !== activeUnitId) return false;
    if (activeYearId && transaction.student_invoices?.academic_year_id !== activeYearId) return false;
    return true;
  });

  const { mutate: updateStatus } = useUpdate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const openProof = async (value: string) => {
    if (/^https?:\/\//i.test(value)) {
      setSelectedImage(value);
      return;
    }
    const { data: signed, error } = await supabaseClient.storage.from("payment-proofs").createSignedUrl(value, 300);
    if (!error && signed?.signedUrl) setSelectedImage(signed.signedUrl);
  };

  const handleVerify = (id: string, newStatus: string, reason?: string) => {
    const isApproved = newStatus === 'verified';
    const transaction = data?.data?.find((item) => item.id === id);
    const preferredType = transaction?.payment_method === "cash" ? "cash" : transaction?.payment_method === "qris" ? "qris" : "bank";
    const defaultAccountId = cashAccounts.find((account) => account.account_type === preferredType)?.id;
    if(isApproved ? confirm('Setujui pembayaran ini?') : true) {
      updateStatus({
        resource: "payment_transactions",
        id,
        values: { status: newStatus, verified_at: new Date().toISOString(), ...(isApproved && !transaction?.cash_account_id ? { cash_account_id: defaultAccountId || null } : {}), ...(reason ? { rejection_reason: reason, notes: reason } : {}) }
      }, { onSuccess: () => { setRejectingId(null); setRejectionReason(""); } });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Verifikasi Bukti Transfer" 
        description="Periksa dan setujui bukti transfer yang diunggah oleh orang tua/wali murid." 
      />
      <FinanceSectionNav />

      <div className="flex gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Status Verifikasi:</label>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Semua Status</option>
          <option value="pending_verification">Menunggu Verifikasi</option>
          <option value="verified">Telah Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
           <div className="col-span-full p-8 text-center text-muted-foreground animate-pulse">Memuat data...</div>
        ) : visibleTransactions.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground flex flex-col items-center border rounded-xl bg-card">
            <CheckCircle className="w-12 h-12 mb-4 opacity-20" />
            <p>Tidak ada transaksi yang sesuai dengan filter.</p>
          </div>
        ) : (
          visibleTransactions.map(trx => (
            <div key={trx.id} className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-muted/20 flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-foreground text-sm line-clamp-1">{trx.student_invoices?.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">
                      {trx.students?.full_name || trx.external_students?.full_name} 
                      {trx.students?.nis ? ` (${trx.students.nis})` : trx.external_students?.school_origin ? ` (${trx.external_students.school_origin})` : ''}
                    </p>
                    {trx.external_student_id && (
                      <span className="bg-indigo-100 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Eksternal</span>
                    )}
                  </div>
                </div>
                {trx.status === 'pending_verification' && <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>}
                {trx.status === 'verified' && <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Disetujui</span>}
                {trx.status === 'rejected' && <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><XCircle className="w-3 h-3"/> Ditolak</span>}
              </div>
              
              <div className="p-4 flex-1 space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Nominal Transfer:</span>
                  <span className="font-bold text-emerald-600">Rp {(Number(trx.amount_paid)).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Metode Pembayaran:</span>
                  <span className="font-semibold uppercase text-xs">{String(trx.payment_method || "-").replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Tanggal Pembayaran:</span>
                  <span className="font-medium">{trx.payment_date ? new Date(trx.payment_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year:'numeric'}) : "-"}</span>
                </div>
                {trx.notes && (
                  <div className="bg-muted/50 p-2 rounded border text-xs">
                    <span className="font-semibold text-muted-foreground block mb-1">Catatan Orang Tua:</span>
                    {trx.notes}
                  </div>
                )}
                
                {trx.proof_image_url && (
                  <div className="pt-2">
                    <button 
                      onClick={() => trx.proof_image_url && openProof(trx.proof_image_url)}
                      className="w-full py-2 flex items-center justify-center gap-2 border border-dashed border-indigo-200 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors text-xs font-semibold"
                    >
                      <Eye className="w-4 h-4" /> Lihat Bukti Transfer
                    </button>
                  </div>
                )}
              </div>
              
              {trx.status === 'pending_verification' && (
                <div className="p-4 bg-muted/30 border-t flex gap-3">
                  <button onClick={() => setRejectingId(trx.id as string)} className="flex-1 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md font-semibold text-sm transition-colors flex justify-center items-center gap-1.5"><XCircle className="w-4 h-4"/> Tolak</button>
                  <button onClick={() => handleVerify(trx.id as string, 'verified')} className="flex-1 py-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md font-semibold text-sm transition-colors flex justify-center items-center gap-1.5"><CheckCircle className="w-4 h-4"/> Setujui</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedImage(null)}>
          <div className="max-w-3xl max-h-[90vh] w-full relative">
             <button className="absolute -top-10 right-0 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-red-300" onClick={() => setSelectedImage(null)}><X className="h-4 w-4" /> Tutup</button>
             <img src={selectedImage} alt="Bukti Transfer" className="w-full h-full object-contain rounded-lg shadow-2xl bg-black" />
          </div>
        </div>
      )}

      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div><h3 className="font-bold">Tolak Pembayaran</h3><p className="mt-1 text-xs text-muted-foreground">Alasan akan terlihat oleh orang tua pada riwayat pembayaran.</p></div>
              <button onClick={() => setRejectingId(null)} className="rounded-md p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block"><span className="mb-1 block text-sm font-medium">Alasan Penolakan</span><textarea autoFocus required rows={4} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Contoh: nominal pada bukti tidak sesuai tagihan" /></label>
              <div className="flex justify-end gap-3"><button onClick={() => setRejectingId(null)} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Batal</button><button disabled={!rejectionReason.trim()} onClick={() => handleVerify(rejectingId, 'rejected', rejectionReason.trim())} className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Tolak Pembayaran</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
