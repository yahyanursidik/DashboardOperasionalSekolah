import React, { useState } from "react";
import { useForm, useSelect, useList } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

export const QuranAssessmentForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const [selectedHalaqoh, setSelectedHalaqoh] = useState<string>("");

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "quran_assessments",
    action: isEdit ? "edit" : "create",
    id,
  });

  const record = queryResult?.data?.data;

  // We don't have halaqoh_id in quran_assessments, so we don't try to auto-select it for edit mode.
  // The fields are disabled in edit mode anyway.

  const { data: halaqohsData } = useList({
    resource: "tahfidz_halaqohs",
    pagination: { mode: "off" }
  });
  const halaqohs = halaqohsData?.data || [];

  const { data: membersData, isLoading: isLoadingStudents } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: [{ field: "halaqoh_id", operator: "eq", value: selectedHalaqoh }],
    queryOptions: { enabled: !!selectedHalaqoh },
    meta: { select: "*, students(id, full_name, class_id, classes(name, units(name)))" },
    pagination: { mode: "off" }
  });
  const members = membersData?.data || [];

  const { options: employeeOptions } = useSelect({
    resource: "employees",
    optionLabel: "full_name",
    optionValue: "id",
    sorters: [{ field: "full_name", order: "asc" }],
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    let score = parseFloat(formData.get("score") as string);
    
    // Auto calculate predicate based on standard scores if needed
    let predicate = formData.get("predicate") as string;
    if (!predicate) {
      if (score >= 90) predicate = "Mumtaz (Istimewa)";
      else if (score >= 80) predicate = "Jayyid Jiddan (Sangat Baik)";
      else if (score >= 70) predicate = "Jayyid (Baik)";
      else if (score >= 60) predicate = "Maqbul (Cukup)";
      else predicate = "Rasib (Mengulang)";
    }

    const studentId = formData.get("student_id") as string;
    
    // Find the selected student's class_id
    let classId = record?.class_id;
    if (!isEdit && studentId) {
      const selectedMember = members.find(m => m.student_id === studentId);
      if (selectedMember?.students?.class_id) {
        classId = selectedMember.students.class_id;
      }
    }

    const data = {
      student_id: studentId,
      class_id: classId,
      employee_id: formData.get("employee_id") || null,
      examiner_2_id: formData.get("examiner_2_id") || null,
      date: formData.get("date"),
      assessment_type: formData.get("assessment_type"),
      title: formData.get("title"),
      score,
      predicate,
      status: formData.get("status") || "Lulus",
      notes: formData.get("notes"),
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
    };

    onFinish(data);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/quran-assessments")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Nilai Ujian" : "Input Nilai Ujian (Munaqosyah)"}
          description="Catat nilai kelulusan ujian tahsin atau tasmi' hafalan"
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Halaqoh / Kelompok Tahfidz</label>
              <select
                value={selectedHalaqoh}
                onChange={(e) => setSelectedHalaqoh(e.target.value)}
                required={!isEdit}
                disabled={isEdit}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{isEdit ? "Tidak bisa diubah saat edit" : "-- Pilih Halaqoh --"}</option>
                {halaqohs.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Siswa</label>
              <select
                name="student_id"
                required
                defaultValue={record?.student_id || ""}
                disabled={!selectedHalaqoh || isEdit || isLoadingStudents}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{isEdit ? "-- Siswa Terpilih --" : "-- Pilih Siswa dari Halaqoh --"}</option>
                {isEdit && record?.students ? (
                  <option value={record.student_id}>{record.students.full_name || "Siswa"}</option>
                ) : (
                  members.map(member => {
                    const student = member.students;
                    if (!student) return null;
                    return (
                      <option key={student.id} value={student.id}>
                        {student.full_name} ({student.classes?.units?.name || "Tanpa Unit"} - {student.classes?.name || "Tanpa Kelas"})
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Ujian</label>
              <input
                type="date"
                name="date"
                required
                defaultValue={record ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipe Ujian</label>
              <select
                name="assessment_type"
                required
                defaultValue={record?.assessment_type || "tahfidz_juz"}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="tahfidz_juz">Tasmi' (Ujian Juz)</option>
                <option value="tahsin_jilid">Munaqosyah Jilid (Tahsin)</option>
                <option value="tasmi">Sertifikasi Lulusan</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Judul Ujian</label>
            <input
              type="text"
              name="title"
              required
              placeholder="Contoh: Ujian Tasmi' Juz 30"
              defaultValue={record?.title}
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Penguji 1 (Utama)</label>
              <select
                name="employee_id"
                defaultValue={record?.employee_id || ""}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">-- Pilih Penguji 1 --</option>
                {employeeOptions?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Penguji 2 (Pendamping)</label>
              <select
                name="examiner_2_id"
                defaultValue={record?.examiner_2_id || ""}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">-- Pilih Penguji 2 --</option>
                {employeeOptions?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nilai Angka (1-100)</label>
              <input
                type="number"
                name="score"
                required
                min="0"
                max="100"
                step="0.01"
                defaultValue={record?.score}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Predikat (Opsional)</label>
              <input
                type="text"
                name="predicate"
                placeholder="Kosongkan untuk hitung otomatis"
                defaultValue={record?.predicate}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status Kelulusan</label>
            <select
              name="status"
              defaultValue={record?.status || "Lulus"}
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="Lulus">Lulus (Passed)</option>
              <option value="Lulus Bersyarat">Lulus Bersyarat</option>
              <option value="Mengulang">Mengulang (Failed)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Catatan / Keterangan</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={record?.notes}
              className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              placeholder="Catatan dari penguji..."
            />
          </div>

        </div>
        <div className="p-6 bg-muted/50 border-t flex justify-end">
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
};
