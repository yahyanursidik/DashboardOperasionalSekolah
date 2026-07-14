import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { CheckSquare, Info, Camera, Calendar, Star } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { toast } from "sonner";

export const TeacherPaud: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const [units, setUnits] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const [activeTab, setActiveTab] = useState<"jurnal" | "stppa">("jurnal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Jurnal
  const [jurnalData, setJurnalData] = useState({
    title: "",
    description: "",
    photo_url: ""
  });

  // Form STPPA
  const [stppaData, setStppaData] = useState({
    agama_moral: "BB",
    fisik_motorik: "BB",
    kognitif: "BB",
    bahasa: "BB",
    sosial_emosional: "BB",
    seni: "BB",
    narrative_report: ""
  });

  // Fetch Units on mount (Only PAUD)
  useEffect(() => {
    const fetchAssignments = async () => {
      let scheduleQuery = supabaseClient
        .from("employee_schedules")
        .select("class_id, classes(id, name, unit_id, units(id, name))")
        .eq("employee_id", employee.id)
        .not("class_id", "is", null);
      if (activeYearId) scheduleQuery = scheduleQuery.eq("academic_year_id", activeYearId);

      const { data: scheduleClasses } = await scheduleQuery;
      const { data: homeroomClasses } = await supabaseClient
        .from("classes")
        .select("id, name, unit_id, units(id, name)")
        .eq("homeroom_teacher_id", employee.id);

      const classMap = new Map<string, any>();
      [...(scheduleClasses || []).map((item: any) => item.classes), ...(homeroomClasses || [])]
        .filter(Boolean)
        .forEach((cls: any) => classMap.set(cls.id, cls));

      const assignedClasses = Array.from(classMap.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
      const unitMap = new Map<string, any>();
      assignedClasses.forEach((cls: any) => {
        if (cls.units?.id) unitMap.set(cls.units.id, cls.units);
      });

      setClasses(assignedClasses);
      setUnits(Array.from(unitMap.values()));

      if (!selectedUnitId && unitMap.size === 1) {
        setSelectedUnitId(Array.from(unitMap.keys())[0]);
      }
    };
    fetchAssignments();
  }, [activeYearId, employee.id]);

  // Fetch Classes when Unit changes
  useEffect(() => {
    if (!selectedUnitId) {
      setSelectedClassId("");
      return;
    }
    if (!classes.some((cls) => cls.unit_id === selectedUnitId && cls.id === selectedClassId)) {
      setSelectedClassId("");
    }
  }, [classes, selectedClassId, selectedUnitId]);

  const filteredClasses = classes.filter((cls) => !selectedUnitId || cls.unit_id === selectedUnitId);

  // Fetch Students when Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentId("");
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

  const handleJurnalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !jurnalData.title || !jurnalData.description) {
      toast.error("Harap isi semua field wajib (Siswa, Judul, Deskripsi)");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabaseClient
        .from("paud_activities")
        .insert({
          student_id: selectedStudentId,
          class_id: selectedClassId,
          employee_id: employee.id,
          academic_year_id: activeYearId,
          semester_id: activeSemesterId,
          date: new Date().toISOString().split('T')[0],
          title: jurnalData.title,
          description: jurnalData.description,
          photo_url: jurnalData.photo_url || null
        });

      if (error) throw error;
      toast.success("Jurnal Kegiatan berhasil disimpan!");
      setJurnalData({ title: "", description: "", photo_url: "" });
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyimpan jurnal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStppaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error("Harap pilih siswa terlebih dahulu");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabaseClient
        .from("paud_stppa_assessments")
        .insert({
          student_id: selectedStudentId,
          class_id: selectedClassId,
          employee_id: employee.id,
          academic_year_id: activeYearId,
          semester_id: activeSemesterId,
          date: new Date().toISOString().split('T')[0],
          ...stppaData
        });

      if (error) throw error;
      toast.success("Rapor STPPA berhasil disimpan!");
      setStppaData({
        agama_moral: "BB",
        fisik_motorik: "BB",
        kognitif: "BB",
        bahasa: "BB",
        sosial_emosional: "BB",
        seni: "BB",
        narrative_report: ""
      });
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyimpan rapor STPPA");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stppaOptions = ["BB", "MB", "BSH", "BSB"];

  return (
    <div className="p-4 space-y-6">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <CheckSquare className="w-6 h-6" />
          <h2 className="text-xl font-bold">Modul PAUD</h2>
        </div>
        <p className="text-purple-100 text-sm">Catat jurnal kegiatan harian dan capaian STPPA siswa KB/TK.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden p-5 space-y-5">
        
        {/* Type selector */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button 
            type="button"
            onClick={() => setActiveTab('jurnal')}
            className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'jurnal' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}
          >
            <Camera className="w-4 h-4" /> Jurnal Kegiatan
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('stppa')}
            className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'stppa' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}
          >
            <Star className="w-4 h-4" /> Rapor STPPA
          </button>
        </div>

        {/* Global Selectors */}
        <div className="grid grid-cols-2 gap-3 pb-4 border-b">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Unit</label>
            <select 
              className="w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
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
              className="w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              disabled={!selectedUnitId}
            >
              <option value="">-- Pilih Kelas --</option>
              {filteredClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Siswa</label>
            <select 
              className="w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              disabled={!selectedClassId}
            >
              <option value="">-- Pilih Siswa --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {classes.length === 0 && (
          <div className="rounded-xl border border-dashed bg-amber-50 p-4 text-sm text-amber-700">
            Belum ada kelas PAUD yang tertaut ke jadwal/wali kelas Anda.
          </div>
        )}

        {/* JURNAL TAB */}
        {activeTab === 'jurnal' && (
          <form onSubmit={handleJurnalSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Judul Kegiatan</label>
              <input 
                type="text"
                required
                placeholder="Contoh: Bermain Balok & Mengenal Warna"
                className="w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                value={jurnalData.title}
                onChange={e => setJurnalData({...jurnalData, title: e.target.value})}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Deskripsi Pengamatan</label>
              <textarea 
                required
                rows={3}
                placeholder="Tuliskan bagaimana proses belajar anak hari ini..."
                className="w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                value={jurnalData.description}
                onChange={e => setJurnalData({...jurnalData, description: e.target.value})}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex justify-between">
                <span>URL Foto Kegiatan</span>
                <span className="font-normal lowercase text-gray-400">opsional</span>
              </label>
              <input 
                type="url"
                placeholder="https://..."
                className="w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                value={jurnalData.photo_url}
                onChange={e => setJurnalData({...jurnalData, photo_url: e.target.value})}
              />
              <p className="text-[10px] text-gray-400 mt-1">Gunakan link eksternal (Google Drive / dll) untuk foto.</p>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || !selectedStudentId}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 mt-4"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Jurnal"}
            </button>
          </form>
        )}

        {/* STPPA TAB */}
        {activeTab === 'stppa' && (
          <form onSubmit={handleStppaSubmit} className="space-y-4">
            
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex items-start gap-2 text-sm text-purple-800 mb-4">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p>Pilih capaian tiap aspek. BB: Belum Berkembang, MB: Mulai Berkembang, BSH: Berkembang Sesuai Harapan, BSB: Berkembang Sangat Baik.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(["agama_moral", "fisik_motorik", "kognitif", "bahasa", "sosial_emosional", "seni"] as const).map(aspek => (
                <div key={aspek} className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    {aspek.replace("_", " ")}
                  </label>
                  <select 
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                    value={stppaData[aspek]}
                    onChange={e => setStppaData({...stppaData, [aspek]: e.target.value})}
                  >
                    {stppaOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 mt-4">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Laporan Naratif (Rapor)</label>
              <textarea 
                required
                rows={4}
                placeholder="Tuliskan laporan naratif perkembangan anak secara deskriptif..."
                className="w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                value={stppaData.narrative_report}
                onChange={e => setStppaData({...stppaData, narrative_report: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || !selectedStudentId}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 mt-4"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Asesmen STPPA"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
