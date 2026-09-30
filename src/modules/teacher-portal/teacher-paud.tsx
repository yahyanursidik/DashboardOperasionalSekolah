/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React from "react";
import { useOutletContext } from "react-router";
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
import { uploadDocument } from "../../lib/supabase/storage";
import { toDateInputValue } from "../leaves/leave-utils";
import {
  isPaudUnit,
  PAUD_ASPECTS,
  PAUD_CP_ELEMENTS,
  PAUD_EVIDENCE_SOURCES,
  PAUD_ISLAMIC_VALUES,
  PAUD_LEARNING_MODE_LABELS,
  PAUD_OBSERVATION_METHODS,
  PAUD_PHASES,
  PAUD_SCALE_TONES,
  type PaudLearningMode,
  type PaudPhaseId,
  type PaudScale,
} from "../paud/paud-config";
import { PaudAssessmentEditor } from "../paud/components/PaudAssessmentEditor";
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
  const [unitModes, setUnitModes] = React.useState<Record<string, PaudLearningMode>>({});
  const [semester, setSemester] = React.useState<any>(null);
  const [phase, setPhase] = React.useState<PaudPhaseId>("awal");
  const [classAssessments, setClassAssessments] = React.useState<any[]>([]);

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
        .filter((item: any) => isPaudUnit(item.units))
        .forEach((item: any) => classMap.set(item.id, item));
      const assigned = [...classMap.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
      setClasses(assigned);
      const unitIds = [...new Set(assigned.map((item) => item.unit_id).filter(Boolean))];
      if (unitIds.length) {
        const { data: unitRows } = await (supabaseClient as any).from("units").select("id,delivery_mode").in("id", unitIds);
        setUnitModes(Object.fromEntries((unitRows || []).map((unit: any) => [unit.id, unit.delivery_mode === "online" ? "online" : "reguler"])));
      }
      if (assigned.length === 1) {
        setSelectedUnitId(assigned[0].unit_id);
        setSelectedClassId(assigned[0].id);
      }
      setIsLoadingAssignments(false);
    };
    void loadAssignments();
  }, [activeSemesterId, activeYearId, employee.id]);

  React.useEffect(() => {
    if (!activeSemesterId) { setSemester(null); return; }
    void supabaseClient.from("semesters").select("id,name,start_date,end_date").eq("id", activeSemesterId).maybeSingle()
      .then(({ data }) => setSemester(data || null));
  }, [activeSemesterId]);

  const loadClassAssessments = React.useCallback(async () => {
    if (!selectedClassId || !activeSemesterId) { setClassAssessments([]); return; }
    const { data } = await (supabaseClient as any).from("paud_stppa_assessments")
      .select("id,student_id,phase,status,is_parent_visible,nab_scale,jati_diri_scale,steam_scale,parent_reflection")
      .eq("class_id", selectedClassId).eq("semester_id", activeSemesterId);
    setClassAssessments(data || []);
  }, [activeSemesterId, selectedClassId]);
  React.useEffect(() => { void loadClassAssessments(); }, [loadClassAssessments]);

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
  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const learningMode: PaudLearningMode = unitModes[selectedClass?.unit_id || selectedUnitId] || "reguler";
  const selectedStudent = students.find((item) => item.id === selectedStudentId);

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error("Gunakan gambar dengan ukuran maksimal 5 MB.");
      return;
    }
    setIsUploading(true);
    try {
      const uploaded = await uploadDocument(file, `paud/activities/${selectedStudentId || "unassigned"}`);
      setPhotoUrl(uploaded.filePath);
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
      learning_mode: learningMode,
      evidence_source: formData.get("evidence_source"),
      cp_elements: formData.getAll("cp_elements"),
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

  return (
    <div className="space-y-6 pb-10">
      <header className="border-b pb-5">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-emerald-50 p-2 text-emerald-700"><BookOpen className="h-5 w-5" /></span>
          <div>
            <h1 className="text-2xl font-bold">Perkembangan Anak KB/TK</h1>
            <p className="mt-1 text-sm text-muted-foreground">Jurnal observasi dan asesmen awal, tengah, akhir Kurikulum Merdeka untuk kelas reguler maupun Preschool HBL yang ditugaskan kepada Anda.</p>
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
              {unitOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} · {PAUD_LEARNING_MODE_LABELS[unitModes[unit.id] || "reguler"]}</option>)}
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
          <ClipboardCheck className="h-4 w-4" /> Asesmen Awal · Tengah · Akhir
        </button>
      </div>

      {mode === "observation" ? (
        <form onSubmit={submitObservation} className="space-y-5 rounded-lg border bg-card p-5 sm:p-6">
          <div><h2 className="font-bold">Catat bukti belajar</h2><p className="mt-1 text-sm text-muted-foreground">Tuliskan perilaku yang terlihat dan tindak lanjut yang dapat dilakukan.</p></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Tanggal"><input name="date" type="date" required defaultValue={toDateInputValue(new Date())} className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></Field>
            <Field label="Metode"><select name="observation_method" className="h-10 w-full rounded-md border bg-background px-3 text-sm">{PAUD_OBSERVATION_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
            <Field label={`Sumber bukti · ${PAUD_LEARNING_MODE_LABELS[learningMode]}`}>
              <select name="evidence_source" key={learningMode} defaultValue={learningMode === "online" ? "live_meet" : "observasi_kelas"} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {PAUD_EVIDENCE_SOURCES.filter((item) => (item.modes as readonly string[]).includes(learningMode)).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Judul kegiatan"><input name="title" required placeholder="Kegiatan atau momen belajar" className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></Field>
          <Field label="Narasi observasi"><textarea name="description" required rows={4} placeholder="Situasi, tindakan atau ucapan anak, serta respons guru." className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></Field>
          <div>
            <p className="text-sm font-semibold">Elemen Capaian Pembelajaran</p>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              {PAUD_CP_ELEMENTS.map((element) => <CheckOption key={element.id} name="cp_elements" value={element.id} label={element.shortTitle} />)}
            </div>
          </div>
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
        <div className="space-y-5">
          <section className="rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="inline-flex w-full rounded-md border bg-muted/40 p-1 md:w-auto">
                {PAUD_PHASES.map((item) => (
                  <button key={item.id} type="button" onClick={() => setPhase(item.id)} className={`flex-1 rounded px-3 py-2 text-xs font-semibold md:flex-none ${phase === item.id ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>
                    {item.title}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{PAUD_PHASES.find((item) => item.id === phase)?.timing} · pilih anak dari daftar di bawah</p>
            </div>
            {!selectedClassId ? (
              <p className="mt-4 text-sm text-muted-foreground">Pilih unit dan kelas untuk melihat status asesmen setiap anak.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((item) => {
                  const records = classAssessments.filter((record) => record.student_id === item.id);
                  const record = records.find((row) => row.phase === phase);
                  return (
                    <button key={item.id} type="button" onClick={() => setSelectedStudentId(item.id)} className={`rounded-md border p-3 text-left text-sm ${selectedStudentId === item.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{item.full_name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${!record ? "bg-slate-100 text-slate-600" : record.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {!record ? "Belum" : record.status === "published" ? "Terbit" : "Draf"}
                        </span>
                      </span>
                      <span className="mt-2 flex gap-1">
                        {PAUD_PHASES.map((phaseItem) => {
                          const row = records.find((entry) => entry.phase === phaseItem.id);
                          const scale = row?.steam_scale as PaudScale | undefined;
                          return <span key={phaseItem.id} className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${row ? (scale ? PAUD_SCALE_TONES[scale] : "bg-muted") : "text-muted-foreground"}`}>{phaseItem.shortTitle}{row?.parent_reflection ? " •" : ""}</span>;
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
          {selectedStudent && semester && activeYearId ? (
            <PaudAssessmentEditor
              key={`${selectedStudent.id}-${phase}-${semester.id}`}
              student={{ ...selectedStudent, class_id: selectedClassId, unit_id: selectedClass?.unit_id }}
              classId={selectedClassId}
              className={selectedClass?.name}
              unitName={selectedClass?.units?.name}
              phase={phase}
              learningMode={learningMode}
              academicYearId={activeYearId}
              semester={semester}
              employeeId={employee.id}
              onSaved={() => { void loadClassAssessments(); }}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              {!activeSemesterId ? "Semester aktif belum tersedia." : "Pilih anak untuk mengisi atau membuka asesmen."}
            </div>
          )}
        </div>
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
