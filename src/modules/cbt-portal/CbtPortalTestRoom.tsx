import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useList, useUpdate, useCreate } from "@refinedev/core";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

export const CbtPortalTestRoom: React.FC = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  // Fetch Participant
  const { data: participantData, isLoading: isLoadingParticipant } = useList({
    resource: "cbt_participants",
    filters: [{ field: "token", operator: "eq", value: token }],
    meta: { select: "*, cbt_exams(*, cbt_exam_banks(bank_id, question_count)), recruitment_applicants(full_name)" }
  });

  const participant = participantData?.data[0];
  const exam = participant?.cbt_exams;

  // Fetch Questions
  // In a real app, you would fetch only questions mapped to this exam via an RPC or backend endpoint to avoid exposing all questions.
  // For this MVP, we fetch questions based on the bank_ids associated with the exam.
  const bankIds = exam?.cbt_exam_banks?.map((eb: any) => eb.bank_id) || [];
  
  const { data: questionsData, isLoading: isLoadingQuestions } = useList({
    resource: "cbt_questions",
    pagination: { mode: "off" },
    filters: [{ field: "bank_id", operator: "in", value: bankIds.length > 0 ? bankIds : ['00000000-0000-0000-0000-000000000000'] }],
    queryOptions: { enabled: !!exam && bankIds.length > 0 }
  });

  // Fetch Existing Answers
  const { data: answersData } = useList({
    resource: "cbt_answers",
    filters: [{ field: "participant_id", operator: "eq", value: participant?.id }],
    queryOptions: { enabled: !!participant?.id }
  });

  const { mutate: createAnswer } = useCreate();
  const { mutate: updateAnswer } = useUpdate();
  const { mutate: updateParticipant } = useUpdate();

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // question_id -> option_id
  const [answerRecordIds, setAnswerRecordIds] = useState<Record<string, string>>({}); // question_id -> answer_record_id
  const [isAnswersLoaded, setIsAnswersLoaded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Initialize Data
  useEffect(() => {
    if (questionsData?.data && exam && participant && questions.length === 0) {
      const hashString = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
        }
        return hash;
      };

      const examBanks = exam.cbt_exam_banks || [];
      let finalQuestions: any[] = [];

      // For each bank, pick the configured question_count
      examBanks.forEach((eb: any) => {
         const bankQuestions = questionsData.data.filter((q: any) => q.bank_id === eb.bank_id);
         
         // Deterministic shuffle for this participant (so page refresh doesn't change the subset)
         bankQuestions.sort((a: any, b: any) => {
            const hashA = hashString(participant.id + a.id);
            const hashB = hashString(participant.id + b.id);
            return hashA - hashB;
         });

         // Slice the required count
         finalQuestions = [...finalQuestions, ...bankQuestions.slice(0, eb.question_count)];
      });

      // Randomize the final combined list if needed (also deterministic)
      if (exam.randomize_questions) {
         finalQuestions.sort((a: any, b: any) => {
            const hashA = hashString("order_" + participant.id + a.id);
            const hashB = hashString("order_" + participant.id + b.id);
            return hashA - hashB;
         });
      }
      
      setQuestions(finalQuestions);
    }
  }, [questionsData, exam, participant]);

  // Load existing answers
  useEffect(() => {
    if (answersData?.data && !isAnswersLoaded) {
      const existingAnswers: Record<string, string> = {};
      const existingIds: Record<string, string> = {};
      answersData.data.forEach((ans: any) => {
        existingAnswers[ans.question_id] = ans.selected_option_id;
        existingIds[ans.question_id] = ans.id;
      });
      setAnswers(existingAnswers);
      setAnswerRecordIds(existingIds);
      setIsAnswersLoaded(true);
    }
  }, [answersData, isAnswersLoaded]);

  // Timer logic
  useEffect(() => {
    if (!participant || !exam) return;

    if (participant.status === 'completed') return;

    let endTime: Date;
    
    if (!participant.started_at) {
      // First time starting
      const now = new Date();
      updateParticipant({
        resource: "cbt_participants",
        id: participant.id,
        values: { status: 'in_progress', started_at: now.toISOString() }
      });
      endTime = new Date(now.getTime() + exam.duration_minutes * 60000);
    } else {
      endTime = new Date(new Date(participant.started_at).getTime() + exam.duration_minutes * 60000);
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);

      if (diff === 0) {
        clearInterval(interval);
        handleSubmit(); // Auto submit
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [participant, exam]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (!participant) return;

    setAnswers(prev => ({ ...prev, [questionId]: optionId }));

    const recordId = answerRecordIds[questionId];
    
    // Auto save
    if (recordId) {
      updateAnswer({
        resource: "cbt_answers",
        id: recordId,
        values: { selected_option_id: optionId }
      });
    } else {
      createAnswer({
        resource: "cbt_answers",
        values: {
          participant_id: participant.id,
          question_id: questionId,
          selected_option_id: optionId
        }
      }, {
        onSuccess: (data: any) => {
          setAnswerRecordIds(prev => ({ ...prev, [questionId]: data.data.id }));
        }
      });
    }
  };

  const handleSubmit = () => {
    if (!participant) return;
    
    if (confirm("Apakah Anda yakin ingin menyelesaikan ujian ini? Jawaban tidak dapat diubah lagi.")) {
      updateParticipant({
        resource: "cbt_participants",
        id: participant!.id,
        values: { 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        }
      }, {
        onSuccess: () => {
          window.location.reload(); // Simple way to show completed state
        }
      });
    }
  };

  if (isLoadingParticipant || isLoadingQuestions) {
    return <div className="text-center p-12">Mempersiapkan ruangan ujian...</div>;
  }

  if (!participant) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-red-100">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Token Tidak Valid</h2>
        <p className="text-slate-500 mt-2 mb-6">Token ujian yang Anda masukkan salah atau tidak ditemukan.</p>
        <button onClick={() => navigate("/cbt/login")} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">Kembali</button>
      </div>
    );
  }

  if (participant.status === 'completed') {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-emerald-100">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Ujian Selesai</h2>
        <p className="text-slate-500 mt-2 mb-6">Terima kasih, Anda telah menyelesaikan ujian ini. Hasil ujian telah direkam oleh sistem.</p>
        <button onClick={() => navigate("/cbt/login")} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Selesai</button>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-4 gap-6">
      
      {/* Main Test Area */}
      <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border p-6 flex flex-col h-[600px]">
        {currentQuestion ? (
          <>
            <div className="flex justify-between items-center pb-4 border-b mb-6">
              <h2 className="text-lg font-bold text-slate-800">Soal Nomor {currentIdx + 1}</h2>
              <span className="text-sm font-medium text-slate-500">
                Dijawab: {Object.keys(answers).length} / {questions.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <p className="text-lg text-slate-700 leading-relaxed mb-8">{currentQuestion.question_text}</p>
              
              <div className="space-y-3">
                {currentQuestion.options?.map((opt: any) => (
                  <label 
                    key={opt.id} 
                    onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      answers[currentQuestion.id] === opt.id 
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900' 
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      answers[currentQuestion.id] === opt.id ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                    }`}>
                      {answers[currentQuestion.id] === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="font-semibold text-lg">{opt.id}.</span>
                    <span className="text-base">{opt.text}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t mt-auto flex items-center justify-between">
              <button 
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="px-6 py-2.5 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                &larr; Sebelumnya
              </button>
              
              {currentIdx === questions.length - 1 ? (
                <button 
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Selesai Ujian
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                  className="px-6 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  Selanjutnya &rarr;
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">Memuat soal...</div>
        )}
      </div>

      {/* Sidebar Navigation */}
      <div className="md:col-span-1 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
          <div className="mb-4 pb-4 border-b">
            <h3 className="text-sm font-semibold text-slate-800">{participant?.recruitment_applicants?.full_name || "Peserta Ujian"}</h3>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{exam?.title}</p>
          </div>
          <Clock className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Sisa Waktu</h3>
          <p className={`text-4xl font-mono font-bold mt-1 ${timeLeft !== null && timeLeft < 300 ? 'text-red-600' : 'text-slate-800'}`}>
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-sm font-medium text-slate-800 mb-4">Navigasi Soal</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = currentIdx === idx;
              
              let btnClass = "h-10 text-sm font-medium rounded-lg border flex items-center justify-center transition-all ";
              if (isCurrent) {
                btnClass += "border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50 text-indigo-700";
              } else if (isAnswered) {
                btnClass += "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700";
              } else {
                btnClass += "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300";
              }

              return (
                <button 
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={btnClass}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          
          <div className="mt-6 flex flex-col gap-2 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-600" /> Sudah Dijawab
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm border border-slate-300 bg-white" /> Belum Dijawab
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm border-2 border-indigo-600 bg-indigo-50" /> Sedang Aktif
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleSubmit}
          className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-colors shadow-sm"
        >
          Kumpulkan Jawaban
        </button>
      </div>

    </div>
  );
};
