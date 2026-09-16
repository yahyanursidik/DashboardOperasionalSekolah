/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, Loader2, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { deleteStoredFile, uploadDocument, getDocumentSignedUrl } from "../../../lib/supabase/storage";
import { supabaseClient } from "../../../lib/supabase/client";
import { admissionDocumentTypes, getRequiredAdmissionDocumentTypes, isRequiredAdmissionDocument } from "../admissions-config";
import { ADMISSION_FILE_ACCEPT, admissionUploadError } from "../admission-upload";
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
    const validationError = admissionUploadError(file, 2 * 1024 * 1024);
    if (validationError) { toast.error(validationError); return; }
    setUploading(type);
    let uploadedPath: string | null = null;
    try {
      const uploaded = await uploadDocument(file, `admissions/${applicant.id}/documents`);
      uploadedPath = uploaded.filePath;
      const existing = documents.find((doc) => doc.document_type === type);
      const payload = { applicant_id: applicant.id, document_type: type, file_url: uploaded.filePath, file_name: uploaded.fileName, status: "submitted", review_note: null, reviewed_at: null, reviewed_by: null };
      const { error } = existing ? await db.from("admission_documents").update(payload).eq("id", existing.id) : await db.from("admission_documents").insert(payload);
      if (error) throw error;
      if (existing?.file_url && existing.file_url !== uploaded.filePath) void deleteStoredFile(existing.file_url).catch(() => undefined);
      toast.success("Berkas berhasil diunggah dan menunggu pemeriksaan.");
      await load();
    } catch (error: any) {
      if (uploadedPath) void deleteStoredFile(uploadedPath).catch(() => undefined);
      toast.error(`Berkas belum dapat diunggah: ${error.message}`);
    }
    finally { setUploading(null); }
  };

  const openFile = async (path: string) => {
    try { window.open(await getDocumentSignedUrl(path, 300), "_blank", "noopener,noreferrer"); }
    catch { toast.error("Berkas belum dapat dibuka."); }
  };

  if (!applicant) return <Empty message="Isi dan simpan formulir calon murid sebelum mengunggah berkas." />;
  const requiredDocuments = getRequiredAdmissionDocumentTypes(applicant);
  const uploadedRequiredCount = requiredDocuments.filter((type) => documents.some((document) => document.document_type === type.value && !["rejected", "revision_required"].includes(document.status))).length;
  const allRequiredUploaded = uploadedRequiredCount === requiredDocuments.length;
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/spmb" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"><ArrowLeft className="w-4 h-4" />Ringkasan pendaftaran</Link>
      <div><p className="text-sm font-semibold text-emerald-700">Tahap 2 dari 4 · {applicant.name}</p><h1 className="text-2xl sm:text-3xl font-bold">Berkas Persyaratan</h1><p className="text-slate-600 mt-2">Unggah seluruh berkas wajib terlebih dahulu. PDF, JPG, atau PNG maksimal 2 MB. Mengganti berkas akan mengulang pemeriksaan panitia.</p></div>
      <section className={`rounded-lg border p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between ${allRequiredUploaded ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div><p className="font-bold">{uploadedRequiredCount} dari {requiredDocuments.length} berkas wajib sudah diunggah</p><p className="text-sm mt-1">Berkas tidak harus menunggu valid untuk lanjut pembayaran, tetapi akan diperiksa panitia sebelum hasil seleksi.</p></div><span className="text-sm font-semibold whitespace-nowrap">{allRequiredUploaded ? "Siap lanjut" : "Masih perlu unggahan"}</span></section>
      <div className="space-y-3">{admissionDocumentTypes.map((type) => { const required = isRequiredAdmissionDocument(type.value, applicant); const doc = documents.find((item) => item.document_type === type.value); const isValid = doc?.status === "valid"; const needsRevision = ["revision_required", "rejected"].includes(doc?.status); const tone = isValid ? "border-emerald-200 bg-emerald-50/50" : needsRevision ? "border-rose-200 bg-rose-50/50" : "bg-white"; return <div key={type.value} className={`border rounded-lg p-4 sm:p-5 ${tone}`}><div className="flex flex-col sm:flex-row sm:items-center gap-4"><div className={`w-10 h-10 rounded-md grid place-items-center shrink-0 ${isValid ? "bg-emerald-100 text-emerald-700" : needsRevision ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{isValid ? <CheckCircle2 className="w-5 h-5" /> : needsRevision ? <AlertCircle className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}</div><div className="min-w-0 flex-1"><p className="font-bold">{type.label} {required && <span className="text-rose-600">*</span>}</p><p className="text-sm text-slate-600 truncate mt-1">{doc ? `${doc.file_name} · ${isValid ? "Valid" : needsRevision ? "Perlu diperbaiki" : "Menunggu pemeriksaan"}` : "Belum diunggah"}</p>{doc?.review_note && <p className="text-sm text-rose-700 mt-2">Catatan panitia: {doc.review_note}</p>}</div><div className="flex gap-2">{doc && <button onClick={() => openFile(doc.file_url)} title="Lihat berkas" className="w-10 h-10 grid place-items-center border rounded-md hover:bg-white"><ExternalLink className="w-4 h-4" /></button>}<label className="h-10 px-4 border rounded-md bg-white hover:bg-slate-50 font-semibold text-sm flex items-center gap-2 cursor-pointer">{uploading === type.value ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}{doc ? "Ganti" : "Unggah"}<input type="file" className="sr-only" accept={ADMISSION_FILE_ACCEPT} disabled={Boolean(uploading)} onChange={(event) => { void upload(type.value, event.target.files?.[0]); event.target.value = ""; }} /></label></div></div></div>; })}</div>
      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-lg border bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-600">{allRequiredUploaded ? "Berkas wajib telah diunggah. Lanjutkan ke pembayaran." : "Lengkapi seluruh berkas bertanda * untuk membuka tahap pembayaran."}</p>{allRequiredUploaded ? <Link to="/spmb/payment" className="h-11 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white inline-flex items-center justify-center">Lanjut ke Pembayaran</Link> : <span className="h-11 rounded-md border px-5 text-sm font-semibold text-slate-400 inline-flex items-center justify-center">Pembayaran terkunci</span>}</div>
    </div>
  );
};

const Empty = ({ message }: { message: string }) => <div className="max-w-xl mx-auto bg-white border rounded-lg p-8 text-center"><AlertCircle className="w-8 h-8 text-amber-600 mx-auto" /><h1 className="font-bold text-xl mt-4">Formulir belum tersedia</h1><p className="text-slate-600 mt-2">{message}</p><Link to="/spmb/form" className="inline-flex mt-5 h-10 items-center px-4 bg-emerald-700 text-white rounded-md font-semibold">Isi Formulir</Link></div>;
