import React, { useState, useEffect } from "react";
import { useList, useUpdate, useDelete } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { 
  Users, Search, Loader2, Check, X, Trash2, Eye, Activity,
  MapPin, Phone, Mail, User, HeartPulse, GraduationCap, Calendar
} from "lucide-react";
import { toast } from "sonner";

export const MembersList: React.FC = () => {
  const { data: programsData } = useList({ resource: "extracurriculars" });
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, refetch } = useList({ 
    resource: "extracurricular_members",
    meta: {
      select: "*, extracurriculars(name), students(*), external_students(*)"
    },
    filters: selectedProgram ? [
      { field: "extracurricular_id", operator: "eq", value: selectedProgram }
    ] : [],
    pagination: { mode: "off" }
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal State
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const { mutate: update, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteMutate } = useDelete();

  const handleUpdateStatus = (id: string, newStatus: string) => {
    update({ resource: "extracurricular_members", id, values: { status: newStatus } }, {
      onSuccess: () => {
        toast.success(`Status peserta berhasil diubah menjadi ${newStatus}`);
        
        if (newStatus === 'ACTIVE') {
          const item = data?.data?.find(d => d.id === id);
          if (item) {
            const isInternal = !!item.student_id;
            const name = isInternal ? item.students?.full_name : item.external_students?.full_name;
            const programName = item.extracurriculars?.name;
            
            // Notifikasi Email ke Admin/Sistem
            import("../../../lib/email").then(({ sendNotificationEmail }) => {
              sendNotificationEmail({
                to: "info@tslabschool.sch.id",
                subject: `[Notifikasi Ekskul] Pendaftaran ${name} Disetujui`,
                html: `
                  <h3>Pendaftaran Ekstrakurikuler Disetujui</h3>
                  <p>Sistem mencatat bahwa pendaftaran siswa atas nama <strong>${name}</strong> telah disetujui untuk mengikuti program ekstrakurikuler <strong>${programName}</strong>.</p>
                  <p>Tanggal Persetujuan: ${new Date().toLocaleDateString('id-ID')}</p>
                `
              });
            });
          }
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus peserta ini dari program ekskul? Data absensi dan nilainya juga akan hilang.")) {
      deleteMutate({ resource: "extracurricular_members", id }, {
        onSuccess: () => {
          toast.success("Peserta berhasil dihapus");
          refetch();
        }
      });
    }
  };

  const filteredData = data?.data?.filter((item: any) => {
    if (!searchTerm) return true;
    const studentName = item.student_id ? item.students?.full_name : item.external_students?.full_name;
    const identifier = item.student_id ? item.students?.nis : item.external_students?.school_origin;
    const searchLower = searchTerm.toLowerCase();
    
    return studentName?.toLowerCase().includes(searchLower) || 
           identifier?.toLowerCase().includes(searchLower);
  }) || [];

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProgram]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Peserta Ekstrakurikuler"
        description="Kelola pendaftaran siswa internal dan eksternal ke program ekskul."
      />
      
      <div className="bg-card border rounded-xl shadow-sm flex flex-col">
        <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row justify-between gap-4 bg-muted/10">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Cari nama peserta atau NIS/Asal Sekolah..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm shadow-sm"
              />
            </div>
            <select 
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full sm:w-64 px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-background shadow-sm"
            >
              <option value="">Semua Program Ekskul</option>
              {programsData?.data?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center text-sm font-medium text-muted-foreground">
            Total: <span className="ml-1 text-foreground font-bold">{filteredData.length} Peserta</span>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold border-b tracking-wider">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Nama Peserta</th>
                <th className="px-6 py-4 whitespace-nowrap">Tipe & Info</th>
                <th className="px-6 py-4 whitespace-nowrap">Program Ekskul</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Status</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <span className="text-muted-foreground text-sm font-medium">Memuat data peserta...</span>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-muted-foreground/60" />
                      </div>
                      <p className="text-muted-foreground font-medium text-base">Belum ada peserta yang ditemukan.</p>
                      <p className="text-muted-foreground/60 text-sm mt-1">Coba sesuaikan kata kunci pencarian atau filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item: any) => {
                  const isInternal = !!item.student_id;
                  const name = isInternal ? item.students?.full_name : item.external_students?.full_name;
                  const identifier = isInternal ? `NIS: ${item.students?.nis}` : item.external_students?.school_origin;

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground text-base mb-0.5">{name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          {isInternal ? <User className="w-3 h-3"/> : <GraduationCap className="w-3 h-3"/>}
                          {identifier}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${isInternal ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                            {isInternal ? 'Internal' : 'Eksternal'}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3"/> Terdaftar: {new Date(item.join_date).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border text-sm font-semibold shadow-sm">
                          <Activity className="w-4 h-4 text-slate-500" />
                          {item.extracurriculars?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border
                          ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            item.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setSelectedMember(item)}
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors" 
                            title="Lihat Detail Profil"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {item.status === 'PENDING' && (
                            <button onClick={() => handleUpdateStatus(item.id, 'ACTIVE')} disabled={isUpdating} className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors" title="Setujui">
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {item.status === 'ACTIVE' && (
                            <button onClick={() => handleUpdateStatus(item.id, 'DROPPED')} disabled={isUpdating} className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors" title="Tandai Berhenti">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                           <button onClick={() => handleDelete(item.id)} className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors" title="Hapus Permanen">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!isLoading && filteredData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t bg-muted/10 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground font-medium">
                Tampilkan
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-background border border-input rounded-md text-sm px-2 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none font-medium shadow-sm"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>{size} baris</option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground font-medium hidden sm:inline">
                | Halaman <span className="text-foreground font-bold">{currentPage}</span> dari <span className="text-foreground font-bold">{totalPages}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors shadow-sm bg-background"
              >
                Kembali
              </button>
              
              <div className="flex gap-1 hidden sm:flex">
                {Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
                   // Simplified pagination logic for display
                   let pageNum = i + 1;
                   if (totalPages > 5 && currentPage > 3) {
                     pageNum = currentPage - 2 + i;
                     if (pageNum > totalPages) return null;
                   }
                   return (
                     <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 flex items-center justify-center text-sm font-bold border rounded-lg transition-colors shadow-sm
                          ${currentPage === pageNum ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                     >
                       {pageNum}
                     </button>
                   )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors shadow-sm bg-background"
              >
                Lanjut
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className={`px-6 py-6 flex justify-between items-start text-white 
              ${selectedMember.student_id ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-indigo-600 to-indigo-500'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                   <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                    {selectedMember.student_id ? 'Siswa Internal' : 'Siswa Eksternal'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm
                     ${selectedMember.status === 'ACTIVE' ? 'bg-emerald-500/80' : 
                       selectedMember.status === 'PENDING' ? 'bg-amber-500/80' : 'bg-rose-500/80'}`}>
                    {selectedMember.status}
                  </span>
                </div>
                <h3 className="font-bold text-2xl mb-1">
                  {selectedMember.student_id ? selectedMember.students?.full_name : selectedMember.external_students?.full_name}
                </h3>
                <p className="text-white/80 font-medium flex items-center gap-1.5 text-sm">
                  <Activity className="w-4 h-4"/> Program Ekskul: {selectedMember.extracurriculars?.name}
                </p>
              </div>
              <button onClick={() => setSelectedMember(null)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
              {/* Internal Student Info */}
              {selectedMember.student_id && selectedMember.students && (
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                  <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wider">Data Akademik Internal</h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Nomor Induk Siswa (NIS)</p>
                      <p className="font-medium text-slate-900">{selectedMember.students.nis || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Jenis Kelamin</p>
                      <p className="font-medium text-slate-900">{selectedMember.students.gender === 'L' ? 'Laki-laki' : selectedMember.students.gender === 'P' ? 'Perempuan' : '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Tempat, Tanggal Lahir</p>
                      <p className="font-medium text-slate-900">
                        {selectedMember.students.birth_place || '-'}, {formatDate(selectedMember.students.date_of_birth)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t bg-blue-50/50 -mx-5 px-5 -mb-5 pb-5 rounded-b-xl">
                    <p className="text-xs text-blue-700 flex items-center gap-2">
                      <User className="w-4 h-4"/> 
                      Data ini terintegrasi dengan sistem akademik pusat TSLS.
                    </p>
                  </div>
                </div>
              )}

              {/* External Student Info */}
              {!selectedMember.student_id && selectedMember.external_students && (
                <>
                  <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-500"/> Data Pribadi Siswa
                    </h4>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5"/> Asal Sekolah</p>
                        <p className="font-medium text-slate-900">{selectedMember.external_students.school_origin || '-'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Tempat, Tanggal Lahir</p>
                        <p className="font-medium text-slate-900">
                          {selectedMember.external_students.birth_place || '-'}, {formatDate(selectedMember.external_students.birth_date)}
                        </p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> No. HP / WA Anak</p>
                        <p className="font-medium text-slate-900">{selectedMember.external_students.phone_number || '-'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> Email Akun</p>
                        <p className="font-medium text-slate-900">{selectedMember.external_students.email || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500"/> Kontak Darurat & Orang Tua
                    </h4>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Nama Orang Tua/Wali</p>
                        <p className="font-medium text-slate-900">{selectedMember.external_students.parent_name || '-'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> No. HP Darurat</p>
                        <p className="font-medium text-slate-900">{selectedMember.external_students.parent_phone_number || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Alamat Domisili</p>
                        <p className="font-medium text-slate-900 whitespace-pre-wrap">{selectedMember.external_students.address || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {selectedMember.external_students.medical_notes && (
                    <div className="bg-rose-50 p-5 rounded-xl border border-rose-200 shadow-sm relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 bg-rose-100 rounded-full w-24 h-24 opacity-50"></div>
                      <h4 className="font-bold text-rose-800 border-b border-rose-200 pb-2 mb-3 text-sm uppercase tracking-wider flex items-center gap-2 relative z-10">
                        <HeartPulse className="w-4 h-4"/> Catatan Medis Penting
                      </h4>
                      <p className="text-rose-900 font-medium text-sm whitespace-pre-wrap relative z-10">
                        {selectedMember.external_students.medical_notes}
                      </p>
                    </div>
                  )}
                </>
              )}
              
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-white flex justify-end gap-3">
               <button 
                onClick={() => setSelectedMember(null)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
