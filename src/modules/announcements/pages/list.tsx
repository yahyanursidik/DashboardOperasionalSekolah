import React, { useState } from "react";
import { useList, useDelete } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Megaphone, Plus, Trash2, Edit, CheckCircle2, Clock, Eye, XCircle, AlertCircle } from "lucide-react";

const statusConfig: Record<string, { label: string, color: string, icon: any }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-800", icon: Edit },
  menunggu_approval: { label: "Menunggu Approval", color: "bg-amber-100 text-amber-800 border border-amber-200", icon: Clock },
  terjadwal: { label: "Terjadwal", color: "bg-blue-100 text-blue-800 border border-blue-200", icon: Clock },
  terkirim: { label: "Terkirim", color: "bg-emerald-100 text-emerald-800 border border-emerald-200", icon: CheckCircle2 },
  dibatalkan: { label: "Dibatalkan", color: "bg-red-100 text-red-800 border border-red-200", icon: XCircle },
};

const targetConfig: Record<string, string> = {
  all: "Semua",
  unit: "Unit Spesifik",
  class: "Kelas Spesifik",
  staff: "Guru & Staf",
  parents: "Orang Tua",
};

export const AnnouncementsList: React.FC = () => {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTarget, setFilterTarget] = useState("");

  const filters: any[] = [];
  if (filterStatus) filters.push({ field: "status", operator: "eq", value: filterStatus });
  if (filterTarget) filters.push({ field: "target_type", operator: "eq", value: filterTarget });

  const { data, isLoading } = useList({
    resource: "announcements",
    meta: { select: "*, author:profiles!created_by(full_name), units(name), classes(name)" },
    filters,
    sorters: [{ field: "created_at", order: "desc" }]
  });

  const { mutate: deleteData } = useDelete();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengumuman (Broadcast)"
        description="Kelola dan kirim pesan massal ke siswa, orang tua, atau staf."
        action={
          <Link
            to="/announcements/create"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Pengumuman
          </Link>
        }
      />

      <div className="flex gap-4 items-center bg-card p-3 rounded-xl border shadow-sm flex-wrap">
        <Megaphone className="w-4 h-4 text-muted-foreground ml-2" />
        <select 
          value={filterTarget}
          onChange={(e) => setFilterTarget(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="">Semua Target Audiens</option>
          {Object.entries(targetConfig).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="">Semua Status</option>
          {Object.entries(statusConfig).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
              <tr>
                <th className="px-6 py-4">Judul Pengumuman</th>
                <th className="px-6 py-4">Target Audiens</th>
                <th className="px-6 py-4">Status & Jadwal</th>
                <th className="px-6 py-4">Dibuat Oleh</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.data.map((item) => {
                const status = statusConfig[item.status] || statusConfig['draft'];
                const Icon = status.icon;
                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/announcements/show/${item.id}`)}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground truncate max-w-[250px]" title={item.title}>{item.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[250px]">{item.content}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-xs border bg-slate-50 px-2 py-1 rounded">
                        {targetConfig[item.target_type] || item.target_type}
                      </span>
                      {(item.units?.name || item.classes?.name) && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {item.units?.name} {item.classes ? `/ ${item.classes.name}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center w-max gap-1.5 px-2 py-1 text-[11px] font-bold rounded-md ${status.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                      {item.publish_at && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                          Rencana: {new Date(item.publish_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {item.author?.full_name?.split(' ')[0]}
                      <br/>
                      {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/announcements/show/${item.id}`)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors"><Eye className="w-4 h-4"/></button>
                      <button onClick={() => navigate(`/announcements/edit/${item.id}`)} className="p-1.5 text-muted-foreground hover:text-amber-600 transition-colors ml-1"><Edit className="w-4 h-4"/></button>
                      <button 
                        onClick={() => { if(confirm('Hapus pengumuman ini?')) deleteData({ resource: "announcements", id: item.id as string }) }}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors ml-1"
                      ><Trash2 className="w-4 h-4"/></button>
                    </td>
                  </tr>
                );
              })}
              {data?.data.length === 0 && (
                <tr><td colSpan={5} className="text-center p-12 text-muted-foreground flex flex-col items-center gap-2">
                  <AlertCircle className="w-6 h-6 opacity-50"/> Belum ada pengumuman.
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
