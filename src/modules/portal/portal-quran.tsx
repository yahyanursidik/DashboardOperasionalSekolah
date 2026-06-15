import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { BookOpen, Award, CheckCircle, Target } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

export const PortalQuran: React.FC = () => {
  const { student } = useOutletContext<any>();
  const [records, setRecords] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { activeYearId, activeSemesterId } = useAcademicYear();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch Daily Records
        const { data: recordsData } = await supabaseClient
          .from("quran_records")
          .select("*, employees(full_name)")
          .eq("student_id", student.id)
          .order("date", { ascending: false });
        
        if (recordsData) setRecords(recordsData);

        // Fetch Class Targets (if student has class_id)
        if (student.class_id && activeYearId && activeSemesterId) {
          const { data: targetsData } = await supabaseClient
            .from("quran_targets")
            .select("*")
            .eq("class_id", student.class_id)
            .eq("academic_year_id", activeYearId)
            .eq("semester_id", activeSemesterId);
            
          if (targetsData) setTargets(targetsData);
        }

        // Fetch Assessments
        if (activeYearId && activeSemesterId) {
          const { data: assessmentsData } = await supabaseClient
            .from("quran_assessments")
            .select("*, employees(full_name)")
            .eq("student_id", student.id)
            .eq("academic_year_id", activeYearId)
            .eq("semester_id", activeSemesterId)
            .order("date", { ascending: false });

          if (assessmentsData) setAssessments(assessmentsData);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [student.id, student.class_id, activeYearId, activeSemesterId]);

  const tahfidzRecords = records.filter(r => r.record_type === 'tahfidz');
  const tahsinRecords = records.filter(r => r.record_type === 'tahsin');

  // Simple progress calculation (demonstration purposes)
  // In a real app, you'd calculate exact pages/ayats accumulated
  const calculateProgress = (target: any) => {
    const relevantRecords = target.target_type === 'tahfidz' ? tahfidzRecords : tahsinRecords;
    // Just a dummy logic for progress bar visual
    const progress = Math.min(100, Math.max(0, (relevantRecords.length / target.target_amount) * 100 * (target.amount_unit === 'halaman' ? 2 : 10)));
    return Math.round(progress);
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500 animate-pulse">Memuat data Al-Qur'an...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">Al-Qur'an</h2>
          <p className="text-emerald-100 text-sm">Capaian Tahfidz & Tahsin Ananda {student.full_name.split(' ')[0]}</p>
        </div>
        <BookOpen className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-10" />
      </div>

      {/* Target Semester Ini */}
      {targets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Target className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900">Target Semester Ini</h3>
          </div>
          
          <div className="grid gap-3">
            {targets.map(target => {
              const progress = calculateProgress(target);
              return (
                <div key={target.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      target.target_type === 'tahfidz' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {target.target_type}
                    </span>
                    <span className="text-sm font-bold text-gray-700">{target.target_amount} {target.amount_unit}</span>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-3">{target.description}</h4>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-gray-500">
                      <span>Progres Pencapaian</span>
                      <span className="text-emerald-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full ${target.target_type === 'tahfidz' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ujian Munaqosyah */}
      {assessments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Award className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-gray-900">Hasil Ujian (Munaqosyah)</h3>
          </div>
          <div className="grid gap-3">
            {assessments.map(assessment => (
              <div key={assessment.id} className="bg-gradient-to-r from-purple-50 to-white rounded-xl shadow-sm border border-purple-100 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-purple-900">{assessment.title}</h4>
                    <p className="text-xs font-medium text-purple-600 mt-0.5">
                      {assessment.assessment_type === 'tahfidz_juz' ? 'Ujian Tasmi Juz' : 'Ujian Kenaikan Jilid'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-purple-700">{assessment.score}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-purple-500 bg-purple-100 px-2 py-0.5 rounded mt-1">{assessment.predicate}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 border-t border-purple-100/50 pt-2 flex justify-between">
                  <span>{new Date(assessment.date).toLocaleDateString('id-ID')}</span>
                  <span>Penguji: {assessment.employees?.full_name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tahfidz Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 px-1">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-gray-900">Mutaba'ah Hafalan (Tahfidz)</h3>
        </div>
        
        {tahfidzRecords.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed p-6 text-center text-gray-500 text-sm">
            Belum ada catatan setoran hafalan.
          </div>
        ) : (
          <div className="space-y-3">
            {tahfidzRecords.map(record => (
              <div key={record.id} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-lg text-emerald-700">{record.surah_or_jilid}</h4>
                    <p className="text-sm text-gray-600 font-medium">Ayat/Hal: {record.ayat_or_page}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    record.fluency_score === 'Sangat Lancar' ? 'bg-emerald-100 text-emerald-700' :
                    record.fluency_score === 'Lancar' ? 'bg-blue-100 text-blue-700' :
                    record.fluency_score === 'Kurang Lancar' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {record.fluency_score}
                  </span>
                </div>
                {record.notes && (
                  <div className="mt-3 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100">
                    <span className="font-bold block mb-1">Catatan Ustadz/Ustadzah:</span>
                    {record.notes}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400 font-medium border-t pt-2">
                  <span>{new Date(record.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {record.employees?.full_name || 'Ustadz/ah'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tahsin Section */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-2 px-1">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-900">Perkembangan Bacaan (Tahsin)</h3>
        </div>
        
        {tahsinRecords.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed p-6 text-center text-gray-500 text-sm">
            Belum ada catatan tahsin.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="divide-y">
              {tahsinRecords.map(record => (
                <div key={record.id} className="p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-800">{record.surah_or_jilid}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Hal/Ayat: {record.ayat_or_page} • {new Date(record.date).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-blue-600 block">{record.fluency_score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
