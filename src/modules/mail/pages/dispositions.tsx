import React, { useState } from "react";
import { useTable, useGetIdentity, useUpdate } from "@refinedev/core";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { FileSignature, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export const DispositionsList: React.FC = () => {
  const { data: user } = useGetIdentity<any>();
  const currentUserId = user?.profile?.id;

  const { tableQueryResult } = useTable({
    resource: "mail_dispositions",
    filters: { permanent: [{ field: "to_user_id", operator: "eq", value: currentUserId }] },
    meta: { select: "*, mail_records(*), from:profiles!from_user_id(full_name)" },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    queryOptions: { enabled: !!currentUserId }
  });

  const { mutate: updateDisposition } = useUpdate();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const dispositions = tableQueryResult?.data?.data || [];
  const isLoading = tableQueryResult.isLoading;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleMarkComplete = (id: string) => {
    if (confirm("Tandai tugas disposisi ini sebagai selesai?")) {
      setUpdatingId(id);
      updateDisposition({
        resource: "mail_dispositions",
        id,
        values: { status: "completed" }
      }, {
        onSettled: () => setUpdatingId(null)
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tugas Disposisi Saya"
        description="Daftar surat yang diteruskan kepada Anda beserta instruksi tindak lanjutnya."
        action={
          <Link
            to="/mail"
            className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
          >
            Kembali
          </Link>
        }
      />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Memuat data disposisi...</div>
        ) : (
          <div className="divide-y divide-border">
            {dispositions.map((disp) => {
              const mail = disp.mail_records;
              const isCompleted = disp.status === 'completed';
              
              return (
                <div key={disp.id} className={`p-6 transition-colors ${isCompleted ? 'bg-muted/30' : 'hover:bg-muted/10'}`}>
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Info Surat */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${isCompleted ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-600'}`}>
                          <FileSignature className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">Surat Masuk: {mail?.mail_number || "Tanpa Nomor"}</span>
                            <span className="text-xs text-muted-foreground px-2 py-0.5 border rounded-full">
                              Tgl: {formatDate(mail?.mail_date)}
                            </span>
                          </div>
                          <h3 className="font-bold text-lg leading-tight">{mail?.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium text-foreground">Pengirim:</span> {mail?.sender || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Instruksi Disposisi */}
                    <div className="flex-1 bg-background border rounded-lg p-4 relative">
                      {isCompleted && (
                        <div className="absolute top-4 right-4 text-emerald-600 flex items-center gap-1 text-sm font-bold bg-emerald-50 px-2 py-1 rounded-md">
                          <CheckCircle2 className="w-4 h-4" /> Selesai
                        </div>
                      )}
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                        Instruksi dari: <span className="text-primary">{disp.from?.full_name}</span>
                      </p>
                      <p className={`font-medium ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        "{disp.instruction}"
                      </p>
                      
                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className={disp.due_date && new Date(disp.due_date) < new Date() && !isCompleted ? 'text-red-600 font-bold' : 'text-muted-foreground'}>
                            Tenggat Waktu: {formatDate(disp.due_date)}
                          </span>
                        </div>

                        {!isCompleted && (
                          <button
                            onClick={() => handleMarkComplete(disp.id)}
                            disabled={updatingId === disp.id}
                            className="bg-emerald-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            {updatingId === disp.id ? "Memproses..." : "Tandai Selesai"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {dispositions.length === 0 && (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-primary/5 text-primary rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">Semua Bersih!</h3>
                <p className="text-muted-foreground mt-1">Anda tidak memiliki tugas disposisi yang perlu ditindaklanjuti.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
