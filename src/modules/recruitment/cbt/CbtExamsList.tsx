import React, { useState } from "react";
import { useTable, useDelete, useCreate, useUpdate, useList } from "@refinedev/core";
import { Plus, Trash2, Edit, FileText, Settings } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { EmptyState } from "../../../components/common/EmptyState";
import { Modal } from "../../../components/common/Modal";

export const CbtExamsList: React.FC = () => {
  const { tableQueryResult } = useTable({
    resource: "cbt_exams",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  const { data: vacanciesData } = useList({ resource: "recruitment_vacancies" });

  const { data, isLoading } = tableQueryResult;
  const { mutate: deleteExam } = useDelete();
  const { mutate: createExam } = useCreate();
  const { mutate: updateExam } = useUpdate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    title: "", 
    vacancy_id: "", 
    duration_minutes: 60, 
    passing_grade: 70, 
    randomize_questions: true 
  });

  const handleSave = () => {
    if (!formData.title) return;

    const payload = {
      title: formData.title,
      vacancy_id: formData.vacancy_id || null,
      duration_minutes: formData.duration_minutes,
      passing_grade: formData.passing_grade,
      randomize_questions: formData.randomize_questions,
    };

    if (editingId) {
      updateExam({ resource: "cbt_exams", id: editingId, values: payload }, { onSuccess: () => setIsModalOpen(false) });
    } else {
      createExam({ resource: "cbt_exams", values: payload }, { onSuccess: () => setIsModalOpen(false) });
    }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setFormData({ 
      title: record.title, 
      vacancy_id: record.vacancy_id || "",
      duration_minutes: record.duration_minutes,
      passing_grade: record.passing_grade,
      randomize_questions: record.randomize_questions
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Pengaturan Ujian (CBT)" 
          description="Atur jenis ujian, durasi, dan ambang kelulusan."
        />
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ title: "", vacancy_id: "", duration_minutes: 60, passing_grade: 70, randomize_questions: true });
            setIsModalOpen(true);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Buat Ujian Baru
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : data?.data.length === 0 ? (
        <EmptyState 
          icon={FileText}
          title="Belum ada Ujian"
          description="Silakan buat pengaturan ujian pertama Anda."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data.map((exam: any) => (
            <div key={exam.id} className="bg-card border rounded-xl p-5 flex flex-col gap-4 shadow-sm relative group overflow-hidden">
              <div className="flex-1 space-y-3 relative z-10">
                <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  {exam.title}
                </h3>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted p-2 rounded-md">
                    <span className="text-muted-foreground block text-xs">Durasi</span>
                    <span className="font-medium">{exam.duration_minutes} Menit</span>
                  </div>
                  <div className="bg-muted p-2 rounded-md">
                    <span className="text-muted-foreground block text-xs">Passing Grade</span>
                    <span className="font-medium">{exam.passing_grade}</span>
                  </div>
                  <div className="bg-muted p-2 rounded-md col-span-2 flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Acak Soal?</span>
                    <span className={`font-medium ${exam.randomize_questions ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {exam.randomize_questions ? 'Ya' : 'Tidak'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t relative z-10">
                <a href={`/recruitment/cbt/exams/${exam.id}/settings`} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                  <Settings className="w-4 h-4" /> Seting Bank Soal
                </a>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(exam)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { if(confirm("Hapus ujian ini?")) deleteExam({ resource: "cbt_exams", id: exam.id }) }} 
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Ujian" : "Buat Ujian Baru"}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Judul Ujian</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
              placeholder="Misal: Tes Pengetahuan Diniyah Guru PAI"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Lowongan Terkait (Opsional)</label>
            <select
              value={formData.vacancy_id}
              onChange={e => setFormData({...formData, vacancy_id: e.target.value})}
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            >
              <option value="">-- Tidak dikaitkan dengan lowongan --</option>
              {vacanciesData?.data.map((v: any) => (
                <option key={v.id} value={v.id}>{v.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Durasi (Menit)</label>
              <input 
                type="number" 
                min="1"
                value={formData.duration_minutes} 
                onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 0})} 
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ambang Kelulusan (1-100)</label>
              <input 
                type="number" 
                min="1"
                max="100"
                value={formData.passing_grade} 
                onChange={e => setFormData({...formData, passing_grade: parseInt(e.target.value) || 0})} 
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input 
              type="checkbox" 
              checked={formData.randomize_questions}
              onChange={e => setFormData({...formData, randomize_questions: e.target.checked})}
              className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary"
            />
            <span className="text-sm font-medium">Acak urutan soal saat ujian?</span>
          </label>

          <button 
            onClick={handleSave} 
            disabled={!formData.title}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-md hover:bg-primary/90 font-medium disabled:opacity-50 mt-4"
          >
            Simpan Pengaturan Ujian
          </button>
        </div>
      </Modal>
    </div>
  );
};
