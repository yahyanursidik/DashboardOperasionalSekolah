import React from "react";
import { useShow, useUpdate, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, CheckCircle2, Clock, XCircle, Send, Users, Building, ShieldCheck, Eye } from "lucide-react";
import { AuditHistory } from "../../../components/common/AuditHistory";

const targetConfig: Record<string, string> = {
  all: "Semua Entitas Sekolah",
  unit: "Unit Pendidikan Spesifik",
  class: "Kelas / Rombel Spesifik",
  staff: "Semua Guru & Pegawai",
  parents: "Semua Orang Tua",
};

export const AnnouncementShow: React.FC = () => {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<any>();
  const { queryResult } = useShow({
    resource: "announcements",
    meta: { select: "*, author:profiles!created_by(full_name), approver:profiles!approved_by(full_name), units(name), classes(name)" }
  });

  const { mutate: updateStatus } = useUpdate();
  const { data, isLoading } = queryResult;
  const item = data?.data;

  const handleApprove = () => {
    if (!item) return;
    const isScheduled = !!item.publish_at && new Date(item.publish_at) > new Date();
    
    updateStatus({
      resource: "announcements",
      id: item.id,
      values: {
        status: isScheduled ? "terjadwal" : "terkirim",
        approved_by: identity?.id,
        approved_at: new Date().toISOString()
      },
      successNotification: () => ({ message: "Pengumuman berhasil disetujui", type: "success" })
    });
  };

  const handleCancel = () => {
    if (!item) return;
    updateStatus({
      resource: "announcements",
      id: item.id,
      values: { status: "dibatalkan" },
      successNotification: () => ({ message: "Pengumuman dibatalkan", type: "success" })
    });
  };

  if (isLoading) return <div className="p-12 animate-pulse text-muted-foreground">Memuat detail pengumuman...</div>;
  if (!item) return <div className="p-12 text-center">Pengumuman tidak ditemukan.</div>;

  const isPending = item.status === "menunggu_approval";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detail Pengumuman"
        description="Pratinjau konten pengumuman dan status persetujuan."
        action={
          <button onClick={() => navigate("/announcements")} className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted shadow-sm text-sm font-medium">
            <ArrowLeft className="w-4 h-4"/> Kembali
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Preview Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="bg-slate-50 border-b px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Eye className="w-5 h-5 text-slate-500" /> Pratinjau Pesan</h3>
              <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-md border
                ${item.status === 'terkirim' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 
                  item.status === 'dibatalkan' ? 'bg-red-100 text-red-800 border-red-200' : 
                  item.status === 'menunggu_approval' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  'bg-slate-100 text-slate-800 border-slate-200'}`}
              >
                {item.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="p-8 flex-1 bg-white">
              <h1 className="text-2xl font-bold mb-6 text-foreground">{item.title}</h1>
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap font-sans">
                {item.content}
              </div>
            </div>
          </div>
        </div>

        {/* Metadata & Approval Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold border-b pb-3 mb-4 text-lg">Informasi Target</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Kategori Penerima</p>
                  <p className="font-medium text-sm">{targetConfig[item.target_type]}</p>
                </div>
              </div>
              
              {(item.units || item.classes) && (
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Detail Lokasi</p>
                    {item.units && <p className="font-medium text-sm">Unit: {item.units.name}</p>}
                    {item.classes && <p className="font-medium text-sm">Kelas: {item.classes.name}</p>}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Jadwal Pengiriman</p>
                  <p className="font-medium text-sm">
                    {item.publish_at ? new Date(item.publish_at).toLocaleString('id-ID') : "Segera (Setelah disetujui)"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold border-b pb-3 mb-4 text-lg">Workflow & Approval</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground">Draft Dibuat Oleh</p>
                <p className="font-medium text-sm">{item.author?.full_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('id-ID')}</p>
              </div>

              {item.approved_by && (
                <div className="bg-emerald-50 p-3 rounded border border-emerald-100">
                  <p className="text-xs text-emerald-800 font-semibold mb-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5"/> Disetujui Oleh</p>
                  <p className="font-medium text-sm text-emerald-900">{item.approver?.full_name}</p>
                  <p className="text-[10px] text-emerald-700">{new Date(item.approved_at).toLocaleString('id-ID')}</p>
                </div>
              )}
            </div>

            {isPending ? (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-amber-600 bg-amber-50 p-2 rounded text-center border border-amber-100">
                  Membutuhkan Persetujuan (Approval)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { if(confirm('Tolak dan batalkan pengumuman ini?')) handleCancel() }}
                    className="flex-1 flex justify-center items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 py-2.5 rounded-md text-sm font-semibold transition-colors border border-red-200"
                  >
                    <XCircle className="w-4 h-4"/> Tolak
                  </button>
                  <button
                    onClick={() => { if(confirm('Setujui dan teruskan untuk dipublikasi?')) handleApprove() }}
                    className="flex-1 flex justify-center items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-md text-sm font-semibold transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4"/> Setujui
                  </button>
                </div>
              </div>
            ) : item.status === 'draft' ? (
              <div className="border-t pt-4">
                 <button
                    onClick={() => navigate(`/announcements/edit/${item.id}`)}
                    className="w-full flex justify-center items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-md text-sm font-semibold transition-colors shadow-sm"
                  >
                    <Send className="w-4 h-4"/> Ajukan Approval Sekarang
                  </button>
              </div>
            ) : null}
          </div>
          <AuditHistory resource="announcements" resourceId={item.id as string} />
        </div>
      </div>
    </div>
  );
};
