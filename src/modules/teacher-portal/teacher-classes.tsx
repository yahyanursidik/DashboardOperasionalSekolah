import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Users, CheckSquare, Award, ChevronDown } from "lucide-react";

export const TeacherClasses: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for Student List Modal (for Attendance/Grades)
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [actionType, setActionType] = useState<"attendance" | "grades" | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);

  useEffect(() => {
    // For demo purposes, we fetch all classes in the unit where the teacher belongs
    const fetchClasses = async () => {
      try {
        let query = supabaseClient.from("classes").select("*").order("name");
        
        if (employee.unit_id) {
          query = query.eq("unit_id", employee.unit_id);
        }
        
        const { data } = await query;
        if (data) setClasses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClasses();
  }, [employee.unit_id]);

  const openClassAction = async (cls: any, type: "attendance" | "grades") => {
    setSelectedClass(cls);
    setActionType(type);
    setIsStudentsLoading(true);
    try {
      const { data } = await supabaseClient
        .from("students")
        .select("id, full_name, nis")
        .eq("class_id", cls.id)
        .eq("status", "active")
        .order("full_name");
      
      setStudents(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsStudentsLoading(false);
    }
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    alert("Fitur absensi harian massal berhasil disimpan! (Demo)");
    setSelectedClass(null);
  };

  const handleSaveGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    alert("Nilai akademik berhasil disimpan ke dalam sistem! (Demo)");
    setSelectedClass(null);
  };

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Memuat daftar kelas...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-primary" /> Kelola Kelas
      </h2>

      <div className="space-y-4 pb-8">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{cls.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tingkat: {cls.level}</p>
              </div>
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                {cls.capacity} Siswa
              </div>
            </div>
            
            <div className="grid grid-cols-2 divide-x">
              <button 
                onClick={() => openClassAction(cls, "attendance")}
                className="p-3 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition"
              >
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-gray-700">Absensi Harian</span>
              </button>
              <button 
                onClick={() => openClassAction(cls, "grades")}
                className="p-3 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition"
              >
                <Award className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold text-gray-700">Input Nilai</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Action Modal */}
      {selectedClass && actionType && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">
                  {actionType === 'attendance' ? 'Absensi Harian' : 'Input Nilai'}
                </h3>
                <p className="text-xs text-primary font-medium">Kelas: {selectedClass.name}</p>
              </div>
              <button onClick={() => setSelectedClass(null)} className="text-gray-400 hover:text-gray-900 font-bold px-2 py-1">
                TUTUP
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1">
              {isStudentsLoading ? (
                <div className="text-center py-8 text-sm text-gray-500 animate-pulse">Memuat data siswa...</div>
              ) : (
                <form 
                  id="actionForm" 
                  onSubmit={actionType === 'attendance' ? handleSaveAttendance : handleSaveGrades}
                  className="space-y-4"
                >
                  {/* Mock subject selector if grades */}
                  {actionType === 'grades' && (
                    <div className="mb-6">
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Mata Pelajaran</label>
                      <select className="w-full border rounded-lg p-2 text-sm outline-none focus:border-primary">
                        <option>Matematika</option>
                        <option>Bahasa Indonesia</option>
                        <option>Pendidikan Agama Islam</option>
                      </select>
                    </div>
                  )}

                  <div className="divide-y border rounded-xl overflow-hidden">
                    {students.map((student, index) => (
                      <div key={student.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex gap-3 items-center">
                          <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900 line-clamp-1">{student.full_name}</p>
                            <p className="text-[10px] text-gray-500">NIS: {student.nis}</p>
                          </div>
                        </div>

                        {actionType === 'attendance' ? (
                          <select className="border rounded px-2 py-1 text-xs font-medium outline-none focus:border-primary shrink-0 bg-white">
                            <option value="Hadir">Hadir</option>
                            <option value="Sakit">Sakit</option>
                            <option value="Izin">Izin</option>
                            <option value="Alpa">Alpa</option>
                          </select>
                        ) : (
                          <input 
                            type="number" 
                            min="0" max="100" 
                            placeholder="Nilai" 
                            className="w-16 border rounded px-2 py-1 text-sm text-center outline-none focus:border-primary shrink-0"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {students.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">Belum ada siswa di kelas ini.</div>
                  )}
                </form>
              )}
            </div>

            <div className="p-4 border-t bg-white shrink-0">
              <button
                type="submit"
                form="actionForm"
                disabled={isStudentsLoading || students.length === 0}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                Simpan Data
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
