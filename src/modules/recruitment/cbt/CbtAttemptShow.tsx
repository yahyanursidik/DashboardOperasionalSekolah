import React from "react";
import { useOne, useList } from "@refinedev/core";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Clock, User, Target } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";

export const CbtAttemptShow: React.FC = () => {
  const { participantId } = useParams();
  const navigate = useNavigate();

  const { data: participantData, isLoading: isLoadingParticipant } = useOne({
    resource: "cbt_participants",
    id: participantId as string,
    meta: { select: "*, recruitment_applicants(full_name, email), cbt_exams(title, passing_grade, duration_minutes, cbt_exam_banks(question_count))" }
  });

  const { data: answersData, isLoading: isLoadingAnswers } = useList({
    resource: "cbt_answers",
    filters: [{ field: "participant_id", operator: "eq", value: participantId }],
    meta: { select: "*, cbt_questions(question_text, correct_option_id, weight, options)" },
    pagination: { mode: "off" }
  });

  const participant = participantData?.data;
  const answers = answersData?.data || [];

  const correctAnswers = answers.filter((ans: any) => ans.selected_option_id === ans.cbt_questions?.correct_option_id);
  const wrongAnswers = answers.filter((ans: any) => ans.selected_option_id && ans.selected_option_id !== ans.cbt_questions?.correct_option_id);
  
  if (isLoadingParticipant) {
    return <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/recruitment/cbt/results")} className="p-2 hover:bg-muted rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader 
          title="Detail Hasil Ujian" 
          description={`Melihat rincian jawaban dari ${participant?.recruitment_applicants?.full_name}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">Informasi Peserta</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-lg">{participant?.recruitment_applicants?.full_name}</p>
                <p className="text-sm text-muted-foreground">{participant?.recruitment_applicants?.email}</p>
              </div>
            </div>
            
            <div className="pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ujian:</span>
                <span className="font-medium text-right">{participant?.cbt_exams?.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium capitalize">{participant?.status === 'completed' ? 'Selesai' : participant?.status}</span>
              </div>
              {participant?.status === 'completed' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Waktu Selesai:</span>
                    <span className="font-medium">{new Date(participant.finished_at).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="pt-4 mt-4 border-t border-dashed flex flex-col items-center">
                    <span className="text-sm text-muted-foreground mb-1">Nilai Akhir</span>
                    <span className="text-5xl font-black text-slate-800">{participant.score}</span>
                    <div className="mt-3">
                      {participant.is_passed ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-4 h-4" /> LULUS (Passing Grade: {participant?.cbt_exams?.passing_grade})</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700"><XCircle className="w-4 h-4" /> TIDAK LULUS (Passing Grade: {participant?.cbt_exams?.passing_grade})</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">Statistik Jawaban</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold">{correctAnswers.length}</p>
                <p className="text-xs uppercase font-semibold">Benar</p>
              </div>
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold">{wrongAnswers.length}</p>
                <p className="text-xs uppercase font-semibold">Salah</p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h3 className="font-bold text-xl text-slate-800 mb-4">Rincian Jawaban Soal</h3>
          {isLoadingAnswers ? (
            <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : answers.length === 0 ? (
            <div className="text-center p-12 bg-card border rounded-xl border-dashed">
              <p className="text-muted-foreground">Belum ada data jawaban tersimpan.</p>
            </div>
          ) : (
            answers.map((ans: any, idx: number) => {
              const q = ans.cbt_questions;
              if (!q) return null;
              
              const isCorrect = ans.selected_option_id === q.correct_option_id;

              return (
                <div key={ans.id} className={`bg-white border-2 rounded-xl p-5 shadow-sm ${isCorrect ? 'border-emerald-100' : 'border-red-100'}`}>
                  <div className="flex gap-3 mb-4">
                    <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {idx + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-800">{q.question_text}</p>
                      <div className="flex items-center gap-4 text-xs font-semibold mt-2">
                        <span className={isCorrect ? 'text-emerald-600' : 'text-red-600'}>
                          {isCorrect ? <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Menjawab Benar</span> : <span className="flex items-center gap-1"><XCircle className="w-4 h-4"/> Menjawab Salah</span>}
                        </span>
                        <span className="text-slate-500">Bobot: {q.weight}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pl-11 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {q.options?.map((opt: any) => {
                      const isSelected = ans.selected_option_id === opt.id;
                      const isActualCorrect = q.correct_option_id === opt.id;
                      
                      let boxClass = "border-slate-100 bg-slate-50 text-slate-500";
                      
                      if (isSelected && isActualCorrect) {
                        boxClass = "border-emerald-500 bg-emerald-50 text-emerald-900 font-medium";
                      } else if (isSelected && !isActualCorrect) {
                        boxClass = "border-red-500 bg-red-50 text-red-900 font-medium";
                      } else if (!isSelected && isActualCorrect) {
                        boxClass = "border-emerald-500 bg-white text-emerald-700 border-dashed font-medium";
                      }

                      return (
                        <div key={opt.id} className={`p-2.5 rounded-lg border-2 flex items-start gap-2 ${boxClass}`}>
                          <span className="font-bold">{opt.id}.</span>
                          <span className="text-sm">{opt.text}</span>
                          {isSelected && isActualCorrect && <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-600 shrink-0" />}
                          {isSelected && !isActualCorrect && <XCircle className="w-4 h-4 ml-auto text-red-600 shrink-0" />}
                          {!isSelected && isActualCorrect && <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-600 shrink-0 opacity-50" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
