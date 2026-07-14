import React, { useEffect, useMemo } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useList, useSelect } from "@refinedev/core";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Save, ArrowLeft, Award, BookOpen, CheckCircle2, ClipboardCheck, ShieldCheck, Target, Users } from "lucide-react";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { PageHeader } from "../../../components/layout/PageHeader";

const tahsinSchema = z.object({
  student_id: z.string().min(1, "Pilih siswa"),
  academic_year_id: z.string().min(1, "Tahun ajaran wajib diisi"),
  semester_id: z.string().min(1, "Semester wajib diisi"),
  record_type: z.literal("tahsin"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  surah_or_jilid: z.string().min(1, "Wajib diisi (Jilid / Surah)"),
  ayat_or_page: z.string().min(1, "Wajib diisi (Halaman / Ayat)"),
  fluency_score: z.enum(["Sangat Lancar", "Lancar", "Kurang Lancar", "Mengulang"]),
  tajwid_score: z.string().optional().nullable(),
  makhroj_score: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  halaqoh_id: z.string().optional().nullable(),
  employee_id: z.string().optional().nullable(),
});

type TahsinFormValues = z.infer<typeof tahsinSchema>;

export const TahsinRecordForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [searchParams] = useSearchParams();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const initialHalaqohId = searchParams.get("halaqoh_id") || "";
  const initialStudentId = searchParams.get("student_id") || "";

  const {
    refineCore: { onFinish, formLoading, queryResult },
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TahsinFormValues>({
    resolver: zodResolver(tahsinSchema) as any,
    refineCoreProps: {
      action: isEdit ? "edit" : "create",
      resource: "quran_records",
      id,
      redirect: "list",
    },
    defaultValues: {
      academic_year_id: activeYearId || "",
      semester_id: activeSemesterId || "",
      record_type: "tahsin",
      date: new Date().toISOString().split('T')[0],
      fluency_score: "Lancar",
      halaqoh_id: initialHalaqohId,
      student_id: initialStudentId,
      employee_id: "",
    }
  });

  const record = queryResult?.data?.data as any;
  const currentHalaqohId = watch("halaqoh_id");
  const currentStudentId = watch("student_id");
  const currentJilid = watch("surah_or_jilid");
  const currentPage = watch("ayat_or_page");
  const currentFluency = watch("fluency_score");
  const currentTajwid = watch("tajwid_score");
  const currentMakhroj = watch("makhroj_score");
  const currentEmployeeId = watch("employee_id");

  useEffect(() => {
    if (record) {
      setValue("halaqoh_id", record.halaqoh_id);
      setValue("student_id", record.student_id);
      setValue("employee_id", record.employee_id || "");
    }
  }, [record, setValue]);

  // Fetch available halaqohs for Tahsin
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
  const tahsinHalaqohIds = useMemo(() => new Set(halaqohs.map((halaqoh: any) => halaqoh.id)), [halaqohs]);

  const { data: allMembersData } = useList({
    resource: "tahfidz_halaqoh_members",
    meta: { select: "halaqoh_id, student_id, students(id, full_name, class_id, classes(name, units(name)))" },
    pagination: { mode: "off" }
  });
  const allMembers = allMembersData?.data || [];

  // Fetch members of the selected halaqoh
  const { data: membersData, isLoading: isLoadingStudents } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: currentHalaqohId ? [{ field: "halaqoh_id", operator: "eq", value: currentHalaqohId }] : [],
    queryOptions: { enabled: !!currentHalaqohId },
    meta: { select: "student_id, students(id, full_name, class_id, classes(name, units(name)))" },
    pagination: { mode: "off" }
  });

  const members = membersData?.data || [];
  const selectedMember = members.find((member: any) => member.student_id === currentStudentId) ||
    allMembers.find((member: any) => member.student_id === currentStudentId && tahsinHalaqohIds.has(member.halaqoh_id));
  const selectedStudent = selectedMember?.students;

  useEffect(() => {
    if (!initialStudentId || currentHalaqohId || tahsinHalaqohIds.size === 0) return;
    const member = allMembers.find((item: any) => item.student_id === initialStudentId && tahsinHalaqohIds.has(item.halaqoh_id));
    if (member?.halaqoh_id) setValue("halaqoh_id", member.halaqoh_id);
  }, [allMembers, currentHalaqohId, initialStudentId, setValue, tahsinHalaqohIds]);

  const { options: employeeOptions } = useSelect({
    resource: "employees",
    optionLabel: "full_name",
    optionValue: "id",
    sorters: [{ field: "full_name", order: "asc" }],
  });
  const selectedEmployee = employeeOptions?.find((option) => option.value === currentEmployeeId);
  const checklist = [
    { label: "Siswa", done: Boolean(currentStudentId), helper: selectedStudent?.full_name || "Pilih siswa halaqoh" },
    { label: "Materi", done: Boolean(currentJilid && currentPage), helper: currentJilid && currentPage ? `${currentJilid} - ${currentPage}` : "Isi jilid/surah dan halaman/ayat" },
    { label: "Kelancaran", done: Boolean(currentFluency), helper: currentFluency || "Pilih tingkat kelancaran" },
    { label: "Tajwid/Makhraj", done: Boolean(currentTajwid || currentMakhroj), helper: currentTajwid || currentMakhroj ? "Skor kualitas terisi" : "Isi minimal salah satu bila ada" },
    { label: "Penguji", done: Boolean(currentEmployeeId), helper: selectedEmployee?.label || "Pilih guru/penguji" },
  ];

  const handleFinish = (values: TahsinFormValues) => {
    const member = members.find((item: any) => item.student_id === values.student_id) ||
      allMembers.find((item: any) => item.student_id === values.student_id && tahsinHalaqohIds.has(item.halaqoh_id));
    return onFinish({
      ...values,
      employee_id: values.employee_id || null,
      class_id: member?.students?.class_id || record?.class_id || null,
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(currentHalaqohId ? `/tahsin-records?halaqoh_id=${currentHalaqohId}` : "/tahsin-records")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Jurnal Tahsin" : "Input Jurnal Tahsin"}
          description="Catat setoran tilawah atau bacaan tahsin siswa per halaqoh."
        />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Jurnal siap audit
            </div>
            <h2 className="mt-3 text-xl font-bold">
              {isEdit ? "Perbarui jurnal tanpa memutus riwayat siswa" : "Catat latihan harian yang bisa ditindaklanjuti"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Jurnal Tahsin menjadi bukti proses sebelum target dinyatakan tercapai atau siswa mengikuti ujian kenaikan jilid.
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

      <form onSubmit={handleSubmit(handleFinish as any)} className="bg-card rounded-xl border shadow-sm overflow-hidden">
        
        {/* Identitas Program */}
        <div className="p-6 border-b bg-emerald-500/10 flex items-center gap-3">
           <BookOpen className="w-6 h-6 text-emerald-600" />
          <div>
             <h2 className="font-semibold text-emerald-800 text-lg">Program Tahsin (Bacaan)</h2>
             <p className="text-sm text-emerald-700/80">Input mutaba'ah harian tilawah siswa.</p>
           </div>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Pemilihan Sumber Siswa */}
          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span> 
              Pilih Siswa
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Halaqoh Tahsin <span className="text-destructive">*</span></label>
                <select
                  {...register("halaqoh_id")}
                  disabled={isEdit}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                >
                  <option value="">-- Pilih Halaqoh Tahsin --</option>
                  {halaqohs.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                {errors.halaqoh_id && <p className="text-sm text-destructive">{errors.halaqoh_id.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Siswa <span className="text-destructive">*</span></label>
                <select
                  {...register("student_id")}
                  disabled={isEdit || !currentHalaqohId || isLoadingStudents}
                  className={`w-full flex h-10 rounded-md border px-3 py-2 text-sm ring-offset-background disabled:opacity-50 ${errors.student_id ? 'border-destructive' : 'border-input bg-background'}`}
                >
                  <option value="">
                    {currentHalaqohId ? "-- Pilih Siswa --" : "-- Pilih Halaqoh Dulu --"}
                  </option>
                  {members.map((m: any) => {
                    const s = m.students;
                    if (!s) return null;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.classes?.name || "Tanpa Kelas"})
                      </option>
                    )
                  })}
                </select>
                {errors.student_id && <p className="text-sm text-destructive">{errors.student_id.message as string}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Guru / Penguji</label>
                <select
                  {...register("employee_id")}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">-- Pilih guru/penguji --</option>
                  {employeeOptions?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Form Utama Setoran */}
          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              Detail Setoran
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal <span className="text-destructive">*</span></label>
                <input 
                  type="date" 
                  {...register("date")} 
                  className={`w-full flex h-10 rounded-md border px-3 py-2 text-sm ring-offset-background ${errors.date ? 'border-destructive' : 'border-input bg-background'}`}
                />
                {errors.date && <p className="text-sm text-destructive">{errors.date.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tingkat Kelancaran <span className="text-destructive">*</span></label>
                <select 
                  {...register("fluency_score")}
                  className={`w-full flex h-10 rounded-md border px-3 py-2 text-sm ring-offset-background ${errors.fluency_score ? 'border-destructive' : 'border-input bg-background'}`}
                >
                  <option value="Sangat Lancar">Sangat Lancar</option>
                  <option value="Lancar">Lancar</option>
                  <option value="Kurang Lancar">Kurang Lancar</option>
                  <option value="Mengulang">Mengulang</option>
                </select>
                {errors.fluency_score && <p className="text-sm text-destructive">{errors.fluency_score.message as string}</p>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Jilid / Surah <span className="text-destructive">*</span></label>
                <input 
                  type="text" 
                  {...register("surah_or_jilid")} 
                  placeholder="Contoh: Jilid 2 / An-Naba" 
                  className={`w-full flex h-10 rounded-md border px-3 py-2 text-sm ring-offset-background ${errors.surah_or_jilid ? 'border-destructive' : 'border-input bg-background'}`}
                />
                {errors.surah_or_jilid && <p className="text-sm text-destructive">{errors.surah_or_jilid.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Halaman / Ayat <span className="text-destructive">*</span></label>
                <input 
                  type="text" 
                  {...register("ayat_or_page")} 
                  placeholder="Contoh: Hal 14 / Ayat 1-5" 
                  className={`w-full flex h-10 rounded-md border px-3 py-2 text-sm ring-offset-background ${errors.ayat_or_page ? 'border-destructive' : 'border-input bg-background'}`}
                />
                {errors.ayat_or_page && <p className="text-sm text-destructive">{errors.ayat_or_page.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nilai Tajwid (Opsional)</label>
                <input 
                  type="text" 
                  {...register("tajwid_score")} 
                  placeholder="Contoh: A, B, dll" 
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nilai Makhroj (Opsional)</label>
                <input 
                  type="text" 
                  {...register("makhroj_score")} 
                  placeholder="Contoh: A, B, dll" 
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Catatan / Evaluasi (Opsional)</label>
                <textarea 
                  {...register("notes")} 
                  placeholder="Tambahkan catatan khusus untuk siswa..." 
                  className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background resize-y"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <h3 className="text-base font-semibold">Alur setelah jurnal tersimpan</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                { icon: Target, label: "Target", detail: "Bandingkan dengan target personal" },
                { icon: BookOpen, label: "Latihan ulang", detail: "Tandai halaman yang perlu diulang" },
                { icon: Award, label: "Ujian jilid", detail: "Ajukan saat bacaan stabil" },
                { icon: ClipboardCheck, label: "Laporan", detail: "Terbaca di laporan Tahsin" },
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
          <button
            type="button"
            onClick={() => navigate(currentHalaqohId ? `/tahsin-records?halaqoh_id=${currentHalaqohId}` : "/tahsin-records")}
            className="px-6 py-2 rounded-lg bg-background border hover:bg-muted font-medium transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Jurnal Tahsin"}
          </button>
        </div>
      </form>
    </div>
  );
};
