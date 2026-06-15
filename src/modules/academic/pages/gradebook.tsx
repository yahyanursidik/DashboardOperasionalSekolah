import React, { useState, useEffect } from "react";
import { useList, useCustomMutation } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Save, FilterX } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";

const GRADE_TYPES = [
  { id: "tugas_1", label: "Tugas 1" },
  { id: "tugas_2", label: "Tugas 2" },
  { id: "uts", label: "UTS" },
  { id: "uas", label: "UAS" }
];

const PAUD_OPTIONS = ["", "BB", "MB", "BSH", "BSB"];

export const Gradebook: React.FC = () => {
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const { data: semesters } = useList({ resource: "semesters", pagination: { mode: "off" } });
  const { data: classes } = useList({ resource: "classes", meta: { select: "*, units(name)" }, pagination: { mode: "off" } });
  const { data: subjects } = useList({ resource: "subjects", pagination: { mode: "off" } });

  // Students in selected class
  const { data: students, isLoading: isLoadingStudents } = useList({
    resource: "students",
    filters: [
      { field: "class_id", operator: "eq", value: selectedClass },
      { field: "status", operator: "eq", value: "active" }
    ],
    queryOptions: { enabled: !!selectedClass },
    pagination: { mode: "off" }
  });

  // Fetch existing grades
  const [grades, setGrades] = useState<Record<string, string>>({}); // Key: `${studentId}_${gradeType}`, Value: score
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Set active semester by default
    if (semesters?.data) {
      const active = semesters.data.find(s => s.is_active);
      if (active && !selectedSemester) setSelectedSemester(active.id as string);
    }
  }, [semesters]);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!selectedSemester || !selectedClass || !selectedSubject) return;
      
      const response = await supabaseClient
        .from("academic_grades")
        .select("*")
        .eq("semester_id", selectedSemester)
        .eq("class_id", selectedClass)
        .eq("subject_id", selectedSubject);
      
      const data = response.data as any[];
      if (data) {
        const gradeMap: Record<string, string> = {};
        data.forEach(g => {
          gradeMap[`${g.student_id}_${g.grade_type}`] = g.score || "";
        });
        setGrades(gradeMap);
      }
    };
    fetchGrades();
  }, [selectedSemester, selectedClass, selectedSubject]);

  const handleGradeChange = (studentId: string, gradeType: string, value: string) => {
    setGrades(prev => ({
      ...prev,
      [`${studentId}_${gradeType}`]: value
    }));
  };

  const handleSaveAll = async () => {
    if (!selectedSemester || !selectedClass || !selectedSubject || !students?.data) return;
    
    setIsSaving(true);
    
    // Prepare upsert payload
    const payload = [];
    for (const student of students.data) {
      for (const type of GRADE_TYPES) {
        const score = grades[`${student.id}_${type.id}`];
        if (score !== undefined && score !== "") {
          payload.push({
            student_id: student.id,
            subject_id: selectedSubject,
            class_id: selectedClass,
            semester_id: selectedSemester,
            grade_type: type.id,
            score: score
          });
        }
      }
    }

    try {
      if (payload.length > 0) {
        await supabaseClient.from("academic_grades").upsert(payload, { 
          onConflict: "student_id, subject_id, class_id, semester_id, grade_type" 
        });
      }
      alert("Berhasil menyimpan seluruh nilai!");
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan nilai.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentClassObj = classes?.data?.find(c => c.id === selectedClass);
  const unitName = currentClassObj?.units?.name?.toLowerCase() || "";
  const className = currentClassObj?.name?.toLowerCase() || "";
  const isPaud = unitName.includes("paud") || unitName.includes("tk") || unitName.includes("kb") || className.includes("tk") || className.includes("paud");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Input Nilai Akademik (Gradebook)"
        description="Pilih kelas dan mata pelajaran untuk mulai menginput nilai."
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

          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mata Pelajaran</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Pilih Mata Pelajaran</option>
              {subjects?.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <button 
            onClick={() => { setSelectedClass(""); setSelectedSubject(""); }}
            className="px-4 py-2 border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2 h-[38px]"
          >
            <FilterX className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {selectedSemester && selectedClass && selectedSubject ? (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-muted/20">
            <div>
              <h3 className="font-bold">Form Input Nilai</h3>
              <p className="text-xs text-muted-foreground">
                {isPaud ? "Mode PAUD aktif: Masukkan nilai kualitatif (BB, MB, BSH, BSB)." : "Masukkan nilai angka (0-100)."}
              </p>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-70"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Menyimpan..." : "Simpan Semua Nilai"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3 w-32">NIS/NISN</th>
                  {GRADE_TYPES.map(type => (
                    <th key={type.id} className="px-4 py-3 w-32 text-center">{type.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingStudents ? (
                  <tr><td colSpan={7} className="text-center py-8">Memuat data siswa...</td></tr>
                ) : students?.data?.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8">Belum ada siswa di kelas ini.</td></tr>
                ) : (
                  students?.data?.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-center">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold">{student.full_name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{student.nis || "-"}</td>
                      {GRADE_TYPES.map(type => {
                        const studentId = student.id as string;
                        return (
                        <td key={type.id} className="px-4 py-2">
                          {isPaud ? (
                            <select
                              value={grades[`${studentId}_${type.id}`] || ""}
                              onChange={e => handleGradeChange(studentId, type.id, e.target.value)}
                              className="w-full border rounded text-center px-2 py-1.5 focus:ring-1 focus:ring-primary outline-none"
                            >
                              {PAUD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || "-"}</option>)}
                            </select>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={grades[`${studentId}_${type.id}`] || ""}
                              onChange={e => handleGradeChange(studentId, type.id, e.target.value)}
                              className="w-full border rounded text-center px-2 py-1.5 focus:ring-1 focus:ring-primary outline-none"
                              placeholder="0-100"
                            />
                          )}
                        </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 border border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <p className="text-muted-foreground font-medium">Silakan pilih Semester, Kelas, dan Mata Pelajaran di atas untuk mulai mengisi nilai.</p>
        </div>
      )}
    </div>
  );
};
