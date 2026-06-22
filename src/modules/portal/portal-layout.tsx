import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase/client";
import { Home, Wallet, BookOpen, Clock, LogOut, Smile, ClipboardList, Bell, Target, FileText } from "lucide-react";
import { useSystemSettings } from "../../app/providers/SettingsProvider";

export const PortalLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        navigate("/portal/login");
        return;
      }

      // Fetch the parent record
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

      // Fetch the FIRST student linked to this parent for the demo
      const { data: studentDataResult } = await supabaseClient
        .from("student_parent_links")
        .select("students(*, classes(name))")
        .eq("parent_id", parentData.id)
        .limit(1)
        .single();
        
      const studentData = studentDataResult as any;

      if (studentData && studentData.students) {
        setStudent(studentData.students);
      } else {
        // Fallback if no student linked
        setStudent({ full_name: "Orang Tua Siswa" });
      }
    };

    fetchSession();
  }, [navigate]);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    navigate("/portal/login");
  };

  if (!student) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Memuat...</div>;

  const { logoUrl } = useSystemSettings();

  const navItems = [
    { name: "Beranda", path: "/portal", icon: Home },
    { name: "Akademik", path: "/portal/academic", icon: BookOpen },
    { name: "e-Rapor", path: "/portal/reports", icon: FileText },
    { name: "Ekskul", path: "/portal/extracurricular", icon: Target },
    { name: "PAUD", path: "/portal/paud", icon: Smile },
    { name: "Qur'an", path: "/portal/quran", icon: BookOpen },
    { name: "Keuangan", path: "/portal/finance", icon: Wallet },
    { name: "Catatan", path: "/portal/journals", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-emerald-700 font-bold text-lg">{student.full_name?.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight line-clamp-1">{student.full_name}</h1>
              <p className="text-xs text-muted-foreground">{student.nisn || "NISN -"} • {student.classes?.name || "Kelas -"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => navigate('/portal/announcements')} className="p-2 text-gray-500 hover:text-emerald-600 rounded-full hover:bg-emerald-50 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto relative pb-28 flex flex-col">
        <div className="flex-1">
          <Outlet context={{ student }} />
        </div>
        <footer className="mt-8 text-center text-[10px] text-muted-foreground w-full pb-4">
            &copy; {new Date().getFullYear()} TS Lab School. Portal Orang Tua.<br/>
            Disusun oleh <a href="https://yahyanursidik.my.id/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Yahya Nursidik</a>
        </footer>
      </main>

      {/* Bottom Navigation (Mobile Friendly) */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t z-50 pb-safe">
        <div className="max-w-md mx-auto flex justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/portal' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-2 px-1 flex-1 ${isActive ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <item.icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                <span className="text-[10px] font-medium whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
