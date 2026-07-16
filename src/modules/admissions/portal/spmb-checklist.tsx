/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabaseClient } from "../../../lib/supabase/client";
import { useSpmbPortal } from "./spmb-context";

const db = supabaseClient as any;
const questions = ["Anak mampu berpisah sementara dari orang tua dengan tenang.", "Anak mampu menyampaikan kebutuhan dasar secara lisan atau isyarat.", "Anak terbiasa mengikuti instruksi sederhana.", "Anak dapat makan dan menggunakan toilet dengan bantuan minimal.", "Keluarga bersedia bekerja sama dengan sekolah dalam pembiasaan adab dan ibadah."];

export const SpmbChecklist: React.FC = () => {
  const { applicant } = useSpmbPortal();
  const [responses,setResponses] = useState<Record<string,string>>({});
  const [saving,setSaving] = useState(false);
  useEffect(() => { if (!applicant?.id) return; db.from("admission_checklist_responses").select("responses").eq("applicant_id",applicant.id).eq("checklist_type","readiness").maybeSingle().then(({data}:any) => setResponses(data?.responses || {})); }, [applicant?.id]);
  const save = async () => { if (!applicant) return; setSaving(true); const {error} = await db.from("admission_checklist_responses").upsert({applicant_id:applicant.id,checklist_type:"readiness",responses,submitted_at:new Date().toISOString()},{onConflict:"applicant_id,checklist_type"}); setSaving(false); if(error) toast.error(error.message); else toast.success("Kuesioner kesiapan tersimpan."); };
  if (!applicant) return <div className="text-center py-16">Simpan formulir calon murid terlebih dahulu.</div>;
  return <div className="max-w-3xl mx-auto space-y-6"><Link to="/spmb" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="w-4 h-4" />Ringkasan pendaftaran</Link><div><h1 className="text-2xl font-bold">Kuesioner Kesiapan</h1><p className="text-slate-600 mt-2">Jawaban membantu sekolah menyiapkan dukungan, bukan untuk memberi label pada anak.</p></div><section className="bg-white border rounded-lg divide-y">{questions.map((question,index) => <div key={question} className="p-5"><p className="font-semibold"><span className="text-slate-400 mr-2">{index+1}.</span>{question}</p><div className="flex flex-wrap gap-2 mt-4">{["Sudah terbiasa","Sedang berkembang","Perlu dukungan"].map((answer) => <button key={answer} onClick={() => setResponses((value) => ({...value,[String(index)]:answer}))} className={`h-9 px-3 rounded-md border text-sm font-medium ${responses[String(index)] === answer ? "bg-emerald-700 border-emerald-700 text-white" : "bg-white"}`}>{answer}</button>)}</div></div>)}</section><button onClick={save} disabled={saving} className="h-11 px-5 bg-emerald-700 text-white rounded-md font-semibold flex items-center gap-2 ml-auto">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : Object.keys(responses).length === questions.length ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}Simpan Jawaban</button></div>;
};
