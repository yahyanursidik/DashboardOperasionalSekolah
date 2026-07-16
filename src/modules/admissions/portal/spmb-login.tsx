import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { BrandLogo } from "../../../components/common/BrandLogo";

export const SpmbLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error: authError } = await supabaseClient.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (authError) {
      setError("Email atau kata sandi tidak sesuai. Periksa kembali data akun Anda.");
      return;
    }
    navigate("/spmb", { replace: true });
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="w-full max-w-md bg-white border rounded-lg p-6 sm:p-8 shadow-sm">
        <div className="flex justify-center mb-7"><BrandLogo textClassName="font-bold text-xl text-slate-900" /></div>
        <h1 className="text-2xl font-bold text-slate-950 text-center">Masuk Portal SPMB</h1>
        <p className="text-sm text-slate-600 text-center mt-2 mb-7">Lanjutkan pendaftaran dan pantau hasil verifikasi dari satu tempat.</p>

        {error && <div className="mb-5 flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <label className="block text-sm font-semibold text-slate-800">Email
            <span className="relative block mt-2"><Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-11 pl-10 pr-3 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500" placeholder="orangtua@email.com" autoComplete="email" required /></span>
          </label>
          <label className="block text-sm font-semibold text-slate-800">Kata sandi
            <span className="relative block mt-2"><Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-11 pl-10 pr-3 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500" autoComplete="current-password" required /></span>
          </label>
          <button disabled={loading} className="w-full h-11 rounded-md bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />} Masuk
          </button>
        </form>
        <p className="text-sm text-slate-600 text-center mt-6">Belum memiliki akun? <Link className="font-semibold text-emerald-700 hover:underline" to="/spmb/register">Buat akun pendaftaran</Link></p>
      </div>
    </div>
  );
};
