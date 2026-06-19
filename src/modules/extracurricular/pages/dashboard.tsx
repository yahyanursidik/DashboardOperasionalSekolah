import React from "react";
import { useList, useNavigation } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Activity, Users, UserCheck, Award } from "lucide-react";

export const ExtracurricularDashboard: React.FC = () => {
  const { data: programsData, isLoading: loadingPrograms } = useList({ resource: "extracurriculars" });
  const { data: membersData, isLoading: loadingMembers } = useList({ resource: "extracurricular_members" });
  const { push } = useNavigation();

  const activePrograms = programsData?.data.filter(p => p.is_active).length || 0;
  const totalMembers = membersData?.data.length || 0;
  const internalMembers = membersData?.data.filter(m => m.student_id).length || 0;
  const externalMembers = membersData?.data.filter(m => m.external_student_id).length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Ekstrakurikuler"
        description="Pantau statistik kegiatan ekstrakurikuler dan afterschool."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Ekskul Aktif</p>
            <h4 className="text-2xl font-bold">{loadingPrograms ? "..." : activePrograms}</h4>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Total Peserta</p>
            <h4 className="text-2xl font-bold">{loadingMembers ? "..." : totalMembers}</h4>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Peserta Internal</p>
            <h4 className="text-2xl font-bold">{loadingMembers ? "..." : internalMembers}</h4>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Peserta Eksternal</p>
            <h4 className="text-2xl font-bold">{loadingMembers ? "..." : externalMembers}</h4>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[300px]">
          <h3 className="text-lg font-semibold mb-4">Program Ekstrakurikuler</h3>
          <div className="space-y-4">
            {programsData?.data.map((program: any) => (
              <div key={program.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div>
                  <h4 className="font-medium">{program.name}</h4>
                  <p className="text-xs text-muted-foreground">Pelatih: {program.coach_name || '-'}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${program.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {program.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>
            ))}
            {programsData?.data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Belum ada program ekskul.</div>
            )}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[300px]">
          <h3 className="text-lg font-semibold mb-4">Akses Cepat</h3>
          <div className="grid grid-cols-2 gap-4">
             <div onClick={() => push("/extracurricular/programs")} className="p-4 border rounded-lg bg-muted/10 hover:bg-muted/30 cursor-pointer transition-colors text-center flex flex-col items-center justify-center gap-2">
                <Activity className="w-8 h-8 text-primary" />
                <span className="font-medium text-sm">Kelola Program</span>
             </div>
             <div onClick={() => push("/extracurricular/members")} className="p-4 border rounded-lg bg-muted/10 hover:bg-muted/30 cursor-pointer transition-colors text-center flex flex-col items-center justify-center gap-2">
                <Users className="w-8 h-8 text-primary" />
                <span className="font-medium text-sm">Data Peserta</span>
             </div>
             <div onClick={() => push("/extracurricular/attendance")} className="p-4 border rounded-lg bg-muted/10 hover:bg-muted/30 cursor-pointer transition-colors text-center flex flex-col items-center justify-center gap-2">
                <UserCheck className="w-8 h-8 text-primary" />
                <span className="font-medium text-sm">Absensi Ekskul</span>
             </div>
             <div onClick={() => push("/extracurricular/grades")} className="p-4 border rounded-lg bg-muted/10 hover:bg-muted/30 cursor-pointer transition-colors text-center flex flex-col items-center justify-center gap-2">
                <Award className="w-8 h-8 text-primary" />
                <span className="font-medium text-sm">Penilaian / Rapor</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
