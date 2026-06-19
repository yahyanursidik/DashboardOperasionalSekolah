import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useList, useCreate } from "@refinedev/core";
import { Target, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const PortalExtracurricular: React.FC = () => {
  const { student } = useOutletContext<{ student: any }>();
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  const { data: programsData, isLoading: loadingPrograms } = useList({
    resource: "extracurriculars",
    filters: [{ field: "is_active", operator: "eq", value: true }]
  });

  const { data: myPrograms, isLoading: loadingMyPrograms, refetch } = useList({
    resource: "extracurricular_members",
    meta: {
      select: "*, extracurriculars(name, schedule, coach_name)"
    },
    filters: [
      { field: "student_id", operator: "eq", value: student?.id }
    ],
    queryOptions: { enabled: !!student?.id }
  });

  const { mutate: createMember, isLoading: isRegistering } = useCreate();

  const handleRegister = (programId: string) => {
    if (!student?.id) return;
    
    // Cek apakah sudah terdaftar
    const isAlreadyRegistered = myPrograms?.data?.some(p => p.extracurricular_id === programId);
    if (isAlreadyRegistered) {
      toast.error("Ananda sudah terdaftar di program ini");
      return;
    }

    createMember({
      resource: "extracurricular_members",
      values: {
        extracurricular_id: programId,
        student_id: student.id,
        status: "ACTIVE" // Internal student usually auto-approved or PENDING based on policy. Let's use ACTIVE for simplicity.
      }
    }, {
      onSuccess: () => {
        toast.success("Berhasil mendaftar program ekstrakurikuler!");
        setSelectedProgram(null);
        refetch();
      },
      onError: () => {
        toast.error("Gagal mendaftar program ekstrakurikuler.");
      }
    });
  };

  if (loadingMyPrograms || loadingPrograms) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
        <p className="text-gray-500">Memuat data ekskul...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Program Ekstrakurikuler</h2>
        <p className="text-emerald-50/90 text-sm">
          Daftarkan Ananda ke program ekstrakurikuler & afterschool untuk mengembangkan bakatnya.
        </p>
      </div>

      <div>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" /> Ekstrakurikuler Ananda
        </h3>
        
        {myPrograms?.data?.length === 0 ? (
          <div className="bg-white border rounded-xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">Belum ada program ekskul yang diikuti.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myPrograms?.data?.map((member: any) => (
              <div key={member.id} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-900">{member.extracurriculars?.name}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${member.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {member.status === 'ACTIVE' ? 'Aktif' : 'Menunggu'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Jadwal: {member.extracurriculars?.schedule || '-'}</p>
                  <p>Pelatih: {member.extracurriculars?.coach_name || '-'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t">
        <h3 className="font-bold text-gray-900 mb-3">Katalog Program Tersedia</h3>
        <div className="space-y-3">
          {programsData?.data?.map((program: any) => {
            const isRegistered = myPrograms?.data?.some(p => p.extracurricular_id === program.id);
            const isSelected = selectedProgram === program.id;

            return (
              <div 
                key={program.id} 
                className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${isSelected ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}
                onClick={() => !isRegistered && setSelectedProgram(isSelected ? null : program.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900">{program.name}</h4>
                  {isRegistered && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{program.description || 'Tidak ada deskripsi.'}</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-emerald-700">Rp {Number(program.internal_fee).toLocaleString('id-ID')}</span>
                  {!isRegistered && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                          handleRegister(program.id);
                        } else {
                          setSelectedProgram(program.id);
                        }
                      }}
                      disabled={isRegistering}
                      className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${isSelected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                    >
                      {isRegistering && isSelected ? 'Mendaftar...' : isSelected ? 'Konfirmasi Daftar' : 'Daftar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
