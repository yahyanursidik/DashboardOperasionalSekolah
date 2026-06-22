import React, { useEffect, useState } from "react";
import { useList, useGetIdentity, useCreate } from "@refinedev/core";
import { Target, Calendar, User, Info, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const ExtracurricularPortalPrograms: React.FC = () => {
  const { data: identity } = useGetIdentity<any>();
  const [externalProfile, setExternalProfile] = useState<any>(null);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const { mutate: createMember } = useCreate();
  const navigate = useNavigate();

  useEffect(() => {
    if (identity?.id) {
      supabaseClient
        .from('external_students')
        .select('*')
        .eq('user_id', identity.id)
        .single()
        .then(({ data }) => setExternalProfile(data));
    }
  }, [identity]);

  const { data: programsData, isLoading: loadingPrograms } = useList({
    resource: "extracurriculars",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }]
  });

  const { data: myMemberships, isLoading: loadingMemberships, refetch: refetchMemberships } = useList({
    resource: "extracurricular_members",
    filters: [
      { field: "external_student_id", operator: "eq", value: externalProfile?.id }
    ],
    queryOptions: { enabled: !!externalProfile?.id }
  });

  const handleApply = (programId: string) => {
    if (!externalProfile?.id) {
      toast.error("Profil tidak ditemukan. Harap login kembali.");
      return;
    }

    setApplyingTo(programId);
    createMember(
      {
        resource: "extracurricular_members",
        values: {
          extracurricular_id: programId,
          external_student_id: externalProfile.id,
          status: 'PENDING'
        }
      },
      {
        onSuccess: () => {
          toast.success("Berhasil mendaftar! Menunggu persetujuan admin.");
          refetchMemberships();
          setApplyingTo(null);
        },
        onError: () => {
          toast.error("Gagal mendaftar program ini. Silakan coba lagi.");
          setApplyingTo(null);
        }
      }
    );
  };

  const getMembershipStatus = (programId: string) => {
    if (!myMemberships?.data) return null;
    const membership = myMemberships.data.find((m: any) => m.extracurricular_id === programId);
    return membership ? membership.status : null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Katalog Program</h2>
            <p className="text-muted-foreground text-sm">Pilih program ekstrakurikuler yang ingin kamu ikuti</p>
          </div>
        </div>

        <div className="mt-8">
          {loadingPrograms || loadingMemberships ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : programsData?.data?.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed rounded-xl bg-slate-50/50">
              <Info className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Belum ada program ekstrakurikuler yang aktif saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programsData?.data?.map((program: any) => {
                const status = getMembershipStatus(program.id);
                const isApplying = applyingTo === program.id;
                
                return (
                  <div key={program.id} className="border rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col bg-white group">
                    <div className="p-5 flex-1 relative">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors pr-2">{program.name}</h3>
                        {program.program_type === 'EVENT' ? (
                          <span className="shrink-0 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded">1 Momen</span>
                        ) : (
                          <span className="shrink-0 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded">Rutin</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
                        {program.description || "Tidak ada deskripsi tersedia."}
                      </p>
                      
                      <div className="space-y-3 mt-4 pt-4 border-t border-dashed">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Jadwal</p>
                            <p className="text-sm font-semibold text-gray-900">{program.schedule || "Menyusul"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Pelatih Utama</p>
                            <p className="text-sm font-semibold text-gray-900">{program.coach_name || "Menyusul"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-5 border-t mt-auto flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Biaya Pendaftaran</p>
                        <p className="text-lg font-bold text-primary">Rp {Number(program.external_fee || 0).toLocaleString('id-ID')}</p>
                      </div>
                      
                      {status === 'ACTIVE' ? (
                        <div className="flex flex-col items-end">
                          <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-100 px-3 py-1.5 rounded-lg">
                            <CheckCircle2 className="w-4 h-4" /> Aktif
                          </span>
                        </div>
                      ) : status === 'PENDING' ? (
                        <div className="flex flex-col items-end">
                          <span className="text-amber-600 font-bold text-sm bg-amber-100 px-3 py-1.5 rounded-lg">
                            Menunggu Persetujuan
                          </span>
                        </div>
                      ) : status === 'INACTIVE' ? (
                         <div className="flex flex-col items-end">
                         <span className="text-red-600 font-bold text-sm bg-red-100 px-3 py-1.5 rounded-lg">
                           Ditolak / Dinonaktifkan
                         </span>
                       </div>
                      ) : (
                        <button 
                          onClick={() => handleApply(program.id)}
                          disabled={isApplying}
                          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                        >
                          {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Daftar"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
