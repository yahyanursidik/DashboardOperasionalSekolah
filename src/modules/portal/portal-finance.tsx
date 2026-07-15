import React, { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Receipt, CheckCircle, Clock, Upload, X, History, XCircle, AlertTriangle, Banknote } from "lucide-react";
import { toast } from "sonner";

type PaymentTransaction = { id: string; status: string; amount_paid?: number | null; amount?: number | null; payment_method?: string | null; payment_date: string; created_at?: string | null; notes?: string | null; rejection_reason?: string | null };
type InvoiceRecord = { id: string; title: string; amount?: number | null; discount?: number | null; paid_amount?: number | null; due_date: string; status: string; payment_transactions?: PaymentTransaction[] | null };
type PortalContext = { student: { id: string } };
type PaymentHistoryRow = PaymentTransaction & { invoiceTitle: string };

export const PortalFinance: React.FC = () => {
  const { student } = useOutletContext<PortalContext>();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'history'>('invoices');

  const { data: invoiceData, isLoading, refetch } = useList<InvoiceRecord>({
    resource: "student_invoices",
    filters: [{ field: "student_id", operator: "eq", value: student.id }],
    meta: { select: "*, payment_transactions(id, status, amount_paid, payment_method, payment_date, created_at, notes, rejection_reason)" },
    pagination: { mode: "off" },
    sorters: [{ field: "created_at", order: "desc" }],
  });
  const invoices = useMemo(() => invoiceData?.data || [], [invoiceData?.data]);

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile || !selectedInvoice) return;
    if (proofFile.size > 5 * 1024 * 1024) {
      toast.error("Ukuran bukti pembayaran maksimal 5 MB.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const safeName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${student.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabaseClient.storage.from("payment-proofs").upload(storagePath, proofFile, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { error } = await supabaseClient
        .from("payment_transactions")
        .insert([{
          invoice_id: selectedInvoice.id,
          student_id: student.id,
          amount_paid: Number(selectedInvoice.amount) - Number(selectedInvoice.discount || 0) - Number(selectedInvoice.paid_amount || 0),
          payment_method: "transfer",
          payment_date: new Date().toISOString().slice(0, 10),
          status: "pending_verification",
          notes: "Dikirim melalui Portal Orang Tua",
          proof_image_url: storagePath,
        }]);

      if (error) {
        await supabaseClient.storage.from("payment-proofs").remove([storagePath]);
        throw error;
      }
      
      toast.success("Bukti pembayaran dikirim dan menunggu verifikasi bendahara.");
      setSelectedInvoice(null);
      setProofFile(null);
      refetch();
    } catch (err) {
      console.error(err);
      toast.error("Bukti pembayaran gagal dikirim. Silakan coba kembali.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, hasPendingTx: boolean) => {
    if (hasPendingTx && status !== 'paid') {
      return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md uppercase flex items-center gap-1"><Clock className="w-3 h-3"/> Menunggu Verifikasi</span>;
    }
    switch (status) {
      case 'paid': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Lunas</span>;
      case 'partial': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md uppercase flex items-center gap-1">Sebagian</span>;
      default: return <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-md uppercase flex items-center gap-1">Belum Dibayar</span>;
    }
  };
  const paymentHistory: PaymentHistoryRow[] = invoices
    .flatMap((invoice) => invoice.payment_transactions?.map((transaction) => ({ ...transaction, invoiceTitle: invoice.title })) || [])
    .sort((a, b) => new Date(b.created_at || b.payment_date).getTime() - new Date(a.created_at || a.payment_date).getTime());
  const financeSummary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return invoices.reduce((summary, invoice) => {
      const outstanding = Math.max(Number(invoice.amount || 0) - Number(invoice.discount || 0) - Number(invoice.paid_amount || 0), 0);
      summary.outstanding += outstanding;
      summary.paid += Number(invoice.paid_amount || 0);
      if (outstanding > 0 && invoice.due_date < today) summary.overdue += 1;
      if (invoice.payment_transactions?.some((transaction) => transaction.status === "pending_verification")) summary.pending += 1;
      return summary;
    }, { outstanding: 0, paid: 0, overdue: 0, pending: 0 });
  }, [invoices]);

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Memuat data tagihan...</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="rounded-lg bg-emerald-700 p-6 text-white shadow-sm">
        <div>
          <h2 className="text-2xl font-bold mb-1">Informasi Keuangan</h2>
          <p className="text-emerald-50 text-sm">Pantau tagihan per anak dan unit, unggah bukti, serta lihat hasil verifikasi bendahara.</p>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Sisa tagihan", value: `Rp ${financeSummary.outstanding.toLocaleString("id-ID")}`, icon: Receipt, tone: "text-red-700" },
          { label: "Sudah dibayar", value: `Rp ${financeSummary.paid.toLocaleString("id-ID")}`, icon: Banknote, tone: "text-emerald-700" },
          { label: "Lewat jatuh tempo", value: financeSummary.overdue, icon: AlertTriangle, tone: "text-amber-700" },
          { label: "Menunggu verifikasi", value: financeSummary.pending, icon: Clock, tone: "text-blue-700" },
        ].map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-lg border bg-white p-4"><Icon className={`h-5 w-5 ${tone}`} /><p className="mt-3 break-words text-lg font-bold text-gray-950">{value}</p><p className="text-xs font-semibold text-gray-500">{label}</p></div>)}
      </section>

      <div className="flex bg-gray-100 p-1 rounded-xl w-full">
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${activeTab === 'invoices' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <Receipt className="w-4 h-4" /> Tagihan
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${activeTab === 'history' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <History className="w-4 h-4" /> Riwayat Pembayaran
        </button>
      </div>

      {activeTab === 'invoices' && (
        <>
          {invoices.length === 0 ? (
            <div className="bg-gray-50 rounded-xl border border-dashed p-8 text-center text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Belum ada riwayat tagihan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((inv) => {
            const hasPendingTx = Boolean(inv.payment_transactions?.some((tx) => tx.status === 'pending_verification'));
            return (
              <div key={inv.id} className={`bg-white border rounded-lg p-4 shadow-sm ${inv.status !== "paid" && inv.due_date < new Date().toISOString().slice(0, 10) ? "border-amber-300" : ""}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{inv.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Jatuh Tempo: {new Date(inv.due_date).toLocaleDateString('id-ID')}</p>
                    {inv.status !== "paid" && inv.due_date < new Date().toISOString().slice(0, 10) && <p className="mt-1 text-xs font-bold text-amber-700">Melewati jatuh tempo</p>}
                  </div>
                  {getStatusBadge(inv.status, hasPendingTx)}
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-500">Sisa Tagihan</div>
                  <div className="text-lg font-bold text-gray-900">
                    Rp {(Number(inv.amount) - Number(inv.discount || 0) - Number(inv.paid_amount || 0)).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => window.open(`/print-invoice/${inv.id}`, '_blank')}
                    className="flex-1 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
                  >
                    Cetak Tagihan
                  </button>

                  {inv.status !== 'paid' && !hasPendingTx && (
                    <button 
                      onClick={() => setSelectedInvoice(inv)}
                      className="flex-[2] py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
                    >
                      <Upload className="w-4 h-4" /> Upload Bukti
                    </button>
                  )}
                </div>
              </div>
            );
          })}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {paymentHistory.length === 0 ? (
            <div className="bg-gray-50 rounded-xl border border-dashed p-8 text-center text-gray-500">
              <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Belum ada transaksi pembayaran.</p>
            </div>
          ) : (
            paymentHistory.map((tx, idx) => (
                <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{tx.invoiceTitle}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(tx.payment_date).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                    </div>
                    {tx.status === 'pending_verification' && <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>}
                    {tx.status === 'verified' && <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Disetujui</span>}
                    {tx.status === 'rejected' && <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><XCircle className="w-3 h-3"/> Ditolak</span>}
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <div className="text-xs text-gray-500">Metode: <span className="font-semibold uppercase">{tx.payment_method?.replace('_', ' ')}</span></div>
                    <div className="font-bold text-emerald-600">Rp {(Number(tx.amount_paid || tx.amount)).toLocaleString('id-ID')}</div>
                  </div>
                  {tx.status === 'rejected' && tx.notes && (
                    <div className="mt-3 bg-red-50 text-red-700 text-xs p-2 rounded-md border border-red-100 font-medium">
                      <span className="font-bold">Alasan Ditolak:</span> {tx.notes}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}

      {/* Upload Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">Upload Bukti Transfer</h3>
              <button onClick={() => setSelectedInvoice(null)} className="p-1 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUploadProof} className="p-4 space-y-4">
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p className="text-sm font-medium text-emerald-900">Tagihan: {selectedInvoice.title}</p>
                <p className="text-xs text-emerald-700 mt-1">Total yang harus dibayar: Rp {(Number(selectedInvoice.amount) - Number(selectedInvoice.discount || 0) - Number(selectedInvoice.paid_amount || 0)).toLocaleString('id-ID')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bukti Pembayaran</label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                />
                <p className="text-[10px] text-gray-500 mt-1">Format JPG, PNG, WebP, atau PDF. Ukuran maksimal 5 MB.</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-70 mt-2"
              >
                {isSubmitting ? "Mengirim..." : "Kirim Bukti Pembayaran"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
