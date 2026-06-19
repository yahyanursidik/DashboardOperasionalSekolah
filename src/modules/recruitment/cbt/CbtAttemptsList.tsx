import React, { useState } from "react";
import { useTable, useDelete, useList, useCreate } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Trash2, User, Clock, CheckCircle2, XCircle, Plus, Eye } from "lucide-react";
import { Modal } from "../../../components/common/Modal";

export const CbtAttemptsList: React.FC = () => {
  const { tableQueryResult } = useTable({
    resource: "cbt_participants",
    meta: {
      select: "*, recruitment_applicants(full_name, email), cbt_exams(title, passing_grade)"
    },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  const { data, isLoading } = tableQueryResult;
  const { mutate: deleteParticipant } = useDelete();
  const { mutate: createParticipant } = useCreate();

  const { data: applicantsData } = useList({ resource: "recruitment_applicants" });
  const { data: examsData } = useList({ resource: "cbt_exams" });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    applicant_id: "",
    exam_id: ""
  });

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleEnroll = () => {
    if (!formData.applicant_id || !formData.exam_id) return;

    createParticipant({
      resource: "cbt_participants",
      values: {
        applicant_id: formData.applicant_id,
        exam_id: formData.exam_id,
        token: generateToken(),
        status: "pending"
      }
    }, {
      onSuccess: () => {
        setIsModalOpen(false);
        setFormData({ applicant_id: "", exam_id: "" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Hasil Ujian Pelamar (CBT)" 
          description="Pantau sesi ujian, generate token, dan lihat hasil kelulusan pelamar."
        />
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Daftarkan Peserta & Generate Token
        </button>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Pelamar</th>
                <th className="px-6 py-4 font-semibold">Ujian</th>
                <th className="px-6 py-4 font-semibold">Token</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Nilai Akhir</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Memuat data hasil ujian...</td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Belum ada sesi ujian yang terdaftar.</td>
                </tr>
              ) : (
                data?.data.map((participant: any) => (
                  <tr key={participant.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium">{participant.recruitment_applicants?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{participant.recruitment_applicants?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {participant.cbt_exams?.title}
                    </td>
                    <td className="px-6 py-4">
                      <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{participant.token}</code>
                    </td>
                    <td className="px-6 py-4">
                      {participant.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><Clock className="w-3.5 h-3.5" /> Menunggu</span>}
                      {participant.status === 'in_progress' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Clock className="w-3.5 h-3.5" /> Sedang Mengerjakan</span>}
                      {participant.status === 'completed' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Selesai</span>}
                    </td>
                    <td className="px-6 py-4">
                      {participant.status === 'completed' ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-lg">{participant.score}</span>
                          {participant.is_passed ? (
                            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Lulus</span>
                          ) : (
                            <span className="text-xs font-medium text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" /> Tidak Lulus</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <a href={`/recruitment/cbt/results/${participant.id}`} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors inline-block" title="Lihat Detail Jawaban">
                          <Eye className="w-4 h-4" />
                        </a>
                        <button 
                          onClick={() => { if(confirm("Hapus sesi ujian ini?")) deleteParticipant({ resource: "cbt_participants", id: participant.id }) }} 
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors inline-block" title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Daftarkan Peserta Ujian">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pilih Pelamar</label>
            <select
              value={formData.applicant_id}
              onChange={e => setFormData({...formData, applicant_id: e.target.value})}
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            >
              <option value="">-- Pilih Pelamar --</option>
              {applicantsData?.data.map((a: any) => (
                <option key={a.id} value={a.id}>{a.full_name} ({a.email})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Pilih Ujian (CBT)</label>
            <select
              value={formData.exam_id}
              onChange={e => setFormData({...formData, exam_id: e.target.value})}
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            >
              <option value="">-- Pilih Ujian --</option>
              {examsData?.data.map((e: any) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-md text-sm border border-emerald-100 flex items-start gap-2 mt-4">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <p>Sistem akan secara otomatis <strong>membuatkan Token unik</strong> untuk pelamar ini setelah Anda menekan tombol simpan.</p>
          </div>

          <button 
            onClick={handleEnroll} 
            disabled={!formData.applicant_id || !formData.exam_id}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-md hover:bg-primary/90 font-medium disabled:opacity-50 mt-4"
          >
            Daftarkan & Generate Token
          </button>
        </div>
      </Modal>
    </div>
  );
};
