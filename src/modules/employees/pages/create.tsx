import React from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft } from "lucide-react";

export const EmployeeCreate: React.FC = () => {
  const navigate = useNavigate();
  
  const { onFinish, mutationResult } = useForm({
    resource: "employees",
    action: "create",
    redirect: "list",
  });

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    // Convert empty unit_id to null
    if (!data.unit_id) {
      data.unit_id = null as any;
    }
    
    // Handle array for teacher_roles
    data.teacher_roles = formData.getAll("teacher_roles") as any;

    onFinish(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/employees")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tambah Pegawai Baru</h1>
          <p className="text-muted-foreground text-sm">Tambahkan data staf, guru, atau karyawan.</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">NIK / NIP</label>
              <input
                name="nik"
                type="text"
                required
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="Nomor Induk Pegawai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nama Lengkap</label>
              <input
                name="full_name"
                type="text"
                required
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="Nama sesuai KTP"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Posisi / Jabatan</label>
              <select
                name="position"
                required
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                <option value="">Pilih Jabatan</option>
                <option value="kepala_sekolah">Kepala Sekolah</option>
                <option value="wakasek">Wakil Kepala Sekolah</option>
                <option value="guru">Guru / Pengajar</option>
                <option value="tu">Tata Usaha</option>
                <option value="satpam">Satpam / Security</option>
                <option value="cleaning_service">Cleaning Service</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit Penempatan (Opsional)</label>
              <select
                name="unit_id"
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                <option value="">Lintas Unit / Pusat</option>
                {unitOptions?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tupoksi / Peran Jamak Guru</label>
            <select
              name="teacher_roles"
              multiple
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background h-32"
            >
              <option value="Wali Kelas">Wali Kelas</option>
              <option value="Guru Tahsin & Tahfidz">Guru Tahsin & Tahfidz</option>
              <option value="Guru Mata Pelajaran">Guru Mata Pelajaran</option>
              <option value="Guru Kelas">Guru Kelas</option>
              <option value="Guru Mapel Pendukung/Pilihan">Guru Mapel Pendukung/Pilihan</option>
              <option value="Guru Bimbingan dan Konseling">Guru Bimbingan dan Konseling (BK)</option>
              <option value="Guru Pendamping Khusus">Guru Pendamping Khusus (GPK)</option>
              <option value="Guru Piket">Guru Piket</option>
              <option value="Guru Ekstrakurikuler">Guru Ekstrakurikuler / Pelatih</option>
              <option value="Guru PAUD">Guru PAUD</option>
              <option value="Guru SD">Guru SD</option>
              <option value="Pembina OSIS">Pembina OSIS</option>
              <option value="Kepala Laboratorium / Perpustakaan">Kepala Laboratorium / Perpustakaan</option>
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">Tahan tombol <b>Ctrl</b> (Windows) atau <b>Cmd</b> (Mac) untuk memilih lebih dari satu Tupoksi.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">No. HP</label>
              <input
                name="phone"
                type="text"
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="0812..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status Kepegawaian</label>
              <select
                name="status"
                required
                defaultValue="active"
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif / Cuti</option>
                <option value="resigned">Keluar / Resign</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Alamat Lengkap</label>
            <textarea
              name="address"
              rows={3}
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
              placeholder="Alamat domisili saat ini"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/employees")}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={mutationResult.isLoading}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {mutationResult.isLoading ? "Menyimpan..." : "Simpan Pegawai"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
