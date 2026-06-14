import React, { useState } from "react";
import { useTable, useSelect } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, Users, Filter, Download, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export const ReportEmployeeAttendance: React.FC = () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterUnit, setFilterUnit] = useState("");

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });

  const { tableQueryResult } = useTable({
    resource: "employees",
    pagination: { mode: "off" },
    filters: {
      permanent: [
        { field: "status", operator: "eq", value: "active" },
        ...(filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit }] : []),
      ] as any[]
    },
    meta: {
      select: "*, employee_attendance(status, date, time_in, time_out)"
    }
  });

  const employees = tableQueryResult?.data?.data || [];
  const isLoading = tableQueryResult.isLoading;

  // Process data for the selected month
  const reportData = employees.map((emp: any) => {
    const records = emp.employee_attendance?.filter((a: any) => a.date.startsWith(filterMonth)) || [];
    const hadir = records.filter((a: any) => a.status === 'present').length;
    const sakit = records.filter((a: any) => a.status === 'sick').length;
    const izin = records.filter((a: any) => a.status === 'leave').length;
    const alpa = records.filter((a: any) => a.status === 'absent').length;

    return { ...emp, attendance_summary: { hadir, sakit, izin, alpa, total: records.length } };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Absensi Pegawai"
        description="Rekapitulasi kehadiran bulanan untuk seluruh pegawai dan guru."
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

      <div className="bg-card rounded-xl border shadow-sm p-4 flex flex-wrap gap-4 items-end justify-between">
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
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Filter Unit</label>
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <select 
                value={filterUnit} 
                onChange={(e) => setFilterUnit(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-md text-sm bg-background min-w-[150px] outline-none"
              >
                <option value="">Semua Unit</option>
                {unitOptions?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <button className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-md hover:bg-emerald-100 transition-colors shadow-sm font-medium text-sm">
          <Download className="w-4 h-4" />
          Export ke Excel
        </button>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
           <div className="flex justify-center items-center h-64 text-muted-foreground">Menyusun laporan...</div>
        ) : reportData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Tidak ada data pegawai yang sesuai.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold border-b">
                <tr>
                  <th className="px-4 py-4 w-10 text-center">No</th>
                  <th className="px-4 py-4">Nama Pegawai</th>
                  <th className="px-4 py-4">Jabatan</th>
                  <th className="px-4 py-4 text-center">Hari Input</th>
                  <th className="px-4 py-4 text-center bg-green-50 text-green-700">Hadir</th>
                  <th className="px-4 py-4 text-center bg-yellow-50 text-yellow-700">Sakit</th>
                  <th className="px-4 py-4 text-center bg-blue-50 text-blue-700">Izin</th>
                  <th className="px-4 py-4 text-center bg-red-50 text-red-700">Alpa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {reportData.map((emp, index) => {
                  const s = emp.attendance_summary;
                  return (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-center text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{emp.full_name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{emp.nik || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs uppercase">{emp.position.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{s.total} hari</td>
                      <td className="px-4 py-3 text-center bg-green-50/30 text-green-700 font-bold">{s.hadir}</td>
                      <td className="px-4 py-3 text-center bg-yellow-50/30 text-yellow-700 font-bold">{s.sakit}</td>
                      <td className="px-4 py-3 text-center bg-blue-50/30 text-blue-700 font-bold">{s.izin}</td>
                      <td className="px-4 py-3 text-center bg-red-50/30 text-red-700 font-bold">{s.alpa}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
