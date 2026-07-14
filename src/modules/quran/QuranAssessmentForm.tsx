import React, { useEffect, useMemo, useState } from "react";
import { useForm, useList, useSelect } from "@refinedev/core";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Save,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";

const getPredicate = (score: number) => {
  if (score >= 90) return "Mumtaz (Istimewa)";
  if (score >= 80) return "Jayyid Jiddan (Sangat Baik)";
  if (score >= 70) return "Jayyid (Baik)";
  if (score >= 60) return "Maqbul (Cukup)";
  return "Rasib (Mengulang)";
};

const getRecommendedStatus = (score: number) => {
  if (score >= 75) return "Lulus";
  if (score >= 60) return "Lulus Bersyarat";
  return "Mengulang";
};

export const QuranAssessmentForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(searchParams.get("class_id") || "");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState(searchParams.get("halaqoh_id") || "");
  const [selectedStudentId, setSelectedStudentId] = useState(searchParams.get("student_id") || "");
  const [assessmentType, setAssessmentType] = useState("tahfidz_juz");
  const [title, setTitle] = useState("");
  const [score, setScore] = useState<number | "">("");
  const [status, setStatus] = useState("Lulus");
  const [employeeId, setEmployeeId] = useState("");

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "quran_assessments",
    action: isEdit ? "edit" : "create",
    id,
    meta: {
      select: "*, students(id, full_name, nis, class_id, classes(name, units(name)))",
    },
  });

  const record = queryResult?.data?.data;

  useEffect(() => {
    if (!record) return;
    setSelectedClassId(record.class_id || record.students?.class_id || "");
    setSelectedStudentId(record.student_id || "");
    setAssessmentType(record.assessment_type || "tahfidz_juz");
    setTitle(record.title || "");
    setScore(record.score ?? "");
    setStatus(record.status || "Lulus");
    setEmployeeId(record.employee_id || "");
  }, [record]);

  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const { options: classOptions } = useSelect({
    resource: "classes",
    optionLabel: "name",
    optionValue: "id",
    filters: selectedUnitId ? [{ field: "unit_id", operator: "eq", value: selectedUnitId }] : [],
    sorters: [{ field: "name", order: "asc" }],
  });

  const { data: halaqohsData } = useList({
    resource: "tahfidz_halaqohs",
    filters: [
      { field: "program_type", operator: "eq", value: "tahfidz" },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
    ],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
  });
  const halaqohs = halaqohsData?.data || [];

  const { data: membersData, isLoading: isLoadingMembers } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: [{ field: "halaqoh_id", operator: "eq", value: selectedHalaqohId }],
    queryOptions: { enabled: !!selectedHalaqohId && !isEdit },
    meta: { select: "*, students(id, full_name, nis, class_id, classes(name, units(name)))" },
    pagination: { mode: "off" },
  });

  const { data: classStudentsData, isLoading: isLoadingClassStudents } = useList({
    resource: "students",
    filters: [
      { field: "status", operator: "eq" as const, value: "active" },
      ...(selectedClassId ? [{ field: "class_id", operator: "eq" as const, value: selectedClassId }] : []),
    ],
    queryOptions: { enabled: !selectedHalaqohId && !!selectedClassId && !isEdit },
    meta: { select: "id, full_name, nis, class_id, classes(name, units(name))" },
    pagination: { mode: "off" },
  });

  const members = membersData?.data || [];
  const classStudents = classStudentsData?.data || [];

  const studentOptions = useMemo(() => {
    if (isEdit && record?.students) return [record.students];
    if (selectedHalaqohId) return members.map((member: any) => member.students).filter(Boolean);
    return classStudents;
  }, [classStudents, isEdit, members, record?.students, selectedHalaqohId]);

  const selectedStudent = studentOptions.find((student: any) => student?.id === selectedStudentId);
  const selectedClass = classOptions?.find((option) => option.value === selectedClassId);
  const numericScore = Number(score || 0);
  const previewPredicate = numericScore > 0 ? getPredicate(numericScore) : "Menunggu nilai";
  const recommendedStatus = numericScore > 0 ? getRecommendedStatus(numericScore) : "Menunggu nilai";

  const { options: employeeOptions } = useSelect({
    resource: "employees",
    optionLabel: "full_name",
    optionValue: "id",
    sorters: [{ field: "full_name", order: "asc" }],
  });

  const checklist = [
    { label: "Siswa valid", done: Boolean(selectedStudentId || record?.student_id), helper: selectedStudent?.full_name || record?.students?.full_name || "Pilih siswa yang diuji" },
    { label: "Materi ujian", done: Boolean(title), helper: title || "Contoh: Tasmi' Juz 30" },
    { label: "Penguji utama", done: Boolean(employeeId), helper: employeeId ? "Penguji sudah dipilih" : "Pilih penguji utama" },
    { label: "Nilai terisi", done: numericScore > 0, helper: numericScore > 0 ? `${numericScore} - ${previewPredicate}` : "Masukkan nilai 1-100" },
    { label: "Status tindak lanjut", done: Boolean(status), helper: status || recommendedStatus },
  ];

  const handleScoreChange = (value: string) => {
    const parsed = value === "" ? "" : Number(value);
    setScore(parsed);
    if (parsed !== "" && !isEdit) {
      setStatus(getRecommendedStatus(parsed));
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const studentId = (formData.get("student_id") as string) || record?.student_id;
    const scoreValue = Number(formData.get("score") || 0);
    let predicate = formData.get("predicate") as string;
    if (!predicate) predicate = getPredicate(scoreValue);

    let classId = record?.class_id || selectedClassId || null;
    if (!isEdit && studentId) {
      const selectedMember = members.find((member: any) => member.student_id === studentId);
      const selectedClassStudent = classStudents.find((student: any) => student.id === studentId);
      classId = selectedMember?.students?.class_id || selectedClassStudent?.class_id || selectedClassId || null;
    }

    onFinish({
      student_id: studentId,
      class_id: classId,
      employee_id: formData.get("employee_id") || null,
      examiner_2_id: formData.get("examiner_2_id") || null,
      date: formData.get("date"),
      assessment_type: assessmentType,
      title,
      score: scoreValue,
      predicate,
      status: formData.get("status") || getRecommendedStatus(scoreValue),
      notes: formData.get("notes"),
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(selectedHalaqohId ? `/quran-assessments?halaqoh_id=${selectedHalaqohId}` : "/quran-assessments")}
          className="rounded-full p-2 transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Hasil Munaqosyah" : "Input Munaqosyah Tahfidz"}
          description="Catat hasil tasmi' atau munaqosyah juz dengan penguji, predikat, status kelulusan, dan catatan tindak lanjut."
        />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Assessment siap audit
            </div>
            <h2 className="mt-3 text-xl font-bold">
              {isEdit ? "Perbarui hasil ujian tanpa mengubah identitas siswa" : "Validasi capaian hafalan sebelum dinyatakan lulus"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Form ini melengkapi Mutaba'ah: setoran harian menunjukkan proses, assessment menunjukkan validasi akhir oleh penguji.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-lg border bg-background p-3">
                <CheckCircle2 className={`mt-0.5 h-4 w-4 ${item.done ? "text-emerald-600" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.helper}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <form key={record?.id || "create-quran-assessment"} onSubmit={handleSubmit} className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b bg-primary/10 p-6">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-primary">Munaqosyah Tahfidz</h2>
              <p className="text-sm text-primary/80">Input hasil ujian yang siap dibaca guru, pimpinan, dan orang tua.</p>
            </div>
          </div>
        </div>

        <div className="space-y-8 p-6">
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 border-b pb-2 font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">1</span>
              Peserta Ujian
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <select
                  value={selectedUnitId}
                  onChange={(event) => {
                    setSelectedUnitId(event.target.value);
                    setSelectedClassId("");
                    setSelectedStudentId("");
                    setSelectedHalaqohId("");
                  }}
                  disabled={isEdit}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Semua unit</option>
                  {unitOptions?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kelas</label>
                <select
                  value={selectedClassId}
                  onChange={(event) => {
                    setSelectedClassId(event.target.value);
                    setSelectedStudentId("");
                    setSelectedHalaqohId("");
                  }}
                  disabled={isEdit}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{isEdit ? selectedClass?.label || "Kelas tersimpan" : "-- Pilih kelas bila tidak dari halaqoh --"}</option>
                  {classOptions?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Halaqoh Tahfidz</label>
                <select
                  value={selectedHalaqohId}
                  onChange={(event) => {
                    setSelectedHalaqohId(event.target.value);
                    setSelectedStudentId("");
                  }}
                  disabled={isEdit}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{isEdit ? "Tidak diubah saat edit" : "-- Pilih halaqoh bila ada --"}</option>
                  {halaqohs.map((halaqoh: any) => (
                    <option key={halaqoh.id} value={halaqoh.id}>{halaqoh.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Pilih halaqoh untuk daftar siswa binaan, atau pilih kelas untuk ujian klasikal.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Siswa <span className="text-destructive">*</span></label>
                <select
                  name="student_id"
                  required
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  disabled={isEdit || (!selectedHalaqohId && !selectedClassId) || isLoadingMembers || isLoadingClassStudents}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{isEdit ? record?.students?.full_name || "Siswa tersimpan" : "-- Pilih siswa --"}</option>
                  {studentOptions.map((student: any) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} {student.nis ? `- ${student.nis}` : ""} ({student.classes?.units?.name || "Tanpa Unit"} - {student.classes?.name || "Tanpa Kelas"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="flex items-center gap-2 border-b pb-2 font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">2</span>
              Detail Ujian
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Ujian <span className="text-destructive">*</span></label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={record?.date ? new Date(record.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipe Ujian <span className="text-destructive">*</span></label>
                <select
                  name="assessment_type"
                  required
                  value={assessmentType}
                  onChange={(event) => setAssessmentType(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="tahfidz_juz">Tasmi' Juz</option>
                  <option value="tasmi">Sertifikasi Tasmi'</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Judul/Materi Ujian <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  name="title"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Contoh: Tasmi' Juz 30 atau Munaqosyah Al-Mulk"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="flex items-center gap-2 border-b pb-2 font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">3</span>
              Hasil dan Penguji
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Penguji Utama <span className="text-destructive">*</span></label>
                <select
                  name="employee_id"
                  required
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">-- Pilih penguji --</option>
                  {employeeOptions?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Penguji Pendamping</label>
                <select
                  name="examiner_2_id"
                  defaultValue={record?.examiner_2_id || ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">-- Tidak ada --</option>
                  {employeeOptions?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nilai Angka <span className="text-destructive">*</span></label>
                <input
                  type="number"
                  name="score"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={score}
                  onChange={(event) => handleScoreChange(event.target.value)}
                  placeholder="0 - 100"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Predikat</label>
                <select
                  name="predicate"
                  defaultValue={record?.predicate || ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">{previewPredicate}</option>
                  <option value="Mumtaz (Istimewa)">Mumtaz (Istimewa)</option>
                  <option value="Jayyid Jiddan (Sangat Baik)">Jayyid Jiddan (Sangat Baik)</option>
                  <option value="Jayyid (Baik)">Jayyid (Baik)</option>
                  <option value="Maqbul (Cukup)">Maqbul (Cukup)</option>
                  <option value="Rasib (Mengulang)">Rasib (Mengulang)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status Kelulusan <span className="text-destructive">*</span></label>
                <select
                  name="status"
                  required
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="Lulus">Lulus</option>
                  <option value="Lulus Bersyarat">Lulus Bersyarat</option>
                  <option value="Mengulang">Mengulang</option>
                </select>
                <p className="text-xs text-muted-foreground">Rekomendasi dari nilai: {recommendedStatus}.</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Ringkasan mutu</p>
                <p className="mt-2 text-xl font-bold">{score || 0}</p>
                <p className="text-sm text-muted-foreground">{previewPredicate}</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Catatan Penguji / Tindak Lanjut</label>
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={record?.notes || ""}
                  placeholder="Catatan kekuatan hafalan, bagian yang perlu muraja'ah, atau syarat kelulusan."
                  className="flex min-h-[96px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-muted/20 p-4">
            <h3 className="text-base font-semibold">Alur setelah assessment tersimpan</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                { icon: ClipboardCheck, label: "Mutaba'ah", detail: "Cek bukti proses harian" },
                { icon: Target, label: "Target siswa", detail: "Perbarui status target personal" },
                { icon: BookOpen, label: "Muraja'ah", detail: "Tentukan bagian pengulangan" },
                { icon: Users, label: "Komunikasi", detail: "Siapkan info untuk wali/orang tua" },
              ].map(({ icon: Icon, label, detail }) => (
                <div key={label} className="rounded-lg border bg-background p-4">
                  <Icon className="mb-2 h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex justify-between gap-3 border-t bg-muted/50 p-6">
          <button
            type="button"
            onClick={() => navigate(selectedHalaqohId ? `/quran-assessments?halaqoh_id=${selectedHalaqohId}` : "/quran-assessments")}
            className="flex items-center gap-2 rounded-lg border bg-background px-5 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Batal
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {formLoading ? "Menyimpan..." : "Simpan Assessment"}
          </button>
        </div>
      </form>
    </div>
  );
};
