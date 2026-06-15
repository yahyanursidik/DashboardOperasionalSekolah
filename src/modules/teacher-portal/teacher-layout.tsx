import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Home, Users, BookOpen, Calendar, LogOut, CheckSquare } from "lucide-react";
import { useSystemSettings } from "../../app/providers/SettingsProvider";

export const TeacherLayout: React.FC = () => {
  const [employee, setEmployee] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { appName, logoUrl } = useSystemSettings();

  useEffect(() => {
    const sessionStr = localStorage.getItem("teacher_portal_session");
    if (!sessionStr) {
      navigate("/teacher/login");
      return;
    }

    try {
      const sessionData = JSON.parse(sessionStr);
      if (!sessionData || !sessionData.id) {
        throw new Error("Invalid session");
      }
      setEmployee(sessionData);
    } catch (e) {
      localStorage.removeItem("teacher_portal_session");
      navigate("/teacher/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("teacher_portal_session");
    navigate("/teacher/login");
  };

  if (!employee) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center font-sans pb-20 sm:pb-0">
      {/* Mobile container mimicking app frame */}
      <div className="w-full sm:max-w-md bg-white min-h-screen shadow-2xl relative overflow-x-hidden">
        
        {/* Top Header */}
        <div className="bg-primary px-4 py-4 text-primary-foreground sticky top-0 z-50 shadow-md">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded bg-white/20 p-1" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                  {appName?.charAt(0) || "T"}
                </div>
              )}
              <div>
                <h1 className="font-bold text-sm leading-none">Portal Guru</h1>
                <p className="text-[10px] opacity-80 mt-1">{appName || "Sistem Informasi Sekolah"}</p>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-2 bg-black/10 rounded-full hover:bg-black/20 transition"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold uppercase shrink-0">
              {employee.full_name?.charAt(0)}
            </div>
            <div>
              <p className="text-xs opacity-80">Selamat datang,</p>
              <h2 className="font-bold text-lg leading-tight">{employee.full_name}</h2>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[9px] font-medium bg-black/20 px-2 py-0.5 rounded">
                  NIK: {employee.nik}
                </span>
                {employee.teacher_roles && employee.teacher_roles.length > 0 ? (
                  employee.teacher_roles.map((role: string, idx: number) => (
                    <span key={idx} className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded">
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded">
                    {employee.position === 'guru' ? 'Guru Umum' : employee.position}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-gray-50 min-h-full">
          <Outlet context={{ employee }} />
        </div>

        {/* Bottom Navigation for Mobile */}
        <div className="fixed bottom-0 left-0 right-0 sm:max-w-md sm:mx-auto bg-white border-t flex justify-around items-center p-2 z-50 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <NavItem to="/teacher" icon={<Home />} label="Beranda" active={location.pathname === "/teacher"} />
          <NavItem to="/teacher/classes" icon={<CheckSquare />} label="Absen & Nilai" active={location.pathname.includes("/teacher/classes")} />
          <NavItem to="/teacher/journals" icon={<BookOpen />} label="Jurnal Siswa" active={location.pathname.includes("/teacher/journals")} />
          <NavItem to="/teacher/leaves" icon={<Calendar />} label="Cuti / Izin" active={location.pathname.includes("/teacher/leaves")} />
        </div>

      </div>
    </div>
  );
};

const NavItem = ({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) => {
  return (
    <Link 
      to={to} 
      className={`flex flex-col items-center justify-center w-full py-2 gap-1 transition-colors ${
        active ? "text-primary" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      <div className={`[&>svg]:w-5 [&>svg]:h-5 ${active ? "[&>svg]:stroke-[2.5px]" : "[&>svg]:stroke-[2px]"}`}>
        {icon}
      </div>
      <span className={`text-[9px] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
    </Link>
  );
};
