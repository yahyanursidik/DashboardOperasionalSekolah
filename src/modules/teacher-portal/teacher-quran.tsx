import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { BookOpen, CheckCircle, Info } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { toast } from "sonner";

export const TeacherQuran: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const [units, setUnits] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  
  const [lastRecord, setLastRecord] = useState<any>(null);
  const [isLoadingLastRecord, setIsLoadingLastRecord] = useState(false);

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

  // Fetch Units on mount
  useEffect(() => {
    const fetchUnits = async () => {
      const { data } = await supabaseClient.from("units").select("id, name").order("name");
      if (data) setUnits(data);
    };
    fetchUnits();
  }, []);

  // Fetch Classes when Unit changes
  useEffect(() => {
    if (!selectedUnitId) {
      setClasses([]);
      setSelectedClassId("");
      return;
    }
    const fetchClasses = async () => {
      const { data } = await supabaseClient.from("classes").select("id, name").eq("unit_id", selectedUnitId).order("name");
      if (data) setClasses(data);
    };
    fetchClasses();
  }, [selectedUnitId]);

  // Fetch Students when Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setFormData(prev => ({ ...prev, student_id: "" }));
      return;
    }
    const fetchStudents = async () => {
      const { data } = await supabaseClient
        .from("students")
        .select("id, full_name")
        .eq("class_id", selectedClassId)
        .eq("status", "active")
        .order("full_name");
      if (data) setStudents(data);
    };
    fetchStudents();
  }, [selectedClassId]);

  // Fetch Last Record when Student and Record Type changes
  useEffect(() => {
    if (!formData.student_id) {
      setLastRecord(null);
      return;
    }
    
    const fetchLastRecord = async () => {
      setIsLoadingLastRecord(true);
      try {
        const { data } = await supabaseClient
          .from("quran_records")
          .select("surah_or_jilid, ayat_or_page, date")
          .eq("student_id", formData.student_id)
          .eq("record_type", formData.record_type)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        setLastRecord(data || null);
        
        // Auto-fill surah/jilid based on last record to save time
        if (data && !formData.surah_or_jilid) {
          setFormData(prev => ({ ...prev, surah_or_jilid: (data as any).surah_or_jilid }));
        }
      } catch (e) {
        setLastRecord(null);
      } finally {
        setIsLoadingLastRecord(false);
      }
    };
    
    fetchLastRecord();
  }, [formData.student_id, formData.record_type]);

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
          class_id: selectedClassId,
          employee_id: employee.id,
          academic_year_id: activeYearId,
          semester_id: activeSemesterId,
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;
      
      toast.success("Capaian berhasil disimpan!");
      
      // Update last record to the one just submitted
      setLastRecord({
        surah_or_jilid: formData.surah_or_jilid,
        ayat_or_page: formData.ayat_or_page,
        date: new Date().toISOString()
      });
      
      // Clear specific fields
      setFormData(prev => ({ ...prev, ayat_or_page: "", notes: "" }));
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyimpan capaian");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          
          {/* Unit & Class Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Unit</label>
              <select 
                className="w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                value={selectedUnitId}
                onChange={e => setSelectedUnitId(e.target.value)}
              >
                <option value="">-- Pilih Unit --</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Kelas</label>
              <select 
                className="w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none disabled:opacity-50"
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                disabled={!selectedUnitId}
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Siswa <span className="text-red-500">*</span></label>
            <select 
              className="w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none disabled:opacity-50"
              value={formData.student_id}
              onChange={e => setFormData({...formData, student_id: e.target.value})}
              disabled={!selectedClassId}
            >
              <option value="">{selectedClassId ? "-- Pilih Siswa --" : "-- Pilih Kelas Terlebih Dahulu --"}</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>

          {/* Last Record Info */}
          {formData.student_id && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800">
                {isLoadingLastRecord ? (
                  "Mengecek setoran terakhir..."
                ) : lastRecord ? (
                  <>
                    <strong>Setoran terakhir:</strong> {lastRecord.surah_or_jilid} (Ayat/Hal: {lastRecord.ayat_or_page}) <br/>
                    <span className="text-emerald-600/80">Pada tanggal: {new Date(lastRecord.date).toLocaleDateString('id-ID')}</span>
                  </>
                ) : (
                  "Belum ada riwayat setoran di tipe ini."
                )}
              </div>
            </div>
          )}

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
