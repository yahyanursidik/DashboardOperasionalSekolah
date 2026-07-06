import React, { useEffect, useState } from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, BookOpen } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const TahsinTargetForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "tahsin_student_targets",
    action: isEdit ? "edit" : "create",
    id,
  });

  const record = queryResult?.data?.data;

  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    if (record) {
      setDescription(record.description);
    }
  }, [record]);

  const { options: studentOptions } = useSelect({
    resource: "students",
    optionLabel: "full_name",
    optionValue: "id",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    sorters: [{ field: "full_name", order: "asc" }],
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      student_id: formData.get("student_id"),
      target_type: "tahsin",
      description: description,
      target_amount: parseInt(formData.get("target_amount") as string),
      amount_unit: formData.get("amount_unit"),
      status: formData.get("status") || "in_progress",
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
    };

    onFinish(data);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/tahsin-student-targets")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Target Tahsin" : "Tambah Target Tahsin"}
          description="Atur target tilawah/jilid secara spesifik untuk santri"
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Santri</label>
            <select
              name="student_id"
              required
              defaultValue={record?.student_id || ""}
              disabled={isEdit}
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">-- Pilih Santri --</option>
              {studentOptions?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Deskripsi Target</label>
            <input
              type="text"
              name="description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Kenaikan Jilid 2 Tilawati"
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jumlah Target</label>
              <input
                type="number"
                name="target_amount"
                required
                min="1"
                defaultValue={record?.target_amount || 1}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Satuan Target</label>
              <select
                name="amount_unit"
                required
                defaultValue={record?.amount_unit || "jilid"}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="jilid">Jilid</option>
                <option value="halaman">Halaman</option>
                <option value="surah">Surah</option>
                <option value="juz">Juz</option>
                <option value="ayat">Ayat</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                required
                defaultValue={record?.status || "in_progress"}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="in_progress">Proses (In Progress)</option>
                <option value="completed">Tercapai (Completed)</option>
                <option value="failed">Gagal (Failed)</option>
              </select>
            </div>
          </div>

        </div>
        <div className="p-6 bg-muted/50 border-t flex justify-end">
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Target"}
          </button>
        </div>
      </form>
    </div>
  );
};
