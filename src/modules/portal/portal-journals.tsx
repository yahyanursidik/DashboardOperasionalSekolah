import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Clock, Activity, AlertTriangle, HeartPulse, Award } from "lucide-react";

export const PortalJournals: React.FC = () => {
  const { student } = useOutletContext<any>();
  const [journals, setJournals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJournals = async () => {
      try {
        const { data } = await supabaseClient
          .from("student_journals")
          .select("*, employees!teacher_id(full_name)")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false });
        
        if (data) setJournals(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJournals();
  }, [student.id]);

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Memuat jurnal aktivitas...</div>;
  }

  const getIcon = (category: string) => {
    switch (category) {
      case 'Prestasi': return <Award className="w-5 h-5 text-emerald-600" />;
      case 'Pelanggaran': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'Kesehatan': return <HeartPulse className="w-5 h-5 text-blue-600" />;
      default: return <Activity className="w-5 h-5 text-purple-600" />;
    }
  };

  const getColor = (category: string) => {
    switch (category) {
      case 'Prestasi': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Pelanggaran': return 'bg-red-100 text-red-700 border-red-200';
      case 'Kesehatan': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
        <Clock className="w-6 h-6 text-emerald-600" /> Catatan & Jurnal Siswa
      </h2>

      {journals.length === 0 ? (
        <div className="bg-gray-50 rounded-xl border border-dashed p-8 text-center text-gray-500">
          <p>Belum ada catatan atau jurnal untuk siswa ini.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pb-4">
          {journals.map((journal) => (
            <div key={journal.id} className="relative pl-6">
              {/* Timeline dot */}
              <div className="absolute -left-[11px] top-1 bg-white border-2 border-emerald-500 w-5 h-5 rounded-full" />
              
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {getIcon(journal.category)}
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getColor(journal.category)}`}>
                      {journal.category}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {new Date(journal.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                
                <h3 className="font-bold text-gray-900 mt-2">{journal.title}</h3>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  {journal.description}
                </p>

                <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex items-center gap-1">
                  Oleh: <span className="font-medium text-gray-700">{journal.employees?.full_name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
