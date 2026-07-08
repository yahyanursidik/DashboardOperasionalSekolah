import React from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, BookOpen, Clock, Users } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { toast } from "sonner";
import { supabaseClient as supabase } from "../../../lib/supabase/client";

export const TahsinHalaqohForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const { queryResult, formLoading } = useForm({
    resource: "tahfidz_halaqohs",
    action: isEdit ? "edit" : "create",
    id,
    redirect: false,
  });

  const record = queryResult?.data?.data;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
      program_type: "tahsin"
    };

    try {
      if (isEdit) {
        const { error } = await supabase.from("tahfidz_halaqohs").update(data).eq("id", id);
        if (error) throw error;
        toast.success("Halaqoh Tahsin berhasil diperbarui");
      } else {
        const { error } = await supabase.from("tahfidz_halaqohs").insert([data]);
        if (error) throw error;
        toast.success("Halaqoh Tahsin berhasil ditambahkan");
      }
      navigate("/tahsin-halaqohs");
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link
          to="/tahsin-halaqohs"
          className="p-2 hover:bg-muted rounded-full transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader
          title={isEdit ? "Edit Halaqoh Tahsin" : "Tambah Halaqoh Tahsin"}
          description="Atur nama kelompok halaqoh tahsin/tilawah beserta guru pengampunya"
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
                <label className="text-sm font-medium">Nama Halaqoh Tahsin <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={record?.name || ""}
                  placeholder="Contoh: Kelas Tahsin Ula"
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
            </div>

            <div className="space-y-4 border-b pb-6 md:border-b-0 md:pb-0 md:border-r md:pr-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Guru & Keterangan
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-medium">Guru Tahsin (Pengampu)</label>
                <select
                  name="employee_id"
                  defaultValue={record?.employee_id || ""}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:outline-none transition-shadow"
                >
                  <option value="">-- Belum ada pengampu --</option>
                  {employeeOptions?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Deskripsi / Catatan (Opsional)</label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={record?.description || ""}
                  placeholder="Catatan tambahan mengenai halaqoh ini..."
                  className="w-full flex rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:outline-none transition-shadow resize-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Jadwal Halaqoh
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-medium">Hari (Opsional)</label>
                <select
                  name="schedule_day"
                  defaultValue={record?.schedule_day || ""}
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:outline-none transition-shadow"
                >
                  <option value="">-- Pilih Hari --</option>
                  <option value="Senin">Senin</option>
                  <option value="Selasa">Selasa</option>
                  <option value="Rabu">Rabu</option>
                  <option value="Kamis">Kamis</option>
                  <option value="Jumat">Jumat</option>
                  <option value="Sabtu">Sabtu</option>
                  <option value="Ahad">Ahad</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Waktu / Jam (Opsional)</label>
                <input
                  type="text"
                  name="schedule_time"
                  defaultValue={record?.schedule_time || ""}
                  placeholder="Contoh: 16:00 - 17:30"
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:outline-none transition-shadow"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-muted/30 border-t flex items-center justify-between">
          <p className="text-xs text-muted-foreground hidden sm:block">
            <span className="text-red-500">*</span> Wajib diisi
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            <Link
              to="/tahsin-halaqohs"
              className="flex-1 sm:flex-none flex items-center justify-center px-6 py-2 border rounded-lg hover:bg-muted transition-colors font-medium text-sm"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || formLoading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting || formLoading ? "Menyimpan..." : "Simpan Halaqoh"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
