import React, { useState } from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Clock, Users, BookOpen } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { toast } from "sonner";

const DAYS_OF_WEEK = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export const HalaqohForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "tahfidz_halaqohs",
    action: isEdit ? "edit" : "create",
    id,
    redirect: false,
  });

  const record = queryResult?.data?.data;

  const { options: employeeOptions } = useSelect({
    resource: "employees",
    optionLabel: "full_name",
    optionValue: "id",
    sorters: [{ field: "full_name", order: "asc" }],
  });

  const { options: yearOptions } = useSelect({
    resource: "academic_years",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "desc" }],
  });

  const { options: semesterOptions } = useSelect({
    resource: "semesters",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      employee_id: formData.get("employee_id") || null,
      description: formData.get("description"),
      schedule_day: formData.get("schedule_day") || null,
      schedule_time: formData.get("schedule_time") || null,
      academic_year_id: formData.get("academic_year_id"),
      semester_id: formData.get("semester_id"),
      program_type: "tahfidz", // Pastikan program_type di-set 'tahfidz'
    };

    try {
      const response = await onFinish(data);
      if (response?.error) {
        throw new Error(response.error.message || "Gagal menyimpan");
      }
      toast.success(isEdit ? "Halaqoh berhasil diperbarui!" : "Halaqoh berhasil ditambahkan!");
      navigate("/tahfidz-halaqohs");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error?.message || "Terjadi kesalahan saat menyimpan halaqoh. Cek console browser.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = formLoading || isSubmitting;

  if (isEdit && !record && formLoading) {
    return <div className="p-8 text-center text-muted-foreground">Memuat data halaqoh...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link
          to="/tahfidz-halaqohs"
          className="p-2 hover:bg-muted rounded-full transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader
          title={isEdit ? "Edit Halaqoh" : "Tambah Halaqoh"}
          description="Atur nama kelompok halaqoh beserta guru/muhaffizh pengampunya"
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 md:col-span-2 border-b pb-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Informasi Utama
              </h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Halaqoh <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={record?.name || ""}
                  placeholder="Contoh: Halaqoh Abu Bakar"
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:outline-none transition-shadow"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tahun Ajaran <span className="text-red-500">*</span></label>
                  <select
                    name="academic_year_id"
                    required
                    defaultValue={record?.academic_year_id || activeYearId || ""}
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:outline-none transition-shadow"
                  >
                    <option value="">-- Pilih Tahun Ajaran --</option>
                    {yearOptions?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Semester <span className="text-red-500">*</span></label>
                  <select
                    name="semester_id"
                    required
                    defaultValue={record?.semester_id || activeSemesterId || ""}
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:outline-none transition-shadow"
                  >
                    <option value="">-- Pilih Semester --</option>
                    {semesterOptions?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Muhaffizh / Guru</label>
                <div className="relative">
                  <select
                    name="employee_id"
                    defaultValue={record?.employee_id || ""}
                    className="w-full flex h-10 rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:outline-none transition-shadow appearance-none"
                  >
                    <option value="">-- Belum ada pengampu --</option>
                    {employeeOptions?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <Users className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs text-muted-foreground">Muhaffizh dapat ditambahkan nanti jika belum ditentukan.</p>
              </div>
            </div>

            <div className="space-y-4 md:col-span-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Jadwal (Opsional)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hari</label>
                  <select
                    name="schedule_day"
                    defaultValue={record?.schedule_day || ""}
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:outline-none transition-shadow"
                  >
                    <option value="">-- Pilih Hari --</option>
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Waktu (Jam)</label>
                  <input
                    type="text"
                    name="schedule_time"
                    defaultValue={record?.schedule_time || ""}
                    placeholder="Contoh: 15:30 - 17:00"
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:outline-none transition-shadow"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2 pt-2">
              <label className="text-sm font-medium">Deskripsi Tambahan</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={record?.description || ""}
                placeholder="Catatan tambahan mengenai halaqoh ini..."
                className="w-full flex rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:outline-none transition-shadow resize-y"
              />
            </div>
          </div>

        </div>
        <div className="p-6 bg-muted/30 border-t flex justify-end gap-3">
          <Link
            to="/tahfidz-halaqohs"
            className="px-6 py-2 rounded-lg border bg-background font-medium hover:bg-muted transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? "Menyimpan..." : "Simpan Halaqoh"}
          </button>
        </div>
      </form>
    </div>
  );
};
