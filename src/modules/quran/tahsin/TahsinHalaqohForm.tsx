/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useState } from "react";
import { useForm, useList, useSelect } from "@refinedev/core";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Award, BookOpen, CheckCircle2, ClipboardCheck, Clock, Save, ShieldCheck, Target, Users } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { toast } from "sonner";
import { supabaseClient as supabase } from "../../../lib/supabase/client";

function getScheduleTimes(record?: any) {
  const legacy = String(record?.schedule_time || "").match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  return {
    start: String(record?.schedule_start_time || legacy?.[1] || "").slice(0, 5),
    end: String(record?.schedule_end_time || legacy?.[2] || "").slice(0, 5),
  };
}

export const TahsinHalaqohForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formPreview, setFormPreview] = useState({
    name: "",
    employee_id: "",
    subject_id: "",
    academic_year_id: activeYearId || "",
    semester_id: activeSemesterId || "",
    schedule_day: "",
    schedule_time: "",
    schedule_start_time: "",
    schedule_end_time: "",
  });

  const { queryResult, formLoading } = useForm({
    resource: "tahfidz_halaqohs",
    action: isEdit ? "edit" : "create",
    id,
    redirect: false,
  });

  const record = queryResult?.data?.data;

  useEffect(() => {
    if (!record) return;
    const schedule = getScheduleTimes(record);
    setFormPreview({
      name: record.name || "",
      employee_id: record.employee_id || "",
      subject_id: record.subject_id || "",
      academic_year_id: record.academic_year_id || activeYearId || "",
      semester_id: record.semester_id || activeSemesterId || "",
      schedule_day: record.schedule_day || "",
      schedule_time: record.schedule_time || "",
      schedule_start_time: schedule.start,
      schedule_end_time: schedule.end,
    });
  }, [activeSemesterId, activeYearId, record]);

  const { options: employeeOptions } = useSelect({
    resource: "employees",
    optionLabel: "full_name",
    optionValue: "id",
    sorters: [{ field: "full_name", order: "asc" }],
  });

  const { options: yearOptions } = useSelect({
    resource: "academic_years",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "desc" }],
  });

  const { options: semesterOptions } = useSelect({
    resource: "semesters",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const { data: subjectsData } = useList({
    resource: "subjects",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }],
    meta: { select: "id, name, code, unit_id, quran_program_type, units(name)" },
    pagination: { mode: "off" },
  });
  const subjectOptions = (subjectsData?.data || []).filter((subject: any) =>
    subject.quran_program_type === "tahsin" || subject.quran_program_type === "both"
  );

  const selectedTeacher = employeeOptions?.find((option) => option.value === formPreview.employee_id);
  const checklist = [
    { label: "Nama halaqoh", done: Boolean(formPreview.name), helper: formPreview.name || "Isi nama kelompok tahsin" },
    { label: "Periode aktif", done: Boolean(formPreview.academic_year_id && formPreview.semester_id), helper: "Tahun ajaran dan semester" },
    { label: "Guru pengampu", done: Boolean(formPreview.employee_id), helper: selectedTeacher?.label || "Pilih guru tahsin" },
    { label: "Mapel Tahsin", done: Boolean(formPreview.subject_id), helper: "Relasi kurikulum, jadwal, portal, dan rapor" },
    { label: "Jadwal", done: Boolean(formPreview.schedule_day && formPreview.schedule_start_time && formPreview.schedule_end_time), helper: formPreview.schedule_day && formPreview.schedule_start_time && formPreview.schedule_end_time ? `${formPreview.schedule_day}, ${formPreview.schedule_start_time} - ${formPreview.schedule_end_time}` : "Isi hari, jam mulai, dan jam selesai" },
  ];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const scheduleStart = String(formData.get("schedule_start_time") || "");
    const scheduleEnd = String(formData.get("schedule_end_time") || "");
    const scheduleDay = String(formData.get("schedule_day") || "");
    if ((scheduleDay || scheduleStart || scheduleEnd) && !(scheduleDay && scheduleStart && scheduleEnd)) {
      setIsSubmitting(false);
      toast.error("Lengkapi hari, jam mulai, dan jam selesai halaqoh.");
      return;
    }
    if (scheduleStart && scheduleEnd && scheduleEnd <= scheduleStart) {
      setIsSubmitting(false);
      toast.error("Jam selesai harus setelah jam mulai.");
      return;
    }
    const data = {
      name: formData.get("name"),
      employee_id: formData.get("employee_id") || null,
      subject_id: formData.get("subject_id") || null,
      description: formData.get("description"),
      schedule_day: scheduleDay || null,
      schedule_start_time: scheduleStart || null,
      schedule_end_time: scheduleEnd || null,
      schedule_time: scheduleStart && scheduleEnd ? `${scheduleStart} - ${scheduleEnd}` : null,
      academic_year_id: formData.get("academic_year_id"),
      semester_id: formData.get("semester_id"),
      program_type: "tahsin",
    };

    try {
      if (isEdit) {
        const { error } = await supabase.from("tahfidz_halaqohs").update(data).eq("id", id);
        if (error) throw error;
        toast.success("Halaqoh Tahsin berhasil diperbarui");
      } else {
        const { error } = await supabase.from("tahfidz_halaqohs").insert([data]);
        if (error) throw error;
        toast.success("Halaqoh Tahsin berhasil ditambahkan");
      }
      navigate("/tahsin-halaqohs");
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/tahsin-halaqohs" className="p-2 hover:bg-muted rounded-full transition-colors shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader
          title={isEdit ? "Edit Halaqoh Tahsin" : "Tambah Halaqoh Tahsin"}
          description="Atur kelompok tahsin/tilawah yang siap dipakai untuk target, jurnal harian, dan ujian kenaikan jilid."
        />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Halaqoh siap jalan
            </div>
            <h2 className="mt-3 text-xl font-bold">
              {isEdit ? "Perbarui struktur halaqoh tanpa mengganggu riwayat siswa" : "Buat kelompok tahsin yang mudah dipantau"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Setelah halaqoh dibuat, lanjutkan dengan menambah anggota, target personal, jurnal harian, dan ujian kenaikan jilid.
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

      <form key={record?.id || "create-tahsin-halaqoh"} onSubmit={handleSubmit} className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="space-y-8 p-6">
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 border-b pb-2 text-lg font-semibold">
              <BookOpen className="h-5 w-5 text-primary" />
              Informasi Utama
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Nama Halaqoh Tahsin <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={record?.name || ""}
                  onChange={(event) => setFormPreview((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Contoh: Tahsin Ula Pagi"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tahun Ajaran <span className="text-red-500">*</span></label>
                <select
                  name="academic_year_id"
                  required
                  defaultValue={record?.academic_year_id || activeYearId || ""}
                  onChange={(event) => setFormPreview((prev) => ({ ...prev, academic_year_id: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Pilih Tahun Ajaran --</option>
                  {yearOptions?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Semester <span className="text-red-500">*</span></label>
                <select
                  name="semester_id"
                  required
                  defaultValue={record?.semester_id || activeSemesterId || ""}
                  onChange={(event) => setFormPreview((prev) => ({ ...prev, semester_id: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Pilih Semester --</option>
                  {semesterOptions?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Mata Pelajaran Tahsin <span className="text-red-500">*</span></label>
                <select
                  name="subject_id"
                  required
                  value={formPreview.subject_id}
                  onChange={(event) => setFormPreview((prev) => ({ ...prev, subject_id: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Pilih Mapel Tahsin --</option>
                  {subjectOptions.map((subject: any) => (
                    <option key={subject.id} value={subject.id}>{subject.name} - {subject.units?.name || "Unit belum diisi"}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Belum tersedia? Tandai mapel sebagai Tahsin atau Tahsin & Tahfidz pada master mata pelajaran.</p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4 md:border-r md:pr-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Users className="h-5 w-5 text-primary" />
                Guru & Keterangan
              </h3>
              <div className="space-y-2">
                <label className="text-sm font-medium">Guru Tahsin</label>
                <select
                  name="employee_id"
                  defaultValue={record?.employee_id || ""}
                  onChange={(event) => setFormPreview((prev) => ({ ...prev, employee_id: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Belum ada pengampu --</option>
                  {employeeOptions?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deskripsi / Catatan</label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={record?.description || ""}
                  placeholder="Contoh: Kelompok pembinaan makhraj dasar dan kelancaran jilid 1-2."
                  className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="h-5 w-5 text-primary" />
                Jadwal Halaqoh
              </h3>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hari</label>
                <select
                  name="schedule_day"
                  defaultValue={record?.schedule_day || ""}
                  onChange={(event) => setFormPreview((prev) => ({ ...prev, schedule_day: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Pilih Hari --</option>
                  {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Ahad"].map((day) => <option key={day} value={day}>{day}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jam Mulai</label>
                  <input
                    type="time"
                    name="schedule_start_time"
                    value={formPreview.schedule_start_time}
                    onChange={(event) => setFormPreview((prev) => ({ ...prev, schedule_start_time: event.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jam Selesai</label>
                  <input
                    type="time"
                    name="schedule_end_time"
                    value={formPreview.schedule_end_time}
                    min={formPreview.schedule_start_time || undefined}
                    onChange={(event) => setFormPreview((prev) => ({ ...prev, schedule_end_time: event.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Jadwal otomatis terhubung ke portal pengajar dan absensi guru part-time.</p>
            </div>
          </section>

          <section className="rounded-xl border bg-muted/20 p-4">
            <h3 className="text-base font-semibold">Alur setelah halaqoh tersimpan</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                { icon: Users, label: "Anggota", detail: "Tambahkan siswa aktif" },
                { icon: Target, label: "Target", detail: "Tetapkan target jilid/halaman" },
                { icon: ClipboardCheck, label: "Jurnal", detail: "Catat latihan harian" },
                { icon: Award, label: "Ujian", detail: "Validasi kenaikan jilid" },
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

        <div className="flex items-center justify-between gap-3 border-t bg-muted/30 p-6">
          <p className="hidden text-xs text-muted-foreground sm:block"><span className="text-red-500">*</span> Wajib diisi</p>
          <div className="flex w-full gap-3 sm:w-auto">
            <Link to="/tahsin-halaqohs" className="flex flex-1 items-center justify-center rounded-lg border bg-background px-6 py-2 text-sm font-medium transition-colors hover:bg-muted sm:flex-none">
              Batal
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || formLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 sm:flex-none"
            >
              <Save className="h-4 w-4" />
              {isSubmitting || formLoading ? "Menyimpan..." : "Simpan Halaqoh"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
