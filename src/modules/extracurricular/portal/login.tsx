import React, { useState } from "react";
import { useLogin } from "@refinedev/core";
import { Link, useNavigate } from "react-router-dom";
import { Target, Loader2, ArrowRight } from "lucide-react";

export const ExtracurricularPortalLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { mutate: login, isLoading } = useLogin();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({
      email,
      password,
    }, {
      onSuccess: () => {
        navigate('/ekskul-portal');
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Target className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Portal Ekstrakurikuler
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Masuk untuk melihat jadwal, absensi, dan nilaimu
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Alamat Email
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-all"
                  placeholder="nama@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Kata Sandi
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full h-12 text-base font-medium rounded-lg flex justify-center items-center bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk ke Portal"
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t pt-6">
            <p className="text-sm text-gray-600 mb-3">Belum punya akun? Siswa eksternal daftar di sini.</p>
            <Link to="/ekskul-portal/register">
              <button className="w-full h-11 text-primary border border-primary/20 hover:bg-primary/5 font-medium rounded-md flex justify-center items-center transition-colors">
                Daftar Program Ekstrakurikuler <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
