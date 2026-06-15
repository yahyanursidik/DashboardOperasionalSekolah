import React, { useState } from "react";
import { useTable, useCreate, useUpdate } from "@refinedev/core";
import { Plus, Edit as EditIcon, Trash2, Package, X } from "lucide-react";

export const AssetsList: React.FC = () => {
  const { tableQueryResult } = useTable({
    resource: "assets",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  const assets = tableQueryResult?.data?.data || [];
  const { mutate: createAsset } = useCreate();
  const { mutate: updateAsset } = useUpdate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    code: "", name: "", category: "", condition: "Baik", location: "", purchase_price: 0, status: "Tersedia", notes: ""
  });

  const CATEGORIES = ['Elektronik', 'Furnitur', 'Kendaraan', 'Ruangan', 'Lainnya'];
  const CONDITIONS = ['Baik', 'Rusak Ringan', 'Rusak Berat'];
  const STATUSES = ['Tersedia', 'Dipinjam', 'Diperbaiki', 'Dihapus'];

  const handleOpenCreate = () => {
    setFormData({ code: "", name: "", category: "", condition: "Baik", location: "", purchase_price: 0, status: "Tersedia", notes: "" });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (asset: any) => {
    setCurrentAsset(asset);
    setFormData({
      code: asset.code, name: asset.name, category: asset.category, 
      condition: asset.condition, location: asset.location || "", 
      purchase_price: asset.purchase_price, status: asset.status, notes: asset.notes || ""
    });
    setIsEditOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreateOpen) {
      await createAsset({ resource: "assets", values: formData }, {
        onSuccess: () => { setIsCreateOpen(false); tableQueryResult.refetch(); }
      });
    } else if (isEditOpen && currentAsset) {
      await updateAsset({ resource: "assets", id: currentAsset.id, values: formData }, {
        onSuccess: () => { setIsEditOpen(false); tableQueryResult.refetch(); }
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6" /> Katalog Aset & Inventaris
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola data inventaris fisik sekolah secara digital</p>
        </div>
        <button onClick={handleOpenCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm">
          <Plus className="w-4 h-4" /> Tambah Aset
        </button>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4">Kode Aset</th>
                <th className="px-6 py-4">Nama Barang</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Kondisi</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Lokasi</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium">{asset.code}</td>
                  <td className="px-6 py-4 font-medium">{asset.name}</td>
                  <td className="px-6 py-4">{asset.category}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      asset.condition === 'Baik' ? 'bg-emerald-100 text-emerald-700' :
                      asset.condition === 'Rusak Ringan' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {asset.condition}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      asset.status === 'Tersedia' ? 'bg-blue-100 text-blue-700' :
                      asset.status === 'Dipinjam' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{asset.location || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" onClick={() => handleOpenEdit(asset)}>
                      <EditIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Belum ada data aset
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {(isCreateOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-lg border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">{isCreateOpen ? "Tambah Data Aset" : "Edit Data Aset"}</h2>
              <button onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="p-2 hover:bg-muted rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kode Aset</label>
                  <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Mis: KOMP-LAB-01" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Aset</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="PC Lenovo Core i5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kategori</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Pilih Kategori</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kondisi</label>
                  <select required value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lokasi Ruangan</label>
                  <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Lab Komputer 1" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Harga Beli (Rp)</label>
                  <input type="number" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: Number(e.target.value)})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>

              {isEditOpen && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status Ketersediaan</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Keterangan Tambahan</label>
                <input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Opsional" />
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="px-4 py-2 border rounded-md font-medium text-sm hover:bg-muted">Batal</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
