import React, { useState } from "react";
import { useList } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Printer, Calendar, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useSystemSettings } from "../../../app/providers/SettingsProvider";
import { useCurrentUnit } from "../../../app/providers/UnitProvider";
import { useAcademicYear } from "../../../app/providers/AcademicYearProvider";
import { ReportsSectionNav } from "../components/ReportsSectionNav";
import { recordReportExport } from "../report-utils";

export const ReportLeaves: React.FC = () => {
  const { activeUnitId } = useCurrentUnit();
  const { activeYearId, activeSemesterId } = useAcademicYear();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterStatus, setFilterStatus] = useState("");
  const { appName } = useSystemSettings();

  const { data, isLoading } = useList({
    resource: "leave_requests",
    filters: [...(activeUnitId ? [{ field: "unit_id", operator: "eq" as const, value: activeUnitId }] : []), ...(activeYearId ? [{ field: "academic_year_id", operator: "eq" as const, value: activeYearId }] : [])],
    meta: { select: "*, employees(full_name, nik, position)" },
    pagination: { mode: "off" },
    sorters: [{ field: "start_date", order: "desc" }]
  });

  const leaves = data?.data || [];

  // Filter based on month and status
  const filteredLeaves = leaves.filter((leave) => {
    const leaveMonth = leave.start_date?.substring(0, 7);
    const matchMonth = filterMonth ? leaveMonth === filterMonth : true;
    const matchStatus = filterStatus ? leave.status === filterStatus : true;
    return matchMonth && matchStatus;
  });

  const handlePrint = async () => {
    await recordReportExport({ reportKey: "employee_leaves", reportLabel: "Laporan Izin dan Cuti Pegawai", format: "print", rowCount: filteredLeaves.length, unitId: activeUnitId, academicYearId: activeYearId, semesterId: activeSemesterId, dateFrom: filterMonth ? `${filterMonth}-01` : null, filters: { status: filterStatus } });
    window.print();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  // Calculate durasi hari
  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays;
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'approved': return "Disetujui";
      case 'rejected': return "Ditolak";
      default: return "Menunggu";
    }
  };

  return (
    <div className="space-y-6">
      {/* CSS Khusus untuk Print (Menyembunyikan Sidebar & Header Utama) */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #print-area, #print-area * {
              visibility: visible;
            }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20px;
            }
            .no-print {
              display: none !important;
            }
            .print-border {
              border-color: #000 !important;
            }
          }
        `}
      </style>

      <div className="no-print">
        <PageHeader
          title="Laporan Izin & Cuti Pegawai"
          description="Rekapitulasi pengajuan izin dan cuti guru beserta staf."
          action={
            <Link
              to="/reports"
              className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted transition-colors shadow-sm font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Pusat Laporan
            </Link>
          }
        />

        <div className="mt-6"><ReportsSectionNav /></div>

        <div className="bg-card rounded-xl border shadow-sm p-4 flex flex-wrap gap-4 items-end justify-between mt-6">
          <div className="flex gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Bulan Rekap</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="pl-9 pr-4 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Status Persetujuan</label>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-9 pr-4 py-2 border rounded-md text-sm bg-background min-w-[150px] outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Semua Status</option>
                  <option value="approved">Hanya Disetujui</option>
                  <option value="pending">Menunggu</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => void handlePrint()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan
          </button>
        </div>
      </div>

      <div id="print-area" className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px] mt-6 print-border">
        {/* Header Khusus Print */}
        <div className="hidden print:block text-center border-b border-black pb-4 mb-6 pt-4">
          <h1 className="text-2xl font-bold uppercase">{appName}</h1>
          <h2 className="text-xl font-bold mt-1">Laporan Rekapitulasi Izin & Cuti Pegawai</h2>
          <p className="mt-2 text-sm">Bulan Laporan: {filterMonth || "Semua Waktu"}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64 text-muted-foreground no-print">Menyusun laporan...</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center no-print">
            <p className="text-muted-foreground font-medium">Tidak ada data izin untuk filter yang dipilih.</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-4 print:p-0">
            <table className="w-full text-sm text-left border-collapse border border-gray-200 print:border-black">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold border-b border-gray-200 print:border-black print:text-black print:bg-white">
                <tr>
                  <th className="px-4 py-3 border border-gray-200 print:border-black text-center w-12">No</th>
                  <th className="px-4 py-3 border border-gray-200 print:border-black">Nama Pegawai</th>
                  <th className="px-4 py-3 border border-gray-200 print:border-black">Jabatan</th>
                  <th className="px-4 py-3 border border-gray-200 print:border-black">Jenis Izin</th>
                  <th className="px-4 py-3 border border-gray-200 print:border-black">Tanggal Pelaksanaan</th>
                  <th className="px-4 py-3 border border-gray-200 print:border-black text-center">Durasi</th>
                  <th className="px-4 py-3 border border-gray-200 print:border-black text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium print:text-black">
                {filteredLeaves.map((leave, index) => (
                  <tr key={leave.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-center border border-gray-200 print:border-black">{index + 1}</td>
                    <td className="px-4 py-3 border border-gray-200 print:border-black">
                      {leave.employees?.full_name || "-"}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 print:border-black capitalize">
                      {leave.employees?.position?.replace('_', ' ') || "-"}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 print:border-black capitalize">
                      {leave.leave_type?.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 print:border-black">
                      {formatDate(leave.start_date)} s.d {formatDate(leave.end_date)}
                    </td>
                    <td className="px-4 py-3 text-center border border-gray-200 print:border-black">
                      {calculateDuration(leave.start_date, leave.end_date)} hari
                    </td>
                    <td className="px-4 py-3 text-center border border-gray-200 print:border-black">
                      <span className={`px-2 py-1 text-xs rounded-md print:p-0 print:bg-transparent ${
                        leave.status === 'approved' ? 'bg-green-100 text-green-700 print:text-black' : 
                        leave.status === 'rejected' ? 'bg-red-100 text-red-700 print:text-black' : 
                        'bg-amber-100 text-amber-700 print:text-black'
                      }`}>
                        {renderStatus(leave.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Print Signature Section */}
            <div className="hidden print:flex justify-end mt-16 pr-8">
              <div className="text-center">
                <p className="mb-16">Mengetahui,<br/>Kepala Sekolah / Unit</p>
                <p className="font-bold border-b border-black min-w-[200px]"></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
