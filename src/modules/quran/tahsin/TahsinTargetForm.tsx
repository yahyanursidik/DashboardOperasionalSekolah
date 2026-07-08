import React, { useEffect, useState } from "react";
import { useForm, useSelect, useList } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Target } from "lucide-react";
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

  const [selectedHalaqoh, setSelectedHalaqoh] = useState<string>("");

  // Fetch available halaqohs for Tahsin
  const { data: halaqohsData } = useList({
    resource: "tahfidz_halaqohs",
    filters: [
      { field: "program_type", operator: "eq", value: "tahsin" },
      ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : []),
      ...(activeSemesterId ? [{ field: "semester_id", operator: "eq" as const, value: activeSemesterId }] : [])
    ],
    pagination: { mode: "off" }
  });
  const halaqohs = halaqohsData?.data || [];

  // Fetch members of the selected halaqoh
  const { data: membersData, isLoading: isLoadingStudents } = useList({
    resource: "tahfidz_halaqoh_members",
    filters: [{ field: "halaqoh_id", operator: "eq", value: selectedHalaqoh }],
    queryOptions: { enabled: !!selectedHalaqoh },
    meta: { select: "*, students(id, full_name, classes(name, units(name)))" },
    pagination: { mode: "off" }
  });

  const members = membersData?.data || [];

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
        
        {/* Identitas Program */}
        <div className="p-6 border-b bg-emerald-500/10 flex items-center gap-3">
           <Target className="w-6 h-6 text-emerald-600" />
           <div>
             <h2 className="font-semibold text-emerald-800 text-lg">Target Tahsin & Tilawah</h2>
             <p className="text-sm text-emerald-700/80">Input target bacaan per santri.</p>
           </div>
        </div>

        <div className="p-6 space-y-4">
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Halaqoh Tahsin</label>
            <select
              value={selectedHalaqoh}
              onChange={(e) => setSelectedHalaqoh(e.target.value)}
              disabled={isEdit}
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
            >
              <option value="">-- Pilih Halaqoh Tahsin --</option>
              {halaqohs.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Santri</label>
            <select
              name="student_id"
              required
              defaultValue={record?.student_id || ""}
              disabled={isEdit || !selectedHalaqoh || isLoadingStudents}
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {selectedHalaqoh ? "-- Pilih Santri dari Halaqoh --" : "-- Pilih Halaqoh Terlebih Dahulu --"}
              </option>
              {members.map(member => {
                const student = member.students;
                if (!student) return null;
                return (
                  <option key={student.id} value={student.id}>
                    {student.full_name} ({student.classes?.units?.name || "Tanpa Unit"} - {student.classes?.name || "Tanpa Kelas"})
                  </option>
                );
              })}
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
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {formLoading ? "Menyimpan..." : "Simpan Target"}
          </button>
        </div>
      </form>
    </div>
  );
};
