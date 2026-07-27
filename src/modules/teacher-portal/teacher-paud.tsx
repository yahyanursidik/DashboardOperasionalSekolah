/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React from "react";
import { useOutletContext } from "react-router-dom";
import {
  BookOpen,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Info,
  Save,
  UploadCloud,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { supabaseClient } from "../../lib/supabase/client";
import { toDateInputValue } from "../leaves/leave-utils";
import {
  PAUD_ASPECTS,
  PAUD_ISLAMIC_VALUES,
  PAUD_OBSERVATION_METHODS,
  PAUD_SCALES,
  PAUD_SCALE_LABELS,
} from "../paud/paud-config";
import { loadTeacherAcademicAssignments } from "./teacher-assignment-data";

type Mode = "observation" | "assessment";

export const TeacherPaud: React.FC = () => {
  const { employee } = useOutletContext<any>();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [mode, setMode] = React.useState<Mode>("observation");
  const [classes, setClasses] = React.useState<any[]>([]);
  const [students, setStudents] = React.useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = React.useState("");
  const [selectedClassId, setSelectedClassId] = React.useState("");
  const [selectedStudentId, setSelectedStudentId] = React.useState("");
  const [isLoadingAssignments, setIsLoadingAssignments] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [recentCount, setRecentCount] = React.useState({ observations: 0, assessments: 0 });

  React.useEffect(() => {
    const loadAssignments = async () => {
      setIsLoadingAssignments(true);
      let scheduleQuery = supabaseClient
        .from("employee_schedules")
        .select("class_id, classes(id,name,unit_id,units(id,name,education_level))")
        .eq("employee_id", employee.id)
        .not("class_id", "is", null);
      if (activeYearId) scheduleQuery = scheduleQuery.eq("academic_year_id", activeYearId);
      if (activeSemesterId) scheduleQuery = scheduleQuery.eq("semester_id", activeSemesterId);

      let homeroomQuery = supabaseClient
        .from("classes")
        .select("id,name,unit_id,units(id,name,education_level)")
        .eq("homeroom_teacher_id", employee.id);
      if (activeYearId) homeroomQuery = homeroomQuery.eq("academic_year_id", activeYearId);

      const [scheduleResult, assignmentResult, homeroomResult] = await Promise.all([
        scheduleQuery,
        loadTeacherAcademicAssignments({ employeeId: employee.id, academicYearId: activeYearId, semesterId: activeSemesterId }),
        homeroomQuery,
      ]);
      const classMap = new Map<string, any>();
      [
        ...(scheduleResult.data || []).map((item: any) => item.classes),
        ...(assignmentResult.data || []).map((item: any) => item.classes),
        ...(homeroomResult.data || []),
      ]
        .filter(Boolean)
        .filter((item: any) => {
          const unit = item.units;
          const unitText = String(unit?.name || "").toLowerCase();
          return unit?.education_level === "preschool" || ["paud", "tk", "kb", "preschool"].some((term) => unitText.includes(term));
        })
        .forEach((item: any) => classMap.set(item.id, item));
      const assigned = [...classMap.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
      setClasses(assigned);
      if (assigned.length === 1) {
        setSelectedUnitId(assigned[0].unit_id);
        setSelectedClassId(assigned[0].id);
      }
      setIsLoadingAssignments(false);
    };
    void loadAssignments();
  }, [activeSemesterId, activeYearId, employee.id]);

  React.useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentId("");
      return;
    }
    const loadStudents = async () => {
      const { data, error } = await supabaseClient
        .from("students")
        .select("id,full_name")
        .eq("class_id", selectedClassId)
        .eq("status", "active")
        .order("full_name");
      if (error) toast.error(`Daftar anak gagal dimuat: ${error.message}`);
      setStudents(data || []);
      setSelectedStudentId("");
    };
    void loadStudents();
  }, [selectedClassId]);

  React.useEffect(() => {
    if (!selectedStudentId) {
      setRecentCount({ observations: 0, assessments: 0 });
      return;
    }
    const loadCounts = async () => {
      let observationQuery = supabaseClient
        .from("paud_activities")
        .select("id", { count: "exact", head: true })
        .eq("student_id", selectedStudentId);
      let assessmentQuery = supabaseClient
        .from("paud_stppa_assessments")
        .select("id", { count: "exact", head: true })
        .eq("student_id", selectedStudentId);
      if (activeSemesterId) {
        observationQuery = observationQuery.eq("semester_id", activeSemesterId);
        assessmentQuery = assessmentQuery.eq("semester_id", activeSemesterId);
      }
      const [observations, assessments] = await Promise.all([
        observationQuery,
        assessmentQuery,
      ]);
      setRecentCount({ observations: observations.count || 0, assessments: assessments.count || 0 });
    };
    void loadCounts();
  }, [activeSemesterId, selectedStudentId]);

  const unitOptions = React.useMemo(() => {
    const map = new Map<string, any>();
    classes.forEach((item) => item.units?.id && map.set(item.units.id, item.units));
    return [...map.values()];
  }, [classes]);
  const filteredClasses = classes.filter((item) => !selectedUnitId || item.unit_id === selectedUnitId);

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error("Gunakan gambar dengan ukuran maksimal 5 MB.");
      return;
    }
    setIsUploading(true);
    try {
      const extension = file.name.split(".").pop() || "jpg";
      const path = `paud_activities/${selectedStudentId || "unassigned"}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabaseClient.storage.from("documents").upload(path, file);
      if (error) throw error;
      setPhotoUrl(supabaseClient.storage.from("documents").getPublicUrl(path).data.publicUrl);
      toast.success("Bukti foto berhasil diunggah.");
    } catch (error: any) {
      toast.error(`Foto gagal diunggah: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const submitObservation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStudentId || !selectedClassId || !activeYearId || !activeSemesterId) {
      toast.error("Pilih unit, kelas, anak, serta pastikan periode akademik aktif.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    const { error } = await supabaseClient.from("paud_activities").insert({
      student_id: selectedStudentId,
      class_id: selectedClassId,
      employee_id: employee.id,
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
      date: formData.get("date"),
      title: formData.get("title"),
      description: formData.get("description"),
      observation_method: formData.get("observation_method"),
      development_aspects: formData.getAll("development_aspects"),
      islamic_values: formData.getAll("islamic_values"),
      follow_up: formData.get("follow_up") || null,
      photo_url: photoUrl || null,
      status: formData.get("status"),
      is_parent_visible: formData.get("status") === "published",
    });
    setIsSubmitting(false);
    if (error) {
      toast.error(`Observasi gagal disimpan: ${error.message}`);
      return;
    }
    toast.success("Observasi anak berhasil disimpan.");
    event.currentTarget.reset();
    setPhotoUrl("");
    setRecentCount((value) => ({ ...value, observations: value.observations + 1 }));
  };

  const submitAssessment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStudentId || !selectedClassId || !activeYearId || !activeSemesterId) {
      toast.error("Pilih unit, kelas, anak, serta pastikan periode akademik aktif.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const values: Record<string, unknown> = {
      student_id: selectedStudentId,
      class_id: selectedClassId,
      employee_id: employee.id,
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
      period_name: formData.get("period_name"),
      date: formData.get("date"),
      strengths: formData.get("strengths") || null,
      follow_up: formData.get("follow_up") || null,
      parent_partnership: formData.get("parent_partnership") || null,
      status: formData.get("status"),
      is_parent_visible: formData.get("status") === "published",
    };
    PAUD_ASPECTS.forEach((aspect) => {
      values[`${aspect.id}_scale`] = formData.get(`${aspect.id}_scale`);
      values[`${aspect.id}_desc`] = formData.get(`${aspect.id}_desc`);
    });
    setIsSubmitting(true);
    const { error } = await supabaseClient.from("paud_stppa_assessments").insert(values);
    setIsSubmitting(false);
    if (error) {
      toast.error(`Asesmen gagal disimpan: ${error.message}`);
      return;
    }
    toast.success("Asesmen perkembangan berhasil disimpan.");
    event.currentTarget.reset();
    setRecentCount((value) => ({ ...value, assessments: value.assessments + 1 }));
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="border-b pb-5">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-emerald-50 p-2 text-emerald-700"><BookOpen className="h-5 w-5" /></span>
          <div>
            <h1 className="text-2xl font-bold">Perkembangan Anak KB/TK</h1>
            <p className="mt-1 text-sm text-muted-foreground">Observasi autentik dan asesmen STPPA sesuai kelas yang ditugaskan kepada Anda.</p>
          </div>
        </div>
      </header>

      <section className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SelectField label="Unit">
            <select
              value={selectedUnitId}
              onChange={(event) => { setSelectedUnitId(event.target.value); setSelectedClassId(""); }}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Pilih unit PAUD/TK</option>
              {unitOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </SelectField>
          <SelectField label="Kelas">
            <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} disabled={!selectedUnitId} className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50">
              <option value="">Pilih kelas</option>
              {filteredClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </SelectField>
          <SelectField label="Anak">
            <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} disabled={!selectedClassId} className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50">
              <option value="">Pilih anak</option>
              {students.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
            </select>
          </SelectField>
        </div>
        {selectedStudentId && (
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4 text-xs">
            <span className="rounded bg-violet-50 px-2 py-1 font-semibold text-violet-700">{recentCount.observations} observasi semester ini</span>
            <span className="rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{recentCount.assessments} asesmen semester ini</span>
          </div>
        )}
      </section>

      {!isLoadingAssignments && !classes.length && (
        <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Info className="h-5 w-5 shrink-0" />
          <div><p className="font-semibold">Belum ada kelas PAUD/TK dalam penugasan Anda</p><p className="mt-1">Minta admin memeriksa wali kelas atau jadwal mengajar pada tahun ajaran dan semester aktif.</p></div>
        </div>
      )}

      <div className="inline-flex w-full rounded-md border bg-muted/40 p-1 sm:w-auto">
        <button type="button" onClick={() => setMode("observation")} className={`flex flex-1 items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold sm:flex-none ${mode === "observation" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>
          <Camera className="h-4 w-4" /> Observasi
        </button>
        <button type="button" onClick={() => setMode("assessment")} className={`flex flex-1 items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold sm:flex-none ${mode === "assessment" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>
          <ClipboardCheck className="h-4 w-4" /> Asesmen STPPA
        </button>
      </div>

      {mode === "observation" ? (
        <form onSubmit={submitObservation} className="space-y-5 rounded-lg border bg-card p-5 sm:p-6">
          <div><h2 className="font-bold">Catat bukti belajar</h2><p className="mt-1 text-sm text-muted-foreground">Tuliskan perilaku yang terlihat dan tindak lanjut yang dapat dilakukan.</p></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Tanggal"><input name="date" type="date" required defaultValue={toDateInputValue(new Date())} className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></Field>
            <Field label="Metode"><select name="observation_method" className="h-10 w-full rounded-md border bg-background px-3 text-sm">{PAUD_OBSERVATION_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          </div>
          <Field label="Judul kegiatan"><input name="title" required placeholder="Kegiatan atau momen belajar" className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></Field>
          <Field label="Narasi observasi"><textarea name="description" required rows={4} placeholder="Situasi, tindakan atau ucapan anak, serta respons guru." className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></Field>
          <div>
            <p className="text-sm font-semibold">Aspek perkembangan yang terbukti</p>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {PAUD_ASPECTS.map((aspect) => <CheckOption key={aspect.id} name="development_aspects" value={aspect.id} label={aspect.shortTitle} />)}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">Nilai Islam dan karakter</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PAUD_ISLAMIC_VALUES.map((value) => <CheckOption key={value} name="islamic_values" value={value} label={value} compact />)}
            </div>
          </div>
          <Field label="Tindak lanjut"><textarea name="follow_up" rows={3} placeholder="Stimulasi berikutnya di kelas." className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Bukti foto">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm font-semibold text-muted-foreground hover:bg-muted/30">
              {photoUrl ? <><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Foto siap disimpan</> : <><UploadCloud className="h-5 w-5" /> {isUploading ? "Mengunggah..." : "Unggah gambar maksimal 5 MB"}</>}
              <input type="file" accept="image/*" onChange={uploadPhoto} className="sr-only" />
            </label>
          </Field>
          <PublishRow />
          <SubmitButton loading={isSubmitting || isUploading} disabled={!selectedStudentId} label="Simpan Observasi" />
        </form>
      ) : (
        <form onSubmit={submitAssessment} className="space-y-6">
          <section className="rounded-lg border bg-card p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nama periode"><input name="period_name" required placeholder="Contoh: Tengah Semester Ganjil" className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></Field>
              <Field label="Tanggal asesmen"><input name="date" type="date" required defaultValue={toDateInputValue(new Date())} className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></Field>
            </div>
          </section>
          <section className="divide-y overflow-hidden rounded-lg border bg-card">
            {PAUD_ASPECTS.map((aspect) => (
              <div key={aspect.id} className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[260px_1fr]">
                <div>
                  <h3 className="font-bold">{aspect.title}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {PAUD_SCALES.map((scale) => (
                      <label key={scale} className="cursor-pointer">
                        <input type="radio" name={`${aspect.id}_scale`} value={scale} required defaultChecked={scale === "BSH"} className="peer sr-only" />
                        <span className="block rounded-md border p-2 text-xs peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary">{scale} · {PAUD_SCALE_LABELS[scale]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Field label={`Narasi ${aspect.shortTitle}`}><textarea name={`${aspect.id}_desc`} required rows={5} placeholder="Kemampuan yang tampak, contoh bukti, dan dukungan yang diperlukan." className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></Field>
              </div>
            ))}
          </section>
          <section className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-5 lg:grid-cols-3">
            <Field label="Kekuatan dan minat"><textarea name="strengths" rows={4} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></Field>
            <Field label="Tindak lanjut sekolah"><textarea name="follow_up" rows={4} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></Field>
            <Field label="Kemitraan orang tua"><textarea name="parent_partnership" rows={4} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></Field>
          </section>
          <section className="rounded-lg border bg-card p-5"><PublishRow /><SubmitButton loading={isSubmitting} disabled={!selectedStudentId} label="Simpan Asesmen" /></section>
        </form>
      )}
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold">{label}</span>{children}</label>;
}

function SelectField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2"><span className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground"><Users className="h-3.5 w-3.5" />{label}</span>{children}</label>;
}

function CheckOption({ name, value, label, compact }: { name: string; value: string; label: string; compact?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-md border ${compact ? "px-3 py-2" : "p-3"} text-sm peer-checked:bg-primary/10`}>
      <input type="checkbox" name={name} value={value} className="accent-primary" /><span>{label}</span>
    </label>
  );
}

function PublishRow() {
  return (
    <Field label="Status publikasi">
      <select name="status" defaultValue="published" className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:max-w-sm">
        <option value="draft">Draf internal</option>
        <option value="published">Terbit ke portal orang tua</option>
      </select>
    </Field>
  );
}

function SubmitButton({ loading, disabled, label }: { loading: boolean; disabled: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading || disabled} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto">
      <Save className="h-4 w-4" /> {loading ? "Menyimpan..." : label}
    </button>
  );
}
