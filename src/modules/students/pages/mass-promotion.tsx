import React, { useState, useMemo } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, CheckSquare, Square, FilterX, AlertCircle, Save, GraduationCap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabaseClient } from "../../../lib/supabase/client";

export const StudentMassPromotion: React.FC = () => {
  const navigate = useNavigate();
  const { data: user } = useGetIdentity<any>();

  // Filter state (Source)
  const [sourceUnitId, setSourceUnitId] = useState("");
  const [sourceClassId, setSourceClassId] = useState("");

  // Target state
  const [actionType, setActionType] = useState("Naik Kelas");
  const [targetAcademicYearId, setTargetAcademicYearId] = useState("");
  const [targetUnitId, setTargetUnitId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [notes, setNotes] = useState("");

  // UI state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch Master Data
  const { data: units } = useList({ resource: "units", pagination: { mode: "off" } });
  const { data: classes } = useList({ resource: "classes", pagination: { mode: "off" } });
  const { data: academicYears } = useList({ resource: "academic_years", pagination: { mode: "off" }, sorters: [{ field: "name", order: "desc" }] });

  // Fetch Students based on source filter
  const { data: students, isLoading: isLoadingStudents, refetch: refetchStudents } = useList({
    resource: "students",
    filters: [
      { field: "class_id", operator: "eq", value: sourceClassId },
      { field: "status", operator: "eq", value: "active" } // Only process active students
    ],
    queryOptions: {
      enabled: !!sourceClassId,
    },
    pagination: { mode: "off" }
  });

  const studentsList = students?.data || [];

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedStudentIds.length === studentsList.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(studentsList.map(s => String(s.id)));
    }
  };

  const toggleSelectStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(sId => sId !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  // If source class changes, reset selection
  React.useEffect(() => {
    setSelectedStudentIds(studentsList.map(s => String(s.id)));
  }, [studentsList.length]);

  const isGraduating = actionType === "Lulus" || actionType === "Pindah (Keluar)";

  const handleProcess = async () => {
    if (selectedStudentIds.length === 0) {
      alert("Pilih minimal satu siswa untuk diproses.");
      return;
    }
    if (!targetAcademicYearId) {
      alert("Tahun Ajaran tujuan wajib diisi.");
      return;
    }
    if (!isGraduating && (!targetUnitId || !targetClassId)) {
      alert("Unit dan Kelas tujuan wajib diisi.");
      return;
    }

    if (!confirm(`Anda yakin akan memproses ${selectedStudentIds.length} siswa dengan status "${actionType}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setIsProcessing(true);
    setProcessResult(null);

    try {
      // 1. Prepare history payload
      const historyPayload = selectedStudentIds.map(studentId => {
        // Find the current student data just in case
        const student = studentsList.find(s => s.id === studentId);
        return {
          student_id: studentId,
          academic_year_id: targetAcademicYearId,
          unit_id: isGraduating ? student?.unit_id : targetUnitId,
          class_id: isGraduating ? null : targetClassId,
          status: actionType,
          notes: notes || null,
          created_by: user?.id || null
        };
      });

      // Execute insert to history
      const { error: historyError } = await supabaseClient
        .from("student_academic_history")
        .insert(historyPayload);

      if (historyError) throw historyError;

      // 2. Prepare student updates
      let newStudentStatus = "active";
      if (actionType === "Lulus") newStudentStatus = "graduated";
      else if (actionType === "Pindah (Keluar)") newStudentStatus = "transferred";

      // Execute update to students table using .in()
      const { error: updateError } = await supabaseClient
        .from("students")
        .update({
          unit_id: isGraduating ? undefined : targetUnitId, // we don't change unit if graduating, or maybe keep it as is
          class_id: isGraduating ? null : targetClassId,
          status: newStudentStatus
        })
        .in("id", selectedStudentIds);

      if (updateError) throw updateError;

      setProcessResult({
        success: true,
        message: `Berhasil memproses ${selectedStudentIds.length} siswa dengan status ${actionType}.`
      });
      
      // Refresh list
      refetchStudents();
      setSelectedStudentIds([]);
      setNotes("");

    } catch (error: any) {
      console.error(error);
      setProcessResult({
        success: false,
        message: `Gagal memproses: ${error.message || "Kesalahan tidak diketahui"}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aksi Massal: Kenaikan & Kelulusan"
        description="Pindahkan siswa ke kelas baru atau set kelulusan secara massal untuk satu kelas."
        action={
          <Link
            to="/students"
            className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
        }
      />

      {processResult && (
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${processResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <h4 className="font-semibold">{processResult.success ? 'Berhasil' : 'Gagal'}</h4>
            <p className="text-sm">{processResult.message}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Target & Settings */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* STEP 1: SOURCE */}
          <div className="bg-card rounded-xl border shadow-sm p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-primary border-b pb-3">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              Pilih Kelas Asal
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Unit Sekolah Asal</label>
                <select 
                  value={sourceUnitId} 
                  onChange={(e) => {
                    setSourceUnitId(e.target.value);
                    setSourceClassId(""); // Reset class when unit changes
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">-- Pilih Unit --</option>
                  {units?.data?.map(u => <option key={u.id} value={u.id as string}>{u.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Kelas Asal</label>
                <select 
                  value={sourceClassId} 
                  onChange={(e) => setSourceClassId(e.target.value)}
                  disabled={!sourceUnitId}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes?.data?.filter((c: any) => c.unit_id === sourceUnitId).map(c => <option key={c.id} value={c.id as string}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* STEP 2: TARGET */}
          <div className={`bg-card rounded-xl border shadow-sm p-5 space-y-4 transition-opacity ${!sourceClassId ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="font-semibold flex items-center gap-2 text-emerald-600 border-b pb-3">
              <span className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
              Aksi & Tujuan
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status Aksi</label>
                <select 
                  value={actionType} 
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 bg-emerald-50/50"
                >
                  <option value="Naik Kelas">Naik Kelas (ke kelas tingkat selanjutnya)</option>
                  <option value="Tinggal Kelas">Tinggal Kelas (tetap di tingkat sama)</option>
                  <option value="Lulus">Lulus Sekolah</option>
                  <option value="Pindah Jenjang">Pindah Jenjang (cth: PAUD ke SD)</option>
                  <option value="Pindah (Keluar)">Pindah Sekolah (Keluar)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Tahun Ajaran Baru</label>
                <select 
                  value={targetAcademicYearId} 
                  onChange={(e) => setTargetAcademicYearId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">-- Pilih Tahun Ajaran Baru --</option>
                  {academicYears?.data?.map((ay: any) => (
                    <option key={ay.id} value={ay.id}>{ay.name} {ay.is_active ? '(Aktif)' : ''}</option>
                  ))}
                </select>
              </div>

              {!isGraduating && (
                <div className="p-3 bg-muted/30 rounded-lg border border-dashed space-y-3">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Penempatan Tujuan</p>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Unit Sekolah Tujuan</label>
                    <select 
                      value={targetUnitId} 
                      onChange={(e) => {
                        setTargetUnitId(e.target.value);
                        setTargetClassId("");
                      }}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50"
                    >
                      <option value="">-- Pilih Unit --</option>
                      {units?.data?.map(u => <option key={u.id} value={u.id as string}>{u.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Kelas Tujuan</label>
                    <select 
                      value={targetClassId} 
                      onChange={(e) => setTargetClassId(e.target.value)}
                      disabled={!targetUnitId}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {classes?.data?.filter((c: any) => c.unit_id === targetUnitId).map(c => <option key={c.id} value={c.id as string}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {isGraduating && (
                <div className="p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm flex items-start gap-2">
                  <GraduationCap className="w-5 h-5 shrink-0" />
                  <p>Siswa yang diproses akan diubah statusnya menjadi <strong>{actionType}</strong> dan dicabut dari penempatan kelas mana pun.</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">Keterangan Tambahan (Opsional)</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan untuk riwayat ini..."
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Students List & Execution */}
        <div className={`lg:col-span-2 space-y-4 transition-opacity ${!sourceClassId ? 'opacity-50 pointer-events-none' : ''}`}>
          
          {/* STEP 3: SELECT STUDENTS */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
            <div className="p-4 border-b flex items-center justify-between bg-muted/20">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                Pilih Siswa ({selectedStudentIds.length}/{studentsList.length})
              </h3>
              
              <button 
                onClick={toggleSelectAll}
                className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                disabled={studentsList.length === 0}
              >
                {selectedStudentIds.length === studentsList.length ? (
                  <><CheckSquare className="w-4 h-4 text-primary" /> Deselect All</>
                ) : (
                  <><Square className="w-4 h-4" /> Select All</>
                )}
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              {isLoadingStudents ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  Memuat data siswa...
                </div>
              ) : studentsList.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                  <FilterX className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">Tidak ada siswa aktif di kelas ini.</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Silakan pilih kelas lain dari panel kiri.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {studentsList.map((student: any) => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    return (
                      <div 
                        key={student.id} 
                        onClick={() => toggleSelectStudent(student.id)}
                        className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                      >
                        <button className="shrink-0 text-muted-foreground">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        <div>
                          <p className={`font-semibold ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">NIS: {student.nis || "-"} &bull; {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* STEP 4: EXECUTE */}
            <div className="p-4 border-t bg-background">
              <button
                onClick={handleProcess}
                disabled={isProcessing || selectedStudentIds.length === 0 || !targetAcademicYearId || (!isGraduating && (!targetUnitId || !targetClassId))}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Memproses {selectedStudentIds.length} Siswa...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Proses Massal ({selectedStudentIds.length} Siswa)
                  </>
                )}
              </button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Pastikan pilihan Kelas Tujuan dan Tahun Ajaran sudah benar sebelum memproses.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
