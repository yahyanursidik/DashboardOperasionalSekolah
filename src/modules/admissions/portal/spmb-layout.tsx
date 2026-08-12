/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { Baby, FileText, Home, Loader2, LogOut, Plus, UserCircle } from "lucide-react";
import { supabaseClient } from "../../../lib/supabase/client";
import { BrandLogo } from "../../../components/common/BrandLogo";
import { SpmbPortalContext } from "./spmb-context";

const db = supabaseClient as any;

export const SpmbLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [activeApplicantId, setActiveApplicantId] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const isAuthPage = location.pathname === "/spmb/login" || location.pathname === "/spmb/register";

  const loadApplicants = useCallback(async (target: User, preferredApplicantId?: string | null) => {
    const { data, error } = await db.from("admissions_applicants").select("*, units(name), academic_years(name), admission_batches(name,registration_fee,announcement_at), desired_classes:desired_class_id(name,grade_level)").eq("user_id", target.id).is("archived_at", null).order("registration_date", { ascending: false });
    if (error) return;
    const rows = data || [];
    setApplicants(rows);
    setActiveApplicantId((current) => {
      if (preferredApplicantId !== undefined) return preferredApplicantId;
      if (current === null) return null;
      if (current && rows.some((row: any) => row.id === current)) return current;
      return rows[0]?.id || null;
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    supabaseClient.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const sessionUser = data.session?.user || null;
      setUser(sessionUser);
      if (sessionUser) await loadApplicants(sessionUser);
      if (mounted) setLoading(false);
    });
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user || null;
      setUser(sessionUser);
      if (!sessionUser) {
        setApplicants([]);
        setActiveApplicantId(undefined);
        return;
      }

      // Run the database read outside the auth callback so token refreshes do not
      // block the auth event and do not restart the layout initialization effect.
      window.setTimeout(() => { void loadApplicants(sessionUser); }, 0);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadApplicants]);

  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-emerald-700" /></div>;
  if (!user && !isAuthPage) return <Navigate to="/spmb/login" replace state={{ from: location.pathname }} />;
  if (user && isAuthPage) return <Navigate to="/spmb" replace />;
  if (isAuthPage) return <Outlet />;

  const signOut = async () => { await supabaseClient.auth.signOut(); navigate("/spmb/login", { replace: true }); };
  const links = [{ to: "/spmb", label: "Ringkasan", icon: Home }, { to: "/spmb/form", label: "Formulir", icon: FileText }];
  const applicant = applicants.find((row) => row.id === activeApplicantId) || null;
  const selectApplicant = (applicantId: string | null) => setActiveApplicantId(applicantId);
  const startNewApplication = () => {
    selectApplicant(null);
    navigate("/spmb/form");
  };

  return (
    <SpmbPortalContext.Provider value={{
      user: user!,
      applicants,
      applicant,
      loading,
      selectApplicant,
      refreshApplicants: (preferredApplicantId) => loadApplicants(user!, preferredApplicantId),
    }}>
      <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col">
        <header className="bg-white border-b sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <Link to="/spmb"><BrandLogo textClassName="font-bold text-base sm:text-lg text-slate-950" /></Link>
            <nav className="hidden sm:flex items-center gap-1">{links.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className={`h-9 px-3 rounded-md flex items-center gap-2 text-sm font-medium ${location.pathname === to ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-100"}`}><Icon className="w-4 h-4" />{label}</Link>)}</nav>
            <div className="flex items-center gap-2"><span className="hidden md:flex items-center gap-2 text-sm text-slate-600 max-w-52 truncate"><UserCircle className="w-4 h-4" />{user?.user_metadata?.full_name || user?.email}</span><button onClick={signOut} title="Keluar" className="w-9 h-9 grid place-items-center border rounded-md text-slate-600 hover:text-rose-700 hover:border-rose-200"><LogOut className="w-4 h-4" /></button></div>
          </div>
        </header>
        <div className="border-b bg-emerald-50/70">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
              <Baby className="h-4 w-4 shrink-0 text-emerald-700" />
              <span className="shrink-0">Calon murid</span>
              <select
                value={activeApplicantId ?? "new"}
                onChange={(event) => selectApplicant(event.target.value === "new" ? null : event.target.value)}
                className="h-9 min-w-0 max-w-full rounded-md border bg-white px-3 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {applicants.map((row) => <option key={row.id} value={row.id}>{row.name || "Tanpa nama"} · {row.registration_number || "Draf"}</option>)}
                {activeApplicantId == null && <option value="new">Pendaftaran anak baru</option>}
              </select>
            </label>
            {activeApplicantId !== null && <button type="button" onClick={startNewApplication} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
              <Plus className="h-4 w-4" />Daftarkan Anak Lain
            </button>}
          </div>
        </div>
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 sm:py-8 pb-24 sm:pb-8"><Outlet key={activeApplicantId ?? "new"} /></main>
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t grid grid-cols-2">{links.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className={`h-16 flex flex-col items-center justify-center gap-1 text-xs font-semibold ${location.pathname === to ? "text-emerald-700" : "text-slate-500"}`}><Icon className="w-5 h-5" />{label}</Link>)}</nav>
      </div>
    </SpmbPortalContext.Provider>
  );
};
