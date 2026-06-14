import React, { useEffect, useState } from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { Save, ArrowLeft } from "lucide-react";

export const EmployeeEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const { onFinish, mutationResult, queryResult } = useForm({
    resource: "employees",
    action: "edit",
    id: id,
    redirect: "list",
  });

  const employee = queryResult?.data?.data;
  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    if (!data.unit_id) data.unit_id = null as any;
    onFinish(data);
  };

  if (queryResult?.isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Memuat data...</div>;
  }

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
          <h1 className="text-2xl font-bold text-foreground">Edit Pegawai</h1>
          <p className="text-muted-foreground text-sm">Ubah data {employee?.full_name}</p>
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
                defaultValue={employee?.nik}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nama Lengkap</label>
              <input
                name="full_name"
                type="text"
                required
                defaultValue={employee?.full_name}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Posisi / Jabatan</label>
              <select
                name="position"
                required
                defaultValue={employee?.position}
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
              <label className="block text-sm font-medium mb-1">Unit Penempatan</label>
              <select
                name="unit_id"
                defaultValue={employee?.unit_id || ""}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                <option value="">Lintas Unit / Pusat</option>
                {unitOptions?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">No. HP</label>
              <input
                name="phone"
                type="text"
                defaultValue={employee?.phone}
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status Kepegawaian</label>
              <select
                name="status"
                required
                defaultValue={employee?.status}
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
              defaultValue={employee?.address}
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/50 outline-none"
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
              {mutationResult.isLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
