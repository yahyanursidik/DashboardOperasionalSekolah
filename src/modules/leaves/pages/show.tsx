import React, { useMemo, useState } from "react";
import { useGetIdentity, useList, useOne } from "@refinedev/core";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Paperclip,
  User,
  UserCheck,
  XCircle,
} from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { dayMap, formatTime, getScheduleSubjectName } from "../../schedules/schedule-utils";
import {
  formatLeaveDate,
  formatLeaveStatus,
  formatLeaveType,
  getDatesInRange,
  getLeaveDurationDays,
  leaveStatusConfig,
} from "../leave-utils";
import { toast } from "sonner";

export const LeaveShow: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<any>();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data, isLoading, refetch } = useOne({
    resource: "leave_requests",
    id: id as string,
    meta: { select: "*, employees(full_name, position, phone, nik, unit_id, units(name))" },
  });

  const leave = data?.data;
  const dateRange = useMemo(() => getDatesInRange(leave?.start_date, leave?.end_date), [leave?.start_date, leave?.end_date]);
  const affectedDays = useMemo(() => new Set(dateRange.map((date) => dayMap[new Date(`${date}T00:00:00`).getDay()])), [dateRange]);

  const { data: schedulesData } = useList({
    resource: "employee_schedules",
    meta: { select: "*, classes(name), subjects(name)" },
    filters: leave?.employee_id ? [{ field: "employee_id", operator: "eq", value: leave.employee_id }] : [],
    pagination: { pageSize: 100 },
    queryOptions: { enabled: !!leave?.employee_id && dateRange.length > 0 },
  });

  const { data: substitutesData } = useList({
    resource: "substitute_assignments",
    meta: { select: "id, date, start_time, end_time, subject, status, substitute:substitute_employee_id(full_name)" },
    filters: id ? [{ field: "leave_request_id", operator: "eq", value: id }] : [],
    pagination: { pageSize: 50 },
    queryOptions: { enabled: !!id },
  });

  const impactedSchedules = useMemo(
    () => (schedulesData?.data ?? []).filter((schedule: any) => affectedDays.has(schedule.day_of_week)),
    [affectedDays, schedulesData?.data]
  );

  const syncAttendance = async (status: "sick" | "leave") => {
    if (!leave?.employee_id || dateRange.length === 0) return;
    const payload = dateRange.map((date) => ({
      employee_id: leave.employee_id,
      date,
      status,
      time_in: null,
      time_out: null,
      notes: `Sinkron dari pengajuan ${formatLeaveType(leave.leave_type)} yang disetujui.`,
    }));

    const { error } = await supabaseClient.from("employee_attendance").upsert(payload, { onConflict: "employee_id,date" });
    if (error) throw error;
  };

  const handleStatusUpdate = async (newStatus: "approved" | "rejected") => {
    if (!leave) return;
    if (!confirm(`Apakah Anda yakin ingin ${newStatus === "approved" ? "MENYETUJUI" : "MENOLAK"} pengajuan ini?`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabaseClient
        .from("leave_requests")
        .update({
          status: newStatus,
          approved_by: identity?.id || null,
        })
        .eq("id", id);

      if (error) throw error;

      if (newStatus === "approved") {
        await syncAttendance(leave.leave_type === "sakit" ? "sick" : "leave");
      }

      toast.success(`Pengajuan berhasil ${newStatus === "approved" ? "disetujui dan disinkronkan ke presensi" : "ditolak"}`);
      refetch?.();
    } catch (error: any) {
      toast.error(error?.message || "Gagal memproses pengajuan");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">Memuat detail pengajuan...</div>;
  if (!leave) return <div className="p-8 text-center text-red-500">Data pengajuan tidak ditemukan.</div>;

  const statusConfig = leaveStatusConfig[leave.status] ?? leaveStatusConfig.pending;
  const durationDays = getLeaveDurationDays(leave.start_date, leave.end_date);
  const substituteAssignments = substitutesData?.data ?? [];
  const createSubstituteUrl = `/substitutes/create?leave_request_id=${leave.id}&absent_employee_id=${leave.employee_id}&date=${leave.start_date}&notes=${encodeURIComponent(
    `Inval terkait pengajuan ${formatLeaveType(leave.leave_type)}: ${leave.reason || ""}`
  )}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detail Izin/Cuti Pegawai"
        description={`Diajukan pada ${formatLeaveDate(leave.created_at, { month: "long" })}`}
        action={
          <button
            onClick={() => navigate("/leaves")}
            className="flex items-center gap-2 border bg-card hover:bg-muted text-foreground px-4 py-2 rounded-md transition-colors shadow-sm font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <div className="bg-card rounded-lg border shadow-sm p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2 border-b pb-3">
              <User className="w-4 h-4 text-primary" /> Pemohon
            </h3>

            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Nama Lengkap</p>
              <p className="font-semibold">{leave.employees?.full_name || "-"}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">NIK / ID Pegawai</p>
              <p className="font-medium">{leave.employees?.nik || "-"}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Jabatan</p>
              <p className="font-medium capitalize">{(leave.employees?.position || "-").replace(/_/g, " ")}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Unit</p>
              <p className="font-medium">{leave.units?.name || leave.employees?.units?.name || "-"}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Kontak</p>
              <p className="font-medium">{leave.employees?.phone || "-"}</p>
            </div>
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-6 space-y-3">
            <p className="font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-600" /> Guru Inval
            </p>
            {substituteAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada penugasan pengganti terkait pengajuan ini.</p>
            ) : (
              <div className="space-y-2">
                {substituteAssignments.map((assignment: any) => (
                  <div key={assignment.id} className="border rounded-md p-3 text-sm">
                    <p className="font-medium">{assignment.substitute?.full_name || "Guru pengganti"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatLeaveDate(assignment.date)} {formatTime(assignment.start_time)}-{formatTime(assignment.end_time)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Link to={createSubstituteUrl} className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-2 hover:bg-muted">
              <UserCheck className="w-4 h-4" /> Buat Penugasan Inval
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-lg border shadow-sm p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Rincian Pengajuan
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {durationDays} hari kalender, {dateRange.length} tanggal presensi
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full border text-xs font-bold ${statusConfig.className}`}>
                {formatLeaveStatus(leave.status).toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/20 p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground uppercase font-medium">Jenis</p>
                <p className="font-semibold">{formatLeaveType(leave.leave_type)}</p>
              </div>
              <div className="bg-muted/20 p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground uppercase font-medium">Tanggal Mulai</p>
                <p className="font-semibold">{formatLeaveDate(leave.start_date)}</p>
              </div>
              <div className="bg-muted/20 p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground uppercase font-medium">Tanggal Selesai</p>
                <p className="font-semibold">{formatLeaveDate(leave.end_date)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Alasan / Keterangan</p>
              <p className="text-sm bg-muted/10 p-3 border rounded-md whitespace-pre-wrap">{leave.reason || "-"}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Dokumen Lampiran</p>
              {leave.proof_document ? (
                <a
                  href={leave.proof_document}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-sm font-medium border border-blue-200 transition-colors"
                >
                  <Paperclip className="w-4 h-4" /> Lihat Lampiran
                </a>
              ) : (
                <p className="text-sm text-muted-foreground italic">Tidak ada dokumen yang dilampirkan.</p>
              )}
            </div>

            {leave.status === "pending" && (
              <div className="pt-6 mt-6 border-t flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleStatusUpdate("approved")}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-bold shadow-sm disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" /> Setujui & Sinkron Presensi
                </button>
                <button
                  onClick={() => handleStatusUpdate("rejected")}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors font-bold shadow-sm disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" /> Tolak
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border shadow-sm p-5 space-y-3">
              <p className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" /> Jadwal Terdampak
              </p>
              {impactedSchedules.length === 0 ? (
                <p className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/30">Tidak ada jadwal mingguan yang cocok dengan tanggal izin.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
                  {impactedSchedules.map((schedule: any) => (
                    <div key={schedule.id} className="border rounded-md p-3 text-sm">
                      <p className="font-medium">
                        {schedule.day_of_week}, {formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getScheduleSubjectName(schedule)} {schedule.classes?.name ? `- ${schedule.classes.name}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-5 space-y-3">
              <p className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" /> Dampak Presensi
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Status presensi yang dipakai saat approval: <span className="font-medium text-foreground">{leave.leave_type === "sakit" ? "Sakit" : "Izin/Cuti"}</span>.</p>
                <p>Jumlah tanggal yang akan/tercatat pada presensi: <span className="font-medium text-foreground">{dateRange.length}</span>.</p>
                <Link to="/attendance/employees" className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-2 hover:bg-muted mt-2">
                  Buka Presensi Pegawai
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
