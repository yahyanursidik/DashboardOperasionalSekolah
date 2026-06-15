import React from "react";
import { useList, useOne } from "@refinedev/core";
import { AlertCircle, Camera, Award, BookOpen } from "lucide-react";

const SCALES = ['BB', 'MB', 'BSH', 'BSB'];
const SCALE_COLORS: any = {
  'BB': 'bg-red-500',
  'MB': 'bg-amber-500',
  'BSH': 'bg-blue-500',
  'BSB': 'bg-emerald-500'
};

const SCALE_LABELS: any = {
  'BB': 'Belum Berkembang',
  'MB': 'Mulai Berkembang',
  'BSH': 'Berkembang Sesuai Harapan',
  'BSB': 'Berkembang Sangat Baik'
};

const ASPECTS = [
  { id: 'agama_moral', title: 'Nilai Agama & Moral' },
  { id: 'fisik_motorik', title: 'Fisik Motorik' },
  { id: 'kognitif', title: 'Kognitif' },
  { id: 'bahasa', title: 'Bahasa' },
  { id: 'sosial_emosional', title: 'Sosial Emosional' },
  { id: 'seni', title: 'Seni' },
];

export const PortalPaud: React.FC = () => {
  // We assume the auth provider metadata contains the parent's linked student.
  // For demo, we might need a specific student ID or fetch the first linked student.
  const { data: studentsData } = useList({
    resource: "students", // Requires parents access to their students
    pagination: { pageSize: 1 }
  });
  
  const studentId = studentsData?.data?.[0]?.id;

  const { data: activitiesData, isLoading: actLoading } = useList({
    resource: "paud_activities",
    filters: studentId ? [{ field: "student_id", operator: "eq", value: studentId }] : [],
    sorters: [{ field: "date", order: "desc" }],
    queryOptions: { enabled: !!studentId }
  });

  const { data: stppaData, isLoading: stppaLoading } = useList({
    resource: "paud_stppa_assessments",
    filters: studentId ? [{ field: "student_id", operator: "eq", value: studentId }] : [],
    sorters: [{ field: "date", order: "desc" }],
    pagination: { pageSize: 1 },
    queryOptions: { enabled: !!studentId }
  });

  const activities = activitiesData?.data || [];
  const latestStppa = stppaData?.data?.[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-500 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Catatan Perkembangan Anak (KB/TK)
        </h2>
        <p className="text-muted-foreground mt-1">Pantau dokumentasi kegiatan dan evaluasi capaian perkembangan (STPPA) ananda.</p>
      </div>

      {!studentId && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200">
          Memuat data anak atau Anda belum memiliki siswa KB/TK yang terhubung.
        </div>
      )}

      {studentId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* KOLOM KIRI: LAPORAN STPPA */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-500" />
              Laporan Rapor STPPA Terakhir
            </h3>
            
            {stppaLoading ? (
              <div className="p-10 text-center animate-pulse">Memuat laporan rapor...</div>
            ) : !latestStppa ? (
              <div className="bg-card border rounded-xl shadow-sm">
                <div className="p-10 flex flex-col items-center justify-center text-muted-foreground text-center">
                  <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
                  <p>Belum ada evaluasi capaian STPPA untuk saat ini.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-6 rounded-2xl shadow-md">
                  <h4 className="font-bold text-xl mb-1">{latestStppa.period_name}</h4>
                  <p className="text-emerald-100 text-sm">Dievaluasi pada: {new Date(latestStppa.date).toLocaleDateString('id-ID')}</p>
                  
                  {(latestStppa.growth_weight || latestStppa.growth_height) && (
                    <div className="mt-4 pt-4 border-t border-emerald-400/30 flex gap-6 text-sm">
                      {latestStppa.growth_weight && <div><strong>BB:</strong> {latestStppa.growth_weight} kg</div>}
                      {latestStppa.growth_height && <div><strong>TB:</strong> {latestStppa.growth_height} cm</div>}
                      {latestStppa.growth_head && <div><strong>LK:</strong> {latestStppa.growth_head} cm</div>}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {ASPECTS.map(aspect => {
                    const scale = latestStppa[`${aspect.id}_scale`];
                    const desc = latestStppa[`${aspect.id}_desc`];
                    
                    if (!scale && !desc) return null;

                    return (
                      <div key={aspect.id} className="bg-card border rounded-xl shadow-sm overflow-hidden border-l-4" style={{ borderLeftColor: scale === 'BSB' ? '#10b981' : scale === 'BSH' ? '#3b82f6' : scale === 'MB' ? '#f59e0b' : '#ef4444' }}>
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-lg">{aspect.title}</h4>
                            <div className="flex gap-1">
                              {SCALES.map(s => (
                                <div key={s} className={`px-2 py-1 text-[10px] font-bold rounded ${s === scale ? `${SCALE_COLORS[s]} text-white shadow-sm` : 'bg-muted text-muted-foreground'}`}>
                                  {s}
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 bg-muted/30 p-3 rounded-lg leading-relaxed italic">
                            "{desc || 'Tidak ada catatan khusus.'}"
                          </p>
                          <p className="text-xs text-muted-foreground text-right mt-2 font-medium">
                            Status: {SCALE_LABELS[scale]}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* KOLOM KANAN: JURNAL FOTO */}
          <div className="space-y-6">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <Camera className="w-5 h-5 text-pink-500" />
              Jurnal Momen
            </h3>

            {actLoading ? (
              <div className="p-10 text-center animate-pulse">Memuat foto...</div>
            ) : activities.length === 0 ? (
              <div className="bg-card border rounded-xl shadow-sm">
                <div className="p-10 flex flex-col items-center justify-center text-muted-foreground text-center">
                  <Camera className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">Belum ada dokumentasi foto kegiatan.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {activities.map(act => (
                  <div key={act.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                    {act.photo_url && (
                      <div className="w-full aspect-[4/3] bg-muted relative">
                        <img src={act.photo_url} alt={act.title} className="w-full h-full object-cover" />
                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded font-medium">
                          {new Date(act.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <h4 className="font-bold mb-1">{act.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-3">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
