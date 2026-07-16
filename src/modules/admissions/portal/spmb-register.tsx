import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, Lock, Mail, Phone, User, UserPlus } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";

export const SpmbRegister: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabaseClient.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { full_name: form.name.trim(), phone: form.phone.trim(), portal: "spmb" } },
    });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message.includes("already") ? "Email ini sudah terdaftar. Silakan masuk dengan akun yang tersedia." : error.message });
      return;
    }
    if (data.session) navigate("/spmb/form", { replace: true });
    else setMessage({ type: "success", text: "Akun berhasil dibuat. Periksa email untuk konfirmasi, lalu masuk ke Portal SPMB." });
  };

  const fields = [
    { key: "name", label: "Nama orang tua / wali", type: "text", icon: User, placeholder: "Sesuai identitas resmi" },
    { key: "phone", label: "Nomor WhatsApp aktif", type: "tel", icon: Phone, placeholder: "08xxxxxxxxxx" },
    { key: "email", label: "Email", type: "email", icon: Mail, placeholder: "orangtua@email.com" },
    { key: "password", label: "Kata sandi", type: "password", icon: Lock, placeholder: "Minimal 8 karakter" },
  ] as const;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="w-full max-w-lg bg-white border rounded-lg p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Buat Akun Pendaftaran</h1>
        <p className="text-sm text-slate-600 mt-2 mb-7">Satu akun dapat digunakan untuk melanjutkan dan memantau pendaftaran calon murid.</p>
        {message && <div className={`mb-5 flex gap-2 rounded-md border p-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}{message.text}</div>}
        <form onSubmit={submit} className="space-y-4">
          {fields.map(({ key, label, type, icon: Icon, placeholder }) => <label key={key} className="block text-sm font-semibold text-slate-800">{label}<span className="relative block mt-2"><Icon className="absolute left-3 top-3 w-5 h-5 text-slate-400" /><input type={type} value={form[key]} onChange={(e) => setForm((value) => ({ ...value, [key]: e.target.value }))} className="w-full h-11 pl-10 pr-3 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500" placeholder={placeholder} minLength={key === "password" ? 8 : undefined} required /></span></label>)}
          <button disabled={loading} className="w-full h-11 rounded-md bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-2"><>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />} Buat Akun</></button>
        </form>
        <p className="text-sm text-slate-600 text-center mt-6">Sudah memiliki akun? <Link className="font-semibold text-emerald-700 hover:underline" to="/spmb/login">Masuk</Link></p>
      </div>
    </div>
  );
};
