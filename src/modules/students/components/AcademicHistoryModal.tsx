import React, { useState } from "react";
import { useList, useCreate, useUpdate } from "@refinedev/core";
import { X, Save, GraduationCap } from "lucide-react";

interface AcademicHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onSuccess: () => void;
}

export const AcademicHistoryModal: React.FC<AcademicHistoryModalProps> = ({ isOpen, onClose, student, onSuccess }) => {
  const { data: unitsData } = useList({ resource: "units", pagination: { mode: "off" } });
  const { data: classesData } = useList({ resource: "classes", pagination: { mode: "off" } });
  const { data: academicYearsData } = useList({ resource: "academic_years", pagination: { mode: "off" } });

  const [status, setStatus] = useState("Naik Kelas");
  const [unitId, setUnitId] = useState(student.unit_id);
  const [classId, setClassId] = useState(student.class_id || "");
  const [academicYearId, setAcademicYearId] = useState("");
  const [notes, setNotes] = useState("");

  const { mutate: createHistory, isLoading: isCreating } = useCreate();
  const { mutate: updateStudent, isLoading: isUpdating } = useUpdate();

  const isGraduating = status === "Lulus" || status === "Pindah (Keluar)";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Create history record
    createHistory({
      resource: "student_academic_history",
      values: {
        student_id: student.id,
        academic_year_id: academicYearId || null,
        unit_id: isGraduating ? student.unit_id : unitId,
        class_id: isGraduating ? null : classId,
        status: status,
        notes: notes
      }
    }, {
      onSuccess: () => {
        // 2. Update student current record
        let newStudentStatus = student.status;
        if (status === "Lulus") newStudentStatus = "graduated";
        else if (status === "Pindah (Keluar)") newStudentStatus = "transferred";
        else newStudentStatus = "active"; // if they were previously suspended etc, maybe reset to active

        updateStudent({
          resource: "students",
          id: student.id,
          values: {
            unit_id: isGraduating ? student.unit_id : unitId,
            class_id: isGraduating ? null : classId,
            status: newStudentStatus
          },
          successNotification: () => ({ message: "Riwayat Akademik berhasil disimpan", type: "success" })
        }, {
          onSuccess: () => {
            onSuccess();
            onClose();
          }
        });
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl w-full max-w-md shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" /> Catat Riwayat / Pindah
          </h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-muted rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto">
          <form id="history-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status Riwayat / Perubahan</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                required
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
              >
                <option value="Siswa Baru">Siswa Baru (Awal Masuk)</option>
                <option value="Pindahan (Masuk)">Pindahan (Masuk)</option>
                <option value="Naik Kelas">Naik Kelas</option>
                <option value="Tinggal Kelas">Tinggal Kelas</option>
                <option value="Pindah Jenjang">Pindah Jenjang (cth: PAUD ke SD)</option>
                <option value="Lulus">Lulus Sekolah</option>
                <option value="Pindah (Keluar)">Pindah Sekolah (Keluar)</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Tahun Ajaran</label>
              <select 
                value={academicYearId} 
                onChange={(e) => setAcademicYearId(e.target.value)}
                required
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Pilih Tahun Ajaran...</option>
                {academicYearsData?.data?.map((ay: any) => (
                  <option key={ay.id} value={ay.id}>{ay.name} {ay.is_active ? '(Aktif)' : ''}</option>
                ))}
              </select>
            </div>

            {!isGraduating && (
              <>
                <div className="p-3 bg-muted/30 rounded-lg border border-dashed space-y-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Penempatan Baru</p>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Unit Sekolah</label>
                    <select 
                      value={unitId} 
                      onChange={(e) => {
                        setUnitId(e.target.value);
                        setClassId("");
                      }}
                      required
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Pilih Unit...</option>
                      {unitsData?.data?.map((unit: any) => (
                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Kelas</label>
                    <select 
                      value={classId} 
                      onChange={(e) => setClassId(e.target.value)}
                      required
                      className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Pilih Kelas...</option>
                      {classesData?.data?.filter((c: any) => c.unit_id === unitId).map((cls: any) => (
                        <option key={cls.id} value={cls.id}>{cls.name} {cls.capacity ? `(Kapasitas: ${cls.capacity})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {isGraduating && (
              <div className="p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm">
                Status siswa akan diubah menjadi "{status}". Siswa tidak akan ditempatkan di kelas manapun lagi.
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block">Catatan Tambahan (Opsional)</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cth: Pindah jenjang ke SD, NIS baru menyusul..."
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                rows={3}
              />
            </div>
          </form>
        </div>

        <div className="p-4 border-t flex justify-end gap-2 bg-muted/10">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
            disabled={isCreating || isUpdating}
          >
            Batal
          </button>
          <button 
            type="submit" 
            form="history-form"
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
            disabled={isCreating || isUpdating}
          >
            {(isCreating || isUpdating) ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            ) : <Save className="w-4 h-4" />}
            Simpan Riwayat
          </button>
        </div>
      </div>
    </div>
  );
};
