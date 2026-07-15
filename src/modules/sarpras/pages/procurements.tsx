/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useTable, useList, useUpdate, useCreate } from "@refinedev/core";
import { Plus, Check, X, DollarSign, PackageCheck, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { SarprasSectionNav } from "../components/SarprasSectionNav";
import { supabaseClient } from "../../../lib/supabase/client";

export const ProcurementsList: React.FC<{ isTabMode?: boolean }> = ({ isTabMode }) => {
  const { activeUnitId } = useCurrentUnit();
  const { tableQueryResult } = useTable({
    resource: "procurements",
    filters: { permanent: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [] },
    pagination: { current: 1, pageSize: 15 },
    meta: { select: "*, employees!requester_id(full_name), units(name)" },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  const procurements = tableQueryResult?.data?.data || [];
  const { mutate: updateProcurement } = useUpdate();
  const { mutateAsync: createExpense } = useCreate();
  const { mutateAsync: createProcurement } = useCreate();

  const { data: employees } = useList({ resource: "employees" });
  const { data: units } = useList({ resource: "units" });
  const { data: financeCategories } = useList({ resource: "finance_categories", filters: [{ field: "type", operator: "eq", value: "expense" }] });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    unit_id: activeUnitId || "", requester_id: "", item_name: "", quantity: 1, estimated_price: 0, purpose: "", priority: "normal", needed_by: "", budget_source: ""
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateProcurement({
      resource: "procurements",
      id,
      values: { status: newStatus, approved_at: newStatus === "Disetujui" ? new Date().toISOString() : null },
    }, {
      onSuccess: () => { tableQueryResult.refetch(); toast.success(`Pengadaan ${newStatus.toLowerCase()}.`); }
    });
  };

  const handleDisburseFunds = async (procurement: any) => {
    if (!confirm(`Apakah Anda yakin ingin mencairkan dana untuk pengadaan ${procurement.item_name} sebesar Rp ${procurement.estimated_price.toLocaleString('id-ID')} dan mencatatnya di Buku Kas?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const defaultCategory = financeCategories?.data?.find(c => c.name.includes("ATK") || c.name.includes("Pemeliharaan")) || financeCategories?.data?.[0];
      
      const expenseResponse = await createExpense({
        resource: "school_expenses",
        values: {
          unit_id: procurement.unit_id,
          category_id: defaultCategory?.id,
          amount: procurement.estimated_price,
          expense_date: new Date().toISOString(),
          title: `Pengadaan Sarpras: ${procurement.item_name} (${procurement.quantity}x)`,
          description: `Tujuan: ${procurement.purpose}`,
        }
      });

      const expenseId = expenseResponse.data.id;

      await updateProcurement({
        resource: "procurements",
        id: procurement.id,
        values: { 
          status: "Dipesan",
          expense_id: expenseId,
          ordered_at: new Date().toISOString(),
        },
      });

      tableQueryResult.refetch();
      toast.success("Dana dicatat dan pengadaan masuk tahap pemesanan.");
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat memproses pencairan dana.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceive = async (procurement: any) => {
    if (!confirm(`Konfirmasi ${procurement.quantity} ${procurement.item_name} sudah diterima dan layak dicatat sebagai aset?`)) return;
    setIsProcessing(true);
    try {
      const { error } = await supabaseClient.rpc("receive_procurement_as_assets", { target_procurement_id: procurement.id });
      if (error) throw error;
      toast.success("Barang diterima dan register aset berhasil dibuat."); tableQueryResult.refetch();
    } catch (error) { toast.error("Penerimaan barang gagal diproses", { description: error instanceof Error ? error.message : "Kesalahan tidak diketahui" }); }
    finally { setIsProcessing(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProcurement({ resource: "procurements", values: formData }, {
      onSuccess: () => {
        setIsModalOpen(false);
        tableQueryResult.refetch();
      }
    });
  };

  return (
    <div className="space-y-6">
      {!isTabMode && (
        <>
          <PageHeader title="Pengadaan Sarpras" description="Kendalikan kebutuhan per unit dari usulan, persetujuan anggaran, pemesanan, penerimaan, hingga register aset." action={<button onClick={() => { setFormData((current) => ({ ...current, unit_id: activeUnitId || current.unit_id })); setIsModalOpen(true); }} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
            <Plus className="w-5 h-5" /> Buat Pengajuan
          </button>} />
          <SarprasSectionNav />
        </>
      )}

      {isTabMode && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg font-semibold text-sm active:scale-95">
            <Plus className="w-5 h-5" /> Buat Pengajuan
          </button>
        </div>
      )}

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4">Tanggal Pengajuan</th>
                <th className="px-6 py-4">Unit / Pemohon</th>
                <th className="px-6 py-4">Barang & Estimasi Biaya</th>
                <th className="px-6 py-4">Tujuan Pengadaan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {procurements.map((proc) => (
                <tr key={proc.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">{new Date(proc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{proc.employees?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{proc.units?.name || 'Umum'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{proc.item_name} <span className="text-muted-foreground">({proc.quantity}x)</span></div>
                    <div className="text-xs text-emerald-600 font-bold mt-1">Rp {Number(proc.estimated_price).toLocaleString('id-ID')}</div>
                  </td>
                  <td className="px-6 py-4">{proc.purpose}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      proc.status === 'Disetujui' ? 'bg-blue-100 text-blue-700' :
                      ['Diterima', 'Selesai'].includes(proc.status) ? 'bg-emerald-100 text-emerald-700' :
                      proc.status === 'Dipesan' ? 'bg-cyan-100 text-cyan-700' :
                      proc.status === 'Ditolak' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {proc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {proc.status === 'Menunggu' && (
                      <>
                        <button className="px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-md inline-flex items-center" onClick={() => handleStatusChange(proc.id as string, 'Disetujui')}>
                          <Check className="w-3 h-3 mr-1" /> Setujui
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 rounded-md inline-flex items-center" onClick={() => handleStatusChange(proc.id as string, 'Ditolak')}>
                          <X className="w-3 h-3 mr-1" /> Tolak
                        </button>
                      </>
                    )}
                    {proc.status === 'Disetujui' && (
                      <button 
                        className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md inline-flex items-center" 
                        onClick={() => handleDisburseFunds(proc)}
                        disabled={isProcessing}
                      >
                        <DollarSign className="w-3 h-3 mr-1" /> Catat & Pesan
                      </button>
                    )}
                    {proc.status === 'Dipesan' && <button className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground" onClick={() => void handleReceive(proc)} disabled={isProcessing}><PackageCheck className="mr-1 h-3 w-3" />Terima Barang</button>}
                  </td>
                </tr>
              ))}
              {procurements.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Belum ada pengajuan pengadaan barang
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-lg border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Buat Pengajuan Pengadaan Barang</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit Pemohon</label>
                  <select value={formData.unit_id} onChange={e => setFormData({...formData, unit_id: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Pilih Unit (Opsional)</option>
                    {units?.data?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pemohon (Pegawai)</label>
                  <select required value={formData.requester_id} onChange={e => setFormData({...formData, requester_id: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Pilih Pegawai</option>
                    {employees?.data?.map((e: any) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="space-y-2"><label className="text-sm font-medium">Prioritas</label><select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="low">Rendah</option><option value="normal">Normal</option><option value="high">Tinggi</option><option value="urgent">Darurat</option></select></div><div className="space-y-2"><label className="text-sm font-medium">Dibutuhkan sebelum</label><input type="date" value={formData.needed_by} onChange={e => setFormData({...formData, needed_by: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" /></div><div className="space-y-2"><label className="text-sm font-medium">Sumber anggaran</label><input value={formData.budget_source} onChange={e => setFormData({...formData, budget_source: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="RKAS / Yayasan" /></div></div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Barang</label>
                <input required value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Proyektor Epson..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jumlah (Qty)</label>
                  <input required type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estimasi Harga Total (Rp)</label>
                  <input required type="number" value={formData.estimated_price} onChange={e => setFormData({...formData, estimated_price: Number(e.target.value)})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="0" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tujuan Pengadaan / Urgensi</label>
                <input required value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Untuk presentasi di aula..." />
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md font-medium text-sm hover:bg-muted">Batal</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90">Ajukan Pembelian</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
