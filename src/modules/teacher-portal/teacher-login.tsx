import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "../../../lib/supabase/client";
import { BookOpen, ArrowRight, AlertCircle, Mail, User } from "lucide-react";
import { useSystemSettings } from "../../../app/providers/SettingsProvider";

export const TeacherLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { appName, logoUrl } = useSystemSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Check if input is email format or NIK
      const isEmail = identifier.includes("@");
      
      let query = supabaseClient
        .from("employees")
        .select("*")
        .eq("status", "active");

      if (isEmail) {
        query = query.eq("email", identifier);
      } else {
        query = query.eq("nik", identifier);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        setError("Kredensial tidak ditemukan atau akun tidak aktif.");
      } else {
        localStorage.setItem("teacher_portal_session", JSON.stringify(data));
        navigate("/teacher");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header Area */}
        <div className="bg-primary p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-black/10 blur-xl"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain bg-white rounded-2xl p-2 mb-4 shadow-lg" />
            ) : (
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-primary-foreground mb-1">Portal Guru</h1>
            <p className="text-primary-foreground/80 text-sm font-medium">{appName || "Sistem Informasi Manajemen Sekolah"}</p>
          </div>
        </div>

        {/* Form Area */}
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900">Selamat Datang</h2>
            <p className="text-sm text-gray-500 mt-1">Silakan masuk menggunakan NIK atau Email Anda</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIK / Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  {identifier.includes('@') ? <Mail className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: EMP001 atau email@sekolah.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Untuk Demo: Gunakan NIK <strong>EMP001</strong> atau Email <strong>guru1@sekolah.demo</strong>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !identifier}
              className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-70 shadow-md shadow-primary/20"
            >
              {isLoading ? "Memeriksa..." : "Masuk ke Portal"}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              Butuh bantuan? Hubungi Admin Tata Usaha.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
