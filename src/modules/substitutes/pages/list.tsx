import React, { useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Plus, Filter, Calendar, Trash2, Edit, UserMinus, UserCheck, BookOpen, Clock } from "lucide-react";

export const SubstitutesList: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: deleteAssignment } = useDelete();
  const [filterStatus, setFilterStatus] = useState("");

  const filters: any[] = [];
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });

  const { data, isLoading } = useList({
    resource: "substitute_assignments",
    // We need to fetch both absent and substitute employee details
    // PostgREST syntax for fetching two foreign keys to the same table:
    // absent_employee_id(full_name), substitute_employee_id(full_name)
    // Refine supports this via select
    meta: { select: "*, absent:absent_employee_id(full_name), substitute:substitute_employee_id(full_name), classes(name)" },
    filters,
    sorters: [
      { field: "date", order: "desc" },
      { field: "start_time", order: "asc" }
    ],
    pagination: { pageSize: 50 }
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guru Inval / Pengganti"
        description="Kelola penugasan guru pengganti untuk kelas yang kosong."
        action={
          <Link
            to="/substitutes/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Tugaskan Inval
          </Link>
        }
      />

      <div className="flex gap-4 items-center bg-card p-3 rounded-xl border shadow-sm flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground ml-2" />
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background outline-none"
        >
          <option value="">Semua Status</option>
          <option value="scheduled">Dijadwalkan</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4">Waktu & Kelas</th>
                <th className="px-6 py-4">Penugasan (Guru Absen ➔ Pengganti)</th>
                <th className="px-6 py-4">Pelajaran & Catatan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.data.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {formatDate(item.date)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {item.start_time?.slice(0,5)} - {item.end_time?.slice(0,5)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs text-red-600 font-medium">
                        <UserMinus className="w-3.5 h-3.5" /> 
                        <span className="line-through opacity-70">{item.absent?.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-green-700 font-bold">
                        <UserCheck className="w-4 h-4" /> 
                        {item.substitute?.full_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-primary" /> 
                        {item.subject} (Kelas {item.classes?.name || '-'})
                      </span>
                      {item.notes && <span className="text-xs text-muted-foreground bg-muted/30 p-1.5 rounded line-clamp-2">{item.notes}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'scheduled' && <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-md">Dijadwalkan</span>}
                    {item.status === 'completed' && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-md">Selesai</span>}
                    {item.status === 'cancelled' && <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">Dibatalkan</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => navigate(`/substitutes/edit/${item.id}`)}
                      className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                      title="Ubah Status/Detail"
                    ><Edit className="w-4 h-4"/></button>
                    <button 
                      onClick={() => { if(confirm('Hapus penugasan inval ini?')) deleteAssignment({ resource: "substitute_assignments", id: item.id as string }) }}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors ml-2"
                      title="Hapus Penugasan"
                    ><Trash2 className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr><td colSpan={5} className="text-center p-12 text-muted-foreground">Belum ada penugasan guru inval.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
