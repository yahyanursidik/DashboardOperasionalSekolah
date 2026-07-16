/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Loader2, Pencil, Plus, Save, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { canUseTeachingScheduleAttendance } from "../../employees/employee-role-config";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const POSITIONS = [
  ["kepala_sekolah", "Kepala Sekolah"], ["wakasek_umum", "Wakil Kepala Sekolah"],
  ["wakasek_kurikulum", "Wakasek Kurikulum"], ["wakasek_kesiswaan", "Wakasek Kesiswaan"],
  ["kepala_unit", "Kepala Unit"], ["guru", "Guru / Pengajar"], ["guru_quran", "Guru Al Qur'an"],
  ["school_center", "School Center"], ["bendahara", "Bendahara / Keuangan"],
  ["penanggung_jawab", "Penanggung Jawab"], ["bk", "Bimbingan Konseling"],
  ["pustakawan", "Pustakawan"], ["laboran", "Laboran"], ["tu", "Tata Usaha"],
  ["sarpras", "Sarana Prasarana"], ["satpam", "Satpam"],
  ["cleaning_service", "Cleaning Service"], ["lainnya", "Lainnya"],
];

const EMPTY_SHIFT = {
  id: "", code: "", name: "", unit_id: "", position: "cleaning_service",
  schedule_type: "shift_kebersihan", days_of_week: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
  start_time: "06:00", end_time: "14:00", check_in_open: "05:00", check_in_close: "07:00",
  grace_minutes: "10", early_departure_tolerance_minutes: "0", notes: "", is_active: true,
};

function shortTime(value?: string) { return String(value || "-").slice(0, 5); }
function positionLabel(value?: string) { return POSITIONS.find(([id]) => id === value)?.[1] || String(value || "-").replace(/_/g, " "); }
function makeCode(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `shift-${Date.now()}`;
}

export const AttendanceShiftSettings: React.FC = () => {
  const [units, setUnits] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY_SHIFT);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const [unitResult, employeeResult, shiftResult, assignmentResult] = await Promise.all([
      supabaseClient.from("units").select("id,name").order("name"),
      supabaseClient.from("employees").select("id,full_name,nik,position,unit_id,employment_type,attendance_mode,units(name)").eq("status", "active").order("full_name"),
      supabaseClient.from("attendance_shifts").select("*,units(name)").order("position").order("start_time"),
      supabaseClient.from("attendance_shift_assignments").select("id,employee_id,shift_id,is_active,employees(full_name,nik,position,units(name)),attendance_shifts(name,start_time,end_time,position,unit_id,is_active)").eq("is_active", true).order("created_at", { ascending: false }),
    ]);
    const error = unitResult.error || employeeResult.error || shiftResult.error || assignmentResult.error;
    if (error) toast.error("Data shift belum dapat dimuat", { description: error.message });
    setUnits(unitResult.data || []);
    setEmployees(employeeResult.data || []);
    setShifts(shiftResult.data || []);
    setAssignments(assignmentResult.data || []);
    setIsLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const selectedShift = shifts.find((shift) => shift.id === selectedShiftId);
  const eligibleEmployees = useMemo(() => employees.filter((employee) => {
    if (!selectedShift) return false;
    return employee.position === selectedShift.position
      && !(employee.attendance_mode === "teaching_schedule" && canUseTeachingScheduleAttendance(employee.position))
      && (!selectedShift.unit_id || employee.unit_id === selectedShift.unit_id);
  }), [employees, selectedShift]);

  useEffect(() => {
    if (selectedEmployeeId && !eligibleEmployees.some((employee) => employee.id === selectedEmployeeId)) setSelectedEmployeeId("");
  }, [eligibleEmployees, selectedEmployeeId]);

  const editShift = (shift: any) => setForm({
    ...shift,
    unit_id: shift.unit_id || "",
    start_time: shortTime(shift.start_time), end_time: shortTime(shift.end_time),
    check_in_open: shortTime(shift.check_in_open), check_in_close: shortTime(shift.check_in_close),
    grace_minutes: String(shift.grace_minutes),
    early_departure_tolerance_minutes: String(shift.early_departure_tolerance_minutes),
  });

  const saveShift = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.days_of_week.length) return toast.error("Pilih minimal satu hari kerja.");
    setIsSaving(true);
    try {
      const payload = {
        code: form.code || makeCode(form.name), name: form.name.trim(), unit_id: form.unit_id || null,
        position: form.position, schedule_type: form.schedule_type, days_of_week: form.days_of_week,
        start_time: form.start_time, end_time: form.end_time,
        check_in_open: form.check_in_open, check_in_close: form.check_in_close,
        grace_minutes: Number(form.grace_minutes),
        early_departure_tolerance_minutes: Number(form.early_departure_tolerance_minutes),
        notes: form.notes.trim() || null, is_active: form.is_active,
      };
      const query = form.id
        ? supabaseClient.from("attendance_shifts").update(payload).eq("id", form.id)
        : supabaseClient.from("attendance_shifts").insert(payload);
      const { error } = await query;
      if (error) throw error;
      toast.success(form.id ? "Template shift diperbarui." : "Template shift ditambahkan.");
      setForm(EMPTY_SHIFT);
      await loadData();
    } catch (error: any) { toast.error("Template shift belum dapat disimpan", { description: error.message }); }
    finally { setIsSaving(false); }
  };

  const assignShift = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedShiftId || !selectedEmployeeId) return toast.error("Pilih shift dan pegawai.");
    setIsSaving(true);
    try {
      const { error } = await supabaseClient.rpc("assign_employee_attendance_shift", {
        p_employee_id: selectedEmployeeId, p_shift_id: selectedShiftId,
      });
      if (error) throw error;
      toast.success("Shift pegawai berhasil ditetapkan.");
      setSelectedEmployeeId("");
      await loadData();
    } catch (error: any) { toast.error("Shift belum dapat ditetapkan", { description: error.message }); }
    finally { setIsSaving(false); }
  };

  const removeAssignment = async (employeeId: string) => {
    setIsSaving(true);
    const { error } = await supabaseClient.rpc("assign_employee_attendance_shift", { p_employee_id: employeeId, p_shift_id: null });
    if (error) toast.error("Penugasan shift belum dapat dilepas", { description: error.message });
    else { toast.success("Penugasan shift dilepas."); await loadData(); }
    setIsSaving(false);
  };

  const toggleShift = async (shift: any) => {
    const { error } = await supabaseClient.from("attendance_shifts").update({ is_active: !shift.is_active }).eq("id", shift.id);
    if (error) return toast.error(error.message);
    toast.success(shift.is_active ? "Shift dinonaktifkan." : "Shift diaktifkan.");
    await loadData();
  };

  return (
    <section className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="flex items-center gap-2 font-bold"><Clock3 className="h-5 w-5 text-primary" /> Shift Khusus Pegawai</h2><p className="mt-1 text-xs text-muted-foreground">Gunakan untuk pegawai yang jam kerjanya berbeda dari kebijakan unit, seperti cleaning service pagi/sore atau satpam. Guru dengan pola “Sesuai Jadwal Mengajar” tidak dimasukkan ke shift.</p></div>
        <div className="flex gap-2 text-xs"><span className="rounded-md bg-primary/10 px-2 py-1 font-bold text-primary">{shifts.filter((item) => item.is_active).length} shift aktif</span><span className="rounded-md bg-muted px-2 py-1 font-bold">{assignments.length} pegawai ditugaskan</span></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={saveShift} className="space-y-4">
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold">{form.id ? "Ubah template shift" : "Template shift baru"}</h3><p className="text-xs text-muted-foreground">Shift yang ditetapkan akan menjadi acuan tertinggi untuk terlambat dan pulang awal.</p></div>{form.id ? <button type="button" onClick={() => setForm(EMPTY_SHIFT)} className="text-xs font-bold text-muted-foreground">Batal ubah</button> : null}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">Nama shift<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Cleaning Service Pagi" className="mt-1 w-full rounded-md border px-3 py-2 font-normal" /></label>
            <label className="text-xs font-semibold">Jabatan<select value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value, schedule_type: event.target.value === "cleaning_service" ? "shift_kebersihan" : event.target.value === "satpam" ? "shift_keamanan" : "standby" })} className="mt-1 w-full rounded-md border px-3 py-2 font-normal">{POSITIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-semibold">Unit<select value={form.unit_id} onChange={(event) => setForm({ ...form, unit_id: event.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 font-normal"><option value="">Lintas unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
            <label className="text-xs font-semibold">Jenis tugas<select value={form.schedule_type} onChange={(event) => setForm({ ...form, schedule_type: event.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 font-normal"><option value="shift_kebersihan">Shift kebersihan</option><option value="shift_keamanan">Shift keamanan</option><option value="piket">Piket</option><option value="standby">Standby / operasional</option></select></label>
            <label className="text-xs font-semibold">Mulai shift<input required type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 font-normal" /></label>
            <label className="text-xs font-semibold">Selesai shift<input required type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 font-normal" /></label>
            <label className="text-xs font-semibold">Waktu normal mulai absen<input required type="time" value={form.check_in_open} onChange={(event) => setForm({ ...form, check_in_open: event.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 font-normal" /><span className="mt-1 block text-[11px] font-normal text-muted-foreground">Kedatangan lebih awal tetap diterima.</span></label>
            <label className="text-xs font-semibold">Batas akhir absen masuk<input required type="time" value={form.check_in_close} onChange={(event) => setForm({ ...form, check_in_close: event.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 font-normal" /></label>
            <label className="text-xs font-semibold">Toleransi terlambat<input type="number" min="0" max="180" value={form.grace_minutes} onChange={(event) => setForm({ ...form, grace_minutes: event.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 font-normal" /></label>
            <label className="text-xs font-semibold">Toleransi pulang awal<input type="number" min="0" max="180" value={form.early_departure_tolerance_minutes} onChange={(event) => setForm({ ...form, early_departure_tolerance_minutes: event.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 font-normal" /></label>
          </div>
          <fieldset><legend className="text-xs font-semibold">Hari kerja</legend><div className="mt-2 flex flex-wrap gap-2">{DAYS.map((day) => <label key={day} className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${form.days_of_week.includes(day) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}><input type="checkbox" className="sr-only" checked={form.days_of_week.includes(day)} onChange={(event) => setForm({ ...form, days_of_week: event.target.checked ? [...form.days_of_week, day] : form.days_of_week.filter((item: string) => item !== day) })} />{day}</label>)}</div></fieldset>
          <label className="block text-xs font-semibold">Catatan<textarea rows={2} value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 font-normal" /></label>
          <button disabled={isSaving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : form.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{form.id ? "Simpan Shift" : "Tambah Shift"}</button>
        </form>

        <form onSubmit={assignShift} className="h-fit space-y-4 rounded-lg border bg-muted/20 p-4">
          <div><h3 className="flex items-center gap-2 text-sm font-bold"><UserRoundCheck className="h-4 w-4 text-primary" /> Tugaskan kepada pegawai</h3><p className="mt-1 text-xs text-muted-foreground">Daftar dibatasi menurut jabatan dan unit induk pegawai. Satu pegawai memiliki satu shift aktif.</p></div>
          <label className="block text-xs font-semibold">Template shift<select required value={selectedShiftId} onChange={(event) => { setSelectedShiftId(event.target.value); setSelectedEmployeeId(""); }} className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="">Pilih shift</option>{shifts.filter((shift) => shift.is_active).map((shift) => <option key={shift.id} value={shift.id}>{shift.name} - {shortTime(shift.start_time)}-{shortTime(shift.end_time)}</option>)}</select></label>
          <label className="block text-xs font-semibold">Pegawai<select required disabled={!selectedShiftId} value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-normal disabled:opacity-50"><option value="">Pilih pegawai</option>{eligibleEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} ({employee.nik || "tanpa NIK"})</option>)}</select></label>
          {selectedShiftId && eligibleEmployees.length === 0 ? <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">Tidak ada pegawai aktif dengan jabatan dan unit yang sesuai.</p> : null}
          <button disabled={isSaving || !selectedEmployeeId} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"><UserRoundCheck className="h-4 w-4" /> Tetapkan Shift</button>
        </form>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="overflow-hidden rounded-lg border"><div className="border-b bg-muted/30 px-4 py-3"><h3 className="flex items-center gap-2 text-sm font-bold"><CalendarDays className="h-4 w-4" /> Daftar Template</h3></div>{isLoading ? <div className="p-6 text-center text-sm text-muted-foreground">Memuat shift...</div> : <div className="divide-y">{shifts.map((shift) => <div key={shift.id} className="flex items-start justify-between gap-3 p-4"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold">{shift.name}</p><span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${shift.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{shift.is_active ? "Aktif" : "Nonaktif"}</span></div><p className="mt-1 text-xs text-muted-foreground">{positionLabel(shift.position)} | {shift.units?.name || "Lintas unit"}</p><p className="mt-1 text-xs font-semibold">{shortTime(shift.start_time)} - {shortTime(shift.end_time)} | batas akhir masuk {shortTime(shift.check_in_close)}</p><p className="mt-1 text-[11px] text-muted-foreground">Lebih awal tetap diterima | {shift.days_of_week.join(", ")}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => editShift(shift)} title="Ubah shift" className="rounded-md border p-2"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void toggleShift(shift)} className="rounded-md border px-2 py-1 text-[10px] font-bold">{shift.is_active ? "Nonaktifkan" : "Aktifkan"}</button></div></div>)}</div>}</div>
        <div className="overflow-hidden rounded-lg border"><div className="border-b bg-muted/30 px-4 py-3"><h3 className="flex items-center gap-2 text-sm font-bold"><UserRoundCheck className="h-4 w-4" /> Penugasan Aktif</h3></div>{isLoading ? <div className="p-6 text-center text-sm text-muted-foreground">Memuat penugasan...</div> : assignments.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">Belum ada pegawai yang ditugaskan ke shift.</div> : <div className="divide-y">{assignments.map((assignment) => <div key={assignment.id} className="flex items-start justify-between gap-3 p-4"><div><p className="text-sm font-bold">{assignment.employees?.full_name}</p><p className="mt-1 text-xs text-muted-foreground">{positionLabel(assignment.employees?.position)} | {assignment.employees?.units?.name || "Lintas unit"}</p><p className="mt-1 text-xs font-semibold text-primary">{assignment.attendance_shifts?.name} | {shortTime(assignment.attendance_shifts?.start_time)}-{shortTime(assignment.attendance_shifts?.end_time)}</p></div><button type="button" disabled={isSaving} onClick={() => void removeAssignment(assignment.employee_id)} className="shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold text-red-600 disabled:opacity-50">Lepas</button></div>)}</div>}</div>
      </div>
    </section>
  );
};
