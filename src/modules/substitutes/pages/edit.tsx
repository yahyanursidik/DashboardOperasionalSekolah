import React, { useEffect, useState } from "react";
import { useUpdate, useSelect, useOne } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Save, Calendar, Clock, MapPin, UserMinus, UserCheck, FileText } from "lucide-react";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { toast } from "sonner";

export const SubstituteEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeYearId } = useAcademicYear();
  const { activeUnitId } = useCurrentUnit();
  
  const { mutate: updateAssignment, isLoading: isSaving } = useUpdate();
  const { data: assignmentData, isLoading } = useOne({
    resource: "substitute_assignments",
    id: id as string
  });

  const [absentEmployeeId, setAbsentEmployeeId] = useState("");
  const [substituteEmployeeId, setSubstituteEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [classId, setClassId] = useState("");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("scheduled");

  useEffect(() => {
    if (assignmentData?.data) {
      const ass = assignmentData.data;
      setAbsentEmployeeId(ass.absent_employee_id);
      setSubstituteEmployeeId(ass.substitute_employee_id);
      setDate(ass.date);
      setStartTime(ass.start_time.slice(0, 5));
      setEndTime(ass.end_time.slice(0, 5));
      setClassId(ass.class_id || "");
      setSubject(ass.subject);
      setNotes(ass.notes || "");
      setStatus(ass.status);
    }
  }, [assignmentData]);

  const { options: employeeOptions } = useSelect({ 
    resource: "employees", 
    optionLabel: "full_name", 
    optionValue: "id",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : []
  });

  const { options: classOptions } = useSelect({ 
    resource: "classes", 
    optionLabel: "name", 
    optionValue: "id",
    filters: activeUnitId ? [{ field: "unit_id", operator: "eq", value: activeUnitId }] : []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (absentEmployeeId === substituteEmployeeId) return toast.error("Guru yang absen dan pengganti tidak boleh sama");

    updateAssignment({
      resource: "substitute_assignments",
      id: id as string,
      values: {
        absent_employee_id: absentEmployeeId,
        substitute_employee_id: substituteEmployeeId,
        date,
        start_time: startTime,
        end_time: endTime,
        class_id: classId || null,
        subject,
        notes,
        status,
        academic_year_id: activeYearId,
        unit_id: activeUnitId
      },
      successNotification: () => ({ message: "Penugasan guru inval berhasil diperbarui", type: "success" })
    }, {
      onSuccess: () => navigate("/substitutes")
    });
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">Memuat...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Ubah Penugasan Inval"
        description="Ubah detail penugasan atau tandai sebagai Selesai."
      />

      <div className="bg-card rounded-xl border shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border">
            <label className="text-sm font-medium w-32">Status Penugasan:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`border rounded-md px-3 py-2 text-sm outline-none font-semibold ${
                status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' :
                status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-300' :
                'bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              <option value="scheduled">DIJADWALKAN</option>
              <option value="completed">SELESAI</option>
              <option value="cancelled">DIBATALKAN</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg bg-red-50/50 border border-red-100">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-red-700"><UserMinus className="w-4 h-4"/> Guru yang Absen</label>
              <select
                required
                value={absentEmployeeId}
                onChange={(e) => setAbsentEmployeeId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/50 outline-none bg-background border-red-200"
              >
                <option value="">-- Pilih Guru --</option>
                {employeeOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-green-700"><UserCheck className="w-4 h-4"/> Guru Pengganti (Inval)</label>
              <select
                required
                value={substituteEmployeeId}
                onChange={(e) => setSubstituteEmployeeId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500/50 outline-none bg-background border-green-200"
              >
                <option value="">-- Pilih Guru --</option>
                {employeeOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Calendar className="w-4 h-4"/> Tanggal Mengajar</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4"/> Jam Mengajar</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4"/> Kelas</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                <option value="">-- Lintas Kelas --</option>
                {classOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Mata Pelajaran</label>
              <input
                type="text"
                required
                placeholder="Contoh: Matematika"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4"/> Catatan Khusus / Tugas</label>
            <textarea
              rows={3}
              placeholder="Berikan instruksi untuk guru pengganti..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/substitutes")}
              className="flex items-center gap-2 px-6 py-2.5 border rounded-md hover:bg-muted transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
