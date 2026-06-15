import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { BookOpen, Award, CheckCircle } from "lucide-react";

export const PortalQuran: React.FC = () => {
  const { student } = useOutletContext<any>();
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const { data } = await supabaseClient
          .from("quran_records")
          .select("*, employees(full_name)")
          .eq("student_id", student.id)
          .order("date", { ascending: false });
        
        if (data) setRecords(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecords();
  }, [student.id]);

  const tahfidzRecords = records.filter(r => r.record_type === 'tahfidz');
  const tahsinRecords = records.filter(r => r.record_type === 'tahsin');

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500 animate-pulse">Memuat data Al-Qur'an...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-1">Al-Qur'an</h2>
        <p className="text-emerald-100 text-sm">Capaian Tahfidz & Tahsin Ananda {student.full_name.split(' ')[0]}</p>
      </div>

      {/* Tahfidz Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Award className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-gray-900">Histori Hafalan (Tahfidz)</h3>
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
                    <p className="text-sm text-gray-600 font-medium">Ayat {record.ayat_or_page}</p>
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
                    <p className="text-xs text-gray-500 mt-0.5">Hal. {record.ayat_or_page} • {new Date(record.date).toLocaleDateString('id-ID')}</p>
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
