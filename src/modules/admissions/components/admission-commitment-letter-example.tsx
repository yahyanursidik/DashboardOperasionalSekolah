import React, { useState } from "react";
import { Download, FileText, Sparkles } from "lucide-react";
import { CommitmentLetterKind, getCommitmentLetterKind, getCommitmentLetterTemplate, downloadCommitmentLetterTemplate } from "../commitment-letter-templates";

const kindLabels: Record<CommitmentLetterKind, string> = {
  elementary: "Elementary",
  preschool_onsite: "Preschool Onsite",
  preschool_hbl: "Preschool HBL",
};

export const AdmissionCommitmentLetterExample = ({ applicant }: { applicant: any }) => {
  const recommendedKind = getCommitmentLetterKind(applicant);
  const [kind, setKind] = useState<CommitmentLetterKind>(recommendedKind);
  const template = getCommitmentLetterTemplate(kind);

  return <details className="mt-4 rounded-md border border-blue-200 bg-blue-50/70 p-4">
    <summary className="cursor-pointer list-none"><div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-100 text-blue-700"><FileText className="h-4 w-4" /></div><div><p className="font-bold text-blue-950">Contoh surat komitmen siap pakai</p><p className="mt-1 text-sm text-blue-900">Unduh, isi/tandatangani, lalu unggah surat yang telah ditandatangani pada bagian ini.</p></div></div></summary>
    <div className="mt-4 border-t border-blue-200 pt-4"><div className="flex flex-wrap gap-2">{(Object.keys(kindLabels) as CommitmentLetterKind[]).map((item) => <button key={item} type="button" onClick={() => setKind(item)} className={`h-8 rounded-md border px-3 text-xs font-semibold ${kind === item ? "border-blue-700 bg-blue-700 text-white" : "border-blue-200 bg-white text-blue-800 hover:bg-blue-100"}`}>{kindLabels[item]}{item === recommendedKind && <Sparkles className="ml-1 inline h-3 w-3" />}</button>)}</div><div className="mt-4 rounded-md border border-blue-100 bg-white p-4"><p className="font-bold text-slate-950">{template.title}</p><p className="mt-1 text-sm text-slate-600">{template.description}</p><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">{template.commitments.map((commitment) => <li key={commitment}>{commitment}</li>)}</ol><p className="mt-3 text-xs text-slate-500">Template akan diisi otomatis dengan nama orang tua dan calon murid yang tersimpan. Periksa kembali sebelum ditandatangani.</p><button type="button" onClick={() => downloadCommitmentLetterTemplate(kind, applicant)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"><Download className="h-4 w-4" />Unduh contoh Word</button></div></div>
  </details>;
};
