import React, { useEffect, useMemo, useState } from "react";
import { useForm, useList } from "@refinedev/core";
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
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const TahsinTargetForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "tahsin_student_targets",
    action: isEdit ? "edit" : "create",
    id,
    meta: {
      select: "*, students(id, full_name, class_id, classes(name, units(name)))",
    },
  });

  const record = queryResult?.data?.data;
  const [selectedHalaqoh, setSelectedHalaqoh] = useState<string>(searchParams.get("halaqoh_id") || "");
  const [formPreview, setFormPreview] = useState({
    student_id: searchParams.get("student_id") || "",
    description: "",
    target_amount: 1,
    amount_unit: "jilid",
    status: "in_progress",
  });

  const { data: halaqohsData } = useList({
    resource: "tahfidz_halaqohs",
    filters: [
      { field: "program_type", operator: "eq" as const, value: "tahsin" },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : []),
    ],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
  });
  const halaqohs = halaqohsData?.data || [];
  const tahsinHalaqohIds = useMemo(() => new Set(halaqohs.map((halaqoh: any) => halaqoh.id)), [halaqohs]);

  const { data: allMembersData } = useList({
    resource: "tahfidz_halaqoh_members",
    meta: { select: "*, students(id, full_name, class_id, classes(name, units(name)))" },
    pagination: { mode: "off" },
  });
  const allMembers = allMembersData?.data || [];

  const { data: membersData, isLoading: isLoadingStudents } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: [{ field: "halaqoh_id", operator: "eq", value: selectedHalaqoh }],
    queryOptions: { enabled: !!selectedHalaqoh },
    meta: { select: "*, students(id, full_name, class_id, classes(name, units(name)))" },
    pagination: { mode: "off" },
  });
  const members = membersData?.data || [];

  useEffect(() => {
    if (!record) return;
    setFormPreview({
      student_id: record.student_id || "",
      description: record.description || "",
      target_amount: record.target_amount || 1,
      amount_unit: record.amount_unit || "jilid",
      status: record.status || "in_progress",
    });
  }, [record]);

  useEffect(() => {
    const studentId = record?.student_id || formPreview.student_id;
    if (!studentId || selectedHalaqoh || tahsinHalaqohIds.size === 0) return;
    const currentMember = allMembers.find((member: any) => member.student_id === studentId && tahsinHalaqohIds.has(member.halaqoh_id));
    if (currentMember?.halaqoh_id) setSelectedHalaqoh(currentMember.halaqoh_id);
  }, [allMembers, formPreview.student_id, record?.student_id, selectedHalaqoh, tahsinHalaqohIds]);

  const selectedMember = members.find((member: any) => member.student_id === formPreview.student_id) ||
    allMembers.find((member: any) => member.student_id === formPreview.student_id && tahsinHalaqohIds.has(member.halaqoh_id));
  const selectedStudent = selectedMember?.students || record?.students;

  const checklist = [
    { label: "Siswa terpilih", done: Boolean(formPreview.student_id || record?.student_id), helper: selectedStudent?.full_name || "Pilih siswa anggota halaqoh" },
    { label: "Halaqoh tahsin", done: Boolean(selectedHalaqoh), helper: halaqohs.find((halaqoh: any) => halaqoh.id === selectedHalaqoh)?.name || "Pilih halaqoh" },
    { label: "Target jelas", done: Boolean(formPreview.description), helper: formPreview.description || "Contoh: Selesaikan Jilid 3 halaman 1-20" },
    { label: "Jumlah terukur", done: Number(formPreview.target_amount || 0) > 0, helper: `${formPreview.target_amount || 0} ${formPreview.amount_unit}` },
  ];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const studentId = (formData.get("student_id") as string) || record?.student_id;

    onFinish({
      student_id: studentId,
      target_type: "tahsin",
      description: formPreview.description,
      target_amount: parseInt(formData.get("target_amount") as string),
      amount_unit: formData.get("amount_unit"),
      status: formData.get("status") || "in_progress",
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(selectedHalaqoh ? `/tahsin-student-targets?halaqoh_id=${selectedHalaqoh}` : "/tahsin-student-targets")}
          className="rounded-full p-2 transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Target Tahsin" : "Tambah Target Tahsin"}
          description="Atur target bacaan personal yang spesifik, terukur, dan bisa dipantau dari jurnal Tahsin."
        />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Target tahsin siap dipantau
            </div>
            <h2 className="mt-3 text-xl font-bold">
              {isEdit ? "Perbarui target tanpa memutus riwayat jurnal" : "Buat target bacaan yang jelas untuk satu siswa"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Target ini menjadi acuan guru saat mengisi jurnal harian dan menentukan kesiapan siswa mengikuti ujian kenaikan jilid.
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

      <form key={record?.id || "create-tahsin-target"} onSubmit={handleSubmit} className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b bg-emerald-500/10 p-6">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="text-lg font-semibold text-emerald-800">Target Tahsin & Tilawah</h2>
              <p className="text-sm text-emerald-700/80">Tetapkan arah pembinaan bacaan per siswa.</p>
            </div>
          </div>
        </div>

        <div className="space-y-8 p-6">
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 border-b pb-2 font-semibold">
              <Users className="h-5 w-5 text-primary" />
              Peserta Target
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Halaqoh Tahsin <span className="text-destructive">*</span></label>
                <select
                  value={selectedHalaqoh}
                  onChange={(event) => {
                    setSelectedHalaqoh(event.target.value);
                    setFormPreview((prev) => ({ ...prev, student_id: "" }));
                  }}
                  required={!isEdit}
                  disabled={isEdit}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{isEdit ? "Tidak diubah saat edit" : "-- Pilih Halaqoh Tahsin --"}</option>
                  {halaqohs.map((halaqoh: any) => (
                    <option key={halaqoh.id} value={halaqoh.id}>{halaqoh.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Siswa <span className="text-destructive">*</span></label>
                <select
                  name="student_id"
                  required
                  value={formPreview.student_id}
                  onChange={(event) => setFormPreview((prev) => ({ ...prev, student_id: event.target.value }))}
                  disabled={isEdit || !selectedHalaqoh || isLoadingStudents}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{selectedHalaqoh ? "-- Pilih siswa dari halaqoh --" : "-- Pilih halaqoh terlebih dahulu --"}</option>
                  {(isEdit && selectedStudent ? [{ students: selectedStudent, student_id: formPreview.student_id }] : members).map((member: any) => {
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
          </section>

          <section className="space-y-4">
            <h3 className="flex items-center gap-2 border-b pb-2 font-semibold">
              <BookOpen className="h-5 w-5 text-primary" />
              Detail Target
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi Target <span className="text-destructive">*</span></label>
              <input
                type="text"
                name="description"
                required
                value={formPreview.description}
                onChange={(event) => setFormPreview((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Contoh: Selesaikan Jilid 3 halaman 1-20 dengan makhraj stabil"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Jumlah Target</label>
                <input
                  type="number"
                  name="target_amount"
                  required
                  min="1"
                  value={formPreview.target_amount}
                  onChange={(event) => setFormPreview((prev) => ({ ...prev, target_amount: Number(event.target.value) }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Satuan Target</label>
                <select
                  name="amount_unit"
                  required
                  value={formPreview.amount_unit}
                  onChange={(event) => setFormPreview((prev) => ({ ...prev, amount_unit: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="jilid">Jilid</option>
                  <option value="halaman">Halaman</option>
                  <option value="surah">Surah</option>
                  <option value="juz">Juz</option>
                  <option value="ayat">Ayat</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  name="status"
                  required
                  value={formPreview.status}
                  onChange={(event) => setFormPreview((prev) => ({ ...prev, status: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="in_progress">Proses</option>
                  <option value="completed">Tercapai</option>
                  <option value="failed">Perlu Ulang</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-muted/20 p-4">
            <h3 className="text-base font-semibold">Alur setelah target tersimpan</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                { icon: ClipboardCheck, label: "Jurnal harian", detail: "Catat latihan dan kelancaran" },
                { icon: BookOpen, label: "Muraja'ah bacaan", detail: "Ulang halaman yang belum stabil" },
                { icon: Award, label: "Ujian jilid", detail: "Validasi jika target siap" },
                { icon: Target, label: "Update status", detail: "Tercapai atau perlu ulang" },
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
            onClick={() => navigate(selectedHalaqoh ? `/tahsin-student-targets?halaqoh_id=${selectedHalaqoh}` : "/tahsin-student-targets")}
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
            {formLoading ? "Menyimpan..." : "Simpan Target"}
          </button>
        </div>
      </form>
    </div>
  );
};
