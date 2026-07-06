import React from "react";
import { useForm, useSelect } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";

export const TahsinHalaqohForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { activeYearId, activeSemesterId } = useAcademicYear();

  const { onFinish, queryResult, formLoading } = useForm({
    resource: "tahsin_halaqohs",
    action: isEdit ? "edit" : "create",
    id,
  });

  const record = queryResult?.data?.data;

  const { options: employeeOptions } = useSelect({
    resource: "employees",
    optionLabel: "full_name",
    optionValue: "id",
    sorters: [{ field: "full_name", order: "asc" }],
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name"),
      employee_id: formData.get("employee_id") || null,
      description: formData.get("description"),
      academic_year_id: activeYearId,
      semester_id: activeSemesterId,
      program_type: "tahsin" // Automatically set to Tahsin
    };

    onFinish(data);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/tahsin-halaqohs")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? "Edit Halaqoh Tahsin" : "Tambah Halaqoh Tahsin"}
          description="Atur nama kelompok halaqoh tahsin/tilawah beserta guru pengampunya"
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Halaqoh</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={record?.name || ""}
              placeholder="Contoh: Halaqoh Tilawati A"
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Guru Tahsin (Opsional)</label>
            <select
              name="employee_id"
              defaultValue={record?.employee_id || ""}
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">-- Belum ada pengampu --</option>
              {employeeOptions?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Deskripsi (Opsional)</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={record?.description || ""}
              placeholder="Catatan tambahan mengenai halaqoh tahsin ini..."
              className="w-full flex rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>

        </div>
        <div className="p-6 bg-muted/50 border-t flex justify-end">
          <button
            type="submit"
            disabled={formLoading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Halaqoh"}
          </button>
        </div>
      </form>
    </div>
  );
};
