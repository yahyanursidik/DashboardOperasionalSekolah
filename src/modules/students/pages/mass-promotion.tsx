import React, { useState, useMemo } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  ArrowLeft,
  CheckSquare,
  Square,
  FilterX,
  AlertCircle,
  Save,
  GraduationCap,
  AlertTriangle,
  Loader2,
  Search,
  Users,
  School,
  ClipboardCheck,
  ArrowRight,
  History,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabaseClient } from "../../../lib/supabase/client";
import { toast } from "sonner";

const ConfirmProcessModal: React.FC<{
  isOpen: boolean;
  count: number;
  actionType: string;
  sourceLabel: string;
  targetLabel: string;
  yearLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}> = ({ isOpen, count, actionType, sourceLabel, targetLabel, yearLabel, onConfirm, onCancel, isProcessing }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isProcessing && onCancel()}></div>
      <div className="relative bg-card w-full max-w-md rounded-xl shadow-xl border overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold mb-2">Konfirmasi Proses Massal</h3>
          <p className="text-muted-foreground text-sm">
            Anda akan memproses <span className="font-semibold text-foreground">{count} siswa</span> dengan status <span className="font-bold text-foreground">"{actionType}"</span>.
            Tindakan ini akan membuat riwayat akademik baru dan mengubah status penempatan siswa.
          </p>
          <div className="mt-4 text-left bg-muted/40 rounded-lg border p-3 text-xs space-y-2">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Dari</span><span className="font-semibold text-right">{sourceLabel}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Ke</span><span className="font-semibold text-right">{targetLabel}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Tahun Ajaran</span><span className="font-semibold text-right">{yearLabel}</span></div>
          </div>
        </div>
        <div className="flex bg-muted/30 p-4 border-t gap-3 justify-end">
          <button onClick={onCancel} disabled={isProcessing} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">Batal</button>
          <button onClick={onConfirm} disabled={isProcessing} className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 transition-colors flex items-center gap-2">
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            Proses Sekarang
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [studentSearch, setStudentSearch] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<{ success: boolean; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean }>({ isOpen: false });

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
    meta: { select: "id, full_name, nis, nisn, gender, unit_id, class_id, status" },
    sorters: [{ field: "full_name", order: "asc" }],
    pagination: { mode: "off" }
  });

  const studentsList = students?.data || [];
  const selectedStudents = useMemo(
    () => studentsList.filter((student: any) => selectedStudentIds.includes(String(student.id))),
    [studentsList, selectedStudentIds]
  );
  const selectedMaleCount = selectedStudents.filter((student: any) => student.gender === "L").length;
  const selectedFemaleCount = selectedStudents.filter((student: any) => student.gender === "P").length;
  const visibleStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();
    if (!search) return studentsList;
    return studentsList.filter((student: any) => {
      return (
        String(student.full_name || "").toLowerCase().includes(search) ||
        String(student.nis || "").toLowerCase().includes(search) ||
        String(student.nisn || "").toLowerCase().includes(search)
      );
    });
  }, [studentsList, studentSearch]);
  const sourceUnit = units?.data?.find((unit: any) => unit.id === sourceUnitId);
  const targetUnit = units?.data?.find((unit: any) => unit.id === targetUnitId);
  const sourceClass = classes?.data?.find((klass: any) => klass.id === sourceClassId);
  const targetClass = classes?.data?.find((klass: any) => klass.id === targetClassId);
  const targetAcademicYear = academicYears?.data?.find((year: any) => year.id === targetAcademicYearId);
  const isGraduating = actionType === "Lulus" || actionType === "Pindah (Keluar)";
  const isSameClassTarget = !isGraduating && sourceClassId && targetClassId && sourceClassId === targetClassId;
  const isSameClassAllowed = actionType === "Tinggal Kelas";
  const hasInvalidSameTarget = Boolean(isSameClassTarget && !isSameClassAllowed);
  const sourceLabel = sourceClass ? `${sourceUnit?.name || "Unit"} - ${sourceClass.name}` : "Belum dipilih";
  const targetLabel = isGraduating
    ? `${actionType}; siswa dikeluarkan dari rombel aktif`
    : targetClass
      ? `${targetUnit?.name || "Unit"} - ${targetClass.name}`
      : "Belum dipilih";
  const actionLabelMap: Record<string, string> = {
    "Naik Kelas": "Promosi ke rombel tujuan",
    "Tinggal Kelas": "Tetap/ulang di rombel tujuan",
    "Lulus": "Kelulusan dan arsip alumni",
    "Pindah Jenjang": "Mutasi antar jenjang/unit",
    "Pindah (Keluar)": "Mutasi keluar sekolah",
  };

  // Toggle selection
  const toggleSelectAll = () => {
    const visibleIds = visibleStudents.map((student: any) => String(student.id));
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id: string) => selectedStudentIds.includes(id));
    if (allVisibleSelected) {
      setSelectedStudentIds(selectedStudentIds.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedStudentIds(Array.from(new Set([...selectedStudentIds, ...visibleIds])));
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

  React.useEffect(() => {
    if (sourceUnitId && !targetUnitId) {
      setTargetUnitId(sourceUnitId);
    }
  }, [sourceUnitId, targetUnitId]);

  const handlePreProcess = () => {
    if (selectedStudentIds.length === 0) {
      toast.error("Pilih minimal satu siswa untuk diproses.");
      return;
    }
    if (!targetAcademicYearId) {
      toast.error("Tahun Ajaran tujuan wajib diisi.");
      return;
    }
    if (!isGraduating && (!targetUnitId || !targetClassId)) {
      toast.error("Unit dan Kelas tujuan wajib diisi.");
      return;
    }
    if (hasInvalidSameTarget) {
      toast.error("Kelas tujuan tidak boleh sama dengan kelas asal untuk aksi ini.");
      return;
    }
    
    setConfirmModal({ isOpen: true });
  };

  const executeProcess = async () => {
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

      const updatePayload: Record<string, any> = {
        class_id: isGraduating ? null : targetClassId,
        status: newStudentStatus
      };

      if (!isGraduating) {
        updatePayload.unit_id = targetUnitId;
      }

      // Execute update to students table using .in()
      const { error: updateError } = await supabaseClient
        .from("students")
        .update(updatePayload)
        .in("id", selectedStudentIds);

      if (updateError) throw updateError;

      toast.success(`Berhasil memproses ${selectedStudentIds.length} siswa.`);
      setProcessResult({
        success: true,
        message: `Berhasil memproses ${selectedStudentIds.length} siswa dengan status ${actionType}.`
      });
      
      // Refresh list
      refetchStudents();
      setSelectedStudentIds([]);
      setNotes("");
      setConfirmModal({ isOpen: false });

    } catch (error: any) {
      console.error(error);
      toast.error("Gagal memproses data.");
      setProcessResult({
        success: false,
        message: `Gagal memproses: ${error.message || "Kesalahan tidak diketahui"}`
      });
      setConfirmModal({ isOpen: false });
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            label: "Kelas Asal",
            value: sourceClass?.name || "-",
            helper: sourceUnit?.name || "Pilih unit dan kelas asal",
            icon: School,
            tone: "bg-blue-50 text-blue-700 border-blue-100",
          },
          {
            label: "Siswa Dipilih",
            value: selectedStudentIds.length,
            helper: `${studentsList.length} siswa aktif di kelas asal`,
            icon: Users,
            tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
          },
          {
            label: "Aksi Akademik",
            value: actionType,
            helper: actionLabelMap[actionType] || "Riwayat akademik massal",
            icon: ClipboardCheck,
            tone: "bg-violet-50 text-violet-700 border-violet-100",
          },
          {
            label: "Tujuan",
            value: isGraduating ? actionType : (targetClass?.name || "-"),
            helper: targetAcademicYear?.name || "Tahun ajaran belum dipilih",
            icon: ArrowRight,
            tone: hasInvalidSameTarget ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-amber-50 text-amber-700 border-amber-100",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`rounded-lg border p-4 ${item.tone}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{item.label}</p>
                  <p className="text-xl font-bold mt-1 truncate">{item.value}</p>
                </div>
                <Icon className="w-5 h-5 opacity-80 shrink-0" />
              </div>
              <p className="text-xs mt-2 opacity-80 line-clamp-2">{item.helper}</p>
            </div>
          );
        })}
      </div>

      <div className={`rounded-xl border p-4 flex items-start gap-3 ${hasInvalidSameTarget ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-muted/30 border-border text-muted-foreground"}`}>
        <ShieldCheck className={`w-5 h-5 shrink-0 ${hasInvalidSameTarget ? "text-rose-600" : "text-primary"}`} />
        <div>
          <h3 className={`font-semibold ${hasInvalidSameTarget ? "text-rose-900" : "text-foreground"}`}>Kontrol Mutu Sebelum Proses</h3>
          <p className="text-sm mt-1">
            Sistem akan membuat riwayat akademik untuk setiap siswa terpilih, lalu memperbarui status/kelas aktif di data induk siswa.
            {hasInvalidSameTarget ? " Kelas tujuan sama dengan kelas asal; ubah tujuan atau pilih aksi Tinggal Kelas bila memang mengulang." : " Pastikan tahun ajaran dan kelas tujuan sudah sesuai sebelum menekan proses."}
          </p>
        </div>
      </div>

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
              {sourceClass && (
                <div className="rounded-lg bg-blue-50 text-blue-800 border border-blue-100 p-3 text-xs">
                  Rombel asal: <strong>{sourceLabel}</strong>. Hanya siswa berstatus aktif yang akan tampil untuk diproses.
                </div>
              )}
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
                    {hasInvalidSameTarget && (
                      <p className="text-xs text-rose-600 mt-1">Kelas tujuan sama dengan kelas asal. Pilih kelas lain atau gunakan aksi Tinggal Kelas.</p>
                    )}
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
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                  Pilih Siswa ({selectedStudentIds.length}/{studentsList.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{visibleStudents.length} siswa tampil sesuai pencarian</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative hidden md:block">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Cari nama/NIS..."
                    className="w-52 pl-9 pr-3 py-2 border rounded-md text-sm bg-background"
                  />
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={visibleStudents.length === 0}
                >
                  {visibleStudents.length > 0 && visibleStudents.every((student: any) => selectedStudentIds.includes(String(student.id))) ? (
                    <><CheckSquare className="w-4 h-4 text-primary" /> Batalkan Tampil</>
                  ) : (
                    <><Square className="w-4 h-4" /> Pilih Tampil</>
                  )}
                </button>
              </div>
            </div>
            <div className="md:hidden p-3 border-b">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Cari nama atau NIS..."
                  className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-background"
                />
              </div>
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
              ) : visibleStudents.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                  <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">Tidak ada siswa sesuai pencarian.</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Ubah kata kunci atau kosongkan pencarian.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {visibleStudents.map((student: any) => {
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4 text-xs">
                <div className="rounded-lg bg-muted/40 border p-3">
                  <p className="text-muted-foreground">Siswa terpilih</p>
                  <p className="font-bold text-foreground mt-1">{selectedStudentIds.length} siswa</p>
                  <p className="text-muted-foreground mt-1">{selectedMaleCount} L / {selectedFemaleCount} P</p>
                </div>
                <div className="rounded-lg bg-muted/40 border p-3">
                  <p className="text-muted-foreground">Status baru</p>
                  <p className="font-bold text-foreground mt-1">{isGraduating ? (actionType === "Lulus" ? "Lulus" : "Pindah") : "Aktif"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 border p-3">
                  <p className="text-muted-foreground">Tujuan</p>
                  <p className="font-bold text-foreground mt-1 truncate">{targetLabel}</p>
                </div>
              </div>
              <button
                onClick={handlePreProcess}
                disabled={isProcessing || selectedStudentIds.length === 0 || !targetAcademicYearId || (!isGraduating && (!targetUnitId || !targetClassId)) || hasInvalidSameTarget}
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
                Data siswa akan diperbarui dan riwayat akademik akan dibuat untuk audit kenaikan/mutasi.
              </p>
            </div>
          </div>

        </div>
      </div>

      <ConfirmProcessModal
        isOpen={confirmModal.isOpen}
        count={selectedStudentIds.length}
        actionType={actionType}
        sourceLabel={sourceLabel}
        targetLabel={targetLabel}
        yearLabel={targetAcademicYear?.name || "Belum dipilih"}
        onConfirm={executeProcess}
        onCancel={() => setConfirmModal({ isOpen: false })}
        isProcessing={isProcessing}
      />
    </div>
  );
};
