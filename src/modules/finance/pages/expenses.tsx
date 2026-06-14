import React, { useState } from "react";
import { useList, useDelete, useCreate } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { CreditCard, Plus, Trash2, Calendar, FileText, CheckCircle } from "lucide-react";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const SchoolExpenses: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId } = useAcademicYear();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    amount: 0,
    category_id: "",
    description: "",
    expense_date: new Date().toISOString().split('T')[0]
  });

  const { data: categories } = useList({
    resource: "finance_categories",
    filters: [
      { field: "type", operator: "eq", value: "expense" }, 
      ...(activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId } as any] : [])
    ],
    pagination: { mode: "off" }
  });

  const { data, isLoading } = useList({
    resource: "school_expenses",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : [],
    meta: { select: "*, finance_categories(name), employees(full_name)" },
    sorters: [{ field: "expense_date", order: "desc" }]
  });

  const { mutate: destroy } = useDelete();
  const { mutate: create } = useCreate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create({
      resource: "school_expenses",
      values: { ...formData, unit_id: activeUnitId, academic_year_id: activeYearId }
    }, { onSuccess: () => {
      setIsModalOpen(false);
      setFormData({ title: "", amount: 0, category_id: "", description: "", expense_date: new Date().toISOString().split('T')[0] });
    }});
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Buku Kas (Pengeluaran)" 
        description="Catat pengeluaran operasional sekolah harian/bulanan." 
        action={
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-md hover:bg-rose-700 transition-colors shadow-sm font-medium text-sm">
            <Plus className="w-4 h-4" /> Catat Pengeluaran
          </button>
        }
      />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
           <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data pengeluaran...</div>
        ) : (!data?.data || data.data.length === 0) ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <CreditCard className="w-12 h-12 mb-4 opacity-20" />
            <p>Belum ada catatan pengeluaran.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold border-b">
                <tr>
                  <th className="px-4 py-4">Tanggal</th>
                  <th className="px-4 py-4">Keterangan / Judul</th>
                  <th className="px-4 py-4">Kategori</th>
                  <th className="px-4 py-4 text-right">Nominal (Rp)</th>
                  <th className="px-4 py-4">Dicatat Oleh</th>
                  <th className="px-4 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {data.data.map(exp => (
                  <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(exp.expense_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground font-bold">{exp.title}</div>
                      {exp.description && <div className="text-xs text-muted-foreground mt-0.5">{exp.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        {exp.finance_categories?.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600 font-bold">
                      {(Number(exp.amount)).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {exp.employees?.full_name || 'Admin'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        {exp.proof_image_url && (
                          <button className="p-1.5 text-muted-foreground hover:text-indigo-600 transition-colors bg-muted rounded-md" title="Lihat Nota">
                            <FileText className="w-4 h-4"/>
                          </button>
                        )}
                        <button 
                          onClick={() => { if(confirm('Hapus catatan pengeluaran ini?')) destroy({ resource: "school_expenses", id: exp.id as string }) }}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors bg-muted rounded-md" 
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-rose-50 text-rose-800">
              <h3 className="font-bold text-lg flex items-center gap-2"><CreditCard className="w-5 h-5"/> Catat Pengeluaran</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-rose-800/60 hover:text-rose-800">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Judul / Keterangan Singkat</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" placeholder="Contoh: Beli Spidol, Bayar Listrik Bulan Ini" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kategori Pengeluaran</label>
                <select required value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-background">
                  <option value="" disabled>Pilih Kategori...</option>
                  {categories?.data?.map(cat => (
                    <option key={cat.id} value={cat.id as string}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nominal (Rp)</label>
                <input required type="number" min="0" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-bold text-rose-600" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tanggal Keluar</label>
                <input required type="date" value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Catatan Tambahan (Opsional)</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" rows={2} placeholder="Detail keterangan..."></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">Batal</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-md text-sm font-medium hover:bg-rose-700 transition-colors flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Simpan Pengeluaran</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
