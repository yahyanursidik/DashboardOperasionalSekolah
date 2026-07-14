import React, { useMemo, useState } from "react";
import { useCreate, useDelete, useList, useOne } from "@refinedev/core";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, Database, FileQuestion, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Modal } from "../../../components/common/Modal";
import { getExamQuestionTarget } from "./cbt-utils";
import { toast } from "sonner";

export const CbtExamBanksManager: React.FC = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isHrd = location.pathname.startsWith("/hrd");
  const cbtRoot = isHrd ? "/hrd/cbt" : "/recruitment/cbt";
  const basePath = `${cbtRoot}/exams`;

  const { data: examData } = useOne({
    resource: "cbt_exams",
    id: examId as string,
    meta: { select: "*, recruitment_vacancies(title)" },
  });
  const exam = examData?.data;

  const { data: mappingsData, isLoading } = useList({
    resource: "cbt_exam_banks",
    filters: [{ field: "exam_id", operator: "eq", value: examId }],
    meta: { select: "*, cbt_banks(name, description)" },
    pagination: { pageSize: 100 },
  });

  const { data: allBanksData } = useList({
    resource: "cbt_banks",
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 100 },
  });

  const { data: questionsData } = useList({
    resource: "cbt_questions",
    meta: { select: "id, bank_id" },
    pagination: { pageSize: 1000 },
  });

  const { mutate: createMapping } = useCreate();
  const { mutate: deleteMapping } = useDelete();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    bank_id: "",
    question_count: 10,
  });

  const mappings = mappingsData?.data ?? [];
  const questionCountByBank = useMemo(() => {
    const map = new Map<string, number>();
    (questionsData?.data ?? []).forEach((question: any) => {
      map.set(question.bank_id, (map.get(question.bank_id) ?? 0) + 1);
    });
    return map;
  }, [questionsData?.data]);

  const mappedBankIds = mappings.map((mapping: any) => mapping.bank_id);
  const availableBanks = (allBanksData?.data ?? []).filter((bank: any) => !mappedBankIds.includes(bank.id));
  const questionTarget = getExamQuestionTarget(mappings);
  const availableQuestionTotal = mappings.reduce((total: number, mapping: any) => total + (questionCountByBank.get(mapping.bank_id) ?? 0), 0);
  const overTargetMappings = mappings.filter((mapping: any) => (Number(mapping.question_count) || 0) > (questionCountByBank.get(mapping.bank_id) ?? 0));

  const checklist = [
    { label: "Minimal satu bank soal terhubung", done: mappings.length > 0 },
    { label: "Target jumlah soal lebih dari nol", done: questionTarget > 0 },
    { label: "Stok soal cukup untuk target", done: overTargetMappings.length === 0 && mappings.length > 0 },
    { label: "Ujian bisa ditautkan ke kandidat dari menu hasil ujian", done: mappings.length > 0 && questionTarget > 0 },
  ];

  const handleSave = () => {
    if (!formData.bank_id) return toast.error("Pilih bank soal terlebih dahulu");
    if (formData.question_count < 1) return toast.error("Jumlah soal minimal 1");

    const availableQuestions = questionCountByBank.get(formData.bank_id) ?? 0;
    if (availableQuestions > 0 && formData.question_count > availableQuestions) {
      toast.error(`Bank soal ini hanya memiliki ${availableQuestions} soal`);
      return;
    }

    createMapping(
      {
        resource: "cbt_exam_banks",
        values: {
          exam_id: examId,
          bank_id: formData.bank_id,
          question_count: formData.question_count,
        },
      },
      {
        onSuccess: () => {
          toast.success("Bank soal berhasil ditambahkan ke ujian");
          setIsModalOpen(false);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Komposisi Soal: ${exam?.title || "Memuat..."}`}
        description="Tentukan bank soal dan jumlah soal yang akan muncul untuk ujian CBT rekrutmen."
        action={
          <button onClick={() => navigate(basePath)} className="flex items-center gap-2 border bg-card hover:bg-muted text-foreground px-4 py-2 rounded-md transition-colors shadow-sm font-medium text-sm">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: "Bank Terhubung", value: mappings.length, icon: Database, tone: "text-blue-700 bg-blue-100" },
          { label: "Target Soal", value: questionTarget, icon: FileQuestion, tone: "text-purple-700 bg-purple-100" },
          { label: "Stok Soal", value: availableQuestionTotal, icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-100" },
          { label: "Perlu Koreksi", value: overTargetMappings.length, icon: AlertTriangle, tone: "text-amber-700 bg-amber-100" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-card border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setFormData({ bank_id: "", question_count: 10 });
                setIsModalOpen(true);
              }}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm w-fit text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Tambahkan Bank Soal
            </button>
            <Link to={`${cbtRoot}/banks`} className="border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted">
              Kelola Bank Soal
            </Link>
            <Link to={`${cbtRoot}/results`} className="border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted">
              Daftarkan Peserta
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : mappings.length === 0 ? (
            <div className="text-center p-12 bg-card border rounded-lg border-dashed">
              <p className="font-medium">Belum ada bank soal terhubung</p>
              <p className="text-sm text-muted-foreground mt-1">Tambahkan bank soal agar ujian bisa dipakai peserta.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mappings.map((mapping: any) => {
                const availableQuestions = questionCountByBank.get(mapping.bank_id) ?? 0;
                const overTarget = (Number(mapping.question_count) || 0) > availableQuestions;

                return (
                  <div key={mapping.id} className="bg-card border rounded-lg p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-indigo-700">
                          <Database className="w-4 h-4" />
                          <h4 className="font-semibold">{mapping.cbt_banks?.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{mapping.cbt_banks?.description || "Tidak ada deskripsi bank soal."}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-muted/50 rounded-md p-2">
                            <p className="text-muted-foreground">Target</p>
                            <p className="font-semibold text-foreground">{mapping.question_count} soal</p>
                          </div>
                          <div className="bg-muted/50 rounded-md p-2">
                            <p className="text-muted-foreground">Stok</p>
                            <p className={`font-semibold ${overTarget ? "text-red-700" : "text-foreground"}`}>{availableQuestions} soal</p>
                          </div>
                        </div>
                        {overTarget && <p className="text-xs text-red-700 font-medium">Target soal melebihi jumlah soal tersedia.</p>}
                      </div>
                      <button
                        onClick={() => {
                          if (confirm("Hapus bank soal dari ujian ini?")) deleteMapping({ resource: "cbt_exam_banks", id: mapping.id });
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4 h-fit">
          <div>
            <p className="text-sm font-semibold">Definition of Done</p>
            <p className="text-xs text-muted-foreground">Ujian siap dipakai jika komposisi soal cukup.</p>
          </div>
          <div className="space-y-3">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className={`w-4 h-4 mt-0.5 ${item.done ? "text-green-600" : "text-muted-foreground"}`} />
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Bank Soal ke Ujian">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pilih Bank Soal</label>
            <select
              value={formData.bank_id}
              onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            >
              <option value="">-- Pilih Bank Soal --</option>
              {availableBanks.map((bank: any) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name} ({questionCountByBank.get(bank.id) ?? 0} soal)
                </option>
              ))}
            </select>
            {availableBanks.length === 0 && <p className="text-xs text-muted-foreground">Semua bank soal sudah terhubung atau belum ada bank soal tersedia.</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Jumlah Soal yang Ditampilkan</label>
            <input
              type="number"
              min="1"
              value={formData.question_count}
              onChange={(e) => setFormData({ ...formData, question_count: parseInt(e.target.value) || 0 })}
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            />
            <p className="text-xs text-muted-foreground">Sistem mengambil sejumlah soal ini dari bank soal yang dipilih saat peserta memulai ujian.</p>
          </div>

          <button onClick={handleSave} disabled={!formData.bank_id || formData.question_count < 1} className="w-full bg-primary text-primary-foreground py-2.5 rounded-md hover:bg-primary/90 font-medium disabled:opacity-50 mt-4">
            Tambahkan
          </button>
        </div>
      </Modal>
    </div>
  );
};
