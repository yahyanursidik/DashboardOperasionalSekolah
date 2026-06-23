import React from "react";
import { useList, useNavigation } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { 
  Activity, Users, UserCheck, Award, 
  ArrowRight, Calendar, Clock, GraduationCap, ChevronRight, PieChart, TrendingUp
} from "lucide-react";

export const ExtracurricularDashboard: React.FC = () => {
  const { data: programsData, isLoading: loadingPrograms } = useList({ 
    resource: "extracurriculars",
    pagination: { mode: "off" }
  });
  
  const { data: membersData, isLoading: loadingMembers } = useList({ 
    resource: "extracurricular_members",
    meta: {
      select: "*, students(full_name), external_students(full_name)"
    },
    pagination: { mode: "off" },
    sorters: [
      { field: "join_date", order: "desc" }
    ]
  });

  const { push } = useNavigation();

  // Stats Calculations
  const activePrograms = programsData?.data.filter(p => p.is_active).length || 0;
  const totalPrograms = programsData?.data.length || 0;
  
  const totalMembers = membersData?.data.length || 0;
  const internalMembers = membersData?.data.filter(m => m.student_id).length || 0;
  const externalMembers = membersData?.data.filter(m => m.external_student_id).length || 0;

  const internalRatio = totalMembers > 0 ? Math.round((internalMembers / totalMembers) * 100) : 0;
  const externalRatio = totalMembers > 0 ? Math.round((externalMembers / totalMembers) * 100) : 0;

  // Get 5 most recent members
  const recentMembers = membersData?.data.slice(0, 5) || [];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Dashboard Ekstrakurikuler"
        description="Pusat pemantauan statistik dan aktivitas program ekstrakurikuler serta afterschool."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-lg shadow-blue-500/20 text-white relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-bl-full transition-transform group-hover:scale-110 duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-blue-100 font-medium mb-1">Program Ekskul</p>
              <h4 className="text-4xl font-bold flex items-baseline gap-2">
                {loadingPrograms ? "..." : activePrograms}
                <span className="text-sm font-normal text-blue-200">/ {totalPrograms} Aktif</span>
              </h4>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 shadow-lg shadow-emerald-500/20 text-white relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-bl-full transition-transform group-hover:scale-110 duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-emerald-100 font-medium mb-1">Total Peserta</p>
              <h4 className="text-4xl font-bold flex items-baseline gap-2">
                {loadingMembers ? "..." : totalMembers}
                <span className="text-sm font-normal text-emerald-200">Siswa</span>
              </h4>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-bl-full transition-transform group-hover:scale-110 duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-indigo-100 font-medium mb-1">Peserta Internal</p>
              <h4 className="text-4xl font-bold flex items-baseline gap-2">
                {loadingMembers ? "..." : internalMembers}
                <span className="text-sm font-normal text-indigo-200">({internalRatio}%)</span>
              </h4>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-lg shadow-orange-500/20 text-white relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-bl-full transition-transform group-hover:scale-110 duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-orange-100 font-medium mb-1">Peserta Eksternal</p>
              <h4 className="text-4xl font-bold flex items-baseline gap-2">
                {loadingMembers ? "..." : externalMembers}
                <span className="text-sm font-normal text-orange-200">({externalRatio}%)</span>
              </h4>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Award className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Akses Cepat & Daftar Program */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Access */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Akses Cepat Manajemen
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               <div 
                  onClick={() => push("/extracurricular/programs")} 
                  className="group p-5 border rounded-xl bg-slate-50 hover:bg-white hover:shadow-md hover:border-blue-200 cursor-pointer transition-all text-center flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Activity className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-sm text-slate-700 group-hover:text-blue-700">Program Ekskul</span>
               </div>
               
               <div 
                  onClick={() => push("/extracurricular/members")} 
                  className="group p-5 border rounded-xl bg-slate-50 hover:bg-white hover:shadow-md hover:border-emerald-200 cursor-pointer transition-all text-center flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-sm text-slate-700 group-hover:text-emerald-700">Data Peserta</span>
               </div>
               
               <div 
                  onClick={() => push("/extracurricular/attendance")} 
                  className="group p-5 border rounded-xl bg-slate-50 hover:bg-white hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all text-center flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-700">Absensi</span>
               </div>
               
               <div 
                  onClick={() => push("/extracurricular/grades")} 
                  className="group p-5 border rounded-xl bg-slate-50 hover:bg-white hover:shadow-md hover:border-orange-200 cursor-pointer transition-all text-center flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <Award className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-sm text-slate-700 group-hover:text-orange-700">Penilaian</span>
               </div>
            </div>
          </div>

          {/* Program List */}
          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-muted/10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" /> Statistik Program
              </h3>
              <button 
                onClick={() => push("/extracurricular/programs")} 
                className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
              >
                Lihat Semua <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-0">
              <div className="divide-y">
                {programsData?.data.slice(0, 5).map((program: any) => (
                  <div key={program.id} className="p-4 sm:px-6 hover:bg-slate-50 transition-colors flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-10 rounded-full ${program.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <div>
                        <h4 className="font-bold text-slate-800">{program.name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
                          <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5"/> {program.coach_name || 'Belum ada pelatih'}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {program.schedule || '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${program.is_active ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        {program.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>
                ))}
                
                {programsData?.data.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-1">Belum ada program</h3>
                    <p className="text-muted-foreground text-sm">Tambahkan program ekstrakurikuler pertama Anda.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Pendaftaran Terbaru & Rasio Siswa */}
        <div className="space-y-6">
          
          {/* Rasio Siswa */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Distribusi Peserta
            </h3>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-indigo-700 flex items-center gap-1.5"><GraduationCap className="w-4 h-4"/> Internal</span>
                  <span className="font-bold text-slate-700">{internalRatio}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-indigo-500 h-3 rounded-full" style={{ width: `${internalRatio}%` }}></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">{internalMembers} Siswa</p>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold text-orange-700 flex items-center gap-1.5"><UserCheck className="w-4 h-4"/> Eksternal</span>
                  <span className="font-bold text-slate-700">{externalRatio}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${externalRatio}%` }}></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">{externalMembers} Siswa</p>
              </div>
            </div>
          </div>

          {/* Recent Registrations */}
          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100%-16rem)] min-h-[300px]">
            <div className="p-5 border-b bg-muted/10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" /> Pendaftar Terbaru
              </h3>
            </div>
            
            <div className="p-0 flex-1 overflow-y-auto">
              <div className="divide-y">
                {loadingMembers ? (
                  <div className="p-8 text-center text-muted-foreground animate-pulse font-medium">Memuat data...</div>
                ) : recentMembers.length > 0 ? (
                  recentMembers.map((member: any) => {
                    const isInternal = !!member.student_id;
                    const name = isInternal ? member.students?.full_name : member.external_students?.full_name;
                    
                    return (
                      <div key={member.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer" onClick={() => push("/extracurricular/members")}>
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${isInternal ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                            {name ? name.substring(0, 2).toUpperCase() : '??'}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{name}</h4>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">
                              {isInternal ? 'Internal' : 'Eksternal'} • {new Date(member.join_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    )
                  })
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm font-medium">
                    Belum ada pendaftar.
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 text-center">
              <button 
                onClick={() => push("/extracurricular/members")}
                className="text-sm font-bold text-primary hover:underline"
              >
                Lihat Semua Pendaftar
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
