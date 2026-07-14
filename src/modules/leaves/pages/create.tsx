import React, { useEffect, useMemo, useState } from "react";
import { useCreate, useList, useSelect } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Calendar, CheckCircle2, FileText, Info, Save, Upload } from "lucide-react";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { supabaseClient } from "../../../lib/supabase/client";
import { dayMap, formatTime, getScheduleSubjectName } from "../../schedules/schedule-utils";
import { toast } from "sonner";
import {
  formatLeaveType,
  getDatesInRange,
  getLeaveDurationDays,
  leaveTypes,
  requiresStrongProof,
} from "../leave-utils";

export const LeaveCreate: React.FC = () => {
  const navigate = useNavigate();
  const { activeYearId } = useAcademicYear();
  const { activeUnitId } = useCurrentUnit();
  const { mutate: createLeave, isLoading: isSaving } = useCreate();

  const [selectedUnitId, setSelectedUnitId] = useState(activeUnitId || "");
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState("sakit");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (activeUnitId) setSelectedUnitId(activeUnitId);
  }, [activeUnitId]);

  const { options: unitOptions } = useSelect({
    resource: "units",
    optionLabel: "name",
    optionValue: "id",
  });

  const { options: employeeOptions } = useSelect({
    resource: "employees",
    optionLabel: "full_name",
    optionValue: "id",
    filters: selectedUnitId ? [{ field: "unit_id", operator: "eq", value: selectedUnitId }] : [],
  });

  const dateRange = useMemo(() => getDatesInRange(startDate, endDate), [startDate, endDate]);
  const affectedDays = useMemo(() => new Set(dateRange.map((date) => dayMap[new Date(`${date}T00:00:00`).getDay()])), [dateRange]);
  const durationDays = getLeaveDurationDays(startDate, endDate);
  const proofRecommended = requiresStrongProof(leaveType, durationDays);

  const scheduleFilters: any[] = [
    ...(employeeId ? [{ field: "employee_id", operator: "eq", value: employeeId }] : []),
    ...(activeYearId ? [{ field: "academic_year_id", operator: "eq", value: activeYearId }] : []),
  ];

  const { data: schedulesData } = useList({
    resource: "employee_schedules",
    meta: { select: "*, classes(name), subjects(name)" },
    filters: scheduleFilters,
    pagination: { pageSize: 100 },
    queryOptions: { enabled: !!employeeId && dateRange.length > 0 },
  });

  const impactedSchedules = useMemo(
    () => (schedulesData?.data ?? []).filter((schedule: any) => affectedDays.has(schedule.day_of_week)),
    [affectedDays, schedulesData?.data]
  );

  const checklist = [
    { label: "Pegawai dan unit sudah dipilih", done: !!employeeId && !!selectedUnitId },
    { label: "Rentang tanggal valid", done: !!startDate && !!endDate && durationDays > 0 },
    { label: "Alasan cukup jelas", done: reason.trim().length >= 10 },
    { label: proofRecommended ? "Lampiran pendukung disiapkan" : "Lampiran opsional ditinjau", done: proofRecommended ? !!file : true },
    { label: "Dampak jadwal terlihat", done: !!employeeId && dateRange.length > 0 },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB");
        e.target.value = "";
        return;
      }
      setFile(selectedFile);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return null;
    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `leaves/${fileName}`;

      const { error } = await supabaseClient.storage.from("leave_documents").upload(filePath, file);

      if (error) throw error;

      const { data } = supabaseClient.storage.from("leave_documents").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Gagal mengunggah dokumen");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const hasOverlappingRequest = async () => {
    const { data: existing, error } = await supabaseClient
      .from("leave_requests")
      .select("id, start_date, end_date, status")
      .eq("employee_id", employeeId)
      .neq("status", "rejected")
      .lte("start_date", endDate)
      .gte("end_date", startDate)
      .limit(1);

    if (error) {
      console.error("Overlap check error:", error);
      return false;
    }

    return (existing ?? []).length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) return toast.error("Pilih unit terlebih dahulu");
    if (!employeeId) return toast.error("Pilih pegawai terlebih dahulu");
    if (!startDate || !endDate || durationDays <= 0) return toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai");
    if (reason.trim().length < 10) return toast.error("Alasan pengajuan perlu lebih jelas");
    if (proofRecommended && !file && !confirm("Jenis pengajuan ini sebaiknya memiliki lampiran. Lanjutkan tanpa lampiran?")) return;

    if (await hasOverlappingRequest()) {
      toast.error("Pegawai sudah memiliki pengajuan izin/cuti pada rentang tanggal ini");
      return;
    }

    const proofUrl = await uploadFile();
    if (file && !proofUrl) return;

    createLeave(
      {
        resource: "leave_requests",
        values: {
          employee_id: employeeId,
          start_date: startDate,
          end_date: endDate,
          leave_type: leaveType,
          reason: reason.trim(),
          proof_document: proofUrl,
          status: "pending",
          academic_year_id: activeYearId,
          unit_id: selectedUnitId,
        },
        successNotification: () => ({ message: "Pengajuan izin/cuti berhasil dibuat", type: "success" }),
      },
      {
        onSuccess: () => navigate("/leaves"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajukan Izin/Cuti Pegawai"
        description="Lengkapi data ketidakhadiran, lampiran, dan tinjau dampaknya ke jadwal sebelum diajukan."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <select
                  required
                  value={selectedUnitId}
                  onChange={(e) => {
                    setSelectedUnitId(e.target.value);
                    setEmployeeId("");
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                >
                  <option value="">-- Pilih Unit --</option>
                  {unitOptions?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pegawai</label>
                <select
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                >
                  <option value="">-- Pilih Pegawai --</option>
                  {employeeOptions?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Jenis Pengajuan</label>
                <select
                  required
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                >
                  {leaveTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Rentang Tanggal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate) setEndDate(e.target.value);
                    }}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{durationDays > 0 ? `${durationDays} hari kalender` : "Pilih tanggal mulai dan selesai."}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Keterangan / Alasan Detail</label>
              <textarea
                required
                rows={4}
                placeholder="Contoh: Sakit demam dan perlu istirahat sesuai arahan dokter."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none bg-background resize-none"
              />
            </div>

            <div className={`space-y-2 p-4 border rounded-lg border-dashed ${proofRecommended ? "bg-amber-50 border-amber-200" : "bg-muted/30"}`}>
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Lampiran Dokumen
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                {proofRecommended
                  ? "Lampiran sangat disarankan untuk jenis pengajuan ini, misalnya surat dokter, surat tugas, atau dokumen resmi."
                  : "Upload bukti pendukung bila tersedia. Maksimal 5MB, format gambar/PDF."}
              </p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate("/leaves")}
                className="flex items-center gap-2 px-6 py-2.5 border rounded-md hover:bg-muted transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Batal
              </button>
              <button
                type="submit"
                disabled={isSaving || isUploading}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm disabled:opacity-70"
              >
                {isUploading ? <Upload className="w-4 h-4 animate-bounce" /> : <Save className="w-4 h-4" />}
                {isUploading ? "Mengunggah..." : isSaving ? "Menyimpan..." : "Ajukan"}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold">Definition of Done</p>
              <p className="text-xs text-muted-foreground">Pastikan data cukup sebelum dikirim ke approval.</p>
            </div>
            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 ${item.done ? "text-green-600" : "text-muted-foreground"}`} />
                  <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Dampak Jadwal</p>
                <p className="text-xs text-muted-foreground">{dateRange.length ? `${formatLeaveType(leaveType)} selama ${durationDays} hari` : "Pilih pegawai dan tanggal."}</p>
              </div>
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>

            {impactedSchedules.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/30">
                Belum ada jadwal mingguan yang terdampak pada rentang ini.
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                {impactedSchedules.map((schedule: any) => (
                  <div key={schedule.id} className="border rounded-md p-3 text-sm">
                    <p className="font-medium">{schedule.day_of_week}, {formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}</p>
                    <p className="text-xs text-muted-foreground">
                      {getScheduleSubjectName(schedule)} {schedule.classes?.name ? `- ${schedule.classes.name}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
