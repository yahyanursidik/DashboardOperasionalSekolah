/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ClipboardCheck, ExternalLink, GraduationCap, Loader2, Send } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";
import type { ParentPortalContext } from "./portal-context";
import { HblMediaPreview } from "../hbl";

const hblDb = supabaseClient as any;

export const PortalHbl: React.FC = () => {
  const { parent, student } = useOutletContext<ParentPortalContext>();
  const [programs, setPrograms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  const load = useCallback(async () => {
    if (!student?.id) return;
    setIsLoading(true);
    const enrollmentResult = await hblDb
      .from("hbl_program_students")
      .select("program_id,hbl_programs(id,name,description,status,units(name))")
      .eq("student_id", student.id);
    if (enrollmentResult.error) {
      toast.error("Program HBL belum dapat dimuat", { description: enrollmentResult.error.message });
      setIsLoading(false);
      return;
    }
    const programRows = (enrollmentResult.data || []).map((item: any) => item.hbl_programs).filter(Boolean);
    const programIds = programRows.map((item: any) => item.id);
    const subjectResult = programIds.length
      ? await hblDb.from("hbl_subjects").select("*").in("program_id", programIds).order("sort_order").order("name")
      : { data: [], error: null };
    const subjectRows = subjectResult.data || [];
    const subjectIds = subjectRows.map((item: any) => item.id);
    const materialResult = subjectIds.length
      ? await hblDb.from("hbl_materials").select("*").in("subject_id", subjectIds).eq("is_published", true).order("sort_order").order("created_at")
      : { data: [], error: null };
    const materialRows = materialResult.data || [];
    const materialIds = materialRows.map((item: any) => item.id);
    const reportResult = materialIds.length
      ? await hblDb.from("hbl_material_reports").select("*").eq("student_id", student.id).in("material_id", materialIds)
      : { data: [], error: null };
    const error = subjectResult.error || materialResult.error || reportResult.error;
    if (error) toast.error("Materi HBL belum dapat dimuat", { description: error.message });
    setPrograms(programRows);
    setSubjects(subjectRows);
    setMaterials(materialRows);
    setReports(reportResult.data || []);
    setLinks(Object.fromEntries((reportResult.data || []).map((item: any) => [item.material_id, item.submission_url || ""])));
    setIsLoading(false);
  }, [student]);

  // Materi disinkronkan dari Supabase setiap kali siswa aktif berubah.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const reportByMaterial = useMemo(() => new Map(reports.map((item) => [item.material_id, item])), [reports]);
  const isCompleted = (material: any) => {
    const report = reportByMaterial.get(material.id);
    return material.report_type === "checklist" ? Boolean(report?.checklist_completed) : Boolean(report?.submission_url);
  };
  const completedCount = materials.filter(isCompleted).length;

  const saveChecklist = async (material: any) => {
    setSavingId(material.id);
    const { error } = await hblDb.from("hbl_material_reports").upsert({
      material_id: material.id, student_id: student.id, parent_id: parent.id,
      checklist_completed: true, submission_url: null, status: "submitted", submitted_at: new Date().toISOString(),
    }, { onConflict: "material_id,student_id" });
    setSavingId("");
    if (error) return toast.error("Checklist belum tersimpan", { description: error.message });
    toast.success("Materi ditandai selesai.");
    await load();
  };

  const saveDriveLink = async (material: any) => {
    const url = (links[material.id] || "").trim();
    if (!/^https:\/\/(drive|docs)\.google\.com\//i.test(url)) return toast.error("Gunakan tautan Google Drive atau Google Docs yang dapat dibuka.");
    setSavingId(material.id);
    const { error } = await hblDb.from("hbl_material_reports").upsert({
      material_id: material.id, student_id: student.id, parent_id: parent.id,
      checklist_completed: false, submission_url: url, status: "submitted", submitted_at: new Date().toISOString(),
    }, { onConflict: "material_id,student_id" });
    setSavingId("");
    if (error) return toast.error("Tautan laporan belum tersimpan", { description: error.message });
    toast.success("Tautan laporan dikirim.");
    await load();
  };

  if (isLoading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>;

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-700 to-teal-800 p-5 text-white shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Homebased Learning</p><h1 className="mt-1 text-2xl font-bold">Ruang Belajar {student.full_name}</h1><p className="mt-2 max-w-2xl text-sm text-emerald-50">Pelajari materi bersama keluarga, lalu kirim checklist atau tautan hasil kegiatan sesuai instruksi.</p></div><div className="rounded-lg bg-white/10 px-4 py-3 text-center backdrop-blur"><p className="text-2xl font-bold">{completedCount}/{materials.length}</p><p className="text-xs text-emerald-100">materi selesai</p></div></div>{materials.length > 0 && <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.round((completedCount / materials.length) * 100)}%` }} /></div>}</section>

    {programs.map((program) => {
      const programSubjects = subjects.filter((subject) => subject.program_id === program.id);
      return <section key={program.id} className="space-y-4"><div className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><GraduationCap className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-gray-900">{program.name}</h2><p className="mt-1 text-sm text-gray-500">{program.description || program.units?.name || "Program Homebased Learning"}</p></div></div></div>
        {programSubjects.map((subject) => {
          const subjectMaterials = materials.filter((material) => material.subject_id === subject.id);
          return <article key={subject.id} className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="flex items-center gap-2 border-b bg-gray-50 px-5 py-4"><BookOpen className="h-5 w-5 text-emerald-700" /><div><h3 className="font-bold text-gray-900">{subject.name}</h3><p className="text-xs text-gray-500">{subjectMaterials.length} materi</p></div></div><div className="grid gap-5 p-4 lg:grid-cols-2">{subjectMaterials.map((material) => {
            const report = reportByMaterial.get(material.id);
            const completed = isCompleted(material);
            return <div key={material.id} className={`space-y-4 rounded-xl border p-4 ${completed ? "border-emerald-200 bg-emerald-50/30" : "bg-white"}`}><HblMediaPreview type={material.resource_type} url={material.resource_url} title={material.title} /><div><div className="flex items-start justify-between gap-3"><h4 className="font-bold text-gray-900">{material.title}</h4>{completed && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Selesai</span>}</div>{material.description && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">{material.description}</p>}<p className="mt-2 text-xs text-gray-500">{material.due_date ? `Tenggat ${new Date(`${material.due_date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}` : "Tanpa tenggat"}</p></div>
              {material.report_type === "checklist" ? <button onClick={() => void saveChecklist(material)} disabled={savingId === material.id || completed} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">{savingId === material.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} {completed ? "Sudah Diselesaikan" : "Tandai Selesai"}</button> : <div className="space-y-2"><label className="text-xs font-bold text-gray-700">Tautan laporan Google Drive<input value={links[material.id] || ""} onChange={(e) => setLinks({ ...links, [material.id]: e.target.value })} placeholder="https://drive.google.com/..." className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal" /></label><div className="flex gap-2"><button onClick={() => void saveDriveLink(material)} disabled={savingId === material.id} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">{savingId === material.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {report?.submission_url ? "Perbarui Laporan" : "Kirim Laporan"}</button>{report?.submission_url && <a href={report.submission_url} target="_blank" rel="noreferrer" title="Buka laporan" className="flex h-10 w-10 items-center justify-center rounded-md border text-emerald-700"><ExternalLink className="h-4 w-4" /></a>}</div></div>}
              {report?.status === "reviewed" && <p className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Laporan sudah ditinjau sekolah.</p>}
            </div>;
          })}{subjectMaterials.length === 0 && <p className="col-span-full py-8 text-center text-sm text-gray-400">Materi belum diterbitkan.</p>}</div></article>;
        })}
      </section>;
    })}

    {programs.length === 0 && <div className="rounded-xl border border-dashed bg-white p-10 text-center"><GraduationCap className="mx-auto h-10 w-10 text-gray-300" /><h2 className="mt-3 font-bold text-gray-700">Belum ada program HBL</h2><p className="mt-1 text-sm text-gray-500">Program akan muncul setelah sekolah menerbitkan dan menautkannya ke siswa ini.</p></div>}
  </div>;
};
