import React, { useEffect, useState } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
import { Target, Calendar, Award, Receipt, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { Link } from "react-router-dom";

export const ExtracurricularPortalDashboard: React.FC = () => {
  const { data: identity } = useGetIdentity<any>();
  const [externalProfile, setExternalProfile] = useState<any>(null);

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

  const { data: membersData, isLoading: loadingMembers } = useList({
    resource: "extracurricular_members",
    meta: {
      select: "*, extracurriculars(name, schedule, coach_name)"
    },
    filters: [
      { field: "external_student_id", operator: "eq", value: externalProfile?.id }
    ],
    queryOptions: { enabled: !!externalProfile?.id }
  });

  const { data: invoicesData, isLoading: loadingInvoices } = useList({
    resource: "student_invoices",
    filters: [
      { field: "external_student_id", operator: "eq", value: externalProfile?.id }
    ],
    queryOptions: { enabled: !!externalProfile?.id }
  });

  const activePrograms = membersData?.data?.filter(m => m.status === 'ACTIVE' || m.status === 'PENDING') || [];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2">Selamat Datang, {identity?.full_name || 'Siswa'}!</h2>
        <p className="text-primary-foreground/80 max-w-2xl">
          Pantau jadwal ekstrakurikuler, status pendaftaran, riwayat absensi, dan unduh rapor hasil belajarmu di portal ini.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Program Ekskul Saya
            </h3>
            
            {loadingMembers ? (
              <div className="py-8 text-center text-muted-foreground animate-pulse">Memuat program...</div>
            ) : activePrograms.length === 0 ? (
              <div className="py-12 px-4 text-center border-2 border-dashed rounded-xl bg-slate-50/50">
                <Target className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-3" />
                <h4 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Program</h4>
                <p className="text-muted-foreground mb-6">Kamu belum mendaftar program ekstrakurikuler apapun.</p>
                <Link 
                  to="/ekskul-portal/programs" 
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Jelajahi Program <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePrograms.map((member: any) => (
                  <div key={member.id} className="border rounded-xl p-5 hover:border-primary/50 transition-colors relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg text-primary line-clamp-1 pr-2">{member.extracurriculars?.name}</h4>
                      {member.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">
                          <Clock className="w-3 h-3" /> PENDING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3" /> AKTIF
                        </span>
                      )}
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 mt-0.5 text-orange-500" />
                        <span>{member.extracurriculars?.schedule || 'Jadwal belum ditentukan'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 mt-0.5 text-blue-500" />
                        <span>Pelatih: {member.extracurriculars?.coach_name || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Card to discover more programs */}
                <Link to="/ekskul-portal/programs" className="border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors group cursor-pointer min-h-[140px]">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Target className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-primary">Daftar Program Lainnya</span>
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Penilaian & Rapor Terakhir
            </h3>
            <div className="py-8 text-center border-2 border-dashed rounded-xl bg-slate-50/50">
              <Award className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Belum ada rapor yang diterbitkan.</p>
              <p className="text-sm text-muted-foreground mt-1">Rapor akan muncul di sini setiap akhir semester.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" /> Tagihan Ekskul
            </h3>
            {loadingInvoices ? (
               <div className="py-4 text-center text-muted-foreground text-sm animate-pulse">Memuat tagihan...</div>
            ) : invoicesData?.data?.length === 0 ? (
               <div className="py-6 text-center border border-dashed rounded-lg bg-slate-50/50">
                 <p className="text-muted-foreground text-sm font-medium">Belum ada tagihan.</p>
               </div>
            ) : (
               <div className="space-y-3">
                 {invoicesData?.data?.map((invoice: any) => (
                   <div key={invoice.id} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                     <div className="flex justify-between items-start mb-1">
                       <h4 className="font-semibold text-sm line-clamp-1">{invoice.title}</h4>
                       <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                         {invoice.status === 'paid' ? 'LUNAS' : 'BELUM LUNAS'}
                       </span>
                     </div>
                     <div className="flex justify-between items-center mt-2">
                       <span className="font-bold text-primary text-sm">Rp {Number(invoice.amount).toLocaleString('id-ID')}</span>
                       <button 
                         onClick={() => window.open(`/print-invoice/${invoice.id}`, '_blank')}
                         className="text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary hover:text-white transition-colors"
                       >
                         Cetak
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-bold mb-4">Ringkasan Kehadiran</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground">Hadir</span>
                <span className="font-bold text-green-600">- Hari</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground">Sakit/Izin</span>
                <span className="font-bold text-yellow-600">- Hari</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground">Alpa</span>
                <span className="font-bold text-red-600">- Hari</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Temp mock User icon since it's missing in imports
const User = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
