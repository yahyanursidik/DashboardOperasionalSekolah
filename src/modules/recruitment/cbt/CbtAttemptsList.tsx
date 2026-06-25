import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTable, useDelete, useList, useCreate } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Trash2, User, Clock, CheckCircle2, XCircle, Plus, Eye, Search, ChevronLeft, ChevronRight, FileText, Filter } from "lucide-react";
import { Modal } from "../../../components/common/Modal";
import { toast } from "sonner";

export const CbtAttemptsList: React.FC = () => {
  const location = useLocation();
  const basePath = location.pathname.startsWith("/hrd") ? "/hrd/cbt/results" : "/recruitment/cbt/results";
  
  const [examFilter, setExamFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { tableQueryResult, current, setCurrent, pageCount, setFilters } = useTable({
    resource: "cbt_participants",
    meta: {
      select: "*, recruitment_applicants(full_name, email), cbt_exams(title, passing_grade)"
    },
    pagination: { current: 1, pageSize: 10 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  // Apply filters whenever they change
  useEffect(() => {
    const filters: any[] = [];
    if (examFilter) {
      filters.push({ field: "exam_id", operator: "eq", value: examFilter });
    }
    if (statusFilter) {
      filters.push({ field: "status", operator: "eq", value: statusFilter });
    }
    setFilters(filters, "replace");
    setCurrent(1);
  }, [examFilter, statusFilter, setFilters, setCurrent]);

  const { data, isLoading } = tableQueryResult;
  const participants = data?.data || [];
  const totalItems = data?.total || 0;

  const { mutate: deleteParticipant, isLoading: isDeleting } = useDelete();
  const { mutate: createParticipant, isLoading: isCreating } = useCreate();

  const { data: applicantsData } = useList({ 
    resource: "recruitment_applicants",
    pagination: { pageSize: 1000 }
  });
  
  const { data: examsData } = useList({ 
    resource: "cbt_exams",
    pagination: { pageSize: 1000 }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [applicantSearch, setApplicantSearch] = useState("");
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
        setApplicantSearch("");
        tableQueryResult.refetch();
        toast.success("Peserta ujian berhasil didaftarkan.");
      },
      onError: (err) => {
        toast.error(`Gagal mendaftarkan: ${err.message}`);
      }
    });
  };

  const handleDelete = (id: string) => {
    if(confirm("Apakah Anda yakin ingin menghapus sesi ujian peserta ini? Hasil ujian juga akan terhapus.")) {
      deleteParticipant({ resource: "cbt_participants", id }, {
        onSuccess: () => toast.success("Sesi ujian berhasil dihapus.")
      });
    }
  };

  const filteredApplicants = applicantsData?.data?.filter((a: any) => 
    a.full_name?.toLowerCase().includes(applicantSearch.toLowerCase()) || 
    a.email?.toLowerCase().includes(applicantSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title="Hasil Ujian Pelamar (CBT)" 
          description="Pantau progres ujian, hasil akhir kelulusan, dan kelola token ujian pelamar."
        />
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md font-semibold text-sm hover:shadow-lg active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Daftarkan Peserta
        </button>
      </div>

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Simple Stat Cards */}
        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4 col-span-1 md:col-span-2">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Total Sesi Ujian</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalItems}</h3>
          </div>
        </div>

        {/* Filters */}
        <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border shadow-sm">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <select 
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              className="w-full bg-transparent text-sm outline-none text-gray-700"
            >
              <option value="">Semua Ujian</option>
              {examsData?.data.map((e: any) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-transparent text-sm outline-none text-gray-700"
            >
              <option value="">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="in_progress">Sedang Mengerjakan</option>
              <option value="completed">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-gray-50/80 border-b text-gray-500 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Pelamar</th>
                <th className="px-6 py-4">Ujian CBT</th>
                <th className="px-6 py-4">Token & Waktu</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Nilai Akhir</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex justify-center items-center gap-3 text-primary">
                      <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-medium">Memuat data ujian...</span>
                    </div>
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-lg font-medium text-gray-900">Belum ada peserta ujian</p>
                      <p className="text-sm mt-1 text-gray-500">Silakan daftarkan pelamar untuk mengikuti ujian CBT.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                participants.map((participant: any) => (
                  <tr key={participant.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                          {participant.recruitment_applicants?.full_name?.charAt(0) || <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{participant.recruitment_applicants?.full_name || 'Pelamar Dihapus'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            {participant.recruitment_applicants?.email || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-gray-800">{participant.cbt_exams?.title || 'Ujian Dihapus'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <code className="bg-gray-100 border text-gray-800 px-2.5 py-1 rounded-md text-xs font-mono font-bold shadow-sm">
                          {participant.token}
                        </code>
                        <div className="text-[11px] text-gray-500">
                          {new Date(participant.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {participant.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm"><Clock className="w-3.5 h-3.5" /> Menunggu</span>}
                      {participant.status === 'in_progress' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"><Clock className="w-3.5 h-3.5 animate-pulse" /> Sedang Mengerjakan</span>}
                      {participant.status === 'completed' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm"><CheckCircle2 className="w-3.5 h-3.5" /> Selesai</span>}
                    </td>
                    <td className="px-6 py-4">
                      {participant.status === 'completed' ? (
                        <div className="flex items-center gap-3">
                          <div className={`text-xl font-black ${participant.is_passed ? 'text-emerald-600' : 'text-red-600'}`}>
                            {participant.score}
                          </div>
                          <div className="text-xs">
                            {participant.is_passed ? (
                              <span className="font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded"><CheckCircle2 className="w-3 h-3" /> LULUS</span>
                            ) : (
                              <span className="font-bold text-red-600 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded"><XCircle className="w-3 h-3" /> GAGAL</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs bg-gray-50 px-2 py-1 rounded">Belum ada nilai</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`${basePath}/${participant.id}`} className="p-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors inline-block" title="Lihat Detail Jawaban">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button 
                          disabled={isDeleting}
                          onClick={() => handleDelete(participant.id)} 
                          className="p-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors inline-block disabled:opacity-50" title="Hapus"
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

        {/* Pagination Controls */}
        {pageCount > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 font-medium">
              Menampilkan halaman <span className="font-bold text-gray-900">{current}</span> dari <span className="font-bold text-gray-900">{pageCount}</span> 
              <span className="mx-2">•</span> 
              Total: {totalItems} data
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrent(p => Math.max(1, p - 1))}
                disabled={current === 1}
                className="p-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-50 hover:text-primary disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-600 transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, pageCount) }).map((_, i) => {
                  let pageNum = current;
                  if (current <= 3) pageNum = i + 1;
                  else if (current >= pageCount - 2) pageNum = pageCount - 4 + i;
                  else pageNum = current - 2 + i;

                  if (pageNum < 1 || pageNum > pageCount) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrent(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                        current === pageNum 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setCurrent(p => Math.min(pageCount, p + 1))}
                disabled={current === pageCount}
                className="p-2 rounded-lg border bg-white text-gray-600 hover:bg-gray-50 hover:text-primary disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-600 transition-all shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Enroll */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Daftarkan Peserta Ujian">
        <div className="space-y-5 p-1">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Pilih Pelamar <span className="text-red-500">*</span></label>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ketik nama atau email untuk mencari..."
                  value={applicantSearch}
                  onChange={(e) => setApplicantSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>
              <div className="border border-gray-200 rounded-lg bg-gray-50 p-2 h-48 overflow-y-auto">
                {filteredApplicants?.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 italic">
                    Pelamar tidak ditemukan
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredApplicants?.map((a: any) => (
                      <label 
                        key={a.id} 
                        className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                          formData.applicant_id === a.id ? 'bg-primary/10 border-primary border' : 'hover:bg-white border border-transparent'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="applicant" 
                          value={a.id}
                          checked={formData.applicant_id === a.id}
                          onChange={(e) => setFormData({...formData, applicant_id: e.target.value})}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{a.full_name}</span>
                          <span className="text-xs text-gray-500">{a.email}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Pilih Ujian (CBT) <span className="text-red-500">*</span></label>
            <select
              value={formData.exam_id}
              onChange={e => setFormData({...formData, exam_id: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm bg-white"
            >
              <option value="">-- Pilih Ujian --</option>
              {examsData?.data.map((e: any) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>

          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm border border-emerald-100 flex items-start gap-3 mt-6">
            <div className="bg-emerald-100 p-1.5 rounded-full shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900 mb-1">Token Otomatis</p>
              <p className="text-emerald-700 leading-relaxed">Sistem akan men-generate Token Acak (6 karakter) untuk pelamar ini setelah Anda menekan tombol simpan.</p>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t mt-6">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 rounded-lg border text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
            >
              Batal
            </button>
            <button 
              onClick={handleEnroll} 
              disabled={!formData.applicant_id || !formData.exam_id || isCreating}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 font-semibold text-sm transition-all disabled:opacity-50 shadow-sm flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Menyimpan...
                </>
              ) : (
                "Simpan & Generate"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
