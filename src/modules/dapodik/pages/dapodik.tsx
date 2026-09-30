/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Database, Download, Loader2, Search, UserCog, Users, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/layout/PageHeader";
import { supabaseClient } from "../../../lib/supabase/client";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useSystemSettings } from "../../../app/providers/SettingsProvider";
import {
  completeness, EDUCATION_LEVELS, EMPLOYEE_REQUIRED_COUNT, employeeIssues, ENTRY_TYPES, INCOME_RANGES, OCCUPATIONS,
  onlyDigits, RELIGIONS, RESIDENCE_TYPES, studentIssues, TRANSPORTATION,
} from "../dapodik-config";
import { exportDapodikWorkbook } from "../dapodik-export";

const db = supabaseClient as any;
type Tab = "students" | "employees" | "export";
const inputClass = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal";
const PARENT_FIELDS = "id, full_name, nik, education, occupation, income_range, birth_year, phone";

function useDapodikData() {
  const { activeUnitId } = useCurrentUnit();
  const [students, setStudents] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let studentQuery = db.from("students").select(`*, classes(name), student_parent_links(relationship, parents(${PARENT_FIELDS}))`).eq("status", "active").order("full_name");
    let employeeQuery = db.from("employees").select("*, units(name)").eq("status", "active").order("full_name");
    let classQuery = db.from("classes").select("id, name, grade_level, level, homeroom:employees!homeroom_teacher_id(full_name), units(name), academic_years(name)").order("name");
    if (activeUnitId) {
      studentQuery = studentQuery.eq("unit_id", activeUnitId);
      employeeQuery = employeeQuery.eq("unit_id", activeUnitId);
      classQuery = classQuery.eq("unit_id", activeUnitId);
    }
    const [studentResult, employeeResult, classResult] = await Promise.all([studentQuery, employeeQuery, classQuery]);
    if (studentResult.error) toast.error("Data siswa belum dapat dimuat", { description: studentResult.error.message });
    setStudents((studentResult.data || []).map((student: any) => {
      const links = student.student_parent_links || [];
      return {
        ...student,
        father: links.find((link: any) => link.relationship === "father")?.parents || null,
        mother: links.find((link: any) => link.relationship === "mother")?.parents || null,
      };
    }));
    setEmployees(employeeResult.data || []);
    setClasses(classResult.data || []);
    setLoading(false);
  }, [activeUnitId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload when the active unit changes
    void load();
  }, [load]);

  return { students, employees, classes, loading, reload: load };
}

export const DapodikPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>("students");
  const data = useDapodikData();
  const studentScore = useMemo(() => {
    if (!data.students.length) return 0;
    return Math.round(data.students.reduce((sum, s) => sum + completeness(studentIssues(s)), 0) / data.students.length);
  }, [data.students]);
  const employeeScore = useMemo(() => {
    if (!data.employees.length) return 0;
    return Math.round(data.employees.reduce((sum, e) => sum + completeness(employeeIssues(e), EMPLOYEE_REQUIRED_COUNT), 0) / data.employees.length);
  }, [data.employees]);

  const tabs: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
    { key: "students", label: `Peserta Didik · ${studentScore}%`, icon: Users },
    { key: "employees", label: `PTK · ${employeeScore}%`, icon: UserCog },
    { key: "export", label: "Ekspor", icon: Download },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Data Dapodik" description="Lengkapi data pokok peserta didik, orang tua, dan PTK, lalu ekspor ke Excel dengan kolom mengikuti format Dapodik." />
      <div className="flex flex-wrap gap-2 border-b">
        {tabs.map((item) => (
          <button key={item.key} type="button" onClick={() => setTab(item.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold ${tab === item.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <item.icon className="h-4 w-4" /> {item.label}
          </button>
        ))}
      </div>
      {data.loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /> : (
        <>
          {tab === "students" && <StudentsTab students={data.students} classes={data.classes} onSaved={data.reload} />}
          {tab === "employees" && <EmployeesTab employees={data.employees} onSaved={data.reload} />}
          {tab === "export" && <ExportTab {...data} />}
        </>
      )}
    </div>
  );
};

const CompletenessBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="flex items-center gap-2">
    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className={`h-full ${value === 100 ? "bg-emerald-500" : value >= 70 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${value}%` }} /></div>
    <span className="text-xs font-semibold">{value}%</span>
  </div>
);

const StudentsTab: React.FC<{ students: any[]; classes: any[]; onSaved: () => void }> = ({ students, classes, onSaved }) => {
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const rows = students
    .map((student) => ({ student, issues: studentIssues(student) }))
    .filter(({ student, issues }) => (!classId || student.class_id === classId) && (!onlyIncomplete || issues.length > 0)
      && (!search.trim() || `${student.full_name} ${student.nisn || ""} ${student.nis || ""}`.toLowerCase().includes(search.trim().toLowerCase())));

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, NIS, atau NISN..." className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm" /></div>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm"><option value="">Semua rombel</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyIncomplete} onChange={(e) => setOnlyIncomplete(e.target.checked)} className="h-4 w-4 accent-primary" /> Hanya yang belum lengkap</label>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Peserta didik</th><th className="px-4 py-3">Rombel</th><th className="px-4 py-3">Kelengkapan</th><th className="px-4 py-3">Belum lengkap</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
            <tbody className="divide-y">
              {rows.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">{onlyIncomplete ? "Semua data peserta didik sudah lengkap." : "Tidak ada data."}</td></tr>}
              {rows.map(({ student, issues }) => (
                <tr key={student.id} className="align-top hover:bg-muted/30">
                  <td className="px-4 py-3"><p className="font-medium">{student.full_name}</p><p className="text-xs text-muted-foreground">NISN {student.nisn || "-"} · NIS {student.nis || "-"}</p></td>
                  <td className="px-4 py-3 text-muted-foreground">{student.classes?.name || "-"}</td>
                  <td className="px-4 py-3"><CompletenessBar value={completeness(issues)} /></td>
                  <td className="max-w-sm px-4 py-3 text-xs text-rose-700">{issues.join(", ") || <span className="text-emerald-700">Lengkap</span>}</td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => setEditing(student)} className="text-xs font-semibold text-primary hover:underline">Lengkapi</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editing && <StudentDapodikForm student={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onSaved(); }} />}
    </section>
  );
};

const STUDENT_KEYS = ["nisn", "nik", "family_card_number", "birth_certificate_number", "gender", "birth_place", "date_of_birth", "religion", "address", "rt", "rw", "hamlet", "village", "district", "postal_code", "residence_type", "transportation", "distance_to_school_km", "child_order", "siblings_count", "height_cm", "weight_kg", "head_circumference_cm", "entry_type", "entry_date", "previous_school", "kip_number"] as const;
const PARENT_KEYS = ["full_name", "nik", "birth_year", "education", "occupation", "income_range"] as const;
const NUMERIC_KEYS = new Set(["distance_to_school_km", "child_order", "siblings_count", "height_cm", "weight_kg", "head_circumference_cm", "birth_year"]);

const pick = (source: any, keys: readonly string[]) => Object.fromEntries(keys.map((key) => [key, source?.[key] ?? ""]));
const normalize = (values: Record<string, any>) => Object.fromEntries(Object.entries(values).map(([key, value]) => {
  if (value === "" || value === undefined) return [key, null];
  if (NUMERIC_KEYS.has(key)) return [key, Number(value)];
  return [key, typeof value === "string" ? value.trim() : value];
}));

const StudentDapodikForm: React.FC<{ student: any; onClose: () => void; onSaved: () => void }> = ({ student, onClose, onSaved }) => {
  const [values, setValues] = useState<Record<string, any>>(() => pick(student, STUDENT_KEYS));
  const [father, setFather] = useState<Record<string, any>>(() => pick(student.father, PARENT_KEYS));
  const [mother, setMother] = useState<Record<string, any>>(() => pick(student.mother, PARENT_KEYS));
  const [saving, setSaving] = useState(false);
  const set = (key: string, value: any) => setValues((current) => ({ ...current, [key]: value }));

  const field = (key: string, label: string, type = "text", extra: Record<string, any> = {}) => (
    <label className="text-xs font-medium">{label}<input type={type} value={values[key] ?? ""} onChange={(e) => set(key, e.target.value)} className={inputClass} {...extra} /></label>
  );
  const select = (key: string, label: string, options: string[] | Record<string, string>) => (
    <label className="text-xs font-medium">{label}
      <select value={values[key] ?? ""} onChange={(e) => set(key, e.target.value)} className={inputClass}>
        <option value="">Pilih</option>
        {Array.isArray(options) ? options.map((option) => <option key={option} value={option}>{option}</option>) : Object.entries(options).map(([value, label2]) => <option key={value} value={value}>{label2}</option>)}
      </select>
    </label>
  );

  const saveParent = async (relationship: "father" | "mother", existing: any, parentValues: Record<string, any>) => {
    const payload = normalize(parentValues);
    if (!payload.full_name) return;
    if (payload.nik && !onlyDigits(payload.nik, 16)) throw new Error(`NIK ${relationship === "father" ? "ayah" : "ibu"} harus 16 digit.`);
    if (existing?.id) {
      const { error } = await db.from("parents").update(payload).eq("id", existing.id);
      if (error) throw error;
      return;
    }
    const { data: created, error } = await db.from("parents").insert(payload).select("id").single();
    if (error) throw error;
    const { error: linkError } = await db.from("student_parent_links").insert({ student_id: student.id, parent_id: created.id, relationship, is_primary: relationship === "mother" });
    if (linkError) throw linkError;
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = normalize(values);
    if (payload.nisn && !onlyDigits(payload.nisn, 10)) return toast.error("NISN harus 10 digit.");
    if (payload.nik && !onlyDigits(payload.nik, 16)) return toast.error("NIK harus 16 digit angka.");
    if (payload.family_card_number && !onlyDigits(payload.family_card_number, 16)) return toast.error("No. KK harus 16 digit angka.");
    setSaving(true);
    try {
      const { error } = await db.from("students").update(payload).eq("id", student.id);
      if (error) throw error;
      await saveParent("father", student.father, father);
      await saveParent("mother", student.mother, mother);
      toast.success("Data Dapodik tersimpan.");
      onSaved();
    } catch (error: any) {
      toast.error("Data belum tersimpan", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const parentBlock = (title: string, state: Record<string, any>, setState: (next: Record<string, any>) => void) => (
    <fieldset className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <label className="text-xs font-medium sm:col-span-2">Nama<input value={state.full_name ?? ""} onChange={(e) => setState({ ...state, full_name: e.target.value })} className={inputClass} /></label>
      <label className="text-xs font-medium">Tahun lahir<input type="number" min={1920} max={2020} value={state.birth_year ?? ""} onChange={(e) => setState({ ...state, birth_year: e.target.value })} className={inputClass} /></label>
      <label className="text-xs font-medium">NIK<input inputMode="numeric" maxLength={16} value={state.nik ?? ""} onChange={(e) => setState({ ...state, nik: e.target.value.replace(/\D/g, "") })} className={inputClass} /></label>
      {([["education", "Pendidikan", EDUCATION_LEVELS], ["occupation", "Pekerjaan", OCCUPATIONS], ["income_range", "Penghasilan", INCOME_RANGES]] as const).map(([key, label, options]) => (
        <label key={key} className="text-xs font-medium">{label}<select value={state[key] ?? ""} onChange={(e) => setState({ ...state, [key]: e.target.value })} className={inputClass}><option value="">Pilih</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      ))}
    </fieldset>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="dapodik-form-title">
      <form onSubmit={(event) => void save(event)} className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div><h2 id="dapodik-form-title" className="text-lg font-semibold">{student.full_name}</h2><p className="text-xs text-muted-foreground">{student.classes?.name} · data pokok Dapodik</p></div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-md p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <fieldset className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3">
            <legend className="px-1 text-sm font-semibold">Identitas</legend>
            {field("nisn", "NISN", "text", { inputMode: "numeric", maxLength: 10 })}
            {field("nik", "NIK", "text", { inputMode: "numeric", maxLength: 16 })}
            {field("family_card_number", "No. Kartu Keluarga", "text", { inputMode: "numeric", maxLength: 16 })}
            {select("gender", "Jenis kelamin", { L: "Laki-laki", P: "Perempuan" })}
            {field("birth_place", "Tempat lahir")}
            {field("date_of_birth", "Tanggal lahir", "date")}
            {select("religion", "Agama", RELIGIONS)}
            {field("birth_certificate_number", "No. registrasi akta lahir")}
            {field("kip_number", "Nomor KIP")}
          </fieldset>
          <fieldset className="grid gap-3 rounded-lg border p-3 sm:grid-cols-4">
            <legend className="px-1 text-sm font-semibold">Alamat & domisili</legend>
            <div className="sm:col-span-4">{field("address", "Alamat jalan")}</div>
            {field("rt", "RT", "text", { maxLength: 3 })}
            {field("rw", "RW", "text", { maxLength: 3 })}
            {field("hamlet", "Dusun")}
            {field("postal_code", "Kode pos", "text", { inputMode: "numeric", maxLength: 5 })}
            <div className="sm:col-span-2">{field("village", "Desa/Kelurahan")}</div>
            <div className="sm:col-span-2">{field("district", "Kecamatan")}</div>
            <div className="sm:col-span-2">{select("residence_type", "Jenis tinggal", RESIDENCE_TYPES)}</div>
            {select("transportation", "Alat transportasi", TRANSPORTATION)}
            {field("distance_to_school_km", "Jarak ke sekolah (km)", "number", { step: "0.1", min: 0 })}
          </fieldset>
          <fieldset className="grid gap-3 rounded-lg border p-3 sm:grid-cols-5">
            <legend className="px-1 text-sm font-semibold">Data periodik & registrasi</legend>
            {field("child_order", "Anak ke-", "number", { min: 1, max: 30 })}
            {field("siblings_count", "Jml. saudara", "number", { min: 0 })}
            {field("height_cm", "Tinggi (cm)", "number", { step: "0.1", min: 0 })}
            {field("weight_kg", "Berat (kg)", "number", { step: "0.1", min: 0 })}
            {field("head_circumference_cm", "Lingkar kepala", "number", { step: "0.1", min: 0 })}
            <div className="sm:col-span-2">{select("entry_type", "Jenis pendaftaran", ENTRY_TYPES)}</div>
            {field("entry_date", "Tanggal masuk", "date")}
            <div className="sm:col-span-2">{field("previous_school", "Sekolah asal")}</div>
          </fieldset>
          {parentBlock("Ibu kandung", mother, setMother)}
          {parentBlock("Ayah", father, setFather)}
          {(!student.mother || !student.father) && <p className="text-xs text-muted-foreground">Mengisi nama ayah/ibu yang belum tertaut akan membuat data orang tua baru dan menautkannya ke siswa ini.</p>}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-medium">Batal</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan</button>
        </div>
      </form>
    </div>
  );
};

const EmployeesTab: React.FC<{ employees: any[]; onSaved: () => void }> = ({ employees, onSaved }) => {
  const [editing, setEditing] = useState<any | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const open = (employee: any) => { setEditing(employee); setValues(pick(employee, ["nuptk", "nip", "national_id", "gender", "birth_place", "birth_date", "religion", "education"])); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = normalize(values);
    if (payload.nuptk && !onlyDigits(payload.nuptk, 16)) return toast.error("NUPTK harus 16 digit.");
    if (payload.national_id && !onlyDigits(payload.national_id, 16)) return toast.error("NIK KTP harus 16 digit.");
    setSaving(true);
    const { error } = await db.from("employees").update(payload).eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error("Data PTK belum tersimpan", { description: error.message });
    toast.success("Data PTK tersimpan.");
    setEditing(null);
    onSaved();
  };

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">NIK KTP untuk Dapodik disimpan terpisah dari NIK/ID login portal pegawai, sehingga mengisinya tidak mengubah cara pegawai masuk.</p>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">PTK</th><th className="px-4 py-3">Kelengkapan</th><th className="px-4 py-3">Belum lengkap</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
          <tbody className="divide-y">
            {employees.map((employee) => {
              const issues = employeeIssues(employee);
              return (
                <tr key={employee.id} className="align-top">
                  <td className="px-4 py-3"><p className="font-medium">{employee.full_name}</p><p className="text-xs text-muted-foreground">{employee.position || "-"} · NUPTK {employee.nuptk || "-"}</p></td>
                  <td className="px-4 py-3"><CompletenessBar value={completeness(issues, EMPLOYEE_REQUIRED_COUNT)} /></td>
                  <td className="px-4 py-3 text-xs text-rose-700">{issues.join(", ") || <span className="text-emerald-700">Lengkap</span>}</td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => open(employee)} className="text-xs font-semibold text-primary hover:underline">Lengkapi</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={(event) => void save(event)} className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="text-lg font-semibold">{editing.full_name}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Tutup" className="rounded-md p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button></div>
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
              {([["nuptk", "NUPTK"], ["nip", "NIP"], ["national_id", "NIK KTP"], ["birth_place", "Tempat lahir"]] as const).map(([key, label]) => (
                <label key={key} className="text-xs font-medium">{label}<input value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} className={inputClass} /></label>
              ))}
              <label className="text-xs font-medium">Tanggal lahir<input type="date" value={values.birth_date ?? ""} onChange={(e) => setValues({ ...values, birth_date: e.target.value })} className={inputClass} /></label>
              <label className="text-xs font-medium">Jenis kelamin<select value={values.gender ?? ""} onChange={(e) => setValues({ ...values, gender: e.target.value })} className={inputClass}><option value="">Pilih</option><option value="laki_laki">Laki-laki</option><option value="perempuan">Perempuan</option></select></label>
              <label className="text-xs font-medium">Agama<select value={values.religion ?? ""} onChange={(e) => setValues({ ...values, religion: e.target.value })} className={inputClass}><option value="">Pilih</option>{RELIGIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              <label className="text-xs font-medium">Pendidikan terakhir<select value={values.education ?? ""} onChange={(e) => setValues({ ...values, education: e.target.value })} className={inputClass}><option value="">Pilih</option>{EDUCATION_LEVELS.map((option) => <option key={option} value={option}>{option}</option>)}{values.education && !EDUCATION_LEVELS.includes(values.education) && <option value={values.education}>{values.education}</option>}</select></label>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3"><button type="button" onClick={() => setEditing(null)} className="rounded-md border px-4 py-2 text-sm font-medium">Batal</button><button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Simpan</button></div>
          </form>
        </div>
      )}
    </section>
  );
};

const ExportTab: React.FC<{ students: any[]; employees: any[]; classes: any[] }> = ({ students, employees, classes }) => {
  const { appName } = useSystemSettings();
  const [busy, setBusy] = useState(false);
  const incompleteStudents = students.filter((s) => studentIssues(s).length > 0).length;
  const incompleteEmployees = employees.filter((e) => employeeIssues(e).length > 0).length;

  const run = async () => {
    setBusy(true);
    try {
      const result = await exportDapodikWorkbook({ schoolName: appName, students, employees, classes });
      toast.success(`File Excel dibuat: ${result.students} peserta didik, ${result.employees} PTK, ${result.classes} rombel.`, { description: result.issues ? `${result.issues} baris masih perlu dilengkapi (lihat sheet Validasi).` : undefined });
    } catch (error: any) {
      toast.error("Ekspor gagal", { description: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4 md:grid-cols-[1fr_20rem]">
      <div className="space-y-3 rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /><h2 className="font-semibold">Ekspor data Dapodik</h2></div>
        <p className="text-sm text-muted-foreground">Menghasilkan satu file Excel berisi sheet <strong>Peserta Didik</strong>, <strong>PTK</strong>, <strong>Rombel</strong>, dan <strong>Validasi</strong> untuk unit yang sedang aktif. Nomor identitas disimpan sebagai teks agar angka 0 di depan dan 16 digit NIK tidak berubah.</p>
        <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">Kolom mengikuti format daftar Dapodik yang umum dipakai. Periksa kesesuaian dengan versi aplikasi Dapodik sekolah sebelum menyalin atau mengimpor.</p>
        <button type="button" onClick={() => void run()} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Unduh Excel Dapodik
        </button>
      </div>
      <div className="space-y-2 rounded-xl border bg-card p-5 text-sm">
        <p className="font-semibold">Ringkasan</p>
        <p>{students.length} peserta didik aktif · <span className={incompleteStudents ? "text-rose-700" : "text-emerald-700"}>{incompleteStudents} belum lengkap</span></p>
        <p>{employees.length} PTK aktif · <span className={incompleteEmployees ? "text-rose-700" : "text-emerald-700"}>{incompleteEmployees} belum lengkap</span></p>
        <p>{classes.length} rombel</p>
      </div>
    </section>
  );
};
