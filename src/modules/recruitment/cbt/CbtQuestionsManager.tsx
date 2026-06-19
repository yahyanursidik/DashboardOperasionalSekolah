import React, { useState } from "react";
import { useList, useCreate, useUpdate, useDelete, useOne, useCreateMany } from "@refinedev/core";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Edit, Save, CheckCircle2, Upload } from "lucide-react";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Modal } from "../../../components/common/Modal";

export const CbtQuestionsManager: React.FC = () => {
  const { bankId } = useParams();
  const navigate = useNavigate();

  const { data: bankData } = useOne({ resource: "cbt_banks", id: bankId as string });
  const bank = bankData?.data;

  const { data: questionsData, isLoading } = useList({
    resource: "cbt_questions",
    pagination: { mode: "off" },
    filters: [{ field: "bank_id", operator: "eq", value: bankId }],
    sorters: [{ field: "created_at", order: "asc" }],
  });

  const { mutate: createQuestion } = useCreate();
  const { mutate: updateQuestion } = useUpdate();
  const { mutate: deleteQuestion } = useDelete();
  const { mutate: createManyQuestions } = useCreateMany();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    question_text: "",
    options: [
      { id: "A", text: "" },
      { id: "B", text: "" },
      { id: "C", text: "" },
      { id: "D", text: "" },
      { id: "E", text: "" },
    ],
    correct_option_id: "A",
    weight: 1,
  });

  const handleEdit = (q: any) => {
    setEditingId(q.id);
    setFormData({
      question_text: q.question_text,
      options: q.options || [],
      correct_option_id: q.correct_option_id,
      weight: q.weight,
    });
  };

  const handleAddNew = () => {
    setEditingId("new");
    setFormData({
      question_text: "",
      options: [
        { id: "A", text: "" },
        { id: "B", text: "" },
        { id: "C", text: "" },
        { id: "D", text: "" },
        { id: "E", text: "" },
      ],
      correct_option_id: "A",
      weight: 1,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.question_text) return;

    // Filter out empty options
    const validOptions = formData.options.filter(o => o.text.trim() !== "");
    if (validOptions.length < 2) {
      alert("Harap masukkan minimal 2 pilihan jawaban.");
      return;
    }

    const payload = {
      bank_id: bankId,
      question_text: formData.question_text,
      options: validOptions,
      correct_option_id: formData.correct_option_id,
      weight: formData.weight,
    };

    if (editingId === "new") {
      createQuestion({ resource: "cbt_questions", values: payload }, { onSuccess: () => setEditingId(null) });
    } else if (editingId) {
      updateQuestion({ resource: "cbt_questions", id: editingId, values: payload }, { onSuccess: () => setEditingId(null) });
    }
  };

  const parsedPreview = React.useMemo(() => {
    if (!importText.trim()) return [];
    const blocks = importText.split(/\n\s*\n/).map(b => b.trim()).filter(b => b);
    
    return blocks.map((block, index) => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l);
      
      let questionText = lines[0] || "";
      questionText = questionText.replace(/^\d+\.\s*/, '');

      const options: { id: string, text: string }[] = [];
      let correct_option_id = 'A';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^[A-E]\./i.test(line)) {
          const optId = line.charAt(0).toUpperCase();
          const optText = line.substring(2).trim();
          options.push({ id: optId, text: optText });
        } else if (/^kunci:/i.test(line)) {
          correct_option_id = line.split(':')[1].trim().toUpperCase();
        } else if (options.length === 0) {
          questionText += '\n' + line;
        }
      }

      return {
        bank_id: bankId as string,
        question_text: questionText,
        options: options.length > 0 ? options : [
          { id: "A", text: "Benar" },
          { id: "B", text: "Salah" }
        ],
        correct_option_id: correct_option_id,
        weight: 1
      };
    });
  }, [importText, bankId]);

  const handleImport = () => {
    if (parsedPreview.length === 0) return;
    setIsImporting(true);

    createManyQuestions(
      { resource: "cbt_questions", values: parsedPreview },
      { 
        onSuccess: () => {
          setIsImporting(false);
          setIsImportModalOpen(false);
          setImportText("");
          setShowPreview(false);
        },
        onError: () => {
          setIsImporting(false);
          alert("Terjadi kesalahan saat menyimpan soal.");
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/recruitment/cbt/banks")} className="p-2 hover:bg-muted rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader 
          title={`Manajemen Soal: ${bank?.name || "Loading..."}`} 
          description={bank?.description || "Kelola soal-soal pilihan ganda untuk bank soal ini."}
        />
      </div>

      {!editingId && (
        <div className="flex gap-3">
          <button
            onClick={handleAddNew}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Soal
          </button>
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setShowPreview(false);
            }}
            className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Impor Massal (Paste Text)
          </button>
        </div>
      )}

      {editingId && (
        <div className="bg-card border border-blue-100 rounded-xl p-6 shadow-sm space-y-6">
          <h3 className="font-semibold text-lg">{editingId === "new" ? "Buat Soal Baru" : "Edit Soal"}</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Teks Soal</label>
              <textarea 
                value={formData.question_text}
                onChange={e => setFormData({...formData, question_text: e.target.value})}
                className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background min-h-[100px]"
                placeholder="Tuliskan pertanyaan di sini..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-sm font-medium">Pilihan Jawaban</label>
                <div className="space-y-3">
                  {formData.options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded bg-muted text-sm font-medium">
                        {opt.id}
                      </div>
                      <input 
                        type="text"
                        value={opt.text}
                        onChange={e => {
                          const newOpts = [...formData.options];
                          newOpts[idx].text = e.target.value;
                          setFormData({...formData, options: newOpts});
                        }}
                        className="flex-1 border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
                        placeholder={`Opsi ${opt.id}`}
                      />
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input 
                          type="radio" 
                          name="correct_option" 
                          checked={formData.correct_option_id === opt.id}
                          onChange={() => setFormData({...formData, correct_option_id: opt.id})}
                          className="w-4 h-4 text-emerald-600"
                        />
                        Benar
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bobot Nilai (Default: 1)</label>
                <input 
                  type="number" 
                  min="1"
                  value={formData.weight}
                  onChange={e => setFormData({...formData, weight: parseInt(e.target.value) || 1})}
                  className="w-full border rounded-md px-3 py-2 outline-none focus:border-primary bg-background"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 font-medium">
              <Save className="w-4 h-4" /> Simpan Soal
            </button>
            <button onClick={handleCancel} className="bg-muted text-foreground px-6 py-2 rounded-lg hover:bg-muted/80 font-medium">
              Batal
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-4">
          {questionsData?.data.map((q: any, i: number) => (
            <div key={q.id} className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3">
                  <span className="font-bold text-muted-foreground w-6">{i + 1}.</span>
                  <p className="font-medium">{q.question_text}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleEdit(q)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if(confirm("Hapus soal ini?")) deleteQuestion({ resource: "cbt_questions", id: q.id }) }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="ml-9 grid grid-cols-1 md:grid-cols-2 gap-2">
                {q.options?.map((opt: any) => (
                  <div key={opt.id} className={`flex items-start gap-2 p-2 rounded-md border ${q.correct_option_id === opt.id ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20' : 'bg-muted/30 border-transparent'}`}>
                    <span className={`font-semibold ${q.correct_option_id === opt.id ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>{opt.id}.</span>
                    <span className="text-sm">{opt.text}</span>
                    {q.correct_option_id === opt.id && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-auto" />}
                  </div>
                ))}
              </div>
              <div className="ml-9 text-xs text-muted-foreground flex items-center gap-4">
                <span>Bobot: <strong>{q.weight}</strong></span>
              </div>
            </div>
          ))}
          {questionsData?.data.length === 0 && !editingId && (
             <div className="text-center p-12 bg-card border rounded-xl border-dashed">
               <p className="text-muted-foreground">Belum ada soal di bank ini.</p>
             </div>
          )}
        </div>
      )}

      <Modal isOpen={isImportModalOpen} onClose={() => !isImporting && setIsImportModalOpen(false)} title="Impor Soal Massal">
        <div className="space-y-4 max-w-4xl max-h-[80vh] flex flex-col">
          {!showPreview ? (
            <>
              <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-100">
                <strong>Cara Penggunaan:</strong> Paste teks soal ke dalam kotak di bawah ini. Pastikan menggunakan format:
                <pre className="mt-2 text-xs bg-white p-2 rounded border font-mono">
                  1. Pertanyaan...{'\n'}
                  A. Pilihan A{'\n'}
                  B. Pilihan B{'\n'}
                  C. Pilihan C{'\n'}
                  Kunci: A{'\n'}
                  {'\n'}
                  2. Pertanyaan kedua...
                </pre>
                <p className="mt-2">Setiap soal dipisahkan oleh <strong>satu baris kosong</strong> (Enter 2 kali).</p>
              </div>
              
              <textarea 
                value={importText}
                onChange={e => setImportText(e.target.value)}
                className="w-full h-64 border rounded-md p-3 outline-none focus:border-indigo-500 font-mono text-sm bg-slate-50 shrink-0"
                placeholder="Paste teks soal di sini..."
                disabled={isImporting}
              />
              
              <button 
                onClick={() => setShowPreview(true)}
                disabled={parsedPreview.length === 0}
                className="w-full py-2.5 bg-slate-800 text-white rounded-md hover:bg-slate-900 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                Pratinjau {parsedPreview.length > 0 ? `(${parsedPreview.length} Soal)` : ""} &rarr;
              </button>
            </>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="font-semibold">Pratinjau Hasil Impor ({parsedPreview.length} Soal)</h3>
                <button onClick={() => setShowPreview(false)} className="text-sm text-indigo-600 hover:underline">
                  &larr; Kembali Edit Teks
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
                {parsedPreview.map((q, idx) => (
                  <div key={idx} className="bg-white border rounded-lg p-4 text-sm shadow-sm">
                    <p className="font-medium text-slate-800 mb-3"><span className="text-slate-400 mr-2">{idx + 1}.</span>{q.question_text}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                      {q.options.map(opt => (
                        <div key={opt.id} className={`flex items-start gap-2 p-1.5 rounded border ${q.correct_option_id === opt.id ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-transparent text-slate-600'}`}>
                          <span className="font-medium">{opt.id}.</span>
                          <span>{opt.text}</span>
                          {q.correct_option_id === opt.id && <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-600 shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 mt-2 border-t shrink-0">
                <button 
                  onClick={handleImport}
                  disabled={isImporting || parsedPreview.length === 0}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  {isImporting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isImporting ? "Menyimpan Soal..." : `Simpan ${parsedPreview.length} Soal ke Bank`}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
