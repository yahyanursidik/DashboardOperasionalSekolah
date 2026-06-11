import React, { useEffect, useState } from "react";
import { useShow, useUpdate, useGetIdentity } from "@refinedev/core";
import { PageHeader } from "../../../components/layout/PageHeader";
import { ArrowLeft, CheckCircle2, AlertTriangle, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDocumentSignedUrl } from "../../../lib/supabase/storage";
import { AuditHistory } from "../../../components/common/AuditHistory";

export const DocumentShow: React.FC = () => {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<any>();
  const { queryResult } = useShow({
    resource: "documents",
    meta: { select: "*, document_types(name, category), uploaded:profiles!uploaded_by(full_name), verifier:profiles!verified_by(full_name)" }
  });
  
  const { data, isLoading } = queryResult;
  const doc = data?.data;

  const { mutate: updateDoc } = useUpdate();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (doc?.file_path) {
      getDocumentSignedUrl(doc.file_path, 3600) // 1 hour expiry for viewing
        .then(url => setSignedUrl(url))
        .catch(err => setUrlError("Gagal mendapatkan akses file aman: " + err.message));
    }
  }, [doc?.file_path]);

  const handleVerify = (status: "valid" | "perlu_revisi") => {
    if (!doc) return;
    updateDoc({
      resource: "documents",
      id: doc.id,
      values: {
        status,
        verified_by: identity?.id,
        verified_at: new Date().toISOString(),
        note: status === "perlu_revisi" ? note : doc.note
      },
      successNotification: () => ({ message: `Dokumen ditandai ${status}`, type: "success" })
    });
  };

  if (isLoading) return <div className="p-12 animate-pulse text-muted-foreground">Memuat detail dokumen...</div>;
  if (!doc) return <div className="p-12 text-center">Dokumen tidak ditemukan.</div>;

  const isImage = doc.mime_type?.startsWith('image/');
  const isPdf = doc.mime_type === 'application/pdf';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verifikasi Dokumen"
        description="Periksa dan validasi keabsahan dokumen digital."
        action={
          <button onClick={() => navigate("/documents")} className="flex items-center gap-2 bg-white text-muted-foreground border px-4 py-2 rounded-md hover:bg-muted shadow-sm text-sm font-medium">
            <ArrowLeft className="w-4 h-4"/> Kembali
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Viewer Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-4 overflow-hidden flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-4 border-b pb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Secure Viewer
              </h3>
              {signedUrl && (
                <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Buka Penuh
                </a>
              )}
            </div>

            <div className="flex-1 bg-muted/30 rounded-lg border border-dashed flex items-center justify-center overflow-hidden">
              {urlError ? (
                <p className="text-destructive text-sm text-center px-4">{urlError}</p>
              ) : !signedUrl ? (
                <p className="text-muted-foreground animate-pulse text-sm">Menyiapkan Secure Link...</p>
              ) : isImage ? (
                <img src={signedUrl} alt="Document" className="max-w-full max-h-full object-contain" />
              ) : isPdf ? (
                <iframe src={`${signedUrl}#view=FitH`} className="w-full h-full border-0" title="PDF Viewer" />
              ) : (
                <div className="text-center">
                  <p className="text-muted-foreground mb-4 text-sm">Format file ({doc.mime_type}) tidak dapat dipratinjau langsung.</p>
                  <a href={signedUrl} download className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
                    <Download className="w-4 h-4"/> Unduh File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Metadata & Verification Action Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold border-b pb-3 mb-4 text-lg">Informasi Metadata</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Tipe Dokumen</p>
                <p className="font-medium text-sm">{doc.document_types?.name} <span className="text-xs font-normal text-muted-foreground uppercase border px-1 rounded ml-2">{doc.document_types?.category}</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nama File Asli</p>
                <p className="font-medium text-sm truncate" title={doc.file_name}>{doc.file_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ukuran / Tipe</p>
                <p className="font-medium text-sm">{doc.file_size ? `${(doc.file_size/1024).toFixed(1)} KB` : "?"} • {doc.mime_type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diunggah Oleh</p>
                <p className="font-medium text-sm">{doc.uploaded?.full_name} pada {new Date(doc.created_at).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold border-b pb-3 mb-4 text-lg">Keputusan Verifikasi</h3>
            
            <div className="mb-6 flex items-center gap-3">
              <span className="text-sm font-medium">Status Saat Ini:</span>
              <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-md border
                ${doc.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                  doc.status === 'perlu_revisi' ? 'bg-red-50 text-red-700 border-red-200' : 
                  'bg-amber-50 text-amber-700 border-amber-200'}`}
              >
                {doc.status.replace('_', ' ')}
              </span>
            </div>

            {doc.status === 'menunggu_verifikasi' || doc.status === 'perlu_revisi' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Catatan Revisi (Opsional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Contoh: Dokumen buram, harap foto ulang di tempat terang."
                    className="w-full text-sm border rounded-md p-2 h-20 resize-none focus:ring-2 outline-none focus:ring-primary/50 bg-background"
                  ></textarea>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerify('perlu_revisi')}
                    className="flex-1 flex justify-center items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 py-2.5 rounded-md text-sm font-semibold transition-colors border border-red-200"
                  >
                    <AlertTriangle className="w-4 h-4"/> Minta Revisi
                  </button>
                  <button
                    onClick={() => handleVerify('valid')}
                    className="flex-1 flex justify-center items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-md text-sm font-semibold transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4"/> Validasi
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                <p className="text-sm text-emerald-800 flex items-center gap-2 font-medium mb-1"><CheckCircle2 className="w-4 h-4"/> Dokumen Telah Divalidasi</p>
                <p className="text-xs text-emerald-700/80">Oleh: {doc.verifier?.full_name} pada {new Date(doc.verified_at).toLocaleString('id-ID')}</p>
                
                <button 
                  onClick={() => handleVerify('perlu_revisi')}
                  className="mt-4 text-xs text-red-600 hover:underline font-medium"
                >
                  Cabut status Valid (Ubah ke Perlu Revisi)
                </button>
              </div>
            )}
          </div>
          <AuditHistory resource="documents" resourceId={doc.id as string} />
        </div>
      </div>
    </div>
  );
};
