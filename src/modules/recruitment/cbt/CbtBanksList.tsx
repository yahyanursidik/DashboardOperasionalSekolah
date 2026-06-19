import React from "react";
import { useTable, useDelete, useCreate, useUpdate } from "@refinedev/core";
import { Plus, Trash2, Edit, BookOpen } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { EmptyState } from "../../../components/common/EmptyState";
import { Modal } from "../../../components/common/Modal";

export const CbtBanksList: React.FC = () => {
  const { tableQueryResult } = useTable({
    resource: "cbt_banks",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  const { data, isLoading } = tableQueryResult;
  const { mutate: deleteBank } = useDelete();
  const { mutate: createBank } = useCreate();
  const { mutate: updateBank } = useUpdate();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({ name: "", description: "" });

  const handleSave = () => {
    if (!formData.name) return;

    if (editingId) {
      updateBank({
        resource: "cbt_banks",
        id: editingId,
        values: formData,
      }, { onSuccess: () => setIsModalOpen(false) });
    } else {
      createBank({
        resource: "cbt_banks",
        values: formData,
      }, { onSuccess: () => setIsModalOpen(false) });
    }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setFormData({ name: record.name, description: record.description || "" });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Bank Soal (CBT)" 
          description="Kelola kategori dan kumpulan soal untuk ujian rekrutmen."
        />
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", description: "" });
            setIsModalOpen(true);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Bank Soal
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : data?.data.length === 0 ? (
        <EmptyState 
          icon={BookOpen}
          title="Belum ada Bank Soal"
          description="Silakan tambahkan bank soal pertama Anda."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data.map((bank: any) => (
            <div key={bank.id} className="bg-card border rounded-xl p-5 flex flex-col gap-4 shadow-sm relative group overflow-hidden">
              <div className="flex-1 space-y-1 relative z-10">
                <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  {bank.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{bank.description || "Tidak ada deskripsi"}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t relative z-10">
                <a href={`/recruitment/cbt/banks/${bank.id}/questions`} className="text-sm text-primary font-medium hover:underline">
                  Kelola Soal &rarr;
                </a>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(bank)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { if(confirm("Hapus bank soal ini beserta semua soal di dalamnya?")) deleteBank({ resource: "cbt_banks", id: bank.id }) }} 
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Bank Soal" : "Tambah Bank Soal Baru"}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Bank / Kategori</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
              placeholder="Misal: Diniyah - Tauhid"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Deskripsi (Opsional)</label>
            <textarea 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background min-h-[80px]"
              placeholder="Deskripsi singkat mengenai soal-soal ini..."
            />
          </div>
          <button 
            onClick={handleSave} 
            disabled={!formData.name}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-md hover:bg-primary/90 font-medium disabled:opacity-50"
          >
            Simpan Bank Soal
          </button>
        </div>
      </Modal>
    </div>
  );
};
