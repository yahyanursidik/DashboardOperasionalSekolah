import React, { useState, useEffect, useMemo } from "react";
import { useList } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Save, FilterX, FileBadge, WandSparkles } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export const ReportCards: React.FC = () => {
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");

  const { data: semesters } = useList({ resource: "semesters", meta: { select: "*, academic_years(name)" }, pagination: { mode: "off" } });
  const { data: classes } = useList({ resource: "classes", meta: { select: "*, units(name)" }, pagination: { mode: "off" } });

  const { data: students, isLoading: isLoadingStudents } = useList({
    resource: "students",
    filters: [
      { field: "class_id", operator: "eq", value: selectedClass },
      { field: "status", operator: "eq", value: "active" }
    ],
    queryOptions: { enabled: !!selectedClass },
    pagination: { mode: "off" }
  });

  const [reportCards, setReportCards] = useState<Record<string, any>>({});
  const [quranRecommendations, setQuranRecommendations] = useState<Record<string, { tahsin?: string; tahfidz?: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const currentSemester = semesters?.data?.find((semester: any) => String(semester.id) === String(selectedSemester));
  const availableClasses = useMemo(
    () => (classes?.data || []).filter((item: any) => !currentSemester?.academic_year_id || item.academic_year_id === currentSemester.academic_year_id),
    [classes?.data, currentSemester?.academic_year_id],
  );

  useEffect(() => {
    if (semesters?.data) {
      const active = semesters.data.find(s => s.is_active);
      if (active && !selectedSemester) setSelectedSemester(active.id as string);
    }
  }, [semesters]);

  useEffect(() => {
    if (selectedClass && !availableClasses.some((item: any) => String(item.id) === String(selectedClass))) {
      setSelectedClass("");
      setReportCards({});
    }
  }, [availableClasses, selectedClass]);

  useEffect(() => {
    const fetchReportCards = async () => {
      if (!selectedSemester || !selectedClass) {
        setQuranRecommendations({});
        return;
      }
      
      const response = await supabaseClient
        .from("academic_report_cards")
        .select("*")
        .eq("semester_id", selectedSemester)
        .eq("class_id", selectedClass);
      
      const data = response.data as any[];
      if (data) {
        const rcMap: Record<string, any> = {};
        data.forEach(rc => {
          rcMap[rc.student_id] = rc;
        });
        setReportCards(rcMap);
      }

      const assessmentResponse = await supabaseClient
        .from("quran_assessments")
        .select("student_id, assessment_type, predicate, score, status, date, subject_id, subjects(name, quran_program_type)")
        .eq("semester_id", selectedSemester)
        .eq("class_id", selectedClass)
        .not("subject_id", "is", null)
        .in("status", ["Lulus", "Lulus Bersyarat"])
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      const recommendationMap: Record<string, { tahsin?: string; tahfidz?: string }> = {};
      (assessmentResponse.data || []).forEach((assessment: any) => {
        const program = assessment.assessment_type === "tahsin_jilid" ? "tahsin" : "tahfidz";
        const current = recommendationMap[assessment.student_id] || {};
        if (!current[program]) current[program] = assessment.predicate || String(assessment.score || "");
        recommendationMap[assessment.student_id] = current;
      });
      setQuranRecommendations(recommendationMap);
    };
    fetchReportCards();
  }, [selectedSemester, selectedClass]);

  const handleChange = (studentId: string, field: string, value: string) => {
    setReportCards(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value
      }
    }));
  };

  const applyQuranRecommendations = () => {
    let applied = 0;
    setReportCards((current) => {
      const next = { ...current };
      Object.entries(quranRecommendations).forEach(([studentId, recommendation]) => {
        const row = { ...(next[studentId] || {}) };
        if (!row.tahsin_predicate && recommendation.tahsin) {
          row.tahsin_predicate = recommendation.tahsin;
          applied += 1;
        }
        if (!row.tahfidz_predicate && recommendation.tahfidz) {
          row.tahfidz_predicate = recommendation.tahfidz;
          applied += 1;
        }
        next[studentId] = row;
      });
      return next;
    });
    toast.success(applied ? `${applied} rekomendasi Qur'an diterapkan.` : "Tidak ada kolom kosong yang perlu diisi.", {
      description: "Data yang sudah diisi sebelumnya tidak ditimpa.",
    });
  };

  const handleSaveAll = async () => {
    if (!selectedSemester || !selectedClass || !students?.data) return;
    
    setIsSaving(true);
    const payload = students.data.map(student => {
      const rc = reportCards[student.id as string] || {};
      return {
        student_id: student.id,
        class_id: selectedClass,
        semester_id: selectedSemester,
        spiritual_predicate: rc.spiritual_predicate || "",
        social_predicate: rc.social_predicate || "",
        tahsin_predicate: rc.tahsin_predicate || "",
        tahfidz_predicate: rc.tahfidz_predicate || "",
        extracurricular: rc.extracurricular || "",
        homeroom_notes: rc.homeroom_notes || ""
      };
    });

    try {
      const { error } = await supabaseClient.from("academic_report_cards").upsert(payload, {
        onConflict: "student_id, class_id, semester_id"
      });
      if (error) throw error;
      toast.success("Kelengkapan rapor berhasil disimpan.");
    } catch (error: any) {
      toast.error("Kelengkapan rapor belum dapat disimpan.", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Rapor Siswa"
        description="Kelola catatan wali kelas, predikat sikap, tahsin, dan tahfidz."
      />

      <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Semester Aktif</label>
            <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Pilih Semester</option>
              {semesters?.data?.map((s: any) => <option key={s.id} value={s.id}>{s.academic_years?.name || "Tahun ajaran"} - {s.name} {s.is_active ? "(Aktif)" : ""}</option>)}
            </select>
          </div>
          
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kelas</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Pilih Kelas</option>
              {availableClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name} - {c.units?.name}</option>)}
            </select>
          </div>

          <button 
            onClick={() => { setSelectedClass(""); }}
            className="px-4 py-2 border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2 h-[38px]"
          >
            <FilterX className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {selectedSemester && selectedClass ? (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b flex flex-wrap justify-between items-center gap-3 bg-muted/20">
            <div>
              <h3 className="font-bold">Form Kelengkapan Rapor</h3>
              <p className="text-xs text-muted-foreground">Pilihan Predikat: A (Sangat Baik), B (Baik), C (Cukup), D (Kurang). Untuk PAUD gunakan BB, MB, BSH, BSB.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyQuranRecommendations}
                disabled={Object.keys(quranRecommendations).length === 0}
                className="flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                <WandSparkles className="h-4 w-4 text-emerald-600" /> Terapkan Hasil Qur'an
              </button>
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-70"
              >
                <Save className="w-4 h-4" /> {isSaving ? "Menyimpan..." : "Simpan Data Rapor"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3 min-w-[200px]">Nama Siswa</th>
                  <th className="px-4 py-3 w-28 text-center" title="Sikap Spiritual">Spiritual</th>
                  <th className="px-4 py-3 w-28 text-center" title="Sikap Sosial">Sosial</th>
                  <th className="px-4 py-3 w-28 text-center">Tahsin</th>
                  <th className="px-4 py-3 w-28 text-center">Tahfidz</th>
                  <th className="px-4 py-3 min-w-[150px]">Ekstrakurikuler</th>
                  <th className="px-4 py-3 min-w-[200px]">Catatan Wali Kelas</th>
                  <th className="px-4 py-3 w-24 text-center">Cetak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingStudents ? (
                  <tr><td colSpan={9} className="text-center py-8">Memuat data siswa...</td></tr>
                ) : students?.data?.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8">Belum ada siswa di kelas ini.</td></tr>
                ) : (
                  students?.data?.map((student, idx) => {
                    const studentId = student.id as string;
                    return (
                    <tr key={student.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-center">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold">{student.full_name}</td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={reportCards[studentId]?.spiritual_predicate || ""}
                          onChange={e => handleChange(studentId, "spiritual_predicate", e.target.value)}
                          className="w-full border rounded text-center px-2 py-1.5 focus:ring-1 focus:ring-primary outline-none"
                          placeholder="A/B/C..."
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={reportCards[studentId]?.social_predicate || ""}
                          onChange={e => handleChange(studentId, "social_predicate", e.target.value)}
                          className="w-full border rounded text-center px-2 py-1.5 focus:ring-1 focus:ring-primary outline-none"
                          placeholder="A/B/C..."
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={reportCards[studentId]?.tahsin_predicate || ""}
                          onChange={e => handleChange(studentId, "tahsin_predicate", e.target.value)}
                          className="w-full border rounded text-center px-2 py-1.5 focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Predikat"
                        />
                        {quranRecommendations[studentId]?.tahsin && <p className="mt-1 text-[10px] font-semibold text-emerald-700">Saran: {quranRecommendations[studentId].tahsin}</p>}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={reportCards[studentId]?.tahfidz_predicate || ""}
                          onChange={e => handleChange(studentId, "tahfidz_predicate", e.target.value)}
                          className="w-full border rounded text-center px-2 py-1.5 focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Predikat"
                        />
                        {quranRecommendations[studentId]?.tahfidz && <p className="mt-1 text-[10px] font-semibold text-emerald-700">Saran: {quranRecommendations[studentId].tahfidz}</p>}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={reportCards[studentId]?.extracurricular || ""}
                          onChange={e => handleChange(studentId, "extracurricular", e.target.value)}
                          className="w-full border rounded px-2 py-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          placeholder="Pramuka (B)..."
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={reportCards[studentId]?.homeroom_notes || ""}
                          onChange={e => handleChange(studentId, "homeroom_notes", e.target.value)}
                          className="w-full border rounded px-2 py-1.5 focus:ring-1 focus:ring-primary outline-none text-xs"
                          placeholder="Tingkatkan belajarnya..."
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Link
                          to={`/academic/report-print?student_id=${studentId}&semester_id=${selectedSemester}&class_id=${selectedClass}`}
                          target="_blank"
                          className="inline-flex items-center justify-center p-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded transition-colors"
                          title="Cetak Rapor"
                        >
                          <FileBadge className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 border border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <p className="text-muted-foreground font-medium">Silakan pilih Semester dan Kelas di atas.</p>
        </div>
      )}
    </div>
  );
};
