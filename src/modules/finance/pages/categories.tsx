import React, { useState } from "react";
import { useList, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Tag, Plus, Edit, Trash2, Repeat, CheckCircle } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";

export const FinanceCategories: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "income",
    is_recurring: false,
    default_amount: 0,
    description: ""
  });

  const { data, isLoading } = useList({
    resource: "finance_categories",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
    sorters: [{ field: "type", order: "desc" }, { field: "created_at", order: "desc" }]
  });

  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();
  const { mutate: destroy } = useDelete();

  const handleOpenModal = (category?: any) => {
    if (category) {
      setEditId(category.id);
      setFormData({
        name: category.name,
        type: category.type,
        is_recurring: category.is_recurring,
        default_amount: category.default_amount,
        description: category.description || ""
      });
    } else {
      setEditId(null);
      setFormData({ name: "", type: "income", is_recurring: false, default_amount: 0, description: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      update({
        resource: "finance_categories",
        id: editId,
        values: formData
      }, { onSuccess: () => setIsModalOpen(false) });
    } else {
      create({
        resource: "finance_categories",
        values: { ...formData, unit_id: activeUnitId }
      }, { onSuccess: () => setIsModalOpen(false) });
    }
  };

  const incomes = data?.data?.filter(c => c.type === 'income') || [];
  const expenses = data?.data?.filter(c => c.type === 'expense') || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Kategori Keuangan" 
        description="Pengaturan master data pos-pos pemasukan (tagihan) dan pengeluaran operasional." 
        action={
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm">
            <Plus className="w-4 h-4" /> Kategori Baru
          </button>
        }
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat master data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* INCOMES */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center gap-2 text-emerald-800">
              <Tag className="w-5 h-5" />
              <h3 className="font-bold text-lg">Pos Pemasukan (Tagihan)</h3>
            </div>
            <div className="divide-y divide-border">
              {incomes.map(cat => (
                <div key={cat.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-center group">
                  <div>
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      {cat.name} 
                      {cat.is_recurring && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1"><Repeat className="w-3 h-3"/> Rutin</span>}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">Default: Rp {cat.default_amount.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(cat)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors bg-muted rounded-md"><Edit className="w-4 h-4"/></button>
                    <button onClick={() => { if(confirm('Hapus kategori?')) destroy({resource: "finance_categories", id: cat.id as string})}} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors bg-muted rounded-md"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
              {incomes.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">Belum ada data pemasukan</div>}
            </div>
          </div>

          {/* EXPENSES */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center gap-2 text-rose-800">
              <Tag className="w-5 h-5" />
              <h3 className="font-bold text-lg">Pos Pengeluaran</h3>
            </div>
            <div className="divide-y divide-border">
              {expenses.map(cat => (
                <div key={cat.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-center group">
                  <div>
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      {cat.name}
                      {cat.is_recurring && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1"><Repeat className="w-3 h-3"/> Rutin</span>}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">{cat.description || 'Tidak ada keterangan'}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(cat)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors bg-muted rounded-md"><Edit className="w-4 h-4"/></button>
                    <button onClick={() => { if(confirm('Hapus kategori?')) destroy({resource: "finance_categories", id: cat.id as string})}} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors bg-muted rounded-md"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">Belum ada data pengeluaran</div>}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-lg">{editId ? 'Edit Kategori' : 'Kategori Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Jenis Kategori</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="type" value="income" checked={formData.type === 'income'} onChange={e => setFormData({...formData, type: e.target.value})} className="text-primary focus:ring-primary h-4 w-4" />
                    Pemasukan (Tagihan)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="type" value="expense" checked={formData.type === 'expense'} onChange={e => setFormData({...formData, type: e.target.value})} className="text-primary focus:ring-primary h-4 w-4" />
                    Pengeluaran
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nama Kategori</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Misal: SPP, Listrik" />
              </div>

              {formData.type === 'income' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Nominal Default (Rp)</label>
                  <input type="number" min="0" value={formData.default_amount} onChange={e => setFormData({...formData, default_amount: Number(e.target.value)})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi Singkat</label>
                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer p-3 border rounded-md bg-muted/30">
                  <input type="checkbox" checked={formData.is_recurring} onChange={e => setFormData({...formData, is_recurring: e.target.checked})} className="rounded text-primary focus:ring-primary h-4 w-4" />
                  <div>
                    <p className="font-semibold text-foreground">Tagihan / Pengeluaran Rutin</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Centang jika ini berulang setiap bulan (seperti SPP atau Gaji).</p>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">Batal</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
