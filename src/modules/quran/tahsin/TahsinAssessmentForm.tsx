import React, { useEffect, useMemo, useState } from "react";
import { useForm, useList, useSelect } from "@refinedev/core";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  FileText,
  Save,
  ShieldCheck,
  Target,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

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

export const TahsinAssessmentForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const initialHalaqohId = searchParams.get("halaqoh_id") || "";
  const initialStudentId = searchParams.get("student_id") || "";

  const [selectedHalaqoh, setSelectedHalaqoh] = useState<string>(initialHalaqohId);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [preview, setPreview] = useState({
    title: "",
    score: "",
    predicate: "",
    status: "",
    employeeId: "",
  });

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "quran_assessments",
    action: isEdit ? "edit" : "create",
    id,
    meta: {
      select: "*, students(id, full_name, nis, class_id, classes(name, units(name))), classes(name, units(name))",
    },
  });

  const record = queryResult?.data?.data as any;

  const { data: halaqohsData } = useList({
    resource: "tahfidz_halaqohs",
    filters: [
      { field: "program_type", operator: "eq", value: "tahsin" },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
    ],
    pagination: { mode: "off" },
  });
  const halaqohs = halaqohsData?.data || [];
  const tahsinHalaqohIds = useMemo(() => new Set(halaqohs.map((halaqoh: any) => halaqoh.id)), [halaqohs]);

  const { data: allMembersData } = useList({
    resource: "tahfidz_halaqoh_members",
    meta: { select: "halaqoh_id, student_id, students(id, full_name, nis, class_id, classes(name, units(name)))" },
    pagination: { mode: "off" },
  });
  const allMembers = allMembersData?.data || [];

  const { data: membersData, isLoading: isLoadingStudents } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: selectedHalaqoh ? [{ field: "halaqoh_id", operator: "eq", value: selectedHalaqoh }] : [],
    queryOptions: { enabled: !!selectedHalaqoh },
    meta: { select: "halaqoh_id, student_id, students(id, full_name, nis, class_id, classes(name, units(name)))" },
    pagination: { mode: "off" },
  });
  const members = membersData?.data || [];

  useEffect(() => {
    if (record) {
      setSelectedStudentId(record.student_id || "");
      setPreview({
        title: record.title || "",
        score: record.score ? String(record.score) : "",
        predicate: record.predicate || "",
        status: record.status || "",
        employeeId: record.employee_id || "",
      });
    }
  }, [record]);

  useEffect(() => {
    const studentId = record?.student_id || selectedStudentId;
    if (!studentId || selectedHalaqoh || tahsinHalaqohIds.size === 0) return;
    const studentMember = allMembers.find((member: any) => member.student_id === studentId && tahsinHalaqohIds.has(member.halaqoh_id));
    if (studentMember?.halaqoh_id) setSelectedHalaqoh(studentMember.halaqoh_id);
  }, [allMembers, record?.student_id, selectedHalaqoh, selectedStudentId, tahsinHalaqohIds]);

  const { options: employeeOptions } = useSelect({
    resource: "employees",
    optionLabel: "full_name",
    optionValue: "id",
    sorters: [{ field: "full_name", order: "asc" }],
  });

  const selectedMember =
    members.find((member: any) => member.student_id === selectedStudentId) ||
    allMembers.find((member: any) => member.student_id === selectedStudentId && tahsinHalaqohIds.has(member.halaqoh_id));
  const selectedStudent = selectedMember?.students || record?.students;
  const numericScore = Number(preview.score || record?.score || 0);
  const recommendedPredicate = Number.isFinite(numericScore) && numericScore > 0 ? getPredicate(numericScore) : "";
  const recommendedStatus = Number.isFinite(numericScore) && numericScore > 0 ? getRecommendedStatus(numericScore) : "";
  const selectedEmployee = employeeOptions?.find((option) => option.value === preview.employeeId || option.value === record?.employee_id);

  const checklist = [
    { label: "Siswa valid", done: Boolean(selectedStudentId), helper: selectedStudent?.full_name || "Pilih siswa halaqoh" },
    { label: "Materi jilid", done: Boolean(preview.title || record?.title), helper: preview.title || record?.title || "Isi jilid atau level yang diujikan" },
    { label: "Nilai", done: Boolean(preview.score || record?.score), helper: recommendedPredicate || "Isi nilai 0-100" },
    { label: "Penguji", done: Boolean(preview.employeeId || record?.employee_id), helper: selectedEmployee?.label || "Pilih penguji utama" },
    { label: "Tindak lanjut", done: Boolean(preview.status || record?.status || recommendedStatus), helper: preview.status || record?.status || recommendedStatus || "Tentukan status" },
  ];

  const backPath = selectedHalaqoh ? `/tahsin-assessments?halaqoh_id=${selectedHalaqoh}` : "/tahsin-assessments";

  const handleScoreChange = (value: string) => {
    const score = Number(value);
    setPreview((current) => ({
      ...current,
      score: value,
      predicate: value && !current.predicate ? getPredicate(score) : current.predicate,
      status: value && !current.status ? getRecommendedStatus(score) : current.status,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const score = Number(formData.get("score") || preview.score || 0);
    const studentId = String(formData.get("student_id") || selectedStudentId || record?.student_id || "");
    const studentMember =
      members.find((member: any) => member.student_id === studentId) ||
      allMembers.find((member: any) => member.student_id === studentId && tahsinHalaqohIds.has(member.halaqoh_id));
    const predicate = String(formData.get("predicate") || preview.predicate || getPredicate(score));
    const status = String(formData.get("status") || preview.status || getRecommendedStatus(score));

    onFinish({
      student_id: studentId,
      class_id: studentMember?.students?.class_id || record?.class_id || record?.students?.class_id || null,
      employee_id: formData.get("employee_id") || record?.employee_id || null,
      examiner_2_id: formData.get("examiner_2_id") || null,
      date: formData.get("date"),
      assessment_type: "tahsin_jilid",
      title: formData.get("title"),
      score,
      predicate,
      status,
      notes: formData.get("notes"),
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate(backPath)} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Ujian Tahsin" : "Input Ujian Kenaikan Jilid"}
          description="Catat assessment Tahsin sebagai keputusan kenaikan jilid, status kelulusan, dan tindak lanjut pembinaan."
        />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Assessment tahsin siap audit
            </div>
            <h2 className="mt-3 text-xl font-bold">
              {isEdit ? "Perbarui hasil ujian tanpa menghilangkan konteks siswa" : "Ambil keputusan naik jilid dengan data yang rapi"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Form ini mengunci alur dari siswa, materi, penguji, nilai, sampai status tindak lanjut agar hasil ujian mudah dibaca oleh guru, wali kelas, dan pimpinan sekolah.
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

      <form key={record?.id || "create-tahsin-assessment"} onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-emerald-500/10 flex items-center gap-3">
          <Award className="w-6 h-6 text-emerald-600" />
          <div>
            <h2 className="font-semibold text-emerald-800 text-lg">Ujian Tahsin (Kenaikan Jilid)</h2>
            <p className="text-sm text-emerald-700/80">Gunakan untuk keputusan lulus, lulus bersyarat, atau mengulang.</p>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Peserta Ujian
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Halaqoh Tahsin <span className="text-destructive">*</span></label>
                <select
                  value={selectedHalaqoh}
                  onChange={(event) => {
                    setSelectedHalaqoh(event.target.value);
                    setSelectedStudentId("");
                  }}
                  required={!isEdit}
                  disabled={isEdit}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{isEdit ? "Halaqoh mengikuti data siswa" : "-- Pilih Halaqoh --"}</option>
                  {halaqohs.map((halaqoh: any) => (
                    <option key={halaqoh.id} value={halaqoh.id}>{halaqoh.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Siswa <span className="text-destructive">*</span></label>
                {isEdit && <input type="hidden" name="student_id" value={selectedStudentId || record?.student_id || ""} />}
                <select
                  name="student_id"
                  required
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  disabled={isEdit || !selectedHalaqoh || isLoadingStudents}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{selectedHalaqoh ? "-- Pilih siswa dari halaqoh --" : "-- Pilih halaqoh terlebih dahulu --"}</option>
                  {isEdit && selectedStudent && (
                    <option value={selectedStudentId || record?.student_id}>
                      {selectedStudent.full_name} ({selectedStudent.classes?.name || "Tanpa Kelas"})
                    </option>
                  )}
                  {!isEdit && members.map((member: any) => {
                    const student = member.students;
                    if (!student) return null;
                    return (
                      <option key={student.id} value={student.id}>
                        {student.full_name} ({student.classes?.units?.name || "Tanpa Unit"} - {student.classes?.name || "Tanpa Kelas"})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              Detail Ujian
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Ujian <span className="text-destructive">*</span></label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={record?.date ? new Date(record.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Materi/Jilid yang Diujikan <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={record?.title || ""}
                  onChange={(event) => setPreview((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Contoh: Kenaikan Jilid 3 - Halaman 28-32"
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
              Hasil dan Penguji
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nilai Angka <span className="text-destructive">*</span></label>
                <input
                  type="number"
                  name="score"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  defaultValue={record?.score || ""}
                  onChange={(event) => handleScoreChange(event.target.value)}
                  placeholder="0 - 100"
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
                {recommendedStatus && <p className="text-xs text-muted-foreground">Rekomendasi status: {recommendedStatus}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Predikat</label>
                <select
                  name="predicate"
                  value={preview.predicate || record?.predicate || ""}
                  onChange={(event) => setPreview((current) => ({ ...current, predicate: event.target.value }))}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Hitung otomatis dari nilai</option>
                  <option value="Mumtaz (Istimewa)">Mumtaz (Istimewa) (90-100)</option>
                  <option value="Jayyid Jiddan (Sangat Baik)">Jayyid Jiddan (Sangat Baik) (80-89)</option>
                  <option value="Jayyid (Baik)">Jayyid (Baik) (70-79)</option>
                  <option value="Maqbul (Cukup)">Maqbul (Cukup) (60-69)</option>
                  <option value="Rasib (Mengulang)">Rasib (Mengulang) (&lt;60)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status Kelulusan <span className="text-destructive">*</span></label>
                <select
                  name="status"
                  required
                  value={preview.status || record?.status || ""}
                  onChange={(event) => setPreview((current) => ({ ...current, status: event.target.value }))}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Gunakan rekomendasi dari nilai</option>
                  <option value="Lulus">Lulus</option>
                  <option value="Lulus Bersyarat">Lulus Bersyarat</option>
                  <option value="Mengulang">Mengulang / Tidak Lulus</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Penguji 1 <span className="text-destructive">*</span></label>
                <select
                  name="employee_id"
                  required
                  value={preview.employeeId || record?.employee_id || ""}
                  onChange={(event) => setPreview((current) => ({ ...current, employeeId: event.target.value }))}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">-- Pilih penguji utama --</option>
                  {employeeOptions?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Penguji 2</label>
                <select
                  name="examiner_2_id"
                  defaultValue={record?.examiner_2_id || ""}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Opsional bila sekolah memakai dua penguji</option>
                  {employeeOptions?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Catatan Penguji</label>
                <textarea
                  name="notes"
                  defaultValue={record?.notes || ""}
                  placeholder="Catat kekuatan bacaan, bagian yang wajib diulang, atau syarat kelulusan."
                  className="w-full flex min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background resize-y"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <h3 className="text-base font-semibold">Alur setelah assessment</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                { icon: BookOpen, label: "Jurnal", detail: "Cek latihan harian sebelum keputusan" },
                { icon: Target, label: "Target", detail: "Sesuaikan target jilid berikutnya" },
                { icon: UserCheck, label: "Pembinaan", detail: "Tindak lanjuti status bersyarat/mengulang" },
                { icon: FileText, label: "Laporan", detail: "Masuk rekap mutu Tahsin" },
              ].map(({ icon: Icon, label, detail }) => (
                <div key={label} className="rounded-lg border bg-background p-4">
                  <Icon className="mb-2 h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-muted/50 border-t flex justify-end gap-3">
          <button type="button" onClick={() => navigate(backPath)} className="px-6 py-2 rounded-lg bg-background border hover:bg-muted font-medium transition-colors">
            Batal
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Hasil Ujian"}
          </button>
        </div>
      </form>
    </div>
  );
};
