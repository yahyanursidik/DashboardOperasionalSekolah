import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Award, BookOpen, CheckCircle, ClipboardCheck, Info, ShieldCheck, Target, Users } from "lucide-react";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { toast } from "sonner";

const getPredicate = (score: number) => {
  if (score >= 90) return "Mumtaz (Istimewa)";
  if (score >= 80) return "Jayyid Jiddan (Sangat Baik)";
  if (score >= 70) return "Jayyid (Baik)";
  if (score >= 60) return "Maqbul (Cukup)";
  return "Rasib (Mengulang)";
};

const getStatus = (score: number) => {
  if (score >= 75) return "Lulus";
  if (score >= 60) return "Lulus Bersyarat";
  return "Mengulang";
};

export const TeacherQuran: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [mode, setMode] = useState<"record" | "assessment">("record");
  const [sourceMode, setSourceMode] = useState<"halaqoh" | "class">("halaqoh");
  const [programType, setProgramType] = useState<"tahfidz" | "tahsin">("tahfidz");
  const [units, setUnits] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [halaqohs, setHalaqohs] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState(employee.unit_id || "");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState("");
  const [lastRecord, setLastRecord] = useState<any>(null);
  const [studentTargets, setStudentTargets] = useState<any[]>([]);
  const [isLoadingLastRecord, setIsLoadingLastRecord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    student_id: "",
    surah_or_jilid: "",
    ayat_or_page: "",
    fluency_score: "Lancar",
    tajwid_score: "",
    makhroj_score: "",
    notes: "",
    title: "",
    score: "",
    status: "",
  });

  useEffect(() => {
    const fetchInitialData = async () => {
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
      setClasses(assignedClasses);

      const unitMap = new Map<string, any>();
      assignedClasses.forEach((cls: any) => {
        const unit = cls.units || (cls.unit_id === employee.unit_id ? employee.units : null);
        if (unit?.id) unitMap.set(unit.id, unit);
      });
      if (employee.unit_id && employee.units?.name) unitMap.set(employee.unit_id, { id: employee.unit_id, name: employee.units.name });
      setUnits(Array.from(unitMap.values()));

      let halaqohQuery = supabaseClient
        .from("tahfidz_halaqohs")
        .select("id, name, program_type, employee_id")
        .eq("employee_id", employee.id)
        .eq("program_type", programType)
        .order("name");
      if (activeYearId) halaqohQuery = halaqohQuery.eq("academic_year_id", activeYearId);
      if (activeSemesterId) halaqohQuery = halaqohQuery.eq("semester_id", activeSemesterId);
      const { data: halaqohData } = await halaqohQuery;
      setHalaqohs(halaqohData || []);
    };
    fetchInitialData();
  }, [activeSemesterId, activeYearId, employee.id, employee.unit_id, employee.units, programType]);

  useEffect(() => {
    if (selectedUnitId && !classes.some((cls) => cls.unit_id === selectedUnitId)) {
      setSelectedClassId("");
    }
  }, [classes, selectedUnitId]);

  const filteredClasses = useMemo(
    () => selectedUnitId ? classes.filter((cls) => cls.unit_id === selectedUnitId) : classes,
    [classes, selectedUnitId]
  );

  useEffect(() => {
    if (sourceMode !== "class" || !selectedClassId) {
      if (sourceMode === "class") setStudents([]);
      return;
    }
    const fetchStudents = async () => {
      const { data } = await supabaseClient
        .from("students")
        .select("id, full_name, nis, class_id, classes(name, unit_id, units(name))")
        .eq("class_id", selectedClassId)
        .eq("status", "active")
        .order("full_name");
      setStudents(data || []);
    };
    fetchStudents();
  }, [selectedClassId, sourceMode]);

  useEffect(() => {
    if (sourceMode !== "halaqoh" || !selectedHalaqohId) {
      if (sourceMode === "halaqoh") setMembers([]);
      return;
    }
    const fetchMembers = async () => {
      const { data } = await supabaseClient
        .from("tahfidz_halaqoh_members")
        .select("student_id, halaqoh_id, students(id, full_name, nis, class_id, classes(name, unit_id, units(name)))")
        .eq("halaqoh_id", selectedHalaqohId);
      setMembers(data || []);
    };
    fetchMembers();
  }, [selectedHalaqohId, sourceMode]);

  const studentOptions = useMemo(() => {
    if (sourceMode === "halaqoh") return members.map((member: any) => member.students).filter(Boolean);
    return students;
  }, [members, sourceMode, students]);

  const selectedStudent = studentOptions.find((student: any) => student.id === formData.student_id);

  useEffect(() => {
    if (!formData.student_id) {
      setLastRecord(null);
      setStudentTargets([]);
      return;
    }

    const fetchStudentContext = async () => {
      setIsLoadingLastRecord(true);
      try {
        const { data: recordData } = await supabaseClient
          .from("quran_records")
          .select("surah_or_jilid, ayat_or_page, date, fluency_score")
          .eq("student_id", formData.student_id)
          .eq("record_type", programType)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        setLastRecord(recordData || null);
        if (recordData && !formData.surah_or_jilid) {
          setFormData((prev) => ({ ...prev, surah_or_jilid: (recordData as any).surah_or_jilid }));
        }

        const targetTable = programType === "tahsin" ? "tahsin_student_targets" : "tahfidz_student_targets";
        let targetQuery = supabaseClient
          .from(targetTable)
          .select("id, description, target_amount, amount_unit, status")
          .eq("student_id", formData.student_id)
          .eq("target_type", programType)
          .order("created_at", { ascending: false });
        if (activeYearId) targetQuery = targetQuery.eq("academic_year_id", activeYearId);
        if (activeSemesterId) targetQuery = targetQuery.eq("semester_id", activeSemesterId);
        const { data: targetData } = await targetQuery;
        setStudentTargets(targetData || []);
      } catch {
        setLastRecord(null);
      } finally {
        setIsLoadingLastRecord(false);
      }
    };

    fetchStudentContext();
  }, [activeSemesterId, activeYearId, formData.student_id, programType]);

  const resetStudent = () => {
    setFormData((prev) => ({ ...prev, student_id: "", surah_or_jilid: "", ayat_or_page: "", notes: "", title: "", score: "", status: "" }));
    setLastRecord(null);
    setStudentTargets([]);
  };

  const handleSubmitRecord = async () => {
    if (!formData.student_id || !formData.surah_or_jilid || !formData.ayat_or_page) {
      toast.error("Lengkapi siswa, materi, dan halaman/ayat");
      return;
    }

    const { error } = await supabaseClient.from("quran_records").insert({
      student_id: formData.student_id,
      class_id: selectedStudent?.class_id || selectedClassId || null,
      halaqoh_id: sourceMode === "halaqoh" ? selectedHalaqohId : null,
      employee_id: employee.id,
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
      record_type: programType,
      date: new Date().toISOString().split("T")[0],
      surah_or_jilid: formData.surah_or_jilid,
      ayat_or_page: formData.ayat_or_page,
      fluency_score: formData.fluency_score,
      tajwid_score: formData.tajwid_score || null,
      makhroj_score: formData.makhroj_score || null,
      notes: formData.notes || null,
    });
    if (error) throw error;
    toast.success("Jurnal Qur'an berhasil disimpan");
    setLastRecord({ surah_or_jilid: formData.surah_or_jilid, ayat_or_page: formData.ayat_or_page, date: new Date().toISOString(), fluency_score: formData.fluency_score });
    setFormData((prev) => ({ ...prev, ayat_or_page: "", tajwid_score: "", makhroj_score: "", notes: "" }));
  };

  const handleSubmitAssessment = async () => {
    const score = Number(formData.score || 0);
    if (!formData.student_id || !formData.title || !score) {
      toast.error("Lengkapi siswa, judul ujian, dan nilai");
      return;
    }

    const { error } = await supabaseClient.from("quran_assessments").insert({
      student_id: formData.student_id,
      class_id: selectedStudent?.class_id || selectedClassId || null,
      employee_id: employee.id,
      date: new Date().toISOString().split("T")[0],
      assessment_type: programType === "tahsin" ? "tahsin_jilid" : "tahfidz_juz",
      title: formData.title,
      score,
      predicate: getPredicate(score),
      status: formData.status || getStatus(score),
      notes: formData.notes || null,
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
    });
    if (error) throw error;
    toast.success("Hasil ujian Qur'an berhasil disimpan");
    setFormData((prev) => ({ ...prev, title: "", score: "", status: "", notes: "" }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === "record") await handleSubmitRecord();
      else await handleSubmitAssessment();
    } catch (error) {
      console.error(error);
      toast.error(mode === "record" ? "Gagal menyimpan jurnal Qur'an" : "Gagal menyimpan hasil ujian");
    } finally {
      setIsSubmitting(false);
    }
  };

  const checklist = [
    { label: "Sumber siswa", done: sourceMode === "halaqoh" ? Boolean(selectedHalaqohId) : Boolean(selectedClassId) },
    { label: "Siswa", done: Boolean(formData.student_id) },
    { label: mode === "record" ? "Materi" : "Judul ujian", done: mode === "record" ? Boolean(formData.surah_or_jilid && formData.ayat_or_page) : Boolean(formData.title) },
    { label: mode === "record" ? "Kelancaran" : "Nilai", done: mode === "record" ? Boolean(formData.fluency_score) : Boolean(formData.score) },
  ];

  return (
    <div className="p-4 md:p-0 space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7" />
          <div>
            <h2 className="text-2xl font-black">Qur'an Pengajar</h2>
            <p className="text-sm text-emerald-100">Input jurnal Tahfidz/Tahsin, pantau target, dan catat ujian kenaikan.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {checklist.map((item) => (
          <div key={item.label} className="rounded-2xl border bg-white p-4 shadow-sm">
            <ShieldCheck className={`mb-2 h-5 w-5 ${item.done ? "text-emerald-600" : "text-gray-300"}`} />
            <p className="text-sm font-bold text-gray-900">{item.label}</p>
            <p className="text-xs text-gray-500">{item.done ? "Siap" : "Belum lengkap"}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
          <button type="button" onClick={() => setMode("record")} className={`rounded-lg py-2 text-sm font-bold ${mode === "record" ? "bg-white text-emerald-700 shadow" : "text-gray-500"}`}>
            Jurnal Harian
          </button>
          <button type="button" onClick={() => setMode("assessment")} className={`rounded-lg py-2 text-sm font-bold ${mode === "assessment" ? "bg-white text-emerald-700 shadow" : "text-gray-500"}`}>
            Ujian
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setProgramType("tahfidz"); resetStudent(); }} className={`rounded-xl border py-2 text-sm font-bold ${programType === "tahfidz" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "text-gray-500"}`}>
            Tahfidz
          </button>
          <button type="button" onClick={() => { setProgramType("tahsin"); resetStudent(); }} className={`rounded-xl border py-2 text-sm font-bold ${programType === "tahsin" ? "border-blue-500 bg-blue-50 text-blue-700" : "text-gray-500"}`}>
            Tahsin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Ambil siswa dari</label>
              <select value={sourceMode} onChange={(event) => { setSourceMode(event.target.value as any); resetStudent(); }} className="h-11 w-full rounded-xl border bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30">
                <option value="halaqoh">Halaqoh Qur'an</option>
                <option value="class">Kelas</option>
              </select>
            </div>

            {sourceMode === "halaqoh" ? (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Halaqoh {programType}</label>
                <select value={selectedHalaqohId} onChange={(event) => { setSelectedHalaqohId(event.target.value); resetStudent(); }} className="h-11 w-full rounded-xl border bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30">
                  <option value="">-- Pilih Halaqoh --</option>
                  {halaqohs.map((halaqoh) => <option key={halaqoh.id} value={halaqoh.id}>{halaqoh.name}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Unit</label>
                  <select value={selectedUnitId} onChange={(event) => { setSelectedUnitId(event.target.value); setSelectedClassId(""); resetStudent(); }} className="h-11 w-full rounded-xl border bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30">
                    <option value="">-- Pilih Unit --</option>
                    {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Kelas</label>
                  <select value={selectedClassId} onChange={(event) => { setSelectedClassId(event.target.value); resetStudent(); }} disabled={!selectedUnitId} className="h-11 w-full rounded-xl border bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50">
                    <option value="">-- Pilih Kelas --</option>
                    {filteredClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Siswa</label>
            <select value={formData.student_id} onChange={(event) => setFormData({ ...formData, student_id: event.target.value })} className="h-11 w-full rounded-xl border bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30">
              <option value="">{studentOptions.length ? "-- Pilih Siswa --" : "-- Pilih halaqoh/kelas terlebih dahulu --"}</option>
              {studentOptions.map((student: any) => <option key={student.id} value={student.id}>{student.full_name} ({student.classes?.name || "Tanpa kelas"})</option>)}
            </select>
            {sourceMode === "halaqoh" && halaqohs.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">Belum ada halaqoh {programType} yang ditugaskan kepada Anda.</p>
            )}
            {sourceMode === "class" && classes.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">Belum ada kelas yang tertaut ke jadwal/wali kelas Anda.</p>
            )}
          </div>

          {formData.student_id && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="flex items-start gap-2 text-xs text-emerald-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  {isLoadingLastRecord ? "Mengecek jurnal terakhir..." : lastRecord ? (
                    <>
                      <strong>Jurnal terakhir:</strong> {lastRecord.surah_or_jilid} ({lastRecord.ayat_or_page}) - {lastRecord.fluency_score}<br />
                      <span>Pada {new Date(lastRecord.date).toLocaleDateString("id-ID")}</span>
                    </>
                  ) : "Belum ada jurnal pada program ini."}
                </div>
              </div>
              {studentTargets.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {studentTargets.slice(0, 2).map((target: any) => (
                    <span key={target.id} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-emerald-700">
                      <Target className="h-3 w-3" /> {target.description}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === "record" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{programType === "tahfidz" ? "Surah/Juz" : "Jilid/Buku"}</label>
                  <input value={formData.surah_or_jilid} onChange={(event) => setFormData({ ...formData, surah_or_jilid: event.target.value })} placeholder={programType === "tahfidz" ? "Al-Mulk / Juz 29" : "Jilid 3"} className="h-11 w-full rounded-xl border bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{programType === "tahfidz" ? "Ayat" : "Halaman"}</label>
                  <input value={formData.ayat_or_page} onChange={(event) => setFormData({ ...formData, ayat_or_page: event.target.value })} placeholder={programType === "tahfidz" ? "1-15" : "Hal 20"} className="h-11 w-full rounded-xl border bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {["Sangat Lancar", "Lancar", "Kurang Lancar", "Mengulang"].map((score) => (
                  <button key={score} type="button" onClick={() => setFormData({ ...formData, fluency_score: score })} className={`rounded-lg border py-2 text-[11px] font-bold ${formData.fluency_score === score ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "text-gray-500"}`}>
                    {score}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={formData.tajwid_score} onChange={(event) => setFormData({ ...formData, tajwid_score: event.target.value })} placeholder="Nilai tajwid (opsional)" className="h-11 rounded-xl border bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30" />
                <input value={formData.makhroj_score} onChange={(event) => setFormData({ ...formData, makhroj_score: event.target.value })} placeholder="Nilai makhraj (opsional)" className="h-11 rounded-xl border bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} placeholder={programType === "tahsin" ? "Kenaikan Jilid 3" : "Tasmi Juz 30"} className="h-11 rounded-xl border bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30" />
                <input type="number" min="0" max="100" value={formData.score} onChange={(event) => setFormData({ ...formData, score: event.target.value, status: event.target.value ? getStatus(Number(event.target.value)) : "" })} placeholder="Nilai 0-100" className="h-11 rounded-xl border bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <select value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} className="h-11 w-full rounded-xl border bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30">
                <option value="">Status otomatis dari nilai</option>
                <option value="Lulus">Lulus</option>
                <option value="Lulus Bersyarat">Lulus Bersyarat</option>
                <option value="Mengulang">Mengulang</option>
              </select>
              {formData.score && <p className="text-xs text-gray-500">Predikat: <strong>{getPredicate(Number(formData.score))}</strong></p>}
            </>
          )}

          <textarea value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} rows={3} placeholder="Catatan pembinaan atau tindak lanjut..." className="w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-emerald-500/30" />

          <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60">
            {mode === "record" ? <CheckCircle className="h-5 w-5" /> : <Award className="h-5 w-5" />}
            {isSubmitting ? "Menyimpan..." : mode === "record" ? "Simpan Jurnal Qur'an" : "Simpan Hasil Ujian"}
          </button>
        </form>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { icon: Users, label: "Sumber siswa", value: sourceMode === "halaqoh" ? "Halaqoh" : "Kelas" },
          { icon: ClipboardCheck, label: "Program", value: programType === "tahfidz" ? "Tahfidz" : "Tahsin" },
          { icon: BookOpen, label: "Mode", value: mode === "record" ? "Jurnal harian" : "Ujian" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm">
            <Icon className="mb-2 h-5 w-5 text-emerald-600" />
            <p className="text-xs font-semibold text-gray-500">{label}</p>
            <p className="text-sm font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </section>
    </div>
  );
};
