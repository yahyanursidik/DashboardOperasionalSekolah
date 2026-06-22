import React, { useState } from "react";
import { useList, useUpdate, useDelete } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Users, Search, Activity, Loader2, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const MembersList: React.FC = () => {
  const { data: programsData } = useList({ resource: "extracurriculars" });
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, refetch } = useList({ 
    resource: "extracurricular_members",
    meta: {
      select: "*, extracurriculars(name), students(full_name, nis), external_students(full_name, school_origin, phone_number)"
    },
    filters: selectedProgram ? [
      { field: "extracurricular_id", operator: "eq", value: selectedProgram }
    ] : [],
    pagination: { mode: "off" }
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { mutate: update, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteMutate } = useDelete();

  const handleUpdateStatus = (id: string, newStatus: string) => {
    update({ resource: "extracurricular_members", id, values: { status: newStatus } }, {
      onSuccess: () => {
        toast.success(`Status peserta berhasil diubah menjadi ${newStatus}`);
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
    return studentName?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  // Reset page when search or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProgram]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Peserta Ekstrakurikuler"
        description="Kelola pendaftaran siswa internal dan eksternal ke program ekskul."
      />
      
      <div className="bg-card border rounded-xl shadow-sm flex flex-col">
        <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Cari nama peserta..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>
            <select 
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-background"
            >
              <option value="">Semua Program Ekskul</option>
              {programsData?.data?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Nama Peserta</th>
                <th className="px-6 py-4 whitespace-nowrap">Tipe</th>
                <th className="px-6 py-4 whitespace-nowrap">Program Ekskul</th>
                <th className="px-6 py-4 whitespace-nowrap">Tgl Daftar</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Status</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    <span className="text-muted-foreground text-sm">Memuat data peserta...</span>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                        <Users className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Belum ada peserta yang ditemukan.</p>
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
                        <div className="font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground">{identifier}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isInternal ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {isInternal ? 'Internal' : 'Eksternal'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{item.extracurriculars?.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{item.join_date}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium 
                          ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                            item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-red-100 text-red-700'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.status === 'PENDING' && (
                            <button onClick={() => handleUpdateStatus(item.id, 'ACTIVE')} disabled={isUpdating} className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors" title="Setujui">
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {item.status === 'ACTIVE' && (
                            <button onClick={() => handleUpdateStatus(item.id, 'DROPPED')} disabled={isUpdating} className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-md transition-colors" title="Tandai Keluar/Berhenti">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                           <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Hapus Permanen">
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
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> (Total: {filteredData.length})
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-background border border-input rounded-md text-sm px-2 py-1 ml-4 focus:ring-1 focus:ring-primary outline-none"
              >
                {[10, 20, 30, 40, 50].map((size) => (
                  <option key={size} value={size}>
                    Tampilkan {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
