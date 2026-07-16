import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Wallet, Receipt, CheckCircle, CreditCard, Users, LogOut, LayoutDashboard, Settings, Landmark, BookOpenCheck, BarChart3, Tags, BadgeDollarSign, Bell, CalendarCheck, MoreHorizontal, UserRound, X } from "lucide-react";
import { useSystemSettings } from "../../app/providers/SettingsProvider";
import { BrandLogo } from "../../components/common/BrandLogo";

type FinanceEmployee = { full_name?: string | null; position?: string | null; role?: string | null };
type RoleRow = { roles?: { name?: string | null } | null };

export const BendaharaLayout: React.FC = () => {
  const [employee, setEmployee] = useState<FinanceEmployee | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { appName } = useSystemSettings();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (!session) {
        navigate("/bendahara/login");
        return;
      }

      const [employeeResult, rolesResult] = await Promise.all([
        supabaseClient.from("employees").select("*").eq("user_id", session.user.id).eq("status", "active").maybeSingle(),
        supabaseClient.from("user_roles").select("roles(name)").eq("user_id", session.user.id),
      ]);
      const position = String((employeeResult.data as FinanceEmployee | null)?.position || "").toLowerCase();
      const roleNames = ((rolesResult.data || []) as RoleRow[]).map((item) => item.roles?.name).filter((name): name is string => Boolean(name));
      const allowed = position.includes("bendahara") || position.includes("keuangan") || roleNames.some((role: string) => ["super_admin", "ketua_yayasan", "kepala_tu", "admin_keuangan"].includes(role));

      if (!allowed) {
        await supabaseClient.auth.signOut();
        navigate("/bendahara/login");
        return;
      }
      setEmployee((employeeResult.data as unknown as FinanceEmployee | null) || { full_name: session.user.user_metadata?.full_name || "Bendahara", role: roleNames[0] || "admin_keuangan" });
    };

    fetchSession();
  }, [navigate]);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    navigate("/bendahara/login");
  };

  const navSections = [
    { label: "Ringkasan", items: [{ name: "Pusat Keuangan", path: "/bendahara", icon: LayoutDashboard }] },
    { label: "Penagihan", items: [
      { name: "Tagihan Siswa", path: "/bendahara/invoices", icon: Receipt },
      { name: "Penerimaan Lain", path: "/bendahara/receipts", icon: BadgeDollarSign },
      { name: "Verifikasi Pembayaran", path: "/bendahara/verifications", icon: CheckCircle },
      { name: "Data Siswa", path: "/bendahara/students", icon: Users },
    ] },
    { label: "Kas & Perencanaan", items: [
      { name: "Pengeluaran", path: "/bendahara/expenses", icon: CreditCard },
      { name: "Buku Kas & Bank", path: "/bendahara/cashbook", icon: Wallet },
      { name: "RKAS & Anggaran", path: "/bendahara/budgets", icon: Landmark },
      { name: "Tarif & Program", path: "/bendahara/tariffs", icon: Settings },
    ] },
    { label: "Akuntansi & Kontrol", items: [
      { name: "Akuntansi", path: "/bendahara/accounting", icon: BookOpenCheck },
      { name: "Laporan Keuangan", path: "/bendahara/reports", icon: BarChart3 },
      { name: "Akun & Kategori", path: "/bendahara/categories", icon: Tags },
      { name: "Pengaturan", path: "/bendahara/settings", icon: Settings },
    ] },
    { label: "Kepegawaian", items: [
      { name: "Absensi & Lembur", path: "/staff/attendance", icon: CalendarCheck },
      { name: "Informasi Sekolah", path: "/staff/announcements", icon: Bell },
      { name: "Profil & Keamanan", path: "/staff/profile", icon: UserRound },
    ] },
  ];
  const mobileItems = [navSections[0].items[0], navSections[1].items[0], navSections[2].items[1], navSections[4].items[0]];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="w-64 bg-emerald-700 text-white hidden md:flex flex-col h-screen sticky top-0 shadow-xl z-20">
        <div className="h-16 flex items-center px-6 bg-emerald-800/50 shrink-0">
          <BrandLogo textClassName="font-bold text-xl tracking-tight text-white" />
        </div>
        
        <div className="p-4 border-b border-emerald-600/50 bg-emerald-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
              {employee?.full_name?.charAt(0) || "B"}
            </div>
            <div>
              <p className="font-semibold text-sm truncate w-40">{employee?.full_name || "Memuat..."}</p>
              <p className="text-xs text-emerald-200">Portal Bendahara</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto">
          {navSections.map((section) => <div key={section.label}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/80">{section.label}</p>
            <div className="space-y-1">{section.items.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/bendahara' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  isActive 
                    ? "bg-white text-emerald-700 shadow-md" 
                    : "text-emerald-50 hover:bg-emerald-600/50 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                {item.name}
              </Link>
            );
          })}</div></div>)}
        </nav>

        <div className="p-4 bg-emerald-800/30 shrink-0">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 w-full rounded-xl transition-all text-sm font-medium text-emerald-100 hover:bg-red-500/20 hover:text-red-100"
          >
            <LogOut className="w-5 h-5" />
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-emerald-700 text-white h-16 flex items-center justify-between px-4 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            <span className="font-bold">{appName || "Portal Bendahara"}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-emerald-100 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="grid grid-cols-5 px-2">
            {mobileItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/bendahara' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center py-3 px-1 w-full relative ${isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {isActive && <div className="absolute top-0 w-8 h-1 bg-emerald-600 rounded-b-full"></div>}
                  <item.icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5px] text-emerald-600' : ''}`} />
                  <span className="text-[9px] font-medium truncate w-full text-center">{item.name}</span>
                </Link>
              );
            })}
            <button type="button" onClick={() => setIsMobileMenuOpen(true)} className={`relative flex w-full flex-col items-center py-3 px-1 ${isMobileMenuOpen ? "text-emerald-600" : "text-slate-400"}`}>
              {isMobileMenuOpen && <div className="absolute top-0 h-1 w-8 rounded-b-full bg-emerald-600" />}
              <MoreHorizontal className="mb-1 h-5 w-5" />
              <span className="w-full truncate text-center text-[9px] font-medium">Menu</span>
            </button>
          </div>
        </nav>
      </div>
      {isMobileMenuOpen && <div className="fixed inset-0 z-[60] flex items-end md:hidden">
        <button type="button" aria-label="Tutup menu" onClick={() => setIsMobileMenuOpen(false)} className="absolute inset-0 bg-black/50" />
        <section className="relative max-h-[82vh] w-full overflow-y-auto rounded-t-lg bg-white p-5 text-slate-900 shadow-xl">
          <div className="mb-4 flex items-center justify-between border-b pb-3"><div><h2 className="font-bold">Menu Bendahara</h2><p className="text-xs text-slate-500">Keuangan, kontrol, dan kepegawaian</p></div><button type="button" onClick={() => setIsMobileMenuOpen(false)} title="Tutup" className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600"><X className="h-5 w-5" /></button></div>
          <div className="space-y-5">{navSections.map((section) => <div key={section.label}><p className="mb-2 text-[10px] font-bold uppercase text-slate-400">{section.label}</p><div className="grid grid-cols-3 gap-2">{section.items.map((item) => { const Icon = item.icon; const active = location.pathname === item.path || (item.path !== "/bendahara" && location.pathname.startsWith(item.path)); return <Link key={item.path} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border p-2 text-center ${active ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "text-slate-600"}`}><Icon className="h-5 w-5" /><span className="text-[10px] font-semibold leading-4">{item.name}</span></Link>; })}</div></div>)}</div>
        </section>
      </div>}
    </div>
  );
};
