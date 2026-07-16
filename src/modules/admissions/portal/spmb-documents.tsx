/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, Loader2, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { uploadDocument, getDocumentSignedUrl } from "../../../lib/supabase/storage";
import { supabaseClient } from "../../../lib/supabase/client";
import { admissionDocumentTypes } from "../admissions-config";
import { useSpmbPortal } from "./spmb-context";

const db = supabaseClient as any;

export const SpmbDocuments: React.FC = () => {
  const { applicant } = useSpmbPortal();
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const load = async () => {
    if (!applicant?.id) return;
    const { data } = await db.from("admission_documents").select("*").eq("applicant_id", applicant.id).order("created_at");
    setDocuments(data || []);
  };
  useEffect(() => { void load(); }, [applicant?.id]);

  const upload = async (type: string, file?: File) => {
    if (!applicant || !file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Ukuran berkas maksimal 2 MB."); return; }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) { toast.error("Gunakan berkas PDF, JPG, atau PNG."); return; }
    setUploading(type);
    try {
      const uploaded = await uploadDocument(file, `admissions/${applicant.id}/documents`);
      const existing = documents.find((doc) => doc.document_type === type);
      const payload = { applicant_id: applicant.id, document_type: type, file_url: uploaded.filePath, file_name: uploaded.fileName, status: "submitted", review_note: null, reviewed_at: null, reviewed_by: null };
      const { error } = existing ? await db.from("admission_documents").update(payload).eq("id", existing.id) : await db.from("admission_documents").insert(payload);
      if (error) throw error;
      toast.success("Berkas berhasil diunggah dan menunggu pemeriksaan.");
      await load();
    } catch (error: any) { toast.error(`Berkas belum dapat diunggah: ${error.message}`); }
    finally { setUploading(null); }
  };

  const openFile = async (path: string) => {
    try { window.open(await getDocumentSignedUrl(path, 300), "_blank", "noopener,noreferrer"); }
    catch { toast.error("Berkas belum dapat dibuka."); }
  };

  if (!applicant) return <Empty message="Isi dan simpan formulir calon murid sebelum mengunggah berkas." />;
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/spmb" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"><ArrowLeft className="w-4 h-4" />Ringkasan pendaftaran</Link>
      <div><h1 className="text-2xl sm:text-3xl font-bold">Berkas Persyaratan</h1><p className="text-slate-600 mt-2">PDF, JPG, atau PNG maksimal 2 MB. Mengganti berkas akan mengulang pemeriksaan panitia.</p></div>
      <div className="space-y-3">{admissionDocumentTypes.map((type) => { const doc = documents.find((item) => item.document_type === type.value); const isValid = doc?.status === "valid"; const needsRevision = ["revision_required", "rejected"].includes(doc?.status); const tone = isValid ? "border-emerald-200 bg-emerald-50/50" : needsRevision ? "border-rose-200 bg-rose-50/50" : "bg-white"; return <div key={type.value} className={`border rounded-lg p-4 sm:p-5 ${tone}`}><div className="flex flex-col sm:flex-row sm:items-center gap-4"><div className={`w-10 h-10 rounded-md grid place-items-center shrink-0 ${isValid ? "bg-emerald-100 text-emerald-700" : needsRevision ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{isValid ? <CheckCircle2 className="w-5 h-5" /> : needsRevision ? <AlertCircle className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}</div><div className="min-w-0 flex-1"><p className="font-bold">{type.label} {type.required && <span className="text-rose-600">*</span>}</p><p className="text-sm text-slate-600 truncate mt-1">{doc ? `${doc.file_name} · ${isValid ? "Valid" : needsRevision ? "Perlu diperbaiki" : "Menunggu pemeriksaan"}` : "Belum diunggah"}</p>{doc?.review_note && <p className="text-sm text-rose-700 mt-2">Catatan panitia: {doc.review_note}</p>}</div><div className="flex gap-2">{doc && <button onClick={() => openFile(doc.file_url)} title="Lihat berkas" className="w-10 h-10 grid place-items-center border rounded-md hover:bg-white"><ExternalLink className="w-4 h-4" /></button>}<label className="h-10 px-4 border rounded-md bg-white hover:bg-slate-50 font-semibold text-sm flex items-center gap-2 cursor-pointer">{uploading === type.value ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}{doc ? "Ganti" : "Unggah"}<input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png" disabled={Boolean(uploading)} onChange={(event) => { void upload(type.value, event.target.files?.[0]); event.target.value = ""; }} /></label></div></div></div>; })}</div>
    </div>
  );
};

const Empty = ({ message }: { message: string }) => <div className="max-w-xl mx-auto bg-white border rounded-lg p-8 text-center"><AlertCircle className="w-8 h-8 text-amber-600 mx-auto" /><h1 className="font-bold text-xl mt-4">Formulir belum tersedia</h1><p className="text-slate-600 mt-2">{message}</p><Link to="/spmb/form" className="inline-flex mt-5 h-10 items-center px-4 bg-emerald-700 text-white rounded-md font-semibold">Isi Formulir</Link></div>;
