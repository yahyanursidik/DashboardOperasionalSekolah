import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { BookOpen, Search, CheckCircle } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { toast } from "sonner";

export const TeacherQuran: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const [formData, setFormData] = useState({
    student_id: "",
    record_type: "tahfidz",
    surah_or_jilid: "",
    ayat_or_page: "",
    fluency_score: "Lancar",
    notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Simple fetch all active students for MVP. 
        // In real app, filter by classes this teacher teaches.
        const { data } = await supabaseClient
          .from("students")
          .select("id, full_name, nis, classes(name)")
          .eq("status", "active")
          .order("full_name");
        
        if (data) setStudents(data);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id || !formData.surah_or_jilid || !formData.ayat_or_page) {
      toast.error("Harap isi semua field yang wajib");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabaseClient
        .from("quran_records")
        .insert({
          ...formData,
          employee_id: employee.id,
          academic_year_id: activeYearId,
          semester_id: activeSemesterId,
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;
      
      toast.success("Capaian berhasil disimpan!");
      setFormData(prev => ({ ...prev, surah_or_jilid: "", ayat_or_page: "", notes: "" }));
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyimpan capaian");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s => s.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 space-y-6">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-6 h-6" />
          <h2 className="text-xl font-bold">Input Al-Qur'an</h2>
        </div>
        <p className="text-emerald-100 text-sm">Catat setoran hafalan dan perkembangan tahsin siswa dengan cepat.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden p-5 space-y-5">
        
        {/* Type selector */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button 
            type="button"
            onClick={() => setFormData(prev => ({...prev, record_type: 'tahfidz'}))}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.record_type === 'tahfidz' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}
          >
            Tahfidz (Hafalan)
          </button>
          <button 
            type="button"
            onClick={() => setFormData(prev => ({...prev, record_type: 'tahsin'}))}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.record_type === 'tahsin' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}
          >
            Tahsin (Bacaan)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Siswa <span className="text-red-500">*</span></label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select 
                className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                value={formData.student_id}
                onChange={e => setFormData({...formData, student_id: e.target.value})}
              >
                <option value="">-- Pilih Siswa --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.classes?.name || 'Tanpa Kelas'})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                {formData.record_type === 'tahfidz' ? 'Surah/Juz' : 'Jilid/Buku'} <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder={formData.record_type === 'tahfidz' ? 'Al-Mulk' : 'Iqro 4'}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.surah_or_jilid}
                onChange={e => setFormData({...formData, surah_or_jilid: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                {formData.record_type === 'tahfidz' ? 'Ayat' : 'Halaman'} <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder={formData.record_type === 'tahfidz' ? '1-15' : 'Hal 20'}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.ayat_or_page}
                onChange={e => setFormData({...formData, ayat_or_page: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Kelancaran <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {['Sangat Lancar', 'Lancar', 'Kurang Lancar', 'Mengulang'].map(score => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setFormData({...formData, fluency_score: score})}
                  className={`py-2 text-[11px] font-bold rounded-lg border transition-colors ${
                    formData.fluency_score === score 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Catatan Guru</label>
            <textarea 
              rows={2}
              placeholder="Catatan tambahan (opsional)..."
              className="w-full border rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            ></textarea>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-70"
          >
            <CheckCircle className="w-5 h-5" />
            {isSubmitting ? 'Menyimpan...' : 'Simpan Capaian'}
          </button>
        </form>

      </div>
    </div>
  );
};
