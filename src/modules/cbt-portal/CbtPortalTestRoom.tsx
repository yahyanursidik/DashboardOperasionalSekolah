import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "../../lib/supabase/client";

// CBT tables are closed to participants; every read/write goes through token-scoped RPCs
// (supabase/migrations/20260930090000_cbt_secure_exam_rpc.sql). Questions arrive without the
// answer key and the score is computed on the server.
const db = supabaseClient as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type CbtQuestion = { id: string; question_text: string; options: Array<{ id: string; text: string }> };
type CbtSession = {
  status: "in_progress" | "completed";
  applicant_name?: string;
  exam_title?: string;
  ends_at?: string;
  server_now?: string;
  questions?: CbtQuestion[];
  answers?: Record<string, string>;
};

export const CbtPortalTestRoom: React.FC = () => {
  const { token = "" } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<CbtSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [questions, setQuestions] = useState<CbtQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // question_id -> option_id
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [endsAtMs, setEndsAtMs] = useState<number | null>(null);
  const clockOffsetRef = useRef(0); // server clock - client clock
  const isSubmittingRef = useRef(false);
  const submitRef = useRef<(auto?: boolean) => void>(() => {});

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await db.rpc("cbt_session", { p_token: token });
    if (error) {
      setLoadError(error.message);
      setSession(null);
    } else {
      const next = data as CbtSession | null;
      setLoadError("");
      setSession(next);
      if (next?.status === "in_progress") {
        setQuestions(next.questions || []);
        setAnswers(next.answers || {});
        clockOffsetRef.current = new Date(next.server_now || Date.now()).getTime() - Date.now();
        setEndsAtMs(next.ends_at ? new Date(next.ends_at).getTime() : null);
      }
    }
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch of the exam session
    void loadSession();
  }, [loadSession]);

  // Timer follows the server deadline, so reloading the page or changing the device clock does not add time.
  useEffect(() => {
    if (session?.status !== "in_progress" || !endsAtMs) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((endsAtMs - (Date.now() + clockOffsetRef.current)) / 1000));
      setTimeLeft(diff);
      if (diff === 0) {
        clearInterval(interval);
        submitRef.current(true);
      }
    };
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, [session?.status, endsAtMs]);

  const handleSelectOption = async (questionId: string, optionId: string) => {
    if (session?.status !== "in_progress" || isSubmittingRef.current) return;
    const previous = answers[questionId];
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    const { error } = await db.rpc("cbt_save_answer", { p_token: token, p_question_id: questionId, p_option_id: optionId });
    if (error) {
      setAnswers((prev) => {
        const next = { ...prev };
        if (previous) next[questionId] = previous; else delete next[questionId];
        return next;
      });
      toast.error(`Jawaban belum tersimpan: ${error.message}`);
      if (/habis|tidak aktif/i.test(error.message)) void loadSession();
    }
  };

  const submitExam = async (auto = false) => {
    if (session?.status !== "in_progress" || isSubmittingRef.current) return;
    if (!auto) {
      const unanswered = questions.length - Object.keys(answers).length;
      const warning = unanswered > 0 ? `\n\nMasih ada ${unanswered} soal yang belum dijawab.` : "";
      if (!confirm(`Apakah Anda yakin ingin menyelesaikan ujian ini? Jawaban tidak dapat diubah lagi.${warning}`)) return;
    }
    isSubmittingRef.current = true;
    const { error } = await db.rpc("cbt_submit", { p_token: token });
    isSubmittingRef.current = false;
    if (error) {
      toast.error(auto ? "Waktu habis. Memuat status ujian..." : `Gagal mengumpulkan jawaban: ${error.message}`);
      void loadSession();
      return;
    }
    setSession((prev) => ({ ...(prev || {}), status: "completed" }));
  };
  const handleSubmit = () => void submitExam(false);
  // eslint-disable-next-line react-hooks/refs -- keep the timer pointed at the latest submit handler
  submitRef.current = submitExam;

  if (isLoading && !session) {
    return <div className="text-center p-12">Mempersiapkan ruangan ujian...</div>;
  }

  if (!session) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-red-100">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">{loadError ? "Ruang Ujian Tidak Dapat Dimuat" : "Token Tidak Valid"}</h2>
        <p className="text-slate-500 mt-2 mb-6">{loadError || "Token ujian yang Anda masukkan salah atau tidak ditemukan."}</p>
        <button onClick={() => navigate("/cbt/login")} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">Kembali</button>
      </div>
    );
  }

  if (session.status === 'completed') {
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
                {currentQuestion.options?.map((opt) => (
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
            <h3 className="text-sm font-semibold text-slate-800">{session.applicant_name || "Peserta Ujian"}</h3>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{session.exam_title}</p>
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
