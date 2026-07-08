import React, { useState } from "react";
import { useForm, useSelect, useList } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Award } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const TahsinAssessmentForm: React.FC = () => {
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

  // Fetch only Tahsin Halaqohs
  const { data: halaqohsData } = useList({
    resource: "tahfidz_halaqohs",
    filters: [
      { field: "program_type", operator: "eq", value: "tahsin" },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : [])
    ],
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
      assessment_type: "tahsin_jilid", // Hardcoded for Tahsin
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
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/tahsin-assessments")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Nilai Ujian Tahsin" : "Input Nilai Ujian Kenaikan Jilid"}
          description="Catat nilai ujian munaqosyah kenaikan jilid tilawah santri."
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-sm overflow-hidden">
        
        {/* Identitas Program */}
        <div className="p-6 border-b bg-primary/10 flex items-center gap-3">
           <Award className="w-6 h-6 text-primary" />
           <div>
             <h2 className="font-semibold text-primary text-lg">Ujian Tahsin (Kenaikan Jilid)</h2>
             <p className="text-sm text-primary/80">Input kelulusan munaqosyah tahsin.</p>
           </div>
        </div>

        <div className="p-6 space-y-8">
          
          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span> 
              Pilih Santri
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Halaqoh Tahsin <span className="text-destructive">*</span></label>
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
                <label className="text-sm font-medium">Siswa <span className="text-destructive">*</span></label>
                <select
                  name="student_id"
                  required
                  defaultValue={record?.student_id || ""}
                  disabled={!selectedHalaqoh && !isEdit}
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
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> 
              Detail Ujian
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Ujian <span className="text-destructive">*</span></label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={record?.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Judul/Jilid yang Diujikan <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={record?.title || ""}
                  placeholder="Contoh: Kenaikan Jilid 3"
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nilai Angka <span className="text-destructive">*</span></label>
                <input
                  type="number"
                  name="score"
                  step="0.01"
                  required
                  defaultValue={record?.score || ""}
                  placeholder="0 - 100"
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Predikat (Opsional)</label>
                <select
                  name="predicate"
                  defaultValue={record?.predicate || ""}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">-- Hitung Otomatis --</option>
                  <option value="Mumtaz (Istimewa)">Mumtaz (Istimewa) (90-100)</option>
                  <option value="Jayyid Jiddan (Sangat Baik)">Jayyid Jiddan (Sangat Baik) (80-89)</option>
                  <option value="Jayyid (Baik)">Jayyid (Baik) (70-79)</option>
                  <option value="Maqbul (Cukup)">Maqbul (Cukup) (60-69)</option>
                  <option value="Rasib (Mengulang)">Rasib (Mengulang) (&#60;60)</option>
                </select>
                <p className="text-xs text-muted-foreground">Biarkan "Hitung Otomatis" untuk menentukan predikat dari nilai angka.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Penguji 1 <span className="text-destructive">*</span></label>
                <select
                  name="employee_id"
                  required
                  defaultValue={record?.employee_id || ""}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">-- Pilih Penguji --</option>
                  {employeeOptions?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Penguji 2 (Opsional)</label>
                <select
                  name="examiner_2_id"
                  defaultValue={record?.examiner_2_id || ""}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">-- Pilih Penguji (Bila Ada) --</option>
                  {employeeOptions?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status Kelulusan</label>
                <select
                  name="status"
                  required
                  defaultValue={record?.status || "Lulus"}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="Lulus">Lulus</option>
                  <option value="Lulus Bersyarat">Lulus Bersyarat</option>
                  <option value="Mengulang">Mengulang / Tidak Lulus</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Catatan Penguji</label>
                <textarea
                  name="notes"
                  defaultValue={record?.notes || ""}
                  placeholder="Catatan kelebihan atau kekurangan bacaan..."
                  className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background resize-y"
                />
              </div>

            </div>
          </div>

        </div>
        <div className="p-6 bg-muted/50 border-t flex justify-end">
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Hasil Ujian"}
          </button>
        </div>
      </form>
    </div>
  );
};
