import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Receipt, CheckCircle, Clock, Upload, X } from "lucide-react";

export const PortalFinance: React.FC = () => {
  const { student } = useOutletContext<any>();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInvoices = async () => {
    try {
      const { data } = await supabaseClient
        .from("student_invoices")
        .select("*, payment_transactions(id, status)")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });
      
      if (data) setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [student.id]);

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofUrl || !selectedInvoice) return;
    
    setIsSubmitting(true);
    try {
      // Create a pending transaction
      const { error } = await supabaseClient
        .from("payment_transactions")
        .insert([{
          invoice_id: selectedInvoice.id,
          amount: selectedInvoice.amount - selectedInvoice.paid_amount,
          payment_method: "Bank Transfer",
          payment_date: new Date().toISOString(),
          status: "pending_verification",
          notes: "Uploaded via Parent Portal",
          proof_url: proofUrl, // In real app, we would upload file to Supabase Storage
          created_by: student.id // Indicate it's from parent
        }]);

      if (error) throw error;
      
      alert("Bukti pembayaran berhasil dikirim! Menunggu verifikasi admin.");
      setSelectedInvoice(null);
      setProofUrl("");
      fetchInvoices();
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim bukti pembayaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Memuat data tagihan...</div>;
  }

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

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
        <Receipt className="w-6 h-6 text-emerald-600" /> Informasi Tagihan
      </h2>

      {invoices.length === 0 ? (
        <div className="bg-gray-50 rounded-xl border border-dashed p-8 text-center text-gray-500">
          <p>Belum ada riwayat tagihan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const hasPendingTx = inv.payment_transactions?.some((tx: any) => tx.status === 'pending_verification');
            return (
              <div key={inv.id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{inv.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Jatuh Tempo: {new Date(inv.due_date).toLocaleDateString('id-ID')}</p>
                  </div>
                  {getStatusBadge(inv.status, hasPendingTx)}
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-500">Sisa Tagihan</div>
                  <div className="text-lg font-bold text-gray-900">
                    Rp {(inv.amount - inv.paid_amount).toLocaleString('id-ID')}
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
                <p className="text-xs text-emerald-700 mt-1">Total yang harus dibayar: Rp {(selectedInvoice.amount - selectedInvoice.paid_amount).toLocaleString('id-ID')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL / Link Bukti Transfer</label>
                <input
                  type="url"
                  required
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://contoh.com/gambar-struk.jpg"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  *Untuk versi Demo ini, silakan masukkan URL gambar dari internet (misal URL gambar struk di Google). Pada versi Production, fitur ini akan di-upgrade menjadi upload file kamera.
                </p>
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
