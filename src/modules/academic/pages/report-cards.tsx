import React, { useState, useEffect } from "react";
import { useList } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Save, FilterX, FileBadge } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { Link } from "react-router-dom";

export const ReportCards: React.FC = () => {
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");

  const { data: semesters } = useList({ resource: "semesters", pagination: { mode: "off" } });
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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (semesters?.data) {
      const active = semesters.data.find(s => s.is_active);
      if (active && !selectedSemester) setSelectedSemester(active.id as string);
    }
  }, [semesters]);

  useEffect(() => {
    const fetchReportCards = async () => {
      if (!selectedSemester || !selectedClass) return;
      
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
      await supabaseClient.from("academic_report_cards").upsert(payload, {
        onConflict: "student_id, class_id, semester_id"
      });
      alert("Berhasil menyimpan data rapor!");
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data rapor.");
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
              {semesters?.data?.map(s => <option key={s.id} value={s.id}>{s.name} {s.is_active ? "(Aktif)" : ""}</option>)}
            </select>
          </div>
          
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kelas</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Pilih Kelas</option>
              {classes?.data?.map(c => <option key={c.id} value={c.id}>{c.name} - {c.units?.name}</option>)}
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
          <div className="p-4 border-b flex justify-between items-center bg-muted/20">
            <div>
              <h3 className="font-bold">Form Kelengkapan Rapor</h3>
              <p className="text-xs text-muted-foreground">Pilihan Predikat: A (Sangat Baik), B (Baik), C (Cukup), D (Kurang). Untuk PAUD gunakan BB, MB, BSH, BSB.</p>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-70"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Menyimpan..." : "Simpan Data Rapor"}
            </button>
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
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={reportCards[studentId]?.tahfidz_predicate || ""}
                          onChange={e => handleChange(studentId, "tahfidz_predicate", e.target.value)}
                          className="w-full border rounded text-center px-2 py-1.5 focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Predikat"
                        />
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
