import React, { useState } from "react";
import { useTable, useUpdate, useCreate, useSelect } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Users, CheckCircle, XCircle, Clock, Save, FileText } from "lucide-react";

export const EmployeeAttendanceList: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [filterUnit, setFilterUnit] = useState("");
  const [filterPosition, setFilterPosition] = useState("");

  const { options: unitOptions } = useSelect({ resource: "units", optionLabel: "name", optionValue: "id" });

  const { tableQueryResult } = useTable({
    resource: "employees",
    pagination: { mode: "off" },
    filters: {
      permanent: [
        { field: "status", operator: "eq", value: "active" },
        ...(filterUnit ? [{ field: "unit_id", operator: "eq", value: filterUnit }] : []),
        ...(filterPosition ? [{ field: "position", operator: "eq", value: filterPosition }] : []),
      ] as any[]
    },
    meta: {
      select: "*, employee_attendance(id, status, time_in, time_out, notes, date)"
    }
  });

  const { mutate: updateAttendance } = useUpdate();
  const { mutate: createAttendance } = useCreate();

  const handleStatusChange = (employee: any, newStatus: string) => {
    const existingRecord = employee.employee_attendance?.find((a: any) => a.date === selectedDate);
    
    if (existingRecord) {
      updateAttendance({
        resource: "employee_attendance",
        id: existingRecord.id,
        values: { status: newStatus },
        invalidates: ["list"]
      });
    } else {
      createAttendance({
        resource: "employee_attendance",
        values: {
          employee_id: employee.id,
          date: selectedDate,
          status: newStatus,
        },
        invalidates: ["list"]
      });
    }
  };

  const handleTimeChange = (employee: any, field: 'time_in'|'time_out', time: string) => {
    const existingRecord = employee.employee_attendance?.find((a: any) => a.date === selectedDate);
    
    if (existingRecord) {
      updateAttendance({
        resource: "employee_attendance",
        id: existingRecord.id,
        values: { [field]: time },
        invalidates: ["list"]
      });
    } else {
      createAttendance({
        resource: "employee_attendance",
        values: {
          employee_id: employee.id,
          date: selectedDate,
          status: 'present', // assume present if typing time
          [field]: time,
        },
        invalidates: ["list"]
      });
    }
  };

  const employees = tableQueryResult?.data?.data || [];
  const isLoading = tableQueryResult.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Input Absensi Pegawai"
        description="Kelola kehadiran Kepala Sekolah, Wakasek, Guru, Satpam, dan staf lainnya."
        action={
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {new Intl.DateTimeFormat('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(selectedDate))}
          </div>
        }
      />

      <div className="bg-card rounded-xl border shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Tanggal Absensi</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background font-medium outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Filter Jabatan</label>
          <select 
            value={filterPosition} 
            onChange={(e) => setFilterPosition(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background min-w-[150px] outline-none"
          >
            <option value="">Semua Jabatan</option>
            <option value="kepala_sekolah">Kepala Sekolah</option>
            <option value="wakasek">Wakasek</option>
            <option value="guru">Guru</option>
            <option value="tu">Tata Usaha</option>
            <option value="satpam">Satpam</option>
            <option value="cleaning_service">Cleaning Service</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Filter Unit</label>
          <select 
            value={filterUnit} 
            onChange={(e) => setFilterUnit(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background min-w-[150px] outline-none"
          >
            <option value="">Semua Unit</option>
            {unitOptions?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-64 text-muted-foreground">Memuat data pegawai...</div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Tidak ada data pegawai yang sesuai filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Nama Pegawai</th>
                  <th className="px-4 py-3">Jabatan</th>
                  <th className="px-4 py-3 text-center">Status Kehadiran</th>
                  <th className="px-4 py-3 text-center">Jam Masuk</th>
                  <th className="px-4 py-3 text-center">Jam Keluar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((emp) => {
                  const record = emp.employee_attendance?.find((a: any) => a.date === selectedDate);
                  const status = record?.status || '';

                  return (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{emp.full_name}</div>
                        <div className="text-[10px] text-muted-foreground font-bold mt-0.5">{emp.nik || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold uppercase">
                          {emp.position.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleStatusChange(emp, 'present')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${status === 'present' ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-600'}`}
                          >
                            Hadir
                          </button>
                          <button
                            onClick={() => handleStatusChange(emp, 'sick')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${status === 'sick' ? 'bg-yellow-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-yellow-100 hover:text-yellow-600'}`}
                          >
                            Sakit
                          </button>
                          <button
                            onClick={() => handleStatusChange(emp, 'leave')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${status === 'leave' ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600'}`}
                          >
                            Izin
                          </button>
                          <button
                            onClick={() => handleStatusChange(emp, 'absent')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${status === 'absent' ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600'}`}
                          >
                            Alpa
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <input 
                            type="time" 
                            value={record?.time_in || ''}
                            onChange={(e) => handleTimeChange(emp, 'time_in', e.target.value)}
                            disabled={!status}
                            className="border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <input 
                            type="time" 
                            value={record?.time_out || ''}
                            onChange={(e) => handleTimeChange(emp, 'time_out', e.target.value)}
                            disabled={!status}
                            className="border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                          />
                        </div>
                      </td>
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
