import React, { useState } from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate, useLocation } from "react-router-dom";
import { Save, ArrowLeft, User, GraduationCap, Briefcase, Info } from "lucide-react";
import { attendanceModeOptions, canReceiveAcademicAssignment, employeePositions, employmentTypeOptions, getAttendanceMode, getEmployeePosition } from "../employee-role-config";

function FormSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-muted/30">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background transition-shadow";
const selectCls = "w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background transition-shadow";

export const EmployeeCreate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/hrd") ? "/hrd/employees" : "/employees";
  const [position, setPosition] = useState("guru");
  const [employmentType, setEmploymentType] = useState("permanent");
  const [attendanceMode, setAttendanceMode] = useState("unit_hours");
  const supportsTeachingSchedule = canReceiveAcademicAssignment(position);

  const { onFinish, mutationResult } = useForm({
    resource: "employees",
    action: "create",
    redirect: false,
    onMutationSuccess: (data) => {
      navigate(`${basePath}/show/${data?.data?.id ?? ""}`);
    },
  });

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    data.teacher_roles = [];
    if (!data.unit_id) data.unit_id = null;
    if (!data.birth_date) delete data.birth_date;
    if (!data.join_date) delete data.join_date;
    if (!data.email) delete data.email;
    data.attendance_lead_minutes = Number(data.attendance_lead_minutes || 30);
    data.attendance_close_minutes = Number(data.attendance_close_minutes || 120);
    onFinish(data);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(basePath)} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tambah Pegawai Baru</h1>
          <p className="text-muted-foreground text-sm">Lengkapi data kepegawaian dengan informasi yang akurat.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Identitas Dasar ── */}
        <FormSection title="Identitas Dasar" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="NIK / NIP" required>
              <input name="nik" type="text" required className={inputCls} placeholder="Nomor Induk Pegawai" />
            </Field>
            <Field label="Nama Lengkap" required>
              <input name="full_name" type="text" required className={inputCls} placeholder="Sesuai KTP" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Jenis Kelamin">
              <select name="gender" className={selectCls}>
                <option value="">— Pilih —</option>
                <option value="laki_laki">Laki-laki</option>
                <option value="perempuan">Perempuan</option>
              </select>
            </Field>
            <Field label="Tanggal Lahir">
              <input name="birth_date" type="date" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="No. HP / WhatsApp">
              <input name="phone" type="tel" className={inputCls} placeholder="0812..." />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className={inputCls} placeholder="nama@email.com" />
            </Field>
          </div>
          <Field label="Alamat Domisili">
            <textarea name="address" rows={2} className={inputCls} placeholder="Alamat lengkap sekarang" />
          </Field>
        </FormSection>

        {/* ── Kepegawaian ── */}
        <FormSection title="Data Kepegawaian" icon={Briefcase}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Jabatan Utama" required>
              <select
                name="position"
                required
                value={position}
                onChange={(e) => {
                  const value = e.target.value;
                  setPosition(value);
                  if (!canReceiveAcademicAssignment(value)) setAttendanceMode("unit_hours");
                  else if (employmentType === "part_time") setAttendanceMode("teaching_schedule");
                }}
                className={selectCls}
              >
                <option value="">-- Pilih Jabatan Utama --</option>
                {employeePositions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Status Keaktifan" required>
              <select name="status" required defaultValue="active" className={selectCls}>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif / Cuti</option>
                <option value="resigned">Keluar / Resign</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Hubungan Kerja" required>
              <select
                name="employment_type"
                required
                value={employmentType}
                onChange={(event) => {
                  const value = event.target.value;
                  setEmploymentType(value);
                  if (value === "part_time" && supportsTeachingSchedule) setAttendanceMode("teaching_schedule");
                  else if (attendanceMode === "teaching_schedule") setAttendanceMode("unit_hours");
                }}
                className={selectCls}
              >
                {employmentTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Unit Induk">
              <select name="unit_id" className={selectCls}>
                <option value="">Pusat / Lintas Unit</option>
                {unitOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Pola Absensi" required>
              <select name="attendance_mode" required value={attendanceMode} onChange={(event) => setAttendanceMode(event.target.value)} className={selectCls}>
                {attendanceModeOptions.filter((item) => item.value !== "teaching_schedule" || supportsTeachingSchedule).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">{getAttendanceMode(attendanceMode).description}</p>
            </Field>
            <Field label="Tanggal Bergabung">
              <input name="join_date" type="date" className={inputCls} />
            </Field>
          </div>
          {attendanceMode === "teaching_schedule" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <Field label="Absen Dibuka Sebelum Pelajaran">
                <input name="attendance_lead_minutes" type="number" min="0" max="240" defaultValue="30" className={inputCls} />
                <p className="mt-1 text-xs text-muted-foreground">Menit sebelum pelajaran pertama.</p>
              </Field>
              <Field label="Batas Absen Setelah Mulai">
                <input name="attendance_close_minutes" type="number" min="15" max="480" defaultValue="120" className={inputCls} />
                <p className="mt-1 text-xs text-muted-foreground">Menit setelah pelajaran pertama dimulai.</p>
              </Field>
            </div>
          )}
          <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Jabatan, hubungan kerja, dan pola absensi memiliki fungsi berbeda.</p>
              <p className="mt-1 text-xs">{getEmployeePosition(position).description} {supportsTeachingSchedule ? "Pengajar part-time wajib memiliki jadwal mengajar aktif agar dapat absen pada hari tersebut." : "Pegawai operasional part-time tetap mengikuti jam unit atau shift khusus."}</p>
            </div>
          </div>
        </FormSection>

        {/* ── Pendidikan ── */}
        <FormSection title="Pendidikan & Sertifikasi" icon={GraduationCap}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Pendidikan Terakhir">
              <select name="education" className={selectCls}>
                <option value="">— Pilih —</option>
                <option value="SMA/SMK/Sederajat">SMA / SMK / Sederajat</option>
                <option value="D3">Diploma 3 (D3)</option>
                <option value="S1">Sarjana (S1)</option>
                <option value="S2">Magister (S2)</option>
                <option value="S3">Doktor (S3)</option>
              </select>
            </Field>
            <Field label="Sertifikasi / Kompetensi">
              <input name="certification" type="text" className={inputCls} placeholder="Contoh: Sertifikasi Guru, K3, satpam, atau kompetensi teknis" />
            </Field>
          </div>
        </FormSection>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors border"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={mutationResult.isLoading}
            className="px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70"
          >
            {mutationResult.isLoading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
            ) : (
              <><Save className="w-4 h-4" /> Simpan & Lihat Profil</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
