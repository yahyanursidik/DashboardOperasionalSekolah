import React, { useState } from "react";
import { useTable, useList, useUpdate, useCreate } from "@refinedev/core";
import { Plus, Check, X, RotateCcw, Truck, X as XIcon } from "lucide-react";

export const AssetLoansList: React.FC<{ isTabMode?: boolean }> = ({ isTabMode }) => {
  const { tableQueryResult } = useTable({
    resource: "asset_loans",
    meta: { select: "*, assets(name, code), employees!borrower_id(full_name)" },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  const loans = tableQueryResult?.data?.data || [];
  const { mutate: updateLoan } = useUpdate();
  const { mutate: updateAsset } = useUpdate();
  const { mutate: createLoan } = useCreate();

  const { data: assets } = useList({ resource: "assets", filters: [{ field: "status", operator: "eq", value: "Tersedia" }] });
  const { data: employees } = useList({ resource: "employees" });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    asset_id: "", borrower_id: "", start_date: "", end_date: "", purpose: ""
  });

  const handleStatusChange = async (loanId: string, assetId: string, newStatus: string) => {
    await updateLoan({
      resource: "asset_loans",
      id: loanId,
      values: { status: newStatus },
    });

    if (newStatus === "Disetujui") {
      await updateAsset({ resource: "assets", id: assetId, values: { status: "Dipinjam" } });
    } else if (newStatus === "Dikembalikan" || newStatus === "Ditolak") {
      await updateAsset({ resource: "assets", id: assetId, values: { status: "Tersedia" } });
    }
    
    tableQueryResult.refetch();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLoan({ resource: "asset_loans", values: formData }, {
      onSuccess: () => {
        setIsModalOpen(false);
        tableQueryResult.refetch();
      }
    });
  };

  return (
    <div className={isTabMode ? "space-y-6" : "p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500"}>
      {!isTabMode && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-6 h-6" /> Peminjaman Ruangan & Barang
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Kelola permohonan peminjaman inventaris sekolah</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg font-semibold text-sm active:scale-95">
            <Plus className="w-5 h-5" /> Ajukan Pinjaman
          </button>
        </div>
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
                        <button className="px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-md inline-flex items-center" onClick={() => handleStatusChange(loan.id as string, loan.asset_id, 'Disetujui')}>
                          <Check className="w-3 h-3 mr-1" /> Setuju
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 rounded-md inline-flex items-center" onClick={() => handleStatusChange(loan.id as string, loan.asset_id, 'Ditolak')}>
                          <X className="w-3 h-3 mr-1" /> Tolak
                        </button>
                      </>
                    )}
                    {loan.status === 'Disetujui' && (
                      <button className="px-3 py-1.5 text-xs font-medium text-purple-700 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-md inline-flex items-center" onClick={() => handleStatusChange(loan.id as string, loan.asset_id, 'Dikembalikan')}>
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
    </div>
  );
};
