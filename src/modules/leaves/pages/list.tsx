import React, { useMemo, useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Eye,
  FileSignature,
  FileText,
  Filter,
  Plus,
  Search,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";
import {
  formatLeaveDate,
  formatLeaveType,
  getLeaveDurationDays,
  isLeaveActiveOnDate,
  leaveStatusConfig,
  leaveTypes,
  toDateInputValue,
} from "../leave-utils";

export const LeavesList: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: deleteLeave } = useDelete();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const today = toDateInputValue(new Date());

  const filters: any[] = [];
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });
  if (filterType) filters.push({ field: "leave_type", operator: "eq", value: filterType });

  const { data, isLoading } = useList({
    resource: "leave_requests",
    meta: { select: "*, employees(full_name, position, nik, phone, units(name))" },
    filters,
    sorters: [{ field: "start_date", order: "desc" }],
    pagination: { pageSize: 50 },
  });

  const { data: substitutesData } = useList({
    resource: "substitute_assignments",
    meta: { select: "id, leave_request_id, status" },
    pagination: { pageSize: 200 },
  });

  const substitutesByLeaveId = useMemo(() => {
    const map = new Map<string, any[]>();
    (substitutesData?.data ?? []).forEach((assignment: any) => {
      if (!assignment.leave_request_id) return;
      const current = map.get(assignment.leave_request_id) ?? [];
      current.push(assignment);
      map.set(assignment.leave_request_id, current);
    });
    return map;
  }, [substitutesData]);

  const leaves = useMemo(() => {
    const rows = data?.data ?? [];
    if (!searchTerm.trim()) return rows;
    const keyword = searchTerm.trim().toLowerCase();
    return rows.filter((leave: any) =>
      [
        leave.employees?.full_name,
        leave.employees?.position,
        leave.employees?.nik,
        leave.reason,
        leave.units?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [data?.data, searchTerm]);

  const metrics = useMemo(() => {
    const allLeaves = data?.data ?? [];
    return {
      total: allLeaves.length,
      pending: allLeaves.filter((leave: any) => leave.status === "pending").length,
      approved: allLeaves.filter((leave: any) => leave.status === "approved").length,
      activeToday: allLeaves.filter((leave: any) => leave.status === "approved" && isLeaveActiveOnDate(leave, today)).length,
      withoutProof: allLeaves.filter((leave: any) => !leave.proof_document && leave.status !== "rejected").length,
      needsSubstitute: allLeaves.filter(
        (leave: any) =>
          leave.status === "approved" &&
          !substitutesByLeaveId.has(leave.id) &&
          ["guru", "guru_quran", "wali_kelas", "kepala_sekolah"].includes(leave.employees?.position)
      ).length,
    };
  }, [data?.data, substitutesByLeaveId, today]);

  const renderStatusBadge = (status: string) => {
    const config = leaveStatusConfig[status] ?? leaveStatusConfig.pending;
    return <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${config.className}`}>{config.label}</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Izin & Cuti Pegawai"
        description="Kelola pengajuan ketidakhadiran, approval, dampak presensi, dan kebutuhan guru pengganti."
        action={
          <Link
            to="/leaves/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Ajukan Izin/Cuti
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          { label: "Total Pengajuan", value: metrics.total, icon: FileText, tone: "text-slate-700 bg-slate-100" },
          { label: "Menunggu Approval", value: metrics.pending, icon: AlertTriangle, tone: "text-amber-700 bg-amber-100" },
          { label: "Disetujui", value: metrics.approved, icon: CheckCircle2, tone: "text-green-700 bg-green-100" },
          { label: "Aktif Hari Ini", value: metrics.activeToday, icon: Calendar, tone: "text-blue-700 bg-blue-100" },
          { label: "Perlu Inval", value: metrics.needsSubstitute, icon: UserCheck, tone: "text-purple-700 bg-purple-100" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-card border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="flex gap-3 items-center bg-card p-3 rounded-lg border shadow-sm flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground ml-1" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background outline-none"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu Persetujuan</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background outline-none"
          >
            <option value="">Semua Jenis</option>
            {leaveTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, NIK, jabatan, alasan..."
              className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-background outline-none"
            />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold">Workflow Mutu</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Approval menyinkronkan status presensi.
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-600" />
              Guru yang absen dapat diteruskan ke penugasan inval.
            </div>
            <div className="flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-blue-600" />
              Lampiran dipantau untuk audit administrasi.
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link to="/attendance/employees" className="text-xs border rounded-md px-3 py-2 hover:bg-muted">
              Presensi Pegawai
            </Link>
            <Link to="/substitutes" className="text-xs border rounded-md px-3 py-2 hover:bg-muted">
              Guru Inval
            </Link>
            <Link to="/reports/leaves" className="text-xs border rounded-md px-3 py-2 hover:bg-muted">
              Laporan Cuti
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data izin dan cuti...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-5 py-4">Pegawai</th>
                <th className="px-5 py-4">Periode</th>
                <th className="px-5 py-4">Jenis & Alasan</th>
                <th className="px-5 py-4">Dampak</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leaves.map((leave: any) => {
                const duration = getLeaveDurationDays(leave.start_date, leave.end_date);
                const substituteCount = substitutesByLeaveId.get(leave.id)?.length ?? 0;
                const needsSubstitute =
                  leave.status === "approved" &&
                  substituteCount === 0 &&
                  ["guru", "guru_quran", "wali_kelas", "kepala_sekolah"].includes(leave.employees?.position);

                return (
                  <tr key={leave.id} className="hover:bg-muted/30 transition-colors align-top">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{leave.employees?.full_name || "-"}</p>
                          <p className="text-[11px] text-muted-foreground uppercase">
                            {(leave.employees?.position || "pegawai").replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{formatLeaveDate(leave.start_date)} - {formatLeaveDate(leave.end_date)}</p>
                      <p className="text-xs text-muted-foreground">{duration || "-"} hari kalender</p>
                    </td>
                    <td className="px-5 py-4 max-w-[280px]">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <FileSignature className="w-3.5 h-3.5 text-blue-500" />
                        {formatLeaveType(leave.leave_type)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{leave.reason || "Tidak ada keterangan."}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1.5 text-xs">
                        <p className={leave.proof_document ? "text-green-700" : metrics.withoutProof ? "text-amber-700" : "text-muted-foreground"}>
                          {leave.proof_document ? "Lampiran tersedia" : "Belum ada lampiran"}
                        </p>
                        <p className={needsSubstitute ? "text-purple-700 font-medium" : "text-muted-foreground"}>
                          {substituteCount > 0 ? `${substituteCount} penugasan inval` : needsSubstitute ? "Perlu guru inval" : "Tidak wajib inval"}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">{renderStatusBadge(leave.status)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => navigate(`/leaves/show/${leave.id}`)}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Lihat detail dan proses"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {leave.status === "pending" && (
                        <button
                          onClick={() => {
                            if (confirm("Hapus pengajuan ini?")) deleteLeave({ resource: "leave_requests", id: leave.id as string });
                          }}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors ml-1"
                          title="Hapus pengajuan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-12 text-muted-foreground">
                    Tidak ada data pengajuan izin/cuti untuk filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
