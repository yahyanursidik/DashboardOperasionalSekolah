import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCreate, useDelete, useList, useUpdate } from "@refinedev/core";
import { AlertTriangle, BarChart3, BookOpen, CheckCircle2, Edit, FileText, Filter, Plus, Search, Settings, Trash2, Users } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { EmptyState } from "../../../components/common/EmptyState";
import { Modal } from "../../../components/common/Modal";
import { formatPosition } from "../recruitment-utils";
import { getExamQuestionTarget, getExamReadiness, getParticipantStats, validateExamConfig } from "./cbt-utils";
import { toast } from "sonner";

export const CbtExamsList: React.FC = () => {
  const location = useLocation();
  const isHrd = location.pathname.startsWith("/hrd");
  const cbtRoot = isHrd ? "/hrd/cbt" : "/recruitment/cbt";
  const basePath = `${cbtRoot}/exams`;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVacancy, setFilterVacancy] = useState("");
  const [filterReadiness, setFilterReadiness] = useState("");

  const { data: examsData, isLoading } = useList({
    resource: "cbt_exams",
    meta: {
      select: "*, recruitment_vacancies(title, position, status), cbt_exam_banks(id, question_count, cbt_banks(name))",
    },
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 100 },
  });

  const { data: vacanciesData } = useList({
    resource: "recruitment_vacancies",
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 100 },
  });

  const { data: participantsData } = useList({
    resource: "cbt_participants",
    meta: { select: "id, exam_id, status, score, is_passed" },
    pagination: { pageSize: 500 },
  });

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
    randomize_questions: true,
  });

  const exams = examsData?.data ?? [];
  const participantsByExamId = useMemo(() => {
    const map = new Map<string, any[]>();
    (participantsData?.data ?? []).forEach((participant: any) => {
      const current = map.get(participant.exam_id) ?? [];
      current.push(participant);
      map.set(participant.exam_id, current);
    });
    return map;
  }, [participantsData?.data]);

  const metrics = useMemo(() => {
    const withBank = exams.filter((exam: any) => (exam.cbt_exam_banks ?? []).length > 0);
    const participants = participantsData?.data ?? [];
    return {
      total: exams.length,
      withBank: withBank.length,
      withoutBank: exams.length - withBank.length,
      linkedVacancy: exams.filter((exam: any) => !!exam.vacancy_id).length,
      completed: participants.filter((participant: any) => participant.status === "completed").length,
      passed: participants.filter((participant: any) => participant.is_passed === true).length,
    };
  }, [exams, participantsData?.data]);

  const filteredExams = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return exams.filter((exam: any) => {
      const participants = participantsByExamId.get(exam.id) ?? [];
      const readiness = getExamReadiness(exam, participants);
      const matchSearch =
        !keyword ||
        [exam.title, exam.recruitment_vacancies?.title, exam.recruitment_vacancies?.position]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      const matchVacancy = filterVacancy ? exam.vacancy_id === filterVacancy : true;
      const matchReadiness = filterReadiness ? readiness.label === filterReadiness : true;
      return matchSearch && matchVacancy && matchReadiness;
    });
  }, [exams, filterReadiness, filterVacancy, participantsByExamId, searchTerm]);

  const openModalForCreate = () => {
    setEditingId(null);
    setFormData({ title: "", vacancy_id: "", duration_minutes: 60, passing_grade: 70, randomize_questions: true });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const validationMessage = validateExamConfig(formData);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const payload = {
      title: formData.title.trim(),
      vacancy_id: formData.vacancy_id || null,
      duration_minutes: formData.duration_minutes,
      passing_grade: formData.passing_grade,
      randomize_questions: formData.randomize_questions,
    };

    if (editingId) {
      updateExam(
        { resource: "cbt_exams", id: editingId, values: payload },
        {
          onSuccess: () => {
            toast.success("Pengaturan ujian berhasil diperbarui");
            setIsModalOpen(false);
          },
        }
      );
    } else {
      createExam(
        { resource: "cbt_exams", values: payload },
        {
          onSuccess: () => {
            toast.success("Ujian CBT berhasil dibuat");
            setIsModalOpen(false);
          },
        }
      );
    }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setFormData({
      title: record.title || "",
      vacancy_id: record.vacancy_id || "",
      duration_minutes: record.duration_minutes || 60,
      passing_grade: record.passing_grade || 70,
      randomize_questions: record.randomize_questions ?? true,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CBT Rekrutmen - Pengaturan Ujian"
        description="Atur ujian online pelamar, komposisi bank soal, ambang kelulusan, dan pantau kesiapan seleksi."
        action={
          <button onClick={openModalForCreate} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium">
            <Plus className="w-4 h-4" /> Buat Ujian
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Total Ujian", value: metrics.total, icon: FileText, tone: "text-slate-700 bg-slate-100" },
          { label: "Ada Bank Soal", value: metrics.withBank, icon: BookOpen, tone: "text-blue-700 bg-blue-100" },
          { label: "Perlu Soal", value: metrics.withoutBank, icon: AlertTriangle, tone: "text-amber-700 bg-amber-100" },
          { label: "Terkait Lowongan", value: metrics.linkedVacancy, icon: Users, tone: "text-purple-700 bg-purple-100" },
          { label: "Selesai Ujian", value: metrics.completed, icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-100" },
          { label: "Lulus CBT", value: metrics.passed, icon: BarChart3, tone: "text-teal-700 bg-teal-100" },
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="bg-card rounded-lg border shadow-sm p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari judul ujian, lowongan, atau posisi..."
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <div className="relative md:w-64">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={filterVacancy}
              onChange={(e) => setFilterVacancy(e.target.value)}
              className="w-full border rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 bg-background"
            >
              <option value="">Semua Lowongan</option>
              {vacanciesData?.data?.map((vacancy: any) => (
                <option key={vacancy.id} value={vacancy.id}>{vacancy.title}</option>
              ))}
            </select>
          </div>
          <select
            value={filterReadiness}
            onChange={(e) => setFilterReadiness(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 bg-background md:w-48"
          >
            <option value="">Semua Kesiapan</option>
            <option value="Siap Digunakan">Siap Digunakan</option>
            <option value="Siap Dibagikan">Siap Dibagikan</option>
            <option value="Perlu Bank Soal">Perlu Bank Soal</option>
          </select>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold">Navigasi CBT Rekrutmen</p>
          <div className="flex flex-wrap gap-2">
            <Link to={`${cbtRoot}/banks`} className="text-xs border rounded-md px-3 py-2 hover:bg-muted">Bank Soal</Link>
            <Link to={`${cbtRoot}/results`} className="text-xs border rounded-md px-3 py-2 hover:bg-muted">Hasil Ujian</Link>
            <Link to={isHrd ? "/hrd/applicants" : "/recruitment/applicants"} className="text-xs border rounded-md px-3 py-2 hover:bg-muted">Pelamar</Link>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : filteredExams.length === 0 ? (
        <EmptyState icon={FileText} title="Belum ada ujian" description="Buat pengaturan ujian CBT untuk seleksi pelamar rekrutmen." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredExams.map((exam: any) => {
            const participants = participantsByExamId.get(exam.id) ?? [];
            const participantStats = getParticipantStats(participants);
            const readiness = getExamReadiness(exam, participants);
            const questionTarget = getExamQuestionTarget(exam.cbt_exam_banks ?? []);
            const bankCount = exam.cbt_exam_banks?.length ?? 0;

            return (
              <div key={exam.id} className="bg-card border rounded-lg p-5 flex flex-col gap-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-500" /> {exam.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {exam.recruitment_vacancies?.title || "Tidak dikaitkan dengan lowongan"}
                    </p>
                    {exam.recruitment_vacancies?.position && <p className="text-xs text-muted-foreground">{formatPosition(exam.recruitment_vacancies.position)}</p>}
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${readiness.className}`}>{readiness.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted/50 p-3 rounded-md">
                    <span className="text-muted-foreground block text-xs">Durasi</span>
                    <span className="font-medium">{exam.duration_minutes} menit</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <span className="text-muted-foreground block text-xs">Passing Grade</span>
                    <span className="font-medium">{exam.passing_grade}</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <span className="text-muted-foreground block text-xs">Bank Soal</span>
                    <span className="font-medium">{bankCount} bank / {questionTarget} soal</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <span className="text-muted-foreground block text-xs">Peserta</span>
                    <span className="font-medium">{participantStats.completed}/{participantStats.total} selesai</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Link to={`${basePath}/${exam.id}/settings`} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                    <Settings className="w-4 h-4" /> Atur Komposisi Soal
                  </Link>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(exam)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit ujian">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Hapus ujian ini? Peserta ujian terkait juga dapat terdampak.")) deleteExam({ resource: "cbt_exams", id: exam.id });
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Hapus ujian"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Ujian CBT Rekrutmen" : "Buat Ujian CBT Rekrutmen"}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Judul Ujian</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
              placeholder="Misal: Tes Diniyah Guru Quran"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lowongan Terkait</label>
            <select
              value={formData.vacancy_id}
              onChange={(e) => setFormData({ ...formData, vacancy_id: e.target.value })}
              className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
            >
              <option value="">-- Tidak dikaitkan dengan lowongan --</option>
              {vacanciesData?.data?.map((vacancy: any) => (
                <option key={vacancy.id} value={vacancy.id}>{vacancy.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Durasi (Menit)</label>
              <input
                type="number"
                min="5"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ambang Kelulusan</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.passing_grade}
                onChange={(e) => setFormData({ ...formData, passing_grade: parseInt(e.target.value) || 0 })}
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={formData.randomize_questions}
              onChange={(e) => setFormData({ ...formData, randomize_questions: e.target.checked })}
              className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary"
            />
            <span className="text-sm font-medium">Acak urutan soal saat ujian</span>
          </label>

          <button onClick={handleSave} className="w-full bg-primary text-primary-foreground py-2.5 rounded-md hover:bg-primary/90 font-medium mt-4">
            Simpan Pengaturan Ujian
          </button>
        </div>
      </Modal>
    </div>
  );
};
