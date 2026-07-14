import React, { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { BookOpen, Award, FileText, Download } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { LessonSchedulePanel } from "../schedules/components/LessonSchedulePanel";

export const PortalAcademic: React.FC = () => {
  const { student } = useOutletContext<any>();
  const { activeYearId } = useAcademicYear();
  const [grades, setGrades] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSchedulesLoading, setIsSchedulesLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const { data } = await supabaseClient
          .from("academic_grades")
          .select("*, subjects(name, category)")
          .eq("student_id", student.id)
          .order("academic_year", { ascending: false })
          .order("semester", { ascending: false });
        
        if (data) setGrades(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrades();
  }, [student.id]);

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsSchedulesLoading(true);
      try {
        if (!student?.class_id) {
          setSchedules([]);
          return;
        }

        let query = supabaseClient
          .from("employee_schedules")
          .select("id, day_of_week, start_time, end_time, schedule_type, subject, subject_id, unit_id, class_id, classes(name, unit_id, units(name)), units(name), subjects(name), employees(full_name)")
          .eq("class_id", student.class_id)
          .eq("schedule_type", "mengajar")
          .order("start_time");
        if (activeYearId) query = query.eq("academic_year_id", activeYearId);

        const { data } = await query;
        setSchedules(data || []);
      } catch (error) {
        console.error("Portal academic schedules error:", error);
      } finally {
        setIsSchedulesLoading(false);
      }
    };

    fetchSchedules();
  }, [activeYearId, student?.class_id]);

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Memuat data akademik...</div>;
  }

  // Group grades by academic year and semester
  const groupedGrades = grades.reduce((acc, grade) => {
    const term = `${grade.academic_year} - Semester ${grade.semester}`;
    if (!acc[term]) acc[term] = [];
    acc[term].push(grade);
    return acc;
  }, {} as Record<string, any[]>);

  const getPredikat = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    return 'D';
  };

  const isPaud = student.level === 'PAUD';

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
        <BookOpen className="w-6 h-6 text-emerald-600" /> Nilai & e-Rapor
      </h2>

      <LessonSchedulePanel
        schedules={schedules}
        isLoading={isSchedulesLoading}
        title="Jadwal Pelajaran"
        description="Jadwal pelajaran kelas aktif siswa untuk membantu orang tua menyiapkan buku, tugas, dan pendampingan belajar."
        emptyMessage="Belum ada jadwal pelajaran untuk kelas siswa ini."
        defaultType="mengajar"
        compact
      />

      {Object.keys(groupedGrades).length === 0 ? (
        <div className="bg-gray-50 rounded-xl border border-dashed p-8 text-center text-gray-500">
          <p>Belum ada riwayat nilai akademik.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(groupedGrades) as [string, any[]][]).map(([term, termGrades]) => (
            <div key={term} className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="bg-emerald-50 px-4 py-3 border-b flex justify-between items-center">
                <h3 className="font-bold text-emerald-900">{term}</h3>
                <Link
                  to={`/academic/report-cards/${student.id}/print`}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> e-Rapor
                </Link>
              </div>

              <div className="divide-y">
                {termGrades.map((g: any) => (
                  <div key={g.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <div className="font-semibold text-gray-900">{g.subjects?.name}</div>
                      <div className="text-xs text-muted-foreground">{g.subjects?.category}</div>
                    </div>
                    <div className="text-right">
                      {isPaud ? (
                        <div className={`font-bold px-2 py-1 rounded text-sm ${
                          g.qualitative_score === 'BSB' ? 'bg-emerald-100 text-emerald-700' :
                          g.qualitative_score === 'BSH' ? 'bg-blue-100 text-blue-700' :
                          g.qualitative_score === 'MB' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {g.qualitative_score}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold text-gray-900">{g.score}</div>
                          <div className={`font-bold w-8 h-8 flex items-center justify-center rounded-full text-sm ${
                            getPredikat(g.score) === 'A' ? 'bg-emerald-100 text-emerald-700' :
                            getPredikat(g.score) === 'B' ? 'bg-blue-100 text-blue-700' :
                            getPredikat(g.score) === 'C' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {getPredikat(g.score)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
