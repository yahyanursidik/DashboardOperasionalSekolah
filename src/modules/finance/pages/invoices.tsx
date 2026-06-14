import React, { useState } from "react";
import { useList, useCreate } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Receipt, Plus, Search, Filter, AlertCircle, CheckCircle, Clock, Banknote, CreditCard } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const InvoicesList: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({ title: "", category_id: "", amount: 0, due_date: "" });
  
  // Payment / Installment Form
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ amount_paid: 0, payment_method: "cash", notes: "" });

  const { mutate: createInvoice } = useCreate();
  const { mutate: createPayment } = useCreate();

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Fitur Generate Tagihan Massal akan segera aktif ketika backend selesai. Untuk saat ini data tagihan bisa disiapkan melalui sistem Admin.');
    setIsModalOpen(false);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    
    createPayment({
      resource: "payment_transactions",
      values: {
        invoice_id: paymentInvoice.id,
        student_id: paymentInvoice.student_id,
        amount_paid: paymentForm.amount_paid,
        payment_method: paymentForm.payment_method,
        payment_date: new Date().toISOString().split('T')[0],
        status: "verified", // Admin bypasses verification
        notes: paymentForm.notes
      }
    }, {
      onSuccess: () => {
        setPaymentInvoice(null);
        alert('Pembayaran cicilan berhasil dicatat! Status tagihan akan otomatis diperbarui oleh sistem.');
      }
    });
  };

  const filters: any[] = [];
  if (activeUnitId) filters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  if (activeYearId) filters.push({ field: "academic_year_id", operator: "eq", value: activeYearId });
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });

  const { data, isLoading } = useList({
    resource: "student_invoices",
    filters,
    meta: { select: "*, students!inner(full_name, nis), finance_categories(name, is_recurring)" },
    sorters: [{ field: "created_at", order: "desc" }]
  });

  // Filter client-side by search
  const filteredData = data?.data.filter(inv => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return inv.students?.full_name.toLowerCase().includes(searchLower) || 
           inv.title.toLowerCase().includes(searchLower) ||
           inv.students?.nis?.toLowerCase().includes(searchLower);
  }) || [];

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'paid': return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3"/> Lunas</span>;
      case 'partial': return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max"><Clock className="w-3 h-3"/> Sebagian</span>;
      case 'unpaid': return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max"><AlertCircle className="w-3 h-3"/> Belum Bayar</span>;
      default: return <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider w-max">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Tagihan & Pembayaran" 
        description="Pantau status pembayaran siswa dan buat tagihan massal (seperti SPP bulanan)." 
        action={
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm">
            <Plus className="w-4 h-4" /> Buat Tagihan
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama siswa, NIS, judul tagihan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        
        <div className="flex gap-4 items-center w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto border rounded-md px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="partial">Bayar Sebagian (Cicil)</option>
            <option value="unpaid">Belum Bayar</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
           <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat tagihan...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Receipt className="w-12 h-12 mb-4 opacity-20" />
            <p>Tidak ada tagihan yang sesuai dengan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold border-b">
                <tr>
                  <th className="px-4 py-4">Judul Tagihan</th>
                  <th className="px-4 py-4">Siswa</th>
                  <th className="px-4 py-4 text-right">Nominal (Rp)</th>
                  <th className="px-4 py-4 text-right">Terbayar</th>
                  <th className="px-4 py-4 text-right">Sisa / Tunggakan</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-4 py-4 text-center">Jatuh Tempo</th>
                  <th className="px-4 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredData.map(inv => {
                  const netAmount = Number(inv.amount) - Number(inv.discount);
                  const remaining = netAmount - Number(inv.paid_amount);
                  
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-foreground font-bold">{inv.title}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{inv.finance_categories?.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{inv.students?.full_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">NIS: {inv.students?.nis || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>{(Number(inv.amount)).toLocaleString('id-ID')}</div>
                        {Number(inv.discount) > 0 && <div className="text-xs text-rose-500 mt-0.5">Diskon: -{(Number(inv.discount)).toLocaleString('id-ID')}</div>}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                        {(Number(inv.paid_amount)).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600 font-bold">
                        {remaining > 0 ? remaining.toLocaleString('id-ID') : '0'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">{getStatusBadge(inv.status)}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          {remaining > 0 ? (
                            <button 
                              onClick={() => {
                                setPaymentInvoice(inv);
                                setPaymentForm({ amount_paid: remaining, payment_method: "cash", notes: "" });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md font-bold text-xs transition-colors"
                            >
                              <Banknote className="w-3.5 h-3.5" /> Bayar / Cicil
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Selesai</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-lg flex items-center gap-2"><Receipt className="w-5 h-5"/> Buat Tagihan Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-xs border border-amber-200 font-medium">
                Fitur otomatisasi tagihan massal sedang dalam tahap integrasi dengan server (Supabase Edge Functions). Silakan hubungi tim IT jika ada pembuatan tagihan mendesak.
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Judul Tagihan</label>
                <input required type="text" value={generateForm.title} onChange={e => setGenerateForm({...generateForm, title: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Misal: SPP Agustus 2024" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">Tutup</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Generate Tagihan Massal</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Payment / Installment Modal */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-emerald-50 text-emerald-900">
              <h3 className="font-bold text-lg flex items-center gap-2"><CreditCard className="w-5 h-5"/> Input Pembayaran</h3>
              <button onClick={() => setPaymentInvoice(null)} className="text-emerald-900/60 hover:text-emerald-900">✕</button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg border text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tagihan:</span>
                  <span className="font-bold">{paymentInvoice.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Siswa:</span>
                  <span className="font-medium">{paymentInvoice.students?.full_name}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-muted-foreground">Total Sisa Tunggakan:</span>
                  <span className="font-bold text-rose-600">Rp {((Number(paymentInvoice.amount) - Number(paymentInvoice.discount)) - Number(paymentInvoice.paid_amount)).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nominal Pembayaran (Rp)</label>
                <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3"/> Ubah nominal jika orang tua mencicil
                </div>
                <input required type="number" min="1" max={(Number(paymentInvoice.amount) - Number(paymentInvoice.discount)) - Number(paymentInvoice.paid_amount)} value={paymentForm.amount_paid} onChange={e => setPaymentForm({...paymentForm, amount_paid: Number(e.target.value)})} className="w-full border rounded-md px-3 py-2 text-lg font-bold text-emerald-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-emerald-50/30" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Metode Pembayaran</label>
                <select value={paymentForm.payment_method} onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                  <option value="cash">Uang Tunai (Cash)</option>
                  <option value="transfer">Transfer Bank (Manual)</option>
                  <option value="qris">QRIS / E-Wallet</option>
                  <option value="virtual_account">Virtual Account</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Keterangan / Catatan</label>
                <input type="text" value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="Misal: Titip via Satpam, Cicilan Ke-1..." />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setPaymentInvoice(null)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">Batal</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Konfirmasi Pembayaran</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
