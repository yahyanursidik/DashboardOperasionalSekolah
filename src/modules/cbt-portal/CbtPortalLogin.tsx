import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, ArrowRight } from "lucide-react";

export const CbtPortalLogin: React.FC = () => {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError("Token ujian tidak boleh kosong");
      return;
    }
    
    // In a real app, verify the token via API first. 
    // Since we rely on Refine's provider and it's anonymous access for test-taking, 
    // we just navigate to the test room. 
    // Validation will happen in the test room component.
    navigate(`/cbt/test/${token.trim().toUpperCase()}`);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
      <div className="bg-indigo-600 p-8 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <KeyRound className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Masuk Ujian CBT</h2>
        <p className="text-indigo-100 mt-2 text-sm">Silakan masukkan token ujian yang diberikan oleh panitia rekrutmen.</p>
      </div>

      <form onSubmit={handleLogin} className="p-8 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium text-center">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Token Ujian</label>
          <input
            type="text"
            value={token}
            onChange={(e) => {
              setToken(e.target.value.toUpperCase());
              setError("");
            }}
            placeholder="Contoh: X7B9K2"
            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-lg font-mono tracking-widest text-center uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            maxLength={10}
          />
        </div>

        <button
          type="submit"
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          Mulai Ujian <ArrowRight className="w-4 h-4" />
        </button>

        <div className="text-center pt-4">
          <p className="text-xs text-slate-500">
            Pastikan koneksi internet stabil sebelum memulai ujian. Waktu akan berjalan otomatis saat ujian dimulai.
          </p>
        </div>
      </form>
    </div>
  );
};
