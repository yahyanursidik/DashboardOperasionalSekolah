import React, { useEffect, useState } from "react";
import { useUpdate, useSelect, useOne } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Save, Calendar, Clock, MapPin } from "lucide-react";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { toast } from "sonner";

const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const scheduleTypes = [
  { value: 'mengajar', label: 'Mengajar (Guru)' },
  { value: 'piket', label: 'Piket Harian' },
  { value: 'shift_keamanan', label: 'Shift Keamanan (Satpam)' },
  { value: 'shift_kebersihan', label: 'Shift Kebersihan (CS)' },
  { value: 'standby', label: 'Standby / Umum' }
];

export const ScheduleEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeYearId } = useAcademicYear();
  const { activeUnitId } = useCurrentUnit();
  
  const { mutate: updateSchedule, isLoading: isSaving } = useUpdate();
  const { data: scheduleData, isLoading } = useOne({
    resource: "employee_schedules",
    id: id as string
  });

  const [employeeId, setEmployeeId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Senin");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("15:00");
  const [scheduleType, setScheduleType] = useState("mengajar");
  const [classId, setClassId] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState(activeUnitId || "");
  const [isInit, setIsInit] = useState(false);

  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id"
  });

  React.useEffect(() => {
    if (scheduleData?.data && !isInit) {
      const sch = scheduleData.data;
      setEmployeeId(sch.employee_id);
      setDayOfWeek(sch.day_of_week);
      setStartTime(sch.start_time.slice(0, 5));
      setEndTime(sch.end_time.slice(0, 5));
      setScheduleType(sch.schedule_type);
      setClassId(sch.class_id || "");
      setSubject(sch.subject || "");
      setSelectedUnitId(sch.unit_id || activeUnitId || "");
      setIsInit(true);
    }
  }, [scheduleData, isInit, activeUnitId]);

  const { options: employeeOptions } = useSelect({ 
    resource: "employees", 
    optionLabel: "full_name", 
    optionValue: "id",
    filters: selectedUnitId ? [{ field: "unit_id", operator: "eq", value: selectedUnitId }] : []
  });

  const { options: classOptions } = useSelect({ 
    resource: "classes", 
    optionLabel: "name", 
    optionValue: "id",
    filters: selectedUnitId ? [{ field: "unit_id", operator: "eq", value: selectedUnitId }] : []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return toast.error("Pilih pegawai terlebih dahulu");

    updateSchedule({
      resource: "employee_schedules",
      id: id as string,
      values: {
        employee_id: employeeId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        schedule_type: scheduleType,
        class_id: scheduleType === 'mengajar' ? (classId || null) : null,
        subject: scheduleType === 'mengajar' ? subject : null,
        academic_year_id: activeYearId,
        unit_id: selectedUnitId || activeUnitId
      },
      successNotification: () => ({ message: "Jadwal berhasil diperbarui", type: "success" })
    }, {
      onSuccess: () => navigate("/schedules")
    });
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">Memuat...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Edit Jadwal Pegawai"
        description="Perbarui jadwal kerja atau jam mengajar mingguan."
      />

      <div className="bg-card rounded-xl border shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Pegawai</label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
            >
              <option value="">-- Pilih Pegawai --</option>
              {employeeOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Unit Sekolah</label>
            <select
              required
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
            >
              <option value="">-- Pilih Unit --</option>
              {unitOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Calendar className="w-4 h-4"/> Hari</label>
              <select
                required
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4"/> Jam Shift</label>
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

            <div className="space-y-2 md:col-span-2 pt-4 border-t">
              <label className="text-sm font-medium">Tipe Jadwal</label>
              <select
                required
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
              >
                {scheduleTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {scheduleType === 'mengajar' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4"/> Kelas Target (Opsional)</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                  >
                    <option value="">-- Lintas Kelas --</option>
                    {classOptions?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mata Pelajaran (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Matematika"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/schedules")}
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
