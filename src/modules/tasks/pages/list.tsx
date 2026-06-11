import React, { useState } from "react";
import { useList, useUpdate } from "@refinedev/core";
import { useNavigate, Link } from "react-router-dom";
import { Plus, CheckSquare, Clock, AlertCircle, LayoutGrid, List as ListIcon, Calendar, Filter } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";

const statusConfig: Record<string, { label: string, color: string, icon: any }> = {
  belum_mulai: { label: "Belum Mulai", color: "bg-slate-100 border-slate-200 text-slate-800", icon: Clock },
  diproses: { label: "Diproses", color: "bg-blue-50 border-blue-200 text-blue-800", icon: Clock },
  menunggu_pihak_lain: { label: "Menunggu", color: "bg-amber-50 border-amber-200 text-amber-800", icon: AlertCircle },
  selesai: { label: "Selesai", color: "bg-emerald-50 border-emerald-200 text-emerald-800", icon: CheckSquare },
  ditunda: { label: "Ditunda", color: "bg-gray-100 border-gray-200 text-gray-800", icon: Clock },
};

const priorityConfig: Record<string, { label: string, color: string }> = {
  low: { label: "Rendah", color: "bg-slate-100 text-slate-700" },
  medium: { label: "Menengah", color: "bg-blue-100 text-blue-700" },
  high: { label: "Tinggi", color: "bg-amber-100 text-amber-700" },
  urgent: { label: "Mendesak", color: "bg-red-100 text-red-700 font-bold" },
};

export const TasksList: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  
  // Basic filtering state
  const [filterPriority, setFilterPriority] = useState("");
  
  const filters: any[] = [];
  if (filterPriority) filters.push({ field: "priority", operator: "eq", value: filterPriority });

  const { data, isLoading, refetch } = useList({
    resource: "admin_tasks",
    meta: { select: "*, units(name), assigned:profiles!assigned_to(full_name)" },
    filters
  });

  const { mutate: updateTask } = useUpdate();

  const handleStatusChange = (id: string, newStatus: string) => {
    updateTask({
      resource: "admin_tasks",
      id,
      values: { 
        status: newStatus,
        completed_at: newStatus === "selesai" ? new Date().toISOString() : null
      },
      successNotification: () => ({ message: "Status tugas diperbarui", type: "success" })
    }, { onSuccess: () => refetch() });
  };

  const tasks = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Board (Penugasan)"
        description="Kelola dan pantau seluruh tugas operasional sekolah."
        action={
          <div className="flex items-center gap-3">
            <div className="flex bg-muted rounded-md p-1 border">
              <button 
                onClick={() => setViewMode("kanban")}
                className={`p-1.5 rounded ${viewMode === "kanban" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Board View"
              ><LayoutGrid className="w-4 h-4" /></button>
              <button 
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="List View"
              ><ListIcon className="w-4 h-4" /></button>
            </div>
            <Link
              to="/tasks/create"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Buat Tugas
            </Link>
          </div>
        }
      />

      <div className="flex gap-4 items-center bg-card p-3 rounded-xl border shadow-sm">
        <Filter className="w-4 h-4 text-muted-foreground ml-2" />
        <span className="text-sm font-medium text-muted-foreground">Filter:</span>
        <select 
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="">Semua Prioritas</option>
          <option value="urgent">Mendesak</option>
          <option value="high">Tinggi</option>
          <option value="medium">Menengah</option>
          <option value="low">Rendah</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground animate-pulse">Memuat Task Board...</div>
      ) : viewMode === "kanban" ? (
        /* KANBAN VIEW */
        <div className="flex gap-6 overflow-x-auto pb-4 min-h-[600px] snap-x">
          {Object.keys(statusConfig).map((status) => {
            const conf = statusConfig[status];
            const columnTasks = tasks.filter(t => t.status === status);
            return (
              <div key={status} className="flex-none w-80 bg-muted/50 rounded-xl border flex flex-col snap-start">
                <div className={`p-3 border-b rounded-t-xl font-semibold text-sm flex items-center justify-between ${conf.color}`}>
                  <div className="flex items-center gap-2">
                    <conf.icon className="w-4 h-4" />
                    {conf.label}
                  </div>
                  <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">{columnTasks.length}</span>
                </div>
                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                  {columnTasks.map(task => (
                    <div key={task.id} className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group flex flex-col cursor-pointer" onClick={() => navigate(`/tasks/show/${task.id}`)}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${priorityConfig[task.priority].color}`}>
                          {priorityConfig[task.priority].label}
                        </span>
                        {task.due_date && (
                          <div className={`flex items-center gap-1 text-[10px] font-medium ${new Date(task.due_date) < new Date() && status !== 'selesai' ? 'text-destructive' : 'text-muted-foreground'}`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-sm leading-tight mb-2 group-hover:text-primary transition-colors">{task.title}</h4>
                      {task.units?.name && <p className="text-[10px] text-muted-foreground mb-3">{task.units.name}</p>}
                      
                      <div className="mt-auto pt-3 border-t flex items-center justify-between">
                        <div className="flex items-center gap-1.5" title={task.assigned?.full_name || "Tidak ditugaskan"}>
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                            {task.assigned?.full_name ? task.assigned.full_name.substring(0,2).toUpperCase() : "?"}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate w-16">{task.assigned?.full_name?.split(' ')[0] || "Unassigned"}</span>
                        </div>
                        
                        {/* Quick Action to Move */}
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {status === 'belum_mulai' && <button onClick={() => handleStatusChange(String(task.id), 'diproses')} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">Proses</button>}
                          {status === 'diproses' && <button onClick={() => handleStatusChange(String(task.id), 'selesai')} className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100">Selesai</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="text-center p-4 text-xs text-muted-foreground border border-dashed rounded-lg">
                      Tidak ada tugas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4">Tugas</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Prioritas</th>
                <th className="px-6 py-4">Ditugaskan Ke</th>
                <th className="px-6 py-4">Tenggat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">Tidak ada tugas ditemukan.</td></tr>
              ) : tasks.map(task => (
                <tr key={task.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/tasks/show/${task.id}`)}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{task.title}</p>
                    {task.units?.name && <p className="text-xs text-muted-foreground mt-0.5">{task.units.name}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] font-semibold rounded-full border ${statusConfig[task.status].color}`}>
                      {statusConfig[task.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md ${priorityConfig[task.priority].color}`}>
                      {priorityConfig[task.priority].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{task.assigned?.full_name || "-"}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
