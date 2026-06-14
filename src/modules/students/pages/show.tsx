import React, { useState } from "react";
import { useShow, useList, useCreate } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { User, Edit, ArrowLeft, Users, Plus, X, BookOpen, Star, AlertTriangle, ShieldAlert, Award, Activity, Eye, GraduationCap, History } from "lucide-react";
import { AuditHistory } from "../../../components/common/AuditHistory";
import { Link, useNavigate } from "react-router-dom";
import { calculateCompleteness } from "./list";
import { ParentForm } from "../../parents/components/parent-form";
import { AcademicHistoryModal } from "../components/AcademicHistoryModal";

export const StudentShow: React.FC = () => {
  const { queryResult } = useShow({
    meta: { select: "*, units(name), classes(name)" }
  });
  const { data, isLoading } = queryResult;
  const navigate = useNavigate();
  const record = data?.data;

  // Parents data
  const { data: parentsData, isLoading: parentsLoading, refetch: refetchParents } = useList({
    resource: "student_parent_links",
    filters: [
      { field: "student_id", operator: "eq", value: record?.id }
    ],
    meta: { select: "*, parents(*)" },
    queryOptions: { enabled: !!record?.id }
  });

  // Journals data
  const { data: journalsData, isLoading: journalsLoading } = useList({
    resource: "student_journals",
    filters: [{ field: "student_id", operator: "eq", value: record?.id }],
    sorters: [{ field: "date_recorded", order: "desc" }],
    queryOptions: { enabled: !!record?.id }
  });

  const { data: semestersData } = useList({
    resource: "semesters",
    meta: { select: "*, academic_years(name)" },
    pagination: { mode: "off" }
  });

  // Academic History
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useList({
    resource: "student_academic_history",
    filters: [{ field: "student_id", operator: "eq", value: record?.id }],
    meta: { select: "*, units(name), classes(name), academic_years(name)" },
    sorters: [{ field: "created_at", order: "desc" }],
    queryOptions: { enabled: !!record?.id }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [linkMode, setLinkMode] = useState<"existing" | "new">("new");
  
  // Link mutation
  const { mutate: createLink, isLoading: isLinking } = useCreate();

  // If the parent form was modified to return the inserted data, we could auto-link.
  // For now, after creating a parent, we close the form and ask user to link existing.

  const [selectedParentId, setSelectedParentId] = useState("");
  const [relationship, setRelationship] = useState("father");
  const [isPrimary, setIsPrimary] = useState(false);

  // Existing parents query for linking
  const { data: allParentsData } = useList({
    resource: "parents",
    queryOptions: { enabled: linkMode === "existing" && isModalOpen }
  });

  const handleLinkExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentId) return;

    createLink({
      resource: "student_parent_links",
      values: {
        student_id: record?.id,
        parent_id: selectedParentId,
        relationship: relationship,
        is_primary: isPrimary,
      },
      successNotification: () => ({ message: "Orang Tua Berhasil Ditautkan", type: "success" })
    }, {
      onSuccess: () => {
        setIsModalOpen(false);
        refetchParents();
        setSelectedParentId("");
      }
    });
  };

  const handleHistorySaved = () => {
    refetchHistory();
    // also refetch student data to get new class_id
    queryResult.refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-muted animate-pulse rounded-xl"></div>
        <div className="h-64 bg-muted animate-pulse rounded-xl"></div>
      </div>
    );
  }

  if (!record) {
    return <div className="p-8 text-center text-muted-foreground">Siswa tidak ditemukan.</div>;
  }

  const score = calculateCompleteness(record);

  const getCategoryDetails = (category: string) => {
    switch(category) {
      case 'akademik': return { icon: <BookOpen className="w-4 h-4" />, label: 'Akademik', color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'karakter': return { icon: <Star className="w-4 h-4" />, label: 'Karakter', color: 'text-purple-600 bg-purple-50 border-purple-200' };
      case 'kendala': return { icon: <AlertTriangle className="w-4 h-4" />, label: 'Kendala', color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'ekskul': return { icon: <Award className="w-4 h-4" />, label: 'Ekskul', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      case 'kasus': return { icon: <ShieldAlert className="w-4 h-4" />, label: 'Kasus', color: 'text-red-600 bg-red-50 border-red-200' };
      case 'kesehatan': return { icon: <Activity className="w-4 h-4" />, label: 'Kesehatan', color: 'text-rose-600 bg-rose-50 border-rose-200' };
      case 'anekdot': return { icon: <Eye className="w-4 h-4" />, label: 'Anekdot', color: 'text-teal-600 bg-teal-50 border-teal-200' };
      case 'stppa': return { icon: <Star className="w-4 h-4 fill-current" />, label: 'STPPA', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
      default: return { icon: <BookOpen className="w-4 h-4" />, label: category, color: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil Siswa"
        description={`Rekam jejak dan data induk untuk ${record.full_name}`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/students")}
              className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
            <Link
              to={`/students/edit/${record.id}`}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Edit className="w-4 h-4" />
              Ubah Data
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-sm mb-4">
              <User className="w-12 h-12 text-primary/50" />
            </div>
            <h2 className="text-xl font-bold">{record.full_name}</h2>
            <p className="text-sm text-muted-foreground mb-4">Panggilan: {record.nickname || "-"}</p>
            <div className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border mb-6 ${record.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              Status: {record.status}
            </div>
            <div className="mt-2 pt-4 border-t">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="font-medium">Kelengkapan Data</span>
                <span className={`font-bold ${score === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{score}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className={`h-2 rounded-full ${score === 100 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-destructive'}`} style={{ width: `${score}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Orang Tua / Wali
              </h3>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-sm flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md font-medium hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> Tautkan Orang Tua
              </button>
            </div>
            
            {parentsLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat data orang tua...</p>
            ) : parentsData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Belum ada orang tua yang ditautkan ke profil ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parentsData?.data?.map((link: any) => {
                  const parent = link.parents;
                  const relations: Record<string, string> = { father: "Ayah", mother: "Ibu", guardian: "Wali" };
                  return (
                    <div key={link.id} className="border rounded-xl p-4 flex gap-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/parents/show/${parent.id}`)}>
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <User className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{parent.full_name}</p>
                        <p className="text-xs text-muted-foreground mb-2">{parent.phone || "Tidak ada No. HP"}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] uppercase font-bold bg-muted px-2 py-0.5 rounded-full">
                            Sebagai: {relations[link.relationship] || link.relationship}
                          </span>
                          {link.is_primary && (
                            <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              Kontak Utama
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" /> Riwayat Akademik & Kelas
              </h3>
              <button 
                onClick={() => setIsHistoryModalOpen(true)}
                className="text-sm flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-md font-medium hover:bg-emerald-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> Catat Riwayat / Pindah
              </button>
            </div>
            
            {historyLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat riwayat...</p>
            ) : historyData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Belum ada riwayat akademik untuk siswa ini.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-muted ml-3 space-y-6">
                {historyData?.data?.map((history: any, index: number) => {
                  let badgeColor = "bg-slate-100 text-slate-700";
                  if (history.status === 'Naik Kelas') badgeColor = "bg-emerald-100 text-emerald-700";
                  else if (history.status === 'Pindah Jenjang') badgeColor = "bg-purple-100 text-purple-700";
                  else if (history.status === 'Siswa Baru' || history.status === 'Pindahan (Masuk)') badgeColor = "bg-blue-100 text-blue-700";
                  else if (history.status === 'Lulus') badgeColor = "bg-amber-100 text-amber-700";
                  else if (history.status === 'Tinggal Kelas') badgeColor = "bg-rose-100 text-rose-700";
                  
                  return (
                    <div key={history.id} className="relative pl-6">
                      <div className={`absolute w-3 h-3 rounded-full -left-[7px] top-1.5 border-2 border-white ${index === 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <div className="bg-muted/30 rounded-lg p-4 border">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                              {history.status}
                            </span>
                            <h4 className="font-semibold text-sm mt-1">{history.units?.name} - {history.classes?.name || "Lulus/Keluar"}</h4>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded border">
                            TA {history.academic_years?.name || "-"}
                          </span>
                        </div>
                        {history.notes && <p className="text-sm text-muted-foreground mt-2 italic">"{history.notes}"</p>}
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                          Dibuat pada {new Date(history.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" /> Jurnal & Rekam Jejak
              </h3>
              <Link 
                to="/student-journals/create"
                className="text-sm flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-md font-medium hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> Tulis Jurnal
              </Link>
            </div>
            
            {journalsLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat rekam jejak...</p>
            ) : journalsData?.data?.length === 0 ? (
              <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">Belum ada catatan jurnal atau rekam jejak untuk siswa ini.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {(() => {
                  // Group journals by Semester & Year
                  const grouped: Record<string, { yearName: string; semesterName: string; items: any[] }> = {};
                  
                  journalsData?.data?.forEach(journal => {
                    let groupKey = "Lainnya";
                    let yearName = "Lainnya";
                    let semesterName = "";

                    if (semestersData?.data) {
                      const date = new Date(journal.date_recorded);
                      const semester = semestersData.data.find(s => {
                        return date >= new Date(s.start_date) && date <= new Date(s.end_date);
                      });
                      if (semester) {
                        yearName = semester.academic_years?.name || "Tahun Tidak Diketahui";
                        semesterName = semester.name;
                        groupKey = `TA ${yearName} - Semester ${semesterName}`;
                      }
                    }

                    if (!grouped[groupKey]) {
                      grouped[groupKey] = { yearName, semesterName, items: [] };
                    }
                    grouped[groupKey].items.push(journal);
                  });

                  return Object.entries(grouped).map(([groupKey, group]) => (
                    <div key={groupKey} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                        <div className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-full border border-indigo-100">
                          {groupKey}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                          {group.items.length} Catatan
                        </div>
                      </div>
                      
                      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                        {group.items.map((journal: any) => {
                          const cat = getCategoryDetails(journal.category);
                          return (
                            <div key={journal.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                {cat.icon}
                              </div>
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card p-4 rounded-xl border shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cat.color}`}>
                                    {cat.label}
                                  </span>
                                  <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                    {new Date(journal.date_recorded).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                                <h4 className="font-bold text-foreground text-sm mb-1">{journal.title}</h4>
                                <p className="text-sm text-muted-foreground mb-3">{journal.description}</p>
                                
                                {journal.category === 'stppa' && journal.stppa_metrics && (
                                  <div className="mt-2 mb-3 bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
                                    <h5 className="text-[10px] font-bold uppercase text-indigo-800 mb-2">Capaian STPPA:</h5>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      {Object.entries(journal.stppa_metrics).map(([key, val]) => (
                                        <div key={key} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-indigo-50">
                                          <span className="font-semibold text-indigo-900">{key}</span>
                                          <span className="font-bold text-indigo-600">{String(val)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {journal.action_taken && (
                                  <div className="bg-amber-50 text-amber-800 p-2 rounded text-xs border border-amber-100">
                                    <strong>Tindakan:</strong> {journal.action_taken}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          <AuditHistory resource="students" resourceId={record.id as string} />
        </div>
      </div>

      {/* Modals */}
      {isHistoryModalOpen && (
        <AcademicHistoryModal 
          isOpen={isHistoryModalOpen} 
          onClose={() => setIsHistoryModalOpen(false)} 
          student={record} 
          onSuccess={handleHistorySaved} 
        />
      )}
      {/* MODAL: Tautkan Orang Tua */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
              <h3 className="font-semibold text-lg">Tautkan Orang Tua / Wali</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-md hover:bg-muted"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 overflow-y-auto">
              
              <div className="flex p-1 bg-muted rounded-lg mb-6 w-full max-w-md">
                <button 
                  onClick={() => setLinkMode("new")}
                  className={`flex-1 text-sm font-medium py-1.5 rounded-md ${linkMode === "new" ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >Buat Orang Tua Baru</button>
                <button 
                  onClick={() => setLinkMode("existing")}
                  className={`flex-1 text-sm font-medium py-1.5 rounded-md ${linkMode === "existing" ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >Pilih yang Sudah Ada</button>
              </div>

              {linkMode === "new" ? (
                <div className="border rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-4">Masukkan data orang tua baru. Setelah tersimpan, Anda dapat menautkannya di tab "Pilih yang Sudah Ada".</p>
                  <ParentForm action="create" hideActions={false} />
                </div>
              ) : (
                <form onSubmit={handleLinkExisting} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pilih Orang Tua</label>
                    <select 
                      required 
                      value={selectedParentId}
                      onChange={(e) => setSelectedParentId(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">-- Pilih --</option>
                      {allParentsData?.data?.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.full_name} ({p.phone || "Tanpa No. HP"})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hubungan (Status)</label>
                    <select 
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="father">Ayah</option>
                      <option value="mother">Ibu</option>
                      <option value="guardian">Wali</option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isPrimary}
                        onChange={(e) => setIsPrimary(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary" 
                      />
                      <span className="text-sm font-medium">Jadikan Kontak Utama</span>
                    </label>
                    <p className="text-xs text-muted-foreground ml-6">Hanya satu kontak utama per siswa. Menandai ini akan menggeser kontak utama sebelumnya.</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-muted">Batal</button>
                    <button type="submit" disabled={isLinking} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md disabled:opacity-70">
                      {isLinking ? "Menautkan..." : "Tautkan Sekarang"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
