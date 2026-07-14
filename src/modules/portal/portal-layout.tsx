import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Home, Wallet, BookOpen, LogOut, Smile, ClipboardList, Bell, Target, FileText, MoreHorizontal, X, Users, UserRound } from "lucide-react";
import { useSystemSettings } from "../../app/providers/SettingsProvider";

export const PortalLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoUrl, appName } = useSystemSettings();
  const [student, setStudent] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        navigate("/portal/login");
        return;
      }

      const { data: parentDataResult, error: parentError } = await supabaseClient
        .from("parents")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (parentError || !parentDataResult) {
        await supabaseClient.auth.signOut();
        navigate("/portal/login");
        return;
      }

      const parentData = parentDataResult as any;
      const { data: linkedStudents } = await supabaseClient
        .from("student_parent_links")
        .select("students(*, classes(name, unit_id, units(name)))")
        .eq("parent_id", parentData.id)
        .order("created_at", { ascending: true });

      const mappedStudents = ((linkedStudents || []) as any[])
        .map((item) => item.students)
        .filter(Boolean);

      if (mappedStudents.length > 0) {
        setStudents(mappedStudents);
        setSelectedStudentId((current) => current || mappedStudents[0].id);
        setStudent(mappedStudents[0]);
      } else {
        setStudent({ full_name: "Orang Tua Siswa" });
      }
    };

    fetchSession();
  }, [navigate]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!selectedStudentId || students.length === 0) return;
    const nextStudent = students.find((item) => item.id === selectedStudentId);
    if (nextStudent) setStudent(nextStudent);
  }, [selectedStudentId, students]);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    navigate("/portal/login");
  };

  const navItems = [
    { name: "Beranda", path: "/portal", icon: Home },
    { name: "Profil", path: "/portal/profile", icon: UserRound },
    { name: "Akademik", path: "/portal/academic", icon: BookOpen },
    { name: "e-Rapor", path: "/portal/reports", icon: FileText },
    { name: "Perpustakaan", path: "/portal/library", icon: BookOpen },
    { name: "Ekskul", path: "/portal/extracurricular", icon: Target },
    { name: "KB/TK", path: "/portal/paud", icon: Smile },
    { name: "Qur'an", path: "/portal/quran", icon: BookOpen },
    { name: "Keuangan", path: "/portal/finance", icon: Wallet },
    { name: "Catatan Siswa", path: "/portal/journals", icon: ClipboardList },
    { name: "Panduan", path: "/portal/onboarding", icon: Target },
  ];

  const mobileMainItems = navItems.filter((item) => ["/portal", "/portal/profile", "/portal/quran"].includes(item.path));
  const parentContext = useMemo(() => ({ student, students, selectedStudentId, setSelectedStudentId }), [student, students, selectedStudentId]);

  if (!student) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Memuat...</div>;

  const selectedStudentPhoto = student.photo_url || student.photoUrl;
  const studentClassText = [student.classes?.units?.name, student.classes?.name].filter(Boolean).join(" - ") || "Kelas -";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r fixed h-full z-40">
        <div className="p-4 flex items-center justify-center border-b h-16 shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="max-h-10 w-auto object-contain" />
          ) : (
            <span className="text-emerald-700 font-bold text-lg">{appName || "TSLS"}</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== "/portal" && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "text-emerald-600" : "text-gray-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">
            <LogOut className="w-5 h-5" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col md:ml-64 relative min-w-0">
        <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
          <div className="max-w-md mx-auto md:max-w-full px-4 py-3 flex justify-between items-center min-h-[64px]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden shrink-0 border border-emerald-200">
                {selectedStudentPhoto ? (
                  <img src={selectedStudentPhoto} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-emerald-700 font-bold text-lg">{student.full_name?.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-bold text-gray-900 leading-tight truncate">{student.full_name}</h1>
                <p className="text-xs text-muted-foreground truncate">{student.nis || student.nisn || "NIS -"} - {studentClassText}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-3 shrink-0">
              {students.length > 1 && (
                <div className="hidden sm:flex items-center gap-2 rounded-xl border bg-gray-50 px-2 py-1.5">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <select
                    value={selectedStudentId}
                    onChange={(event) => setSelectedStudentId(event.target.value)}
                    className="max-w-[180px] bg-transparent text-sm font-semibold text-gray-700 outline-none"
                  >
                    {students.map((item) => (
                      <option key={item.id} value={item.id}>{item.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button onClick={() => navigate("/portal/announcements")} className="p-2 text-gray-500 hover:text-emerald-600 rounded-full hover:bg-emerald-50 transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-md mx-auto md:max-w-5xl md:mx-0 p-0 md:p-6 pb-28 md:pb-8 flex flex-col">
          <div className="flex-1">
            {students.length > 1 && (
              <div className="sm:hidden p-4 pb-0">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Pilih anak</label>
                <select
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  className="h-11 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {students.map((item) => (
                    <option key={item.id} value={item.id}>{item.full_name} - {item.classes?.name || "Kelas"}</option>
                  ))}
                </select>
              </div>
            )}
            <Outlet context={parentContext} />
          </div>

          <footer className="mt-8 text-center text-[10px] md:text-sm text-muted-foreground w-full pb-4 md:pb-0">
            &copy; {new Date().getFullYear()} TS Lab School. Portal Orang Tua.<br className="md:hidden" />
            <span className="hidden md:inline"> - </span>
            Disusun oleh <a href="https://yahyanursidik.my.id/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Yahya Nursidik</a>
          </footer>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t z-40 pb-safe shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-4 px-2">
          {mobileMainItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/portal" && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} className={`flex flex-col items-center justify-center py-2 transition-colors ${isActive ? "text-emerald-600" : "text-gray-400 hover:text-gray-700"}`}>
                <div className={`p-1.5 rounded-full mb-1 transition-all ${isActive ? "bg-emerald-50 scale-110" : "bg-transparent"}`}>
                  <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                </div>
                <span className={`text-[10px] whitespace-nowrap ${isActive ? "font-bold" : "font-medium"}`}>{item.name}</span>
              </Link>
            );
          })}
          <button onClick={() => setIsMobileMenuOpen(true)} className={`flex flex-col items-center justify-center py-2 transition-colors ${isMobileMenuOpen ? "text-emerald-600" : "text-gray-400 hover:text-gray-700"}`}>
            <div className={`p-1.5 rounded-full mb-1 transition-all ${isMobileMenuOpen ? "bg-emerald-50 scale-110" : "bg-transparent"}`}>
              <MoreHorizontal className={`w-5 h-5 ${isMobileMenuOpen ? "stroke-[2.5px]" : ""}`} />
            </div>
            <span className={`text-[10px] whitespace-nowrap ${isMobileMenuOpen ? "font-bold" : "font-medium"}`}>Lainnya</span>
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="bg-white rounded-t-3xl w-full max-h-[80vh] flex flex-col relative z-10 animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-center p-3">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
            <div className="px-6 pb-2 flex justify-between items-center border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">Menu Lainnya</h3>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto pb-safe">
              <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== "/portal" && location.pathname.startsWith(item.path));
                  return (
                    <Link key={item.path} to={item.path} className="flex flex-col items-center gap-2 group">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        isActive ? "bg-emerald-100 text-emerald-600 shadow-sm" : "bg-gray-50 text-gray-600 group-hover:bg-emerald-50 group-hover:text-emerald-600 border border-gray-100"
                      }`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      <span className={`text-[11px] text-center font-medium ${isActive ? "text-emerald-700 font-bold" : "text-gray-600"}`}>{item.name}</span>
                    </Link>
                  );
                })}
                <button onClick={handleLogout} className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-red-50 text-red-600 group-hover:bg-red-100 border border-red-100">
                    <LogOut className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] text-center font-medium text-red-600">Keluar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #d1d5db; }
      `}</style>
    </div>
  );
};
