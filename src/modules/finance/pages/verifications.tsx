import React, { useState } from "react";
import { useList, useUpdate } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { CheckCircle, XCircle, Eye, Clock } from "lucide-react";

export const PaymentVerifications: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState("pending_verification");
  
  const filters: any[] = [];
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });

  const { data, isLoading } = useList({
    resource: "payment_transactions",
    filters,
    meta: { select: "*, student_invoices(title, amount, discount, paid_amount), students(full_name, nis), external_students(full_name, school_origin)" },
    sorters: [{ field: "created_at", order: "desc" }]
  });

  const { mutate: updateStatus } = useUpdate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleVerify = (id: string, newStatus: string) => {
    const isApproved = newStatus === 'verified';
    if(confirm(isApproved ? 'Setujui pembayaran ini?' : 'Tolak pembayaran ini?')) {
      updateStatus({
        resource: "payment_transactions",
        id,
        values: { status: newStatus, verified_at: new Date().toISOString() } // simplified
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Verifikasi Bukti Transfer" 
        description="Periksa dan setujui bukti transfer yang diunggah oleh orang tua/wali murid." 
      />

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
        ) : (!data?.data || data.data.length === 0) ? (
          <div className="col-span-full p-12 text-center text-muted-foreground flex flex-col items-center border rounded-xl bg-card">
            <CheckCircle className="w-12 h-12 mb-4 opacity-20" />
            <p>Tidak ada transaksi yang sesuai dengan filter.</p>
          </div>
        ) : (
          data.data.map(trx => (
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
                  <span className="font-semibold uppercase text-xs">{trx.payment_method.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Tanggal Pembayaran:</span>
                  <span className="font-medium">{new Date(trx.payment_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year:'numeric'})}</span>
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
                      onClick={() => setSelectedImage(trx.proof_image_url)}
                      className="w-full py-2 flex items-center justify-center gap-2 border border-dashed border-indigo-200 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors text-xs font-semibold"
                    >
                      <Eye className="w-4 h-4" /> Lihat Bukti Transfer
                    </button>
                  </div>
                )}
              </div>
              
              {trx.status === 'pending_verification' && (
                <div className="p-4 bg-muted/30 border-t flex gap-3">
                  <button onClick={() => handleVerify(trx.id as string, 'rejected')} className="flex-1 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md font-semibold text-sm transition-colors flex justify-center items-center gap-1.5"><XCircle className="w-4 h-4"/> Tolak</button>
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
             <button className="absolute -top-10 right-0 text-white hover:text-red-400 font-bold" onClick={() => setSelectedImage(null)}>TUTUP ✕</button>
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src={selectedImage} alt="Bukti Transfer" className="w-full h-full object-contain rounded-lg shadow-2xl bg-black" />
          </div>
        </div>
      )}
    </div>
  );
};
