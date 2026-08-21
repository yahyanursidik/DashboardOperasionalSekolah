/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-expressions */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ChevronRight, ClipboardCheck, ExternalLink, FilePlus2, Loader2, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import { useAcademicYear } from "../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../app/providers/UnitProvider";
import { HblMediaPreview, isValidHblResource } from "./hbl-media-preview";

const EMPTY_MATERIAL = { title: "", description: "", resource_type: "youtube", resource_url: "", report_type: "checklist", due_date: "" };
const hblDb = supabaseClient as any;

export const HblAdminSettings: React.FC = () => {
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const { activeUnitId } = useCurrentUnit();
  const [programs, setPrograms] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [semesterFilter, setSemesterFilter] = useState(activeSemesterId || "");
  const [programForm, setProgramForm] = useState({ name: "", description: "", unit_id: activeUnitId || "", semester_id: activeSemesterId || "" });
  const [subjectName, setSubjectName] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [materialForm, setMaterialForm] = useState(EMPTY_MATERIAL);
  const [editingMaterialId, setEditingMaterialId] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const visiblePrograms = programs.filter((item) => !semesterFilter || item.semester_id === semesterFilter);
  const selectedProgram = visiblePrograms.find((item) => item.id === selectedProgramId) || null;

  const changeSemesterFilter = (semesterId: string) => {
    setSemesterFilter(semesterId);
    setSelectedProgramId(programs.find((program) => !semesterId || program.semester_id === semesterId)?.id || "");
  };

  const loadBase = useCallback(async () => {
    setIsLoading(true);
    const [programResult, unitResult, studentResult, semesterResult] = await Promise.all([
      hblDb.from("hbl_programs").select("*, units(name), academic_years(name), semesters(name,academic_years(name))").order("created_at", { ascending: false }),
      hblDb.from("units").select("id,name").eq("is_active", true).order("name"),
      hblDb.from("students").select("id,full_name,nis,unit_id,classes(name)").eq("status", "active").order("full_name"),
      hblDb.from("semesters").select("id,name,academic_year_id,is_active,start_date,academic_years(name)").order("start_date", { ascending: false }),
    ]);
    const error = programResult.error || unitResult.error || studentResult.error || semesterResult.error;
    if (error) toast.error("LMS HBL belum dapat dimuat", { description: error.message });
    setPrograms(programResult.data || []);
    setUnits(unitResult.data || []);
    setStudents(studentResult.data || []);
    setSemesters(semesterResult.data || []);
    setSemesterFilter((current) => current || activeSemesterId || "");
    setSelectedProgramId((current) => current || programResult.data?.find((program: any) => !activeSemesterId || program.semester_id === activeSemesterId)?.id || "");
    setProgramForm((current) => ({ ...current, unit_id: current.unit_id || activeUnitId || unitResult.data?.[0]?.id || "", semester_id: current.semester_id || activeSemesterId || semesterResult.data?.find((semester: any) => semester.is_active)?.id || "" }));
    setIsLoading(false);
  }, [activeSemesterId, activeUnitId]);

  const loadProgram = useCallback(async (programId: string) => {
    if (!programId) {
      setSubjects([]); setMaterials([]); setEnrollments([]); setReports([]);
      return;
    }
    const subjectResult = await hblDb.from("hbl_subjects").select("*").eq("program_id", programId).order("sort_order").order("name");
    if (subjectResult.error) return toast.error(subjectResult.error.message);
    const subjectRows = subjectResult.data || [];
    const subjectIds = subjectRows.map((item: any) => item.id);
    const [materialResult, enrollmentResult] = await Promise.all([
      subjectIds.length
        ? hblDb.from("hbl_materials").select("*").in("subject_id", subjectIds).order("sort_order").order("created_at")
        : Promise.resolve({ data: [], error: null }),
      hblDb.from("hbl_program_students").select("id,student_id,students(full_name,nis,classes(name))").eq("program_id", programId).order("enrolled_at"),
    ]);
    const materialRows = materialResult.data || [];
    const materialIds = materialRows.map((item: any) => item.id);
    const reportResult = materialIds.length
      ? await hblDb.from("hbl_material_reports").select("*, students(full_name), parents(full_name), hbl_materials(title, hbl_subjects(name))").in("material_id", materialIds).order("submitted_at", { ascending: false })
      : { data: [], error: null };
    const error = materialResult.error || enrollmentResult.error || reportResult.error;
    if (error) toast.error("Detail program belum dapat dimuat", { description: error.message });
    setSubjects(subjectRows);
    setMaterials(materialRows);
    setEnrollments(enrollmentResult.data || []);
    setReports(reportResult.data || []);
    setReviewNotes((current) => ({ ...Object.fromEntries((reportResult.data || []).map((report: any) => [report.id, report.review_note || ""])), ...current }));
    setSelectedSubjectId((current) => subjectRows.some((item: any) => item.id === current) ? current : subjectRows[0]?.id || "");
  }, []);

  // Data awal dan detail program berasal dari sistem eksternal (Supabase).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadBase(); }, [loadBase]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadProgram(selectedProgramId); }, [loadProgram, selectedProgramId]);

  const createProgram = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedSemester = semesters.find((semester) => semester.id === programForm.semester_id);
    if (!programForm.unit_id || !selectedSemester || programForm.name.trim().length < 3) return toast.error("Nama, unit, dan semester program wajib diisi.");
    setIsSaving(true);
    const { data, error } = await hblDb.from("hbl_programs").insert({
      name: programForm.name.trim(), description: programForm.description.trim() || null,
      unit_id: programForm.unit_id, academic_year_id: selectedSemester.academic_year_id || activeYearId || null, semester_id: selectedSemester.id,
    }).select("id").single();
    setIsSaving(false);
    if (error) return toast.error("Program gagal dibuat", { description: error.message });
    toast.success("Program HBL dibuat.");
    setProgramForm((current) => ({ ...current, name: "", description: "" }));
    setSemesterFilter(selectedSemester.id);
    await loadBase();
    setSelectedProgramId(data.id);
  };

  const addSubject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProgramId || subjectName.trim().length < 2) return;
    setIsSaving(true);
    const { error } = await hblDb.from("hbl_subjects").insert({ program_id: selectedProgramId, name: subjectName.trim(), sort_order: subjects.length });
    setIsSaving(false);
    if (error) return toast.error(error.message);
    setSubjectName("");
    toast.success("Mata pelajaran ditambahkan.");
    await loadProgram(selectedProgramId);
  };

  const addMaterial = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSubjectId) return toast.error("Pilih mata pelajaran terlebih dahulu.");
    if (!isValidHblResource(materialForm.resource_type, materialForm.resource_url)) return toast.error("Tautan materi belum valid untuk jenis sumber yang dipilih.");
    setIsSaving(true);
    const payload = {
      ...materialForm, title: materialForm.title.trim(), description: materialForm.description.trim() || null,
      due_date: materialForm.due_date || null, subject_id: selectedSubjectId,
      sort_order: materials.filter((item) => item.subject_id === selectedSubjectId).length,
    };
    const { error } = editingMaterialId
      ? await hblDb.from("hbl_materials").update(payload).eq("id", editingMaterialId)
      : await hblDb.from("hbl_materials").insert(payload);
    setIsSaving(false);
    if (error) return toast.error("Materi gagal disimpan", { description: error.message });
    setMaterialForm(EMPTY_MATERIAL);
    setEditingMaterialId("");
    toast.success(editingMaterialId ? "Materi diperbarui." : "Materi ditambahkan sebagai draf.");
    await loadProgram(selectedProgramId);
  };

  const setProgramStatus = async (next: "draft" | "published" | "archived") => {
    if (!selectedProgram) return;
    const { error } = await hblDb.from("hbl_programs").update({ status: next }).eq("id", selectedProgram.id);
    if (error) return toast.error(error.message);
    toast.success(next === "published" ? "Program diterbitkan ke portal orang tua." : next === "archived" ? "Program diarsipkan." : "Program dikembalikan ke draf.");
    await loadBase();
  };

  const editMaterial = (material: any) => {
    setSelectedSubjectId(material.subject_id);
    setEditingMaterialId(material.id);
    setMaterialForm({
      title: material.title || "", description: material.description || "", resource_type: material.resource_type,
      resource_url: material.resource_url || "", report_type: material.report_type, due_date: material.due_date || "",
    });
  };

  const cancelMaterialEdit = () => {
    setEditingMaterialId("");
    setMaterialForm(EMPTY_MATERIAL);
  };

  const toggleMaterial = async (material: any) => {
    const { error } = await hblDb.from("hbl_materials").update({ is_published: !material.is_published }).eq("id", material.id);
    if (error) return toast.error(error.message);
    await loadProgram(selectedProgramId);
  };

  const deleteMaterial = async (material: any) => {
    if (!window.confirm(`Hapus materi “${material.title}”? Laporan terkait juga akan terhapus.`)) return;
    const { error } = await hblDb.from("hbl_materials").delete().eq("id", material.id);
    if (error) return toast.error(error.message);
    if (editingMaterialId === material.id) cancelMaterialEdit();
    await loadProgram(selectedProgramId);
  };

  const saveEnrollments = async () => {
    if (!selectedProgramId || selectedStudentIds.size === 0) return;
    const existing = new Set(enrollments.map((item) => item.student_id));
    const rows = [...selectedStudentIds].filter((id) => !existing.has(id)).map((student_id) => ({ program_id: selectedProgramId, student_id }));
    if (!rows.length) return toast.info("Semua siswa terpilih sudah terdaftar.");
    const { error } = await hblDb.from("hbl_program_students").insert(rows);
    if (error) return toast.error(error.message);
    setSelectedStudentIds(new Set());
    toast.success(`${rows.length} siswa ditambahkan ke program.`);
    await loadProgram(selectedProgramId);
  };

  const removeEnrollment = async (id: string) => {
    const { error } = await hblDb.from("hbl_program_students").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await loadProgram(selectedProgramId);
  };

  const reviewReport = async (report: any, status: "reviewed" | "needs_revision") => {
    const reviewNote = (reviewNotes[report.id] || "").trim();
    if (status === "needs_revision" && !reviewNote) return toast.error("Tuliskan catatan revisi untuk orang tua.");
    const { data: authData } = await supabaseClient.auth.getUser();
    const { error } = await hblDb.from("hbl_material_reports").update({
      status, review_note: reviewNote || null, reviewed_at: status === "reviewed" ? new Date().toISOString() : null,
      reviewed_by: authData.user?.id || null,
    }).eq("id", report.id);
    if (error) return toast.error(error.message);
    toast.success(status === "reviewed" ? "Laporan disetujui." : "Permintaan revisi dikirim ke orang tua.");
    await loadProgram(selectedProgramId);
  };

  const candidateStudents = students.filter((student) => !selectedProgram?.unit_id || student.unit_id === selectedProgram.unit_id);
  const materialGroups = useMemo(() => Object.fromEntries(subjects.map((subject) => [subject.id, materials.filter((item) => item.subject_id === subject.id)])), [materials, subjects]);

  if (isLoading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return <div className="space-y-6">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Program semester", visiblePrograms.length, `${visiblePrograms.filter((program) => program.status === "published").length} diterbitkan`],
      ["Mata pelajaran", subjects.length, selectedProgram ? selectedProgram.name : "Pilih program"],
      ["Peserta aktif", enrollments.length, "Siswa tertaut ke program"],
      ["Laporan masuk", reports.length, `${reports.filter((report) => report.status === "submitted").length} menunggu review`],
    ].map(([label, value, detail]) => <div key={String(label)} className="rounded-xl border bg-card p-4"><p className="text-2xl font-bold">{value}</p><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>)}</section>

    <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-4">
        <form onSubmit={createProgram} className="space-y-3 rounded-xl border bg-card p-4">
          <h3 className="font-bold">Program baru</h3>
          <input value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} placeholder="Contoh: HBL Preschool" className="h-10 w-full rounded-md border px-3 text-sm" required />
          <select value={programForm.unit_id} onChange={(e) => setProgramForm({ ...programForm, unit_id: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm" required><option value="">Pilih unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select>
          <select value={programForm.semester_id} onChange={(e) => setProgramForm({ ...programForm, semester_id: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm" required><option value="">Pilih tahun ajaran / semester</option>{semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.academic_years?.name || "Tahun ajaran"} · Semester {semester.name}{semester.is_active ? " (Aktif)" : ""}</option>)}</select>
          <textarea value={programForm.description} onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })} placeholder="Tujuan dan penjelasan program" rows={3} className="w-full rounded-md border p-3 text-sm" />
          <button disabled={isSaving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" /> Buat Program</button>
        </form>
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="space-y-3 border-b px-4 py-3"><h3 className="font-bold">Daftar program</h3><select value={semesterFilter} onChange={(event) => changeSemesterFilter(event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-xs"><option value="">Semua semester</option>{semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.academic_years?.name || "Tahun ajaran"} · {semester.name}{semester.is_active ? " (Aktif)" : ""}</option>)}</select></div>
          <div className="divide-y">{visiblePrograms.map((program) => <button key={program.id} onClick={() => setSelectedProgramId(program.id)} className={`flex w-full items-center justify-between gap-3 p-4 text-left ${selectedProgramId === program.id ? "bg-primary/10" : "hover:bg-muted/40"}`}><span><span className="block text-sm font-bold">{program.name}</span><span className="mt-1 block text-xs text-muted-foreground">{program.units?.name} · {program.academic_years?.name || "Tahun ajaran"} · Semester {program.semesters?.name || "-"} · {program.status === "published" ? "Terbit" : program.status === "archived" ? "Arsip" : "Draf"}</span></span><ChevronRight className="h-4 w-4 shrink-0" /></button>)}{visiblePrograms.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Belum ada program pada semester ini.</p>}</div>
        </div>
      </div>

      {!selectedProgram ? <div className="flex min-h-80 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Buat atau pilih program untuk mulai menyusun LMS.</div> : <div className="space-y-5">
        <section className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{selectedProgram.name}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${selectedProgram.status === "published" ? "bg-emerald-50 text-emerald-700" : selectedProgram.status === "archived" ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-700"}`}>{selectedProgram.status}</span></div><p className="mt-1 text-xs font-semibold text-primary">{selectedProgram.academic_years?.name || "Tahun ajaran"} · Semester {selectedProgram.semesters?.name || "-"}</p><p className="mt-2 text-sm text-muted-foreground">{selectedProgram.description || "Belum ada deskripsi."}</p></div><div className="flex shrink-0 flex-wrap gap-2">{selectedProgram.status !== "published" && <button onClick={() => void setProgramStatus("published")} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Terbitkan</button>}{selectedProgram.status !== "draft" && <button onClick={() => void setProgramStatus("draft")} className="rounded-md border px-3 py-2 text-xs font-bold">Jadikan Draf</button>}{selectedProgram.status !== "archived" && <button onClick={() => void setProgramStatus("archived")} className="rounded-md border px-3 py-2 text-xs font-bold text-muted-foreground">Arsipkan</button>}</div></section>

        <section className="rounded-xl border bg-card p-5"><div className="mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /><div><h3 className="font-bold">Mata pelajaran & materi</h3><p className="text-xs text-muted-foreground">Satu program dapat berisi banyak mata pelajaran dan materi.</p></div></div><form onSubmit={addSubject} className="flex gap-2"><input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Nama mata pelajaran" className="h-10 flex-1 rounded-md border px-3 text-sm" /><button disabled={isSaving} className="rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground">Tambah</button></form>
          <div className="mt-5 space-y-4">{subjects.map((subject) => <article key={subject.id} className="rounded-lg border"><button onClick={() => setSelectedSubjectId(subject.id)} className={`flex w-full items-center justify-between p-3 text-left ${selectedSubjectId === subject.id ? "bg-primary/5" : ""}`}><span className="font-bold">{subject.name}</span><span className="text-xs text-muted-foreground">{materialGroups[subject.id]?.length || 0} materi</span></button><div className="grid gap-4 border-t p-3 lg:grid-cols-2">{(materialGroups[subject.id] || []).map((material: any) => <div key={material.id} className={`space-y-3 rounded-lg border p-3 ${editingMaterialId === material.id ? "border-primary bg-primary/5" : "bg-muted/10"}`}><HblMediaPreview type={material.resource_type} url={material.resource_url} title={material.title} /><div><div className="flex items-start justify-between gap-3"><h4 className="font-bold">{material.title}</h4><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${material.is_published ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{material.is_published ? "Terbit" : "Draf"}</span></div><p className="mt-1 text-xs text-muted-foreground">{material.report_type === "checklist" ? "Laporan checklist" : "Laporan tautan Google Drive"}{material.due_date ? ` · tenggat ${material.due_date}` : ""}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => editMaterial(material)} className="rounded-md border px-2 py-1 text-xs font-bold">Edit</button><button onClick={() => void toggleMaterial(material)} className="rounded-md border px-2 py-1 text-xs font-bold">{material.is_published ? "Tarik" : "Terbitkan"}</button><button onClick={() => void deleteMaterial(material)} className="rounded-md border p-1.5 text-red-600" title="Hapus materi"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}{(materialGroups[subject.id] || []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada materi.</p>}</div></article>)}{subjects.length === 0 && <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Tambahkan mata pelajaran pertama.</p>}</div>
        </section>

        <section className="rounded-xl border bg-card p-5"><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FilePlus2 className="h-5 w-5 text-primary" /><div><h3 className="font-bold">{editingMaterialId ? "Edit materi" : "Tambah materi"}</h3><p className="text-xs text-muted-foreground">{editingMaterialId ? "Perbarui sumber, instruksi, jenis laporan, atau tenggat materi." : "Materi baru disimpan sebagai draf agar dapat ditinjau dahulu."}</p></div></div>{editingMaterialId && <button onClick={cancelMaterialEdit} className="rounded-md border px-3 py-1.5 text-xs font-bold">Batal edit</button>}</div><form onSubmit={addMaterial} className="grid gap-3 md:grid-cols-2"><select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="h-10 rounded-md border px-3 text-sm" required><option value="">Pilih mata pelajaran</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><input value={materialForm.title} onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })} placeholder="Judul materi" className="h-10 rounded-md border px-3 text-sm" required /><select value={materialForm.resource_type} onChange={(e) => setMaterialForm({ ...materialForm, resource_type: e.target.value })} className="h-10 rounded-md border px-3 text-sm"><option value="youtube">YouTube</option><option value="google_drive">Google Drive</option></select><input type="url" value={materialForm.resource_url} onChange={(e) => setMaterialForm({ ...materialForm, resource_url: e.target.value })} placeholder="https://..." className="h-10 rounded-md border px-3 text-sm" required /><select value={materialForm.report_type} onChange={(e) => setMaterialForm({ ...materialForm, report_type: e.target.value })} className="h-10 rounded-md border px-3 text-sm"><option value="checklist">Checklist selesai</option><option value="google_drive_link">Tautan laporan Google Drive</option></select><input type="date" value={materialForm.due_date} onChange={(e) => setMaterialForm({ ...materialForm, due_date: e.target.value })} className="h-10 rounded-md border px-3 text-sm" /><textarea value={materialForm.description} onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} placeholder="Instruksi untuk orang tua" rows={3} className="rounded-md border p-3 text-sm md:col-span-2" /><button disabled={isSaving || !selectedSubjectId} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground md:col-span-2"><Plus className="h-4 w-4" /> {editingMaterialId ? "Simpan Perubahan" : "Simpan Materi"}</button></form></section>

        <section className="rounded-xl border bg-card p-5"><div className="mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><div><h3 className="font-bold">Peserta program</h3><p className="text-xs text-muted-foreground">Pilih beberapa siswa lalu tambahkan sekaligus.</p></div></div><div className="grid gap-4 lg:grid-cols-2"><div className="max-h-64 overflow-y-auto rounded-lg border divide-y">{candidateStudents.map((student) => <label key={student.id} className="flex cursor-pointer items-center gap-3 p-3 text-sm hover:bg-muted/30"><input type="checkbox" checked={selectedStudentIds.has(student.id)} onChange={() => setSelectedStudentIds((current) => { const next = new Set(current); next.has(student.id) ? next.delete(student.id) : next.add(student.id); return next; })} /><span><span className="block font-semibold">{student.full_name}</span><span className="text-xs text-muted-foreground">{student.nis || "Tanpa NIS"} · {student.classes?.name || "Belum ada kelas"}</span></span></label>)}{candidateStudents.length === 0 && <p className="p-5 text-center text-sm text-muted-foreground">Belum ada siswa aktif pada unit program.</p>}</div><div><button onClick={() => void saveEnrollments()} disabled={selectedStudentIds.size === 0} className="mb-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"><Users className="h-4 w-4" /> Tambahkan {selectedStudentIds.size || ""} Siswa</button><div className="max-h-52 space-y-2 overflow-y-auto">{enrollments.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-2.5"><span className="text-sm"><strong>{item.students?.full_name}</strong><span className="block text-xs text-muted-foreground">{item.students?.classes?.name || "Belum ada kelas"}</span></span><button onClick={() => void removeEnrollment(item.id)} className="p-1.5 text-red-600" title="Keluarkan peserta"><Trash2 className="h-4 w-4" /></button></div>)}{enrollments.length === 0 && <p className="text-center text-sm text-muted-foreground">Belum ada peserta.</p>}</div></div></div></section>

        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b p-5"><div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /><div><h3 className="font-bold">Laporan orang tua</h3><p className="text-xs text-muted-foreground">Setujui laporan atau kirim catatan revisi yang langsung terlihat di portal keluarga.</p></div></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{reports.length} laporan</span></div>
          <div className="divide-y">{reports.map((report) => <article key={report.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_1.4fr]">
            <div><p className="font-bold">{report.students?.full_name}</p><p className="mt-1 text-xs text-muted-foreground">{report.hbl_materials?.hbl_subjects?.name} · {report.hbl_materials?.title}</p><p className="mt-1 text-[11px] text-muted-foreground">Dikirim {new Date(report.submitted_at).toLocaleString("id-ID")}</p></div>
            <div className="text-sm">{report.submission_url ? <a href={report.submission_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">Buka bukti Drive <ExternalLink className="h-3.5 w-3.5" /></a> : report.checklist_completed ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Checklist selesai</span> : <span className="text-muted-foreground">Tanpa bukti</span>}{report.notes && <p className="mt-2 rounded-md bg-muted/40 p-2 text-xs">Catatan orang tua: {report.notes}</p>}<p className={`mt-2 text-xs font-bold ${report.status === "reviewed" ? "text-emerald-700" : report.status === "needs_revision" ? "text-amber-700" : "text-blue-700"}`}>{report.status === "reviewed" ? "Disetujui" : report.status === "needs_revision" ? "Perlu revisi" : "Menunggu review"}</p></div>
            <div className="space-y-2"><textarea value={reviewNotes[report.id] || ""} onChange={(event) => setReviewNotes({ ...reviewNotes, [report.id]: event.target.value })} placeholder="Catatan review atau instruksi revisi" rows={2} className="w-full rounded-md border p-2 text-xs" /><div className="flex flex-wrap gap-2"><button onClick={() => void reviewReport(report, "reviewed")} className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white">Setujui</button><button onClick={() => void reviewReport(report, "needs_revision")} className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-800">Minta revisi</button></div></div>
          </article>)}{reports.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">Belum ada laporan masuk.</p>}</div>
        </section>
      </div>}
    </section>
  </div>;
};
