import React, { useState, useEffect } from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { Save, ArrowLeft, User, Briefcase, GraduationCap, Award, Eye } from "lucide-react";

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

export const EmployeeEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [position, setPosition] = useState("");

  const { onFinish, mutationResult, queryResult } = useForm({
    resource: "employees",
    action: "edit",
    id,
    redirect: false,
    onMutationSuccess: () => {
      navigate(`/employees/show/${id}`);
    },
  });

  const employee = queryResult?.data?.data;
  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });

  useEffect(() => {
    if (employee?.position) setPosition(employee.position);
  }, [employee?.position]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as Record<string, any>;
    data.teacher_roles = formData.getAll("teacher_roles");
    if (!data.unit_id) data.unit_id = null;
    if (!data.birth_date) delete data.birth_date;
    if (!data.join_date) delete data.join_date;
    if (!data.email) delete data.email;
    onFinish(data);
  };

  if (queryResult?.isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const existingRoles: string[] = Array.isArray(employee?.teacher_roles) ? employee.teacher_roles : [];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/employees/show/${id}`)} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Edit Data Pegawai</h1>
          <p className="text-muted-foreground text-sm">{employee?.full_name ?? "Memuat..."}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/employees/show/${id}`)}
          className="flex items-center gap-2 text-sm border px-3 py-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Eye className="w-4 h-4" /> Lihat Profil
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Identitas Dasar ── */}
        <FormSection title="Identitas Dasar" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="NIK / NIP" required>
              <input name="nik" type="text" required defaultValue={employee?.nik} className={inputCls} placeholder="Nomor Induk Pegawai" />
            </Field>
            <Field label="Nama Lengkap" required>
              <input name="full_name" type="text" required defaultValue={employee?.full_name} className={inputCls} placeholder="Sesuai KTP" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Jenis Kelamin">
              <select name="gender" defaultValue={employee?.gender ?? ""} className={selectCls}>
                <option value="">— Pilih —</option>
                <option value="laki_laki">Laki-laki</option>
                <option value="perempuan">Perempuan</option>
              </select>
            </Field>
            <Field label="Tanggal Lahir">
              <input
                name="birth_date"
                type="date"
                defaultValue={employee?.birth_date ? employee.birth_date.substring(0, 10) : ""}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="No. HP / WhatsApp">
              <input name="phone" type="tel" defaultValue={employee?.phone} className={inputCls} placeholder="0812..." />
            </Field>
            <Field label="Email">
              <input name="email" type="email" defaultValue={employee?.email} className={inputCls} placeholder="nama@email.com" />
            </Field>
          </div>
          <Field label="Alamat Domisili">
            <textarea name="address" rows={2} defaultValue={employee?.address} className={inputCls} placeholder="Alamat lengkap sekarang" />
          </Field>
        </FormSection>

        {/* ── Kepegawaian ── */}
        <FormSection title="Data Kepegawaian" icon={Briefcase}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Posisi / Jabatan" required>
              <select
                name="position"
                required
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className={selectCls}
              >
                <option value="">— Pilih Jabatan —</option>
                <option value="kepala_sekolah">Kepala Sekolah</option>
                <option value="wakasek">Wakil Kepala Sekolah</option>
                <option value="guru">Guru / Pengajar</option>
                <option value="school_center">School Center</option>
                <option value="bendahara">Bendahara / Keuangan</option>
                <option value="penanggung_jawab">Penanggung Jawab</option>
                <option value="bk">Bimbingan Konseling</option>
                <option value="pustakawan">Pustakawan</option>
                <option value="laboran">Laboran</option>
                <option value="tu">Tata Usaha</option>
                <option value="satpam">Satpam</option>
                <option value="cleaning_service">Cleaning Service</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </Field>
            <Field label="Status Kepegawaian" required>
              <select name="status" required defaultValue={employee?.status ?? "active"} className={selectCls}>
                <option value="active">Aktif</option>
                <option value="contract">Kontrak</option>
                <option value="inactive">Nonaktif / Cuti</option>
                <option value="resigned">Keluar / Resign</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Unit Penempatan">
              <select name="unit_id" defaultValue={employee?.unit_id ?? ""} className={selectCls}>
                <option value="">Lintas Unit / Pusat</option>
                {unitOptions?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Tanggal Bergabung">
              <input
                name="join_date"
                type="date"
                defaultValue={employee?.join_date ? employee.join_date.substring(0, 10) : ""}
                className={inputCls}
              />
            </Field>
          </div>
        </FormSection>

        {/* ── Pendidikan ── */}
        <FormSection title="Pendidikan & Sertifikasi" icon={GraduationCap}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Pendidikan Terakhir">
              <select name="education" defaultValue={employee?.education ?? ""} className={selectCls}>
                <option value="">— Pilih —</option>
                <option value="SMA/SMK/Sederajat">SMA / SMK / Sederajat</option>
                <option value="D3">Diploma 3 (D3)</option>
                <option value="S1">Sarjana (S1)</option>
                <option value="S2">Magister (S2)</option>
                <option value="S3">Doktor (S3)</option>
              </select>
            </Field>
            <Field label="Sertifikasi Guru">
              <input
                name="certification"
                type="text"
                defaultValue={employee?.certification}
                className={inputCls}
                placeholder="Contoh: Sertifikasi Guru 2023"
              />
            </Field>
          </div>
        </FormSection>

        {/* ── Tupoksi ── */}
        {["guru", "kepala_sekolah", "wakasek"].includes(position) && (
          <FormSection title="Tupoksi / Peran Mengajar" icon={Award}>
            <div>
              <label className="block text-sm font-medium mb-2">
                Pilih semua peran yang berlaku{" "}
                <span className="text-muted-foreground font-normal">(tahan Ctrl/Cmd untuk multi-pilih)</span>
              </label>
              <select name="teacher_roles" multiple className={`${inputCls} h-36`}>
                {[
                  ["Wali Kelas", "Wali Kelas"],
                  ["Guru Tahsin & Tahfidz", "Guru Tahsin & Tahfidz"],
                  ["Guru Mata Pelajaran", "Guru Mata Pelajaran"],
                  ["Guru Kelas", "Guru Kelas"],
                  ["Guru Mapel Pendukung/Pilihan", "Guru Mapel Pendukung/Pilihan"],
                  ["Guru Bimbingan dan Konseling", "Guru BK"],
                  ["Guru Pendamping Khusus", "Guru Pendamping Khusus (GPK)"],
                  ["Guru Piket", "Guru Piket"],
                  ["Guru Ekstrakurikuler", "Guru Ekstrakurikuler / Pelatih"],
                  ["Guru PAUD", "Guru PAUD"],
                  ["Guru SD", "Guru SD"],
                  ["Pembina OSIS", "Pembina OSIS"],
                  ["Kepala Laboratorium / Perpustakaan", "Kepala Lab / Perpustakaan"],
                ].map(([val, label]) => (
                  <option
                    key={val}
                    value={val}
                    selected={existingRoles.includes(val)}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </FormSection>
        )}

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/employees/show/${id}`)}
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
              <><Save className="w-4 h-4" /> Simpan Perubahan</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
