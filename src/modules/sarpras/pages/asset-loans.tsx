/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useTable, useList, useCreate } from "@refinedev/core";
import { Plus, Check, X, RotateCcw, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { SarprasSectionNav } from "../components/SarprasSectionNav";

export const AssetLoansList: React.FC<{ isTabMode?: boolean }> = ({ isTabMode }) => {
  const { activeUnitId } = useCurrentUnit();
  const { tableQueryResult } = useTable({
    resource: "asset_loans",
    filters: { permanent: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [] },
    pagination: { current: 1, pageSize: 15 },
    meta: { select: "*, assets(name, code, unit_id), employees!borrower_id(full_name)" },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  const loans = tableQueryResult?.data?.data || [];
  const { mutate: createLoan } = useCreate();

  const assetFilters: any[] = [{ field: "status", operator: "eq", value: "Tersedia" }];
  if (activeUnitId) assetFilters.push({ field: "unit_id", operator: "eq", value: activeUnitId });
  const { data: assets } = useList({ resource: "assets", filters: assetFilters });
  const { data: employees } = useList({ resource: "employees" });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [returnLoan, setReturnLoan] = useState<any>(null);
  const [returnCondition, setReturnCondition] = useState("Baik");
  const [returnNotes, setReturnNotes] = useState("");
  const [formData, setFormData] = useState({
    asset_id: "", borrower_id: "", start_date: "", end_date: "", purpose: ""
  });

  const handleStatusChange = async (loanId: string, newStatus: string) => {
    const { error } = await supabaseClient.rpc("sarpras_set_loan_status", { target_loan_id: loanId, target_status: newStatus, return_condition: newStatus === "Dikembalikan" ? returnCondition : null, return_note: newStatus === "Dikembalikan" ? returnNotes : null });
    if (error) return toast.error("Status peminjaman gagal diperbarui", { description: error.message });
    toast.success(newStatus === "Dikembalikan" ? "Aset telah dikembalikan dan kondisinya tercatat." : `Peminjaman ${newStatus.toLowerCase()}.`);
    setReturnLoan(null); setReturnNotes(""); setReturnCondition("Baik"); tableQueryResult.refetch();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenAsset: any = assets?.data?.find((asset: any) => asset.id === formData.asset_id);
    if (new Date(formData.end_date) <= new Date(formData.start_date)) return toast.error("Waktu selesai harus setelah waktu mulai.");
    await createLoan({ resource: "asset_loans", values: { ...formData, unit_id: chosenAsset?.unit_id || activeUnitId || null } }, {
      onSuccess: () => {
        setIsModalOpen(false);
        tableQueryResult.refetch();
        toast.success("Pengajuan peminjaman tersimpan.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {!isTabMode && (
        <>
          <PageHeader title="Peminjaman Aset" description="Kelola permohonan, persetujuan, batas waktu, pengembalian, dan kondisi aset secara terkendali." action={<button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
            <Plus className="w-5 h-5" /> Ajukan Pinjaman
          </button>} />
          <SarprasSectionNav />
        </>
      )}

      {isTabMode && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg font-semibold text-sm active:scale-95">
            <Plus className="w-5 h-5" /> Ajukan Pinjaman
          </button>
        </div>
      )}

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4">Aset/Barang</th>
                <th className="px-6 py-4">Peminjam</th>
                <th className="px-6 py-4">Waktu Pinjam</th>
                <th className="px-6 py-4">Tujuan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loans.map((loan) => (
                <tr key={loan.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{loan.assets?.name}</div>
                    <div className="text-xs text-muted-foreground">{loan.assets?.code}</div>
                  </td>
                  <td className="px-6 py-4 font-medium">{loan.employees?.full_name}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{new Date(loan.start_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-xs text-muted-foreground">s/d {new Date(loan.end_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-6 py-4">{loan.purpose}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      loan.status === 'Disetujui' ? 'bg-blue-100 text-blue-700' :
                      loan.status === 'Dikembalikan' ? 'bg-emerald-100 text-emerald-700' :
                      loan.status === 'Ditolak' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {loan.status === 'Menunggu' && (
                      <>
                        <button className="px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-md inline-flex items-center" onClick={() => handleStatusChange(loan.id as string, 'Disetujui')}>
                          <Check className="w-3 h-3 mr-1" /> Setuju
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 rounded-md inline-flex items-center" onClick={() => handleStatusChange(loan.id as string, 'Ditolak')}>
                          <X className="w-3 h-3 mr-1" /> Tolak
                        </button>
                      </>
                    )}
                    {loan.status === 'Disetujui' && (
                      <button className="px-3 py-1.5 text-xs font-medium text-purple-700 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-md inline-flex items-center" onClick={() => setReturnLoan(loan)}>
                        <RotateCcw className="w-3 h-3 mr-1" /> Kembalikan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Belum ada riwayat peminjaman
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
              <h2 className="text-lg font-bold">Ajukan Peminjaman Aset</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Aset/Barang</label>
                <select required value={formData.asset_id} onChange={e => setFormData({...formData, asset_id: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Pilih Aset (Tersedia)</option>
                  {assets?.data?.map((a: any) => <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Peminjam</label>
                <select required value={formData.borrower_id} onChange={e => setFormData({...formData, borrower_id: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Pilih Pegawai/Guru</option>
                  {employees?.data?.map((e: any) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Waktu Mulai</label>
                  <input required type="datetime-local" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Waktu Selesai</label>
                  <input required type="datetime-local" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tujuan / Keperluan</label>
                <input required value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Kegiatan Osis" />
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md font-medium text-sm hover:bg-muted">Batal</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90">Ajukan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {returnLoan && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Konfirmasi Pengembalian</h2><p className="text-xs text-muted-foreground">Catat kondisi aset saat diterima kembali.</p></div><button onClick={() => setReturnLoan(null)} className="rounded-md p-2 hover:bg-muted"><XIcon className="h-4 w-4" /></button></div><div className="space-y-4"><label className="block text-sm font-semibold">Kondisi saat kembali<select value={returnCondition} onChange={(event) => setReturnCondition(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-background px-3"><option>Baik</option><option>Rusak Ringan</option><option>Rusak Berat</option></select></label><label className="block text-sm font-semibold">Catatan pengembalian<textarea rows={3} value={returnNotes} onChange={(event) => setReturnNotes(event.target.value)} className="mt-1.5 w-full rounded-md border bg-background p-3" placeholder="Kelengkapan, kerusakan, atau tindak lanjut" /></label><div className="flex justify-end gap-2 border-t pt-4"><button onClick={() => setReturnLoan(null)} className="rounded-md border px-4 py-2 text-sm font-bold">Batal</button><button onClick={() => void handleStatusChange(returnLoan.id, "Dikembalikan")} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Terima Pengembalian</button></div></div></div></div>}
    </div>
  );
};
