import React, { useState } from "react";
import { useList, useCreate, useDelete, useOne } from "@refinedev/core";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Database } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Modal } from "../../../components/common/Modal";

export const CbtExamBanksManager: React.FC = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/hrd") ? "/hrd/cbt/exams" : "/recruitment/cbt/exams";

  const { data: examData } = useOne({ resource: "cbt_exams", id: examId as string });
  const exam = examData?.data;

  const { data: mappingsData, isLoading } = useList({
    resource: "cbt_exam_banks",
    filters: [{ field: "exam_id", operator: "eq", value: examId }],
    meta: { select: "*, cbt_banks(name, description)" }
  });

  const { data: allBanksData } = useList({ resource: "cbt_banks" });

  const { mutate: createMapping } = useCreate();
  const { mutate: deleteMapping } = useDelete();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    bank_id: "",
    question_count: 10
  });

  const handleSave = () => {
    if (!formData.bank_id || formData.question_count < 1) return;
    
    createMapping({
      resource: "cbt_exam_banks",
      values: {
        exam_id: examId,
        bank_id: formData.bank_id,
        question_count: formData.question_count
      }
    }, { onSuccess: () => setIsModalOpen(false) });
  };

  // Filter out banks that are already mapped
  const mappedBankIds = mappingsData?.data?.map(m => m.bank_id) || [];
  const availableBanks = allBanksData?.data?.filter(b => !mappedBankIds.includes(b.id)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(basePath)} className="p-2 hover:bg-muted rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader 
          title={`Seting Bank Soal: ${exam?.title || "Loading..."}`} 
          description="Pilih bank soal mana saja yang akan digunakan untuk ujian ini dan tentukan jumlah soal yang akan dimunculkan."
        />
      </div>

      <button
        onClick={() => {
          setFormData({ bank_id: "", question_count: 10 });
          setIsModalOpen(true);
        }}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm w-fit"
      >
        <Plus className="w-4 h-4" />
        Tambahkan Bank Soal ke Ujian
      </button>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mappingsData?.data.map((mapping: any) => (
            <div key={mapping.id} className="bg-card border rounded-xl p-5 flex items-start justify-between shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Database className="w-4 h-4" />
                  <h4 className="font-semibold">{mapping.cbt_banks?.name}</h4>
                </div>
                <p className="text-sm text-muted-foreground">Jumlah Soal Diambil: <strong className="text-foreground">{mapping.question_count} Soal</strong></p>
              </div>
              <button 
                onClick={() => { if(confirm("Hapus bank soal dari ujian ini?")) deleteMapping({ resource: "cbt_exam_banks", id: mapping.id }) }} 
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {mappingsData?.data.length === 0 && (
             <div className="col-span-full text-center p-12 bg-card border rounded-xl border-dashed">
               <p className="text-muted-foreground">Belum ada bank soal yang dihubungkan ke ujian ini.</p>
             </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Bank Soal ke Ujian">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pilih Bank Soal</label>
            <select
              value={formData.bank_id}
              onChange={e => setFormData({...formData, bank_id: e.target.value})}
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            >
              <option value="">-- Pilih Bank Soal --</option>
              {availableBanks.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Jumlah Soal yang Ditampilkan</label>
            <input 
              type="number" 
              min="1"
              value={formData.question_count}
              onChange={e => setFormData({...formData, question_count: parseInt(e.target.value) || 0})}
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            />
            <p className="text-xs text-muted-foreground">Sistem akan mengambil sejumlah soal ini (secara acak jika diatur acak) dari bank soal yang dipilih saat peserta memulai ujian.</p>
          </div>

          <button 
            onClick={handleSave} 
            disabled={!formData.bank_id || formData.question_count < 1}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-md hover:bg-primary/90 font-medium disabled:opacity-50 mt-4"
          >
            Tambahkan
          </button>
        </div>
      </Modal>
    </div>
  );
};
