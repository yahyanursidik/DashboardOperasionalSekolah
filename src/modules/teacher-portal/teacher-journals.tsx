import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { BookOpen, Search, User, CheckCircle, Activity, Award, AlertTriangle, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

export const TeacherJournals: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId } = useAcademicYear();
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [recentJournals, setRecentJournals] = useState<any[]>([]);
  
  // Form state
  const [category, setCategory] = useState("Pelanggaran");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // BK Mode
  const isBK = employee?.teacher_roles?.includes("Guru Bimbingan dan Konseling");
  const [viewMode, setViewMode] = useState<"input" | "rekap">("input");
  const [allJournals, setAllJournals] = useState<any[]>([]);

  // Fetch all journals for BK
  useEffect(() => {
    if (viewMode === 'rekap' && isBK) {
      const fetchAll = async () => {
        const { data } = await supabaseClient
          .from("student_journals")
          .select("*, students(full_name, nis), employees(full_name)")
          .order("created_at", { ascending: false })
          .limit(50);
        if (data) setAllJournals(data);
      };
      fetchAll();
    }
  }, [viewMode, isBK]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (isBK) {
        const { data } = await supabaseClient
          .from("students")
          .select("id, full_name, nis, classes(name)")
          .eq("status", "active")
          .order("full_name");
        setStudents(data || []);
        return;
      }

      let scheduleQuery = supabaseClient
        .from("employee_schedules")
        .select("class_id")
        .eq("employee_id", employee.id)
        .not("class_id", "is", null);
      if (activeYearId) scheduleQuery = scheduleQuery.eq("academic_year_id", activeYearId);

      const { data: schedules } = await scheduleQuery;
      const { data: homeroomClasses } = await supabaseClient
        .from("classes")
        .select("id")
        .eq("homeroom_teacher_id", employee.id);

      const classIds = Array.from(new Set([
        ...(schedules || []).map((item: any) => item.class_id).filter(Boolean),
        ...(homeroomClasses || []).map((item: any) => item.id).filter(Boolean),
      ]));

      if (classIds.length === 0) {
        setStudents([]);
        return;
      }

      const { data } = await supabaseClient
        .from("students")
        .select("id, full_name, nis, classes(name)")
        .in("class_id", classIds)
        .eq("status", "active")
        .order("full_name");
      setStudents(data || []);
    };
    fetchStudents();
  }, [activeYearId, employee.id, isBK]);

  useEffect(() => {
    if (!selectedStudent) return;
    const fetchRecentJournals = async () => {
      const { data } = await supabaseClient
        .from("student_journals")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (data) setRecentJournals(data);
    };
    fetchRecentJournals();
  }, [selectedStudent]);

  const filteredStudents = searchQuery.trim() === "" 
    ? [] 
    : students.filter(s => s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery)).slice(0, 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !title || !description) return;
    
    if (!navigator.onLine) {
      toast.error("Gagal mengirim jurnal: Koneksi internet terputus.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabaseClient
        .from("student_journals")
        .insert([{
          student_id: selectedStudent.id,
          teacher_id: employee.id,
          category,
          title,
          description
        }]);

      if (error) throw error;
      toast.success("Jurnal siswa berhasil dicatat!");
      
      // Reset form
      setSelectedStudent(null);
      setTitle("");
      setDescription("");
      setSearchQuery("");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan jurnal. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'Prestasi': return <Award className="w-4 h-4" />;
      case 'Pelanggaran': return <AlertTriangle className="w-4 h-4" />;
      case 'Kesehatan': return <HeartPulse className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
        <BookOpen className="w-6 h-6 text-blue-600" /> Jurnal Siswa
      </h2>

      {isBK && (
        <div className="flex bg-gray-200 p-1 rounded-xl mb-4">
          <button 
            onClick={() => setViewMode("input")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${viewMode === "input" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Input Jurnal
          </button>
          <button 
            onClick={() => setViewMode("rekap")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${viewMode === "rekap" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Rekap Jurnal (BK)
          </button>
        </div>
      )}

      {viewMode === "rekap" ? (
        <div className="space-y-3 pb-8">
          {allJournals.map(j => (
            <div key={j.id} className="bg-white p-4 rounded-2xl border shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  {getIcon(j.category)} {j.category}
                </div>
                <span className="text-[10px] text-gray-400">
                  {new Date(j.created_at).toLocaleDateString('id-ID')}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900">{j.title}</p>
              <p className="text-xs text-gray-600 mt-1">{j.description}</p>
              <div className="mt-3 pt-3 border-t flex justify-between items-center text-[10px] text-gray-500">
                <span>Siswa: <span className="font-bold text-gray-700">{j.students?.full_name}</span></span>
                <span>Pelapor: {j.employees?.full_name}</span>
              </div>
            </div>
          ))}
          {allJournals.length === 0 && (
            <div className="text-center p-8 text-gray-400 text-sm">Belum ada jurnal tercatat.</div>
          )}
        </div>
      ) : !selectedStudent ? (
        <div className="bg-white p-5 rounded-2xl shadow-sm border">
          <label className="block text-sm font-bold text-gray-900 mb-2">Cari Siswa</label>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik nama atau NIS siswa..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {searchQuery && (
            <div className="mt-3 border rounded-xl overflow-hidden divide-y max-h-60 overflow-y-auto">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student);
                      setSearchQuery("");
                    }}
                    className="w-full p-3 text-left hover:bg-blue-50 transition flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-sm text-gray-900">{student.full_name}</p>
                      <p className="text-[10px] text-gray-500">{student.classes?.name} - NIS: {student.nis}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  Siswa tidak ditemukan dalam penugasan Anda.
                </div>
              )}
            </div>
          )}
          {!isBK && students.length === 0 && (
            <p className="mt-3 text-xs text-amber-600">Belum ada kelas/siswa yang tertaut ke penugasan Anda.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-blue-50/50 flex justify-between items-start">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wide">Input Jurnal Untuk</p>
                <h3 className="font-bold text-gray-900">{selectedStudent.full_name}</h3>
                <p className="text-xs text-muted-foreground">{selectedStudent.classes?.name}</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedStudent(null)}
              className="text-xs font-bold text-gray-500 hover:text-gray-900 bg-white border px-2 py-1 rounded"
            >
              GANTI
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kategori Jurnal</label>
              <div className="grid grid-cols-2 gap-2">
                {['Pelanggaran', 'Prestasi', 'Kesehatan', 'Lainnya'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2 border rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all
                      ${category === cat ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}
                    `}
                  >
                    {getIcon(cat)}
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Judul / Kasus</label>
              <input 
                required
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Contoh: Terlambat masuk kelas"
                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Deskripsi / Catatan Tambahan</label>
              <textarea 
                required
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Tulis kronologi atau catatan selengkapnya..."
                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Jurnal"}
            </button>
          </form>

          {/* Recent Journals of this student */}
          {recentJournals.length > 0 && (
            <div className="border-t p-4 bg-gray-50">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Catatan Terakhir Siswa Ini</h4>
              <div className="space-y-3">
                {recentJournals.map(j => (
                  <div key={j.id} className="bg-white p-3 rounded-xl border shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                        {getIcon(j.category)} {j.category}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(j.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{j.title}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{j.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

// Simple ChevronRight icon component
const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
