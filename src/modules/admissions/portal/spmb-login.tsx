import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, User, Lock, Mail } from "lucide-react";
import { getSpmbSettings } from "../mock";
import { useSystemSettings } from "../../../app/providers/SettingsProvider";

export const SpmbLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const settings = getSpmbSettings();
  const { loginCoverUrl } = useSystemSettings();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      localStorage.setItem('spmbAuth', 'true');
      localStorage.setItem('spmbUser', JSON.stringify({ email }));
      navigate('/spmb');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-gradient-to-br from-emerald-50 via-green-100/60 to-emerald-200"
      style={loginCoverUrl ? {
        backgroundImage: `url(${loginCoverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : {}}
    >
      {/* Dark overlay if using cover image to ensure form readability */}
      {loginCoverUrl && <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-0"></div>}

      {/* Decorative background blobs - only show if no cover */}
      {!loginCoverUrl && (
        <>
          <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none z-0"></div>
          <div className="fixed top-[20%] right-[-10%] w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none z-0"></div>
          <div className="fixed bottom-[-20%] left-[20%] w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 pointer-events-none z-0"></div>
        </>
      )}

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95">
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Login Portal SPMB</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Silakan login untuk melanjutkan pendaftaran di {settings.schoolName}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Alamat Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="email@contoh.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-medium py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" /> Masuk ke Portal
            </button>
          </form>

          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-slate-600">
              Belum punya akun pendaftaran?{" "}
              <Link to="/spmb/register" className="text-primary font-bold hover:underline">
                Daftar Sekarang
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
